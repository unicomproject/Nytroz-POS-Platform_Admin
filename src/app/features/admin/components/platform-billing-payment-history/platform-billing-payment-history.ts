import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { PlatformBillingPaymentTransaction } from '../../models/platform-billing.model';

@Component({
  selector: 'app-platform-billing-payment-history',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  template: `
    <section class="payment-history" aria-labelledby="payment-history-title">
      <header class="section-header">
        <h3 id="payment-history-title">Payment history</h3>
        <p>Recorded payment transactions for this invoice</p>
      </header>

      @if (loading) {
        <div class="skeleton" aria-label="Loading payment history" aria-busy="true">
          @for (row of skeletonRows; track row) {
            <div class="skeleton-row"><span></span><span></span><span></span></div>
          }
        </div>
      } @else if (error) {
        <div class="error-panel" role="alert">
          <div>
            <strong>Payment history could not be loaded</strong>
            <span>{{ error }}</span>
          </div>
          <button type="button" class="btn" (click)="onRetry()">Try again</button>
        </div>
      } @else if (!payments.length) {
        <div class="empty-state">
          <strong>No payment history is available for this invoice.</strong>
          <span>Recorded transactions will appear here when payment activity exists.</span>
        </div>
      } @else {
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Paid</th>
                <th scope="col">Status</th>
                <th scope="col">Provider</th>
                <th scope="col">Reference</th>
                <th scope="col">Currency</th>
                <th scope="col">Amount</th>
                <th scope="col">Fee</th>
                <th scope="col">Net</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              @for (payment of payments; track payment.id) {
                <tr>
                  <td>{{ formatDate(payment.paidAt) }}</td>
                  <td>
                    <span class="status">{{ payment.status || '—' }}</span>
                  </td>
                  <td>{{ payment.providerName || '—' }}</td>
                  <td class="wrap">{{ payment.providerTransactionId || '—' }}</td>
                  <td>{{ payment.currencyCode }}</td>
                  <td>
                    {{ payment.amount | currency: payment.currencyCode : 'symbol' : '1.2-2' }}
                  </td>
                  <td>
                    {{ payment.providerFee | currency: payment.currencyCode : 'symbol' : '1.2-2' }}
                  </td>
                  <td>
                    {{ payment.netAmount | currency: payment.currencyCode : 'symbol' : '1.2-2' }}
                  </td>
                  <td>{{ payment.createdAt | date: 'mediumDate' }}</td>
                </tr>
              }
            </tbody>
          </table>
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
    .section-header {
      margin-bottom: 0.85rem;
    }
    h3 {
      color: #101a38;
      font-size: 0.95rem;
      margin: 0;
    }
    p {
      color: #667085;
      font-size: 0.76rem;
      margin: 0.3rem 0 0;
    }
    .table-scroll {
      overflow-x: auto;
    }
    table {
      border-collapse: collapse;
      min-width: 720px;
      width: 100%;
    }
    th {
      background: #f8fafc;
      color: #667085;
      font-size: 0.68rem;
      letter-spacing: 0.02em;
      padding: 0.65rem 0.7rem;
      text-align: left;
      text-transform: uppercase;
    }
    td {
      border-top: 1px solid #edf0f5;
      color: #344054;
      font-size: 0.76rem;
      padding: 0.7rem;
      vertical-align: top;
    }
    .wrap {
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .status {
      background: #f2f4f7;
      border-radius: 99px;
      color: #475467;
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.3rem 0.5rem;
    }
    .empty-state,
    .error-panel {
      background: #fff;
      border: 1px dashed #d0d5dd;
      border-radius: 10px;
      color: #667085;
      display: grid;
      gap: 0.35rem;
      padding: 1rem;
    }
    .empty-state strong {
      color: #344054;
    }
    .error-panel {
      align-items: flex-start;
      border-color: #fecdca;
      border-style: solid;
      color: #b42318;
      display: flex;
      gap: 0.75rem;
      justify-content: space-between;
    }
    .error-panel div {
      display: grid;
      gap: 0.25rem;
    }
    .error-panel span {
      font-size: 0.78rem;
    }
    .btn {
      background: #fff;
      border: 1px solid #d0d5dd;
      border-radius: 8px;
      color: #344054;
      cursor: pointer;
      font-weight: 700;
      padding: 0.5rem 0.75rem;
      white-space: nowrap;
    }
    .skeleton {
      display: grid;
      gap: 0.65rem;
    }
    .skeleton-row {
      display: grid;
      gap: 0.5rem;
      grid-template-columns: 1.2fr 1fr 1fr;
    }
    .skeleton-row span {
      animation: pulse 1.3s ease-in-out infinite;
      background: #e9eef5;
      border-radius: 5px;
      height: 0.85rem;
    }
    @keyframes pulse {
      50% {
        opacity: 0.45;
      }
    }
  `,
})
export class PlatformBillingPaymentHistory {
  @Input() payments: PlatformBillingPaymentTransaction[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;
  @Output() readonly retryLoad = new EventEmitter<void>();

  readonly skeletonRows = [1, 2, 3];

  onRetry(): void {
    this.retryLoad.emit();
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '—';
    }

    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
