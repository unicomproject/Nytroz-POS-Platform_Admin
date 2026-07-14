import {
  PlatformTenantEntitlementCatalogFeature,
  PlatformTenantEntitlementCatalogModule,
  PlatformTenantEntitlementOptions,
  PlatformTenantEntitlementPlanOption,
  UpdatePlatformTenantEntitlementsRequest
} from '../models/platform-tenant-entitlements.model';

export interface PlatformTenantEntitlementCatalogFeatureApiDto {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

export interface PlatformTenantEntitlementCatalogModuleApiDto {
  id: string;
  code: string;
  name: string;
  features: PlatformTenantEntitlementCatalogFeatureApiDto[];
}

export interface PlatformTenantEntitlementPlanOptionApiDto {
  id: string;
  code: string;
  name: string;
  status: string;
  includedFeatureIds: string[];
  includedFeatureCodes: string[];
}

export interface PlatformTenantEntitlementOptionsApiDto {
  tenantId: string;
  currentSubscriptionPlanId?: string | null;
  currentSubscriptionPlanCode?: string | null;
  currentSubscriptionPlanName?: string | null;
  enabledFeatureIds: string[];
  enabledFeatureCodes: string[];
  plans: PlatformTenantEntitlementPlanOptionApiDto[];
  catalogModules: PlatformTenantEntitlementCatalogModuleApiDto[];
}

export function mapPlatformTenantEntitlementOptions(
  dto: PlatformTenantEntitlementOptionsApiDto | null | undefined
): PlatformTenantEntitlementOptions {
  const data = dto ?? {
    tenantId: '',
    enabledFeatureIds: [],
    enabledFeatureCodes: [],
    plans: [],
    catalogModules: []
  };

  return {
    tenantId: String(data.tenantId),
    currentSubscriptionPlanId: data.currentSubscriptionPlanId ? String(data.currentSubscriptionPlanId) : null,
    currentSubscriptionPlanCode: data.currentSubscriptionPlanCode ?? null,
    currentSubscriptionPlanName: data.currentSubscriptionPlanName ?? null,
    enabledFeatureIds: (data.enabledFeatureIds ?? []).map(String),
    enabledFeatureCodes: data.enabledFeatureCodes ?? [],
    plans: (data.plans ?? []).map(mapPlatformTenantEntitlementPlanOption),
    catalogModules: (data.catalogModules ?? []).map(mapPlatformTenantEntitlementCatalogModule)
  };
}

export function mapPlatformTenantEntitlementPlanOption(
  dto: PlatformTenantEntitlementPlanOptionApiDto
): PlatformTenantEntitlementPlanOption {
  return {
    id: String(dto.id),
    code: dto.code,
    name: dto.name,
    status: dto.status,
    includedFeatureIds: (dto.includedFeatureIds ?? []).map(String),
    includedFeatureCodes: dto.includedFeatureCodes ?? []
  };
}

export function mapPlatformTenantEntitlementCatalogModule(
  dto: PlatformTenantEntitlementCatalogModuleApiDto
): PlatformTenantEntitlementCatalogModule {
  return {
    id: String(dto.id),
    code: dto.code,
    name: dto.name,
    features: (dto.features ?? []).map(mapPlatformTenantEntitlementCatalogFeature)
  };
}

export function mapPlatformTenantEntitlementCatalogFeature(
  dto: PlatformTenantEntitlementCatalogFeatureApiDto
): PlatformTenantEntitlementCatalogFeature {
  return {
    id: String(dto.id),
    code: dto.code,
    name: dto.name,
    description: dto.description ?? null
  };
}

export function mapUpdatePlatformTenantEntitlementsRequest(
  request: UpdatePlatformTenantEntitlementsRequest
): Record<string, unknown> {
  return {
    subscriptionPlanId: request.subscriptionPlanId,
    enabledFeatureIds: request.enabledFeatureIds,
    enabledFeatureCodes: request.enabledFeatureCodes
  };
}
