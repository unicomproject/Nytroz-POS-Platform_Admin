import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { ManualPaymentStatusBadge } from '../../components/manual-payment-status-badge/manual-payment-status-badge';
import { titleCase } from '../../mappers/manual-payment.mapper';
import { ManualPaymentDetail, ManualPaymentEvidence, ManualPaymentReviewAction } from '../../models/manual-payment.model';
import { PlatformBillingApiService } from '../../services/platform-billing-api.service';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import { manualPaymentErrorMessage } from '../../utils/manual-payment-error.util';

@Component({
  selector: 'app-platform-manual-payment-detail-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink, ManualPaymentStatusBadge],
  templateUrl: './platform-manual-payment-detail-page.html',
  styleUrl: './platform-manual-payment-detail-page.scss'
})
export class PlatformManualPaymentDetailPage implements OnDestroy {
  @ViewChild('reviewDialog') private reviewDialog?: ElementRef<HTMLDialogElement>;
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PlatformBillingApiService);
  private readonly tenants = inject(PlatformTenantApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly access = inject(AccessControlService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private objectUrl: string | null = null;
  private proofBlob: Blob | null = null;
  private reviewIdempotencyKey: string | null = null;

  readonly detail = signal<ManualPaymentDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly conflict = signal(false);
  readonly message = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly reviewAction = signal<ManualPaymentReviewAction | null>(null);
  readonly reviewNote = signal('');
  readonly reviewReason = signal('');
  readonly reviewConfirmed = signal(false);
  readonly reviewBusy = signal(false);
  readonly proofBusy = signal(false);
  readonly proofError = signal<string | null>(null);
  readonly proofName = signal('');
  readonly proofType = signal('');
  readonly proofUrl = signal<SafeResourceUrl | null>(null);
  readonly notificationBusy = signal(false);
  readonly activationBusy = signal(false);
  readonly invitationBusy = signal(false);

  readonly canManage = computed(() => this.access.hasPermission(platformPermissions.billingManage));
  readonly canActivateTenant = computed(() => this.access.hasPermission(platformPermissions.tenantsActivate));
  readonly canResendInvitation = computed(() => this.access.hasPermission(platformPermissions.tenantsUpdate));
  readonly canViewActor = computed(() => this.access.hasPermission(platformPermissions.auditView));
  readonly evidenceIsClean = computed(() => {
    const evidence = this.detail()?.evidence ?? [];
    return evidence.length > 0 && evidence.every((item) => item.scanStatus === 'CLEAN');
  });
  readonly difference = computed(() => {
    const payment = this.detail()?.payment;
    return payment?.submittedAmount == null ? null : payment.submittedAmount - payment.expectedAmount;
  });

  constructor() { this.load(); }

  ngOnDestroy(): void { this.clearProof(); }

  load(): void {
    const paymentId = this.route.snapshot.paramMap.get('paymentId');
    if (!paymentId) { this.loading.set(false); this.error.set('Payment reference is missing.'); return; }
    this.loading.set(true); this.error.set(null); this.conflict.set(false); this.clearProof();
    this.api.getManualPayment(paymentId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (detail) => {
        this.detail.set(detail); this.loading.set(false); this.loadHistory(paymentId);
      },
      error: (error) => { this.error.set(manualPaymentErrorMessage(error, this.apiError)); this.loading.set(false); }
    });
  }

  openReview(action: ManualPaymentReviewAction): void {
    if (!this.canRunReview(action)) return;
    this.reviewAction.set(action); this.reviewNote.set('');
    this.reviewReason.set(action === 'REJECT' ? 'PAYMENT_NOT_VERIFIED' : action === 'REQUEST_INFORMATION' ? 'INFORMATION_REQUIRED' : '');
    this.reviewConfirmed.set(false); this.actionError.set(null); this.reviewIdempotencyKey = null;
    queueMicrotask(() => this.reviewDialog?.nativeElement.showModal?.());
  }

  closeReview(): void {
    if (this.reviewBusy()) return;
    this.reviewDialog?.nativeElement.close?.(); this.reviewAction.set(null);
  }

  submitReview(): void {
    const action = this.reviewAction(); const detail = this.detail();
    if (!action || !detail || !this.canRunReview(action)) return;
    if (!this.reviewConfirmed()) { this.actionError.set('Confirm that you reviewed the payment details.'); return; }
    if (action !== 'APPROVE' && (!this.reviewNote().trim() || !this.reviewReason().trim())) {
      this.actionError.set('A clear note and reason are required for this action.'); return;
    }
    this.reviewBusy.set(true); this.actionError.set(null); this.message.set(null);
    this.reviewIdempotencyKey ??= createCommandKey();
    this.api.reviewManualPayment(detail.payment.paymentId, {
      action, expectedVersion: detail.payment.version,
      reviewNote: this.reviewNote().trim() || undefined,
      reasonCode: this.reviewReason().trim() || undefined
    }, this.reviewIdempotencyKey).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.reviewBusy.set(false); this.reviewIdempotencyKey = null; this.closeReview();
        this.message.set(result.idempotentReplay ? 'The existing review result was confirmed.' : `Review completed: ${titleCase(result.result)}.`);
        this.load();
      },
      error: (error: unknown) => {
        this.reviewBusy.set(false);
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.conflict.set(true);
          this.actionError.set('This payment was updated by another reviewer. Reload the latest status before continuing.');
        } else this.actionError.set(manualPaymentErrorMessage(error, this.apiError));
      }
    });
  }

  canRunReview(action: ManualPaymentReviewAction): boolean {
    const detail = this.detail();
    return this.canManage() && !!detail && detail.allowedActions.includes(action) && (action !== 'APPROVE' || this.evidenceIsClean());
  }

  previewProof(evidence: ManualPaymentEvidence): void {
    const detail = this.detail(); if (!detail || this.proofBusy()) return;
    this.clearProof(); this.proofBusy.set(true); this.proofError.set(null);
    this.api.getManualPaymentProof(detail.payment.paymentId, evidence.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const blob = response.body; this.proofBusy.set(false);
        if (!blob) { this.proofError.set('The evidence response was empty.'); return; }
        this.proofBlob = blob; this.objectUrl = URL.createObjectURL(blob);
        this.proofUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
        this.proofName.set(evidence.fileName); this.proofType.set(evidence.contentType);
      },
      error: (error) => { this.proofBusy.set(false); this.proofError.set(manualPaymentErrorMessage(error, this.apiError)); }
    });
  }

  downloadProof(): void {
    if (!this.objectUrl || !this.proofBlob) return;
    const anchor = document.createElement('a'); anchor.href = this.objectUrl; anchor.download = this.proofName() || 'payment-proof';
    anchor.rel = 'noopener'; anchor.click();
  }

  clearProof(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null; this.proofBlob = null; this.proofUrl.set(null); this.proofName.set(''); this.proofType.set('');
  }

  resendNotification(): void {
    const detail = this.detail(); if (!detail || !this.canManage() || this.notificationBusy()) return;
    if (!confirm('Queue an intentional payment notification resend?')) return;
    const type = ['AWAITING_PAYMENT', 'ACTION_REQUIRED'].includes(detail.payment.status) ? 'PAYMENT_REQUIRED'
      : ['PAYMENT_SUBMITTED', 'UNDER_REVIEW'].includes(detail.payment.status) ? 'SUBMISSION_RECEIVED' : 'REVIEW_OUTCOME';
    this.notificationBusy.set(true); this.actionError.set(null);
    this.api.resendManualPaymentNotification(detail.payment.paymentId, type, 'Platform Admin intentional resend', createCommandKey())
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (result) => { this.notificationBusy.set(false); this.message.set(`Payment notification ${titleCase(result.status)}.`); },
        error: (error) => { this.notificationBusy.set(false); this.actionError.set(manualPaymentErrorMessage(error, this.apiError)); }
      });
  }

  activateTenant(): void {
    const detail = this.detail();
    if (!detail?.activationEligible || !this.canActivateTenant() || this.activationBusy()) return;
    if (!confirm('Activate this tenant now? Payment approval, subscription, entitlements, and Tenant Admin membership will be validated by the server.')) return;
    this.activationBusy.set(true); this.actionError.set(null);
    this.tenants.activateTenant(detail.payment.tenantId, createCommandKey()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.activationBusy.set(false); this.message.set('Tenant activation completed. The invitation handoff is tracked separately.'); this.load(); },
      error: (error) => { this.activationBusy.set(false); this.actionError.set(manualPaymentErrorMessage(error, this.apiError)); }
    });
  }

  resendInvitation(): void {
    const detail = this.detail();
    if (!detail || !this.canResendInvitation() || !this.isActiveTenantStatus(detail.payment.tenantStatus) || this.invitationBusy()) return;
    if (!confirm('Queue a new Tenant Admin invitation? This is separate from payment notifications.')) return;
    this.invitationBusy.set(true); this.actionError.set(null);
    this.tenants.resendTenantAdminInvitation(detail.payment.tenantId, createCommandKey()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (operation) => { this.invitationBusy.set(false); this.message.set(`Tenant Admin invitation ${titleCase(operation.invitationStatus)}.`); this.load(); },
      error: (error) => { this.invitationBusy.set(false); this.actionError.set(manualPaymentErrorMessage(error, this.apiError)); }
    });
  }

  format(value: string | null | undefined): string { return titleCase(value); }

  isActiveTenantStatus(value: string | null | undefined): boolean {
    return normalizeTenantLifecycleStatus(value) === 'active';
  }

  private loadHistory(paymentId: string): void {
    this.api.getManualPaymentHistory(paymentId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (history) => this.detail.update((detail) => detail ? { ...detail, history: history.items } : detail),
      error: () => { /* detail response already contains the bounded history fallback */ }
    });
  }
}

function createCommandKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `command-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeTenantLifecycleStatus(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/-/g, '_');
}
