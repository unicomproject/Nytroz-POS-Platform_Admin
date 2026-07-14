import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import { BillingFilterOptions, BillingInvoice, BillingInvoiceDetail, BillingInvoiceList, BillingQuery, BillingSummary } from '../models/platform-billing.model';

@Injectable({ providedIn: 'root' })
export class PlatformBillingApiService {
  private readonly root = `${appSettings.apiBaseUrl}${apiEndpoints.platform.billing}`;
  constructor(private readonly http: HttpClient) {}
  load(query: BillingQuery): Observable<{ summary: BillingSummary; list: BillingInvoiceList }> {
    const params = this.params(query);
    return forkJoin({
      summary: this.http.get<ApiResponse<BillingSummary>>(`${this.root}/summary`, { params }).pipe(map(r => r.data)),
      list: this.http.get<ApiResponse<BillingInvoiceList>>(`${this.root}/invoices`, { params }).pipe(map(r => r.data))
    });
  }
  filters(): Observable<BillingFilterOptions> { return this.http.get<ApiResponse<BillingFilterOptions>>(`${this.root}/filter-options`).pipe(map(r => r.data)); }
  detail(id: string): Observable<BillingInvoiceDetail> { return this.http.get<ApiResponse<BillingInvoiceDetail>>(`${this.root}/invoices/${id}`).pipe(map(r => r.data)); }
  issue(invoice: BillingInvoice): Observable<BillingInvoice> { return this.transition(invoice, 'issue'); }
  markPaid(invoice: BillingInvoice): Observable<BillingInvoice> { return this.transition(invoice, 'mark-paid'); }
  private transition(invoice: BillingInvoice, action: string): Observable<BillingInvoice> {
    return this.http.post<ApiResponse<BillingInvoice>>(`${this.root}/invoices/${invoice.id}/${action}`, { expectedUpdatedAt: invoice.updatedAt }).pipe(map(r => r.data));
  }
  private params(q: BillingQuery): HttpParams {
    let p = new HttpParams().set('pageNumber', q.pageNumber).set('pageSize', q.pageSize).set('dateField', q.dateField).set('sortBy', q.sortBy).set('sortDirection', q.sortDirection);
    for (const [key, value] of Object.entries(q)) if (value !== undefined && value !== '' && !['pageNumber','pageSize','dateField','sortBy','sortDirection'].includes(key)) p = p.set(key, String(value));
    return p;
  }
}
