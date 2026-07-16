import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  PlatformBillingMutationConfirmation,
  PlatformBillingMutationMode,
} from './platform-billing-mutation-confirmation';

describe('PlatformBillingMutationConfirmation', () => {
  async function createComponent(
    mode: PlatformBillingMutationMode,
    overrides: {
      loading?: boolean;
      balanceDue?: number;
      currencyCode?: string;
    } = {},
  ): Promise<ComponentFixture<PlatformBillingMutationConfirmation>> {
    await TestBed.configureTestingModule({
      imports: [PlatformBillingMutationConfirmation],
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformBillingMutationConfirmation);
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('invoiceNumber', 'INV-001');
    fixture.componentRef.setInput('tenantName', 'Nytroz Shop');
    fixture.componentRef.setInput('displayStatus', mode === 'ISSUE' ? 'DRAFT' : 'PENDING');
    fixture.componentRef.setInput('balanceDue', overrides.balanceDue ?? 250);
    fixture.componentRef.setInput('currencyCode', overrides.currencyCode ?? 'LKR');
    fixture.componentRef.setInput('loading', overrides.loading ?? false);
    fixture.detectChanges();
    return fixture;
  }

  it('renders Issue mode with invoice identity and draft transition copy', async () => {
    const fixture = await createComponent('ISSUE');
    const text = fixture.nativeElement.textContent ?? '';
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('#billing-mutation-confirmation-title'),
    ).toBeTruthy();
    expect(text).toContain('Issue invoice?');
    expect(text).toContain('INV-001');
    expect(text).toContain('Nytroz Shop');
    expect(text).toContain('DRAFT');
    expect(text).toContain('Draft to Pending');
  });

  it('renders Mark Paid mode with outstanding amount and currency', async () => {
    const fixture = await createComponent('MARK_PAID', { balanceDue: 1250, currencyCode: 'USD' });
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Mark invoice as paid?');
    expect(text).toContain('INV-001');
    expect(text).toContain('USD');
    expect(text).toContain('1,250.00');
  });

  it('does not claim Mark Paid creates a payment transaction', async () => {
    const fixture = await createComponent('MARK_PAID');
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('may not create a payment-history transaction');
    expect(text.toLowerCase()).not.toContain('payment transaction created');
  });

  it('emits confirm for the active mode', async () => {
    const fixture = await createComponent('ISSUE');
    const emitted: PlatformBillingMutationMode[] = [];
    fixture.componentInstance.confirmed.subscribe((mode) => emitted.push(mode));
    fixture.componentInstance.onConfirm();
    expect(emitted).toEqual(['ISSUE']);
  });

  it('emits cancel', async () => {
    const fixture = await createComponent('MARK_PAID');
    const emitted: string[] = [];
    fixture.componentInstance.cancelled.subscribe(() => emitted.push('cancelled'));
    fixture.componentInstance.onCancel();
    expect(emitted).toEqual(['cancelled']);
  });

  it('loading prevents duplicate confirm and cancel', async () => {
    const fixture = await createComponent('ISSUE', { loading: true });
    const confirmed: PlatformBillingMutationMode[] = [];
    const cancelled: string[] = [];
    fixture.componentInstance.confirmed.subscribe((mode) => confirmed.push(mode));
    fixture.componentInstance.cancelled.subscribe(() => cancelled.push('cancelled'));

    fixture.componentInstance.onConfirm();
    fixture.componentInstance.onCancel();
    fixture.componentInstance.onBackdropClick();

    expect(confirmed).toEqual([]);
    expect(cancelled).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Issuing…');
    expect(
      (fixture.nativeElement.querySelector('.btn.primary') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('provides accessible dialog labelling', async () => {
    const fixture = await createComponent('MARK_PAID');
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute('aria-labelledby')).toBe('billing-mutation-confirmation-title');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('focuses the confirm button after view init', async () => {
    const fixture = await createComponent('ISSUE');
    await fixture.whenStable();
    await Promise.resolve();
    const confirm = fixture.nativeElement.querySelector('.btn.primary') as HTMLButtonElement;
    expect(document.activeElement).toBe(confirm);
  });
});
