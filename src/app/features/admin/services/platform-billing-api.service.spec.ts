import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { skipPlatformAuth } from '../../../core/interceptors/auth-token.interceptor';
import { manualPaymentDetail, manualPaymentQueue, recipientAccess } from '../../../testing/manual-payment-test-fixtures';

import {
  PlatformBillingInvoiceApiDto,
  PlatformBillingInvoiceDetailApiDto,
} from '../mappers/platform-billing.mapper';
import { PlatformBillingApiService } from './platform-billing-api.service';

describe('PlatformBillingApiService', () => {
  let service: PlatformBillingApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlatformBillingApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('gets the billing summary with mapped envelope data', () => {
    let currency = '';
    service
      .getSummary({ search: 'alpha' })
      .subscribe((response) => (currency = response.currencies[0]?.currencyCode ?? ''));

    const request = httpTesting.expectOne(
      (req) => req.url === '/api/v1/platform-admin/billing/summary',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('search')).toBe('alpha');
    request.flush(
      envelope({
        currencies: [
          {
            currencyCode: 'LKR',
            paidRevenue: 10,
            outstandingAmount: 5,
            overdueAmount: 2,
            invoiceCount: 1,
          },
        ],
        totalInvoices: 1,
        generatedAt: '2026-07-15T00:00:00Z',
      }),
    );
    expect(currency).toBe('LKR');
  });

  it('gets invoices with every exact query parameter and maps pagination', () => {
    let totalPages = 0;
    service
      .getInvoices({
        pageNumber: 2,
        pageSize: 25,
        search: 'INV',
        tenantId: 'tenant-1',
        status: 'OVERDUE',
        dateFrom: '2026-07-01T00:00:00Z',
        dateTo: '2026-07-15T00:00:00Z',
        dateField: 'dueAt',
        sortBy: 'amount',
        sortDirection: 'asc',
      })
      .subscribe((response) => (totalPages = response.totalPages));

    const request = httpTesting.expectOne(
      (req) => req.url === '/api/v1/platform-admin/billing/invoices',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual([
      'dateField',
      'dateFrom',
      'dateTo',
      'pageNumber',
      'pageSize',
      'search',
      'sortBy',
      'sortDirection',
      'status',
      'tenantId',
    ]);
    expect(request.request.params.get('pageNumber')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('25');
    expect(request.request.params.get('search')).toBe('INV');
    expect(request.request.params.get('tenantId')).toBe('tenant-1');
    expect(request.request.params.get('status')).toBe('OVERDUE');
    expect(request.request.params.get('dateFrom')).toBe('2026-07-01T00:00:00Z');
    expect(request.request.params.get('dateTo')).toBe('2026-07-15T00:00:00Z');
    expect(request.request.params.get('dateField')).toBe('dueAt');
    expect(request.request.params.get('sortBy')).toBe('amount');
    expect(request.request.params.get('sortDirection')).toBe('asc');
    request.flush(
      envelope({
        items: [invoiceDto()],
        pageNumber: 2,
        pageSize: 25,
        totalCount: 30,
        totalPages: 2,
      }),
    );
    expect(totalPages).toBe(2);
  });

  it('gets an invoice detail by id', () => {
    let invoiceNumber = '';
    service
      .getInvoice('invoice-1')
      .subscribe((response) => (invoiceNumber = response.invoice.invoiceNumber));
    const request = httpTesting.expectOne('/api/v1/platform-admin/billing/invoices/invoice-1');
    expect(request.request.method).toBe('GET');
    request.flush(envelope(detailDto()));
    expect(invoiceNumber).toBe('INV-001');
  });

  it('gets invoice payments and normalizes null data', () => {
    let count = -1;
    service.getInvoicePayments('invoice-1').subscribe((response) => (count = response.length));
    const request = httpTesting.expectOne(
      '/api/v1/platform-admin/billing/invoices/invoice-1/payments',
    );
    expect(request.request.method).toBe('GET');
    request.flush(envelope(null));
    expect(count).toBe(0);
  });

  it('gets billing filter options', () => {
    let status = '';
    service.getFilterOptions().subscribe((response) => (status = response.statuses[0] ?? ''));
    const request = httpTesting.expectOne('/api/v1/platform-admin/billing/filter-options');
    expect(request.request.method).toBe('GET');
    request.flush(
      envelope({ tenants: [{ id: 'tenant-1', code: 'TEN', name: 'Tenant' }], statuses: ['DRAFT'] }),
    );
    expect(status).toBe('DRAFT');
  });

  it('issues an invoice with expectedUpdatedAt', () => {
    let status = '';
    service
      .issueInvoice('invoice-1', { expectedUpdatedAt: '2026-07-15T06:00:00Z' })
      .subscribe((response) => (status = response.storedStatus));
    const request = httpTesting.expectOne(
      '/api/v1/platform-admin/billing/invoices/invoice-1/issue',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ expectedUpdatedAt: '2026-07-15T06:00:00Z' });
    request.flush(envelope(invoiceDto({ storedStatus: 'PENDING', displayStatus: 'PENDING' })));
    expect(status).toBe('PENDING');
  });

  it('marks an invoice paid and includes paidAt only when provided', () => {
    service
      .markInvoicePaid('invoice-1', {
        expectedUpdatedAt: '2026-07-15T06:00:00Z',
        paidAt: '2026-07-15T06:15:00Z',
      })
      .subscribe();
    const withPaidAt = httpTesting.expectOne(
      '/api/v1/platform-admin/billing/invoices/invoice-1/mark-paid',
    );
    expect(withPaidAt.request.method).toBe('POST');
    expect(withPaidAt.request.body).toEqual({
      expectedUpdatedAt: '2026-07-15T06:00:00Z',
      paidAt: '2026-07-15T06:15:00Z',
    });
    withPaidAt.flush(envelope(invoiceDto({ storedStatus: 'PAID', displayStatus: 'PAID' })));

    service.markInvoicePaid('invoice-2', { expectedUpdatedAt: 'latest' }).subscribe();
    const withoutPaidAt = httpTesting.expectOne(
      '/api/v1/platform-admin/billing/invoices/invoice-2/mark-paid',
    );
    expect(withoutPaidAt.request.body).toEqual({ expectedUpdatedAt: 'latest' });
    withoutPaidAt.flush(envelope(invoiceDto({ storedStatus: 'PAID', displayStatus: 'PAID' })));
  });

  it('keeps HTTP 409 concurrency errors observable', () => {
    let error: HttpErrorResponse | undefined;
    service
      .issueInvoice('invoice-1', { expectedUpdatedAt: 'stale' })
      .subscribe({ error: (value) => (error = value) });
    const request = httpTesting.expectOne(
      '/api/v1/platform-admin/billing/invoices/invoice-1/issue',
    );
    request.flush(
      {
        success: false,
        message: 'changed',
        errorCode: 'platform_billing.concurrency_conflict',
        errors: [],
      },
      { status: 409, statusText: 'Conflict' },
    );
    expect(error?.status).toBe(409);
    expect(error?.error.errorCode).toBe('platform_billing.concurrency_conflict');
  });

  it('loads recipient access without attaching platform authentication context', () => {
    let tenant = '';
    service.getRecipientPaymentAccess('secure/token').subscribe((value) => tenant = value.tenantName);
    const request = httpTesting.expectOne('/api/v1/tenant-onboarding/payment-access/secure%2Ftoken');
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(skipPlatformAuth)).toBe(true);
    request.flush(envelope(recipientAccess()));
    expect(tenant).toBe('Alpha Retail');
  });

  it('submits exact multipart fields with a stable idempotency key', () => {
    const proof = new File(['proof'], 'proof.pdf', { type: 'application/pdf' });
    service.submitRecipientEvidence('token', {
      paymentMethod: 'bank_transfer', bankOrTransactionReference: 'BANK-1234', submittedAmount: 110,
      currencyCode: 'LKR', paymentDate: '2026-08-03T00:00:00Z', payerNote: 'Paid', expectedVersion: 1, proof
    }, 'logical-key').subscribe();
    const request = httpTesting.expectOne('/api/v1/tenant-onboarding/payment-access/token/evidence');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe('logical-key');
    expect(request.request.context.get(skipPlatformAuth)).toBe(true);
    const body = request.request.body as FormData;
    expect(body.get('PaymentMethod')).toBe('bank_transfer');
    expect(body.get('BankOrTransactionReference')).toBe('BANK-1234');
    expect(body.get('SubmittedAmount')).toBe('110');
    expect(body.get('CurrencyCode')).toBe('LKR');
    expect(body.get('PaymentDate')).toBe('2026-08-03T00:00:00Z');
    expect(body.get('ExpectedVersion')).toBe('1');
    expect((body.get('Proof') as File).name).toBe('proof.pdf');
    request.flush(envelope({ paymentId: 'payment-1', status: 'PAYMENT_SUBMITTED', version: 2, referenceSuffix: '***1234',
      expectedAmount: 110, submittedAmount: 110, currencyCode: 'LKR', paymentDate: '2026-08-03T00:00:00Z', evidence: [],
      submittedAt: 'now', updatedAt: 'now', nextAction: 'WAIT_FOR_REVIEW', idempotentReplay: false }));
  });

  it('corrects a submission with PUT, If-Match, version, and idempotency', () => {
    const proof = new File(['proof'], 'proof.png', { type: 'image/png' });
    service.updateRecipientSubmission('token', 'payment-1', {
      paymentMethod: 'cash_deposit', bankOrTransactionReference: 'CASH-9', submittedAmount: 110,
      currencyCode: 'LKR', paymentDate: '2026-08-03T00:00:00Z', expectedVersion: 4, proof
    }, 'correction-key').subscribe();
    const request = httpTesting.expectOne('/api/v1/tenant-onboarding/payment-access/token/submissions/payment-1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('If-Match')).toBe('"4"');
    expect(request.request.headers.get('Idempotency-Key')).toBe('correction-key');
    expect((request.request.body as FormData).get('ExpectedVersion')).toBe('4');
    request.flush(envelope({ paymentId: 'payment-1', status: 'PAYMENT_SUBMITTED', version: 5, referenceSuffix: '***ASH9',
      expectedAmount: 110, submittedAmount: 110, currencyCode: 'LKR', paymentDate: 'now', evidence: [], submittedAt: 'now',
      updatedAt: 'now', nextAction: 'WAIT_FOR_REVIEW', idempotentReplay: false }));
  });

  it('maps manual queue filters and pagination', () => {
    service.getManualPayments({ pageNumber: 2, pageSize: 25, status: 'PAYMENT_SUBMITTED', tenantId: 'tenant-1',
      planId: 'plan-1', search: 'INV', submittedFrom: 'from', submittedTo: 'to', sortBy: 'amount', sortDirection: 'asc' }).subscribe();
    const request = httpTesting.expectOne((req) => req.url === '/api/v1/platform-admin/billing/manual-payments');
    expect(request.request.params.get('pageNumber')).toBe('2');
    expect(request.request.params.get('status')).toBe('PAYMENT_SUBMITTED');
    expect(request.request.params.get('planId')).toBe('plan-1');
    expect(request.request.params.get('sortBy')).toBe('amount');
    request.flush(envelope(manualPaymentQueue()));
  });

  it('loads detail, history, tenant status, and a private blob proof', () => {
    service.getManualPayment('payment-1').subscribe();
    httpTesting.expectOne('/api/v1/platform-admin/billing/manual-payments/payment-1').flush(envelope(manualPaymentDetail()));
    service.getManualPaymentHistory('payment-1').subscribe();
    httpTesting.expectOne('/api/v1/platform-admin/billing/manual-payments/payment-1/history')
      .flush(envelope({ paymentId: 'payment-1', items: manualPaymentDetail().history }));
    service.getTenantManualPaymentStatus('tenant-1').subscribe();
    httpTesting.expectOne('/api/v1/platform-admin/tenant-onboarding/tenants/tenant-1/payment-status')
      .flush(envelope(manualPaymentDetail()));
    service.getManualPaymentProof('payment-1', 'evidence-1').subscribe();
    const proof = httpTesting.expectOne('/api/v1/platform-admin/billing/manual-payments/payment-1/proof/evidence-1');
    expect(proof.request.responseType).toBe('blob');
    expect(proof.request.headers.get('Cache-Control')).toBe('no-store');
    proof.flush(new Blob(['private']));
  });

  it('sends review and notification commands with exact preconditions', () => {
    service.reviewManualPayment('payment-1', { action: 'APPROVE', expectedVersion: 2 }, 'review-key').subscribe();
    const review = httpTesting.expectOne('/api/v1/platform-admin/billing/manual-payments/payment-1/review');
    expect(review.request.headers.get('If-Match')).toBe('"2"');
    expect(review.request.headers.get('Idempotency-Key')).toBe('review-key');
    expect(review.request.body).toEqual({ action: 'APPROVE', expectedVersion: 2 });
    review.flush(envelope({ paymentId: 'payment-1', invoiceId: 'invoice-1', tenantId: 'tenant-1', paymentStatus: 'PAID',
      invoiceStatus: 'PAID', tenantStatus: 'PENDING_ACTIVATION', version: 4, reviewId: 'review-1', result: 'APPROVE',
      activationEligible: true, idempotentReplay: false }));

    service.resendManualPaymentNotification('payment-1', 'PAYMENT_REQUIRED', 'Intentional', 'notify-key').subscribe();
    const resend = httpTesting.expectOne('/api/v1/platform-admin/billing/manual-payments/payment-1/notification/resend');
    expect(resend.request.headers.get('Idempotency-Key')).toBe('notify-key');
    expect(resend.request.body).toEqual({ notificationType: 'PAYMENT_REQUIRED', reason: 'Intentional' });
    resend.flush(envelope({ paymentId: 'payment-1', notificationType: 'PAYMENT_REQUIRED', status: 'QUEUED', idempotentReplay: false }));
  });
});

function envelope<T>(data: T) {
  return { success: true, message: 'ok', data };
}

function invoiceDto(
  overrides: Partial<PlatformBillingInvoiceApiDto> = {},
): PlatformBillingInvoiceApiDto {
  return {
    id: 'invoice-1',
    invoiceNumber: 'INV-001',
    tenantId: 'tenant-1',
    tenantCode: 'TEN',
    tenantName: 'Tenant',
    subscriptionId: 'subscription-1',
    subscriptionStatus: 'ACTIVE',
    planId: 'plan-1',
    planCode: 'PRO',
    planName: 'Pro',
    currencyCode: 'LKR',
    totalAmount: 100,
    paidAmount: 0,
    balanceDue: 100,
    storedStatus: 'DRAFT',
    displayStatus: 'DRAFT',
    issuedAt: null,
    dueAt: '2026-07-31T00:00:00Z',
    paidAt: null,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-15T06:00:00Z',
    canIssue: true,
    canMarkPaid: false,
    ...overrides,
  };
}

function detailDto(): PlatformBillingInvoiceDetailApiDto {
  return {
    invoice: invoiceDto(),
    invoiceType: 'SUBSCRIPTION',
    billingCycle: 'MONTHLY',
    billingPeriodStart: '2026-07-01T00:00:00Z',
    billingPeriodEnd: '2026-07-31T00:00:00Z',
    subtotalAmount: 100,
    discountAmount: 0,
    taxAmount: 0,
    lines: [],
    payments: [],
  };
}
