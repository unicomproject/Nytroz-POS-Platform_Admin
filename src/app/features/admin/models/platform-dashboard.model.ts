export interface PlatformDashboard {
  kpis: PlatformDashboardKpis;
  statusOverview: PlatformStatusOverview;
  attention: PlatformAttentionItem[];
  recentActivity: PlatformActivityItem[];
  tenantStatusSnapshot: TenantStatusSnapshot;
}

export interface PlatformDashboardKpis {
  totalTenants: number;
  totalTenantsChangePercent: number;
  activeSubscriptions: number;
  activeSubscriptionsChangePercent: number;
  monthlyRecurringRevenue: number;
  monthlyRecurringRevenueChangePercent: number;
  itemsRequiringAttention: number;
  itemsRequiringAttentionChangePercent: number;
  systemHealth: string;
}

export interface PlatformStatusOverview {
  tenantGrowth: number;
  tenantGrowthChangePercent: number;
  subscriptionHealthPercent: number;
  activeSubscriptionCount: number;
  atRiskSubscriptionCount: number;
  revenueTrendTotal: number;
  revenueTrendChangePercent: number;
  trend: PlatformTrendPoint[];
}

export interface PlatformTrendPoint {
  date: string;
  tenants: number;
  subscriptions: number;
  mrr: number;
}

export interface PlatformAttentionItem {
  type: string;
  title: string;
  description: string;
  count: number;
  severity: string;
}

export interface PlatformActivityItem {
  type: string;
  message: string;
  occurredAt: string;
}

export interface TenantStatusSnapshot {
  total: number;
  items: TenantStatusItem[];
}

export interface TenantStatusItem {
  status: string;
  count: number;
  percentage: number;
}
