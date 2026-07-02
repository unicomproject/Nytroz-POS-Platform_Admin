import {
  CreatePlatformTenantRequest,
  TenantCreateOptions,
  TenantCreateWizardState
} from '../models/platform-tenant-create.model';

export interface TenantCreateLookupOptionApiDto {
  value: string;
  label: string;
}

export interface TenantCreatePlanOptionApiDto {
  id: string;
  planCode: string;
  name: string;
  description?: string | null;
  status: string;
  billingCycle: string;
  baseCurrency: string;
  basePrice: number;
  maxOutlets?: number | null;
  maxTills?: number | null;
  maxUsers?: number | null;
  includedFeatureIds: string[];
  includedFeatureCodes: string[];
}

export interface TenantCreateAddonOptionApiDto {
  id: string;
  addonCode: string;
  name: string;
  description?: string | null;
  unitPrice: number;
  currency: string;
  relatedFeatureCode?: string | null;
  limitIncrementByKey?: Record<string, number> | null;
}

export interface TenantCreateCatalogFeatureApiDto {
  id: string;
  featureCode: string;
  name: string;
  description?: string | null;
  sortOrder: number;
}

export interface TenantCreateCatalogModuleApiDto {
  id: string;
  moduleCode: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  features: TenantCreateCatalogFeatureApiDto[];
}

export interface TenantCreateOptionsApiDto {
  plans: TenantCreatePlanOptionApiDto[];
  addons: TenantCreateAddonOptionApiDto[];
  catalogModules: TenantCreateCatalogModuleApiDto[];
  billingModes: TenantCreateLookupOptionApiDto[];
  currencies: TenantCreateLookupOptionApiDto[];
  timezones: TenantCreateLookupOptionApiDto[];
  locales: TenantCreateLookupOptionApiDto[];
  businessTypes: TenantCreateLookupOptionApiDto[];
  operatingModes: TenantCreateLookupOptionApiDto[];
  subscriptionStatuses: TenantCreateLookupOptionApiDto[];
  billingCycles: TenantCreateLookupOptionApiDto[];
}

export function mapCreateOptions(dto: TenantCreateOptionsApiDto | null | undefined): TenantCreateOptions {
  const data = dto ?? {
    plans: [],
    addons: [],
    catalogModules: [],
    billingModes: [],
    currencies: [],
    timezones: [],
    locales: [],
    businessTypes: [],
    operatingModes: [],
    subscriptionStatuses: [],
    billingCycles: []
  };

  return {
    plans: (data.plans ?? []).map((plan) => ({
      id: String(plan.id),
      planCode: plan.planCode,
      name: plan.name,
      description: plan.description ?? null,
      status: plan.status,
      billingCycle: plan.billingCycle,
      baseCurrency: plan.baseCurrency,
      basePrice: plan.basePrice,
      maxOutlets: plan.maxOutlets ?? null,
      maxTills: plan.maxTills ?? null,
      maxUsers: plan.maxUsers ?? null,
      includedFeatureIds: (plan.includedFeatureIds ?? []).map(String),
      includedFeatureCodes: (plan.includedFeatureCodes ?? []).map(String)
    })),
    addons: (data.addons ?? []).map((addon) => ({
      id: String(addon.id),
      addonCode: addon.addonCode,
      name: addon.name,
      description: addon.description ?? null,
      unitPrice: addon.unitPrice,
      currency: addon.currency,
      relatedFeatureCode: addon.relatedFeatureCode ?? null,
      limitIncrementByKey: addon.limitIncrementByKey ?? {}
    })),
    catalogModules: (data.catalogModules ?? []).map((module) => ({
      id: String(module.id),
      moduleCode: module.moduleCode,
      name: module.name,
      description: module.description ?? null,
      sortOrder: module.sortOrder,
      features: (module.features ?? []).map((feature) => ({
        id: String(feature.id),
        featureCode: feature.featureCode,
        name: feature.name,
        description: feature.description ?? null,
        sortOrder: feature.sortOrder
      }))
    })),
    billingModes: (data.billingModes ?? []).map((item) => ({ value: item.value, label: item.label })),
    currencies: (data.currencies ?? []).map((item) => ({ value: item.value, label: item.label })),
    timezones: (data.timezones ?? []).map((item) => ({ value: item.value, label: item.label })),
    locales: (data.locales ?? []).map((item) => ({ value: item.value, label: item.label })),
    businessTypes: (data.businessTypes ?? []).map((item) => ({ value: item.value, label: item.label })),
    operatingModes: (data.operatingModes ?? []).map((item) => ({ value: item.value, label: item.label })),
    subscriptionStatuses: (data.subscriptionStatuses ?? []).map((item) => ({ value: item.value, label: item.label })),
    billingCycles: (data.billingCycles ?? []).map((item) => ({ value: item.value, label: item.label }))
  };
}

export function mapCreateTenantRequest(state: TenantCreateWizardState): CreatePlatformTenantRequest {
  return {
    code: asValue(state.businessInfo.code),
    name: asValue(state.businessInfo.name),
    legalName: asValue(state.businessInfo.legalName),
    registrationNumber: asValue(state.businessInfo.registrationNumber),
    taxNumber: asValue(state.businessInfo.taxNumber),
    baseCurrency: asValue(state.businessInfo.baseCurrency),
    defaultTimezone: asValue(state.businessInfo.defaultTimezone),
    defaultLocale: asValue(state.businessInfo.defaultLocale),
    operatingMode: asValue(state.businessInfo.operatingMode),
    businessType: asValue(state.businessInfo.businessType),
    countryCode: asValue(state.businessInfo.countryCode),
    billingStatus: asValue(state.billingSubscription.subscriptionStatus),
    subscriptionPlanId: asValue(state.planSelection.subscriptionPlanId),
    limits: {
      maxOutlets: toOptionalNumber(state.limitsAddons.maxOutlets),
      maxTills: toOptionalNumber(state.limitsAddons.maxTills),
      maxUsers: toOptionalNumber(state.limitsAddons.maxUsers)
    },
    addons: state.limitsAddons.addons
      .filter((item) => item.quantity > 0)
      .map((item) => ({ addonId: item.addonId, quantity: item.quantity })),
    enabledFeatureIds: [...state.featureEntitlements.enabledFeatureIds],
    enabledFeatureCodes: [...state.featureEntitlements.enabledFeatureCodes],
    tenantAdmin: {
      firstName: asValue(state.tenantAdmin.firstName),
      lastName: asValue(state.tenantAdmin.lastName),
      email: asValue(state.tenantAdmin.email),
      phone: asValue(state.tenantAdmin.phone),
      sendInvite: true
    },
    subscription: {
      billingCycle: asValue(state.billingSubscription.billingCycle),
      subscriptionStatus: asValue(state.billingSubscription.subscriptionStatus),
      autoRenew: state.billingSubscription.autoRenew,
      createDraftInvoice: state.billingSubscription.createDraftInvoice,
      invoiceEmail: asValue(state.billingSubscription.invoiceEmail),
      paymentMethod: asValue(state.billingSubscription.billingMode || state.billingSubscription.paymentMethod),
      notes: asValue(state.billingSubscription.notes)
    }
  };
}

function asValue(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function toOptionalNumber(value: number | null | undefined): number | undefined {
  return value == null ? undefined : value;
}
