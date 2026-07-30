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
import {
  PlatformTenantEntitlementOptionsApiDto,
  mapPlatformTenantEntitlementOptions
} from '../features/admin/mappers/platform-tenant-entitlements.mapper';
import { PlatformTenantEntitlementOptions } from '../features/admin/models/platform-tenant-entitlements.model';
import { AccessControlService } from '../core/services/access-control.service';
import { mapPlatformDashboard } from '../features/admin/mappers/platform-dashboard.mapper';
import { mapPlatformTenantFilterOptions, mapPlatformTenantListResponse, mapPlatformTenantSummary, mapPlatformTenantDetail } from '../features/admin/mappers/platform-tenant.mapper';
import { mapSubscriptionPlanListResponse } from '../features/admin/mappers/platform-subscription-plan.mapper';
import { TenantCreateOptions } from '../features/admin/models/platform-tenant-create.model';
import {
  PlatformRoleListResponse,
  PlatformRoleSummary
} from '../features/admin/models/platform-role-management.model';
import {
  PlatformUserDetail,
  PlatformUserListResponse,
  PlatformUserSummary
} from '../features/admin/models/platform-user.model';

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
      fullName: 'OneVerz Platform Admin',
      status: 'active',
      platformPermissions: [...allPlatformPermissionCodes]
    },
    ...overrides
  };
}

export function createDashboardAccessControlStub(): Pick<AccessControlService, 'hasPermission'> {
  return {
    hasPermission: () => true
  };
}

export function createDashboardApiDto(overrides: Partial<PlatformDashboardApiDto> = {}): PlatformDashboardApiDto {
  return {
    generatedAt: '2026-06-16T00:00:00Z',
    tenantSummary: {
      status: 'SUCCESS',
      errorCode: null,
      data: {
        totalTenants: 3,
        activeTenants: 2,
        setupPendingTenants: 0,
        suspendedTenants: 0,
        inactiveTenants: 1,
        lifecycle: [
          { bucket: 'Active', count: 2 },
          { bucket: 'Setup Pending', count: 0 },
          { bucket: 'Suspended', count: 0 },
          { bucket: 'Inactive', count: 1 }
        ]
      }
    },
    subscriptionSummary: {
      status: 'SUCCESS',
      errorCode: null,
      data: {
        totalSubscriptions: 3,
        trialSubscriptions: 1,
        activeSubscriptions: 2,
        pastDueSubscriptions: 0,
        cancelledSubscriptions: 0,
        expiredSubscriptions: 0
      }
    },
    revenueSummary: {
      status: 'SUCCESS',
      errorCode: null,
      data: {
        mrrByCurrency: [{ currencyCode: 'LKR', decimalPlaces: 2, amount: 2500 }],
        calculatedAt: '2026-06-16T00:00:00Z'
      }
    },
    trends: {
      status: 'SUCCESS',
      errorCode: null,
      data: {
        timezone: 'Asia/Colombo',
        tenantGrowth: {
          metric: 'tenants',
          changePercent: 0,
          changeStatus: 'ok',
          points: [{ date: '2026-06-16', value: 3 }]
        },
        subscriptionTrend: {
          metric: 'subscriptions',
          changePercent: 0,
          changeStatus: 'ok',
          points: [{ date: '2026-06-16', value: 2 }]
        },
        mrrTrends: [
          {
            metric: 'mrr',
            currencyCode: 'LKR',
            changePercent: 0,
            changeStatus: 'ok',
            points: [{ date: '2026-06-16', value: 2500 }]
          }
        ]
      }
    },
    attentionSummary: {
      status: 'SUCCESS',
      errorCode: null,
      data: {
        items: [createDashboardAttentionItemApiDto()],
        totalCount: 1
      }
    },
    platformFootprint: {
      status: 'SUCCESS',
      errorCode: null,
      data: {
        totalOutlets: 4,
        totalTills: 6,
        totalTenantUsers: 8,
        totalPlatformUsers: 2
      }
    },
    systemHealth: {
      status: 'SUCCESS',
      errorCode: null,
      data: {
        overallStatus: 'HEALTHY',
        checkedAt: '2026-06-16T00:00:00Z',
        dependencies: []
      }
    },
    recentTenants: {
      status: 'SUCCESS',
      errorCode: null,
      data: [createDashboardRecentTenantApiDto()]
    },
    ...overrides
  };
}

export function createDashboard(overrides: Partial<PlatformDashboard> = {}): PlatformDashboard {
  return {
    ...mapPlatformDashboard(createDashboardApiDto(), createDashboardAccessControlStub() as AccessControlService),
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
    enabledFeatureIds: ['feature-offline'],
    enabledFeatureCodes: ['offline_operation_sync'],
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
    statuses: ['draft', 'pending_payment', 'pending_activation', 'active', 'suspended', 'cancelled'],
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
    countryCodes: [
      { code: 'LK', name: 'Sri Lanka' },
      { code: 'GB', name: 'United Kingdom' }
    ],
    currencies: [{ value: 'LKR', label: 'LKR - Sri Lankan Rupee' }],
    timezones: [{ value: 'Asia/Colombo', label: 'Asia/Colombo' }],
    locales: [
      { value: 'en-LK', label: 'English (Sri Lanka)' },
      { value: 'en-GB', label: 'English (United Kingdom)' }
    ],
    businessTypes: [{ value: 'retail', label: 'Retail' }],
    operatingModes: [
      { value: 'unified_epos', label: 'Unified EPOS' },
      { value: 'pos_only', label: 'POS Only' }
    ],
    subscriptionStatuses: [{ value: 'trial', label: 'Trial' }, { value: 'active', label: 'Active' }],
    billingCycles: [
      { value: 'monthly', label: 'Monthly' },
      { value: 'yearly', label: 'Yearly' },
      { value: 'annual', label: 'Annual' },
      { value: 'demo', label: 'Demo' }
    ],
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

export function createPlatformRoleSummary(
  overrides: Partial<PlatformRoleSummary> = {}
): PlatformRoleSummary {
  return {
    id: 'role-1',
    code: 'support_admin',
    name: 'Support Admin',
    description: 'Support team role',
    isSystem: false,
    status: 'Active',
    assignedUserCount: 0,
    permissionCount: 12,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    ...overrides
  };
}

export function createPlatformRoleListResponse(
  overrides: Partial<PlatformRoleListResponse> = {}
): PlatformRoleListResponse {
  return {
    roles: [createPlatformRoleSummary()],
    ...overrides
  };
}

export function createPlatformUserSummary(
  overrides: Partial<PlatformUserSummary> = {}
): PlatformUserSummary {
  return {
    id: 'user-1',
    email: 'staff@nytroz.local',
    displayName: 'Staff User',
    status: 'ACTIVE',
    roleCodes: ['support_admin'],
    roleNames: ['Support Admin'],
    permissionCount: 12,
    lastLoginAt: null,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    ...overrides
  };
}

export function createPlatformUserDetail(
  overrides: Partial<PlatformUserDetail> = {}
): PlatformUserDetail {
  return {
    ...createPlatformUserSummary(),
    invitePending: false,
    ...overrides
  };
}

export function createPlatformUserListResponse(
  overrides: Partial<PlatformUserListResponse> = {}
): PlatformUserListResponse {
  return {
    users: [createPlatformUserSummary()],
    ...overrides
  };
}

export function createTenantEntitlementOptionsApiDto(
  overrides: Partial<PlatformTenantEntitlementOptionsApiDto> = {}
): PlatformTenantEntitlementOptionsApiDto {
  return {
    tenantId: 'tenant-1',
    currentSubscriptionPlanId: 'plan-1',
    currentSubscriptionPlanCode: 'PRO',
    currentSubscriptionPlanName: 'Professional',
    enabledFeatureIds: ['feature-offline'],
    enabledFeatureCodes: ['offline_operation_sync'],
    plans: [
      {
        id: 'plan-1',
        code: 'PRO',
        name: 'Professional',
        status: 'active',
        includedFeatureIds: ['feature-offline', 'feature-online'],
        includedFeatureCodes: ['offline_operation_sync', 'online_store']
      },
      {
        id: 'plan-2',
        code: 'STARTER',
        name: 'Starter',
        status: 'active',
        includedFeatureIds: ['feature-offline'],
        includedFeatureCodes: ['offline_operation_sync']
      }
    ],
    catalogModules: [
      {
        id: 'module-core',
        code: 'core',
        name: 'Core POS',
        features: [
          {
            id: 'feature-offline',
            code: 'offline_operation_sync',
            name: 'Offline Operation Sync',
            description: 'Offline sync capability'
          },
          {
            id: 'feature-online',
            code: 'online_store',
            name: 'Online Store',
            description: 'Online storefront'
          },
          {
            id: 'feature-click',
            code: 'click_collect',
            name: 'Click & Collect',
            description: 'Click and collect orders'
          }
        ]
      }
    ],
    ...overrides
  };
}

export function createTenantEntitlementOptions(
  overrides: Partial<PlatformTenantEntitlementOptions> = {}
): PlatformTenantEntitlementOptions {
  return {
    ...mapPlatformTenantEntitlementOptions(createTenantEntitlementOptionsApiDto()),
    ...overrides
  };
}
