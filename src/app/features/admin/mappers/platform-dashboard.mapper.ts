import {
  PlatformActivityItem,
  PlatformAttentionItem,
  PlatformDashboard,
  TenantStatusItem
} from '../models/platform-dashboard.model';

export interface PlatformDashboardApiDto {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  trialTenants: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  pendingBillingCount: number;
  totalOutlets: number;
  totalTills: number;
  totalUsers: number;
  recentTenants: PlatformDashboardRecentTenantApiDto[];
  attentionItems: PlatformDashboardAttentionItemApiDto[];
  generatedAt: string;
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

export function mapPlatformDashboard(dto: PlatformDashboardApiDto | null | undefined): PlatformDashboard {
  const data = dto ?? emptyDashboardDto();
  const attention = (data.attentionItems ?? []).map(mapAttentionItem);
  const itemsRequiringAttention = attention.reduce((sum, item) => sum + item.count, 0);
  const inactiveTenants = Math.max(
    0,
    data.totalTenants - data.activeTenants - data.suspendedTenants - data.trialTenants
  );
  const subscriptionHealthPercent =
    data.totalSubscriptions > 0
      ? Math.round((data.activeSubscriptions / data.totalSubscriptions) * 100)
      : 100;
  const atRiskSubscriptionCount = Math.max(0, data.totalSubscriptions - data.activeSubscriptions);

  return {
    kpis: {
      totalTenants: data.totalTenants,
      totalTenantsChangePercent: 0,
      activeSubscriptions: data.activeSubscriptions,
      activeSubscriptionsChangePercent: 0,
      monthlyRecurringRevenue: 0,
      monthlyRecurringRevenueChangePercent: 0,
      itemsRequiringAttention,
      itemsRequiringAttentionChangePercent: 0,
      systemHealth: itemsRequiringAttention > 0 ? 'Needs Attention' : 'Healthy'
    },
    statusOverview: {
      tenantGrowth: data.totalTenants,
      tenantGrowthChangePercent: 0,
      subscriptionHealthPercent,
      activeSubscriptionCount: data.activeSubscriptions,
      atRiskSubscriptionCount,
      revenueTrendTotal: 0,
      revenueTrendChangePercent: 0,
      trend: []
    },
    attention,
    recentActivity: (data.recentTenants ?? []).map(mapRecentTenantActivity),
    tenantStatusSnapshot: {
      total: data.totalTenants,
      items: buildTenantStatusSnapshot(data.totalTenants, [
        { status: 'Active', count: data.activeTenants },
        { status: 'Trial', count: data.trialTenants },
        { status: 'Suspended', count: data.suspendedTenants },
        { status: 'Inactive', count: inactiveTenants }
      ])
    }
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

function mapRecentTenantActivity(tenant: PlatformDashboardRecentTenantApiDto): PlatformActivityItem {
  return {
    type: 'tenant_created',
    message: `${tenant.name} (${tenant.status})`,
    occurredAt: tenant.createdAt
  };
}

function buildTenantStatusSnapshot(total: number, rows: { status: string; count: number }[]): TenantStatusItem[] {
  return rows.map((row) => ({
    status: row.status,
    count: row.count,
    percentage: total > 0 ? Math.round((row.count / total) * 1000) / 10 : 0
  }));
}

function emptyDashboardDto(): PlatformDashboardApiDto {
  return {
    totalTenants: 0,
    activeTenants: 0,
    suspendedTenants: 0,
    trialTenants: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    pendingBillingCount: 0,
    totalOutlets: 0,
    totalTills: 0,
    totalUsers: 0,
    recentTenants: [],
    attentionItems: [],
    generatedAt: new Date().toISOString()
  };
}
