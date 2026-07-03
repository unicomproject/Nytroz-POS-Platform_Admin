export interface PlatformTenantListItem {
  id: string;
  code: string;
  name: string;
  email: string | null;
  ownerName: string | null;
  planName: string | null;
  region: string | null;
  status: string;
  userCount: number;
  outletCount: number;
  createdOn: string;
  lastActivityAt: string | null;
}

export interface PlatformTenantListResponse {
  items: PlatformTenantListItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PlatformTenantSummary {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  inactiveTenants: number;
  trialTenants: number;
}

export interface PlatformTenantPlanFilterOption {
  id: string;
  name: string;
  planCode: string;
}

export interface PlatformTenantFilterOptions {
  plans: PlatformTenantPlanFilterOption[];
  regions: string[];
  statuses: string[];
  billingStatuses?: string[];
  operatingModes?: string[];
}

export interface PlatformTenantListQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  billingStatus?: string;
  planId?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PlatformTenantSubscriptionDetail {
  planId: string;
  planName: string;
  planCode: string;
  subscriptionStatus: string;
}

export interface PlatformTenantDetail extends PlatformTenantListItem {
  code: string;
  billingStatus: string;
  operatingMode: string;
  baseCurrency: string;
  defaultTimezone: string;
  defaultLocale: string;
  businessType: string | null;
  tillCount: number;
  onlineStoreEnabled: boolean;
  clickCollectEnabled: boolean;
  offlineEnabled: boolean;
  enabledFeatureIds: string[];
  enabledFeatureCodes: string[];
  subscription: PlatformTenantSubscriptionDetail | null;
  canUpdate: boolean;
  canActivate: boolean;
  canSuspend: boolean;
  canManageEntitlements: boolean;
}
