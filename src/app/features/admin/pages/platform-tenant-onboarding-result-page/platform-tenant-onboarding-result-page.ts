import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap, takeWhile, timer } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { ManualPaymentStatusBadge } from '../../components/manual-payment-status-badge/manual-payment-status-badge';
import { titleCase } from '../../mappers/manual-payment.mapper';
import { ManualPaymentDetail } from '../../models/manual-payment.model';
import { TenantOnboardingOperation } from '../../models/platform-tenant-onboarding.model';
import { PlatformTenantDetail } from '../../models/platform-tenant.model';
import { PlatformBillingApiService } from '../../services/platform-billing-api.service';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';

@Component({
  selector: 'app-platform-tenant-onboarding-result-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, ManualPaymentStatusBadge],
  templateUrl: './platform-tenant-onboarding-result-page.html',
  styleUrl: './platform-tenant-onboarding-result-page.scss'
})
export class PlatformTenantOnboardingResultPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tenants = inject(PlatformTenantApiService);
  private readonly billing = inject(PlatformBillingApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly access = inject(AccessControlService);
  private readonly destroyRef = inject(DestroyRef);
  private operationId = '';

  readonly operation = signal<TenantOnboardingOperation | null>(null);
  readonly payment = signal<ManualPaymentDetail | null>(null);
  readonly tenant = signal<PlatformTenantDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly projectionError = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly actionBusy = signal(false);

  readonly canViewBilling = computed(() => this.access.hasPermission(platformPermissions.billingView));
  readonly canManageBilling = computed(() => this.access.hasPermission(platformPermissions.billingManage));
  readonly canViewTenant = computed(() => this.access.hasPermission(platformPermissions.tenantsView));
  readonly canActivate = computed(() => this.access.hasPermission(platformPermissions.tenantsActivate));
  readonly canResendInvitation = computed(() => this.access.hasPermission(platformPermissions.tenantsUpdate));

  ngOnInit(): void {
    this.operationId = this.route.snapshot.paramMap.get('operationId') ?? '';
    if (!this.operationId) { this.loading.set(false); this.error.set('Operation reference is missing.'); return; }
    timer(0, 5000).pipe(
      switchMap(() => this.tenants.getOnboardingOperation(this.operationId)),
      takeWhile((op) => op.status === 'PROCESSING' || op.status === 'FAILED_RETRYABLE', true),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (op) => { this.setOperation(op); this.loading.set(false); },
      error: (error) => { this.error.set(this.apiError.toSafeMessage(error)); this.loading.set(false); }
    });
  }

  refresh(): void {
    this.loading.set(true); this.error.set(null); this.actionError.set(null);
    this.tenants.getOnboardingOperation(this.operationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (op) => { this.setOperation(op); this.loading.set(false); },
      error: (error) => { this.error.set(this.apiError.toSafeMessage(error)); this.loading.set(false); }
    });
  }

  retryOperation(): void {
    const op = this.operation();
    if (!op?.retryable || !this.canManageBilling() || this.actionBusy()) return;
    this.actionBusy.set(true); this.actionError.set(null);
    this.tenants.retryOnboardingOperation(op.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => { this.actionBusy.set(false); this.message.set('Eligible onboarding work was queued for retry.'); this.setOperation(updated); },
      error: (error) => { this.actionBusy.set(false); this.actionError.set(this.apiError.toSafeMessage(error)); }
    });
  }

  activateTenant(): void {
    const op = this.operation(); const payment = this.payment();
    if (!op || !payment?.activationEligible || !this.canActivate() || this.actionBusy()) return;
    if (!confirm('Activate this tenant? The server will validate payment, subscription, entitlements, and Tenant Admin membership.')) return;
    this.actionBusy.set(true); this.actionError.set(null);
    this.tenants.activateTenant(op.tenantId, createKey()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (tenant) => { this.actionBusy.set(false); this.tenant.set(tenant); this.message.set('Tenant activation completed; invitation status will refresh separately.'); this.refresh(); },
      error: (error) => { this.actionBusy.set(false); this.actionError.set(this.apiError.toSafeMessage(error)); }
    });
  }

  resendPaymentNotification(): void {
    const payment = this.payment();
    if (!payment || !this.canManageBilling() || this.actionBusy()) return;
    if (!confirm('Queue an intentional payment-required notification resend?')) return;
    this.actionBusy.set(true); this.actionError.set(null);
    this.billing.resendManualPaymentNotification(payment.payment.paymentId, 'PAYMENT_REQUIRED', 'Onboarding result resend', createKey())
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (result) => { this.actionBusy.set(false); this.message.set(`Payment notification ${titleCase(result.status)}.`); },
        error: (error) => { this.actionBusy.set(false); this.actionError.set(this.apiError.toSafeMessage(error)); }
      });
  }

  resendInvitation(): void {
    const op = this.operation();
    if (!op || !this.canResendInvitation() || !this.isActiveTenant() || this.actionBusy()) return;
    if (!confirm('Queue a new Tenant Admin invitation? No setup token will be displayed.')) return;
    this.actionBusy.set(true); this.actionError.set(null);
    this.tenants.resendTenantAdminInvitation(op.tenantId, createKey()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => { this.actionBusy.set(false); this.message.set(`Tenant Admin invitation ${titleCase(updated.invitationStatus)}.`); this.setOperation(updated); },
      error: (error) => { this.actionBusy.set(false); this.actionError.set(this.apiError.toSafeMessage(error)); }
    });
  }

  title(op: TenantOnboardingOperation): string {
    if (op.status.startsWith('FAILED')) return 'Tenant created — follow-up needs attention';
    if (this.normalizePaymentStatus(op.paymentStatus) === 'AWAITING_PAYMENT') return 'Tenant created — payment pending';
    if (this.normalizePaymentStatus(op.paymentStatus) === 'PAID' && !this.isActiveTenant()) return 'Payment approved — activation pending';
    if (this.isActiveTenant()) return 'Tenant active — setup handoff in progress';
    return 'Tenant onboarding status';
  }

  currentTenantStatus(): string { return this.tenant()?.status ?? this.payment()?.payment.tenantStatus ?? ''; }
  isActiveTenant(): boolean {
    if (normalizeTenantLifecycleStatus(this.currentTenantStatus()) === 'active') return true;
    // Invitation handoff is only reached after activation; use as fallback while tenant projection loads.
    const invite = (this.operation()?.invitationStatus ?? '').trim().toUpperCase();
    const paid = this.normalizePaymentStatus(this.operation()?.paymentStatus ?? '') === 'PAID';
    return paid && ['SENT', 'ACCEPTED', 'PENDING'].includes(invite);
  }
  normalizePaymentStatus(value: string): string { return value === 'PENDING' ? 'AWAITING_PAYMENT' : value; }
  format(value: string | null | undefined): string { return titleCase(value); }

  private setOperation(op: TenantOnboardingOperation): void {
    this.operation.set(op); this.loadProjections(op.tenantId);
  }

  private loadProjections(tenantId: string): void {
    this.projectionError.set(null);
    if (this.canViewBilling()) {
      this.billing.getTenantManualPaymentStatus(tenantId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (payment) => this.payment.set(payment),
        error: (error) => this.projectionError.set(this.apiError.toSafeMessage(error))
      });
    }
    if (this.canViewTenant()) {
      this.tenants.getTenantById(tenantId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (tenant) => this.tenant.set(tenant), error: () => undefined });
    }
  }
}

function createKey(): string { return globalThis.crypto?.randomUUID?.() ?? `onboarding-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

function normalizeTenantLifecycleStatus(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/-/g, '_');
}
