import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  DEFAULT_PLATFORM_BILLING_FILTER_VALUES,
  PlatformBillingFilters,
} from './platform-billing-filters';

describe('PlatformBillingFilters', () => {
  const tenantOptions = [
    { id: 'tenant-1', code: 'TEN-1', name: 'Nytroz Shop' },
    { id: 'tenant-2', code: 'TEN-2', name: 'Metro Retail' },
  ];
  const statusOptions = ['DRAFT', 'PENDING', 'OVERDUE', 'PAID'] as const;

  async function createComponent(): Promise<ComponentFixture<PlatformBillingFilters>> {
    await TestBed.configureTestingModule({ imports: [PlatformBillingFilters] }).compileComponents();
    const fixture = TestBed.createComponent(PlatformBillingFilters);
    fixture.componentRef.setInput('tenantOptions', tenantOptions);
    fixture.componentRef.setInput('statusOptions', [...statusOptions]);
    fixture.detectChanges();
    return fixture;
  }

  it('renders tenant options supplied by the parent', async () => {
    const fixture = await createComponent();
    const options = Array.from(
      fixture.nativeElement.querySelectorAll('select option') as NodeListOf<HTMLOptionElement>,
    ).map((option) => option.textContent?.trim());
    expect(options).toContain('Nytroz Shop (TEN-1)');
    expect(options).toContain('Metro Retail (TEN-2)');
  });

  it('renders status options supplied by the parent', async () => {
    const fixture = await createComponent();
    const text = fixture.nativeElement.textContent ?? '';
    for (const status of statusOptions) {
      expect(text).toContain(status);
    }
  });

  it('does not contain hardcoded tenant data', async () => {
    const fixture = await createComponent();
    fixture.componentRef.setInput('tenantOptions', []);
    fixture.detectChanges();
    const tenantSelect = fixture.nativeElement.querySelectorAll('select')[0] as HTMLSelectElement;
    expect(tenantSelect.options.length).toBe(1);
    expect(tenantSelect.options[0].textContent).toContain('All tenants');
  });

  it('emits trimmed debounced search', async () => {
    vi.useFakeTimers();
    const fixture = await createComponent();
    const emitted: string[] = [];
    fixture.componentInstance.searchChange.subscribe((value) => emitted.push(value));

    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = '  INV-100  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    vi.advanceTimersByTime(299);
    expect(emitted).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(emitted).toEqual(['INV-100']);
    vi.useRealTimers();
  });

  it('emits tenant changes', async () => {
    const fixture = await createComponent();
    const emitted: string[] = [];
    fixture.componentInstance.tenantChange.subscribe((value) => emitted.push(value));

    const tenantSelect = fixture.nativeElement.querySelectorAll('select')[0] as HTMLSelectElement;
    tenantSelect.value = 'tenant-2';
    tenantSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(emitted).toEqual(['tenant-2']);
  });

  it('emits status changes', async () => {
    const fixture = await createComponent();
    const emitted: string[] = [];
    fixture.componentInstance.statusChange.subscribe((value) => emitted.push(value));

    const statusSelect = fixture.nativeElement.querySelectorAll('select')[1] as HTMLSelectElement;
    statusSelect.value = 'OVERDUE';
    statusSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(emitted).toEqual(['OVERDUE']);
  });

  it('emits date-field changes', async () => {
    const fixture = await createComponent();
    const emitted: string[] = [];
    fixture.componentInstance.dateFieldChange.subscribe((value) => emitted.push(value));

    const dateFieldSelect = fixture.nativeElement.querySelectorAll(
      'select',
    )[2] as HTMLSelectElement;
    dateFieldSelect.value = 'dueAt';
    dateFieldSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(emitted).toEqual(['dueAt']);
  });

  it('emits date range changes', async () => {
    const fixture = await createComponent();
    const emitted: Array<{ dateFrom: string; dateTo: string }> = [];
    fixture.componentInstance.dateRangeChange.subscribe((value) => emitted.push(value));

    fixture.componentInstance.onDateFromChange('2026-07-01');
    fixture.componentInstance.dateFrom = '2026-07-01';
    fixture.componentInstance.onDateToChange('2026-07-15');

    expect(emitted).toEqual([
      { dateFrom: '2026-07-01', dateTo: '' },
      { dateFrom: '2026-07-01', dateTo: '2026-07-15' },
    ]);
  });

  it('shows invalid date-range validation', async () => {
    const fixture = await createComponent();
    fixture.componentRef.setInput('dateFrom', '2026-07-20');
    fixture.componentRef.setInput('dateTo', '2026-07-10');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Date from must be on or before date to.');
  });

  it('reset emits documented default values', async () => {
    const fixture = await createComponent();
    const emitted: (typeof DEFAULT_PLATFORM_BILLING_FILTER_VALUES)[] = [];
    fixture.componentInstance.reset.subscribe((value) => emitted.push(value));

    const resetButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Reset filters'));
    resetButton?.click();
    fixture.detectChanges();

    expect(emitted).toEqual([DEFAULT_PLATFORM_BILLING_FILTER_VALUES]);
  });

  it('represents filter-options loading', async () => {
    const fixture = await createComponent();
    fixture.componentRef.setInput('optionsLoading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading filter options...');
  });

  it('represents filter-options error', async () => {
    const fixture = await createComponent();
    fixture.componentRef.setInput('optionsError', 'Filter options failed safely');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Filter options failed safely');
    expect(fixture.nativeElement.textContent).toContain('Try again');
  });
});
