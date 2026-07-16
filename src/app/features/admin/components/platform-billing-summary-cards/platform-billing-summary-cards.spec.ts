import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformBillingSummary } from '../../models/platform-billing.model';
import { PlatformBillingSummaryCards } from './platform-billing-summary-cards';

describe('PlatformBillingSummaryCards', () => {
  const summary: PlatformBillingSummary = {
    currencies: [
      { currencyCode: 'LKR', paidRevenue: 1250.5, outstandingAmount: 400, overdueAmount: 100, invoiceCount: 3 },
      { currencyCode: 'USD', paidRevenue: 25.75, outstandingAmount: 10, overdueAmount: 0, invoiceCount: 2 }
    ],
    totalInvoices: 5,
    generatedAt: '2026-07-16T00:00:00Z'
  };

  async function createComponent(value: PlatformBillingSummary | null = summary): Promise<ComponentFixture<PlatformBillingSummaryCards>> {
    await TestBed.configureTestingModule({ imports: [PlatformBillingSummaryCards] }).compileComponents();
    const fixture = TestBed.createComponent(PlatformBillingSummaryCards);
    fixture.componentRef.setInput('summary', value);
    fixture.detectChanges();
    return fixture;
  }

  it('renders every currency in a separate card', async () => {
    const fixture = await createComponent();
    expect(fixture.nativeElement.querySelectorAll('.summary-card')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('[data-currency="LKR"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-currency="USD"]')).toBeTruthy();
  });

  it('never aggregates amounts from different currencies', async () => {
    const fixture = await createComponent();
    const lkr = fixture.nativeElement.querySelector('[data-currency="LKR"]')?.textContent ?? '';
    const usd = fixture.nativeElement.querySelector('[data-currency="USD"]')?.textContent ?? '';
    expect(lkr).toContain('1,250.50');
    expect(lkr).not.toContain('25.75');
    expect(usd).toContain('25.75');
    expect(usd).not.toContain('1,250.50');
  });

  it('handles a summary with no currency entries', async () => {
    const fixture = await createComponent({ ...summary, currencies: [], totalInvoices: 0 });
    expect(fixture.nativeElement.textContent).toContain('No billing summary is available');
    expect(fixture.nativeElement.querySelector('.summary-card')).toBeNull();
  });

  it('formats each amount using its own currency', async () => {
    const fixture = await createComponent();
    const lkr = fixture.nativeElement.querySelector('[data-currency="LKR"]')?.textContent ?? '';
    const usd = fixture.nativeElement.querySelector('[data-currency="USD"]')?.textContent ?? '';
    expect(lkr).toMatch(/LKR|Rs/);
    expect(usd).toContain('$');
  });
});
