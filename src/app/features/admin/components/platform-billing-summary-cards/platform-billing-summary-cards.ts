import { CurrencyPipe } from '@angular/common';
import { Component, Input } from '@angular/core';

import { PlatformBillingSummary } from '../../models/platform-billing.model';

@Component({
  selector: 'app-platform-billing-summary-cards',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    @if (summary?.currencies?.length) {
      <section class="summary-grid" aria-label="Billing summary by currency">
        @for (currency of summary!.currencies; track currency.currencyCode) {
          <article class="summary-card" [attr.data-currency]="currency.currencyCode">
            <header>
              <div><span>Currency</span><strong>{{ currency.currencyCode }}</strong></div>
              <span class="count">{{ currency.invoiceCount }} invoice{{ currency.invoiceCount === 1 ? '' : 's' }}</span>
            </header>
            <dl>
              <div class="paid"><dt>Paid revenue</dt><dd>{{ currency.paidRevenue | currency: currency.currencyCode : 'symbol' : '1.2-2' }}</dd></div>
              <div><dt>Outstanding</dt><dd>{{ currency.outstandingAmount | currency: currency.currencyCode : 'symbol' : '1.2-2' }}</dd></div>
              <div class="overdue"><dt>Overdue</dt><dd>{{ currency.overdueAmount | currency: currency.currencyCode : 'symbol' : '1.2-2' }}</dd></div>
            </dl>
          </article>
        }
      </section>
      <p class="total-count">{{ summary!.totalInvoices }} total invoice{{ summary!.totalInvoices === 1 ? '' : 's' }} across all currencies</p>
    } @else {
      <div class="empty-summary">No billing summary is available.</div>
    }
  `,
  styles: `
    :host { display: block; }
    * { box-sizing: border-box; }
    .summary-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); }
    .summary-card { background: #fff; border: 1px solid #e5eaf2; border-radius: 13px; box-shadow: 0 7px 22px rgba(31, 51, 86, .045); min-width: 0; padding: 1rem; }
    header { align-items: center; display: flex; gap: 1rem; justify-content: space-between; }
    header div { display: grid; gap: .2rem; }
    header div span, dt { color: #667085; font-size: .75rem; }
    header strong { color: #101a38; font-size: 1.25rem; }
    .count { background: #edf4ff; border-radius: 99px; color: #175cd3; font-size: .72rem; font-weight: 700; padding: .4rem .65rem; }
    dl { border-top: 1px solid #edf0f5; display: grid; gap: .8rem; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 1rem 0 0; padding-top: 1rem; }
    dl div { display: grid; gap: .3rem; min-width: 0; }
    dd { color: #344054; font-size: .9rem; font-weight: 800; margin: 0; overflow-wrap: anywhere; }
    .paid dd { color: #067647; } .overdue dd { color: #b42318; }
    .total-count, .empty-summary { color: #667085; font-size: .78rem; margin: .7rem 0 0; }
    .empty-summary { background: #fff; border: 1px dashed #d0d5dd; border-radius: 13px; margin: 0; padding: 1.5rem; text-align: center; }
    @media (max-width: 600px) { dl { grid-template-columns: 1fr; } }
  `
})
export class PlatformBillingSummaryCards {
  @Input() summary: PlatformBillingSummary | null = null;
}
