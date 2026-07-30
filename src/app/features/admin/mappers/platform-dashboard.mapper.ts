import {
  DashboardSectionStatus,
  PlatformAttentionItem,
  PlatformDashboard,
  PlatformDashboardMrrGroup,
  PlatformDashboardPermissions,
  PlatformFootprint,
  PlatformRecentTenant,
  PlatformSystemHealth,
  PlatformTrendPoint,
  SubscriptionStatusSnapshot,
  TenantStatusItem,
  TenantStatusSnapshot
} from '../models/platform-dashboard.model';
import { platformPermissions } from '../../../core/config/permission-keys';
import { AccessControlService } from '../../../core/services/access-control.service';

export interface PlatformDashboardApiDto {
  generatedAt?: string;
  tenantSummary?: DashboardSectionApiDto<PlatformDashboardTenantSummaryApiDto>;
  subscriptionSummary?: DashboardSectionApiDto<PlatformDashboardSubscriptionSummaryApiDto> | null;
  revenueSummary?: DashboardSectionApiDto<PlatformDashboardRevenueSummaryApiDto> | null;
  trends?: DashboardSectionApiDto<PlatformDashboardTrendsApiDto> | null;
  attentionSummary?: DashboardSectionApiDto<PlatformDashboardAttentionSummaryApiDto>;
  platformFootprint?: DashboardSectionApiDto<PlatformDashboardFootprintApiDto>;
  systemHealth?: DashboardSectionApiDto<PlatformDashboardSystemHealthApiDto>;
  recentTenants?: DashboardSectionApiDto<PlatformDashboardRecentTenantApiDto[]>;
  // Legacy flat fields
  totalTenants?: number | null;
  activeTenants?: number | null;
  suspendedTenants?: number | null;
  inactiveTenants?: number | null;
  setupPendingTenants?: number | null;
  trialTenants?: number | null;
  totalSubscriptions?: number | null;
  activeSubscriptions?: number | null;
  pastDueSubscriptions?: number | null;
  cancelledSubscriptions?: number | null;
  expiredSubscriptions?: number | null;
  pendingBillingCount?: number | null;
  totalOutlets?: number | null;
  totalTills?: number | null;
  totalUsers?: number | null;
  totalTenantUsers?: number | null;
  totalPlatformUsers?: number | null;
  recentTenantsList?: PlatformDashboardRecentTenantApiDto[] | null;
  attentionItems?: PlatformDashboardAttentionItemApiDto[] | null;
}

export interface DashboardSectionApiDto<T> {
  status: DashboardSectionStatus;
  errorCode?: string | null;
  data?: T | null;
}

export interface PlatformDashboardTenantSummaryApiDto {
  totalTenants: number;
  activeTenants: number;
  setupPendingTenants: number;
  suspendedTenants: number;
  inactiveTenants: number;
  lifecycle: Array<{ bucket: string; count: number }>;
}

export interface PlatformDashboardSubscriptionSummaryApiDto {
  totalSubscriptions: number;
  trialSubscriptions: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
}

export interface PlatformDashboardRevenueSummaryApiDto {
  mrrByCurrency: Array<{ currencyCode: string; decimalPlaces: number; amount: number }>;
  calculatedAt: string;
}

export interface PlatformDashboardTrendsApiDto {
  timezone: string;
  tenantGrowth: PlatformDashboardTrendSeriesApiDto;
  subscriptionTrend?: PlatformDashboardTrendSeriesApiDto | null;
  mrrTrends: PlatformDashboardTrendSeriesApiDto[];
}

export interface PlatformDashboardTrendSeriesApiDto {
  metric: string;
  currencyCode?: string | null;
  changePercent?: number | null;
  changeStatus: string;
  points: Array<{ date: string; value: number }>;
}

export interface PlatformDashboardAttentionSummaryApiDto {
  items: PlatformDashboardAttentionItemApiDto[];
  totalCount: number;
}

export interface PlatformDashboardFootprintApiDto {
  totalOutlets: number;
  totalTills: number;
  totalTenantUsers: number;
  totalPlatformUsers?: number | null;
}

export interface PlatformDashboardSystemHealthApiDto {
  overallStatus: string;
  checkedAt?: string | null;
  dependencies: Array<{ name: string; status: string; isCritical: boolean; message?: string | null }>;
}

export interface PlatformDashboardRecentTenantApiDto {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
}

export interface PlatformDashboardAttentionItemApiDto {
  type: string;
  title: string;
  description: string;
  count: number;
  severity: string;
}

export function mapPlatformDashboard(
  dto: PlatformDashboardApiDto | null | undefined,
  access: AccessControlService
): PlatformDashboard {
  const data = dto ?? {};
  const permissions: PlatformDashboardPermissions = {
    canViewTenants: access.hasPermission(platformPermissions.tenantsView),
    canViewTenantSubscriptions: access.hasPermission(platformPermissions.tenantSubscriptionsView),
    canViewBilling: access.hasPermission(platformPermissions.billingView),
    canViewUsers: access.hasPermission(platformPermissions.usersView)
  };

  const tenant = data.tenantSummary?.data;
  const subscription = data.subscriptionSummary?.status === 'SUCCESS' ? data.subscriptionSummary.data : null;
  const attentionItems = (data.attentionSummary?.data?.items ?? data.attentionItems ?? []).map(mapAttentionItem);
  const recent = (data.recentTenants?.data ?? data.recentTenantsList ?? []).map(mapRecentTenant);
  const footprint = mapFootprint(data);
  const systemHealth = mapSystemHealth(data);
  const revenue = mapRevenue(data, permissions);
  const trends = data.trends;
  const tenantGrowth = trends?.status === 'SUCCESS' ? trends.data?.tenantGrowth : null;
  const subscriptionTrend = trends?.status === 'SUCCESS' ? trends.data?.subscriptionTrend : null;

  const sectionErrors: string[] = [];
  for (const section of [
    data.tenantSummary,
    data.subscriptionSummary,
    data.revenueSummary,
    data.trends,
    data.attentionSummary,
    data.platformFootprint,
    data.systemHealth,
    data.recentTenants
  ]) {
    if (section?.status === 'UNAVAILABLE' && section.errorCode) {
      sectionErrors.push(section.errorCode);
    }
  }

  const lifecycleItems = (tenant?.lifecycle ?? []).map((row) => ({
    status: row.bucket,
    count: row.count
  }));

  return {
    generatedAt: data.generatedAt ?? null,
    permissions,
    sectionErrors,
    kpis: {
      totalTenants: tenant?.totalTenants ?? data.totalTenants ?? null,
      totalTenantsChangePercent: tenantGrowth?.changePercent ?? null,
      totalTenantsChangeStatus: tenantGrowth?.changeStatus ?? null,
      activeSubscriptions: permissions.canViewTenantSubscriptions
        ? (subscription?.activeSubscriptions ?? data.activeSubscriptions ?? null)
        : null,
      activeSubscriptionsChangePercent: subscriptionTrend?.changePercent ?? null,
      activeSubscriptionsChangeStatus: subscriptionTrend?.changeStatus ?? null,
      itemsRequiringAttention: attentionItems.reduce((sum, item) => sum + item.count, 0),
      systemHealthLabel: formatHealthLabel(systemHealth?.overallStatus ?? null),
      systemHealthStatus: systemHealth?.overallStatus ?? null
    },
    statusOverview: {
      tenantGrowth: tenant?.totalTenants ?? data.totalTenants ?? null,
      tenantGrowthChangePercent: tenantGrowth?.changePercent ?? null,
      tenantGrowthChangeStatus: tenantGrowth?.changeStatus ?? null,
      subscriptionHealthPercent: subscription
        ? subscription.totalSubscriptions > 0
          ? Math.round((subscription.activeSubscriptions / subscription.totalSubscriptions) * 100)
          : 100
        : null,
      activeSubscriptionCount: subscription?.activeSubscriptions ?? null,
      atRiskSubscriptionCount: subscription
        ? Math.max(0, subscription.totalSubscriptions - subscription.activeSubscriptions)
        : null,
      trend: buildCombinedTrend(trends),
      trendsUnavailable: trends?.status === 'UNAVAILABLE',
      trendsErrorCode: trends?.errorCode ?? null
    },
    attention: attentionItems,
    recentTenants: recent,
    tenantStatusSnapshot: buildSnapshot(
      tenant?.totalTenants ?? data.totalTenants ?? 0,
      lifecycleItems.length
        ? lifecycleItems
        : [
            { status: 'Active', count: tenant?.activeTenants ?? data.activeTenants ?? 0 },
            { status: 'Setup Pending', count: tenant?.setupPendingTenants ?? data.setupPendingTenants ?? 0 },
            { status: 'Suspended', count: tenant?.suspendedTenants ?? data.suspendedTenants ?? 0 },
            { status: 'Inactive', count: tenant?.inactiveTenants ?? data.inactiveTenants ?? 0 }
          ]
    ),
    subscriptionSnapshot: subscription
      ? buildSubscriptionSnapshot(subscription)
      : null,
    footprint,
    systemHealth,
    revenue
  };
}

function mapRevenue(
  data: PlatformDashboardApiDto,
  permissions: PlatformDashboardPermissions
): PlatformDashboard['revenue'] {
  if (!permissions.canViewTenantSubscriptions || !permissions.canViewBilling) {
    return { status: 'HIDDEN', errorCode: null, groups: [] };
  }

  const section = data.revenueSummary;
  if (!section) {
    return { status: 'UNAVAILABLE', errorCode: 'platform_dashboard.section_calculation_failed', groups: [] };
  }

  if (section.status !== 'SUCCESS') {
    return {
      status: section.status,
      errorCode: section.errorCode ?? null,
      groups: []
    };
  }

  const groups: PlatformDashboardMrrGroup[] = (section.data?.mrrByCurrency ?? []).map((g) => ({
    currencyCode: g.currencyCode,
    decimalPlaces: g.decimalPlaces,
    amount: g.amount
  }));

  return { status: 'SUCCESS', errorCode: null, groups };
}

function mapFootprint(data: PlatformDashboardApiDto): PlatformFootprint | null {
  const section = data.platformFootprint;
  if (section?.status === 'SUCCESS' && section.data) {
    return {
      totalOutlets: section.data.totalOutlets,
      totalTills: section.data.totalTills,
      totalTenantUsers: section.data.totalTenantUsers,
      totalPlatformUsers: section.data.totalPlatformUsers ?? null
    };
  }

  if (data.totalOutlets == null && data.totalTills == null && data.totalUsers == null) {
    return null;
  }

  return {
    totalOutlets: data.totalOutlets ?? 0,
    totalTills: data.totalTills ?? 0,
    totalTenantUsers: data.totalTenantUsers ?? data.totalUsers ?? 0,
    totalPlatformUsers: data.totalPlatformUsers ?? null
  };
}

function mapSystemHealth(data: PlatformDashboardApiDto): PlatformSystemHealth | null {
  const section = data.systemHealth;
  if (section?.status !== 'SUCCESS' || !section.data) {
    return null;
  }

  return {
    overallStatus: section.data.overallStatus,
    checkedAt: section.data.checkedAt ?? null,
    dependencies: (section.data.dependencies ?? []).map((d) => ({
      name: d.name,
      status: d.status,
      isCritical: d.isCritical,
      message: d.message ?? null
    }))
  };
}

function buildCombinedTrend(
  trends: DashboardSectionApiDto<PlatformDashboardTrendsApiDto> | null | undefined
): PlatformTrendPoint[] {
  if (trends?.status !== 'SUCCESS' || !trends.data) {
    return [];
  }

  const tenantPoints = new Map(trends.data.tenantGrowth.points.map((p) => [p.date, p.value]));
  const subscriptionPoints = new Map(
    (trends.data.subscriptionTrend?.points ?? []).map((p) => [p.date, p.value])
  );
  const mrrPoints = new Map<string, number>();
  for (const series of trends.data.mrrTrends ?? []) {
    for (const point of series.points) {
      mrrPoints.set(point.date, (mrrPoints.get(point.date) ?? 0) + point.value);
    }
  }

  const dates = new Set<string>([
    ...tenantPoints.keys(),
    ...subscriptionPoints.keys(),
    ...mrrPoints.keys()
  ]);

  return [...dates]
    .sort()
    .map((date) => ({
      date,
      tenants: tenantPoints.get(date) ?? 0,
      subscriptions: subscriptionPoints.get(date) ?? 0,
      mrr: mrrPoints.get(date) ?? 0
    }));
}

function buildSnapshot(total: number, rows: { status: string; count: number }[]): TenantStatusSnapshot {
  return {
    total,
    items: rows.map((row) => ({
      status: row.status,
      count: row.count,
      percentage: total > 0 ? Math.round((row.count / total) * 1000) / 10 : 0
    }))
  };
}

function buildSubscriptionSnapshot(
  subscription: PlatformDashboardSubscriptionSummaryApiDto
): SubscriptionStatusSnapshot {
  const rows = [
    { status: 'Trial', count: subscription.trialSubscriptions },
    { status: 'Active Paid', count: subscription.activeSubscriptions },
    { status: 'Past Due', count: subscription.pastDueSubscriptions },
    { status: 'Cancelled', count: subscription.cancelledSubscriptions },
    { status: 'Expired', count: subscription.expiredSubscriptions }
  ];
  return {
    total: subscription.totalSubscriptions,
    items: rows.map((row) => ({
      status: row.status,
      count: row.count,
      percentage:
        subscription.totalSubscriptions > 0
          ? Math.round((row.count / subscription.totalSubscriptions) * 1000) / 10
          : 0
    }))
  };
}

function mapAttentionItem(item: PlatformDashboardAttentionItemApiDto): PlatformAttentionItem {
  return {
    type: item.type,
    title: item.title,
    description: item.description,
    count: item.count,
    severity: item.severity
  };
}

function mapRecentTenant(tenant: PlatformDashboardRecentTenantApiDto): PlatformRecentTenant {
  return {
    id: tenant.id,
    code: tenant.code,
    name: tenant.name,
    status: tenant.status,
    createdAt: tenant.createdAt
  };
}

function formatHealthLabel(status: string | null): string {
  if (!status) {
    return 'Unavailable';
  }

  switch (status.toUpperCase()) {
    case 'HEALTHY':
      return 'Healthy';
    case 'DEGRADED':
      return 'Degraded';
    case 'CRITICAL':
      return 'Critical';
    case 'UNKNOWN':
      return 'Unknown';
    default:
      return status;
  }
}
