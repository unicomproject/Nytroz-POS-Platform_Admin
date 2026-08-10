import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { TENANT_LIFECYCLE_FILTER_OPTIONS } from '../../constants/tenant-lifecycle-status.constants';
import {
  PlatformTenantFilterOptions,
  PlatformTenantListQuery,
  PlatformTenantListResponse,
  PlatformTenantSummary
} from '../../models/platform-tenant.model';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import { PlatformTenantSearchService } from '../../services/platform-tenant-search.service';
import { tenantLifecycleBadgeClass, tenantLifecycleLabel } from '../../utils/tenant-lifecycle.util';

import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-platform-tenant-list-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    PageHeader,
    Button,
    StatusBadge,
    LoadingSkeleton,
    ErrorState,
    EmptyState
  ],
  template: `
    <section class="tenant-list-page">
      <app-page-header title="Tenant Management" description="Manage tenant organisations, subscription context, setup progress, and platform access.">
        <app-button variant="primary" routerLink="/admin/tenants/create">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="btn-icon"><path d="M12 5v14M5 12h14" /></svg>
          Create Tenant
        </app-button>
      </app-page-header>

      @if (summary(); as summaryData) {
        <section class="kpi-grid">
          <article class="kpi-card">
            <span class="kpi-icon blue" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /></svg>
            </span>
            <div class="kpi-body">
              <span class="kpi-label">Total Tenants</span>
              <strong class="kpi-value">{{ summaryData.totalTenants }}</strong>
              <small class="kpi-meta neutral">All platform tenants</small>
            </div>
          </article>
          <article class="kpi-card">
            <span class="kpi-icon green" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /><path d="M10 12l2 2 4-4" /></svg>
            </span>
            <div class="kpi-body">
              <span class="kpi-label">Active Tenants</span>
              <strong class="kpi-value">{{ summaryData.activeTenants }}</strong>
              <small class="kpi-meta">{{ percent(summaryData.activeTenants, summaryData.totalTenants) }}</small>
            </div>
          </article>
          <article class="kpi-card">
            <span class="kpi-icon orange" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /><path d="M12 9v4M12 17h.01" /></svg>
            </span>
            <div class="kpi-body">
              <span class="kpi-label">Suspended Tenants</span>
              <strong class="kpi-value">{{ summaryData.suspendedTenants }}</strong>
              <small class="kpi-meta">{{ percent(summaryData.suspendedTenants, summaryData.totalTenants) }}</small>
            </div>
          </article>
          <article class="kpi-card">
            <span class="kpi-icon red" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /><path d="M12 9v4M12 17h.01" /></svg>
            </span>
            <div class="kpi-body">
              <span class="kpi-label">Pending Activation</span>
              <strong class="kpi-value">{{ pendingActivationLabel(summaryData) }}</strong>
              <small class="kpi-meta">{{ pendingActivationMeta(summaryData) }}</small>
            </div>
          </article>
          <article class="kpi-card">
            <span class="kpi-icon violet" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
            </span>
            <div class="kpi-body">
              <span class="kpi-label">Trial Tenants</span>
              <strong class="kpi-value">{{ summaryData.trialTenants }}</strong>
              <small class="kpi-meta">{{ percent(summaryData.trialTenants, summaryData.totalTenants) }}</small>
            </div>
          </article>
        </section>
      }

      <section class="filter-bar-container">
        <label class="filter-field search-field">
          <span class="field-label">Search</span>
          <span class="input-wrap">
            <input
              type="search"
              placeholder="Search tenants..."
              [ngModel]="tenantSearch.searchTerm()"
              (ngModelChange)="onSearchChange($event)"
            />
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          </span>
        </label>
        <label class="filter-field">
          <span class="field-label">Status</span>
          <select [ngModel]="statusFilter()" (ngModelChange)="onStatusChange($event)">
            <option value="">All Status</option>
            @for (status of lifecycleFilterOptions; track status.value) {
              <option [value]="status.value">{{ status.label }}</option>
            }
          </select>
        </label>
        @if (hasSubscriptionViewPermission()) {
          <label class="filter-field">
            <span class="field-label">Plan</span>
            <select [ngModel]="planFilter()" (ngModelChange)="onPlanChange($event)">
              <option value="">All Plans</option>
              @for (plan of filterOptions().plans; track plan.id) {
                <option [value]="plan.id">{{ plan.name }}</option>
              }
            </select>
          </label>
        }
        <div class="filter-actions">
          <app-button variant="secondary" size="compact" (click)="resetFilters()">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="btn-icon"><path d="M3 12a9 9 0 0115.5-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15.5 6.7L3 16M3 21v-5h5" /></svg>
            Reset
          </app-button>
        </div>
      </section>

      @if (isLoading()) {
        <div class="skeleton-container card">
          <span class="sr-only">Loading tenant data</span>
          <app-loading-skeleton [rows]="5" [avatar]="true" />
        </div>
      } @else if (errorMessage()) {
        <app-error-state
          title="Tenant list could not be loaded"
          [message]="errorMessage()!"
          [hasRetry]="true"
          (retry)="loadPage()"
        />
      } @else if (tenantList(); as list) {
        @if (list.items.length) {
          <section class="table-card card">
            <div class="data-table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    @if (hasSubscriptionViewPermission()) {
                      <th>Plan</th>
                    }
                    <th>Status</th>
                    <th>Setup</th>
                    <th>Users</th>
                    <th>Outlets</th>
                    <th>Created On</th>
                    <th>Last Activity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (tenant of list.items; track tenant.id) {
                    <tr class="tenant-row" [routerLink]="['/admin/tenants', tenant.id]" tabindex="0">
                      <td>
                        <div class="tenant-cell">
                          <span class="avatar" [style.background]="avatarColor(tenant.name)">{{ initials(tenant.name) }}</span>
                          <span class="tenant-meta">
                            <strong>{{ tenant.name }}</strong>
                            <small>{{ tenant.code }}</small>
                          </span>
                        </div>
                      </td>
                      @if (hasSubscriptionViewPermission()) {
                        <td class="cell-text">{{ tenant.planName || '—' }}</td>
                      }
                      <td>
                        <app-status-badge [variant]="mapStatusVariant(statusClass(tenant))">
                          {{ statusLabel(tenant) }}
                        </app-status-badge>
                      </td>
                      <td class="cell-text">
                        @if (tenant.setupProgressPercent != null) {
                          <div class="setup-cell">
                            <strong>{{ tenant.setupProgressPercent }}%</strong>
                            @if (tenant.continueSetupPath) {
                              <a class="actions-link" [routerLink]="tenant.continueSetupPath" (click)="$event.stopPropagation()">Continue Setup</a>
                            }
                          </div>
                        } @else {
                          <span class="cell-muted">—</span>
                        }
                      </td>
                      <td class="cell-num">{{ tenant.userCount }}</td>
                      <td class="cell-num">{{ tenant.outletCount }}</td>
                      <td class="cell-text">{{ tenant.createdOn | date: 'mediumDate' }}</td>
                      <td>
                        @if (tenant.lastActivityAt) {
                          <span class="activity" [class.muted]="!isRecentActivity(tenant.lastActivityAt)">
                            <i [class.recent]="isRecentActivity(tenant.lastActivityAt)"></i>
                            {{ relativeTime(tenant.lastActivityAt) }}
                          </span>
                        } @else {
                          <span class="cell-muted">—</span>
                        }
                      </td>
                      <td>
                        <app-button variant="ghost" size="compact" [routerLink]="['/admin/tenants', tenant.id]" (click)="$event.stopPropagation()">
                          View
                        </app-button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <footer class="pagination">
            <span class="range-label">{{ rangeLabel(list) }}</span>
            <div class="pagination-controls">
              <app-button variant="secondary" size="compact" [disabled]="list.pageNumber <= 1" (click)="goToPage(list.pageNumber - 1)" aria-label="Previous page">
                ‹
              </app-button>
              @for (page of pageNumbers(list); track page) {
                <app-button
                  variant="secondary"
                  size="compact"
                  [class.active]="page === list.pageNumber"
                  (click)="goToPage(page)"
                >
                  {{ page }}
                </app-button>
              }
              <app-button
                variant="secondary"
                size="compact"
                [disabled]="list.pageNumber >= list.totalPages"
                (click)="goToPage(list.pageNumber + 1)"
                aria-label="Next page"
              >
                ›
              </app-button>
            </div>
          </footer>
        } @else {
          <app-empty-state
            title="No tenants found"
            message="No tenants match the current filters"
          >
            <app-button variant="secondary" (click)="resetFilters()">Reset Filters</app-button>
          </app-empty-state>
        }
      }
    </section>
  `,
  styles: `
    :host {
      color: var(--text-primary, #0f172a);
      display: block;
    }

    * {
      box-sizing: border-box;
    }

    .tenant-list-page {
      display: grid;
      gap: var(--space-4, 1rem);
    }

    .btn-icon {
      height: 1rem;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
      fill: none;
      width: 1rem;
    }

    .card {
      background: var(--bg-surface-primary, #fff);
      border: 1px solid var(--border-default, #e5eaf2);
      border-radius: var(--radius-lg, 12px);
      box-shadow: var(--shadow-sm);
    }

    .kpi-grid {
      display: grid;
      gap: var(--space-3, 0.75rem);
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }

    .kpi-card {
      align-items: flex-start;
      background: var(--bg-surface-primary, #fff);
      border: 1px solid var(--border-default, #e5eaf2);
      border-radius: var(--radius-lg, 12px);
      box-shadow: var(--shadow-sm);
      display: flex;
      gap: var(--space-3, 0.75rem);
      min-height: 7.5rem;
      padding: 1.1rem 1rem;
    }

    .kpi-icon {
      align-items: center;
      border-radius: 50%;
      display: flex;
      flex-shrink: 0;
      height: 2.85rem;
      justify-content: center;
      width: 2.85rem;
    }

    .kpi-icon svg {
      height: 1.25rem;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.75;
      fill: none;
      width: 1.25rem;
    }

    .kpi-icon.blue { background: var(--status-info-bg, #eaf2ff); color: var(--status-info-text, #1768e5); }
    .kpi-icon.green { background: var(--status-success-bg, #e8f8ed); color: var(--status-success-text, #18a44b); }
    .kpi-icon.orange { background: var(--status-warning-bg, #fff1e6); color: var(--status-warning-text, #f97316); }
    .kpi-icon.red { background: var(--status-danger-bg, #fef2f2); color: var(--status-danger-text, #ef4444); }
    .kpi-icon.violet { background: #f0eaff; color: #7047eb; }

    .kpi-body {
      display: grid;
      gap: 0.2rem;
      min-width: 0;
    }

    .kpi-label {
      color: var(--text-secondary, #475569);
      font-size: 0.76rem;
      font-weight: 600;
    }

    .kpi-value {
      color: var(--text-primary, #0f172a);
      font-size: clamp(1.35rem, 2vw, 1.65rem);
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }

    .kpi-meta {
      color: var(--text-secondary, #475569);
      font-size: 0.72rem;
      font-weight: 600;
    }

    .kpi-meta.neutral {
      color: var(--text-muted, #64748b);
    }

    .filter-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1, 0.25rem);
      min-width: 12rem;
    }

    .search-field {
      flex: 1.5;
      min-width: 16rem;
    }

    .field-label {
      color: var(--text-muted, #64748b);
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .input-wrap {
      position: relative;
      width: 100%;
    }

    .input-wrap input,
    .filter-field select {
      background: var(--bg-surface-primary, #fff);
      border: 1px solid var(--border-default, #e2e8f0);
      border-radius: var(--radius-md, 8px);
      color: var(--text-primary, #0f172a);
      font-size: 0.875rem;
      min-height: var(--control-height-default, 2.5rem);
      padding: 0 var(--space-3, 0.75rem);
      width: 100%;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .input-wrap input {
      padding-right: 2.25rem;
    }

    .input-wrap input::placeholder {
      color: var(--text-muted, #94a3b8);
    }

    .input-wrap input:focus,
    .filter-field select:focus {
      border-color: var(--border-focus, #0b5cff);
      box-shadow: var(--shadow-focus);
      outline: none;
    }

    .input-wrap svg {
      color: var(--text-muted, #94a3b8);
      height: 1rem;
      pointer-events: none;
      position: absolute;
      right: 0.75rem;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-width: 2;
      fill: none;
      top: 50%;
      transform: translateY(-50%);
      width: 1rem;
    }

    .filter-actions {
      align-self: flex-end;
      display: flex;
      gap: var(--space-2, 0.5rem);
    }

    .table-card {
      overflow: hidden;
      padding: 0;
    }

    .tenant-row {
      cursor: pointer;
    }

    .tenant-row:focus-visible {
      outline: 2px solid var(--border-focus, #0b5cff);
      outline-offset: -2px;
    }

    .tenant-cell {
      align-items: center;
      display: flex;
      gap: var(--space-3, 0.75rem);
      min-width: 15rem;
    }

    .avatar {
      align-items: center;
      border-radius: 50%;
      color: #fff;
      display: flex;
      flex-shrink: 0;
      font-size: 0.75rem;
      font-weight: 800;
      height: 2.35rem;
      justify-content: center;
      width: 2.35rem;
    }

    .tenant-meta {
      display: grid;
      gap: 0.125rem;
      min-width: 0;
    }

    .tenant-meta strong {
      color: var(--text-primary, #0f172a);
      font-size: 0.875rem;
      font-weight: 700;
    }

    .tenant-meta small {
      color: var(--text-muted, #64748b);
      font-size: 0.75rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cell-text {
      color: var(--text-secondary, #475569);
      font-size: 0.875rem;
    }

    .cell-num {
      color: var(--text-primary, #0f172a);
      font-size: 0.875rem;
      font-weight: 600;
    }

    .cell-muted {
      color: var(--text-disabled, #94a3b8);
    }

    .activity {
      align-items: center;
      color: var(--text-secondary, #475569);
      display: inline-flex;
      font-size: 0.8125rem;
      gap: var(--space-2, 0.5rem);
    }

    .activity.muted {
      color: var(--text-disabled, #94a3b8);
    }

    .activity i {
      background: var(--text-disabled, #cbd5e1);
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
      height: 0.45rem;
      width: 0.45rem;
    }

    .activity i.recent {
      background: var(--status-success, #16a34a);
    }

    .actions-link {
      color: var(--primary, #0b5cff);
      font-size: 0.8125rem;
      font-weight: 700;
      text-decoration: none;
    }

    .actions-link:hover {
      text-decoration: underline;
    }

    .setup-cell {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .pagination {
      align-items: center;
      display: flex;
      gap: var(--space-4, 1rem);
      justify-content: space-between;
      padding: var(--space-4, 1rem) var(--space-2, 0.5rem);
    }

    .range-label {
      color: var(--text-secondary, #475569);
      font-size: 0.875rem;
    }

    .pagination-controls {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2, 0.5rem);
    }

    .pagination-controls app-button.active ::ng-deep button {
      background-color: var(--primary, #0b5cff) !important;
      border-color: var(--primary, #0b5cff) !important;
      color: var(--text-inverse, #fff) !important;
    }

    .skeleton-container {
      padding: var(--space-5, 1.5rem);
    }

    .sr-only {
      clip: rect(0, 0, 0, 0);
      clip-path: inset(50%);
      height: 1px;
      overflow: hidden;
      position: absolute;
      white-space: nowrap;
      width: 1px;
    }

    @media (max-width: 1280px) {
      .kpi-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 900px) {
      .kpi-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 560px) {
      .kpi-grid {
        grid-template-columns: 1fr;
      }
      .pagination {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `
})
export class PlatformTenantListPage {
  private readonly api = inject(PlatformTenantApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly accessControl = inject(AccessControlService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  readonly tenantSearch = inject(PlatformTenantSearchService);

  readonly hasSubscriptionViewPermission = computed(() =>
    this.accessControl.hasPermission(platformPermissions.tenantSubscriptionsView)
  );

  readonly summary = signal<PlatformTenantSummary | null>(null);
  readonly tenantList = signal<PlatformTenantListResponse | null>(null);
  readonly filterOptions = signal<PlatformTenantFilterOptions>({ plans: [], regions: [], statuses: [] });
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly statusFilter = signal('');
  readonly statusGroupFilter = signal('');
  readonly billingStatusFilter = signal('');
  readonly planFilter = signal('');
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);
  readonly lifecycleFilterOptions = TENANT_LIFECYCLE_FILTER_OPTIONS;

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const status = params.get('status');
    const statusGroup = params.get('statusGroup');
    const billingStatus = params.get('billingStatus');
    if (statusGroup) {
      this.statusGroupFilter.set(statusGroup);
    } else if (status) {
      this.statusFilter.set(status);
    }
    if (billingStatus) {
      this.billingStatusFilter.set(billingStatus);
    }

    this.tenantSearch.searchChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageNumber.set(1);
        this.loadPage();
      });

    this.loadInitialData();
  }

  /** Exposed for tests */
  searchTerm(): string {
    return this.tenantSearch.searchTerm();
  }

  loadInitialData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      summary: this.api.getSummary(),
      filterOptions: this.api.getFilterOptions()
    }).subscribe({
      next: ({ summary, filterOptions }) => {
        this.summary.set(summary);
        this.filterOptions.set(filterOptions);
        this.loadPage(false);
      },
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  loadPage(showLoading = true): void {
    if (showLoading) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
    }

    this.api.getTenants(this.buildQuery()).subscribe({
      next: (response) => {
        this.tenantList.set(response);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(value: string): void {
    this.tenantSearch.setSearch(value);
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.statusGroupFilter.set('');
    this.pageNumber.set(1);
    this.loadPage();
  }

  onPlanChange(value: string): void {
    this.planFilter.set(value);
    this.pageNumber.set(1);
    this.loadPage();
  }

  resetFilters(): void {
    this.tenantSearch.searchTerm.set('');
    this.statusFilter.set('');
    this.statusGroupFilter.set('');
    this.billingStatusFilter.set('');
    this.planFilter.set('');
    this.pageNumber.set(1);
    this.loadPage();
  }

  goToPage(page: number): void {
    const totalPages = this.tenantList()?.totalPages ?? 1;
    const nextPage = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
    this.pageNumber.set(nextPage);
    this.loadPage();
  }

  rangeLabel(list: PlatformTenantListResponse): string {
    if (list.totalCount === 0) {
      return 'Showing 0 tenants';
    }

    const start = (list.pageNumber - 1) * list.pageSize + 1;
    const end = Math.min(list.pageNumber * list.pageSize, list.totalCount);
    return `Showing ${start} to ${end} of ${list.totalCount} tenants`;
  }

  pageNumbers(list: PlatformTenantListResponse): number[] {
    const total = Math.max(list.totalPages, 1);
    const current = list.pageNumber;
    const windowSize = 5;
    const start = Math.max(1, Math.min(current - 2, total - windowSize + 1));
    const end = Math.min(total, start + windowSize - 1);
    const adjustedStart = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }

  percent(value: number, total: number): string {
    if (total <= 0) {
      return '0.0% of total';
    }

    return `${((value / total) * 100).toFixed(1)}% of total`;
  }

  pendingActivationLabel(summary: PlatformTenantSummary): string {
    return summary.pendingActivationTenants == null ? '—' : String(summary.pendingActivationTenants);
  }

  pendingActivationMeta(summary: PlatformTenantSummary): string {
    if (summary.pendingActivationTenants == null) {
      return 'Unavailable';
    }

    return this.percent(summary.pendingActivationTenants, summary.totalTenants);
  }

  initials(name: string): string {
    return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  }

  avatarColor(name: string): string {
    const palette = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#ea580c', '#db2777'];
    const code = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return palette[code % palette.length];
  }

  statusLabel(tenant: { lifecycleStatus?: string; status?: string }): string {
    return tenantLifecycleLabel({
      lifecycleStatus: tenant.lifecycleStatus,
      status: tenant.status
    });
  }

  statusClass(tenant: { lifecycleStatus?: string; status?: string }): string {
    return tenantLifecycleBadgeClass({
      lifecycleStatus: tenant.lifecycleStatus,
      status: tenant.status
    });
  }

  mapStatusVariant(badgeClass: string): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
    switch (badgeClass) {
      case 'active':
        return 'success';
      case 'pending_activation':
      case 'draft':
        return 'info';
      case 'suspended':
      case 'pending_payment':
        return 'warning';
      case 'cancelled':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  isRecentActivity(value: string): boolean {
    return Date.now() - new Date(value).getTime() < 86_400_000;
  }

  relativeTime(value: string): string {
    const timestamp = new Date(value).getTime();
    const diffMs = Date.now() - timestamp;
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  private buildQuery(): PlatformTenantListQuery {
    const query: PlatformTenantListQuery = {
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      search: this.tenantSearch.searchTerm(),
      status: this.statusGroupFilter() ? undefined : this.statusFilter(),
      statusGroup: this.statusGroupFilter() || undefined,
      billingStatus: this.billingStatusFilter(),
      planId: this.planFilter(),
      sortBy: 'createdOn',
      sortDirection: 'desc'
    };

    return query;
  }
}
