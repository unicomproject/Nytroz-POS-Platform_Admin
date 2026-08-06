export interface TenantCreateLookupOption {
  value: string;
  label: string;
}

export interface TenantCreatePlanOption {
  id: string;
  planCode: string;
  name: string;
  description: string | null;
  status: string;
  billingCycle: string;
  baseCurrency: string;
  basePrice: number;
  maxOutlets: number | null;
  maxTills: number | null;
  maxUsers: number | null;
  includedFeatureIds: string[];
  includedFeatureCodes: string[];
}

export interface TenantCreateAddonOption {
  id: string;
  addonCode: string;
  name: string;
  description: string | null;
  unitPrice: number;
  currency: string;
  relatedFeatureCode: string | null;
  limitIncrementByKey: Record<string, number>;
}

export interface TenantCreateCatalogFeature {
  id: string;
  featureCode: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

export interface TenantCreateCatalogModule {
  id: string;
  moduleCode: string;
  name: string;
  description: string | null;
  sortOrder: number;
  features: TenantCreateCatalogFeature[];
}

export interface TenantCreateOptions {
  plans: TenantCreatePlanOption[];
  addons: TenantCreateAddonOption[];
  catalogModules: TenantCreateCatalogModule[];
  billingStatuses: TenantCreateLookupOption[];
  paymentMethods: TenantCreateLookupOption[];
  countryCodes: TenantCreateLookupOption[];
  currencies: TenantCreateLookupOption[];
  timezones: TenantCreateLookupOption[];
  locales: TenantCreateLookupOption[];
  businessTypes: TenantCreateLookupOption[];
  operatingModes: TenantCreateLookupOption[];
  subscriptionStatuses: TenantCreateLookupOption[];
  billingCycles: TenantCreateLookupOption[];
  defaults: {
    countryCode: string | null;
    currencyCode: string | null;
    timezone: string | null;
    locale: string | null;
    billingCycle: string | null;
  };
  validation: {
    tenantCodePattern: string;
    tenantSlugPattern: string;
    draftRetentionDays: number;
    platformBaseDomain: string | null;
  };
}

export interface TenantCreateBusinessInfoForm {
  code: string;
  name: string;
  legalName: string;
  registrationNumber: string;
  taxNumber: string;
  baseCurrency: string;
  defaultTimezone: string;
  defaultLocale: string;
  operatingMode: string;
  businessType: string;
  countryCode: string;
  addressLine1: string;
  addressCity: string;
  addressCountryCode: string;
}

export interface TenantCreatePlanSelectionForm {
  subscriptionPlanId: string;
}

export interface TenantCreateLimitsAddonsForm {
  maxOutlets: number | null;
  maxTills: number | null;
  maxUsers: number | null;
  addons: TenantCreateAddonSelection[];
}

export interface TenantCreateAddonSelection {
  addonId: string;
  quantity: number;
}

export interface TenantCreateFeatureEntitlementsForm {
  enabledFeatureIds: string[];
  enabledFeatureCodes: string[];
}

export interface TenantCreateTenantAdminForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface TenantCreateBillingSubscriptionForm {
  /** Authoritative create-mode classification: PAID | TRIAL | DEMO. */
  subscriptionType: string;
  billingStatus: string;
  billingCycle: string;
  subscriptionStatus: string;
  createDraftInvoice: boolean;
  autoRenew: boolean;
  invoiceEmail: string;
  paymentMethod: string;
  notes: string;
}

export interface TenantCreateWizardState {
  businessInfo: TenantCreateBusinessInfoForm;
  planSelection: TenantCreatePlanSelectionForm;
  limitsAddons: TenantCreateLimitsAddonsForm;
  featureEntitlements: TenantCreateFeatureEntitlementsForm;
  tenantAdmin: TenantCreateTenantAdminForm;
  billingSubscription: TenantCreateBillingSubscriptionForm;
}

export interface CreatePlatformTenantAddressRequest {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode?: string;
}

export interface CreatePlatformTenantContactRequest {
  name?: string;
  email?: string;
  phone?: string;
}

export interface CreatePlatformTenantLimitsRequest {
  maxOutlets?: number;
  maxTills?: number;
  maxUsers?: number;
}

export interface CreatePlatformTenantAddonSelectionRequest {
  addonId: string;
  quantity: number;
}

export interface CreatePlatformTenantAdminRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  sendInvite: boolean;
  temporaryPassword?: string;
}

export interface CreatePlatformTenantSubscriptionDetailsRequest {
  /** Required for wizard create: PAID | TRIAL | DEMO. */
  subscriptionType?: string;
  billingCycle?: string;
  subscriptionStatus?: string;
  autoRenew?: boolean;
  invoiceEmail?: string;
  paymentMethod?: string;
  notes?: string;
  createDraftInvoice?: boolean;
}

export interface CreatePlatformTenantRequest {
  code?: string;
  name?: string;
  legalName?: string;
  registrationNumber?: string;
  taxNumber?: string;
  baseCurrency?: string;
  defaultTimezone?: string;
  defaultLocale?: string;
  operatingMode?: string;
  businessType?: string;
  countryCode?: string;
  billingStatus?: string;
  subscriptionPlanId?: string;
  address?: CreatePlatformTenantAddressRequest;
  primaryContact?: CreatePlatformTenantContactRequest;
  limits?: CreatePlatformTenantLimitsRequest;
  addons?: CreatePlatformTenantAddonSelectionRequest[];
  enabledFeatureIds?: string[];
  enabledFeatureCodes?: string[];
  tenantAdmin?: CreatePlatformTenantAdminRequest;
  subscription?: CreatePlatformTenantSubscriptionDetailsRequest;
}
