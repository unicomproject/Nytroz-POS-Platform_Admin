import {
  PlatformTenantDetail,
  PlatformTenantFilterOptions,
  PlatformTenantListItem,
  PlatformTenantListQuery,
  PlatformTenantListResponse,
  PlatformTenantSummary
} from '../models/platform-tenant.model';
import { resolveTenantLifecycle, tenantLifecycleFilterOptions } from '../utils/tenant-lifecycle.util';

export interface PlatformTenantListItemApiDto {
  id: string;
  code: string;
  name: string;
  status: string;
  billingStatus: string;
  /** Authoritative tenant lifecycle from tenants.status. */
  lifecycleStatus?: string | null;
  operatingMode: string;
  baseCurrency: string;
  defaultTimezone: string;
  defaultLocale: string;
  businessType?: string | null;
  subscription?: PlatformTenantSubscriptionSummaryApiDto | null;
  outletCount: number;
  tillCount: number;
  userCount: number;
  onlineStoreEnabled: boolean;
  clickCollectEnabled: boolean;
  offlineEnabled: boolean;
  enabledFeatureIds?: string[];
  enabledFeatureCodes?: string[];
  createdAt: string;
  updatedAt?: string | null;
}

export interface PlatformTenantSubscriptionSummaryApiDto {
  planId: string;
  planName: string;
  planCode: string;
  subscriptionStatus: string;
}

export interface PlatformTenantListResponseApiDto {
  items: PlatformTenantListItemApiDto[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PlatformTenantSummaryApiDto {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  trialTenants: number;
  pendingActivationTenants?: number | null;
  pendingBillingCount: number;
  totalOutlets: number;
  totalTills: number;
}

export interface PlatformTenantFilterOptionPlanApiDto {
  id: string;
  name: string;
  planCode: string;
}

export interface PlatformTenantFilterOptionsApiDto {
  statuses: string[];
  billingStatuses: string[];
  operatingModes: string[];
  plans: PlatformTenantFilterOptionPlanApiDto[];
}

export interface PlatformTenantDetailApiDto extends PlatformTenantListItemApiDto {
  profile?: unknown;
  primaryAddress?: unknown;
  lastActivityAt?: string | null;
  canUpdate: boolean;
  canActivate: boolean;
  canSuspend: boolean;
  canManageEntitlements: boolean;
}

export function mapPlatformTenantListResponse(
  dto: PlatformTenantListResponseApiDto | null | undefined,
  fallbackQuery?: PlatformTenantListQuery
): PlatformTenantListResponse {
  const data = dto ?? {
    items: [],
    pageNumber: fallbackQuery?.pageNumber ?? 1,
    pageSize: fallbackQuery?.pageSize ?? 10,
    totalCount: 0,
    totalPages: 0
  };

  return {
    items: (data.items ?? []).map(mapPlatformTenantListItem),
    pageNumber: data.pageNumber,
    pageSize: data.pageSize,
    totalCount: data.totalCount,
    totalPages: data.totalPages
  };
}

export function mapPlatformTenantListItem(dto: PlatformTenantListItemApiDto): PlatformTenantListItem {
  const lifecycle = resolveTenantLifecycle({
    lifecycleStatus: dto.lifecycleStatus,
    status: dto.status
    // billingStatus intentionally omitted — it is a billing concern, not lifecycle,
    // when lifecycleStatus/status are absent we still prefer status over billingStatus
    // via resolveTenantLifecycle's ordered fallback (status before billingStatus).
  });

  const lifecycleValue = lifecycle.value ?? lifecycle.raw ?? dto.status;

  return {
    id: String(dto.id),
    code: dto.code,
    name: dto.name,
    email: null,
    ownerName: null,
    planName: dto.subscription?.planName ?? null,
    region: null,
    status: lifecycleValue,
    lifecycleStatus: lifecycleValue,
    userCount: dto.userCount,
    outletCount: dto.outletCount,
    createdOn: dto.createdAt,
    lastActivityAt: dto.updatedAt ?? null
  };
}

export function mapPlatformTenantSummary(dto: PlatformTenantSummaryApiDto | null | undefined): PlatformTenantSummary {
  const data = dto ?? {
    totalTenants: 0,
    activeTenants: 0,
    suspendedTenants: 0,
    trialTenants: 0,
    pendingActivationTenants: null,
    pendingBillingCount: 0,
    totalOutlets: 0,
    totalTills: 0
  };

  const pendingActivationTenants =
    data.pendingActivationTenants == null ? null : Number(data.pendingActivationTenants);

  // Keep a non-pending residual for legacy inactiveTenants consumers only.
  // Pending Activation KPI must use pendingActivationTenants exclusively.
  const residualInactive = Math.max(
    0,
    data.totalTenants
      - data.activeTenants
      - data.suspendedTenants
      - data.trialTenants
      - (pendingActivationTenants ?? 0)
  );

  return {
    totalTenants: data.totalTenants,
    activeTenants: data.activeTenants,
    suspendedTenants: data.suspendedTenants,
    inactiveTenants: residualInactive,
    trialTenants: data.trialTenants,
    pendingActivationTenants
  };
}

export function mapPlatformTenantFilterOptions(
  dto: PlatformTenantFilterOptionsApiDto | null | undefined
): PlatformTenantFilterOptions {
  const data = dto ?? { statuses: [], billingStatuses: [], operatingModes: [], plans: [] };

  return {
    plans: (data.plans ?? []).map((plan) => ({
      id: String(plan.id),
      name: plan.name,
      planCode: plan.planCode
    })),
    regions: [],
    statuses: tenantLifecycleFilterOptions(data.statuses).map((item) => item.value),
    billingStatuses: data.billingStatuses ?? [],
    operatingModes: data.operatingModes ?? []
  };
}

export function mapPlatformTenantDetail(dto: PlatformTenantDetailApiDto): PlatformTenantDetail {
  return {
    ...mapPlatformTenantListItem(dto),
    code: dto.code,
    // Billing concern only — separate from lifecycleStatus.
    billingStatus: dto.billingStatus,
    operatingMode: dto.operatingMode,
    baseCurrency: dto.baseCurrency,
    defaultTimezone: dto.defaultTimezone,
    defaultLocale: dto.defaultLocale,
    businessType: dto.businessType ?? null,
    tillCount: dto.tillCount,
    onlineStoreEnabled: dto.onlineStoreEnabled,
    clickCollectEnabled: dto.clickCollectEnabled,
    offlineEnabled: dto.offlineEnabled,
    enabledFeatureIds: (dto.enabledFeatureIds ?? []).map(String),
    enabledFeatureCodes: dto.enabledFeatureCodes ?? [],
    subscription: dto.subscription
      ? {
          planId: String(dto.subscription.planId),
          planName: dto.subscription.planName,
          planCode: dto.subscription.planCode,
          subscriptionStatus: dto.subscription.subscriptionStatus
        }
      : null,
    lastActivityAt: dto.lastActivityAt ?? dto.updatedAt ?? null,
    canUpdate: dto.canUpdate,
    canActivate: dto.canActivate,
    canSuspend: dto.canSuspend,
    canManageEntitlements: dto.canManageEntitlements
  };
}

export function mapPlatformTenantListQueryParams(query: PlatformTenantListQuery): Record<string, string> {
  const params: Record<string, string> = {};

  if (query.pageNumber) {
    params['pageNumber'] = String(query.pageNumber);
  }

  if (query.pageSize) {
    params['pageSize'] = String(query.pageSize);
  }

  if (query.search?.trim()) {
    params['search'] = query.search.trim();
  }

  if (query.status?.trim()) {
    params['status'] = query.status.trim();
  }

  if (query.billingStatus?.trim()) {
    params['billingStatus'] = query.billingStatus.trim();
  }

  if (query.planId?.trim()) {
    params['planId'] = query.planId.trim();
  }

  if (query.sortBy?.trim()) {
    params['sortBy'] = query.sortBy.trim() === 'createdOn' ? 'createdAt' : query.sortBy.trim();
  }

  if (query.sortDirection) {
    params['sortDirection'] = query.sortDirection;
  }

  return params;
}
