import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { PlatformBillingInvoiceList } from '../../models/platform-billing.model';

@Component({
  selector: 'app-platform-invoice-table',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  template: `
    <section class="table-card" [attr.aria-busy]="loading">
      <div class="table-heading">
        <div><h2>Invoices</h2><p>Read-only invoice records from the billing service</p></div>
        <label>Rows per page
          <select [value]="list?.pageSize ?? 10" (change)="emitPageSize($event)" [disabled]="loading">
            @for (size of pageSizeOptions; track size) { <option [value]="size">{{ size }}</option> }
          </select>
        </label>
      </div>

      @if (loading) {
        <div class="table-scroll loading-wrap">
          <table><thead><tr>@for (column of columns; track column) { <th>{{ column }}</th> }</tr></thead>
          <tbody>@for (row of skeletonRows; track row) { <tr class="skeleton-row">@for (column of columns; track column) { <td><span></span></td> }</tr> }</tbody></table>
        </div>
      } @else if (list?.items?.length) {
        <div class="table-scroll">
          <table>
            <thead><tr>@for (column of columns; track column) { <th>{{ column }}</th> }</tr></thead>
            <tbody>
              @for (invoice of list!.items; track invoice.id) {
                <tr>
                  <td><strong>{{ invoice.invoiceNumber }}</strong><small>{{ invoice.createdAt | date: 'mediumDate' }}</small></td>
                  <td><strong>{{ invoice.tenantName }}</strong><small>{{ invoice.tenantCode }}</small></td>
                  <td>{{ invoice.currencyCode }}</td>
                  <td>{{ invoice.totalAmount | currency: invoice.currencyCode : 'symbol' : '1.2-2' }}</td>
                  <td>{{ invoice.paidAmount | currency: invoice.currencyCode : 'symbol' : '1.2-2' }}</td>
                  <td>{{ invoice.balanceDue | currency: invoice.currencyCode : 'symbol' : '1.2-2' }}</td>
                  <td><span class="status" [class]="'status ' + invoice.displayStatus.toLowerCase()">{{ invoice.displayStatus }}</span></td>
                  <td>{{ invoice.issuedAt ? (invoice.issuedAt | date: 'mediumDate') : 'Not issued' }}</td>
                  <td>{{ invoice.dueAt ? (invoice.dueAt | date: 'mediumDate') : 'Not set' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <footer class="pagination">
          <span>{{ rangeLabel() }}</span>
          <div>
            <button type="button" (click)="previousPage()" [disabled]="!canGoPrevious" aria-label="Previous page">Previous</button>
            <b>Page {{ list!.pageNumber }} of {{ list!.totalPages }}</b>
            <button type="button" (click)="nextPage()" [disabled]="!canGoNext" aria-label="Next page">Next</button>
          </div>
        </footer>
      } @else {
        <div class="empty-state"><strong>No invoices found</strong><span>Billing invoices will appear here when records are available.</span></div>
      }
    </section>
  `,
  styles: `
    :host { display: block; } * { box-sizing: border-box; }
    .table-card { background: #fff; border: 1px solid #e5eaf2; border-radius: 13px; box-shadow: 0 7px 22px rgba(31, 51, 86, .045); overflow: hidden; }
    .table-heading { align-items: center; display: flex; gap: 1rem; justify-content: space-between; padding: 1rem; }
    h2 { color: #101a38; font-size: 1rem; margin: 0; } p { color: #667085; font-size: .78rem; margin: .35rem 0 0; }
    label { align-items: center; color: #475467; display: flex; font-size: .75rem; gap: .5rem; white-space: nowrap; }
    select { background: #fff; border: 1px solid #d0d5dd; border-radius: 7px; color: #344054; padding: .45rem; }
    .table-scroll { overflow-x: auto; } table { border-collapse: collapse; min-width: 1050px; width: 100%; }
    th { background: #f8fafc; color: #667085; font-size: .7rem; letter-spacing: .02em; padding: .75rem; text-align: left; text-transform: uppercase; }
    td { border-top: 1px solid #edf0f5; color: #344054; font-size: .78rem; padding: .8rem .75rem; vertical-align: middle; }
    td strong, td small { display: block; } td strong { color: #101828; } td small { color: #667085; margin-top: .2rem; }
    .status { border-radius: 99px; display: inline-block; font-size: .68rem; font-weight: 800; padding: .35rem .55rem; }
    .draft { background: #f2f4f7; color: #475467; } .pending { background: #fff4e5; color: #b54708; }
    .overdue { background: #fee4e2; color: #b42318; } .paid { background: #dcfae6; color: #067647; }
    .pagination { align-items: center; border-top: 1px solid #edf0f5; color: #667085; display: flex; font-size: .75rem; gap: 1rem; justify-content: space-between; padding: .85rem 1rem; }
    .pagination div { align-items: center; display: flex; gap: .65rem; } .pagination b { color: #344054; font-weight: 600; }
    button { background: #fff; border: 1px solid #d0d5dd; border-radius: 7px; color: #344054; cursor: pointer; padding: .5rem .7rem; }
    button:disabled { cursor: not-allowed; opacity: .45; }
    .empty-state { align-items: center; border-top: 1px solid #edf0f5; color: #667085; display: grid; gap: .4rem; justify-items: center; min-height: 11rem; padding: 2rem; text-align: center; }
    .empty-state strong { color: #344054; }
    .skeleton-row span { animation: pulse 1.3s ease-in-out infinite; background: #e9eef5; border-radius: 5px; display: block; height: .9rem; width: 80%; }
    @keyframes pulse { 50% { opacity: .45; } }
    @media (max-width: 650px) { .table-heading, .pagination { align-items: flex-start; flex-direction: column; } }
  `
})
export class PlatformInvoiceTable {
  @Input() list: PlatformBillingInvoiceList | null = null;
  @Input() loading = false;
  @Output() readonly pageChange = new EventEmitter<number>();
  @Output() readonly pageSizeChange = new EventEmitter<number>();

  readonly pageSizeOptions = [10, 20, 50];
  readonly skeletonRows = [1, 2, 3, 4, 5];
  readonly columns = ['Invoice', 'Tenant', 'Currency', 'Total', 'Paid', 'Balance due', 'Status', 'Issued', 'Due'];

  get canGoPrevious(): boolean { return !this.loading && (this.list?.pageNumber ?? 1) > 1; }
  get canGoNext(): boolean { return !this.loading && !!this.list && this.list.pageNumber < this.list.totalPages; }

  previousPage(): void { if (this.canGoPrevious && this.list) this.pageChange.emit(this.list.pageNumber - 1); }
  nextPage(): void { if (this.canGoNext && this.list) this.pageChange.emit(this.list.pageNumber + 1); }
  emitPageSize(event: Event): void { this.pageSizeChange.emit(Number((event.target as HTMLSelectElement).value)); }
  rangeLabel(): string {
    if (!this.list?.totalCount) return 'Showing 0 invoices';
    const start = (this.list.pageNumber - 1) * this.list.pageSize + 1;
    const end = Math.min(this.list.pageNumber * this.list.pageSize, this.list.totalCount);
    return `Showing ${start} to ${end} of ${this.list.totalCount} invoices`;
  }
}
