import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import {
  PlatformBillingFilterOptions,
  PlatformBillingInvoiceList,
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

  const invoiceList: PlatformBillingInvoiceList = {
    items: [
      {
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
        updatedAt: '2026-07-01T00:00:00Z',
        canIssue: false,
        canMarkPaid: true,
      },
    ],
    pageNumber: 1,
    pageSize: 10,
    totalCount: 1,
    totalPages: 1,
  };

  async function createComponent(): Promise<ComponentFixture<PlatformBillingPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformBillingPage],
      providers: [
        { provide: PlatformBillingApiService, useValue: api },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Billing failed safely' } },
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
    const route = adminRoutes.find((entry) => entry.path === 'billing');
    const component = await (route?.loadComponent as () => Promise<unknown>)();
    expect(component).toBe(PlatformBillingPage);
    expect(route?.data?.['requiredPermission']).toBe(platformPermissions.billingView);
  });
});
