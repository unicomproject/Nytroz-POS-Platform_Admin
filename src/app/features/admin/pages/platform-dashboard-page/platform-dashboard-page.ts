import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

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
  PlatformDashboard,
  PlatformDashboardMrrGroup,
  PlatformRevenueState,
  PlatformTrendPoint
} from '../../models/platform-dashboard.model';
import { PlatformDashboardApiService } from '../../services/platform-dashboard-api.service';
import { tenantLifecycleBadgeClass } from '../../utils/tenant-lifecycle.util';

@Component({
  selector: 'app-platform-dashboard-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    PageHeader,
    Button,
    StatusBadge,
    LoadingSkeleton,
    ErrorState,
    EmptyState
  ],
  template: `
    <section class="dashboard-page">
      <app-page-header
        title="Dashboard"
        description="Platform health, tenant status, and items that need attention."
      >
        @if (dashboard()) {
          <app-button
            variant="secondary"
            size="compact"
            [disabled]="isRefreshing()"
            (click)="refreshDashboard()"
          >
            {{ isRefreshing() ? 'Refreshing…' : 'Refresh' }}
          </app-button>
        }
      </app-page-header>

      @if (dashboard()?.generatedAt; as generatedAt) {
        <p class="last-updated">Last updated: {{ generatedAt | date: 'medium' }}</p>
      }

      @if (refreshErrorMessage()) {
        <div class="banner danger" role="alert">
          <div>
            <strong>Refresh failed</strong>
            <span>{{ refreshErrorMessage() }}</span>
          </div>
          <app-button variant="secondary" size="compact" (click)="refreshDashboard()">Try again</app-button>
        </div>
      }

      @if (isLoading()) {
        <app-loading-skeleton [rows]="6" />
      } @else if (errorMessage()) {
        <app-error-state
          title="Dashboard could not be loaded"
          [message]="errorMessage()!"
          [hasRetry]="true"
          (retry)="loadDashboard()"
        />
      } @else if (dashboard(); as data) {
        @if (data.sectionErrors.length) {
          <div class="banner warn" role="status">
            Some dashboard sections could not be loaded. Partial data is shown below.
          </div>
        }

        <section class="kpi-grid" aria-label="Key metrics">
          <article class="kpi">
            <span class="kpi-label">Total Tenants</span>
            <strong class="kpi-value">{{ data.kpis.totalTenants ?? '—' }}</strong>
            <small
              class="kpi-meta"
              [class.negative]="(data.kpis.totalTenantsChangePercent ?? 0) < 0"
              [class.neutral]="data.kpis.totalTenantsChangeStatus === 'ok' && data.kpis.totalTenantsChangePercent === 0"
            >
              {{ change(data.kpis.totalTenantsChangePercent, data.kpis.totalTenantsChangeStatus) }} vs last month
            </small>
          </article>

          @if (data.permissions.canViewTenantSubscriptions) {
            <article class="kpi">
              <span class="kpi-label">Active Paid Subscriptions</span>
              <strong class="kpi-value">{{ data.kpis.activeSubscriptions ?? '—' }}</strong>
              <small
                class="kpi-meta"
                [class.negative]="(data.kpis.activeSubscriptionsChangePercent ?? 0) < 0"
                [class.neutral]="
                  data.kpis.activeSubscriptionsChangeStatus === 'ok' && data.kpis.activeSubscriptionsChangePercent === 0
                "
              >
                {{ change(data.kpis.activeSubscriptionsChangePercent, data.kpis.activeSubscriptionsChangeStatus) }} vs
                last month
              </small>
            </article>
          }

          @if (data.revenue.status !== 'HIDDEN') {
            <article class="kpi">
              <span class="kpi-label">Monthly Recurring Revenue</span>
              <strong class="kpi-value">{{ mrrDisplay(data.revenue) }}</strong>
            </article>
          }

          <article class="kpi">
            <span class="kpi-label">Items Requiring Attention</span>
            <strong class="kpi-value">{{ data.kpis.itemsRequiringAttention }}</strong>
          </article>

          <article class="kpi">
            <span class="kpi-label">System Health</span>
            <strong class="kpi-value health-row">
              <app-status-badge [variant]="healthVariant(data.kpis.systemHealthStatus)">
                {{ data.kpis.systemHealthLabel }}
              </app-status-badge>
            </strong>
            <small class="kpi-meta neutral">{{ systemHealthHint(data) }}</small>
          </article>
        </section>

        <section class="main-grid">
          <article class="panel">
            <header class="panel-head">
              <div>
                <h2>Platform Status Overview</h2>
                <p>Tenant growth, subscription health, and revenue trend</p>
              </div>
              <span class="chip">This Month</span>
            </header>

            <div class="summary-row">
              <div>
                <span class="kpi-label">Tenant Growth</span>
                <strong class="summary-value">{{ data.statusOverview.tenantGrowth ?? '—' }}</strong>
                <small
                  class="kpi-meta"
                  [class.neutral]="
                    data.statusOverview.tenantGrowthChangeStatus === 'ok' &&
                    data.statusOverview.tenantGrowthChangePercent === 0
                  "
                >
                  {{ change(data.statusOverview.tenantGrowthChangePercent, data.statusOverview.tenantGrowthChangeStatus) }}
                </small>
              </div>

              @if (data.permissions.canViewTenantSubscriptions) {
                <div>
                  <span class="kpi-label">Subscription Health</span>
                  @if (data.statusOverview.subscriptionHealthPercent !== null) {
                    <strong class="summary-value">{{ data.statusOverview.subscriptionHealthPercent }}%</strong>
                    <small class="kpi-meta neutral">
                      {{ data.statusOverview.activeSubscriptionCount }} Active ·
                      {{ data.statusOverview.atRiskSubscriptionCount }} At Risk
                    </small>
                  } @else {
                    <p class="empty-inline compact">Subscription metrics unavailable.</p>
                  }
                </div>
              }

              @if (data.revenue.status !== 'HIDDEN') {
                <div>
                  <span class="kpi-label">Revenue Trend (MRR)</span>
                  <strong class="summary-value">{{ mrrDisplay(data.revenue) }}</strong>
                </div>
              }
            </div>

            @if (data.statusOverview.trendsUnavailable) {
              <p class="empty-inline">Trend data is temporarily unavailable.</p>
            } @else if (data.statusOverview.trend.length) {
              <div class="chart-wrap">
                <svg
                  viewBox="0 0 720 235"
                  role="img"
                  aria-labelledby="dashboard-trend-title dashboard-trend-desc"
                >
                  <title id="dashboard-trend-title">Platform trend chart</title>
                  <desc id="dashboard-trend-desc">
                    Line chart of tenant, subscription, and MRR trend for the current period.
                  </desc>
                  @for (line of [40, 85, 130, 175, 220]; track line) {
                    <line x1="45" [attr.y1]="line" x2="700" [attr.y2]="line" />
                  }
                  <polyline class="tenant-line" [attr.points]="chartPoints(data.statusOverview.trend, 'tenants')" />
                  @if (data.permissions.canViewTenantSubscriptions) {
                    <polyline
                      class="subscription-line"
                      [attr.points]="chartPoints(data.statusOverview.trend, 'subscriptions')"
                    />
                  }
                  @if (data.revenue.status === 'SUCCESS') {
                    <polyline class="mrr-line" [attr.points]="chartPoints(data.statusOverview.trend, 'mrr')" />
                  }
                </svg>
                <div class="legend" aria-hidden="true">
                  <span class="tenant-dot">Tenants</span>
                  @if (data.permissions.canViewTenantSubscriptions) {
                    <span class="subscription-dot">Subscriptions</span>
                  }
                  @if (data.revenue.status === 'SUCCESS') {
                    <span class="mrr-dot">MRR</span>
                  }
                </div>
              </div>
            } @else {
              <p class="empty-inline">Trend data will appear when platform records exist.</p>
            }
          </article>

          <article class="panel">
            <header class="panel-head">
              <div>
                <h2>Attention Needed Today</h2>
                <p>Items that need your immediate attention</p>
              </div>
            </header>

            @if (data.attention.length) {
              <div class="attention-list">
                @for (item of data.attention; track item.type) {
                  @if (canNavigateAttention(item.type)) {
                    <a
                      class="attention-row"
                      [class.warning]="item.severity === 'warning'"
                      [class.info]="item.severity === 'info'"
                      [routerLink]="attentionLink(item.type)"
                      [queryParams]="attentionQueryParams(item.type)"
                    >
                      <div>
                        <strong>{{ item.title }}</strong>
                        <span>{{ item.description }}</span>
                      </div>
                      <b>{{ item.count }}</b>
                    </a>
                  } @else {
                    <div
                      class="attention-row static"
                      [class.warning]="item.severity === 'warning'"
                      [class.info]="item.severity === 'info'"
                    >
                      <div>
                        <strong>{{ item.title }}</strong>
                        <span>{{ item.description }}</span>
                      </div>
                      <b>{{ item.count }}</b>
                    </div>
                  }
                }
              </div>
            } @else {
              <app-empty-state
                title="No items require attention"
                message="Operational attention items will appear here when the platform reports them."
              />
            }

            @if (canViewTenants()) {
              <a class="panel-link" routerLink="/admin/tenants">View all tenants</a>
            }
          </article>
        </section>

        <section class="lower-grid">
          <article class="panel">
            <header class="panel-head">
              <div>
                <h2>Recent Tenants</h2>
              </div>
              @if (canViewTenants()) {
                <a class="panel-link tight" routerLink="/admin/tenants">View all</a>
              }
            </header>

            @if (data.recentTenants.length) {
              <div class="data-table-container">
                <table class="data-table recent-table">
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (tenant of data.recentTenants; track tenant.id) {
                      <tr>
                        <td>
                          @if (canViewTenants()) {
                            <a class="tenant-link" [routerLink]="['/admin/tenants', tenant.id]">
                              <strong>{{ tenant.name }}</strong>
                              <span>{{ tenant.code }}</span>
                            </a>
                          } @else {
                            <strong>{{ tenant.name }}</strong>
                            <span class="muted">{{ tenant.code }}</span>
                          }
                        </td>
                        <td>
                          <app-status-badge [variant]="mapStatusVariant(tenant.status)">
                            {{ tenant.status }}
                          </app-status-badge>
                        </td>
                        <td>
                          <time>{{ tenant.createdAt | date: 'short' }}</time>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="empty-inline">No recent tenants have been recorded yet.</p>
            }
          </article>

          <article class="panel">
            <header class="panel-head">
              <div>
                <h2>Tenant Status Snapshot</h2>
              </div>
            </header>
            <p class="snapshot-total">
              Total <strong>{{ data.tenantStatusSnapshot.total }}</strong>
            </p>
            @if (data.tenantStatusSnapshot.items.length) {
              <ul class="status-list">
                @for (item of data.tenantStatusSnapshot.items; track item.status) {
                  <li>
                    <span>{{ item.status }}</span>
                    <strong>{{ item.count }}</strong>
                    <b>{{ item.percentage }}%</b>
                    <div class="bar" aria-hidden="true">
                      <i [style.width.%]="item.percentage"></i>
                    </div>
                  </li>
                }
              </ul>
            } @else {
              <p class="empty-inline compact">No tenant status distribution yet.</p>
            }
          </article>
        </section>

        @if (data.subscriptionSnapshot; as subscriptionSnapshot) {
          <article class="panel">
            <header class="panel-head">
              <div>
                <h2>Subscription Status Snapshot</h2>
              </div>
            </header>
            <p class="snapshot-total">
              Total <strong>{{ subscriptionSnapshot.total }}</strong>
            </p>
            <ul class="status-list">
              @for (item of subscriptionSnapshot.items; track item.status) {
                <li>
                  <span>{{ item.status }}</span>
                  <strong>{{ item.count }}</strong>
                  <b>{{ item.percentage }}%</b>
                  <div class="bar" aria-hidden="true">
                    <i [style.width.%]="item.percentage"></i>
                  </div>
                </li>
              }
            </ul>
          </article>
        }

        @if (data.footprint; as footprint) {
          <article class="panel">
            <header class="panel-head">
              <div>
                <h2>Platform Footprint</h2>
                <p>Operational scale across tenants and platform staff.</p>
              </div>
            </header>
            <div class="footprint-grid">
              <div>
                <span class="kpi-label">Outlets</span>
                <strong>{{ footprint.totalOutlets }}</strong>
              </div>
              <div>
                <span class="kpi-label">Tills</span>
                <strong>{{ footprint.totalTills }}</strong>
              </div>
              <div>
                <span class="kpi-label">Tenant Users</span>
                <strong>{{ footprint.totalTenantUsers }}</strong>
              </div>
              @if (footprint.totalPlatformUsers !== null) {
                <div>
                  <span class="kpi-label">Platform Users</span>
                  <strong>{{ footprint.totalPlatformUsers }}</strong>
                </div>
              }
            </div>
          </article>
        }
      }
    </section>
  `,
  styles: `
    :host {
      color: var(--text-primary);
      display: block;
    }

    .dashboard-page,
    .kpi-grid,
    .main-grid,
    .lower-grid,
    .footprint-grid,
    .status-list,
    .attention-list {
      display: grid;
      gap: var(--space-4);
    }

    .dashboard-page { gap: var(--space-5); }

    .last-updated {
      color: var(--text-muted);
      font-size: 0.78rem;
      margin: calc(var(--space-3) * -1) 0 0;
    }

    .banner {
      align-items: center;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      display: flex;
      gap: var(--space-3);
      justify-content: space-between;
      padding: var(--space-3) var(--space-4);
    }

    .banner.warn {
      background: var(--status-warning-bg);
      border-color: var(--status-warning);
      color: var(--status-warning-text);
    }

    .banner.danger {
      background: var(--status-danger-bg);
      border-color: var(--status-danger);
      color: var(--status-danger-text);
    }

    .banner div {
      display: grid;
      gap: var(--space-1);
    }

    .kpi-grid {
      grid-template-columns: repeat(auto-fit, minmax(10.5rem, 1fr));
    }

    .kpi,
    .panel {
      background: var(--bg-surface-primary);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
    }

    .kpi {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
      padding: var(--space-4);
    }

    .kpi-label,
    .muted,
    .empty-inline,
    .legend span,
    .status-list b,
    .attention-row span,
    .tenant-link span,
    time {
      color: var(--text-muted);
    }

    .kpi-label {
      font-size: 0.75rem;
    }

    .kpi-value,
    .summary-value,
    .footprint-grid strong {
      color: var(--text-primary);
      font-size: 1.25rem;
      overflow-wrap: anywhere;
    }

    .health-row {
      align-items: center;
      display: flex;
      font-size: 1rem;
    }

    .kpi-meta {
      color: var(--status-success-text);
      font-size: 0.72rem;
      font-weight: 600;
    }

    .kpi-meta.negative { color: var(--status-danger-text); }
    .kpi-meta.neutral { color: var(--text-muted); font-weight: 500; }

    .main-grid {
      grid-template-columns: minmax(0, 1.65fr) minmax(17rem, 1fr);
    }

    .lower-grid {
      grid-template-columns: 1.15fr 1fr;
    }

    .panel { min-width: 0; padding: var(--space-4); }

    .panel-head {
      align-items: flex-start;
      display: flex;
      gap: var(--space-3);
      justify-content: space-between;
    }

    .panel-head h2 {
      font-size: 1rem;
      margin: 0;
    }

    .panel-head p {
      color: var(--text-secondary);
      font-size: 0.78rem;
      margin: var(--space-1) 0 0;
    }

    .chip {
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      font-size: 0.75rem;
      font-weight: 600;
      padding: var(--space-2) var(--space-3);
      white-space: nowrap;
    }

    .summary-row {
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      display: grid;
      gap: var(--space-3);
      grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
      margin-top: var(--space-4);
      padding: var(--space-3);
    }

    .summary-row > div {
      display: grid;
      gap: var(--space-1);
    }

    .chart-wrap { margin-top: var(--space-3); }

    svg {
      display: block;
      height: 12rem;
      width: 100%;
    }

    svg line {
      stroke: var(--border-default);
      stroke-width: 1;
    }

    svg polyline {
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2.5;
    }

    .tenant-line { stroke: var(--primary); }
    .subscription-line { stroke: var(--status-info); }
    .mrr-line { stroke: var(--status-success); }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
      justify-content: center;
      margin-top: var(--space-2);
    }

    .legend span {
      font-size: 0.72rem;
    }

    .legend span::before {
      border-radius: var(--radius-pill);
      content: '';
      display: inline-block;
      height: 3px;
      margin-right: var(--space-2);
      vertical-align: middle;
      width: 1.1rem;
    }

    .tenant-dot::before { background: var(--primary); }
    .subscription-dot::before { background: var(--status-info); }
    .mrr-dot::before { background: var(--status-success); }

    .attention-list {
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      gap: 0;
      margin-top: var(--space-4);
      overflow: hidden;
    }

    .attention-row {
      align-items: center;
      color: inherit;
      display: grid;
      gap: var(--space-3);
      grid-template-columns: minmax(0, 1fr) auto;
      padding: var(--space-3);
      text-decoration: none;
    }

    .attention-row + .attention-row {
      border-top: 1px solid var(--border-subtle);
    }

    .attention-row:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: -2px;
    }

    .attention-row div {
      display: grid;
      gap: 0.15rem;
    }

    .attention-row strong { font-size: 0.8125rem; }
    .attention-row span { font-size: 0.72rem; }

    .attention-row > b {
      align-items: center;
      background: var(--status-danger-bg);
      border-radius: var(--radius-pill);
      color: var(--status-danger-text);
      display: inline-flex;
      font-size: 0.75rem;
      justify-content: center;
      min-width: 1.75rem;
      padding: 0.2rem 0.45rem;
    }

    .attention-row.warning > b {
      background: var(--status-warning-bg);
      color: var(--status-warning-text);
    }

    .attention-row.info > b {
      background: var(--status-info-bg);
      color: var(--status-info-text);
    }

    .panel-link {
      color: var(--primary);
      display: inline-block;
      font-size: 0.78rem;
      font-weight: 600;
      margin-top: var(--space-3);
      text-decoration: none;
    }

    .panel-link.tight { margin-top: 0; }

    .panel-link:focus-visible,
    .tenant-link:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }

    .recent-table { min-width: 28rem; }

    .tenant-link {
      color: inherit;
      display: grid;
      gap: 0.1rem;
      text-decoration: none;
    }

    .tenant-link:hover strong { color: var(--primary); }

    .snapshot-total {
      color: var(--text-secondary);
      font-size: 0.8125rem;
      margin: var(--space-3) 0;
    }

    .status-list {
      gap: var(--space-3);
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .status-list li {
      display: grid;
      gap: var(--space-2);
      grid-template-columns: 1fr auto auto;
      grid-template-rows: auto auto;
    }

    .status-list span,
    .status-list strong,
    .status-list b {
      font-size: 0.78rem;
    }

    .status-list .bar {
      background: var(--bg-surface-secondary);
      border-radius: var(--radius-pill);
      grid-column: 1 / -1;
      height: 0.35rem;
      overflow: hidden;
    }

    .status-list .bar i {
      background: var(--primary);
      display: block;
      height: 100%;
    }

    .footprint-grid {
      grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
      margin-top: var(--space-3);
    }

    .footprint-grid > div {
      background: var(--bg-surface-secondary);
      border-radius: var(--radius-md);
      display: grid;
      gap: var(--space-1);
      padding: var(--space-3);
    }

    .empty-inline {
      font-size: 0.82rem;
      margin: 0;
      padding: var(--space-5) 0;
      text-align: center;
    }

    .empty-inline.compact { padding: var(--space-2) 0; text-align: left; }

    @media (max-width: 1100px) {
      .main-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 820px) {
      .lower-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 760px) {
      .summary-row { grid-template-columns: 1fr; }
      .banner { align-items: flex-start; flex-direction: column; }
    }
  `
})
export class PlatformDashboardPage {
  private readonly api = inject(PlatformDashboardApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly accessControl = inject(AccessControlService);

  readonly dashboard = signal<PlatformDashboard | null>(null);
  readonly isLoading = signal(true);
  readonly isRefreshing = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly refreshErrorMessage = signal<string | null>(null);

  private loadInFlight = false;

  constructor() {
    this.loadDashboard();
  }

  loadDashboard(): void {
    const isInitialLoad = !this.dashboard();

    if (this.loadInFlight) {
      return;
    }

    this.loadInFlight = true;

    if (isInitialLoad) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
    }

    this.api
      .getDashboard()
      .pipe(finalize(() => (this.loadInFlight = false)))
      .subscribe({
        next: (dashboard) => {
          this.dashboard.set(dashboard);
          this.isLoading.set(false);
          this.isRefreshing.set(false);
          this.errorMessage.set(null);
          this.refreshErrorMessage.set(null);
        },
        error: (error) => {
          const message = this.apiError.toSafeMessage(error);

          if (this.dashboard()) {
            this.refreshErrorMessage.set(message);
          } else {
            this.errorMessage.set(message);
          }

          this.isLoading.set(false);
          this.isRefreshing.set(false);
        }
      });
  }

  refreshDashboard(): void {
    if (this.loadInFlight || !this.dashboard()) {
      return;
    }

    this.isRefreshing.set(true);
    this.refreshErrorMessage.set(null);
    this.loadDashboard();
  }

  canViewTenants(): boolean {
    return this.accessControl.hasPermission(platformPermissions.tenantsView);
  }

  canNavigateAttention(type: string): boolean {
    switch (type) {
      case 'suspended_tenants':
      case 'setup_pending':
      case 'past_due_subscriptions':
        return this.canViewTenants();
      case 'pending_billing':
        return this.accessControl.hasPermission(platformPermissions.billingView);
      default:
        return false;
    }
  }

  formatMrrGroup(group: PlatformDashboardMrrGroup): string {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: group.currencyCode,
      minimumFractionDigits: group.decimalPlaces,
      maximumFractionDigits: group.decimalPlaces
    }).format(group.amount);
  }

  mrrDisplay(revenue: PlatformRevenueState): string {
    if (revenue.status === 'HIDDEN') {
      return '';
    }

    if (revenue.status !== 'SUCCESS') {
      return this.revenueUnavailableLabel(revenue);
    }

    if (!revenue.groups.length) {
      return '—';
    }

    return revenue.groups.map((group) => this.formatMrrGroup(group)).join(' · ');
  }

  revenueUnavailableLabel(_revenue: PlatformRevenueState): string {
    return 'Revenue data is temporarily unavailable.';
  }

  change(percent: number | null, changeStatus: string | null): string {
    switch (changeStatus) {
      case 'new_no_baseline':
        return 'New — no prior baseline';
      case 'no_history':
        return 'No history yet';
      case 'unavailable':
        return 'Unavailable';
      case 'ok':
        if (percent === null) {
          return '—';
        }

        if (percent === 0) {
          return 'No change';
        }

        return `${percent >= 0 ? '+' : ''}${percent}%`;
      default:
        return '—';
    }
  }

  systemHealthHint(data: PlatformDashboard): string {
    switch (data.kpis.systemHealthStatus?.toUpperCase()) {
      case 'HEALTHY':
        return 'All systems operational';
      case 'DEGRADED':
        return 'Some dependencies are degraded';
      case 'CRITICAL':
        return 'Critical dependencies need attention';
      case 'UNKNOWN':
        return 'Health status could not be determined';
      default:
        return data.systemHealth ? 'Review system health details' : 'System health unavailable';
    }
  }

  healthVariant(status: string | null | undefined): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
    switch (status?.toUpperCase()) {
      case 'HEALTHY':
        return 'success';
      case 'DEGRADED':
        return 'warning';
      case 'CRITICAL':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  mapStatusVariant(status: string | null | undefined): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
    const badgeClass = tenantLifecycleBadgeClass({ status: status ?? undefined });
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

  attentionLink(type: string): string {
    return type === 'pending_billing' ? '/admin/billing' : '/admin/tenants';
  }

  attentionQueryParams(type: string): Record<string, string> | null {
    switch (type) {
      case 'suspended_tenants':
        return { status: 'suspended' };
      case 'pending_activation':
        return { status: 'pending_activation' };
      case 'setup_pending':
        return { statusGroup: 'setup_pending' };
      case 'past_due_subscriptions':
        return { billingStatus: 'PAST_DUE' };
      default:
        return null;
    }
  }

  chartPoints(trend: PlatformTrendPoint[], key: 'tenants' | 'subscriptions' | 'mrr'): string {
    if (!trend.length) {
      return '';
    }

    const maximum = Math.max(1, ...trend.map((point) => Number(point[key])));

    return trend
      .map((point, index) => {
        const x = 45 + index * (655 / Math.max(1, trend.length - 1));
        const y = 220 - (Number(point[key]) / maximum) * 180;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }
}
