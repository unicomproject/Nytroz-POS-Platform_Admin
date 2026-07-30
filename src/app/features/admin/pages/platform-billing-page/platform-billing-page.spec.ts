import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import {
  PlatformBillingFilterOptions,
  PlatformBillingInvoiceDetail,
  PlatformBillingInvoiceList,
  PlatformBillingInvoiceListItem,
  PlatformBillingPaymentTransaction,
  PlatformBillingSummary,
} from '../../models/platform-billing.model';
import { adminRoutes } from '../../routes/admin.routes';
import { PlatformBillingApiService } from '../../services/platform-billing-api.service';
import { PlatformBillingPage } from './platform-billing-page';

describe('PlatformBillingPage', () => {
  let api: {
    getSummary: ReturnType<typeof vi.fn>;
    getInvoices: ReturnType<typeof vi.fn>;
    getFilterOptions: ReturnType<typeof vi.fn>;
    getInvoice: ReturnType<typeof vi.fn>;
    getInvoicePayments: ReturnType<typeof vi.fn>;
    issueInvoice: ReturnType<typeof vi.fn>;
    markInvoicePaid: ReturnType<typeof vi.fn>;
  };
  let accessControl: { hasPermission: ReturnType<typeof vi.fn> };
  let apiError: {
    toSafeMessage: ReturnType<typeof vi.fn>;
    toApiError: ReturnType<typeof vi.fn>;
  };

  const filterOptions: PlatformBillingFilterOptions = {
    tenants: [{ id: 'tenant-1', code: 'TEN-1', name: 'Nytroz Shop' }],
    statuses: ['DRAFT', 'PENDING', 'OVERDUE', 'PAID'],
  };

  const summary: PlatformBillingSummary = {
    currencies: [
      {
        currencyCode: 'LKR',
        paidRevenue: 1000,
        outstandingAmount: 250,
        overdueAmount: 50,
        invoiceCount: 1,
      },
    ],
    totalInvoices: 1,
    generatedAt: '2026-07-16T00:00:00Z',
  };

  const pendingInvoice: PlatformBillingInvoiceListItem = {
    id: 'invoice-1',
    invoiceNumber: 'INV-001',
    tenantId: 'tenant-1',
    tenantCode: 'TEN-1',
    tenantName: 'Nytroz Shop',
    subscriptionId: 'subscription-1',
    subscriptionStatus: 'active',
    planId: 'plan-1',
    planCode: 'PRO',
    planName: 'Pro',
    currencyCode: 'LKR',
    totalAmount: 1250,
    paidAmount: 1000,
    balanceDue: 250,
    storedStatus: 'PENDING',
    displayStatus: 'PENDING',
    issuedAt: '2026-07-01T00:00:00Z',
    dueAt: '2026-07-31T00:00:00Z',
    paidAt: null,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T12:00:00Z',
    canIssue: false,
    canMarkPaid: true,
  };

  const draftInvoice: PlatformBillingInvoiceListItem = {
    ...pendingInvoice,
    id: 'invoice-draft',
    invoiceNumber: 'INV-DRAFT',
    storedStatus: 'DRAFT',
    displayStatus: 'DRAFT',
    issuedAt: null,
    paidAmount: 0,
    balanceDue: 1250,
    canIssue: true,
    canMarkPaid: false,
    updatedAt: '2026-07-01T08:00:00Z',
  };

  const invoiceList: PlatformBillingInvoiceList = {
    items: [
      pendingInvoice,
      {
        id: 'invoice-2',
        invoiceNumber: 'INV-002',
        tenantId: 'tenant-2',
        tenantCode: 'TEN-2',
        tenantName: 'Metro Retail',
        subscriptionId: 'subscription-2',
        subscriptionStatus: 'active',
        planId: 'plan-2',
        planCode: 'BASIC',
        planName: 'Basic',
        currencyCode: 'USD',
        totalAmount: 40,
        paidAmount: 0,
        balanceDue: 40,
        storedStatus: 'PENDING',
        displayStatus: 'PENDING',
        issuedAt: '2026-07-02T00:00:00Z',
        dueAt: '2026-07-30T00:00:00Z',
        paidAt: null,
        createdAt: '2026-07-02T00:00:00Z',
        updatedAt: '2026-07-02T00:00:00Z',
        canIssue: false,
        canMarkPaid: true,
      },
    ],
    pageNumber: 1,
    pageSize: 10,
    totalCount: 2,
    totalPages: 1,
  };

  const invoiceDetail: PlatformBillingInvoiceDetail = {
    invoice: pendingInvoice,
    invoiceType: 'subscription',
    billingCycle: 'monthly',
    billingPeriodStart: '2026-07-01T00:00:00Z',
    billingPeriodEnd: '2026-07-31T00:00:00Z',
    subtotalAmount: 1000,
    discountAmount: 0,
    taxAmount: 250,
    lines: [
      {
        id: 'line-1',
        lineNumber: '1',
        description: 'Pro plan',
        quantity: 1,
        unitPrice: 1000,
        discountAmount: 0,
        taxAmount: 250,
        lineTotal: 1250,
      },
    ],
    payments: [],
  };

  const draftDetail: PlatformBillingInvoiceDetail = {
    ...invoiceDetail,
    invoice: draftInvoice,
  };

  const payments: PlatformBillingPaymentTransaction[] = [
    {
      id: 'payment-1',
      providerName: 'Stripe',
      providerTransactionId: 'txn_123',
      status: 'succeeded',
      currencyCode: 'LKR',
      amount: 1000,
      providerFee: 30,
      netAmount: 970,
      paidAt: '2026-07-05T00:00:00Z',
      createdAt: '2026-07-05T00:00:00Z',
    },
  ];

  function billingHttpError(
    errorCode: string,
    status = 409,
    message = 'Billing error',
  ): HttpErrorResponse {
    return new HttpErrorResponse({
      status,
      error: {
        success: false,
        message,
        errorCode,
        errors: [],
      },
    });
  }

  async function createComponent(
    permissions: string[] = [],
  ): Promise<ComponentFixture<PlatformBillingPage>> {
    accessControl.hasPermission.mockImplementation((permission: string) =>
      permissions.includes(permission),
    );

    await TestBed.configureTestingModule({
      imports: [PlatformBillingPage],
      providers: [
        { provide: PlatformBillingApiService, useValue: api },
        { provide: AccessControlService, useValue: accessControl },
        { provide: ApiErrorService, useValue: apiError },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformBillingPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    api = {
      getSummary: vi.fn().mockReturnValue(of(summary)),
      getInvoices: vi.fn().mockReturnValue(of(invoiceList)),
      getFilterOptions: vi.fn().mockReturnValue(of(filterOptions)),
      getInvoice: vi.fn().mockReturnValue(of(invoiceDetail)),
      getInvoicePayments: vi.fn().mockReturnValue(of(payments)),
      issueInvoice: vi.fn().mockReturnValue(of(pendingInvoice)),
      markInvoicePaid: vi.fn().mockReturnValue(of(pendingInvoice)),
    };
    accessControl = {
      hasPermission: vi.fn().mockReturnValue(false),
    };
    apiError = {
      toSafeMessage: vi.fn().mockReturnValue('Billing failed safely'),
      toApiError: vi.fn().mockReturnValue(null),
    };
  });

  it('loads and renders the summary and invoices', async () => {
    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.getFilterOptions).toHaveBeenCalledOnce();
    expect(api.getSummary).toHaveBeenCalled();
    expect(api.getInvoices).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('LKR');
    expect(fixture.nativeElement.textContent).toContain('INV-001');
  });

  it('uses the expected initial query for both requests', async () => {
    await createComponent();
    const query = {
      pageNumber: 1,
      pageSize: 10,
      dateField: 'issuedAt',
      sortBy: 'createdAt',
      sortDirection: 'desc',
    };
    expect(api.getSummary).toHaveBeenCalledWith(query);
    expect(api.getInvoices).toHaveBeenCalledWith(query);
  });

  it('loads filter options', async () => {
    const fixture = await createComponent();
    await fixture.whenStable();
    expect(api.getFilterOptions).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.filterOptions()).toEqual(filterOptions);
  });

  it('search updates the backend query', async () => {
    const fixture = await createComponent();
    fixture.componentInstance.onSearchChange('INV-100');
    expect(api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'INV-100' }));
    expect(api.getInvoices).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'INV-100' }),
    );
  });

  it('tenant filter updates the backend query', async () => {
    const fixture = await createComponent();
    fixture.componentInstance.onTenantChange('tenant-1');
    expect(api.getSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1' }),
    );
    expect(api.getInvoices).toHaveBeenLastCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1' }),
    );
  });

  it('status filter updates the backend query', async () => {
    const fixture = await createComponent();
    fixture.componentInstance.onStatusChange('OVERDUE');
    expect(api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'OVERDUE' }));
    expect(api.getInvoices).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'OVERDUE' }),
    );
  });

  it('date filters update the backend query', async () => {
    const fixture = await createComponent();
    fixture.componentInstance.onDateFieldChange('dueAt');
    fixture.componentInstance.onDateRangeChange({ dateFrom: '2026-07-01', dateTo: '2026-07-15' });
    const query = fixture.componentInstance.buildQuery();
    expect(query.dateField).toBe('dueAt');
    expect(query.dateFrom).toBeTruthy();
    expect(query.dateTo).toBeTruthy();
    expect(api.getSummary).toHaveBeenLastCalledWith(query);
    expect(api.getInvoices).toHaveBeenLastCalledWith(query);
  });

  it('each filter change resets page number to 1', async () => {
    const fixture = await createComponent();
    fixture.componentInstance.pageNumber.set(3);
    fixture.componentInstance.onTenantChange('tenant-1');
    expect(fixture.componentInstance.pageNumber()).toBe(1);
    fixture.componentInstance.pageNumber.set(4);
    fixture.componentInstance.onSortChange({ sortBy: 'amount', sortDirection: 'asc' });
    expect(fixture.componentInstance.pageNumber()).toBe(1);
  });

  it('invalid date range blocks summary and invoice requests', async () => {
    const fixture = await createComponent();
    const summaryCalls = api.getSummary.mock.calls.length;
    const invoiceCalls = api.getInvoices.mock.calls.length;

    fixture.componentInstance.onDateRangeChange({ dateFrom: '2026-07-20', dateTo: '2026-07-10' });

    expect(api.getSummary.mock.calls.length).toBe(summaryCalls);
    expect(api.getInvoices.mock.calls.length).toBe(invoiceCalls);
    expect(fixture.componentInstance.hasInvalidDateRange()).toBe(true);
  });

  it('pagination preserves active filters', async () => {
    api.getInvoices.mockReturnValue(of({ ...invoiceList, totalCount: 30, totalPages: 3 }));
    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.componentInstance.onSearchChange('INV-100');
    fixture.componentInstance.onPageChange(2);
    expect(api.getInvoices).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pageNumber: 2,
        search: 'INV-100',
      }),
    );
  });

  it('page-size change preserves filters and resets page number', async () => {
    const fixture = await createComponent();
    fixture.componentInstance.onStatusChange('PAID');
    fixture.componentInstance.pageNumber.set(3);
    fixture.componentInstance.onPageSizeChange(20);
    expect(api.getSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'PAID', pageNumber: 1, pageSize: 20 }),
    );
    expect(api.getInvoices).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'PAID', pageNumber: 1, pageSize: 20 }),
    );
  });

  it('refresh preserves active filters and sorting', async () => {
    const fixture = await createComponent();
    fixture.componentInstance.onSearchChange('INV-100');
    fixture.componentInstance.onSortChange({ sortBy: 'tenant', sortDirection: 'asc' });
    const summaryCalls = api.getSummary.mock.calls.length;
    const invoiceCalls = api.getInvoices.mock.calls.length;
    fixture.componentInstance.refresh();
    expect(api.getSummary.mock.calls.length).toBe(summaryCalls + 1);
    expect(api.getInvoices.mock.calls.length).toBe(invoiceCalls + 1);
    expect(api.getSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: 'INV-100',
        sortBy: 'tenant',
        sortDirection: 'asc',
      }),
    );
  });

  it('reset restores all documented defaults', async () => {
    const fixture = await createComponent();
    fixture.componentInstance.onSearchChange('INV-100');
    fixture.componentInstance.onTenantChange('tenant-1');
    fixture.componentInstance.onStatusChange('PAID');
    fixture.componentInstance.onDateFieldChange('dueAt');
    fixture.componentInstance.onDateRangeChange({ dateFrom: '2026-07-01', dateTo: '2026-07-15' });
    fixture.componentInstance.onSortChange({ sortBy: 'amount', sortDirection: 'asc' });
    fixture.componentInstance.pageNumber.set(3);
    fixture.componentInstance.pageSize.set(20);

    fixture.componentInstance.onResetFilters({
      search: '',
      tenantId: '',
      status: '',
      dateField: 'issuedAt',
      dateFrom: '',
      dateTo: '',
    });

    expect(api.getSummary).toHaveBeenLastCalledWith({
      pageNumber: 1,
      pageSize: 20,
      dateField: 'issuedAt',
      sortBy: 'createdAt',
      sortDirection: 'desc',
    });
    expect(fixture.componentInstance.searchTerm()).toBe('');
    expect(fixture.componentInstance.tenantId()).toBe('');
    expect(fixture.componentInstance.statusFilter()).toBe('');
  });

  it('summary and invoices receive the same filter snapshot', async () => {
    const fixture = await createComponent();
    fixture.componentInstance.onTenantChange('tenant-1');
    fixture.componentInstance.onStatusChange('PENDING');
    const summaryQuery = api.getSummary.mock.calls.at(-1)?.[0];
    const invoiceQuery = api.getInvoices.mock.calls.at(-1)?.[0];
    expect(summaryQuery).toEqual(invoiceQuery);
  });

  it('filter-options failure does not erase existing invoice results', async () => {
    api.getFilterOptions.mockReturnValueOnce(throwError(() => new Error('network')));
    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.filterOptionsError()).toBe('Billing failed safely');
    expect(fixture.componentInstance.invoices()).toEqual(invoiceList);
    expect(fixture.nativeElement.textContent).toContain('INV-001');
  });

  it('older requests do not overwrite newer filtered data', async () => {
    const slowSummary$ = new Subject<PlatformBillingSummary>();
    api.getSummary.mockReset();
    api.getFilterOptions.mockReturnValue(of(filterOptions));
    api.getInvoices.mockReturnValue(of(invoiceList));
    api.getSummary
      .mockReturnValueOnce(of(summary))
      .mockReturnValueOnce(slowSummary$)
      .mockReturnValue(of({ ...summary, totalInvoices: 99 }));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.componentInstance.onSearchChange('first');
    fixture.componentInstance.onSearchChange('second');
    await fixture.whenStable();
    slowSummary$.next({ ...summary, totalInvoices: 1 });
    fixture.detectChanges();

    expect(fixture.componentInstance.summary()?.totalInvoices).toBe(99);
  });

  it('shows summary and table skeletons during initial loading', async () => {
    api.getSummary.mockReturnValue(new Subject().asObservable());
    api.getInvoices.mockReturnValue(new Subject().asObservable());
    api.getFilterOptions.mockReturnValue(new Subject().asObservable());
    const fixture = await createComponent();
    expect(fixture.nativeElement.querySelector('.summary-skeleton')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.skeleton-row')).toBeTruthy();
  });

  it('shows an API error and retries the failed invoice request', async () => {
    api.getInvoices
      .mockReturnValueOnce(throwError(() => new Error('network')))
      .mockReturnValueOnce(of(invoiceList));
    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Invoices could not be loaded');
    const retry = Array.from(
      fixture.nativeElement.querySelectorAll(
        '.error-panel button',
      ) as NodeListOf<HTMLButtonElement>,
    ).at(-1);
    retry?.click();
    fixture.detectChanges();
    expect(api.getInvoices.mock.calls.length).toBeGreaterThan(1);
  });

  it('keeps a successful summary visible when invoices fail', async () => {
    api.getInvoices.mockReturnValue(throwError(() => new Error('network')));
    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-currency="LKR"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Invoices could not be loaded');
  });

  it('shows the empty invoice state returned by the API', async () => {
    api.getInvoices.mockReturnValue(
      of({ ...invoiceList, items: [], totalCount: 0, totalPages: 0 }),
    );
    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No invoices found');
  });

  it('uses only the billing API service and adds no mock or fallback path', async () => {
    const fixture = await createComponent();
    await fixture.whenStable();
    expect(fixture.componentInstance.invoices()).toEqual(invoiceList);
  });

  it('lazy-loads the billing page and preserves the view permission', async () => {
    const route = (adminRoutes[0]?.children ?? adminRoutes).find((entry) => entry.path === 'billing');
    const component = await (route?.loadComponent as () => Promise<unknown>)();
    expect(component).toBe(PlatformBillingPage);
    expect(route?.data?.['requiredPermission']).toBe(platformPermissions.billingView);
  });

  it('selecting View opens the detail panel and loads detail plus payments', async () => {
    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.detailOpen()).toBe(true);
    expect(api.getInvoice).toHaveBeenCalledWith('invoice-1');
    expect(api.getInvoicePayments).toHaveBeenCalledWith('invoice-1');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('INV-001');
    expect(fixture.nativeElement.textContent).toContain('Stripe');
  });

  it('shows detail and payment loading states independently', async () => {
    api.getInvoice.mockReturnValue(new Subject().asObservable());
    api.getInvoicePayments.mockReturnValue(new Subject().asObservable());
    const fixture = await createComponent();
    fixture.componentInstance.onViewInvoice('invoice-1');
    fixture.detectChanges();

    expect(fixture.componentInstance.detailLoading()).toBe(true);
    expect(fixture.componentInstance.paymentsLoading()).toBe(true);
    expect(
      fixture.nativeElement.querySelector('[aria-label="Loading invoice detail"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[aria-label="Loading payment history"]'),
    ).toBeTruthy();
  });

  it('shows invoice-not-found state', async () => {
    api.getInvoice.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: {
              success: false,
              message: 'Invoice was not found.',
              errorCode: 'platform_billing.invoice_not_found',
              errors: [],
            },
          }),
      ),
    );
    const fixture = await createComponent();
    fixture.componentInstance.onViewInvoice('missing');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.detailNotFound()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Invoice not found');
  });

  it('retries detail and payment requests independently', async () => {
    api.getInvoice
      .mockReturnValueOnce(throwError(() => new Error('network')))
      .mockReturnValueOnce(of(invoiceDetail));
    api.getInvoicePayments
      .mockReturnValueOnce(throwError(() => new Error('network')))
      .mockReturnValueOnce(of(payments));

    const fixture = await createComponent();
    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.loadInvoiceDetail();
    fixture.componentInstance.loadInvoicePayments();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.getInvoice).toHaveBeenCalledTimes(2);
    expect(api.getInvoicePayments).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.invoiceDetail()).toEqual(invoiceDetail);
    expect(fixture.componentInstance.payments()).toEqual(payments);
  });

  it('keeps loaded invoice detail when payment history fails', async () => {
    api.getInvoicePayments.mockReturnValue(throwError(() => new Error('network')));
    const fixture = await createComponent();
    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.invoiceDetail()).toEqual(invoiceDetail);
    expect(fixture.nativeElement.textContent).toContain('INV-001');
    expect(fixture.nativeElement.textContent).toContain('Payment history could not be loaded');
  });

  it('shows empty payment history', async () => {
    api.getInvoicePayments.mockReturnValue(of([]));
    const fixture = await createComponent();
    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No payment history is available for this invoice.',
    );
  });

  it('closing clears selected detail state', async () => {
    const fixture = await createComponent();
    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();
    fixture.componentInstance.closeDetail();
    fixture.detectChanges();

    expect(fixture.componentInstance.detailOpen()).toBe(false);
    expect(fixture.componentInstance.selectedInvoiceId()).toBeNull();
    expect(fixture.componentInstance.invoiceDetail()).toBeNull();
    expect(fixture.componentInstance.payments()).toEqual([]);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('selecting another invoice does not keep previous invoice data', async () => {
    const secondDetail: PlatformBillingInvoiceDetail = {
      ...invoiceDetail,
      invoice: invoiceList.items[1],
      lines: [],
    };
    api.getInvoice.mockReturnValueOnce(of(invoiceDetail)).mockReturnValueOnce(of(secondDetail));
    api.getInvoicePayments.mockReturnValue(of([]));

    const fixture = await createComponent();
    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();
    fixture.componentInstance.onViewInvoice('invoice-2');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedInvoiceId()).toBe('invoice-2');
    expect(fixture.componentInstance.invoiceDetail()?.invoice.invoiceNumber).toBe('INV-002');
    expect(fixture.nativeElement.querySelector('#invoice-detail-title')?.textContent?.trim()).toBe(
      'INV-002',
    );
  });

  it('ignores stale detail responses', async () => {
    const slowDetail$ = new Subject<PlatformBillingInvoiceDetail>();
    const secondDetail: PlatformBillingInvoiceDetail = {
      ...invoiceDetail,
      invoice: invoiceList.items[1],
    };
    api.getInvoice.mockReturnValueOnce(slowDetail$).mockReturnValueOnce(of(secondDetail));
    api.getInvoicePayments.mockReturnValue(of([]));

    const fixture = await createComponent();
    fixture.componentInstance.onViewInvoice('invoice-1');
    fixture.componentInstance.onViewInvoice('invoice-2');
    await fixture.whenStable();
    slowDetail$.next(invoiceDetail);
    fixture.detectChanges();

    expect(fixture.componentInstance.invoiceDetail()?.invoice.id).toBe('invoice-2');
  });

  it('does not call mutation APIs when only viewing detail', async () => {
    const fixture = await createComponent([platformPermissions.billingManage]);
    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();
    expect(api.issueInvoice).not.toHaveBeenCalled();
    expect(api.markInvoicePaid).not.toHaveBeenCalled();
  });

  it('Escape closes the detail drawer', async () => {
    const fixture = await createComponent();
    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();
    fixture.detectChanges();
    fixture.componentInstance.onEscape();
    fixture.detectChanges();
    expect(fixture.componentInstance.detailOpen()).toBe(false);
  });

  it('opening detail does not reload the invoice list', async () => {
    const fixture = await createComponent();
    await fixture.whenStable();
    const invoiceCalls = api.getInvoices.mock.calls.length;
    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();
    expect(api.getInvoices.mock.calls.length).toBe(invoiceCalls);
  });

  it('hides mutation actions without manage permission', async () => {
    const fixture = await createComponent([platformPermissions.billingView]);
    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Read only');
    expect(fixture.nativeElement.textContent).toContain('INV-001');
    expect(fixture.nativeElement.textContent).not.toContain('Issue invoice');
    expect(fixture.nativeElement.textContent).not.toContain('Mark as paid');
  });

  it('shows Issue for manage users when canIssue is true', async () => {
    api.getInvoice.mockReturnValue(of(draftDetail));
    const fixture = await createComponent([platformPermissions.billingManage]);
    fixture.componentInstance.onViewInvoice('invoice-draft');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Issue invoice');
    expect(fixture.nativeElement.textContent).not.toContain('Mark as paid');
    expect(fixture.nativeElement.textContent).not.toContain('Read only');
  });

  it('shows Mark Paid for manage users when canMarkPaid is true', async () => {
    const fixture = await createComponent([platformPermissions.billingManage]);
    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mark as paid');
    expect(fixture.nativeElement.textContent).not.toContain('Issue invoice');
  });

  it('hides invalid actions when manage is present but eligibility is false', async () => {
    api.getInvoice.mockReturnValue(
      of({
        ...invoiceDetail,
        invoice: { ...pendingInvoice, canIssue: false, canMarkPaid: false, displayStatus: 'PAID' },
      }),
    );
    const fixture = await createComponent([platformPermissions.billingManage]);
    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Issue invoice');
    expect(fixture.nativeElement.textContent).not.toContain('Mark as paid');
  });

  it('issues an invoice with expectedUpdatedAt and refreshes data once', async () => {
    const issuedInvoice = {
      ...draftInvoice,
      storedStatus: 'PENDING' as const,
      displayStatus: 'PENDING' as const,
      canIssue: false,
      canMarkPaid: true,
      updatedAt: '2026-07-01T09:00:00Z',
    };
    const issuedDetail = { ...draftDetail, invoice: issuedInvoice };
    api.getInvoice.mockReturnValueOnce(of(draftDetail)).mockReturnValue(of(issuedDetail));
    api.issueInvoice.mockReturnValue(of(issuedInvoice));

    const fixture = await createComponent([platformPermissions.billingManage]);
    fixture.componentInstance.onSearchChange('INV');
    fixture.componentInstance.onViewInvoice('invoice-draft');
    await fixture.whenStable();
    fixture.detectChanges();

    const summaryCallsBefore = api.getSummary.mock.calls.length;
    const invoiceCallsBefore = api.getInvoices.mock.calls.length;

    fixture.componentInstance.openIssueConfirmation();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Issue invoice?');
    expect(fixture.nativeElement.textContent).toContain('Draft to Pending');

    fixture.componentInstance.onMutationConfirmed('ISSUE');
    fixture.componentInstance.onMutationConfirmed('ISSUE');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.issueInvoice).toHaveBeenCalledTimes(1);
    expect(api.issueInvoice).toHaveBeenCalledWith('invoice-draft', {
      expectedUpdatedAt: '2026-07-01T08:00:00Z',
    });
    expect(fixture.componentInstance.successMessage()).toBe('Invoice issued successfully.');
    expect(fixture.componentInstance.confirmationMode()).toBeNull();
    expect(api.getSummary.mock.calls.length).toBeGreaterThan(summaryCallsBefore);
    expect(api.getInvoices.mock.calls.length).toBeGreaterThan(invoiceCallsBefore);
    expect(api.getInvoice.mock.calls.length).toBeGreaterThan(1);
    expect(fixture.componentInstance.searchTerm()).toBe('INV');
    expect(fixture.nativeElement.textContent).not.toContain('payment transaction created');
  });

  it('marks an invoice paid without paidAt and refreshes payment history', async () => {
    const paidInvoice = {
      ...pendingInvoice,
      storedStatus: 'PAID' as const,
      displayStatus: 'PAID' as const,
      paidAmount: 1250,
      balanceDue: 0,
      canMarkPaid: false,
      paidAt: '2026-07-16T00:00:00Z',
      updatedAt: '2026-07-16T00:00:00Z',
    };
    const paidDetail = { ...invoiceDetail, invoice: paidInvoice };
    api.getInvoice.mockReturnValueOnce(of(invoiceDetail)).mockReturnValue(of(paidDetail));
    api.getInvoicePayments.mockReturnValueOnce(of(payments)).mockReturnValue(of([]));
    api.markInvoicePaid.mockReturnValue(of(paidInvoice));

    const fixture = await createComponent([platformPermissions.billingManage]);
    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.openMarkPaidConfirmation();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Mark invoice as paid?');
    expect(fixture.nativeElement.textContent).toContain(
      'may not create a payment-history transaction',
    );

    fixture.componentInstance.onMutationConfirmed('MARK_PAID');
    fixture.componentInstance.onMutationConfirmed('MARK_PAID');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.markInvoicePaid).toHaveBeenCalledTimes(1);
    expect(api.markInvoicePaid).toHaveBeenCalledWith('invoice-1', {
      expectedUpdatedAt: '2026-07-01T12:00:00Z',
    });
    expect(fixture.componentInstance.successMessage()).toBe('Invoice marked as paid successfully.');
    expect(api.getInvoicePayments.mock.calls.length).toBeGreaterThan(1);
    expect(fixture.nativeElement.textContent).toContain(
      'No payment history is available for this invoice.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('payment transaction created');
  });

  it('handles invalid_transition with distinct UX and reload', async () => {
    api.markInvoicePaid.mockReturnValue(
      throwError(() =>
        billingHttpError('platform_billing.invalid_transition', 409, 'Invalid transition'),
      ),
    );
    const fixture = await createComponent([platformPermissions.billingManage]);
    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();

    const summaryCallsBefore = api.getSummary.mock.calls.length;
    fixture.componentInstance.openMarkPaidConfirmation();
    fixture.componentInstance.onMutationConfirmed('MARK_PAID');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.mutationError()).toContain('can no longer use that action');
    expect(fixture.componentInstance.confirmationMode()).toBeNull();
    expect(fixture.componentInstance.detailOpen()).toBe(true);
    expect(api.getSummary.mock.calls.length).toBeGreaterThan(summaryCallsBefore);
    expect(api.getInvoice.mock.calls.length).toBeGreaterThan(1);
  });

  it('handles concurrency_conflict with distinct UX and reload', async () => {
    api.issueInvoice.mockReturnValue(
      throwError(() =>
        billingHttpError('platform_billing.concurrency_conflict', 409, 'Concurrency conflict'),
      ),
    );
    api.getInvoice.mockReturnValue(of(draftDetail));
    const fixture = await createComponent([platformPermissions.billingManage]);
    fixture.componentInstance.onViewInvoice('invoice-draft');
    await fixture.whenStable();

    fixture.componentInstance.openIssueConfirmation();
    fixture.componentInstance.onMutationConfirmed('ISSUE');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.mutationError()).toContain('updated elsewhere');
    expect(fixture.componentInstance.confirmationMode()).toBeNull();
    expect(fixture.componentInstance.detailOpen()).toBe(true);
  });

  it('handles access_denied by hiding mutation actions', async () => {
    api.markInvoicePaid.mockReturnValue(
      throwError(() => billingHttpError('platform_billing.access_denied', 403, 'Denied')),
    );
    const fixture = await createComponent([platformPermissions.billingManage]);
    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.openMarkPaidConfirmation();
    fixture.componentInstance.onMutationConfirmed('MARK_PAID');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.mutationError()).toContain('do not have permission');
    expect(fixture.componentInstance.canManageBilling()).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Mark as paid');
    expect(fixture.nativeElement.textContent).toContain('Read only');
  });

  it('keeps loaded detail on generic mutation errors', async () => {
    api.markInvoicePaid.mockReturnValue(throwError(() => new Error('network')));
    const fixture = await createComponent([platformPermissions.billingManage]);
    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();

    fixture.componentInstance.openMarkPaidConfirmation();
    fixture.componentInstance.onMutationConfirmed('MARK_PAID');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.invoiceDetail()).toEqual(invoiceDetail);
    expect(fixture.componentInstance.detailOpen()).toBe(true);
    expect(fixture.componentInstance.mutationError()).toBe('Billing failed safely');
  });

  it('Escape closes confirmation before the detail drawer', async () => {
    const fixture = await createComponent([platformPermissions.billingManage]);
    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();
    fixture.componentInstance.openMarkPaidConfirmation();
    fixture.detectChanges();

    fixture.componentInstance.onEscape();
    fixture.detectChanges();

    expect(fixture.componentInstance.confirmationMode()).toBeNull();
    expect(fixture.componentInstance.detailOpen()).toBe(true);
  });

  it('shows loading and blocks duplicate POSTs while mutation is in flight', async () => {
    const pending$ = new Subject<typeof pendingInvoice>();
    api.markInvoicePaid.mockReturnValue(pending$.asObservable());
    const fixture = await createComponent([platformPermissions.billingManage]);
    fixture.componentInstance.onViewInvoice('invoice-1');
    await fixture.whenStable();

    fixture.componentInstance.openMarkPaidConfirmation();
    fixture.componentInstance.onMutationConfirmed('MARK_PAID');
    fixture.componentInstance.onMutationConfirmed('MARK_PAID');
    fixture.detectChanges();

    expect(api.markInvoicePaid).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.mutationLoading()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Marking paid…');

    pending$.next(pendingInvoice);
    pending$.complete();
    await fixture.whenStable();
  });
});
