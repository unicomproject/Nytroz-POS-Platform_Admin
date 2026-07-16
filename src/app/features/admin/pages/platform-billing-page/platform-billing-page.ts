import { Component, OnDestroy, signal } from '@angular/core';
import { Subscription } from 'rxjs';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { PlatformBillingSummaryCards } from '../../components/platform-billing-summary-cards/platform-billing-summary-cards';
import { PlatformInvoiceTable } from '../../components/platform-invoice-table/platform-invoice-table';
import { PlatformBillingInvoiceList, PlatformBillingQuery, PlatformBillingSummary } from '../../models/platform-billing.model';
import { PlatformBillingApiService } from '../../services/platform-billing-api.service';

@Component({
  selector: 'app-platform-billing-page',
  standalone: true,
  imports: [PlatformBillingSummaryCards, PlatformInvoiceTable],
  template: `
    <section class="billing-page">
      <header class="page-heading">
        <div><h1>Billing</h1><p>Review platform revenue and subscription invoices by currency.</p></div>
        <div class="heading-actions"><span class="read-only">Read only</span><button type="button" (click)="refresh()" [disabled]="summaryLoading() || invoiceLoading()">Refresh</button></div>
      </header>

      <section aria-labelledby="summary-title">
        <div class="section-title"><h2 id="summary-title">Billing summary</h2><p>Monetary totals are kept separate for every currency.</p></div>
        @if (summaryLoading()) {
          <div class="summary-skeleton" aria-label="Loading billing summary">@for (card of [1, 2, 3]; track card) { <div><span></span><span></span><span></span></div> }</div>
        } @else if (summaryError()) {
          <div class="error-panel" role="alert"><div><strong>Billing summary could not be loaded</strong><span>{{ summaryError() }}</span></div><button type="button" (click)="loadSummary()">Try again</button></div>
        } @else {
          <app-platform-billing-summary-cards [summary]="summary()" />
        }
      </section>

      <section aria-label="Invoice list">
        @if (invoiceError()) {
          <div class="error-panel" role="alert"><div><strong>Invoices could not be loaded</strong><span>{{ invoiceError() }}</span></div><button type="button" (click)="loadInvoices()">Try again</button></div>
        } @else {
          <app-platform-invoice-table [list]="invoices()" [loading]="invoiceLoading()" (pageChange)="onPageChange($event)" (pageSizeChange)="onPageSizeChange($event)" />
        }
      </section>
    </section>
  `,
  styles: `
    :host { color: #14213d; display: block; } * { box-sizing: border-box; }
    .billing-page { display: grid; gap: 1.25rem; }
    .page-heading { align-items: flex-start; display: flex; gap: 1rem; justify-content: space-between; }
    h1 { color: #101a38; font-size: clamp(1.55rem, 2.4vw, 2rem); margin: 0; }
    .page-heading p, .section-title p { color: #667085; margin: .4rem 0 0; }
    .heading-actions { align-items: center; display: flex; gap: .65rem; }
    .read-only { background: #f2f4f7; border-radius: 99px; color: #475467; font-size: .72rem; font-weight: 700; padding: .45rem .65rem; }
    button { background: #0b5cff; border: 0; border-radius: 8px; color: #fff; cursor: pointer; font-weight: 700; padding: .65rem .9rem; }
    button:disabled { cursor: not-allowed; opacity: .55; }
    .section-title { margin-bottom: .75rem; } .section-title h2 { font-size: 1rem; margin: 0; } .section-title p { font-size: .78rem; }
    .summary-skeleton { display: grid; gap: 1rem; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .summary-skeleton div { background: #fff; border: 1px solid #e5eaf2; border-radius: 13px; display: grid; gap: .85rem; padding: 1.2rem; }
    .summary-skeleton span { animation: pulse 1.3s ease-in-out infinite; background: #e9eef5; border-radius: 6px; height: 1rem; width: 70%; }
    .summary-skeleton span:first-child { height: 1.5rem; width: 35%; }
    .error-panel { align-items: center; background: #fff; border: 1px solid #fecdca; border-radius: 13px; color: #b42318; display: flex; gap: 1rem; justify-content: space-between; padding: 1rem; }
    .error-panel div { display: grid; gap: .3rem; } .error-panel span { font-size: .8rem; }
    @keyframes pulse { 50% { opacity: .45; } }
    @media (max-width: 760px) { .summary-skeleton { grid-template-columns: 1fr; } .page-heading, .error-panel { align-items: flex-start; flex-direction: column; } }
  `
})
export class PlatformBillingPage implements OnDestroy {
  readonly summary = signal<PlatformBillingSummary | null>(null);
  readonly invoices = signal<PlatformBillingInvoiceList | null>(null);
  readonly summaryLoading = signal(true);
  readonly invoiceLoading = signal(true);
  readonly summaryError = signal<string | null>(null);
  readonly invoiceError = signal<string | null>(null);
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);

  private readonly subscriptions = new Subscription();

  constructor(private readonly api: PlatformBillingApiService, private readonly apiError: ApiErrorService) {
    this.loadSummary();
    this.loadInvoices();
  }

  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }

  refresh(): void { this.loadSummary(); this.loadInvoices(); }

  loadSummary(): void {
    this.summaryLoading.set(true); this.summaryError.set(null);
    this.subscriptions.add(this.api.getSummary(this.buildQuery()).subscribe({
      next: (summary) => { this.summary.set(summary); this.summaryLoading.set(false); },
      error: (error) => { this.summaryError.set(this.apiError.toSafeMessage(error)); this.summaryLoading.set(false); }
    }));
  }

  loadInvoices(): void {
    this.invoiceLoading.set(true); this.invoiceError.set(null);
    this.subscriptions.add(this.api.getInvoices(this.buildQuery()).subscribe({
      next: (invoices) => {
        if (invoices.totalPages > 0 && this.pageNumber() > invoices.totalPages) {
          this.pageNumber.set(invoices.totalPages); this.loadInvoices(); return;
        }
        this.invoices.set(invoices); this.pageNumber.set(invoices.pageNumber); this.pageSize.set(invoices.pageSize); this.invoiceLoading.set(false);
      },
      error: (error) => { this.invoiceError.set(this.apiError.toSafeMessage(error)); this.invoiceLoading.set(false); }
    }));
  }

  onPageChange(pageNumber: number): void {
    const lastPage = this.invoices()?.totalPages ?? pageNumber;
    const clampedPage = Math.max(1, Math.min(pageNumber, Math.max(1, lastPage)));
    if (clampedPage === this.pageNumber()) return;
    this.pageNumber.set(clampedPage); this.loadInvoices();
  }

  onPageSizeChange(pageSize: number): void {
    if (!Number.isFinite(pageSize) || pageSize < 1) return;
    this.pageNumber.set(1); this.pageSize.set(pageSize); this.loadInvoices();
  }

  private buildQuery(): PlatformBillingQuery {
    return { pageNumber: this.pageNumber(), pageSize: this.pageSize(), sortBy: 'createdAt', sortDirection: 'desc' };
  }
}
