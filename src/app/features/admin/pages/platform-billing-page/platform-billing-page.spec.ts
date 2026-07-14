import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { platformMenuConfig } from '../../../../core/config/menu.config';
import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { BillingFilterOptions, BillingInvoice, BillingInvoiceDetail, BillingInvoiceList, BillingQuery, BillingSummary } from '../../models/platform-billing.model';
import { adminRoutes } from '../../routes/admin.routes';
import { PlatformBillingApiService } from '../../services/platform-billing-api.service';
import { PlatformBillingPage } from './platform-billing-page';

describe('PlatformBillingPage', () => {
  let api: MockBillingApi; let access: { hasPermission: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    api = new MockBillingApi();
    access = { hasPermission: vi.fn((permission: string) => permission !== platformPermissions.billingManage) };
    await TestBed.configureTestingModule({
      imports: [PlatformBillingPage],
      providers: [
        provideRouter([
          { path: 'admin/billing', component: PlatformBillingPage },
          { path: 'admin/billing/invoices/:invoiceId', component: PlatformBillingPage }
        ]),
        { provide: PlatformBillingApiService, useValue: api },
        { provide: AccessControlService, useValue: access }
      ]
    }).compileComponents();
  });

  it('loads the summary and invoice list and renders KPI values and rows', () => {
    const fixture = create(); const text = fixture.nativeElement.textContent;
    expect(api.load).toHaveBeenCalledOnce();
    expect(text).toContain('Paid Revenue'); expect(text).toContain('LKR1,000.00');
    expect(text).toContain('INV-001'); expect(text).toContain('Alpha Stores');
  });

  it('renders each currency separately instead of one false combined total', () => {
    api.summary = summary([currency('LKR', 1000), currency('USD', 25)]);
    const text = create().nativeElement.textContent;
    expect(text).toContain('LKR1,000.00'); expect(text).toContain('$25.00');
    expect(text).not.toContain('1,025');
  });

  it('sends search changes to the API', () => {
    vi.useFakeTimers(); const fixture = create(); const component = fixture.componentInstance;
    component.search = 'INV-77'; component.queueSearch(); vi.advanceTimersByTime(350);
    expect(lastQuery().search).toBe('INV-77'); vi.useRealTimers();
  });

  it('sends tenant and status filters to the API', () => {
    const component = create().componentInstance;
    component.tenantId = 'tenant-1'; component.status = 'OVERDUE'; component.applyFilters();
    expect(lastQuery()).toMatchObject({ tenantId: 'tenant-1', status: 'OVERDUE', pageNumber: 1 });
  });

  it('sends the selected date field and inclusive date range', () => {
    const component = create().componentInstance;
    component.dateField = 'dueAt'; component.dateFrom = '2026-07-01'; component.dateTo = '2026-07-31'; component.applyFilters();
    expect(lastQuery()).toMatchObject({ dateField: 'dueAt', dateFrom: '2026-07-01T00:00:00.000Z', dateTo: '2026-07-31T23:59:59.999Z' });
  });

  it('updates server pagination and page size', () => {
    const component = create().componentInstance;
    component.go(2); expect(lastQuery().pageNumber).toBe(2);
    component.pageSize = 25; component.applyFilters(); expect(lastQuery()).toMatchObject({ pageNumber: 1, pageSize: 25 });
  });

  it('shows a loading state while the API is pending', () => {
    const pending = new Subject<{ summary: BillingSummary; list: BillingInvoiceList }>(); api.loadResult = pending;
    expect(create().nativeElement.textContent).toContain('Loading billing data');
  });

  it('shows the empty state for an empty page', () => {
    api.list = list([]);
    expect(create().nativeElement.textContent).toContain('No invoices match these filters');
  });

  it('shows retryable API errors including access denied', () => {
    api.loadResult = throwError(() => httpError(403, 'Platform billing access denied.'));
    const fixture = create(); const text = fixture.nativeElement.textContent;
    expect(text).toContain('Platform billing access denied.');
    (fixture.nativeElement.querySelector('.state button') as HTMLButtonElement).click();
    expect(api.load).toHaveBeenCalledTimes(2);
  });

  it('loads an invoice from a direct detail URL and supports browser-compatible initialization', async () => {
    const harness = await RouterTestingHarness.create('/admin/billing/invoices/invoice-1');
    expect(api.detail).toHaveBeenCalledWith('invoice-1');
    expect(harness.routeNativeElement?.textContent).toContain('INV-001');
    expect(TestBed.inject(Router).url).toBe('/admin/billing/invoices/invoice-1');
  });

  it('shows a retryable 404 for a missing or invalid route invoice id', async () => {
    api.detailResult = throwError(() => httpError(404, 'Invoice was not found.'));
    const harness = await RouterTestingHarness.create('/admin/billing/invoices/not-a-guid');
    expect(api.detail).toHaveBeenCalledWith('not-a-guid');
    expect(harness.routeNativeElement?.textContent).toContain('Invoice was not found.');
    const button = harness.routeNativeElement?.querySelector('.drawer .state button') as HTMLButtonElement; button.click();
    expect(api.detail).toHaveBeenCalledTimes(2);
  });

  it('closing a route-backed drawer navigates to the billing list', async () => {
    const harness = await RouterTestingHarness.create('/admin/billing/invoices/invoice-1');
    (harness.routeNativeElement?.querySelector('.drawer header button') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/admin/billing');
  });

  it('surfaces 409 concurrency feedback without hiding the financial list', () => {
    api.issueResult = throwError(() => httpError(409, 'The invoice changed. Reload it before trying again.'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fixture = create(); fixture.componentInstance.transition(invoice('DRAFT'), 'issue'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('The invoice changed. Reload it before trying again.');
    expect(fixture.nativeElement.textContent).toContain('INV-001');
  });

  it('uses billing view permission on both list and direct-detail routes', () => {
    const billingRoutes = adminRoutes.filter(route => route.path?.startsWith('billing'));
    expect(billingRoutes).toHaveLength(2);
    expect(billingRoutes.every(route => route.data?.['requiredPermission'] === platformPermissions.billingView)).toBe(true);
  });

  it('uses the manage permission code rather than a role name for action visibility', () => {
    access.hasPermission.mockReturnValue(false); let fixture = create();
    expect((fixture.nativeElement.querySelector('td.actions') as HTMLElement).textContent).toBe('View');
    expect(access.hasPermission).toHaveBeenCalledWith(platformPermissions.billingManage);
  });

  it.each([
    ['DRAFT', 'Issue', 'Mark paid'],
    ['PENDING', 'Mark paid', 'Issue'],
    ['PAID', 'View', 'Mark paid']
  ])('%s invoice exposes only valid actions', (status, expected, forbidden) => {
    access.hasPermission.mockReturnValue(true); api.list = list([invoice(status)]);
    const actions = (create().nativeElement.querySelector('td.actions') as HTMLElement).textContent ?? '';
    expect(actions).toContain(expected); expect(actions).not.toContain(forbidden);
  });

  it('keeps placeholder sidebar destinations hidden', () => {
    const labels = platformMenuConfig.flatMap(section => section.items.map(item => item.label));
    expect(labels).toContain('Billing');
    expect(labels).not.toEqual(expect.arrayContaining(['Outlets', 'Tills & Devices', 'Products', 'Reports', 'Alerts Center']));
  });

  function create(): ComponentFixture<PlatformBillingPage> {
    const fixture = TestBed.createComponent(PlatformBillingPage); fixture.detectChanges(); return fixture;
  }
  function lastQuery(): BillingQuery { return api.load.mock.calls.at(-1)![0]; }
});

class MockBillingApi {
  summary = summary([currency('LKR', 1000)]); list = list([invoice('DRAFT')]);
  loadResult?: Observable<{ summary: BillingSummary; list: BillingInvoiceList }>;
  detailResult?: Observable<BillingInvoiceDetail>; issueResult?: Observable<BillingInvoice>;
  load = vi.fn((query: BillingQuery) => this.loadResult ?? of({ summary: this.summary, list: this.list }));
  filters = vi.fn(() => of({ tenants: [{ id: 'tenant-1', code: 'ALPHA', name: 'Alpha Stores' }], statuses: ['DRAFT', 'PENDING', 'OVERDUE', 'PAID'] } satisfies BillingFilterOptions));
  detail = vi.fn((id: string) => this.detailResult ?? of(detail(invoice('DRAFT'))));
  issue = vi.fn((value: BillingInvoice) => this.issueResult ?? of({ ...value, storedStatus: 'PENDING', displayStatus: 'PENDING' }));
  markPaid = vi.fn((value: BillingInvoice) => of({ ...value, storedStatus: 'PAID', displayStatus: 'PAID', balanceDue: 0 }));
}

function currency(code: string, paid: number) { return { currencyCode: code, paidRevenue: paid, outstandingAmount: 50, overdueAmount: 20, invoiceCount: 1 }; }
function summary(currencies: ReturnType<typeof currency>[]): BillingSummary { return { currencies, totalInvoices: currencies.length, generatedAt: '2026-07-13T12:00:00Z' }; }
function list(items: BillingInvoice[]): BillingInvoiceList { return { items, pageNumber: 1, pageSize: 10, totalCount: items.length, totalPages: items.length ? 1 : 0 }; }
function invoice(status: string): BillingInvoice { return { id: 'invoice-1', invoiceNumber: 'INV-001', tenantId: 'tenant-1', tenantCode: 'ALPHA', tenantName: 'Alpha Stores', subscriptionId: 'subscription-1', subscriptionStatus: 'ACTIVE', planId: 'plan-1', planCode: 'PRO', planName: 'Professional', currencyCode: 'LKR', totalAmount: 100, paidAmount: status === 'PAID' ? 100 : 0, balanceDue: status === 'PAID' ? 0 : 100, storedStatus: status, displayStatus: status, issuedAt: status === 'DRAFT' ? null : '2026-07-10T12:00:00Z', dueAt: '2026-07-20T12:00:00Z', paidAt: status === 'PAID' ? '2026-07-12T12:00:00Z' : null, createdAt: '2026-07-09T12:00:00Z', updatedAt: '2026-07-13T12:00:00Z', canIssue: status === 'DRAFT', canMarkPaid: status === 'PENDING' }; }
function detail(value: BillingInvoice): BillingInvoiceDetail { return { invoice: value, invoiceType: 'SUBSCRIPTION', billingCycle: 'MONTHLY', billingPeriodStart: null, billingPeriodEnd: null, subtotalAmount: 100, discountAmount: 0, taxAmount: 0, lines: [], payments: [] }; }
function httpError(status: number, message: string) { return new HttpErrorResponse({ status, error: { success: false, message, errorCode: status === 409 ? 'platform_billing.concurrency_conflict' : status === 404 ? 'platform_billing.invoice_not_found' : 'platform_billing.access_denied', errors: [] } }); }
