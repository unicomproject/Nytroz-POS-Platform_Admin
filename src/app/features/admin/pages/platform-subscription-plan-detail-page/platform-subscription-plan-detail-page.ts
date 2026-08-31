import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Observable, switchMap } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { BreadcrumbItem, PageHeader } from '../../../../shared/components/page-header/page-header';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { SubscriptionPlanDetail } from '../../models/platform-subscription-plan.model';
import {
  normalizeSubscriptionPlanStatus,
  subscriptionPlanStatusLabel,
  subscriptionPlanStatusVariant
} from '../../models/subscription-plan-status.util';
import { PlatformSubscriptionPlanApiService } from '../../services/platform-subscription-plan-api.service';

type DetailState = 'loading' | 'ready' | 'not-found' | 'forbidden' | 'error';
type ConfirmKind = 'publish' | 'duplicate' | 'retire' | 'reactivate' | 'delete';

@Component({
  selector: 'app-platform-subscription-plan-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    PageHeader,
    Button,
    StatusBadge,
    LoadingSkeleton,
    ErrorState,
    ConfirmationDialog
  ],
  templateUrl: './platform-subscription-plan-detail-page.html',
  styleUrl: './platform-subscription-plan-detail-page.scss'
})
export class PlatformSubscriptionPlanDetailPage {
  private readonly api = inject(PlatformSubscriptionPlanApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly accessControl = inject(AccessControlService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<DetailState>('loading');
  readonly plan = signal<SubscriptionPlanDetail | null>(null);
  readonly errorMessage = signal('Something went wrong. Please try again.');
  readonly actionError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isActionPending = signal(false);
  readonly confirmOpen = signal(false);
  readonly confirmKind = signal<ConfirmKind | null>(null);

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const plan = this.plan();
    return [
      { label: 'Subscription Plans', path: '/admin/subscriptions' },
      { label: plan?.planName ?? 'Plan' }
    ];
  });

  readonly headerDescription = computed(() => {
    const plan = this.plan();
    if (!plan) {
      return undefined;
    }
    return plan.description?.trim() || `Plan code ${plan.planCode}`;
  });

  readonly identityTone = computed(() => {
    return normalizeSubscriptionPlanStatus(this.plan()?.status) ?? 'draft';
  });

  readonly confirmTitle = computed(() => {
    switch (this.confirmKind()) {
      case 'publish':
        return 'Publish this plan?';
      case 'duplicate':
        return 'Duplicate this plan?';
      case 'retire':
        return 'Retire this plan?';
      case 'reactivate':
        return 'Reactivate this plan?';
      case 'delete':
        return 'Delete draft plan?';
      default:
        return 'Confirm action';
    }
  });

  readonly confirmMessage = computed(() => {
    const plan = this.plan();
    const name = plan?.planName ?? 'this plan';
    switch (this.confirmKind()) {
      case 'publish':
        return `Publish "${name}"? It will become available for new tenant assignments.`;
      case 'duplicate':
        return `Duplicate "${name}" as a new draft plan?`;
      case 'retire':
        return `"${name}" will no longer be available for new assignments. This does not delete existing tenant relationships.`;
      case 'reactivate':
        return `Reactivate "${name}" so it can be assigned to new tenants again?`;
      case 'delete':
        return `Delete draft plan "${name}"? This cannot be undone.`;
      default:
        return 'Are you sure you want to continue?';
    }
  });

  readonly confirmLabel = computed(() => {
    switch (this.confirmKind()) {
      case 'publish':
        return 'Publish';
      case 'duplicate':
        return 'Duplicate';
      case 'retire':
        return 'Retire';
      case 'reactivate':
        return 'Reactivate';
      case 'delete':
        return 'Delete draft';
      default:
        return 'Confirm';
    }
  });

  readonly confirmVariant = computed<'default' | 'destructive'>(() => {
    const kind = this.confirmKind();
    return kind === 'delete' || kind === 'retire' ? 'destructive' : 'default';
  });

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => this.load(params.get('planId'))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (plan) => this.showPlan(plan),
        error: (error) => this.showLoadError(error)
      });
  }

  reload(): void {
    const planId = this.route.snapshot.paramMap.get('planId');
    this.load(planId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plan) => this.showPlan(plan),
        error: (error) => this.showLoadError(error)
      });
  }

  canEdit(plan: SubscriptionPlanDetail): boolean {
    return plan.canEdit && this.accessControl.hasPermission(platformPermissions.subscriptionPlansEdit);
  }

  canPublish(plan: SubscriptionPlanDetail): boolean {
    return plan.status === 'draft' && this.canEdit(plan);
  }

  canDuplicate(plan: SubscriptionPlanDetail): boolean {
    return (
      plan.canDuplicate &&
      this.accessControl.hasPermission(platformPermissions.subscriptionPlansDuplicate)
    );
  }

  canRetire(plan: SubscriptionPlanDetail): boolean {
    return (
      plan.status === 'active' &&
      plan.canArchive &&
      this.accessControl.hasPermission(platformPermissions.subscriptionPlansArchive)
    );
  }

  canReactivate(plan: SubscriptionPlanDetail): boolean {
    return (
      plan.status === 'retired' &&
      plan.canReactivate &&
      this.accessControl.hasPermission(platformPermissions.subscriptionPlansArchive)
    );
  }

  canDelete(plan: SubscriptionPlanDetail): boolean {
    return (
      plan.status === 'draft' &&
      plan.canDelete &&
      this.accessControl.hasPermission(platformPermissions.subscriptionPlansDelete)
    );
  }

  edit(plan: SubscriptionPlanDetail): void {
    if (!this.canEdit(plan) || this.isActionPending()) {
      return;
    }

    void this.router.navigate(['/admin/subscriptions', plan.id, 'edit']);
  }

  requestPublish(plan: SubscriptionPlanDetail): void {
    if (!this.canPublish(plan) || this.isActionPending()) {
      return;
    }
    this.openConfirm('publish');
  }

  requestDuplicate(plan: SubscriptionPlanDetail): void {
    if (!this.canDuplicate(plan) || this.isActionPending()) {
      return;
    }
    this.openConfirm('duplicate');
  }

  requestRetire(plan: SubscriptionPlanDetail): void {
    if (!this.canRetire(plan) || this.isActionPending()) {
      return;
    }
    this.openConfirm('retire');
  }

  requestReactivate(plan: SubscriptionPlanDetail): void {
    if (!this.canReactivate(plan) || this.isActionPending()) {
      return;
    }
    this.openConfirm('reactivate');
  }

  requestDelete(plan: SubscriptionPlanDetail): void {
    if (!this.canDelete(plan) || this.isActionPending()) {
      return;
    }
    this.openConfirm('delete');
  }

  cancelConfirm(): void {
    if (this.isActionPending()) {
      return;
    }
    this.confirmOpen.set(false);
    this.confirmKind.set(null);
  }

  confirmPending(): void {
    const kind = this.confirmKind();
    const plan = this.plan();
    if (!kind || !plan || this.isActionPending()) {
      return;
    }

    switch (kind) {
      case 'publish':
        this.runMutation(this.api.publishSubscriptionPlan(plan.id), 'Subscription plan published successfully.');
        break;
      case 'duplicate':
        this.beginAction();
        this.api
          .duplicateSubscriptionPlan(plan.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (duplicated) => {
              this.isActionPending.set(false);
              this.confirmOpen.set(false);
              this.confirmKind.set(null);
              this.router.navigate(['/admin/subscriptions', duplicated.id]);
            },
            error: (error) => this.showActionError(error)
          });
        break;
      case 'retire':
        this.runMutation(this.api.archiveSubscriptionPlan(plan.id), 'Subscription plan retired successfully.');
        break;
      case 'reactivate':
        this.runMutation(
          this.api.reactivateSubscriptionPlan(plan.id),
          'Subscription plan reactivated successfully.'
        );
        break;
      case 'delete':
        this.beginAction();
        this.api
          .deleteDraftSubscriptionPlan(plan.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.isActionPending.set(false);
              this.confirmOpen.set(false);
              this.confirmKind.set(null);
              this.router.navigate(['/admin/subscriptions']);
            },
            error: (error) => this.showActionError(error)
          });
        break;
    }
  }

  statusLabel(status: string): string {
    return subscriptionPlanStatusLabel(status);
  }

  statusVariant(status: string): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
    return subscriptionPlanStatusVariant(status);
  }

  billingCycleLabel(value: string): string {
    switch (value?.trim().toLowerCase()) {
      case 'monthly':
        return 'Monthly';
      case 'yearly':
      case 'annual':
        return 'Annual';
      case 'one_time':
        return 'One-time';
      default:
        return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '—';
    }
  }

  formatPrice(value: number, currency: string): string {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency || 'USD'
      }).format(value);
    } catch {
      return `${value} ${currency || ''}`.trim();
    }
  }

  formatLimit(value: number | null, isUnlimited: boolean, unitCode: string | null): string {
    if (isUnlimited) {
      return 'Unlimited';
    }
    if (value == null) {
      return 'Not set';
    }
    return `${new Intl.NumberFormat().format(value)}${unitCode ? ` ${unitCode}` : ''}`;
  }

  private openConfirm(kind: ConfirmKind): void {
    this.actionError.set(null);
    this.confirmKind.set(kind);
    this.confirmOpen.set(true);
  }

  private load(planId: string | null): Observable<SubscriptionPlanDetail> {
    this.state.set('loading');
    this.plan.set(null);
    this.actionError.set(null);
    this.successMessage.set(null);
    this.confirmOpen.set(false);
    this.confirmKind.set(null);

    if (!planId || !isUuid(planId)) {
      this.state.set('not-found');
      return EMPTY;
    }

    return this.api.getSubscriptionPlanDetail(planId);
  }

  private showPlan(plan: SubscriptionPlanDetail): void {
    this.plan.set(plan);
    this.state.set('ready');
  }

  private showLoadError(error: unknown): void {
    this.plan.set(null);
    if (error instanceof HttpErrorResponse && error.status === 404) {
      this.state.set('not-found');
    } else if (error instanceof HttpErrorResponse && error.status === 403) {
      this.state.set('forbidden');
    } else {
      this.errorMessage.set(this.apiError.toSafeMessage(error));
      this.state.set('error');
    }
  }

  private runMutation(request: Observable<unknown>, message: string): void {
    this.beginAction();
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isActionPending.set(false);
        this.confirmOpen.set(false);
        this.confirmKind.set(null);
        this.successMessage.set(message);
        this.reload();
      },
      error: (error) => this.showActionError(error)
    });
  }

  private beginAction(): void {
    this.isActionPending.set(true);
    this.actionError.set(null);
    this.successMessage.set(null);
  }

  private showActionError(error: unknown): void {
    this.isActionPending.set(false);
    this.actionError.set(this.apiError.toSafeMessage(error));
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
