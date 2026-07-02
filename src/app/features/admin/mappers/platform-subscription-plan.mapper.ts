import {
  ModuleAvailability,
  SubscriptionPlanCatalogFeature,
  SubscriptionPlanCatalogModule,
  SubscriptionPlanCatalogResponse,
  SubscriptionPlanDraft,
  SubscriptionPlanFeaturesMutationResponse,
  SubscriptionPlanFeaturesUpdateRequest,
  SubscriptionPlanLimitsMutationResponse,
  SubscriptionPlanListItem,
  SubscriptionPlanListQuery,
  SubscriptionPlanListResponse,
  SubscriptionPlanMutationResponse,
  SubscriptionPlanPricingMutationResponse
} from '../models/platform-subscription-plan.model';

export interface SubscriptionPlanListItemApiDto {
  id: string;
  planCode: string;
  name: string;
  description?: string | null;
  status: string;
  billingCycle: string;
  baseCurrency: string;
  basePrice: number;
  maxOutlets?: number | null;
  maxUsers?: number | null;
  maxTills?: number | null;
  featureCount: number;
  activeTenantCount: number;
  canEdit: boolean;
  canDuplicate: boolean;
  canArchive: boolean;
  canDelete: boolean;
  updatedAt: string;
}

export interface SubscriptionPlanListResponseApiDto {
  items: SubscriptionPlanListItemApiDto[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  canCreate: boolean;
  canEdit: boolean;
  canDuplicate: boolean;
  canArchive: boolean;
  canDelete: boolean;
}

export interface SubscriptionPlanCatalogModuleApiDto {
  id: string;
  moduleCode: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  features: SubscriptionPlanCatalogFeatureApiDto[];
}

export interface SubscriptionPlanCatalogFeatureApiDto {
  id: string;
  featureCode: string;
  name: string;
  description?: string | null;
  sortOrder: number;
}

export interface SubscriptionPlanCatalogResponseApiDto {
  modules: SubscriptionPlanCatalogModuleApiDto[];
}

export interface SubscriptionPlanMutationResponseApiDto {
  id: string;
  planCode: string;
  name: string;
  status: string;
  billingCycle?: string;
  baseCurrency?: string;
  basePrice?: number;
  maxOutlets?: number | null;
  maxUsers?: number | null;
  maxTills?: number | null;
  featureCount?: number;
  updatedAt?: string;
}

export function mapSubscriptionPlanListResponse(
  dto: SubscriptionPlanListResponseApiDto | null | undefined,
  fallbackQuery?: SubscriptionPlanListQuery
): SubscriptionPlanListResponse {
  const data = dto ?? {
    items: [],
    pageNumber: fallbackQuery?.pageNumber ?? 1,
    pageSize: fallbackQuery?.pageSize ?? 10,
    totalCount: 0,
    totalPages: 0,
    canCreate: false,
    canEdit: false,
    canDuplicate: false,
    canArchive: false,
    canDelete: false
  };

  const items = (data.items ?? []).map(mapSubscriptionPlanListItem);
  const statusCounts = buildStatusCounts(items, data.totalCount);

  return {
    items,
    pageNumber: data.pageNumber,
    pageSize: data.pageSize,
    totalItems: data.totalCount,
    totalPages: data.totalPages,
    hasPreviousPage: data.pageNumber > 1,
    hasNextPage: data.pageNumber < data.totalPages,
    statusCounts
  };
}

export function mapSubscriptionPlanListItem(dto: SubscriptionPlanListItemApiDto): SubscriptionPlanListItem {
  const billingCycle = normalizeBillingCycle(dto.billingCycle);
  const monthlyPrice = billingCycle === 'annual' ? null : dto.basePrice;
  const annualPrice = billingCycle === 'monthly' ? null : dto.basePrice;

  return {
    id: String(dto.id),
    planName: dto.name,
    planCode: dto.planCode,
    planType: derivePlanType(dto.basePrice),
    billingCycle,
    currencyCode: dto.baseCurrency,
    tenantMonthlyPrice: monthlyPrice,
    tenantAnnualPrice: annualPrice,
    annualDiscountPercentage: null,
    includedModulesCount: dto.featureCount,
    addOnsCount: 0,
    activeTenantsCount: dto.activeTenantCount,
    status: normalizePlanStatus(dto.status),
    isDefault: false,
    lastUpdatedAt: dto.updatedAt,
    canView: true,
    canEdit: dto.canEdit,
    canDuplicate: dto.canDuplicate,
    canArchive: dto.canArchive,
    canDelete: dto.canDelete,
    deleteBlockedReason: dto.canDelete ? null : 'Plan cannot be deleted in its current state'
  };
}

export function mapSubscriptionPlanCatalog(
  dto: SubscriptionPlanCatalogResponseApiDto | null | undefined
): SubscriptionPlanCatalogResponse {
  return {
    modules: (dto?.modules ?? []).map(mapSubscriptionPlanCatalogModule)
  };
}

function mapSubscriptionPlanCatalogModule(dto: SubscriptionPlanCatalogModuleApiDto): SubscriptionPlanCatalogModule {
  return {
    id: String(dto.id),
    code: dto.moduleCode,
    name: dto.name,
    description: dto.description ?? null,
    sortOrder: dto.sortOrder,
    isCore: false,
    isLocked: false,
    defaultAvailability: 'not_available',
    features: (dto.features ?? []).map((feature) => mapSubscriptionPlanCatalogFeature(dto, feature))
  };
}

function mapSubscriptionPlanCatalogFeature(
  module: SubscriptionPlanCatalogModuleApiDto,
  dto: SubscriptionPlanCatalogFeatureApiDto
): SubscriptionPlanCatalogFeature {
  return {
    id: String(dto.id),
    code: dto.featureCode,
    name: dto.name,
    description: dto.description ?? null,
    entitlementKey: dto.featureCode,
    sortOrder: dto.sortOrder,
    isCore: false,
    isLocked: false,
    defaultAvailability: 'not_available'
  };
}

export function mapCreateSubscriptionPlanRequest(draft: SubscriptionPlanDraft): Record<string, unknown> {
  const request: Record<string, unknown> = {
    name: draft.planName,
    planCode: draft.planCode,
    description: draft.description,
    billingCycle: draft.billingCycle,
    baseCurrency: draft.baseCurrency
  };

  if (draft.basePrice != null && draft.basePrice >= 0) {
    request['basePrice'] = draft.basePrice;
  }

  if (draft.maxOutlets != null) {
    request['maxOutlets'] = draft.maxOutlets;
  }

  if (draft.maxTills != null) {
    request['maxTills'] = draft.maxTills;
  }

  if (draft.maxUsers != null) {
    request['maxUsers'] = draft.maxUsers;
  }

  return request;
}

export function mapSubscriptionPlanFeaturesRequest(
  request: SubscriptionPlanFeaturesUpdateRequest
): Record<string, unknown> {
  const featureIds = Object.entries(request.featureAvailability)
    .filter(([, availability]) => availability === 'included')
    .map(([featureId]) => featureId);

  return { featureIds };
}

export function mapSubscriptionPlanMutationResponse(
  dto: SubscriptionPlanMutationResponseApiDto
): SubscriptionPlanMutationResponse {
  return {
    id: String(dto.id),
    planName: dto.name,
    planCode: dto.planCode,
    status: normalizePlanStatus(dto.status)
  };
}

export function mapSubscriptionPlanPricingMutationResponse(
  dto: SubscriptionPlanMutationResponseApiDto
): SubscriptionPlanPricingMutationResponse {
  return {
    id: String(dto.id),
    basePrice: dto.basePrice ?? 0,
    status: normalizePlanStatus(dto.status)
  };
}

export function mapSubscriptionPlanLimitsMutationResponse(
  dto: SubscriptionPlanMutationResponseApiDto
): SubscriptionPlanLimitsMutationResponse {
  return {
    id: String(dto.id),
    maxOutlets: dto.maxOutlets ?? null,
    maxTills: dto.maxTills ?? null,
    maxUsers: dto.maxUsers ?? null,
    status: normalizePlanStatus(dto.status)
  };
}

export function mapSubscriptionPlanFeaturesMutationResponse(
  dto: SubscriptionPlanMutationResponseApiDto,
  requestedFeatureIds: string[]
): SubscriptionPlanFeaturesMutationResponse {
  return {
    id: String(dto.id),
    includedFeatureIds: requestedFeatureIds,
    status: normalizePlanStatus(dto.status)
  };
}

export function mapSubscriptionPlanListQueryParams(query: SubscriptionPlanListQuery): Record<string, string> {
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
    params['status'] = mapUiPlanStatusFilter(query.status.trim());
  }

  if (query.billingCycle?.trim()) {
    params['billingCycle'] = query.billingCycle.trim();
  }

  return params;
}

function buildStatusCounts(items: SubscriptionPlanListItem[], totalCount: number) {
  const draft = items.filter((item) => item.status === 'draft').length;
  const published = items.filter((item) => item.status === 'active').length;
  const archived = items.filter((item) => item.status === 'retired').length;

  return {
    all: totalCount,
    draft,
    published,
    archived
  };
}

function normalizePlanStatus(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'active') {
    return 'active';
  }

  if (normalized === 'retired' || normalized === 'archived') {
    return 'retired';
  }

  return 'draft';
}

function mapUiPlanStatusFilter(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'published') {
    return 'active';
  }

  return normalized;
}

function normalizeBillingCycle(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'yearly' || normalized === 'annual') {
    return 'annual';
  }

  if (normalized === 'monthly') {
    return 'monthly';
  }

  return normalized;
}

function derivePlanType(basePrice: number): string {
  return basePrice > 0 ? 'paid' : 'free';
}

