import { HttpClient, HttpContext, HttpEvent, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiEndpoints } from '../../../core/config/api-endpoints';
import { appSettings } from '../../../core/config/app-settings';
import { ApiResponse } from '../../../core/models/api-response.model';
import { skipPlatformAuth } from '../../../core/interceptors/auth-token.interceptor';
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
import {
  mapManualPaymentDetail,
  mapManualPaymentHistory,
  mapManualPaymentQueue,
  mapRecipientManualPaymentAccess,
  ManualPaymentDetailApiDto,
  ManualPaymentHistoryApiDto,
  ManualPaymentQueueApiDto,
  RecipientManualPaymentAccessApiDto
} from '../mappers/manual-payment.mapper';
import {
  ManualPaymentDetail,
  ManualPaymentHistory,
  ManualPaymentNotificationResult,
  ManualPaymentQueue,
  ManualPaymentQueueQuery,
  ManualPaymentReviewRequest,
  ManualPaymentReviewResult,
  ManualPaymentSubmission,
  RecipientManualPaymentAccess,
  RecipientManualPaymentSubmissionRequest
} from '../models/manual-payment.model';

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

  getRecipientPaymentAccess(accessToken: string): Observable<RecipientManualPaymentAccess> {
    return this.http
      .get<ApiResponse<RecipientManualPaymentAccessApiDto>>(this.recipientUrl(accessToken), this.publicOptions())
      .pipe(map((response) => mapRecipientManualPaymentAccess(response.data)));
  }

  getRecipientInvoice(accessToken: string): Observable<RecipientManualPaymentAccess> {
    return this.http
      .get<ApiResponse<RecipientManualPaymentAccessApiDto>>(`${this.recipientUrl(accessToken)}/invoice`, this.publicOptions())
      .pipe(map((response) => mapRecipientManualPaymentAccess(response.data)));
  }

  getRecipientHistory(accessToken: string): Observable<ManualPaymentHistory> {
    return this.http
      .get<ApiResponse<ManualPaymentHistoryApiDto>>(`${this.recipientUrl(accessToken)}/history`, this.publicOptions())
      .pipe(map((response) => mapManualPaymentHistory(response.data)));
  }

  submitRecipientEvidence(
    accessToken: string,
    request: RecipientManualPaymentSubmissionRequest,
    idempotencyKey: string
  ): Observable<HttpEvent<ApiResponse<ManualPaymentSubmission>>> {
    return this.http.post<ApiResponse<ManualPaymentSubmission>>(
      `${this.recipientUrl(accessToken)}/evidence`,
      this.toEvidenceFormData(request),
      {
        headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
        context: new HttpContext().set(skipPlatformAuth, true),
        observe: 'events',
        reportProgress: true
      }
    );
  }

  updateRecipientSubmission(
    accessToken: string,
    paymentId: string,
    request: RecipientManualPaymentSubmissionRequest,
    idempotencyKey: string
  ): Observable<HttpEvent<ApiResponse<ManualPaymentSubmission>>> {
    return this.http.put<ApiResponse<ManualPaymentSubmission>>(
      `${this.recipientUrl(accessToken)}/submissions/${encodeURIComponent(paymentId)}`,
      this.toEvidenceFormData(request),
      {
        headers: new HttpHeaders({
          'Idempotency-Key': idempotencyKey,
          'If-Match': `\"${request.expectedVersion ?? ''}\"`
        }),
        context: new HttpContext().set(skipPlatformAuth, true),
        observe: 'events',
        reportProgress: true
      }
    );
  }

  getManualPayments(query: ManualPaymentQueueQuery): Observable<ManualPaymentQueue> {
    return this.http
      .get<ApiResponse<ManualPaymentQueueApiDto>>(this.url(apiEndpoints.platform.billing.manualPayments), {
        params: this.manualPaymentParams(query)
      })
      .pipe(map((response) => mapManualPaymentQueue(response.data)));
  }

  getManualPayment(paymentId: string): Observable<ManualPaymentDetail> {
    return this.http
      .get<ApiResponse<ManualPaymentDetailApiDto>>(
        this.url(apiEndpoints.platform.billing.manualPayment(paymentId))
      )
      .pipe(map((response) => mapManualPaymentDetail(response.data)));
  }

  getTenantManualPaymentStatus(tenantId: string): Observable<ManualPaymentDetail> {
    return this.http
      .get<ApiResponse<ManualPaymentDetailApiDto>>(
        this.url(`/platform-admin/tenant-onboarding/tenants/${encodeURIComponent(tenantId)}/payment-status`)
      )
      .pipe(map((response) => mapManualPaymentDetail(response.data)));
  }

  getManualPaymentHistory(paymentId: string): Observable<ManualPaymentHistory> {
    return this.http
      .get<ApiResponse<ManualPaymentHistoryApiDto>>(
        this.url(apiEndpoints.platform.billing.manualPaymentHistory(paymentId))
      )
      .pipe(map((response) => mapManualPaymentHistory(response.data)));
  }

  getManualPaymentProof(paymentId: string, evidenceId: string): Observable<HttpResponse<Blob>> {
    return this.http.get(
      this.url(apiEndpoints.platform.billing.manualPaymentProof(paymentId, evidenceId)),
      {
        headers: new HttpHeaders({ 'Cache-Control': 'no-store' }),
        observe: 'response',
        responseType: 'blob'
      }
    );
  }

  reviewManualPayment(
    paymentId: string,
    request: ManualPaymentReviewRequest,
    idempotencyKey: string
  ): Observable<ManualPaymentReviewResult> {
    return this.http
      .post<ApiResponse<ManualPaymentReviewResult>>(
        this.url(apiEndpoints.platform.billing.manualPaymentReview(paymentId)),
        request,
        {
          headers: new HttpHeaders({
            'Idempotency-Key': idempotencyKey,
            'If-Match': `\"${request.expectedVersion}\"`
          })
        }
      )
      .pipe(map((response) => response.data));
  }

  resendManualPaymentNotification(
    paymentId: string,
    notificationType: string,
    reason: string | undefined,
    idempotencyKey: string
  ): Observable<ManualPaymentNotificationResult> {
    return this.http
      .post<ApiResponse<ManualPaymentNotificationResult>>(
        this.url(apiEndpoints.platform.billing.manualPaymentNotificationResend(paymentId)),
        { notificationType, reason: reason?.trim() || undefined },
        { headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) }
      )
      .pipe(map((response) => response.data));
  }

  private toParams(query: PlatformBillingQuery): HttpParams {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(mapPlatformBillingQueryParams(query))) {
      params = params.set(key, value);
    }

    return params;
  }

  private manualPaymentParams(query: ManualPaymentQueueQuery): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && `${value}`.trim()) {
        params = params.set(key, String(value));
      }
    }
    return params;
  }

  private toEvidenceFormData(request: RecipientManualPaymentSubmissionRequest): FormData {
    const form = new FormData();
    form.set('PaymentMethod', request.paymentMethod);
    form.set('BankOrTransactionReference', request.bankOrTransactionReference);
    form.set('SubmittedAmount', String(request.submittedAmount));
    form.set('CurrencyCode', request.currencyCode);
    form.set('PaymentDate', request.paymentDate);
    if (request.payerNote?.trim()) form.set('PayerNote', request.payerNote.trim());
    if (request.expectedVersion !== undefined) form.set('ExpectedVersion', String(request.expectedVersion));
    form.set('Proof', request.proof, request.proof.name);
    return form;
  }

  private recipientUrl(accessToken: string): string {
    return this.url(apiEndpoints.paymentAccess(accessToken));
  }

  private publicOptions(): { context: HttpContext } {
    return { context: new HttpContext().set(skipPlatformAuth, true) };
  }

  private url(endpoint: string): string {
    return `${appSettings.apiBaseUrl}${endpoint}`;
  }
}
