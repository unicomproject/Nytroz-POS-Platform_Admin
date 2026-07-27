import { DatePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { PlatformDashboard, PlatformTrendPoint, TenantStatusItem } from '../../models/platform-dashboard.model';
import { PlatformDashboardApiService } from '../../services/platform-dashboard-api.service';

@Component({
  selector: 'app-platform-dashboard-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <section class="dashboard-page">
      <header class="page-heading">
        <div>
          <h1>Platform Overview Dashboard</h1>
          <p>See platform health, tenant status, and items that need attention.</p>
        </div>
      </header>

      @if (isLoading()) {
        <div class="state-card">Loading real platform data...</div>
      } @else if (errorMessage()) {
        <div class="state-card error">
          <strong>Dashboard could not be loaded</strong>
          <span>{{ errorMessage() }}</span>
          <button type="button" (click)="loadDashboard()">Try again</button>
        </div>
      } @else if (dashboard(); as data) {
        <section class="kpi-grid">
          <article class="kpi-card blue">
            <i>TT</i><div><span>Total Tenants</span><strong>{{ data.kpis.totalTenants }}</strong></div>
            <small [class.negative]="data.kpis.totalTenantsChangePercent < 0" [class.neutral]="data.kpis.totalTenantsChangePercent === 0">{{ change(data.kpis.totalTenantsChangePercent) }} vs last month</small>
          </article>
          <article class="kpi-card violet">
            <i>AS</i><div><span>Active Subscriptions</span><strong>{{ data.kpis.activeSubscriptions }}</strong></div>
            <small [class.negative]="data.kpis.activeSubscriptionsChangePercent < 0" [class.neutral]="data.kpis.activeSubscriptionsChangePercent === 0">{{ change(data.kpis.activeSubscriptionsChangePercent) }} vs last month</small>
          </article>
          <article class="kpi-card green">
            <i>Rs</i><div><span>Monthly Recurring Revenue</span><strong>{{ mrrLabel(data.kpis.monthlyRecurringRevenue) }}</strong></div>
            <small [class.negative]="data.kpis.monthlyRecurringRevenueChangePercent < 0" [class.neutral]="data.kpis.monthlyRecurringRevenueChangePercent === 0">{{ change(data.kpis.monthlyRecurringRevenueChangePercent) }}</small>
          </article>
          <article class="kpi-card orange">
            <i>!</i><div><span>Items Requiring Attention</span><strong>{{ data.kpis.itemsRequiringAttention }}</strong></div>
            <small [class.negative]="data.kpis.itemsRequiringAttentionChangePercent > 0" [class.neutral]="data.kpis.itemsRequiringAttentionChangePercent === 0">{{ change(data.kpis.itemsRequiringAttentionChangePercent) }}</small>
          </article>
          <article class="kpi-card health">
            <i>+</i><div><span>System Health</span><strong>{{ data.kpis.systemHealth }}</strong></div>
            <small>{{ data.kpis.systemHealth === 'Healthy' ? 'All systems operational' : 'Review attention items' }}</small>
          </article>
        </section>

        <section class="main-grid">
          <article class="panel overview-panel">
            <div class="panel-title"><div><h2>Platform Status Overview</h2><p>Tenant growth, subscription health, and revenue trend</p></div><span>This Month</span></div>
            <div class="summary-row">
              <div><span>Tenant Growth</span><strong>{{ data.statusOverview.tenantGrowth }}</strong><small [class.neutral]="data.statusOverview.tenantGrowthChangePercent === 0">{{ change(data.statusOverview.tenantGrowthChangePercent) }}</small></div>
              <div class="health-summary"><span>Subscription Health</span><section><b>{{ data.statusOverview.subscriptionHealthPercent }}%</b><p><strong>Healthy</strong><small>{{ data.statusOverview.activeSubscriptionCount }} Active <em>{{ data.statusOverview.atRiskSubscriptionCount }} At Risk</em></small></p></section></div>
              <div><span>Revenue Trend (MRR)</span><strong>{{ mrrLabel(data.statusOverview.revenueTrendTotal) }}</strong><small [class.neutral]="data.statusOverview.revenueTrendChangePercent === 0">{{ change(data.statusOverview.revenueTrendChangePercent) }}</small></div>
            </div>
            @if (data.statusOverview.trend.length) {
              <div class="chart-wrap">
                <svg viewBox="0 0 720 235" role="img" aria-label="Tenant, subscription and MRR trend">
                  @for (line of [40, 85, 130, 175, 220]; track line) { <line x1="45" [attr.y1]="line" x2="700" [attr.y2]="line" /> }
                  <polyline class="tenant-line" [attr.points]="chartPoints(data.statusOverview.trend, 'tenants')" />
                  <polyline class="subscription-line" [attr.points]="chartPoints(data.statusOverview.trend, 'subscriptions')" />
                  <polyline class="mrr-line" [attr.points]="chartPoints(data.statusOverview.trend, 'mrr')" />
                </svg>
                <div class="legend"><span class="tenant-dot">Tenants</span><span class="subscription-dot">Subscriptions</span><span class="mrr-dot">MRR</span></div>
              </div>
            } @else { <div class="empty-inline">Trend data will appear when platform records exist.</div> }
          </article>

          <article class="panel attention-panel">
            <div class="attention-heading"><i>!</i><div><h2>Attention Needed Today</h2><p>Items that need your immediate attention</p></div></div>
            <div class="attention-list">
              @for (item of data.attention; track item.type) {
                <a
                  class="attention-row"
                  [class.warning]="item.severity === 'warning'"
                  [class.info]="item.severity === 'info'"
                  [routerLink]="attentionLink(item.type)"
                  [queryParams]="attentionQueryParams(item.type)"
                >
                  <i>{{ attentionIcon(item.type) }}</i><div><strong>{{ item.title }}</strong><span>{{ item.description }}</span></div><b>{{ item.count }}</b><em>&gt;</em>
                </a>
              }
            </div>
            <a routerLink="/admin/tenants">View all tenants <span>-></span></a>
          </article>
        </section>

        <section class="lower-grid">
          <article class="panel activity-panel">
            <div class="panel-title"><div><h2>Recent Platform Activity</h2></div></div>
            @if (data.recentActivity.length) {
              @for (activity of data.recentActivity; track activity.occurredAt + activity.type) {
                <div class="activity-row"><i>+</i><span>{{ activity.message }}</span><time>{{ activity.occurredAt | date: 'short' }}</time></div>
              }
            } @else { <div class="empty-inline">No platform activity has been recorded yet.</div> }
          </article>

          <article class="panel snapshot-panel">
            <div class="panel-title"><div><h2>Tenant Status Snapshot</h2></div></div>
            <div class="snapshot-content">
              <div class="donut" [style.background]="donutBackground(data.tenantStatusSnapshot.items)"><div><strong>{{ data.tenantStatusSnapshot.total }}</strong><span>Total</span></div></div>
              <div class="status-list">
                @for (item of data.tenantStatusSnapshot.items; track item.status; let index = $index) {
                  <div><i [class]="'status-' + index"></i><span>{{ item.status }}</span><strong>{{ item.count }}</strong><b>{{ item.percentage }}%</b></div>
                }
              </div>
            </div>
          </article>
        </section>
      }
    </section>
  `,
  styles: `
    :host { color: #14213d; display: block; }
    * { box-sizing: border-box; }
    .dashboard-page { display: grid; gap: 1rem; }
    .page-heading h1 { color: #101a38; font-size: clamp(1.55rem, 2.4vw, 2rem); margin: 0; }
    .page-heading p, .panel-title p, .attention-heading p { color: #667085; margin: 0.45rem 0 0; }
    .kpi-grid { display: grid; gap: 0.85rem; grid-template-columns: repeat(5, minmax(0, 1fr)); }
    .kpi-card, .panel, .state-card { background: #fff; border: 1px solid #e5eaf2; border-radius: 13px; box-shadow: 0 7px 22px rgba(31, 51, 86, 0.045); }
    .kpi-card { align-items: center; display: grid; gap: 0.55rem 0.7rem; grid-template-columns: auto 1fr; min-height: 8.8rem; padding: 1rem; }
    .kpi-card > i { align-items: center; background: #eaf2ff; border-radius: 50%; color: #1768e5; display: flex; font-size: 0.75rem; font-style: normal; font-weight: 900; height: 2.8rem; justify-content: center; width: 2.8rem; }
    .kpi-card div { display: grid; gap: 0.35rem; min-width: 0; }
    .kpi-card span { color: #596783; font-size: 0.76rem; }
    .kpi-card strong { color: #101a38; font-size: clamp(1.15rem, 1.7vw, 1.48rem); overflow-wrap: anywhere; }
    .kpi-card small { color: #13a653; font-size: 0.72rem; font-weight: 800; grid-column: 1 / -1; }
    .kpi-card small.negative { color: #ef4444; }
    .kpi-card small.neutral { color: #667085; }
    .kpi-card.violet > i { background: #f0eaff; color: #7047eb; }
    .kpi-card.green > i, .kpi-card.health > i { background: #e8f8ed; color: #18a44b; }
    .kpi-card.orange > i { background: #fff1e6; color: #ff7a18; }
    .kpi-card.health strong, .kpi-card.health small { color: #18a44b; }
    .main-grid { display: grid; gap: 1rem; grid-template-columns: minmax(0, 1.65fr) minmax(19rem, 1fr); }
    .lower-grid { display: grid; gap: 1rem; grid-template-columns: 1.15fr 1fr; }
    .panel { min-width: 0; padding: 1rem; }
    .panel-title { align-items: flex-start; display: flex; justify-content: space-between; }
    .panel-title h2, .attention-heading h2 { font-size: 1rem; margin: 0; }
    .panel-title p, .attention-heading p { font-size: 0.78rem; }
    .panel-title > span { border: 1px solid #dde5ef; border-radius: 8px; color: #344054; font-size: 0.78rem; font-weight: 700; padding: 0.55rem 0.7rem; }
    .summary-row { border: 1px solid #e6ebf3; border-radius: 10px; display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 1rem; padding: 0.85rem 0; }
    .summary-row > div { display: grid; gap: 0.35rem; padding: 0 1rem; text-align: center; }
    .summary-row > div + div { border-left: 1px solid #dde4ee; }
    .summary-row span { color: #344054; font-size: 0.72rem; }
    .summary-row strong { font-size: 1.32rem; }
    .summary-row small { color: #16a34a; font-size: 0.75rem; font-weight: 800; }
    .summary-row small.neutral { color: #667085; }
    .health-summary section { align-items: center; display: flex; gap: 0.7rem; justify-content: center; }
    .health-summary section > b { align-items: center; border: 5px solid #1bb55c; border-radius: 50%; display: flex; height: 3.5rem; justify-content: center; width: 3.5rem; }
    .health-summary p { display: grid; gap: 0.2rem; margin: 0; text-align: left; }
    .health-summary p strong { color: #18a44b; font-size: 1rem; }
    .health-summary em { color: #f97316; font-style: normal; margin-left: 0.35rem; }
    .chart-wrap { margin-top: 0.75rem; }
    svg { display: block; height: 13rem; width: 100%; }
    svg line { stroke: #e8edf4; stroke-width: 1; }
    svg polyline { fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-width: 3; }
    .tenant-line { stroke: #1768e5; } .subscription-line { stroke: #7148ef; } .mrr-line { stroke: #16a34a; }
    .legend { display: flex; gap: 1.5rem; justify-content: center; }
    .legend span { color: #667085; font-size: 0.72rem; }
    .legend span::before { border-radius: 99px; content: ''; display: inline-block; height: 3px; margin-right: 0.4rem; vertical-align: middle; width: 1.35rem; }
    .tenant-dot::before { background: #1768e5; } .subscription-dot::before { background: #7148ef; } .mrr-dot::before { background: #16a34a; }
    .attention-heading { align-items: center; display: flex; gap: 0.75rem; }
    .attention-heading > i { align-items: center; background: #fff0f0; border-radius: 10px; color: #ef4444; display: flex; font-style: normal; font-weight: 900; height: 2.7rem; justify-content: center; width: 2.7rem; }
    .attention-list { border: 1px solid #e6ebf3; border-radius: 10px; margin-top: 1rem; overflow: hidden; }
    .attention-row { align-items: center; color: inherit; display: grid; gap: 0.65rem; grid-template-columns: auto minmax(0, 1fr) auto auto; min-height: 4.15rem; padding: 0.7rem; text-decoration: none; }
    .attention-row + .attention-row { border-top: 1px solid #e6ebf3; }
    .attention-row > i { align-items: center; background: #fff0f0; border-radius: 9px; color: #ef4444; display: flex; font-size: 0.65rem; font-style: normal; font-weight: 900; height: 2rem; justify-content: center; width: 2rem; }
    .attention-row.warning > i { background: #fff4e8; color: #f97316; } .attention-row.info > i { background: #eeeaff; color: #7047eb; }
    .attention-row div { display: grid; gap: 0.18rem; }
    .attention-row strong { font-size: 0.78rem; } .attention-row span { color: #667085; font-size: 0.68rem; }
    .attention-row > b { align-items: center; background: #fff0f0; border-radius: 50%; color: #ef4444; display: flex; font-size: 0.72rem; height: 1.8rem; justify-content: center; width: 1.8rem; }
    .attention-row > em { color: #8290a7; font-size: 1.4rem; font-style: normal; }
    .attention-panel > a:not(.attention-row) { color: #0b5cff; display: inline-block; font-size: 0.75rem; font-weight: 800; margin-top: 0.75rem; text-decoration: none; }
    .activity-row { align-items: center; border-bottom: 1px solid #edf0f5; display: grid; gap: 0.7rem; grid-template-columns: auto 1fr auto; min-height: 2.75rem; }
    .activity-row i { align-items: center; background: #eaf2ff; border-radius: 50%; color: #0b5cff; display: flex; font-style: normal; height: 1.7rem; justify-content: center; width: 1.7rem; }
    .activity-row span, .activity-row time { font-size: 0.75rem; } .activity-row time { color: #667085; }
    .snapshot-content { align-items: center; display: grid; gap: 1.5rem; grid-template-columns: 11rem 1fr; padding: 1rem; }
    .donut { align-items: center; border-radius: 50%; display: flex; height: 10rem; justify-content: center; width: 10rem; }
    .donut > div { align-items: center; background: #fff; border-radius: 50%; display: flex; flex-direction: column; height: 6rem; justify-content: center; width: 6rem; }
    .donut strong { font-size: 1.6rem; } .donut span { color: #667085; font-size: 0.75rem; }
    .status-list { display: grid; gap: 0.85rem; }
    .status-list div { align-items: center; display: grid; gap: 0.6rem; grid-template-columns: auto 1fr auto auto; }
    .status-list i { background: #16a34a; border-radius: 50%; height: 0.65rem; width: 0.65rem; }
    .status-list .status-1 { background: #1768e5; } .status-list .status-2 { background: #f97316; } .status-list .status-3 { background: #ef4444; }
    .status-list span, .status-list strong, .status-list b { font-size: 0.76rem; } .status-list b { color: #667085; min-width: 3rem; text-align: right; }
    .empty-inline { color: #667085; font-size: 0.82rem; padding: 2rem 0; text-align: center; }
    .state-card { display: grid; gap: 0.75rem; padding: 2rem; text-align: center; }
    .state-card.error { color: #b42318; } .state-card button { background: #0b5cff; border: 0; border-radius: 8px; color: #fff; justify-self: center; padding: 0.7rem 1rem; }
    @media (max-width: 1180px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } .main-grid { grid-template-columns: 1fr; } }
    @media (max-width: 820px) { .kpi-grid, .lower-grid { grid-template-columns: 1fr 1fr; } .snapshot-content { grid-template-columns: 1fr; justify-items: center; } }
    @media (max-width: 560px) { .kpi-grid, .lower-grid { grid-template-columns: 1fr; } .summary-row { grid-template-columns: 1fr; } .summary-row > div { padding: 0.8rem; } .summary-row > div + div { border-left: 0; border-top: 1px solid #dde4ee; } .panel { padding: 0.8rem; } }
  `
})
export class PlatformDashboardPage {
  readonly dashboard = signal<PlatformDashboard | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  constructor(
    private readonly api: PlatformDashboardApiService,
    private readonly apiError: ApiErrorService
  ) {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.api.getDashboard().subscribe({
      next: (dashboard) => { this.dashboard.set(dashboard); this.isLoading.set(false); },
      error: (error) => { this.errorMessage.set(this.apiError.toSafeMessage(error)); this.isLoading.set(false); }
    });
  }

  money(value: number): string {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(value);
  }

  mrrLabel(value: number): string {
    return value === 0 ? 'Not tracked in TM-EPOS MVP' : this.money(value);
  }

  change(value: number): string {
    if (value === 0) {
      return 'No change yet';
    }

    return `${value >= 0 ? '+' : '-'} ${Math.abs(value)}%`;
  }

  attentionIcon(type: string): string {
    return ({
      payment_failures: 'PF',
      expiring_subscriptions: 'EX',
      suspended_tenants: 'ST',
      setup_pending: 'SP',
      past_due_subscriptions: 'PD',
      pending_billing: 'PB',
      support_tickets: 'TK'
    } as Record<string, string>)[type] ?? '!';
  }

  attentionLink(type: string): string {
    return type === 'pending_billing' ? '/admin/billing' : '/admin/tenants';
  }

  attentionQueryParams(type: string): Record<string, string> | null {
    switch (type) {
      case 'suspended_tenants':
        return { status: 'suspended' };
      case 'setup_pending':
      case 'pending_activation':
        return { status: 'pending_activation' };
      case 'past_due_subscriptions':
        return { billingStatus: 'PAST_DUE' };
      default:
        return null;
    }
  }

  chartPoints(trend: PlatformTrendPoint[], key: 'tenants' | 'subscriptions' | 'mrr'): string {
    if (!trend.length) return '';
    const maximum = Math.max(1, ...trend.map((point) => Number(point[key])));
    return trend.map((point, index) => {
      const x = 45 + index * (655 / Math.max(1, trend.length - 1));
      const y = 220 - (Number(point[key]) / maximum) * 180;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  donutBackground(items: TenantStatusItem[]): string {
    const colors = ['#16a34a', '#1768e5', '#f97316', '#ef4444'];
    let cursor = 0;
    const stops = items.map((item, index) => {
      const start = cursor;
      cursor += item.percentage;
      return `${colors[index] ?? '#94a3b8'} ${start}% ${cursor}%`;
    });
    return stops.length ? `conic-gradient(${stops.join(', ')})` : '#e5e7eb';
  }
}
