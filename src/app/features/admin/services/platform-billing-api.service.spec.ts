import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

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
