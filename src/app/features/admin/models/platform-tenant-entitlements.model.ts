export interface PlatformTenantEntitlementCatalogFeature {
  id: string;
  code: string;
  name: string;
  description: string | null;
  planIncluded: boolean;
  isOverridden: boolean;
  sourceType: string | null;
  overrideReason: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
}

export interface PlatformTenantEntitlementCatalogModule {
  id: string;
  code: string;
  name: string;
  features: PlatformTenantEntitlementCatalogFeature[];
}

export interface PlatformTenantEntitlementPlanOption {
  id: string;
  code: string;
  name: string;
  status: string;
  includedFeatureIds: string[];
  includedFeatureCodes: string[];
}

export interface PlatformTenantEntitlementOptions {
  tenantId: string;
  currentSubscriptionPlanId: string | null;
  currentSubscriptionPlanCode: string | null;
  currentSubscriptionPlanName: string | null;
  enabledFeatureIds: string[];
  enabledFeatureCodes: string[];
  plans: PlatformTenantEntitlementPlanOption[];
  catalogModules: PlatformTenantEntitlementCatalogModule[];
}

export interface UpdatePlatformTenantEntitlementsRequest {
  subscriptionPlanId?: string;
  enabledFeatureIds: string[];
  enabledFeatureCodes: string[];
  sourceType?: string;
  overrideReason?: string;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  concurrencyVersion?: string;
}
