import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import {
  PlatformBillingDateField,
  PlatformBillingStatusFilterOption,
  PlatformBillingTenantFilterOption,
} from '../../models/platform-billing.model';

export interface PlatformBillingFilterValues {
  search: string;
  tenantId: string;
  status: string;
  dateField: PlatformBillingDateField;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_PLATFORM_BILLING_DATE_FIELD: PlatformBillingDateField = 'issuedAt';

export const DEFAULT_PLATFORM_BILLING_FILTER_VALUES: PlatformBillingFilterValues = {
  search: '',
  tenantId: '',
  status: '',
  dateField: DEFAULT_PLATFORM_BILLING_DATE_FIELD,
  dateFrom: '',
  dateTo: '',
};

@Component({
  selector: 'app-platform-billing-filters',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="filters" [attr.aria-busy]="disabled">
      <label class="filter-field search-field">
        <span class="field-label">Search</span>
        <span class="input-wrap">
          <input
            type="search"
            placeholder="Search invoice number, tenant name, or code..."
            [ngModel]="search"
            (ngModelChange)="onSearchInput($event)"
            [disabled]="disabled"
            aria-label="Search invoices"
          />
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </span>
      </label>

      <label class="filter-field">
        <span class="field-label">Tenant</span>
        <select
          [ngModel]="tenantId"
          (ngModelChange)="tenantChange.emit($event)"
          [disabled]="disabled || optionsLoading"
        >
          <option value="">All tenants</option>
          @for (tenant of tenantOptions; track tenant.id) {
            <option [value]="tenant.id">{{ tenant.name }} ({{ tenant.code }})</option>
          }
        </select>
      </label>

      <label class="filter-field">
        <span class="field-label">Status</span>
        <select
          [ngModel]="status"
          (ngModelChange)="statusChange.emit($event)"
          [disabled]="disabled || optionsLoading"
        >
          <option value="">All statuses</option>
          @for (item of statusOptions; track item) {
            <option [value]="item">{{ item }}</option>
          }
        </select>
      </label>

      <label class="filter-field">
        <span class="field-label">Date field</span>
        <select
          [ngModel]="dateField"
          (ngModelChange)="onDateFieldChange($event)"
          [disabled]="disabled"
        >
          <option value="issuedAt">Issued date</option>
          <option value="dueAt">Due date</option>
        </select>
      </label>

      <label class="filter-field">
        <span class="field-label">Date from</span>
        <input
          type="date"
          [ngModel]="dateFrom"
          (ngModelChange)="onDateFromChange($event)"
          [disabled]="disabled"
        />
      </label>

      <label class="filter-field">
        <span class="field-label">Date to</span>
        <input
          type="date"
          [ngModel]="dateTo"
          (ngModelChange)="onDateToChange($event)"
          [disabled]="disabled"
        />
      </label>

      <div class="filter-actions">
        <button type="button" class="btn outline" (click)="onReset()" [disabled]="disabled">
          Reset filters
        </button>
      </div>

      @if (optionsLoading) {
        <p class="options-state" aria-live="polite">Loading filter options...</p>
      } @else if (optionsError) {
        <div class="options-error" role="alert">
          <span>{{ optionsError }}</span>
          <button type="button" class="btn outline" (click)="optionsRetry.emit()">Try again</button>
        </div>
      }

      @if (hasInvalidDateRange) {
        <p class="validation-error" role="alert">Date from must be on or before date to.</p>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    * {
      box-sizing: border-box;
    }

    .filters {
      align-items: end;
      background: #fff;
      border: 1px solid #e5eaf2;
      border-radius: 12px;
      box-shadow:
        0 1px 3px rgba(16, 24, 40, 0.04),
        0 8px 24px rgba(16, 24, 40, 0.06);
      display: grid;
      gap: 0.85rem;
      grid-template-columns: minmax(0, 1.4fr) repeat(5, minmax(0, 1fr)) auto;
      padding: 1rem;
    }

    .filter-field {
      display: grid;
      gap: 0.45rem;
      min-width: 0;
    }

    .field-label {
      color: #667085;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .input-wrap {
      align-items: center;
      display: flex;
      position: relative;
    }

    .input-wrap input,
    .filter-field input,
    .filter-field select {
      border: 1px solid #d0d5dd;
      border-radius: 10px;
      min-height: 2.65rem;
      padding: 0 0.85rem;
      width: 100%;
    }

    .input-wrap input {
      padding-right: 2.35rem;
    }

    .input-wrap svg {
      color: #98a2b3;
      height: 1rem;
      pointer-events: none;
      position: absolute;
      right: 0.85rem;
      stroke: currentColor;
      stroke-width: 2;
      width: 1rem;
      fill: none;
    }

    .filter-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn {
      align-items: center;
      background: #fff;
      border: 1px solid #d0d5dd;
      border-radius: 10px;
      color: #344054;
      cursor: pointer;
      display: inline-flex;
      font-size: 0.84rem;
      font-weight: 700;
      justify-content: center;
      min-height: 2.65rem;
      padding: 0 1rem;
      white-space: nowrap;
    }

    .btn:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .options-state,
    .validation-error {
      color: #667085;
      font-size: 0.78rem;
      grid-column: 1 / -1;
      margin: 0;
    }

    .validation-error {
      color: #b42318;
    }

    .options-error {
      align-items: center;
      color: #b42318;
      display: flex;
      flex-wrap: wrap;
      font-size: 0.78rem;
      gap: 0.75rem;
      grid-column: 1 / -1;
      justify-content: space-between;
    }

    @media (max-width: 1100px) {
      .filters {
        grid-template-columns: 1fr 1fr;
      }
      .search-field {
        grid-column: 1 / -1;
      }
      .filter-actions {
        grid-column: 1 / -1;
      }
    }

    @media (max-width: 560px) {
      .filters {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class PlatformBillingFilters implements OnDestroy {
  @Input() search = '';
  @Input() tenantId = '';
  @Input() status = '';
  @Input() dateField: PlatformBillingDateField = DEFAULT_PLATFORM_BILLING_DATE_FIELD;
  @Input() dateFrom = '';
  @Input() dateTo = '';
  @Input() tenantOptions: PlatformBillingTenantFilterOption[] = [];
  @Input() statusOptions: PlatformBillingStatusFilterOption[] = [];
  @Input() optionsLoading = false;
  @Input() optionsError: string | null = null;
  @Input() disabled = false;

  @Output() readonly searchChange = new EventEmitter<string>();
  @Output() readonly tenantChange = new EventEmitter<string>();
  @Output() readonly statusChange = new EventEmitter<string>();
  @Output() readonly dateFieldChange = new EventEmitter<PlatformBillingDateField>();
  @Output() readonly dateRangeChange = new EventEmitter<{ dateFrom: string; dateTo: string }>();
  @Output() readonly reset = new EventEmitter<PlatformBillingFilterValues>();
  @Output() readonly optionsRetry = new EventEmitter<void>();

  private readonly searchInput$ = new Subject<string>();
  private readonly searchSubscription = this.searchInput$
    .pipe(debounceTime(300), distinctUntilChanged())
    .subscribe((value) => this.searchChange.emit(value.trim()));

  get hasInvalidDateRange(): boolean {
    return Boolean(this.dateFrom && this.dateTo && this.dateFrom > this.dateTo);
  }

  ngOnDestroy(): void {
    this.searchSubscription.unsubscribe();
  }

  onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  onDateFieldChange(value: PlatformBillingDateField): void {
    this.dateFieldChange.emit(value);
  }

  onDateFromChange(value: string): void {
    this.dateRangeChange.emit({ dateFrom: value, dateTo: this.dateTo });
  }

  onDateToChange(value: string): void {
    this.dateRangeChange.emit({ dateFrom: this.dateFrom, dateTo: value });
  }

  onReset(): void {
    this.reset.emit({ ...DEFAULT_PLATFORM_BILLING_FILTER_VALUES });
  }
}
