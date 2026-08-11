import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, Subject, switchMap } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import {
  SubscriptionPlanListItem,
  SubscriptionPlanListResponse
} from '../../models/platform-subscription-plan.model';
import {
  subscriptionPlanStatusFilterToApiValue,
  subscriptionPlanStatusLabel,
  subscriptionPlanStatusVariant
} from '../../models/subscription-plan-status.util';
import { PlatformSubscriptionPlanApiService } from '../../services/platform-subscription-plan-api.service';

@Component({
  selector: 'app-platform-subscription-plans-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    PageHeader,
    Button,
    StatusBadge,
    LoadingSkeleton,
    EmptyState,
    ErrorState
  ],
  templateUrl: './platform-subscription-plans-page.html',
  styleUrl: './platform-subscription-plans-page.scss'
})
export class PlatformSubscriptionPlansPage {
  private readonly api = inject(PlatformSubscriptionPlanApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly accessControl = inject(AccessControlService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  private readonly searchChanges$ = new Subject<string>();
  private readonly reload$ = new Subject<void>();

  readonly createPlanRoute = '/admin/subscriptions/create';
  readonly canCreate = this.accessControl.hasPermission(platformPermissions.subscriptionPlansCreate);

  readonly planList = signal<SubscriptionPlanListResponse | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly statusFilter = signal('');
  readonly billingCycleFilter = signal('');
  readonly pageNumber = signal(1);
  readonly pageSize = 10;
  readonly successMessage = signal<string | null>(null);

  readonly hasActiveFilters = computed(
    () =>
      !!this.searchTerm().trim() ||
      !!this.statusFilter() ||
      !!this.billingCycleFilter()
  );

  readonly emptyTitle = computed(() =>
    this.hasActiveFilters() ? 'No matching plans' : 'No subscription plans yet'
  );

  readonly emptyMessage = computed(() =>
    this.hasActiveFilters()
      ? 'No plans match your current search or filters.'
      : 'Create a plan to define commercial terms and entitlements for tenant onboarding.'
  );

  constructor() {
    const navigationState =
      this.router.currentNavigation()?.extras.state ??
      (history.state as { successMessage?: string } | null);

    if (navigationState?.successMessage) {
      this.successMessage.set(navigationState.successMessage);
      history.replaceState({}, '');
    }

    this.searchChanges$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.pageNumber.set(1);
        this.reload$.next();
      });

    this.reload$
      .pipe(
        switchMap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);

          return this.api
            .getSubscriptionPlans({
              pageNumber: this.pageNumber(),
              pageSize: this.pageSize,
              search: this.searchTerm().trim() || undefined,
              status: this.statusFilter()
                ? subscriptionPlanStatusFilterToApiValue(this.statusFilter())
                : undefined,
              billingCycle: this.billingCycleFilter() || undefined,
              sortBy: 'updatedAt',
              sortDirection: 'desc'
            })
            .pipe(
              catchError((error) => {
                this.errorMessage.set(this.apiError.toSafeMessage(error));
                this.planList.set(null);
                this.isLoading.set(false);
                return EMPTY;
              })
            );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        this.planList.set(response);
        this.isLoading.set(false);
      });

    this.reload$.next();
  }

  onSearchChange(value: string): void {
    this.searchChanges$.next(value);
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.pageNumber.set(1);
    this.reload$.next();
  }

  onBillingCycleChange(value: string): void {
    this.billingCycleFilter.set(value);
    this.pageNumber.set(1);
    this.reload$.next();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('');
    this.billingCycleFilter.set('');
    this.pageNumber.set(1);
    this.reload$.next();
  }

  reload(): void {
    this.reload$.next();
  }

  goToPage(page: number): void {
    this.pageNumber.set(page);
    this.reload$.next();
  }

  viewRoute(plan: SubscriptionPlanListItem): (string | number)[] {
    return ['/admin/subscriptions', plan.id];
  }

  statusLabel(status: string): string {
    return subscriptionPlanStatusLabel(status);
  }

  statusVariant(status: string): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
    return subscriptionPlanStatusVariant(status);
  }

  formatCommercialTerm(plan: SubscriptionPlanListItem): string {
    const price = plan.tenantMonthlyPrice ?? plan.tenantAnnualPrice;
    if (price == null) {
      return '—';
    }

    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: plan.currencyCode || 'USD',
        minimumFractionDigits: 2
      }).format(price);
    } catch {
      return `${price} ${plan.currencyCode || ''}`.trim();
    }
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

  rangeLabel(list: SubscriptionPlanListResponse): string {
    if (list.totalItems === 0) {
      return 'Showing 0 plans';
    }

    const start = (list.pageNumber - 1) * list.pageSize + 1;
    const end = Math.min(list.pageNumber * list.pageSize, list.totalItems);
    return `Showing ${start} to ${end} of ${list.totalItems} plans`;
  }

  pageNumbers(list: SubscriptionPlanListResponse): number[] {
    const total = Math.max(list.totalPages, 1);
    const current = list.pageNumber;
    const windowSize = 5;
    const start = Math.max(1, Math.min(current - 2, total - windowSize + 1));
    const end = Math.min(total, start + windowSize - 1);
    const adjustedStart = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }
}
