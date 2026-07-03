import { AuthSession } from '../core/models/auth-session.model';
import { allPlatformPermissionCodes } from '../core/config/permission-keys';
import { PlatformDashboard } from '../features/admin/models/platform-dashboard.model';
import {
  PlatformTenantFilterOptions,
  PlatformTenantListResponse,
  PlatformTenantSummary,
  PlatformTenantDetail
} from '../features/admin/models/platform-tenant.model';
import { SubscriptionPlanListResponse } from '../features/admin/models/platform-subscription-plan.model';
import {
  PlatformDashboardApiDto,
  PlatformDashboardAttentionItemApiDto,
  PlatformDashboardRecentTenantApiDto
} from '../features/admin/mappers/platform-dashboard.mapper';
import {
  PlatformTenantFilterOptionsApiDto,
  PlatformTenantListItemApiDto,
  PlatformTenantListResponseApiDto,
  PlatformTenantSummaryApiDto,
  PlatformTenantDetailApiDto
} from '../features/admin/mappers/platform-tenant.mapper';
import {
  SubscriptionPlanListItemApiDto,
  SubscriptionPlanListResponseApiDto
} from '../features/admin/mappers/platform-subscription-plan.mapper';
import { TenantCreateOptionsApiDto, mapCreateOptions } from '../features/admin/mappers/platform-tenant-create.mapper';
import { mapPlatformDashboard } from '../features/admin/mappers/platform-dashboard.mapper';
import { mapPlatformTenantFilterOptions, mapPlatformTenantListResponse, mapPlatformTenantSummary, mapPlatformTenantDetail } from '../features/admin/mappers/platform-tenant.mapper';
import { mapSubscriptionPlanListResponse } from '../features/admin/mappers/platform-subscription-plan.mapper';
import { TenantCreateOptions } from '../features/admin/models/platform-tenant-create.model';

export function createAuthSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    tokenType: 'Bearer',
    accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    refreshTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    user: {
      id: 'platform-user-1',
      email: 'admin@nytroz.local',
      fullName: 'Nytroz Platform Admin',
      status: 'active',
      platformPermissions: [...allPlatformPermissionCodes]
    },
    ...overrides
  };
}

export function createDashboardApiDto(overrides: Partial<PlatformDashboardApiDto> = {}): PlatformDashboardApiDto {
  return {
    totalTenants: 3,
    activeTenants: 2,
    suspendedTenants: 0,
    trialTenants: 1,
    totalSubscriptions: 3,
    activeSubscriptions: 2,
    pendingBillingCount: 1,
    totalOutlets: 4,
    totalTills: 6,
    totalUsers: 8,
    recentTenants: [createDashboardRecentTenantApiDto()],
    attentionItems: [createDashboardAttentionItemApiDto()],
    generatedAt: '2026-06-16T00:00:00Z',
    ...overrides
  };
}

export function createDashboard(overrides: Partial<PlatformDashboard> = {}): PlatformDashboard {
  return {
    ...mapPlatformDashboard(createDashboardApiDto()),
    ...overrides
  };
}

export function createTenantSummaryApiDto(
  overrides: Partial<PlatformTenantSummaryApiDto> = {}
): PlatformTenantSummaryApiDto {
  return {
    totalTenants: 3,
    activeTenants: 2,
    suspendedTenants: 0,
    trialTenants: 1,
    pendingActivationTenants: 0,
    pendingBillingCount: 0,
    totalOutlets: 4,
    totalTills: 6,
    ...overrides
  };
}

export function createTenantSummary(overrides: Partial<PlatformTenantSummary> = {}): PlatformTenantSummary {
  return {
    ...mapPlatformTenantSummary(createTenantSummaryApiDto()),
    ...overrides
  };
}

export function createTenantListItemApiDto(
  overrides: Partial<PlatformTenantListItemApiDto> = {}
): PlatformTenantListItemApiDto {
  return {
    id: 'tenant-1',
    code: 'demo-alpha',
    name: 'Demo Tenant Alpha',
    status: 'active',
    billingStatus: 'current',
    operatingMode: 'retail',
    baseCurrency: 'LKR',
    defaultTimezone: 'Asia/Colombo',
    defaultLocale: 'en-LK',
    businessType: null,
    subscription: {
      planId: 'plan-1',
      planName: 'Professional',
      planCode: 'PRO',
      subscriptionStatus: 'ACTIVE'
    },
    outletCount: 2,
    tillCount: 3,
    userCount: 4,
    onlineStoreEnabled: false,
    clickCollectEnabled: false,
    offlineEnabled: true,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-12T00:00:00Z',
    ...overrides
  };
}

export function createTenantListResponseApiDto(
  overrides: Partial<PlatformTenantListResponseApiDto> = {}
): PlatformTenantListResponseApiDto {
  return {
    items: [createTenantListItemApiDto()],
    pageNumber: 1,
    pageSize: 10,
    totalCount: 1,
    totalPages: 1,
    ...overrides
  };
}

export function createTenantListResponse(
  overrides: Partial<PlatformTenantListResponse> = {}
): PlatformTenantListResponse {
  return {
    ...mapPlatformTenantListResponse(createTenantListResponseApiDto()),
    ...overrides
  };
}

export function createTenantFilterOptionsApiDto(
  overrides: Partial<PlatformTenantFilterOptionsApiDto> = {}
): PlatformTenantFilterOptionsApiDto {
  return {
    statuses: ['active', 'suspended', 'trial', 'draft'],
    billingStatuses: ['current', 'pending'],
    operatingModes: ['retail'],
    plans: [
      { id: 'plan-1', name: 'Starter', planCode: 'STARTER' },
      { id: 'plan-2', name: 'Professional', planCode: 'PRO' },
      { id: 'plan-3', name: 'Enterprise', planCode: 'ENT' }
    ],
    ...overrides
  };
}

export function createTenantFilterOptions(
  overrides: Partial<PlatformTenantFilterOptions> = {}
): PlatformTenantFilterOptions {
  return {
    ...mapPlatformTenantFilterOptions(createTenantFilterOptionsApiDto()),
    ...overrides
  };
}

export function createTenantDetailApiDto(
  overrides: Partial<PlatformTenantDetailApiDto> = {}
): PlatformTenantDetailApiDto {
  return {
    ...createTenantListItemApiDto(),
    lastActivityAt: '2026-06-12T00:00:00Z',
    canUpdate: true,
    canActivate: false,
    canSuspend: true,
    canManageEntitlements: true,
    ...overrides
  };
}

export function createTenantDetail(
  overrides: Partial<PlatformTenantDetail> = {}
): PlatformTenantDetail {
  return {
    ...mapPlatformTenantDetail(createTenantDetailApiDto()),
    ...overrides
  };
}

export function createSubscriptionPlanListItemApiDto(
  overrides: Partial<SubscriptionPlanListItemApiDto> = {}
): SubscriptionPlanListItemApiDto {
  return {
    id: 'plan-1',
    planCode: 'TEST-PLAN',
    name: 'Test Subscription Plan',
    description: null,
    status: 'active',
    billingCycle: 'monthly',
    baseCurrency: 'LKR',
    basePrice: 1000,
    maxOutlets: 1,
    maxUsers: 5,
    maxTills: 2,
    featureCount: 3,
    activeTenantCount: 2,
    canEdit: false,
    canDuplicate: true,
    canArchive: true,
    canDelete: false,
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides
  };
}

export function createSubscriptionPlanListResponseApiDto(
  overrides: Partial<SubscriptionPlanListResponseApiDto> = {}
): SubscriptionPlanListResponseApiDto {
  return {
    items: [createSubscriptionPlanListItemApiDto()],
    pageNumber: 1,
    pageSize: 10,
    totalCount: 1,
    totalPages: 1,
    canCreate: true,
    canEdit: true,
    canDuplicate: true,
    canArchive: true,
    canDelete: true,
    ...overrides
  };
}

export function createSubscriptionPlanListResponse(
  overrides: Partial<SubscriptionPlanListResponse> = {}
): SubscriptionPlanListResponse {
  return {
    ...mapSubscriptionPlanListResponse(createSubscriptionPlanListResponseApiDto()),
    ...overrides
  };
}

export function createTenantCreateOptionsApiDto(
  overrides: Partial<TenantCreateOptionsApiDto> = {}
): TenantCreateOptionsApiDto {
  return {
    plans: [
      {
        id: 'plan-1',
        planCode: 'STARTER',
        name: 'Starter',
        description: 'Starter plan',
        status: 'active',
        billingCycle: 'monthly',
        baseCurrency: 'LKR',
        basePrice: 50,
        maxOutlets: 5,
        maxTills: 10,
        maxUsers: 20,
        includedFeatureIds: ['feature-1', 'feature-2'],
        includedFeatureCodes: ['online_store', 'inventory_management']
      }
    ],
    addons: [
      {
        id: 'addon-1',
        addonCode: 'EXTRA_OUTLET',
        name: 'Extra Outlet',
        description: 'Adds one outlet',
        unitPrice: 5,
        currency: 'LKR',
        relatedFeatureCode: null,
        limitIncrementByKey: { max_outlets: 1 }
      }
    ],
    catalogModules: [
      {
        id: 'module-1',
        moduleCode: 'core_pos',
        name: 'Core POS',
        description: 'Core module',
        sortOrder: 1,
        features: [
          { id: 'feature-1', featureCode: 'online_store', name: 'Online Store', description: null, sortOrder: 1 },
          { id: 'feature-2', featureCode: 'inventory_management', name: 'Inventory', description: null, sortOrder: 2 }
        ]
      }
    ],
    billingStatuses: [{ value: 'pending', label: 'Pending' }],
    paymentMethods: [{ value: 'manual', label: 'Manual' }],
    countryCodes: [{ code: 'LK', name: 'Sri Lanka' }],
    currencies: [{ value: 'LKR', label: 'LKR - Sri Lankan Rupee' }],
    timezones: [{ value: 'Asia/Colombo', label: 'Asia/Colombo' }],
    locales: [{ value: 'en-LK', label: 'English (Sri Lanka)' }],
    businessTypes: [{ value: 'retail', label: 'Retail' }],
    operatingModes: [{ value: 'unified_epos', label: 'Unified EPOS' }],
    subscriptionStatuses: [{ value: 'trial', label: 'Trial' }, { value: 'active', label: 'Active' }],
    billingCycles: [{ value: 'monthly', label: 'Monthly' }],
    ...overrides
  };
}

export function createTenantCreateOptions(
  overrides: Partial<TenantCreateOptions> = {}
): TenantCreateOptions {
  return {
    ...mapCreateOptions(createTenantCreateOptionsApiDto()),
    ...overrides
  };
}

function createDashboardRecentTenantApiDto(
  overrides: Partial<PlatformDashboardRecentTenantApiDto> = {}
): PlatformDashboardRecentTenantApiDto {
  return {
    id: 'tenant-1',
    code: 'demo-alpha',
    name: 'Demo Tenant Alpha',
    status: 'active',
    createdAt: '2026-06-16T00:00:00Z',
    ...overrides
  };
}

function createDashboardAttentionItemApiDto(
  overrides: Partial<PlatformDashboardAttentionItemApiDto> = {}
): PlatformDashboardAttentionItemApiDto {
  return {
    type: 'payment_failures',
    title: 'Payment Failures',
    description: 'Recent payment attempts failed',
    count: 1,
    severity: 'critical',
    ...overrides
  };
}
