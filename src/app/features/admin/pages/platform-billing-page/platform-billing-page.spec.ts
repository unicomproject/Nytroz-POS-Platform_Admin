import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { PlatformBillingInvoiceList, PlatformBillingSummary } from '../../models/platform-billing.model';
import { adminRoutes } from '../../routes/admin.routes';
import { PlatformBillingApiService } from '../../services/platform-billing-api.service';
import { PlatformBillingPage } from './platform-billing-page';

describe('PlatformBillingPage', () => {
  let api: { getSummary: ReturnType<typeof vi.fn>; getInvoices: ReturnType<typeof vi.fn> };
  const summary: PlatformBillingSummary = {
    currencies: [{ currencyCode: 'LKR', paidRevenue: 1000, outstandingAmount: 250, overdueAmount: 50, invoiceCount: 1 }],
    totalInvoices: 1, generatedAt: '2026-07-16T00:00:00Z'
  };
  const invoiceList: PlatformBillingInvoiceList = {
    items: [{
      id: 'invoice-1', invoiceNumber: 'INV-001', tenantId: 'tenant-1', tenantCode: 'TEN-1', tenantName: 'Nytroz Shop',
      subscriptionId: 'subscription-1', subscriptionStatus: 'active', planId: 'plan-1', planCode: 'PRO', planName: 'Pro',
      currencyCode: 'LKR', totalAmount: 1250, paidAmount: 1000, balanceDue: 250, storedStatus: 'PENDING', displayStatus: 'PENDING',
      issuedAt: '2026-07-01T00:00:00Z', dueAt: '2026-07-31T00:00:00Z', paidAt: null, createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z', canIssue: false, canMarkPaid: true
    }],
    pageNumber: 1, pageSize: 10, totalCount: 1, totalPages: 1
  };

  async function createComponent(): Promise<ComponentFixture<PlatformBillingPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformBillingPage],
      providers: [
        { provide: PlatformBillingApiService, useValue: api },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Billing failed safely' } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(PlatformBillingPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    api = { getSummary: vi.fn().mockReturnValue(of(summary)), getInvoices: vi.fn().mockReturnValue(of(invoiceList)) };
  });

  it('loads and renders the summary and invoices', async () => {
    const fixture = await createComponent(); await fixture.whenStable(); fixture.detectChanges();
    expect(api.getSummary).toHaveBeenCalledOnce(); expect(api.getInvoices).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('LKR'); expect(fixture.nativeElement.textContent).toContain('INV-001');
  });

  it('uses the expected initial query for both requests', async () => {
    await createComponent();
    const query = { pageNumber: 1, pageSize: 10, sortBy: 'createdAt', sortDirection: 'desc' };
    expect(api.getSummary).toHaveBeenCalledWith(query); expect(api.getInvoices).toHaveBeenCalledWith(query);
  });

  it('shows summary and table skeletons during initial loading', async () => {
    api.getSummary.mockReturnValue(new Subject().asObservable()); api.getInvoices.mockReturnValue(new Subject().asObservable());
    const fixture = await createComponent();
    expect(fixture.nativeElement.querySelector('.summary-skeleton')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.skeleton-row')).toBeTruthy();
  });

  it('shows an API error and retries the failed invoice request', async () => {
    api.getInvoices.mockReturnValueOnce(throwError(() => new Error('network'))).mockReturnValueOnce(of(invoiceList));
    const fixture = await createComponent(); await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Invoices could not be loaded');
    expect(fixture.nativeElement.textContent).toContain('Billing failed safely');
    const retry = Array.from(fixture.nativeElement.querySelectorAll('.error-panel button') as NodeListOf<HTMLButtonElement>).at(-1);
    retry?.click(); fixture.detectChanges();
    expect(api.getInvoices).toHaveBeenCalledTimes(2);
  });

  it('keeps a successful summary visible when invoices fail', async () => {
    api.getInvoices.mockReturnValue(throwError(() => new Error('network')));
    const fixture = await createComponent(); await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-currency="LKR"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Invoices could not be loaded');
  });

  it('shows the empty invoice state returned by the API', async () => {
    api.getInvoices.mockReturnValue(of({ ...invoiceList, items: [], totalCount: 0, totalPages: 0 }));
    const fixture = await createComponent(); await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No invoices found');
  });

  it('refresh reloads summary and invoices', async () => {
    const fixture = await createComponent(); fixture.detectChanges();
    const refresh = fixture.nativeElement.querySelector('.heading-actions button') as HTMLButtonElement;
    refresh.click();
    expect(api.getSummary).toHaveBeenCalledTimes(2); expect(api.getInvoices).toHaveBeenCalledTimes(2);
  });

  it('page change sends the new page number without client-side slicing', async () => {
    api.getInvoices.mockReturnValue(of({ ...invoiceList, totalCount: 30, totalPages: 3 }));
    const fixture = await createComponent();
    fixture.componentInstance.onPageChange(2);
    expect(api.getInvoices).toHaveBeenLastCalledWith(expect.objectContaining({ pageNumber: 2, pageSize: 10 }));
  });

  it('page-size change resets to page one and sends the new page size', async () => {
    const fixture = await createComponent();
    fixture.componentInstance.onPageSizeChange(20);
    expect(api.getInvoices).toHaveBeenLastCalledWith(expect.objectContaining({ pageNumber: 1, pageSize: 20 }));
  });

  it('uses only the billing API service and adds no mock or fallback path', async () => {
    const fixture = await createComponent();
    expect(fixture.componentInstance.invoices()).toEqual(invoiceList);
    expect(api.getInvoices).toHaveBeenCalledOnce();
  });

  it('lazy-loads the billing page and preserves the view permission', async () => {
    const route = adminRoutes.find((entry) => entry.path === 'billing');
    const component = await (route?.loadComponent as () => Promise<unknown>)();
    expect(component).toBe(PlatformBillingPage);
    expect(route?.data?.['requiredPermission']).toBe(platformPermissions.billingView);
  });
});
