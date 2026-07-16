import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformBillingPaymentTransaction } from '../../models/platform-billing.model';
import { PlatformBillingPaymentHistory } from './platform-billing-payment-history';

describe('PlatformBillingPaymentHistory', () => {
  function payment(
    overrides: Partial<PlatformBillingPaymentTransaction> = {},
  ): PlatformBillingPaymentTransaction {
    return {
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
      ...overrides,
    };
  }

  async function createComponent(
    inputs: {
      payments?: PlatformBillingPaymentTransaction[];
      loading?: boolean;
      error?: string | null;
    } = {},
  ): Promise<ComponentFixture<PlatformBillingPaymentHistory>> {
    await TestBed.configureTestingModule({
      imports: [PlatformBillingPaymentHistory],
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformBillingPaymentHistory);
    fixture.componentRef.setInput('payments', inputs.payments ?? []);
    fixture.componentRef.setInput('loading', inputs.loading ?? false);
    fixture.componentRef.setInput('error', inputs.error ?? null);
    fixture.detectChanges();
    return fixture;
  }

  it('renders payment transactions', async () => {
    const fixture = await createComponent({ payments: [payment()] });
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Stripe');
    expect(text).toContain('txn_123');
    expect(text).toContain('succeeded');
  });

  it('formats each payment using its own currency', async () => {
    const fixture = await createComponent({
      payments: [
        payment({ id: 'p1', currencyCode: 'LKR', amount: 1000 }),
        payment({ id: 'p2', currencyCode: 'USD', amount: 25, providerFee: 1, netAmount: 24 }),
      ],
    });
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('LKR');
    expect(text).toContain('USD');
  });

  it('renders provider and reference', async () => {
    const fixture = await createComponent({
      payments: [payment({ providerName: 'PayHere', providerTransactionId: 'ph_99' })],
    });
    expect(fixture.nativeElement.textContent).toContain('PayHere');
    expect(fixture.nativeElement.textContent).toContain('ph_99');
  });

  it('handles empty payment history', async () => {
    const fixture = await createComponent({ payments: [] });
    expect(fixture.nativeElement.textContent).toContain(
      'No payment history is available for this invoice.',
    );
  });

  it('handles nullable fields', async () => {
    const fixture = await createComponent({
      payments: [
        payment({
          paidAt: null,
          providerName: '',
          providerTransactionId: '',
          status: '',
        }),
      ],
    });
    expect(fixture.nativeElement.textContent).toContain('—');
  });

  it('does not create fallback records', async () => {
    const fixture = await createComponent({ payments: [] });
    expect(fixture.nativeElement.querySelector('tbody')).toBeNull();
  });

  it('does not claim Mark Paid created a transaction', async () => {
    const fixture = await createComponent({ payments: [] });
    expect(fixture.nativeElement.textContent).not.toContain('Mark Paid');
    expect(fixture.nativeElement.textContent).not.toContain('created a transaction');
  });

  it('exposes accessible section labelling', async () => {
    const fixture = await createComponent({ payments: [payment()] });
    expect(fixture.nativeElement.querySelector('#payment-history-title')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[aria-labelledby="payment-history-title"]'),
    ).toBeTruthy();
  });

  it('shows payment error and emits retry', async () => {
    const fixture = await createComponent({ error: 'Payment history failed safely' });
    expect(fixture.nativeElement.textContent).toContain('Payment history could not be loaded');
    expect(fixture.nativeElement.textContent).toContain('Try again');
    const emitted: string[] = [];
    fixture.componentInstance.retryLoad.subscribe(() => emitted.push('retry'));
    fixture.componentInstance.onRetry();
    expect(emitted).toEqual(['retry']);
  });
});
