import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  mapPlatformBillingFilterOptions,
  mapPlatformBillingInvoice,
  mapPlatformBillingInvoiceDetail,
  mapPlatformBillingInvoiceList,
  mapPlatformBillingIssueRequest,
  mapPlatformBillingMarkPaidRequest,
  mapPlatformBillingPayments,
  mapPlatformBillingQueryParams,
  mapPlatformBillingSummary,
  PlatformBillingFilterOptionsApiDto,
  PlatformBillingInvoiceApiDto,
  PlatformBillingInvoiceDetailApiDto,
  PlatformBillingInvoiceListApiDto,
  PlatformBillingPaymentApiDto,
  PlatformBillingSummaryApiDto,
} from '../mappers/platform-billing.mapper';
import {
  PlatformBillingFilterOptions,
  PlatformBillingInvoiceDetail,
  PlatformBillingInvoiceList,
  PlatformBillingIssueRequest,
  PlatformBillingMarkPaidRequest,
  PlatformBillingMutationResponse,
  PlatformBillingPaymentTransaction,
  PlatformBillingQuery,
  PlatformBillingSummary,
} from '../models/platform-billing.model';

@Injectable({ providedIn: 'root' })
export class PlatformBillingApiService {
  constructor(private readonly http: HttpClient) {}

  getSummary(query: PlatformBillingQuery): Observable<PlatformBillingSummary> {
    return this.http
      .get<
        ApiResponse<PlatformBillingSummaryApiDto>
      >(this.url(apiEndpoints.platform.billing.summary), { params: this.toParams(query) })
      .pipe(map((response) => mapPlatformBillingSummary(response.data)));
  }

  getInvoices(query: PlatformBillingQuery): Observable<PlatformBillingInvoiceList> {
    return this.http
      .get<
        ApiResponse<PlatformBillingInvoiceListApiDto>
      >(this.url(apiEndpoints.platform.billing.invoices), { params: this.toParams(query) })
      .pipe(map((response) => mapPlatformBillingInvoiceList(response.data)));
  }

  getInvoice(invoiceId: string): Observable<PlatformBillingInvoiceDetail> {
    return this.http
      .get<
        ApiResponse<PlatformBillingInvoiceDetailApiDto>
      >(this.url(apiEndpoints.platform.billing.invoice(invoiceId)))
      .pipe(map((response) => mapPlatformBillingInvoiceDetail(response.data)));
  }

  getInvoicePayments(invoiceId: string): Observable<PlatformBillingPaymentTransaction[]> {
    return this.http
      .get<
        ApiResponse<PlatformBillingPaymentApiDto[] | null>
      >(this.url(apiEndpoints.platform.billing.invoicePayments(invoiceId)))
      .pipe(map((response) => mapPlatformBillingPayments(response.data)));
  }

  getFilterOptions(): Observable<PlatformBillingFilterOptions> {
    return this.http
      .get<
        ApiResponse<PlatformBillingFilterOptionsApiDto>
      >(this.url(apiEndpoints.platform.billing.filterOptions))
      .pipe(map((response) => mapPlatformBillingFilterOptions(response.data)));
  }

  issueInvoice(
    invoiceId: string,
    request: PlatformBillingIssueRequest,
  ): Observable<PlatformBillingMutationResponse> {
    return this.http
      .post<
        ApiResponse<PlatformBillingInvoiceApiDto>
      >(this.url(apiEndpoints.platform.billing.issueInvoice(invoiceId)), mapPlatformBillingIssueRequest(request))
      .pipe(map((response) => mapPlatformBillingInvoice(response.data)));
  }

  markInvoicePaid(
    invoiceId: string,
    request: PlatformBillingMarkPaidRequest,
  ): Observable<PlatformBillingMutationResponse> {
    return this.http
      .post<
        ApiResponse<PlatformBillingInvoiceApiDto>
      >(this.url(apiEndpoints.platform.billing.markInvoicePaid(invoiceId)), mapPlatformBillingMarkPaidRequest(request))
      .pipe(map((response) => mapPlatformBillingInvoice(response.data)));
  }

  private toParams(query: PlatformBillingQuery): HttpParams {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(mapPlatformBillingQueryParams(query))) {
      params = params.set(key, value);
    }

    return params;
  }

  private url(endpoint: string): string {
    return `${appSettings.apiBaseUrl}${endpoint}`;
  }
}
