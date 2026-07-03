import {
  CreatePlatformTenantAddressRequest,
  CreatePlatformTenantRequest,
  TenantCreateOptions,
  TenantCreateWizardState
} from '../models/platform-tenant-create.model';

export interface TenantCreateCountryOptionApiDto {
  code: string;
  name: string;
}

export interface TenantCreateLookupOptionApiDto {
  value?: string;
  label?: string;
  code?: string;
  name?: string;
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
  billingStatuses: TenantCreateLookupOptionApiDto[];
  paymentMethods: TenantCreateLookupOptionApiDto[];
  countryCodes: TenantCreateCountryOptionApiDto[];
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
    billingStatuses: [],
    paymentMethods: [],
    countryCodes: [],
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
    billingStatuses: (data.billingStatuses ?? []).map((item) => mapLookupOption(item)),
    paymentMethods: (data.paymentMethods ?? []).map((item) => mapLookupOption(item)),
    countryCodes: (data.countryCodes ?? []).map((item) => mapCountryOption(item)),
    currencies: (data.currencies ?? []).map((item) => mapLookupOption(item)),
    timezones: (data.timezones ?? []).map((item) => mapLookupOption(item)),
    locales: (data.locales ?? []).map((item) => mapLookupOption(item)),
    businessTypes: (data.businessTypes ?? []).map((item) => mapLookupOption(item)),
    operatingModes: (data.operatingModes ?? []).map((item) => mapLookupOption(item)),
    subscriptionStatuses: (data.subscriptionStatuses ?? []).map((item) => mapLookupOption(item)),
    billingCycles: (data.billingCycles ?? []).map((item) => mapLookupOption(item))
  };
}

export function mapCreateTenantRequest(state: TenantCreateWizardState): CreatePlatformTenantRequest {
  return {
    code: asValue(state.businessInfo.code),
    name: asValue(state.businessInfo.name),
    legalName: asValue(state.businessInfo.legalName),
    registrationNumber: asValue(state.businessInfo.registrationNumber),
    taxNumber: asValue(state.businessInfo.taxNumber),
    baseCurrency: asValue(state.businessInfo.baseCurrency)?.toUpperCase(),
    defaultTimezone: asValue(state.businessInfo.defaultTimezone),
    defaultLocale: asValue(state.businessInfo.defaultLocale),
    operatingMode: asValue(state.businessInfo.operatingMode),
    businessType: asValue(state.businessInfo.businessType),
    countryCode: asValue(state.businessInfo.countryCode)?.toUpperCase(),
    address: buildAddress(state.businessInfo),
    billingStatus: asValue(state.billingSubscription.billingStatus),
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
      paymentMethod: asValue(state.billingSubscription.paymentMethod),
      notes: asValue(state.billingSubscription.notes)
    }
  };
}

function buildAddress(businessInfo: TenantCreateWizardState['businessInfo']): CreatePlatformTenantAddressRequest | undefined {
  const line1 = asValue(businessInfo.addressLine1);
  const city = asValue(businessInfo.addressCity);
  const countryCode = asValue(businessInfo.addressCountryCode || businessInfo.countryCode)?.toUpperCase();

  if (!line1 && !city && !countryCode) {
    return undefined;
  }

  return { line1, city, countryCode };
}

function mapCountryOption(
  item: TenantCreateCountryOptionApiDto | TenantCreateLookupOptionApiDto
): { value: string; label: string } {
  if ('code' in item && item.code) {
    return { value: item.code.trim(), label: (item.name ?? item.code).trim() };
  }

  const lookup = item as TenantCreateLookupOptionApiDto;
  return { value: (lookup.value ?? '').trim(), label: (lookup.label ?? lookup.value ?? '').trim() };
}

function mapLookupOption(item: TenantCreateLookupOptionApiDto): { value: string; label: string } {
  return { value: item.value ?? '', label: item.label ?? item.value ?? '' };
}

function asValue(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function toOptionalNumber(value: number | null | undefined): number | undefined {
  return value == null ? undefined : value;
}
