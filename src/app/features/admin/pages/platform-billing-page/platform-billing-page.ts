import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import {
  DEFAULT_PLATFORM_BILLING_FILTER_VALUES,
  PlatformBillingFilterValues,
  PlatformBillingFilters,
} from '../../components/platform-billing-filters/platform-billing-filters';
import { PlatformBillingInvoiceDetailPanel } from '../../components/platform-billing-invoice-detail/platform-billing-invoice-detail';
import {
  PlatformBillingMutationConfirmation,
  PlatformBillingMutationMode,
} from '../../components/platform-billing-mutation-confirmation/platform-billing-mutation-confirmation';
import { PlatformBillingPaymentHistory } from '../../components/platform-billing-payment-history/platform-billing-payment-history';
import { PlatformBillingSummaryCards } from '../../components/platform-billing-summary-cards/platform-billing-summary-cards';
import { PlatformInvoiceTable } from '../../components/platform-invoice-table/platform-invoice-table';
import {
  PlatformBillingDateField,
  PlatformBillingDisplayStatus,
  PlatformBillingFilterOptions,
  PlatformBillingInvoiceDetail,
  PlatformBillingInvoiceList,
  PlatformBillingPaymentTransaction,
  PlatformBillingQuery,
  PlatformBillingSortDirection,
  PlatformBillingSortField,
  PlatformBillingSummary,
} from '../../models/platform-billing.model';
import { PlatformBillingApiService } from '../../services/platform-billing-api.service';

@Component({
  selector: 'app-platform-billing-page',
  standalone: true,
  imports: [
    PlatformBillingFilters,
    PlatformBillingSummaryCards,
    PlatformInvoiceTable,
    PlatformBillingInvoiceDetailPanel,
    PlatformBillingPaymentHistory,
    PlatformBillingMutationConfirmation,
  ],
  template: `
    <section class="billing-page">
      @if (successMessage()) {
        <div class="toast success" role="status">{{ successMessage() }}</div>
      }
      @if (mutationError()) {
        <div class="toast error" role="alert">{{ mutationError() }}</div>
      }

      <header class="page-heading">
        <div>
          <h1>Billing</h1>
          <p>Review platform revenue and subscription invoices by currency.</p>
        </div>
        <div class="heading-actions">
          @if (!canManageBilling()) {
            <span class="read-only">Read only</span>
          }
          <button
            type="button"
            (click)="refresh()"
            [disabled]="summaryLoading() || invoiceLoading() || mutationLoading()"
          >
            Refresh
          </button>
        </div>
      </header>

      <app-platform-billing-filters
        [search]="searchTerm()"
        [tenantId]="tenantId()"
        [status]="statusFilter()"
        [dateField]="dateField()"
        [dateFrom]="dateFrom()"
        [dateTo]="dateTo()"
        [tenantOptions]="filterOptions().tenants"
        [statusOptions]="filterOptions().statuses"
        [optionsLoading]="filterOptionsLoading()"
        [optionsError]="filterOptionsError()"
        [disabled]="invoiceLoading() || mutationLoading()"
        (searchChange)="onSearchChange($event)"
        (tenantChange)="onTenantChange($event)"
        (statusChange)="onStatusChange($event)"
        (dateFieldChange)="onDateFieldChange($event)"
        (dateRangeChange)="onDateRangeChange($event)"
        (reset)="onResetFilters($event)"
        (optionsRetry)="loadFilterOptions()"
      />

      <section aria-labelledby="summary-title">
        <div class="section-title">
          <h2 id="summary-title">Billing summary</h2>
          <p>Monetary totals are kept separate for every currency.</p>
        </div>
        @if (summaryLoading()) {
          <div class="summary-skeleton" aria-label="Loading billing summary">
            @for (card of [1, 2, 3]; track card) {
              <div><span></span><span></span><span></span></div>
            }
          </div>
        } @else if (summaryError()) {
          <div class="error-panel" role="alert">
            <div>
              <strong>Billing summary could not be loaded</strong><span>{{ summaryError() }}</span>
            </div>
            <button type="button" (click)="loadSummary()">Try again</button>
          </div>
        } @else {
          <app-platform-billing-summary-cards [summary]="summary()" />
        }
      </section>

      <section aria-label="Invoice list">
        @if (invoiceError()) {
          <div class="error-panel" role="alert">
            <div>
              <strong>Invoices could not be loaded</strong><span>{{ invoiceError() }}</span>
            </div>
            <button type="button" (click)="loadInvoices()">Try again</button>
          </div>
        } @else {
          <app-platform-invoice-table
            [list]="invoices()"
            [loading]="invoiceLoading()"
            [sortBy]="sortBy()"
            [sortDirection]="sortDirection()"
            (pageChange)="onPageChange($event)"
            (pageSizeChange)="onPageSizeChange($event)"
            (sortChange)="onSortChange($event)"
            (viewInvoice)="onViewInvoice($event)"
          />
        }
      </section>

      @if (detailOpen()) {
        <div class="detail-backdrop" (click)="closeDetail()"></div>
        <aside
          class="detail-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-detail-title"
        >
          <app-platform-billing-invoice-detail
            [detail]="invoiceDetail()"
            [loading]="detailLoading()"
            [error]="detailError()"
            [notFound]="detailNotFound()"
            [canIssueAction]="canShowIssue()"
            [canMarkPaidAction]="canShowMarkPaid()"
            [mutationBusy]="mutationLoading()"
            (dismiss)="closeDetail()"
            (retryLoad)="loadInvoiceDetail()"
            (issueRequested)="openIssueConfirmation()"
            (markPaidRequested)="openMarkPaidConfirmation()"
          />
          @if (!detailNotFound()) {
            <app-platform-billing-payment-history
              [payments]="payments()"
              [loading]="paymentsLoading()"
              [error]="paymentsError()"
              (retryLoad)="loadInvoicePayments()"
            />
          }
        </aside>
      }

      @if (confirmationMode(); as mode) {
        <app-platform-billing-mutation-confirmation
          [mode]="mode"
          [invoiceNumber]="confirmationInvoiceNumber()"
          [tenantName]="confirmationTenantName()"
          [displayStatus]="confirmationDisplayStatus()"
          [balanceDue]="confirmationBalanceDue()"
          [currencyCode]="confirmationCurrencyCode()"
          [loading]="mutationLoading()"
          (confirmed)="onMutationConfirmed($event)"
          (cancelled)="closeConfirmation()"
        />
      }
    </section>
  `,
  styles: `
    :host {
      color: #14213d;
      display: block;
    }
    * {
      box-sizing: border-box;
    }
    .billing-page {
      display: grid;
      gap: 1.25rem;
      position: relative;
    }
    .toast {
      border-radius: 12px;
      box-shadow: 0 10px 24px rgba(16, 24, 40, 0.12);
      font-size: 0.88rem;
      font-weight: 600;
      padding: 0.85rem 1rem;
      position: fixed;
      right: 1.6rem;
      top: 5.5rem;
      z-index: 40;
    }
    .toast.success {
      background: #ecfdf3;
      border: 1px solid #abefc6;
      color: #027a48;
    }
    .toast.error {
      background: #fef3f2;
      border: 1px solid #fecdca;
      color: #b42318;
    }
    .page-heading {
      align-items: flex-start;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
    }
    h1 {
      color: #101a38;
      font-size: clamp(1.55rem, 2.4vw, 2rem);
      margin: 0;
    }
    .page-heading p,
    .section-title p {
      color: #667085;
      margin: 0.4rem 0 0;
    }
    .heading-actions {
      align-items: center;
      display: flex;
      gap: 0.65rem;
    }
    .read-only {
      background: #f2f4f7;
      border-radius: 99px;
      color: #475467;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.45rem 0.65rem;
    }
    button {
      background: #0b5cff;
      border: 0;
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      font-weight: 700;
      padding: 0.65rem 0.9rem;
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    .section-title {
      margin-bottom: 0.75rem;
    }
    .section-title h2 {
      font-size: 1rem;
      margin: 0;
    }
    .section-title p {
      font-size: 0.78rem;
    }
    .summary-skeleton {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .summary-skeleton div {
      background: #fff;
      border: 1px solid #e5eaf2;
      border-radius: 13px;
      display: grid;
      gap: 0.85rem;
      padding: 1.2rem;
    }
    .summary-skeleton span {
      animation: pulse 1.3s ease-in-out infinite;
      background: #e9eef5;
      border-radius: 6px;
      height: 1rem;
      width: 70%;
    }
    .summary-skeleton span:first-child {
      height: 1.5rem;
      width: 35%;
    }
    .error-panel {
      align-items: center;
      background: #fff;
      border: 1px solid #fecdca;
      border-radius: 13px;
      color: #b42318;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      padding: 1rem;
    }
    .error-panel div {
      display: grid;
      gap: 0.3rem;
    }
    .error-panel span {
      font-size: 0.8rem;
    }
    .detail-backdrop {
      background: rgba(16, 24, 40, 0.45);
      inset: 0;
      position: fixed;
      z-index: 20;
    }
    .detail-panel {
      background: #fff;
      border: 1px solid #e5eaf2;
      border-radius: 14px;
      box-shadow: 0 18px 48px rgba(16, 24, 40, 0.18);
      display: grid;
      gap: 1.25rem;
      max-height: calc(100vh - 2rem);
      overflow: auto;
      padding: 1.15rem;
      position: fixed;
      right: 1rem;
      top: 1rem;
      width: min(44rem, calc(100vw - 2rem));
      z-index: 21;
    }
    @keyframes pulse {
      50% {
        opacity: 0.45;
      }
    }
    @media (max-width: 760px) {
      .summary-skeleton {
        grid-template-columns: 1fr;
      }
      .page-heading,
      .error-panel {
        align-items: flex-start;
        flex-direction: column;
      }
      .detail-panel {
        border-radius: 0;
        inset: 0;
        max-height: none;
        right: 0;
        top: 0;
        width: 100vw;
      }
      .toast {
        left: 1rem;
        right: 1rem;
      }
    }
  `,
})
export class PlatformBillingPage implements OnDestroy {
  private readonly accessControl = inject(AccessControlService);

  readonly summary = signal<PlatformBillingSummary | null>(null);
  readonly invoices = signal<PlatformBillingInvoiceList | null>(null);
  readonly filterOptions = signal<PlatformBillingFilterOptions>({ tenants: [], statuses: [] });
  readonly summaryLoading = signal(true);
  readonly invoiceLoading = signal(true);
  readonly filterOptionsLoading = signal(true);
  readonly summaryError = signal<string | null>(null);
  readonly invoiceError = signal<string | null>(null);
  readonly filterOptionsError = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly tenantId = signal('');
  readonly statusFilter = signal('');
  readonly dateField = signal<PlatformBillingDateField>(
    DEFAULT_PLATFORM_BILLING_FILTER_VALUES.dateField,
  );
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly sortBy = signal<PlatformBillingSortField>('createdAt');
  readonly sortDirection = signal<PlatformBillingSortDirection>('desc');
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);

  readonly detailOpen = signal(false);
  readonly selectedInvoiceId = signal<string | null>(null);
  readonly invoiceDetail = signal<PlatformBillingInvoiceDetail | null>(null);
  readonly payments = signal<PlatformBillingPaymentTransaction[]>([]);
  readonly detailLoading = signal(false);
  readonly paymentsLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly paymentsError = signal<string | null>(null);
  readonly detailNotFound = signal(false);

  readonly confirmationMode = signal<PlatformBillingMutationMode | null>(null);
  readonly mutationLoading = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly mutationError = signal<string | null>(null);
  readonly manageBlocked = signal(false);

  readonly canManageBilling = computed(
    () =>
      !this.manageBlocked() && this.accessControl.hasPermission(platformPermissions.billingManage),
  );

  readonly canShowIssue = computed(() => {
    const detail = this.invoiceDetail();
    return this.canManageBilling() && !!detail && !this.detailNotFound() && detail.invoice.canIssue;
  });

  readonly canShowMarkPaid = computed(() => {
    const detail = this.invoiceDetail();
    return (
      this.canManageBilling() && !!detail && !this.detailNotFound() && detail.invoice.canMarkPaid
    );
  });

  readonly confirmationInvoiceNumber = computed(
    () => this.invoiceDetail()?.invoice.invoiceNumber ?? '',
  );
  readonly confirmationTenantName = computed(() => this.invoiceDetail()?.invoice.tenantName ?? '');
  readonly confirmationDisplayStatus = computed(
    () => this.invoiceDetail()?.invoice.displayStatus ?? '',
  );
  readonly confirmationBalanceDue = computed(() => this.invoiceDetail()?.invoice.balanceDue ?? 0);
  readonly confirmationCurrencyCode = computed(
    () => this.invoiceDetail()?.invoice.currencyCode ?? '',
  );

  private readonly subscriptions = new Subscription();
  private summaryRequestId = 0;
  private invoiceRequestId = 0;
  private detailRequestId = 0;
  private paymentsRequestId = 0;
  private mutationRequestId = 0;
  private hasLoadedSummary = false;
  private lastFocusedElement: HTMLElement | null = null;
  private mutationTriggerElement: HTMLElement | null = null;

  constructor(
    private readonly api: PlatformBillingApiService,
    private readonly apiError: ApiErrorService,
  ) {
    this.loadFilterOptions();
    this.reloadBillingData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirmationMode()) {
      if (!this.mutationLoading()) {
        this.closeConfirmation();
      }
      return;
    }

    if (this.detailOpen() && !this.mutationLoading()) {
      this.closeDetail();
    }
  }

  refresh(): void {
    this.reloadBillingData();
  }

  loadFilterOptions(): void {
    this.filterOptionsLoading.set(true);
    this.filterOptionsError.set(null);

    this.subscriptions.add(
      this.api.getFilterOptions().subscribe({
        next: (options) => {
          this.filterOptions.set(options);
          this.filterOptionsLoading.set(false);
        },
        error: (error) => {
          this.filterOptionsError.set(this.apiError.toSafeMessage(error));
          this.filterOptionsLoading.set(false);
        },
      }),
    );
  }

  loadSummary(): void {
    if (this.hasInvalidDateRange()) {
      return;
    }

    const requestId = ++this.summaryRequestId;
    const showSkeleton = !this.hasLoadedSummary;
    if (showSkeleton) {
      this.summaryLoading.set(true);
    }
    this.summaryError.set(null);

    this.subscriptions.add(
      this.api.getSummary(this.buildQuery()).subscribe({
        next: (summary) => {
          if (requestId !== this.summaryRequestId) {
            return;
          }
          this.summary.set(summary);
          this.summaryLoading.set(false);
          this.hasLoadedSummary = true;
        },
        error: (error) => {
          if (requestId !== this.summaryRequestId) {
            return;
          }
          this.summaryError.set(this.apiError.toSafeMessage(error));
          this.summaryLoading.set(false);
        },
      }),
    );
  }

  loadInvoices(): void {
    if (this.hasInvalidDateRange()) {
      this.invoiceLoading.set(false);
      return;
    }

    const requestId = ++this.invoiceRequestId;
    this.invoiceLoading.set(true);
    this.invoiceError.set(null);

    this.subscriptions.add(
      this.api.getInvoices(this.buildQuery()).subscribe({
        next: (invoices) => {
          if (requestId !== this.invoiceRequestId) {
            return;
          }

          if (invoices.totalPages > 0 && this.pageNumber() > invoices.totalPages) {
            this.pageNumber.set(invoices.totalPages);
            this.loadInvoices();
            return;
          }

          this.invoices.set(invoices);
          this.pageNumber.set(invoices.pageNumber);
          this.pageSize.set(invoices.pageSize);
          this.invoiceLoading.set(false);
        },
        error: (error) => {
          if (requestId !== this.invoiceRequestId) {
            return;
          }
          this.invoiceError.set(this.apiError.toSafeMessage(error));
          this.invoiceLoading.set(false);
        },
      }),
    );
  }

  onViewInvoice(invoiceId: string): void {
    this.lastFocusedElement = document.activeElement as HTMLElement | null;
    this.closeConfirmation();
    this.selectedInvoiceId.set(invoiceId);
    this.detailOpen.set(true);
    this.invoiceDetail.set(null);
    this.payments.set([]);
    this.detailError.set(null);
    this.paymentsError.set(null);
    this.detailNotFound.set(false);
    this.mutationError.set(null);
    this.loadInvoiceDetail();
    this.loadInvoicePayments();
  }

  closeDetail(): void {
    if (this.mutationLoading()) {
      return;
    }

    this.mutationRequestId += 1;
    this.detailRequestId += 1;
    this.paymentsRequestId += 1;
    this.closeConfirmation();
    this.detailOpen.set(false);
    this.selectedInvoiceId.set(null);
    this.invoiceDetail.set(null);
    this.payments.set([]);
    this.detailLoading.set(false);
    this.paymentsLoading.set(false);
    this.detailError.set(null);
    this.paymentsError.set(null);
    this.detailNotFound.set(false);
    queueMicrotask(() => this.lastFocusedElement?.focus());
    this.lastFocusedElement = null;
  }

  loadInvoiceDetail(): void {
    const invoiceId = this.selectedInvoiceId();
    if (!invoiceId) {
      return;
    }

    const requestId = ++this.detailRequestId;
    this.detailLoading.set(true);
    this.detailError.set(null);
    this.detailNotFound.set(false);

    this.subscriptions.add(
      this.api.getInvoice(invoiceId).subscribe({
        next: (detail) => {
          if (requestId !== this.detailRequestId || this.selectedInvoiceId() !== invoiceId) {
            return;
          }
          this.invoiceDetail.set(detail);
          this.detailLoading.set(false);
        },
        error: (error) => {
          if (requestId !== this.detailRequestId || this.selectedInvoiceId() !== invoiceId) {
            return;
          }
          this.invoiceDetail.set(null);
          this.detailNotFound.set(isInvoiceNotFound(error));
          this.detailError.set(this.apiError.toSafeMessage(error));
          this.detailLoading.set(false);
        },
      }),
    );
  }

  loadInvoicePayments(): void {
    const invoiceId = this.selectedInvoiceId();
    if (!invoiceId) {
      return;
    }

    const requestId = ++this.paymentsRequestId;
    this.paymentsLoading.set(true);
    this.paymentsError.set(null);

    this.subscriptions.add(
      this.api.getInvoicePayments(invoiceId).subscribe({
        next: (payments) => {
          if (requestId !== this.paymentsRequestId || this.selectedInvoiceId() !== invoiceId) {
            return;
          }
          this.payments.set(payments);
          this.paymentsLoading.set(false);
        },
        error: (error) => {
          if (requestId !== this.paymentsRequestId || this.selectedInvoiceId() !== invoiceId) {
            return;
          }
          this.paymentsError.set(this.apiError.toSafeMessage(error));
          this.paymentsLoading.set(false);
        },
      }),
    );
  }

  openIssueConfirmation(): void {
    if (!this.canShowIssue() || this.mutationLoading()) {
      return;
    }
    this.mutationTriggerElement = document.activeElement as HTMLElement | null;
    this.mutationError.set(null);
    this.confirmationMode.set('ISSUE');
  }

  openMarkPaidConfirmation(): void {
    if (!this.canShowMarkPaid() || this.mutationLoading()) {
      return;
    }
    this.mutationTriggerElement = document.activeElement as HTMLElement | null;
    this.mutationError.set(null);
    this.confirmationMode.set('MARK_PAID');
  }

  closeConfirmation(): void {
    if (this.mutationLoading()) {
      return;
    }
    this.confirmationMode.set(null);
    queueMicrotask(() => this.mutationTriggerElement?.focus());
    this.mutationTriggerElement = null;
  }

  onMutationConfirmed(mode: PlatformBillingMutationMode): void {
    if (this.mutationLoading()) {
      return;
    }

    const detail = this.invoiceDetail();
    const invoiceId = this.selectedInvoiceId();
    if (!detail || !invoiceId || this.confirmationMode() !== mode) {
      return;
    }

    if (mode === 'ISSUE' && (!this.canShowIssue() || !detail.invoice.canIssue)) {
      return;
    }
    if (mode === 'MARK_PAID' && (!this.canShowMarkPaid() || !detail.invoice.canMarkPaid)) {
      return;
    }

    const requestId = ++this.mutationRequestId;
    const expectedUpdatedAt = detail.invoice.updatedAt;
    this.mutationLoading.set(true);
    this.mutationError.set(null);
    this.successMessage.set(null);

    const request$ =
      mode === 'ISSUE'
        ? this.api.issueInvoice(invoiceId, { expectedUpdatedAt })
        : this.api.markInvoicePaid(invoiceId, { expectedUpdatedAt });

    this.subscriptions.add(
      request$.subscribe({
        next: () => {
          if (requestId !== this.mutationRequestId) {
            return;
          }

          this.mutationLoading.set(false);
          this.confirmationMode.set(null);
          this.mutationTriggerElement = null;
          this.successMessage.set(
            mode === 'ISSUE'
              ? 'Invoice issued successfully.'
              : 'Invoice marked as paid successfully.',
          );

          if (!this.detailOpen() || this.selectedInvoiceId() !== invoiceId) {
            return;
          }

          this.reloadBillingData();
          this.loadInvoiceDetail();
          if (mode === 'MARK_PAID') {
            this.loadInvoicePayments();
          }
        },
        error: (error) => {
          if (requestId !== this.mutationRequestId) {
            return;
          }

          this.mutationLoading.set(false);
          this.handleMutationError(error, mode, invoiceId);
        },
      }),
    );
  }

  onSearchChange(search: string): void {
    this.searchTerm.set(search);
    this.pageNumber.set(1);
    this.reloadBillingData();
  }

  onTenantChange(tenantId: string): void {
    this.tenantId.set(tenantId);
    this.pageNumber.set(1);
    this.reloadBillingData();
  }

  onStatusChange(status: string): void {
    this.statusFilter.set(status);
    this.pageNumber.set(1);
    this.reloadBillingData();
  }

  onDateFieldChange(dateField: PlatformBillingDateField): void {
    this.dateField.set(dateField);
    this.pageNumber.set(1);
    this.reloadBillingData();
  }

  onDateRangeChange(range: { dateFrom: string; dateTo: string }): void {
    this.dateFrom.set(range.dateFrom);
    this.dateTo.set(range.dateTo);
    this.pageNumber.set(1);
    this.reloadBillingData();
  }

  onResetFilters(values: PlatformBillingFilterValues): void {
    this.applyFilterValues(values);
    this.sortBy.set('createdAt');
    this.sortDirection.set('desc');
    this.pageNumber.set(1);
    this.reloadBillingData();
  }

  onSortChange(sort: {
    sortBy: PlatformBillingSortField;
    sortDirection: PlatformBillingSortDirection;
  }): void {
    this.sortBy.set(sort.sortBy);
    this.sortDirection.set(sort.sortDirection);
    this.pageNumber.set(1);
    this.reloadBillingData();
  }

  onPageChange(pageNumber: number): void {
    const lastPage = this.invoices()?.totalPages ?? pageNumber;
    const clampedPage = Math.max(1, Math.min(pageNumber, Math.max(1, lastPage)));
    if (clampedPage === this.pageNumber()) return;
    this.pageNumber.set(clampedPage);
    this.loadInvoices();
  }

  onPageSizeChange(pageSize: number): void {
    if (!Number.isFinite(pageSize) || pageSize < 1) return;
    this.pageNumber.set(1);
    this.pageSize.set(pageSize);
    this.reloadBillingData();
  }

  hasInvalidDateRange(): boolean {
    const from = this.dateFrom();
    const to = this.dateTo();
    return Boolean(from && to && from > to);
  }

  buildQuery(): PlatformBillingQuery {
    const query: PlatformBillingQuery = {
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      dateField: this.dateField(),
      sortBy: this.sortBy(),
      sortDirection: this.sortDirection(),
    };

    const search = this.searchTerm().trim();
    if (search) {
      query.search = search;
    }

    if (this.tenantId()) {
      query.tenantId = this.tenantId();
    }

    if (this.statusFilter()) {
      query.status = this.statusFilter() as PlatformBillingDisplayStatus;
    }

    const dateFrom = toIsoDateBoundary(this.dateFrom(), 'start');
    const dateTo = toIsoDateBoundary(this.dateTo(), 'end');
    if (dateFrom) {
      query.dateFrom = dateFrom;
    }
    if (dateTo) {
      query.dateTo = dateTo;
    }

    return query;
  }

  private handleMutationError(
    error: unknown,
    mode: PlatformBillingMutationMode,
    invoiceId: string,
  ): void {
    const code = billingErrorCode(error);

    if (code === 'platform_billing.invoice_not_found' || isInvoiceNotFound(error)) {
      this.confirmationMode.set(null);
      this.mutationTriggerElement = null;
      this.invoiceDetail.set(null);
      this.detailNotFound.set(true);
      this.detailError.set(this.apiError.toSafeMessage(error));
      this.mutationError.set('The selected invoice could not be found.');
      this.reloadBillingData();
      return;
    }

    if (code === 'platform_billing.invalid_transition') {
      this.confirmationMode.set(null);
      this.mutationTriggerElement = null;
      this.mutationError.set(
        'This invoice can no longer use that action. The latest invoice details have been reloaded.',
      );
      this.refreshAfterConflict(invoiceId, mode);
      return;
    }

    if (code === 'platform_billing.concurrency_conflict') {
      this.confirmationMode.set(null);
      this.mutationTriggerElement = null;
      this.mutationError.set(
        'This invoice was updated elsewhere. Review the refreshed details before trying again.',
      );
      this.refreshAfterConflict(invoiceId, mode);
      return;
    }

    if (code === 'platform_billing.access_denied') {
      this.confirmationMode.set(null);
      this.mutationTriggerElement = null;
      this.manageBlocked.set(true);
      this.mutationError.set('You do not have permission to manage billing invoices.');
      return;
    }

    if (code === 'platform_billing.validation_failed') {
      this.mutationError.set(this.apiError.toSafeMessage(error));
      return;
    }

    this.mutationError.set(this.apiError.toSafeMessage(error));
  }

  private refreshAfterConflict(invoiceId: string, mode: PlatformBillingMutationMode): void {
    this.reloadBillingData();
    if (this.detailOpen() && this.selectedInvoiceId() === invoiceId) {
      this.loadInvoiceDetail();
      if (mode === 'MARK_PAID') {
        this.loadInvoicePayments();
      }
    }
  }

  private reloadBillingData(): void {
    if (this.hasInvalidDateRange()) {
      this.invoiceLoading.set(false);
      return;
    }

    this.loadSummary();
    this.loadInvoices();
  }

  private applyFilterValues(values: PlatformBillingFilterValues): void {
    this.searchTerm.set(values.search);
    this.tenantId.set(values.tenantId);
    this.statusFilter.set(values.status);
    this.dateField.set(values.dateField);
    this.dateFrom.set(values.dateFrom);
    this.dateTo.set(values.dateTo);
  }
}

function toIsoDateBoundary(dateValue: string, boundary: 'start' | 'end'): string | undefined {
  if (!dateValue) {
    return undefined;
  }

  const suffix = boundary === 'start' ? 'T00:00:00.000' : 'T23:59:59.999';
  return new Date(`${dateValue}${suffix}`).toISOString();
}

function isInvoiceNotFound(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }

  if (error.status === 404) {
    return true;
  }

  return error.error?.errorCode === 'platform_billing.invoice_not_found';
}

function billingErrorCode(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }

  const code = error.error?.errorCode;
  return typeof code === 'string' ? code : null;
}
