export type DashboardSectionStatus = 'SUCCESS' | 'UNAVAILABLE' | 'PERMISSION_DENIED';

export interface DashboardSection<T> {
  status: DashboardSectionStatus;
  errorCode: string | null;
  data: T | null;
}

export interface PlatformDashboardMrrGroup {
  currencyCode: string;
  decimalPlaces: number;
  amount: number;
}

export interface PlatformDashboard {
  generatedAt: string | null;
  kpis: PlatformDashboardKpis;
  statusOverview: PlatformStatusOverview;
  attention: PlatformAttentionItem[];
  recentTenants: PlatformRecentTenant[];
  tenantStatusSnapshot: TenantStatusSnapshot;
  subscriptionSnapshot: SubscriptionStatusSnapshot | null;
  footprint: PlatformFootprint | null;
  systemHealth: PlatformSystemHealth | null;
  revenue: PlatformRevenueState;
  sectionErrors: string[];
  permissions: PlatformDashboardPermissions;
}

export interface PlatformDashboardPermissions {
  canViewTenants: boolean;
  canViewTenantSubscriptions: boolean;
  canViewBilling: boolean;
  canViewUsers: boolean;
}

export interface PlatformRevenueState {
  status: DashboardSectionStatus | 'HIDDEN';
  errorCode: string | null;
  groups: PlatformDashboardMrrGroup[];
}

export interface PlatformDashboardKpis {
  totalTenants: number | null;
  totalTenantsChangePercent: number | null;
  totalTenantsChangeStatus: string | null;
  activeSubscriptions: number | null;
  activeSubscriptionsChangePercent: number | null;
  activeSubscriptionsChangeStatus: string | null;
  itemsRequiringAttention: number;
  systemHealthLabel: string;
  systemHealthStatus: string | null;
}

export interface PlatformStatusOverview {
  tenantGrowth: number | null;
  tenantGrowthChangePercent: number | null;
  tenantGrowthChangeStatus: string | null;
  subscriptionHealthPercent: number | null;
  activeSubscriptionCount: number | null;
  atRiskSubscriptionCount: number | null;
  trend: PlatformTrendPoint[];
  trendsUnavailable: boolean;
  trendsErrorCode: string | null;
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

export interface PlatformRecentTenant {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
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

export interface SubscriptionStatusSnapshot {
  total: number;
  items: TenantStatusItem[];
}

export interface PlatformFootprint {
  totalOutlets: number;
  totalTills: number;
  totalTenantUsers: number;
  totalPlatformUsers: number | null;
}

export interface PlatformSystemHealth {
  overallStatus: string;
  checkedAt: string | null;
  dependencies: Array<{ name: string; status: string; isCritical: boolean; message: string | null }>;
}
