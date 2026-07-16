import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';

import { PlatformBillingInvoiceDetail } from '../../models/platform-billing.model';

@Component({
  selector: 'app-platform-billing-invoice-detail',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  template: `
    <div class="detail-body">
      <header class="detail-header">
        <div>
          <p class="eyebrow">Invoice detail</p>
          <h2 id="invoice-detail-title">
            {{ detail?.invoice?.invoiceNumber || 'Invoice detail' }}
          </h2>
          @if (detail; as current) {
            <p class="subtitle">
              {{ current.invoice.tenantName }}
              @if (current.invoice.tenantCode) {
                <span>({{ current.invoice.tenantCode }})</span>
              }
            </p>
          }
        </div>
        <div class="header-meta">
          @if (detail; as current) {
            <span
              class="status"
              [class]="'status ' + current.invoice.displayStatus.toLowerCase()"
              >{{ current.invoice.displayStatus }}</span
            >
            <span class="currency">{{ current.invoice.currencyCode }}</span>
          }
          <button
            #closeButton
            type="button"
            class="icon-close"
            aria-label="Close invoice detail"
            (click)="onClose()"
          >
            ×
          </button>
        </div>
      </header>

      @if (loading) {
        <div class="skeleton" aria-label="Loading invoice detail" aria-busy="true">
          @for (row of skeletonRows; track row) {
            <div class="skeleton-row"><span></span><span></span></div>
          }
        </div>
      } @else if (notFound) {
        <div class="error-panel" role="alert">
          <div>
            <strong>Invoice not found</strong>
            <span>{{ error || 'The selected invoice could not be found.' }}</span>
          </div>
          <button type="button" class="btn" (click)="onClose()">Close</button>
        </div>
      } @else if (error) {
        <div class="error-panel" role="alert">
          <div>
            <strong>Invoice detail could not be loaded</strong>
            <span>{{ error }}</span>
          </div>
          <button type="button" class="btn" (click)="onRetry()">Try again</button>
        </div>
      } @else if (detail; as current) {
        <section class="info-grid" aria-label="Invoice information">
          <div>
            <span>Plan</span>
            <strong>{{ current.invoice.planName || '—' }}</strong>
            <small>{{ current.invoice.planCode || '—' }}</small>
          </div>
          <div>
            <span>Subscription</span>
            <strong>{{ current.invoice.subscriptionStatus || '—' }}</strong>
            <small>{{ current.invoice.subscriptionId || '—' }}</small>
          </div>
          <div>
            <span>Invoice type</span>
            <strong>{{ current.invoiceType || '—' }}</strong>
          </div>
          <div>
            <span>Billing cycle</span>
            <strong>{{ current.billingCycle || '—' }}</strong>
          </div>
          <div>
            <span>Created</span>
            <strong>{{ current.invoice.createdAt | date: 'mediumDate' }}</strong>
          </div>
          <div>
            <span>Issued</span>
            <strong>{{ formatNullableDate(current.invoice.issuedAt) }}</strong>
          </div>
          <div>
            <span>Due</span>
            <strong>{{ formatNullableDate(current.invoice.dueAt) }}</strong>
          </div>
          <div>
            <span>Paid</span>
            <strong>{{ formatNullableDate(current.invoice.paidAt) }}</strong>
          </div>
          <div>
            <span>Billing period</span>
            <strong
              >{{ formatNullableDate(current.billingPeriodStart) }} –
              {{ formatNullableDate(current.billingPeriodEnd) }}</strong
            >
          </div>
          <div>
            <span>Updated</span>
            <strong>{{ current.invoice.updatedAt | date: 'mediumDate' }}</strong>
          </div>
          <div>
            <span>Stored status</span>
            <strong>{{ current.invoice.storedStatus }}</strong>
          </div>
        </section>

        <section class="money-grid" aria-label="Monetary summary">
          <div>
            <span>Subtotal</span>
            <strong>{{
              current.subtotalAmount | currency: current.invoice.currencyCode : 'symbol' : '1.2-2'
            }}</strong>
          </div>
          <div>
            <span>Discount</span>
            <strong>{{
              current.discountAmount | currency: current.invoice.currencyCode : 'symbol' : '1.2-2'
            }}</strong>
          </div>
          <div>
            <span>Tax</span>
            <strong>{{
              current.taxAmount | currency: current.invoice.currencyCode : 'symbol' : '1.2-2'
            }}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{{
              current.invoice.totalAmount
                | currency: current.invoice.currencyCode : 'symbol' : '1.2-2'
            }}</strong>
          </div>
          <div>
            <span>Paid amount</span>
            <strong>{{
              current.invoice.paidAmount
                | currency: current.invoice.currencyCode : 'symbol' : '1.2-2'
            }}</strong>
          </div>
          <div>
            <span>Balance due</span>
            <strong>{{
              current.invoice.balanceDue
                | currency: current.invoice.currencyCode : 'symbol' : '1.2-2'
            }}</strong>
          </div>
        </section>

        <section class="lines" aria-labelledby="line-items-title">
          <h3 id="line-items-title">Line items</h3>
          @if (!current.lines.length) {
            <div class="empty-state">
              <strong>No line items</strong>
              <span>This invoice does not include any line items.</span>
            </div>
          } @else {
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Description</th>
                    <th scope="col">Qty</th>
                    <th scope="col">Unit price</th>
                    <th scope="col">Discount</th>
                    <th scope="col">Tax</th>
                    <th scope="col">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (line of current.lines; track line.id) {
                    <tr>
                      <td>{{ line.lineNumber }}</td>
                      <td class="wrap">{{ line.description }}</td>
                      <td>{{ line.quantity }}</td>
                      <td>
                        {{
                          line.unitPrice
                            | currency: current.invoice.currencyCode : 'symbol' : '1.2-2'
                        }}
                      </td>
                      <td>
                        {{
                          line.discountAmount
                            | currency: current.invoice.currencyCode : 'symbol' : '1.2-2'
                        }}
                      </td>
                      <td>
                        {{
                          line.taxAmount
                            | currency: current.invoice.currencyCode : 'symbol' : '1.2-2'
                        }}
                      </td>
                      <td>
                        {{
                          line.lineTotal
                            | currency: current.invoice.currencyCode : 'symbol' : '1.2-2'
                        }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    * {
      box-sizing: border-box;
    }
    .detail-body {
      display: grid;
      gap: 1.1rem;
    }
    .detail-header {
      align-items: flex-start;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
    }
    .eyebrow {
      color: #667085;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      margin: 0 0 0.35rem;
      text-transform: uppercase;
    }
    h2 {
      color: #101a38;
      font-size: 1.2rem;
      margin: 0;
    }
    .subtitle {
      color: #667085;
      font-size: 0.82rem;
      margin: 0.35rem 0 0;
    }
    .header-meta {
      align-items: center;
      display: flex;
      gap: 0.55rem;
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
    .currency {
      background: #edf4ff;
      border-radius: 99px;
      color: #175cd3;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.35rem 0.55rem;
    }
    .icon-close {
      background: transparent;
      border: 0;
      color: #667085;
      cursor: pointer;
      font-size: 1.55rem;
      line-height: 1;
      padding: 0.15rem;
    }
    .info-grid,
    .money-grid {
      display: grid;
      gap: 0.85rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .info-grid div,
    .money-grid div {
      background: #f8fafc;
      border: 1px solid #edf0f5;
      border-radius: 10px;
      display: grid;
      gap: 0.25rem;
      min-width: 0;
      padding: 0.75rem;
    }
    .info-grid span,
    .money-grid span {
      color: #667085;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .info-grid strong,
    .money-grid strong {
      color: #101828;
      font-size: 0.86rem;
      overflow-wrap: anywhere;
    }
    .info-grid small {
      color: #667085;
      font-size: 0.72rem;
      overflow-wrap: anywhere;
    }
    h3 {
      color: #101a38;
      font-size: 0.95rem;
      margin: 0 0 0.75rem;
    }
    .table-scroll {
      overflow-x: auto;
    }
    table {
      border-collapse: collapse;
      min-width: 640px;
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
      gap: 0.75rem;
    }
    .skeleton-row {
      display: grid;
      gap: 0.65rem;
      grid-template-columns: 1fr 1fr;
    }
    .skeleton-row span {
      animation: pulse 1.3s ease-in-out infinite;
      background: #e9eef5;
      border-radius: 6px;
      height: 2.4rem;
    }
    @keyframes pulse {
      50% {
        opacity: 0.45;
      }
    }
    @media (max-width: 720px) {
      .info-grid,
      .money-grid,
      .skeleton-row {
        grid-template-columns: 1fr;
      }
      .detail-header {
        flex-direction: column;
      }
    }
  `,
})
export class PlatformBillingInvoiceDetailPanel implements AfterViewInit {
  @Input() detail: PlatformBillingInvoiceDetail | null = null;
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() notFound = false;
  @Output() readonly dismiss = new EventEmitter<void>();
  @Output() readonly retryLoad = new EventEmitter<void>();
  @ViewChild('closeButton') private readonly closeButton?: ElementRef<HTMLButtonElement>;

  readonly skeletonRows = [1, 2, 3, 4];

  ngAfterViewInit(): void {
    queueMicrotask(() => this.closeButton?.nativeElement.focus());
  }

  onClose(): void {
    this.dismiss.emit();
  }

  onRetry(): void {
    this.retryLoad.emit();
  }

  formatNullableDate(value: string | null): string {
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
