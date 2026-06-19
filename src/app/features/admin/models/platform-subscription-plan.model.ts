/** Database/API status values returned by the backend. */
export type SubscriptionPlanStatus = 'draft' | 'active' | 'retired';
export type SubscriptionDbBillingCycle = 'monthly' | 'yearly' | 'custom' | 'trial' | 'demo';
export type SubscriptionPlanType = 'free' | 'trial' | 'paid' | 'custom';
export type SubscriptionBillingCycle = 'monthly' | 'annual' | 'both';
export type ModuleAvailability = 'included' | 'addon' | 'not_available';

export interface SubscriptionPlanListItem {
  id: string;
  planName: string;
  planCode: string;
  planType: SubscriptionPlanType | string;
  billingCycle: SubscriptionBillingCycle | string;
  currencyCode: string;
  tenantMonthlyPrice: number | null;
  tenantAnnualPrice: number | null;
  annualDiscountPercentage: number | null;
  includedModulesCount: number;
  addOnsCount: number;
  activeTenantsCount: number;
  status: SubscriptionPlanStatus | string;
  isDefault: boolean;
  lastUpdatedAt: string;
  canView: boolean;
  canEdit: boolean;
  canDuplicate: boolean;
  canArchive: boolean;
  canDelete: boolean;
  deleteBlockedReason: string | null;
}

export interface SubscriptionPlanStatusCounts {
  all: number;
  draft: number;
  published: number;
  archived: number;
}

export interface SubscriptionPlanListResponse {
  items: SubscriptionPlanListItem[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  statusCounts: SubscriptionPlanStatusCounts;
}

export interface SubscriptionPlanListQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  planType?: string;
  status?: string;
  billingCycle?: string;
  currencyCode?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PlatformModuleOption {
  id: string;
  moduleKey: string;
  name: string;
  description: string | null;
  iconKey: string | null;
}

export interface PlatformFeatureOption {
  id: string;
  moduleId: string;
  moduleName: string;
  featureKey: string;
  name: string;
  description: string | null;
}

export interface SubscriptionPlanDraft {
  planName: string;
  planCode: string;
  description: string;
  billingCycle: SubscriptionDbBillingCycle | '';
  baseCurrency: string;
  basePrice: number | null;
  maxOutlets: number | null;
  maxTills: number | null;
  maxUsers: number | null;
  moduleAvailability: Record<string, ModuleAvailability>;
  featureAvailability: Record<string, ModuleAvailability>;
}

export interface SubscriptionPlanMutationResponse {
  id: string;
  planName: string;
  planCode: string;
  status: SubscriptionPlanStatus | string;
}

export interface SubscriptionPlanPricingUpdateRequest {
  basePrice: number;
}

export interface SubscriptionPlanPricingMutationResponse {
  id: string;
  basePrice: number;
  status: SubscriptionPlanStatus | string;
}

export interface SubscriptionPlanLimitsUpdateRequest {
  maxOutlets?: number;
  maxTills?: number;
  maxUsers?: number;
}

export interface SubscriptionPlanLimitsMutationResponse {
  id: string;
  maxOutlets: number | null;
  maxTills: number | null;
  maxUsers: number | null;
  status: SubscriptionPlanStatus | string;
}
