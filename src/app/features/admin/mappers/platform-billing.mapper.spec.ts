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
  PlatformBillingInvoiceApiDto,
} from './platform-billing.mapper';

describe('platform billing mapper', () => {
  it('keeps currency summaries separate without aggregating monetary values', () => {
    const summary = mapPlatformBillingSummary({
      currencies: [
        {
          currencyCode: 'LKR',
          paidRevenue: 1000.25,
          outstandingAmount: 300.75,
          overdueAmount: 50.5,
          invoiceCount: 3,
        },
        {
          currencyCode: 'USD',
          paidRevenue: 25.1,
          outstandingAmount: 10.2,
          overdueAmount: 5.3,
          invoiceCount: 2,
        },
      ],
      totalInvoices: 5,
      generatedAt: '2026-07-15T12:00:00Z',
    });

    expect(summary.currencies).toHaveLength(2);
    expect(summary.currencies[0]).toMatchObject({ currencyCode: 'LKR', paidRevenue: 1000.25 });
    expect(summary.currencies[1]).toMatchObject({ currencyCode: 'USD', paidRevenue: 25.1 });
    expect(summary.totalInvoices).toBe(5);
  });

  it('normalizes nullable collections to empty arrays', () => {
    expect(
      mapPlatformBillingSummary({ currencies: null, totalInvoices: 0, generatedAt: 'now' })
        .currencies,
    ).toEqual([]);
    expect(
      mapPlatformBillingInvoiceList({
        items: null,
        pageNumber: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0,
      }).items,
    ).toEqual([]);
    expect(mapPlatformBillingPayments(null)).toEqual([]);
    expect(mapPlatformBillingFilterOptions({ tenants: null, statuses: null })).toEqual({
      tenants: [],
      statuses: [],
    });

    const detail = mapPlatformBillingInvoiceDetail({
      invoice: invoiceDto(),
      invoiceType: 'SUBSCRIPTION',
      billingCycle: null,
      billingPeriodStart: null,
      billingPeriodEnd: null,
      subtotalAmount: 100,
      discountAmount: 0,
      taxAmount: 0,
      lines: null,
      payments: null,
    });
    expect(detail.lines).toEqual([]);
    expect(detail.payments).toEqual([]);
  });

  it('maps stored and backend-derived display statuses without deriving locally', () => {
    const overdue = mapPlatformBillingInvoice(
      invoiceDto({ storedStatus: 'PENDING', displayStatus: 'OVERDUE' }),
    );
    expect(overdue.storedStatus).toBe('PENDING');
    expect(overdue.displayStatus).toBe('OVERDUE');

    const paid = mapPlatformBillingInvoice(
      invoiceDto({ storedStatus: 'PAID', displayStatus: 'PAID' }),
    );
    expect(paid.storedStatus).toBe('PAID');
    expect(paid.displayStatus).toBe('PAID');
  });

  it('uses every exact backend query parameter name', () => {
    expect(
      mapPlatformBillingQueryParams({
        pageNumber: 2,
        pageSize: 25,
        search: 'INV-100',
        tenantId: 'tenant-1',
        status: 'OVERDUE',
        dateFrom: '2026-07-01T00:00:00Z',
        dateTo: '2026-07-15T23:59:59Z',
        dateField: 'dueAt',
        sortBy: 'amount',
        sortDirection: 'asc',
      }),
    ).toEqual({
      pageNumber: '2',
      pageSize: '25',
      search: 'INV-100',
      tenantId: 'tenant-1',
      status: 'OVERDUE',
      dateFrom: '2026-07-01T00:00:00Z',
      dateTo: '2026-07-15T23:59:59Z',
      dateField: 'dueAt',
      sortBy: 'amount',
      sortDirection: 'asc',
    });
  });

  it('omits absent and blank optional query values', () => {
    expect(
      mapPlatformBillingQueryParams({ search: '  ', tenantId: '', pageNumber: undefined }),
    ).toEqual({});
  });

  it('preserves pagination fields from the backend', () => {
    const result = mapPlatformBillingInvoiceList({
      items: [invoiceDto()],
      pageNumber: 3,
      pageSize: 20,
      totalCount: 41,
      totalPages: 3,
    });
    expect(result).toMatchObject({ pageNumber: 3, pageSize: 20, totalCount: 41, totalPages: 3 });
  });

  it('preserves date filter strings exactly', () => {
    const params = mapPlatformBillingQueryParams({
      dateFrom: '2026-07-01T10:20:30+05:30',
      dateTo: '2026-07-10T11:22:33+05:30',
      dateField: 'issuedAt',
    });
    expect(params).toEqual({
      dateFrom: '2026-07-01T10:20:30+05:30',
      dateTo: '2026-07-10T11:22:33+05:30',
      dateField: 'issuedAt',
    });
  });

  it('maps supported sort field and direction exactly', () => {
    expect(
      mapPlatformBillingQueryParams({ sortBy: 'invoiceNumber', sortDirection: 'desc' }),
    ).toEqual({
      sortBy: 'invoiceNumber',
      sortDirection: 'desc',
    });
  });

  it('preserves updatedAt without parsing or reformatting it', () => {
    const updatedAt = '2026-07-15T06:00:00.1234567+00:00';
    expect(mapPlatformBillingInvoice(invoiceDto({ updatedAt })).updatedAt).toBe(updatedAt);
  });

  it('maps issue requests with expectedUpdatedAt', () => {
    expect(mapPlatformBillingIssueRequest({ expectedUpdatedAt: '2026-07-15T06:00:00Z' })).toEqual({
      expectedUpdatedAt: '2026-07-15T06:00:00Z',
    });
  });

  it('maps mark-paid requests with optional paidAt only when supplied', () => {
    expect(mapPlatformBillingMarkPaidRequest({ expectedUpdatedAt: 'updated' })).toEqual({
      expectedUpdatedAt: 'updated',
    });
    expect(
      mapPlatformBillingMarkPaidRequest({ expectedUpdatedAt: 'updated', paidAt: 'paid' }),
    ).toEqual({
      expectedUpdatedAt: 'updated',
      paidAt: 'paid',
    });
  });

  it('keeps filter statuses limited to the backend-supported contract', () => {
    const result = mapPlatformBillingFilterOptions({
      tenants: [],
      statuses: ['DRAFT', 'PENDING', 'OVERDUE', 'PAID'],
    });
    expect(result.statuses).toEqual(['DRAFT', 'PENDING', 'OVERDUE', 'PAID']);
    expect(result.statuses).not.toContain('CANCELLED');
    expect(result.statuses).not.toContain('VOIDED');
    expect(result.statuses).not.toContain('PARTIALLY_PAID');
  });
});

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
    totalAmount: 100.25,
    paidAmount: 0,
    balanceDue: 100.25,
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
