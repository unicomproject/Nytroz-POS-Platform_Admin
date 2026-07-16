import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import {
  PlatformBillingInvoiceList,
  PlatformBillingSortDirection,
  PlatformBillingSortField,
} from '../../models/platform-billing.model';

interface InvoiceTableColumn {
  label: string;
  sortBy?: PlatformBillingSortField;
}

@Component({
  selector: 'app-platform-invoice-table',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  template: `
    <section class="table-card" [attr.aria-busy]="loading">
      <div class="table-heading">
        <div>
          <h2>Invoices</h2>
          <p>Read-only invoice records from the billing service</p>
        </div>
        <label
          >Rows per page
          <select
            [value]="list?.pageSize ?? 10"
            (change)="emitPageSize($event)"
            [disabled]="loading"
          >
            @for (size of pageSizeOptions; track size) {
              <option [value]="size">{{ size }}</option>
            }
          </select>
        </label>
      </div>

      @if (loading) {
        <div class="table-scroll loading-wrap">
          <table>
            <thead>
              <tr>
                @for (column of columns; track column.label) {
                  <th>{{ column.label }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of skeletonRows; track row) {
                <tr class="skeleton-row">
                  @for (column of columns; track column.label) {
                    <td><span></span></td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (list?.items?.length) {
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                @for (column of columns; track column.label) {
                  @if (column.sortBy) {
                    <th scope="col" [attr.aria-sort]="ariaSort(column.sortBy)">
                      <button type="button" class="sort-button" (click)="toggleSort(column.sortBy)">
                        {{ column.label }}
                        <span class="sort-indicator" aria-hidden="true">{{
                          sortIndicator(column.sortBy)
                        }}</span>
                        <span class="sr-only">{{ sortScreenReaderLabel(column.sortBy) }}</span>
                      </button>
                    </th>
                  } @else {
                    <th scope="col">{{ column.label }}</th>
                  }
                }
              </tr>
            </thead>
            <tbody>
              @for (invoice of list!.items; track invoice.id) {
                <tr>
                  <td>
                    <strong>{{ invoice.invoiceNumber }}</strong
                    ><small>{{ invoice.createdAt | date: 'mediumDate' }}</small>
                  </td>
                  <td>
                    <strong>{{ invoice.tenantName }}</strong
                    ><small>{{ invoice.tenantCode }}</small>
                  </td>
                  <td>{{ invoice.currencyCode }}</td>
                  <td>
                    {{ invoice.totalAmount | currency: invoice.currencyCode : 'symbol' : '1.2-2' }}
                  </td>
                  <td>
                    {{ invoice.paidAmount | currency: invoice.currencyCode : 'symbol' : '1.2-2' }}
                  </td>
                  <td>
                    {{ invoice.balanceDue | currency: invoice.currencyCode : 'symbol' : '1.2-2' }}
                  </td>
                  <td>
                    <span
                      class="status"
                      [class]="'status ' + invoice.displayStatus.toLowerCase()"
                      >{{ invoice.displayStatus }}</span
                    >
                  </td>
                  <td>
                    {{ invoice.issuedAt ? (invoice.issuedAt | date: 'mediumDate') : 'Not issued' }}
                  </td>
                  <td>{{ invoice.dueAt ? (invoice.dueAt | date: 'mediumDate') : 'Not set' }}</td>
                  <td>
                    <button
                      type="button"
                      class="view-button"
                      [attr.aria-label]="'View invoice ' + invoice.invoiceNumber"
                      [disabled]="loading"
                      (click)="viewInvoice.emit(invoice.id)"
                    >
                      View
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <footer class="pagination">
          <span>{{ rangeLabel() }}</span>
          <div>
            <button
              type="button"
              (click)="previousPage()"
              [disabled]="!canGoPrevious"
              aria-label="Previous page"
            >
              Previous
            </button>
            <b>Page {{ list!.pageNumber }} of {{ list!.totalPages }}</b>
            <button
              type="button"
              (click)="nextPage()"
              [disabled]="!canGoNext"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </footer>
      } @else {
        <div class="empty-state">
          <strong>No invoices found</strong
          ><span>Billing invoices will appear here when records are available.</span>
        </div>
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
    .table-card {
      background: #fff;
      border: 1px solid #e5eaf2;
      border-radius: 13px;
      box-shadow: 0 7px 22px rgba(31, 51, 86, 0.045);
      overflow: hidden;
    }
    .table-heading {
      align-items: center;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      padding: 1rem;
    }
    h2 {
      color: #101a38;
      font-size: 1rem;
      margin: 0;
    }
    p {
      color: #667085;
      font-size: 0.78rem;
      margin: 0.35rem 0 0;
    }
    label {
      align-items: center;
      color: #475467;
      display: flex;
      font-size: 0.75rem;
      gap: 0.5rem;
      white-space: nowrap;
    }
    select {
      background: #fff;
      border: 1px solid #d0d5dd;
      border-radius: 7px;
      color: #344054;
      padding: 0.45rem;
    }
    .table-scroll {
      overflow-x: auto;
    }
    table {
      border-collapse: collapse;
      min-width: 1140px;
      width: 100%;
    }
    .view-button {
      background: #fff;
      border: 1px solid #d0d5dd;
      border-radius: 7px;
      color: #175cd3;
      cursor: pointer;
      font-weight: 700;
      padding: 0.45rem 0.7rem;
    }
    .view-button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
    th {
      background: #f8fafc;
      color: #667085;
      font-size: 0.7rem;
      letter-spacing: 0.02em;
      padding: 0.75rem;
      text-align: left;
      text-transform: uppercase;
      vertical-align: middle;
    }
    td {
      border-top: 1px solid #edf0f5;
      color: #344054;
      font-size: 0.78rem;
      padding: 0.8rem 0.75rem;
      vertical-align: middle;
    }
    td strong,
    td small {
      display: block;
    }
    td strong {
      color: #101828;
    }
    td small {
      color: #667085;
      margin-top: 0.2rem;
    }
    .sort-button {
      align-items: center;
      background: transparent;
      border: 0;
      color: inherit;
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      gap: 0.35rem;
      letter-spacing: inherit;
      padding: 0;
      text-transform: inherit;
    }
    .sort-indicator {
      color: #0b5cff;
      font-size: 0.85rem;
      line-height: 1;
    }
    .sr-only {
      border: 0;
      clip: rect(0 0 0 0);
      height: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      position: absolute;
      white-space: nowrap;
      width: 1px;
    }
    .status {
      border-radius: 99px;
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 800;
      padding: 0.35rem 0.55rem;
    }
    .draft {
      background: #f2f4f7;
      color: #475467;
    }
    .pending {
      background: #fff4e5;
      color: #b54708;
    }
    .overdue {
      background: #fee4e2;
      color: #b42318;
    }
    .paid {
      background: #dcfae6;
      color: #067647;
    }
    .pagination {
      align-items: center;
      border-top: 1px solid #edf0f5;
      color: #667085;
      display: flex;
      font-size: 0.75rem;
      gap: 1rem;
      justify-content: space-between;
      padding: 0.85rem 1rem;
    }
    .pagination div {
      align-items: center;
      display: flex;
      gap: 0.65rem;
    }
    .pagination b {
      color: #344054;
      font-weight: 600;
    }
    button {
      background: #fff;
      border: 1px solid #d0d5dd;
      border-radius: 7px;
      color: #344054;
      cursor: pointer;
      padding: 0.5rem 0.7rem;
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
    .empty-state {
      align-items: center;
      border-top: 1px solid #edf0f5;
      color: #667085;
      display: grid;
      gap: 0.4rem;
      justify-items: center;
      min-height: 11rem;
      padding: 2rem;
      text-align: center;
    }
    .empty-state strong {
      color: #344054;
    }
    .skeleton-row span {
      animation: pulse 1.3s ease-in-out infinite;
      background: #e9eef5;
      border-radius: 5px;
      display: block;
      height: 0.9rem;
      width: 80%;
    }
    @keyframes pulse {
      50% {
        opacity: 0.45;
      }
    }
    @media (max-width: 650px) {
      .table-heading,
      .pagination {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `,
})
export class PlatformInvoiceTable {
  @Input() list: PlatformBillingInvoiceList | null = null;
  @Input() loading = false;
  @Input() sortBy: PlatformBillingSortField = 'createdAt';
  @Input() sortDirection: PlatformBillingSortDirection = 'desc';
  @Output() readonly pageChange = new EventEmitter<number>();
  @Output() readonly pageSizeChange = new EventEmitter<number>();
  @Output() readonly sortChange = new EventEmitter<{
    sortBy: PlatformBillingSortField;
    sortDirection: PlatformBillingSortDirection;
  }>();
  @Output() readonly viewInvoice = new EventEmitter<string>();

  readonly pageSizeOptions = [10, 20, 50];
  readonly skeletonRows = [1, 2, 3, 4, 5];
  readonly columns: InvoiceTableColumn[] = [
    { label: 'Invoice', sortBy: 'invoiceNumber' },
    { label: 'Tenant', sortBy: 'tenant' },
    { label: 'Currency' },
    { label: 'Total', sortBy: 'amount' },
    { label: 'Paid' },
    { label: 'Balance due' },
    { label: 'Status', sortBy: 'status' },
    { label: 'Issued', sortBy: 'issuedAt' },
    { label: 'Due', sortBy: 'dueAt' },
    { label: 'Actions' },
  ];

  get canGoPrevious(): boolean {
    return !this.loading && (this.list?.pageNumber ?? 1) > 1;
  }
  get canGoNext(): boolean {
    return !this.loading && !!this.list && this.list.pageNumber < this.list.totalPages;
  }

  previousPage(): void {
    if (this.canGoPrevious && this.list) this.pageChange.emit(this.list.pageNumber - 1);
  }
  nextPage(): void {
    if (this.canGoNext && this.list) this.pageChange.emit(this.list.pageNumber + 1);
  }
  emitPageSize(event: Event): void {
    this.pageSizeChange.emit(Number((event.target as HTMLSelectElement).value));
  }

  toggleSort(field: PlatformBillingSortField): void {
    if (this.sortBy === field) {
      this.sortChange.emit({
        sortBy: field,
        sortDirection: this.sortDirection === 'asc' ? 'desc' : 'asc',
      });
      return;
    }

    this.sortChange.emit({ sortBy: field, sortDirection: 'desc' });
  }

  ariaSort(field: PlatformBillingSortField): 'ascending' | 'descending' | 'none' {
    if (this.sortBy !== field) {
      return 'none';
    }

    return this.sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  sortIndicator(field: PlatformBillingSortField): string {
    if (this.sortBy !== field) {
      return '↕';
    }

    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  sortScreenReaderLabel(field: PlatformBillingSortField): string {
    if (this.sortBy !== field) {
      return 'Sortable';
    }

    return this.sortDirection === 'asc' ? 'Sorted ascending' : 'Sorted descending';
  }

  rangeLabel(): string {
    if (!this.list?.totalCount) return 'Showing 0 invoices';
    const start = (this.list.pageNumber - 1) * this.list.pageSize + 1;
    const end = Math.min(this.list.pageNumber * this.list.pageSize, this.list.totalCount);
    return `Showing ${start} to ${end} of ${this.list.totalCount} invoices`;
  }
}
