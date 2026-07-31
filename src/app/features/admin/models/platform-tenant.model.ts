export interface PlatformTenantListItem {
  id: string;
  code: string;
  name: string;
  email: string | null;
  ownerName: string | null;
  planName: string | null;
  region: string | null;
  /**
   * @deprecated Prefer lifecycleStatus. Retained for temporary compatibility.
   */
  status: string;
  /** Authoritative tenant lifecycle from tenants.status. */
  lifecycleStatus: string;
  userCount: number;
  outletCount: number;
  createdOn: string;
  lastActivityAt: string | null;
  setupCompletedSteps?: string[] | null;
  setupMissingSteps?: string[] | null;
  setupProgressPercent?: number | null;
  continueSetupPath?: string | null;
  concurrencyVersion?: string | null;
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
  /**
   * @deprecated Do not use for Pending Activation KPI.
   * Pending activation is exposed via pendingActivationTenants.
   */
  inactiveTenants: number;
  trialTenants: number;
  /** Count of tenants in PENDING_ACTIVATION only; null when unavailable. */
  pendingActivationTenants: number | null;
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
  statusGroup?: string;
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
  /** Billing concern only — never display as tenant lifecycle. */
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
  concurrencyVersion?: string | null;
}

export interface UpdatePlatformTenantRequest {
  name: string;
  baseCurrency: string;
  defaultTimezone: string;
  defaultLocale: string;
  operatingMode: string;
  businessType?: string | null;
  billingStatus: string;
  concurrencyVersion?: string;
}

export interface PlatformTenantAuditLogActor {
  platformUserId: string | null;
  email: string | null;
}

export interface PlatformTenantAuditLogItem {
  id: string;
  occurredAt: string;
  actor: PlatformTenantAuditLogActor;
  action: string;
  summary: string;
  reason: string | null;
}

export interface PlatformTenantAuditLogListResponse {
  items: PlatformTenantAuditLogItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

