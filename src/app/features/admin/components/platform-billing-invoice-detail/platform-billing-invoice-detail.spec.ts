import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  PlatformBillingDisplayStatus,
  PlatformBillingInvoiceDetail,
  PlatformBillingInvoiceListItem,
} from '../../models/platform-billing.model';
import { PlatformBillingInvoiceDetailPanel } from './platform-billing-invoice-detail';

describe('PlatformBillingInvoiceDetailPanel', () => {
  function invoice(
    status: PlatformBillingDisplayStatus,
    overrides: Partial<PlatformBillingInvoiceListItem> = {},
  ): PlatformBillingInvoiceListItem {
    return {
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
      paidAmount: 250,
      balanceDue: 1000,
      storedStatus: status === 'OVERDUE' ? 'PENDING' : status,
      displayStatus: status,
      issuedAt: '2026-07-01T00:00:00Z',
      dueAt: '2026-07-31T00:00:00Z',
      paidAt: null,
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-02T00:00:00Z',
      canIssue: false,
      canMarkPaid: false,
      ...overrides,
    };
  }

  function detail(
    overrides: Partial<PlatformBillingInvoiceDetail> = {},
  ): PlatformBillingInvoiceDetail {
    return {
      invoice: invoice('PENDING'),
      invoiceType: 'subscription',
      billingCycle: 'monthly',
      billingPeriodStart: '2026-07-01T00:00:00Z',
      billingPeriodEnd: '2026-07-31T00:00:00Z',
      subtotalAmount: 1000,
      discountAmount: 50,
      taxAmount: 300,
      lines: [
        {
          id: 'line-1',
          lineNumber: '1',
          description: 'Pro plan subscription',
          quantity: 1,
          unitPrice: 1000,
          discountAmount: 50,
          taxAmount: 300,
          lineTotal: 1250,
        },
      ],
      payments: [],
      ...overrides,
    };
  }

  async function createComponent(
    inputs: {
      detail?: PlatformBillingInvoiceDetail | null;
      loading?: boolean;
      error?: string | null;
      notFound?: boolean;
    } = {},
  ): Promise<ComponentFixture<PlatformBillingInvoiceDetailPanel>> {
    await TestBed.configureTestingModule({
      imports: [PlatformBillingInvoiceDetailPanel],
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformBillingInvoiceDetailPanel);
    fixture.componentRef.setInput('detail', inputs.detail ?? null);
    fixture.componentRef.setInput('loading', inputs.loading ?? false);
    fixture.componentRef.setInput('error', inputs.error ?? null);
    fixture.componentRef.setInput('notFound', inputs.notFound ?? false);
    fixture.detectChanges();
    return fixture;
  }

  it('renders invoice number and tenant', async () => {
    const fixture = await createComponent({ detail: detail() });
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('INV-001');
    expect(text).toContain('Nytroz Shop');
    expect(text).toContain('TEN-1');
  });

  it('renders all supported statuses', async () => {
    const fixture = await createComponent({
      detail: detail({ invoice: invoice('DRAFT') }),
    });

    for (const status of ['DRAFT', 'PENDING', 'OVERDUE', 'PAID'] as const) {
      fixture.componentRef.setInput('detail', detail({ invoice: invoice(status) }));
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(status);
    }
  });

  it('renders nullable dates safely', async () => {
    const fixture = await createComponent({
      detail: detail({
        invoice: invoice('DRAFT', { issuedAt: null, dueAt: null, paidAt: null }),
        billingPeriodStart: null,
        billingPeriodEnd: null,
        billingCycle: null,
      }),
    });
    expect(fixture.nativeElement.textContent).toContain('—');
  });

  it('formats monetary values using the invoice currency', async () => {
    const fixture = await createComponent({ detail: detail() });
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('LKR');
    expect(text).toContain('1,000.00');
    expect(text).toContain('1,250.00');
  });

  it('renders line items', async () => {
    const fixture = await createComponent({ detail: detail() });
    expect(fixture.nativeElement.textContent).toContain('Pro plan subscription');
    expect(fixture.nativeElement.textContent).toContain('Line items');
  });

  it('handles no line items', async () => {
    const fixture = await createComponent({ detail: detail({ lines: [] }) });
    expect(fixture.nativeElement.textContent).toContain('No line items');
  });

  it('handles decimal quantities', async () => {
    const fixture = await createComponent({
      detail: detail({
        lines: [
          {
            id: 'line-1',
            lineNumber: '1',
            description: 'Prorated seat',
            quantity: 1.5,
            unitPrice: 100,
            discountAmount: 0,
            taxAmount: 0,
            lineTotal: 150,
          },
        ],
      }),
    });
    expect(fixture.nativeElement.textContent).toContain('1.5');
  });

  it('does not aggregate currencies', async () => {
    const fixture = await createComponent({
      detail: detail({
        invoice: invoice('PENDING', {
          currencyCode: 'USD',
          totalAmount: 20,
          paidAmount: 5,
          balanceDue: 15,
        }),
      }),
    });
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('USD');
    expect(text).not.toContain('LKR');
  });

  it('renders no mutation controls', async () => {
    const fixture = await createComponent({ detail: detail() });
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).map((button) => button.textContent?.trim());
    expect(labels).not.toContain('Issue');
    expect(labels).not.toContain('Mark paid');
    expect(fixture.nativeElement.textContent).not.toContain('Mark Paid');
  });

  it('emits close action', async () => {
    const fixture = await createComponent({ detail: detail() });
    expect(
      fixture.nativeElement.querySelector('button[aria-label="Close invoice detail"]'),
    ).toBeTruthy();
    const emitted: string[] = [];
    fixture.componentInstance.dismiss.subscribe(() => emitted.push('closed'));
    fixture.componentInstance.onClose();
    expect(emitted).toEqual(['closed']);
  });

  it('provides accessible dialog labelling through the title id', async () => {
    const fixture = await createComponent({ detail: detail() });
    expect(fixture.nativeElement.querySelector('#invoice-detail-title')).toBeTruthy();
  });

  it('shows not-found state', async () => {
    const fixture = await createComponent({
      notFound: true,
      error: 'Invoice was not found.',
    });
    expect(fixture.nativeElement.textContent).toContain('Invoice not found');
  });
});
