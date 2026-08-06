import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { manualPaymentQueue } from '../../../../testing/manual-payment-test-fixtures';
import { PlatformBillingApiService } from '../../services/platform-billing-api.service';
import { PlatformManualPaymentsPage } from './platform-manual-payments-page';

describe('PlatformManualPaymentsPage', () => {
  let api: { getManualPayments: ReturnType<typeof vi.fn> };
  async function create(): Promise<ComponentFixture<PlatformManualPaymentsPage>> {
    await TestBed.configureTestingModule({ imports: [PlatformManualPaymentsPage], providers: [provideRouter([]),
      { provide: PlatformBillingApiService, useValue: api }, { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Queue failed safely' } }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(PlatformManualPaymentsPage); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); return fixture;
  }
  beforeEach(() => api = { getManualPayments: vi.fn().mockReturnValue(of(manualPaymentQueue())) });

  it('renders queue rows, amounts, status, and review navigation', async () => {
    const fixture = await create(); const text = fixture.nativeElement.textContent;
    expect(text).toContain('Alpha Retail'); expect(text).toContain('INV-001'); expect(text).toContain('Payment Submitted');
    expect(fixture.nativeElement.querySelector('a[href="/admin/billing/manual-payments/payment-1"]')).not.toBeNull();
  });
  it('renders loading, empty, and safe failure states', async () => {
    api.getManualPayments.mockReturnValue(new Subject().asObservable()); let fixture = await create();
    expect(fixture.nativeElement.textContent).toContain('Loading manual payments'); fixture.destroy(); TestBed.resetTestingModule();
    api.getManualPayments.mockReturnValue(of({ ...manualPaymentQueue(), items: [], totalCount: 0, totalPages: 0 })); fixture = await create();
    expect(fixture.nativeElement.textContent).toContain('No manual payments match'); fixture.destroy(); TestBed.resetTestingModule();
    api.getManualPayments.mockReturnValue(throwError(() => new Error('raw'))); fixture = await create();
    expect(fixture.nativeElement.textContent).toContain('Queue failed safely');
  });
  it('applies filters and resets pagination', async () => {
    const fixture = await create(); const component = fixture.componentInstance;
    component.search.set('INV'); component.status.set('PAID'); component.pageNumber.set(2); component.applyFilters();
    expect(component.pageNumber()).toBe(1); expect(api.getManualPayments).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'INV', status: 'PAID' }));
  });
});
