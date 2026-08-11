import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap, takeWhile, timer } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { ManualPaymentStatusBadge } from '../../components/manual-payment-status-badge/manual-payment-status-badge';
import { titleCase } from '../../mappers/manual-payment.mapper';
import { ManualPaymentDetail } from '../../models/manual-payment.model';
import { TenantOnboardingOperation } from '../../models/platform-tenant-onboarding.model';
import { PlatformTenantDetail } from '../../models/platform-tenant.model';
import { PlatformBillingApiService } from '../../services/platform-billing-api.service';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import {
  LifecycleNodeView,
  StatusPresentation,
  buildLifecycleNodes,
  buildStatusPresentation,
  isActiveTenantStatus,
  normalizePaymentStatus,
  paymentStateText,
  invitationStateText
} from './onboarding-operation-lifecycle';
import { OnboardingLifecyclePanel } from './onboarding-lifecycle-panel';

const POLL_INTERVAL_MS = 5000;
const LONG_RUNNING_MS = 2 * 60 * 1000;

type PageErrorKind = 'none' | 'missing-id' | 'not-found' | 'permission-denied' | 'fatal';
type ConfirmAction = 'activate' | 'resend-payment' | 'resend-invitation';

@Component({
  selector: 'app-platform-tenant-onboarding-result-page',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    PageHeader,
    Button,
    StatusBadge,
    LoadingSkeleton,
    ErrorState,
    ConfirmationDialog,
    ManualPaymentStatusBadge,
    OnboardingLifecyclePanel
  ],
  templateUrl: './platform-tenant-onboarding-result-page.html',
  styleUrl: './platform-tenant-onboarding-result-page.scss'
})
export class PlatformTenantOnboardingResultPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tenants = inject(PlatformTenantApiService);
  private readonly billing = inject(PlatformBillingApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly access = inject(AccessControlService);
  private readonly destroyRef = inject(DestroyRef);

  private operationId = '';
  private readonly processingStartedAt = signal<number | null>(null);
  private lastAnnouncedHeadline = '';

  readonly operation = signal<TenantOnboardingOperation | null>(null);
  readonly payment = signal<ManualPaymentDetail | null>(null);
  readonly tenant = signal<PlatformTenantDetail | null>(null);
  readonly initialLoading = signal(true);
  readonly refreshing = signal(false);
  readonly pollError = signal<string | null>(null);
  readonly pageErrorKind = signal<PageErrorKind>('none');
  readonly fatalError = signal<string | null>(null);
  readonly projectionError = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly actionBusy = signal(false);
  readonly statusAnnouncement = signal('');
  readonly confirmAction = signal<ConfirmAction | null>(null);
  readonly confirmOpen = signal(false);

  readonly canViewBilling = computed(() => this.access.hasPermission(platformPermissions.billingView));
  readonly canManageBilling = computed(() => this.access.hasPermission(platformPermissions.billingManage));
  readonly canViewTenant = computed(() => this.access.hasPermission(platformPermissions.tenantsView));
  readonly canActivate = computed(() => this.access.hasPermission(platformPermissions.tenantsActivate));
  readonly canResendInvitation = computed(() => this.access.hasPermission(platformPermissions.tenantsUpdate));

  readonly currentTenantStatus = computed(() => this.tenant()?.status ?? this.payment()?.payment.tenantStatus ?? '');
  readonly isActiveTenant = computed(() => isActiveTenantStatus(this.currentTenantStatus(), this.operation()));
  readonly isLongRunning = computed(() => {
    if (this.operation()?.status !== 'PROCESSING' || this.processingStartedAt() === null) {
      return false;
    }

    return Date.now() - this.processingStartedAt()! >= LONG_RUNNING_MS;
  });

  readonly lifecycleContext = computed(() => ({
    tenantStatus: this.currentTenantStatus(),
    isActiveTenant: this.isActiveTenant(),
    isLongRunning: this.isLongRunning()
  }));

  readonly statusPresentation = computed((): StatusPresentation | null => {
    const op = this.operation();
    if (!op) {
      return null;
    }

    return buildStatusPresentation(op, this.lifecycleContext());
  });

  readonly lifecycleNodes = computed((): LifecycleNodeView[] => {
    const op = this.operation();
    if (!op) {
      return [];
    }

    return buildLifecycleNodes(op, this.lifecycleContext());
  });

  readonly tenantName = computed(() => this.tenant()?.name ?? this.payment()?.payment?.tenantName ?? '');
  readonly tenantCode = computed(() => this.tenant()?.code ?? this.payment()?.payment?.tenantCode ?? '');
  readonly pageTitle = computed(() => {
    const view = this.statusPresentation()?.pageView;
    return view === 'running' || view === 'long-running' ? 'Creating Tenant' : 'Tenant Setup Status';
  });

  readonly showRetry = computed(() => {
    const op = this.operation();
    return !!op?.retryable && this.canManageBilling();
  });

  readonly showViewTenant = computed(() => !!this.operation()?.tenantId && this.canViewTenant());
  readonly showActivate = computed(() => {
    const op = this.operation();
    return !!op && !!this.payment()?.activationEligible && this.canActivate();
  });

  readonly showResendPayment = computed(() => {
    const op = this.operation();
    return !!op && !!this.payment() && this.canManageBilling()
      && normalizePaymentStatus(op.paymentStatus) !== 'PAID';
  });

  readonly showResendInvitation = computed(() => {
    const op = this.operation();
    return !!op && this.isActiveTenant() && this.canResendInvitation();
  });

  readonly showCreateAnother = computed(() => {
    const view = this.statusPresentation()?.pageView;
    return view === 'success' && this.access.hasPermission(platformPermissions.tenantsCreate);
  });

  ngOnInit(): void {
    this.operationId = this.route.snapshot.paramMap.get('operationId') ?? '';
    if (!this.operationId) {
      this.initialLoading.set(false);
      this.pageErrorKind.set('missing-id');
      this.fatalError.set('Operation reference is missing.');
      return;
    }

    this.startPolling();
  }

  refresh(): void {
    if (!this.operationId || this.refreshing() || this.actionBusy()) {
      return;
    }

    this.refreshing.set(true);
    this.pollError.set(null);
    this.actionError.set(null);
    this.pageErrorKind.set('none');
    this.fatalError.set(null);

    this.tenants.getOnboardingOperation(this.operationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (op) => {
        this.refreshing.set(false);
        this.setOperation(op);
      },
      error: (error) => this.handleRequestError(error, true)
    });
  }

  retryOperation(): void {
    const op = this.operation();
    if (!op?.retryable || !this.canManageBilling() || this.actionBusy()) {
      return;
    }

    this.actionBusy.set(true);
    this.actionError.set(null);
    this.tenants.retryOnboardingOperation(op.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.actionBusy.set(false);
        this.message.set('Eligible onboarding work was queued for retry.');
        this.setOperation(updated);
      },
      error: (error) => {
        this.actionBusy.set(false);
        this.actionError.set(this.apiError.toSafeMessage(error));
      }
    });
  }

  openActivateConfirm(): void {
    this.confirmAction.set('activate');
    this.confirmOpen.set(true);
  }

  openResendPaymentConfirm(): void {
    this.confirmAction.set('resend-payment');
    this.confirmOpen.set(true);
  }

  openResendInvitationConfirm(): void {
    this.confirmAction.set('resend-invitation');
    this.confirmOpen.set(true);
  }

  onConfirmDialog(confirmed: boolean): void {
    const action = this.confirmAction();
    this.confirmOpen.set(false);
    this.confirmAction.set(null);
    if (!confirmed || !action) {
      return;
    }

    if (action === 'activate') {
      this.activateTenant();
    } else if (action === 'resend-payment') {
      this.resendPaymentNotification();
    } else if (action === 'resend-invitation') {
      this.resendInvitation();
    }
  }

  confirmTitle(): string {
    const action = this.confirmAction();
    if (action === 'activate') return 'Activate tenant';
    if (action === 'resend-payment') return 'Resend payment notification';
    return 'Resend Tenant Admin invitation';
  }

  confirmMessage(): string {
    const action = this.confirmAction();
    if (action === 'activate') {
      return 'Activate this tenant? The server will validate payment, subscription, entitlements, and Tenant Admin membership.';
    }
    if (action === 'resend-payment') {
      return 'Queue an intentional payment-required notification resend?';
    }
    return 'Queue a new Tenant Admin invitation? No setup token will be displayed.';
  }

  normalizePaymentStatus(value: string): string {
    return normalizePaymentStatus(value);
  }

  paymentStatusLabel(value: string): string {
    return paymentStateText(value);
  }

  invitationStatusLabel(value: string): string {
    return invitationStateText(value);
  }

  navigateToTenants(): void {
    this.router.navigate(['/admin/tenants']);
  }

  navigateToTenant(tenantId: string): void {
    this.router.navigate(['/admin/tenants', tenantId]);
  }

  navigateToCreateTenant(): void {
    this.router.navigate(['/admin/tenants/create']);
  }

  format(value: string | null | undefined): string {
    return titleCase(value);
  }

  private startPolling(): void {
    timer(0, POLL_INTERVAL_MS).pipe(
      switchMap(() => this.tenants.getOnboardingOperation(this.operationId)),
      takeWhile((op) => op.status === 'PROCESSING' || op.status === 'FAILED_RETRYABLE', true),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (op) => {
        this.initialLoading.set(false);
        this.refreshing.set(false);
        this.setOperation(op);
      },
      error: (error) => this.handleRequestError(error, !!this.operation())
    });
  }

  private activateTenant(): void {
    const op = this.operation();
    const payment = this.payment();
    if (!op || !payment?.activationEligible || !this.canActivate() || this.actionBusy()) {
      return;
    }

    this.actionBusy.set(true);
    this.actionError.set(null);
    this.tenants.activateTenant(op.tenantId, createKey()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (tenant) => {
        this.actionBusy.set(false);
        this.tenant.set(tenant);
        this.message.set('Tenant activation completed; invitation status will refresh separately.');
        this.refresh();
      },
      error: (error) => {
        this.actionBusy.set(false);
        this.actionError.set(this.apiError.toSafeMessage(error));
      }
    });
  }

  private resendPaymentNotification(): void {
    const payment = this.payment();
    if (!payment || !this.canManageBilling() || this.actionBusy()) {
      return;
    }

    this.actionBusy.set(true);
    this.actionError.set(null);
    this.billing.resendManualPaymentNotification(
      payment.payment.paymentId,
      'PAYMENT_REQUIRED',
      'Onboarding result resend',
      createKey()
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.actionBusy.set(false);
        this.message.set(`Payment notification ${titleCase(result.status)}.`);
      },
      error: (error) => {
        this.actionBusy.set(false);
        this.actionError.set(this.apiError.toSafeMessage(error));
      }
    });
  }

  private resendInvitation(): void {
    const op = this.operation();
    if (!op || !this.canResendInvitation() || !this.isActiveTenant() || this.actionBusy()) {
      return;
    }

    this.actionBusy.set(true);
    this.actionError.set(null);
    this.tenants.resendTenantAdminInvitation(op.tenantId, createKey()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.actionBusy.set(false);
        this.message.set(`Tenant Admin invitation ${titleCase(updated.invitationStatus)}.`);
        this.setOperation(updated);
      },
      error: (error) => {
        this.actionBusy.set(false);
        this.actionError.set(this.apiError.toSafeMessage(error));
      }
    });
  }

  private setOperation(op: TenantOnboardingOperation): void {
    if (op.status === 'PROCESSING' && this.processingStartedAt() === null) {
      this.processingStartedAt.set(Date.now());
    }

    if (op.status !== 'PROCESSING') {
      this.processingStartedAt.set(null);
    }

    this.operation.set(op);
    this.announceIfChanged();
    this.loadProjections(op.tenantId);
  }

  private announceIfChanged(): void {
    const headline = this.statusPresentation()?.headline ?? '';
    if (headline && headline !== this.lastAnnouncedHeadline) {
      this.lastAnnouncedHeadline = headline;
      this.statusAnnouncement.set(headline);
    }
  }

  private handleRequestError(error: unknown, hadOperation: boolean): void {
    this.initialLoading.set(false);
    this.refreshing.set(false);

    if (hadOperation) {
      this.pollError.set(this.apiError.toSafeMessage(error));
      return;
    }

    const status = error instanceof HttpErrorResponse ? error.status : 0;
    if (status === 404) {
      this.pageErrorKind.set('not-found');
    } else if (status === 403) {
      this.pageErrorKind.set('permission-denied');
    } else {
      this.pageErrorKind.set('fatal');
    }

    this.fatalError.set(this.apiError.toSafeMessage(error));
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
      this.tenants.getTenantById(tenantId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (tenant) => this.tenant.set(tenant),
        error: () => undefined
      });
    }
  }
}

function createKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `onboarding-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export { POLL_INTERVAL_MS, LONG_RUNNING_MS };
