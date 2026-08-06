import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { ManualPaymentStatusBadge } from '../../components/manual-payment-status-badge/manual-payment-status-badge';
import { titleCase } from '../../mappers/manual-payment.mapper';
import { ManualPaymentQueue } from '../../models/manual-payment.model';
import { PlatformBillingApiService } from '../../services/platform-billing-api.service';

@Component({
  selector: 'app-platform-manual-payments-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink, ManualPaymentStatusBadge],
  templateUrl: './platform-manual-payments-page.html',
  styleUrl: './platform-manual-payments-page.scss'
})
export class PlatformManualPaymentsPage {
  readonly Math = Math;
  private readonly api = inject(PlatformBillingApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);

  readonly queue = signal<ManualPaymentQueue | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly status = signal('');
  readonly tenantId = signal('');
  readonly planId = signal('');
  readonly submittedFrom = signal('');
  readonly submittedTo = signal('');
  readonly sortBy = signal<'submittedAt' | 'amount' | 'status' | 'tenant'>('submittedAt');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  readonly pageNumber = signal(1);
  readonly pageSize = signal(20);
  readonly statuses = ['AWAITING_PAYMENT', 'PAYMENT_SUBMITTED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'PAID', 'REJECTED', 'FAILED', 'EXPIRED', 'DEFERRED'];

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getManualPayments({
      pageNumber: this.pageNumber(), pageSize: this.pageSize(), search: this.search().trim() || undefined,
      status: this.status() || undefined, tenantId: this.tenantId().trim() || undefined,
      planId: this.planId().trim() || undefined,
      submittedFrom: this.submittedFrom() ? new Date(`${this.submittedFrom()}T00:00:00`).toISOString() : undefined,
      submittedTo: this.submittedTo() ? new Date(`${this.submittedTo()}T23:59:59.999`).toISOString() : undefined,
      sortBy: this.sortBy(), sortDirection: this.sortDirection()
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (queue) => { this.queue.set(queue); this.pageNumber.set(queue.pageNumber); this.loading.set(false); },
      error: (error) => { this.error.set(this.apiError.toSafeMessage(error)); this.loading.set(false); }
    });
  }

  applyFilters(): void { this.pageNumber.set(1); this.load(); }
  resetFilters(): void {
    this.search.set(''); this.status.set(''); this.tenantId.set(''); this.planId.set('');
    this.submittedFrom.set(''); this.submittedTo.set(''); this.sortBy.set('submittedAt');
    this.sortDirection.set('desc'); this.pageNumber.set(1); this.load();
  }
  previousPage(): void { if (this.pageNumber() > 1) { this.pageNumber.update((value) => value - 1); this.load(); } }
  nextPage(): void { if (this.pageNumber() < (this.queue()?.totalPages ?? 0)) { this.pageNumber.update((value) => value + 1); this.load(); } }
  formatStatus(value: string | null | undefined): string { return titleCase(value); }
  age(seconds: number | null): string {
    if (seconds == null) return 'Not submitted';
    if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }
}
