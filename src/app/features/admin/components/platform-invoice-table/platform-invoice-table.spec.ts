import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  PlatformBillingDisplayStatus,
  PlatformBillingInvoiceList,
  PlatformBillingInvoiceListItem,
} from '../../models/platform-billing.model';
import { PlatformInvoiceTable } from './platform-invoice-table';

describe('PlatformInvoiceTable', () => {
  function invoice(
    status: PlatformBillingDisplayStatus,
    index = 1,
  ): PlatformBillingInvoiceListItem {
    return {
      id: `invoice-${index}`,
      invoiceNumber: `INV-00${index}`,
      tenantId: `tenant-${index}`,
      tenantCode: `TEN-${index}`,
      tenantName: `Tenant ${index}`,
      subscriptionId: 'subscription-1',
      subscriptionStatus: 'active',
      planId: 'plan-1',
      planCode: 'PRO',
      planName: 'Pro',
      currencyCode: index === 2 ? 'USD' : 'LKR',
      totalAmount: 1200.5,
      paidAmount: 200,
      balanceDue: 1000.5,
      storedStatus: status === 'OVERDUE' ? 'PENDING' : status,
      displayStatus: status,
      issuedAt: '2026-07-01T00:00:00Z',
      dueAt: '2026-07-31T00:00:00Z',
      paidAt: null,
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z',
      canIssue: false,
      canMarkPaid: false,
    };
  }

  function list(
    items = [invoice('PENDING')],
    overrides: Partial<PlatformBillingInvoiceList> = {},
  ): PlatformBillingInvoiceList {
    return {
      items,
      pageNumber: 1,
      pageSize: 10,
      totalCount: items.length,
      totalPages: 1,
      ...overrides,
    };
  }

  async function createComponent(
    value: PlatformBillingInvoiceList = list(),
  ): Promise<ComponentFixture<PlatformInvoiceTable>> {
    await TestBed.configureTestingModule({ imports: [PlatformInvoiceTable] }).compileComponents();
    const fixture = TestBed.createComponent(PlatformInvoiceTable);
    fixture.componentRef.setInput('list', value);
    fixture.detectChanges();
    return fixture;
  }

  function sortButton(
    fixture: ComponentFixture<PlatformInvoiceTable>,
    label: string,
  ): HTMLButtonElement {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.sort-button') as NodeListOf<HTMLButtonElement>,
    );
    const match = buttons.find((button) => button.textContent?.includes(label));
    if (!match) {
      throw new Error(`Sort button not found for ${label}`);
    }
    return match;
  }

  it('renders verified invoice fields', async () => {
    const fixture = await createComponent();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('INV-001');
    expect(text).toContain('Tenant 1');
    expect(text).toContain('TEN-1');
    expect(text).toContain('LKR');
    expect(text).toContain('1,200.50');
    expect(text).toContain('1,000.50');
    expect(text).toContain('Jul 1, 2026');
    expect(text).toContain('Jul 31, 2026');
  });

  it('renders all four display statuses', async () => {
    const fixture = await createComponent(
      list(
        ['DRAFT', 'PENDING', 'OVERDUE', 'PAID'].map((status, i) =>
          invoice(status as PlatformBillingDisplayStatus, i + 1),
        ),
      ),
    );
    const text = fixture.nativeElement.textContent ?? '';
    for (const status of ['DRAFT', 'PENDING', 'OVERDUE', 'PAID']) expect(text).toContain(status);
  });

  it('emits each supported sort field', async () => {
    const fixture = await createComponent();
    const emitted: Array<{ sortBy: string; sortDirection: string }> = [];
    fixture.componentInstance.sortChange.subscribe((value) => emitted.push(value));

    for (const label of ['Invoice', 'Tenant', 'Total', 'Status', 'Issued', 'Due']) {
      sortButton(fixture, label).click();
    }

    expect(emitted.map((entry) => entry.sortBy)).toEqual([
      'invoiceNumber',
      'tenant',
      'amount',
      'status',
      'issuedAt',
      'dueAt',
    ]);
  });

  it('toggles sort direction', async () => {
    const fixture = await createComponent();
    fixture.componentRef.setInput('sortBy', 'tenant');
    fixture.componentRef.setInput('sortDirection', 'desc');
    fixture.detectChanges();

    const emitted: Array<{ sortBy: string; sortDirection: string }> = [];
    fixture.componentInstance.sortChange.subscribe((value) => emitted.push(value));
    sortButton(fixture, 'Tenant').click();
    expect(emitted).toEqual([{ sortBy: 'tenant', sortDirection: 'asc' }]);
  });

  it('switching columns changes the active field', async () => {
    const fixture = await createComponent();
    const emitted: Array<{ sortBy: string; sortDirection: string }> = [];
    fixture.componentInstance.sortChange.subscribe((value) => emitted.push(value));

    sortButton(fixture, 'Invoice').click();
    sortButton(fixture, 'Status').click();

    expect(emitted).toEqual([
      { sortBy: 'invoiceNumber', sortDirection: 'desc' },
      { sortBy: 'status', sortDirection: 'desc' },
    ]);
  });

  it('unsupported columns are not sortable', async () => {
    const fixture = await createComponent();
    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLTableCellElement>,
    ).map((header) => header.textContent?.trim());
    expect(headers).toContain('Currency');
    expect(headers).toContain('Paid');
    expect(headers).toContain('Balance due');
    expect(fixture.nativeElement.querySelectorAll('.sort-button').length).toBe(6);
  });

  it('sorting does not reorder the current array client-side', async () => {
    const items = [invoice('PENDING', 1), invoice('PAID', 2)];
    const fixture = await createComponent(list(items));
    sortButton(fixture, 'Tenant').click();
    const rendered = Array.from(
      fixture.nativeElement.querySelectorAll(
        'tbody td:first-child strong',
      ) as NodeListOf<HTMLElement>,
    ).map((element) => element.textContent?.trim());
    expect(rendered).toEqual(['INV-001', 'INV-002']);
  });

  it('active sort exposes an accessible indicator', async () => {
    const fixture = await createComponent();
    fixture.componentRef.setInput('sortBy', 'amount');
    fixture.componentRef.setInput('sortDirection', 'asc');
    fixture.detectChanges();

    const amountHeader = Array.from(
      fixture.nativeElement.querySelectorAll('th') as NodeListOf<HTMLTableCellElement>,
    ).find((header) => header.textContent?.includes('Total'));
    expect(amountHeader?.getAttribute('aria-sort')).toBe('ascending');
    expect(amountHeader?.querySelector('.sr-only')?.textContent).toContain('Sorted ascending');
  });

  it('pagination continues to function while sorted', async () => {
    const fixture = await createComponent(
      list(undefined, { pageNumber: 2, totalCount: 30, totalPages: 3 }),
    );
    fixture.componentRef.setInput('sortBy', 'invoiceNumber');
    fixture.componentRef.setInput('sortDirection', 'desc');
    fixture.detectChanges();

    const emitted: number[] = [];
    fixture.componentInstance.pageChange.subscribe((page) => emitted.push(page));
    const buttons = fixture.nativeElement.querySelectorAll('.pagination button');
    buttons[0].click();
    buttons[1].click();
    expect(emitted).toEqual([1, 3]);
  });

  it('emits previous and next page events', async () => {
    const fixture = await createComponent(
      list(undefined, { pageNumber: 2, totalCount: 30, totalPages: 3 }),
    );
    const emitted: number[] = [];
    fixture.componentInstance.pageChange.subscribe((page) => emitted.push(page));
    const buttons = fixture.nativeElement.querySelectorAll('.pagination button');
    buttons[0].click();
    buttons[1].click();
    expect(emitted).toEqual([1, 3]);
  });

  it('emits page-size changes', async () => {
    const fixture = await createComponent();
    const emitted: number[] = [];
    fixture.componentInstance.pageSizeChange.subscribe((size) => emitted.push(size));
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = '20';
    select.dispatchEvent(new Event('change'));
    expect(emitted).toEqual([20]);
  });

  it('disables invalid previous and next navigation', async () => {
    const fixture = await createComponent();
    const buttons = fixture.nativeElement.querySelectorAll(
      '.pagination button',
    ) as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(true);
  });

  it('renders no mutation or row action controls', async () => {
    const fixture = await createComponent();
    const buttonLabels = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).map((button) => button.textContent?.trim());
    expect(buttonLabels).not.toContain('Issue');
    expect(buttonLabels).not.toContain('Mark paid');
    expect(fixture.nativeElement.textContent).not.toContain('Actions');
    expect(fixture.nativeElement.querySelector('tbody button')).toBeNull();
  });

  it('handles an empty invoice list', async () => {
    const fixture = await createComponent(list([], { totalCount: 0, totalPages: 0 }));
    expect(fixture.nativeElement.textContent).toContain('No invoices found');
    expect(fixture.nativeElement.querySelector('tbody')).toBeNull();
  });
});
