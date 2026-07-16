import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';

export type PlatformBillingMutationMode = 'ISSUE' | 'MARK_PAID';

@Component({
  selector: 'app-platform-billing-mutation-confirmation',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <div class="modal-backdrop" role="presentation" (click)="onBackdropClick()"></div>
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="titleId"
      [attr.aria-busy]="loading"
    >
      <h3 [id]="titleId">{{ title }}</h3>

      <dl class="details">
        <div>
          <dt>Invoice</dt>
          <dd>{{ invoiceNumber }}</dd>
        </div>
        <div>
          <dt>Tenant</dt>
          <dd>{{ tenantName }}</dd>
        </div>
        <div>
          <dt>Current status</dt>
          <dd>{{ displayStatus }}</dd>
        </div>
        @if (mode === 'MARK_PAID') {
          <div>
            <dt>Outstanding amount</dt>
            <dd>
              {{ balanceDue | currency: currencyCode : 'symbol' : '1.2-2' }} {{ currencyCode }}
            </dd>
          </div>
        }
      </dl>

      @if (mode === 'ISSUE') {
        <p>
          Issuing this invoice changes its status from Draft to Pending. Confirm only if you are
          ready to make it payable.
        </p>
      } @else {
        <p>
          Marking this invoice as paid settles the full outstanding balance. The invoice status
          becomes Paid.
        </p>
        <p class="note" role="note">
          This action may not create a payment-history transaction. Existing payment history will
          remain unchanged if no transaction was previously recorded.
        </p>
      }

      <div class="actions">
        <button
          #cancelButton
          type="button"
          class="btn outline"
          (click)="onCancel()"
          [disabled]="loading"
        >
          Cancel
        </button>
        <button
          #confirmButton
          type="button"
          class="btn primary"
          (click)="onConfirm()"
          [disabled]="loading"
          [attr.aria-busy]="loading"
        >
          {{ loading ? loadingLabel : confirmLabel }}
        </button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }
    * {
      box-sizing: border-box;
    }
    .modal-backdrop {
      background: rgba(16, 24, 40, 0.55);
      inset: 0;
      position: fixed;
      z-index: 30;
    }
    .modal {
      background: #fff;
      border: 1px solid #e5eaf2;
      border-radius: 14px;
      box-shadow: 0 18px 48px rgba(16, 24, 40, 0.22);
      display: grid;
      gap: 1rem;
      left: 50%;
      max-width: min(28rem, calc(100vw - 2rem));
      padding: 1.25rem;
      position: fixed;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 100%;
      z-index: 31;
    }
    h3 {
      color: #101a38;
      font-size: 1.05rem;
      margin: 0;
    }
    p {
      color: #475467;
      font-size: 0.86rem;
      line-height: 1.45;
      margin: 0;
    }
    .note {
      background: #fff8eb;
      border: 1px solid #fedf89;
      border-radius: 10px;
      color: #7a2e0e;
      padding: 0.75rem 0.85rem;
    }
    .details {
      display: grid;
      gap: 0.65rem;
      margin: 0;
    }
    .details div {
      display: grid;
      gap: 0.15rem;
    }
    dt {
      color: #667085;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    dd {
      color: #101828;
      font-size: 0.9rem;
      font-weight: 600;
      margin: 0;
      overflow-wrap: anywhere;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      justify-content: flex-end;
    }
    .btn {
      border: 0;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 700;
      padding: 0.65rem 0.95rem;
    }
    .btn:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    .btn.outline {
      background: #fff;
      border: 1px solid #d0d5dd;
      color: #344054;
    }
    .btn.primary {
      background: #0b5cff;
      color: #fff;
    }
  `,
})
export class PlatformBillingMutationConfirmation implements AfterViewInit {
  @Input({ required: true }) mode!: PlatformBillingMutationMode;
  @Input({ required: true }) invoiceNumber!: string;
  @Input({ required: true }) tenantName!: string;
  @Input({ required: true }) displayStatus!: string;
  @Input() balanceDue = 0;
  @Input() currencyCode = '';
  @Input() loading = false;
  @Output() readonly confirmed = new EventEmitter<PlatformBillingMutationMode>();
  @Output() readonly cancelled = new EventEmitter<void>();
  @ViewChild('confirmButton') private readonly confirmButton?: ElementRef<HTMLButtonElement>;

  readonly titleId = 'billing-mutation-confirmation-title';

  get title(): string {
    return this.mode === 'ISSUE' ? 'Issue invoice?' : 'Mark invoice as paid?';
  }

  get confirmLabel(): string {
    return this.mode === 'ISSUE' ? 'Issue invoice' : 'Mark as paid';
  }

  get loadingLabel(): string {
    return this.mode === 'ISSUE' ? 'Issuing…' : 'Marking paid…';
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.confirmButton?.nativeElement.focus());
  }

  onConfirm(): void {
    if (this.loading) {
      return;
    }
    this.confirmed.emit(this.mode);
  }

  onCancel(): void {
    if (this.loading) {
      return;
    }
    this.cancelled.emit();
  }

  onBackdropClick(): void {
    this.onCancel();
  }
}
