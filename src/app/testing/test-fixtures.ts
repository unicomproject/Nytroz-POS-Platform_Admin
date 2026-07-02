import { AuthSession } from '../core/models/auth-session.model';
import { allPlatformPermissionCodes } from '../core/config/permission-keys';
import { PlatformDashboard } from '../features/admin/models/platform-dashboard.model';
import {
  PlatformTenantFilterOptions,
  PlatformTenantListResponse,
  PlatformTenantSummary
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
  PlatformTenantSummaryApiDto
} from '../features/admin/mappers/platform-tenant.mapper';
import {
  SubscriptionPlanListItemApiDto,
  SubscriptionPlanListResponseApiDto
} from '../features/admin/mappers/platform-subscription-plan.mapper';
import { mapPlatformDashboard } from '../features/admin/mappers/platform-dashboard.mapper';
import { mapPlatformTenantFilterOptions, mapPlatformTenantListResponse, mapPlatformTenantSummary } from '../features/admin/mappers/platform-tenant.mapper';
import { mapSubscriptionPlanListResponse } from '../features/admin/mappers/platform-subscription-plan.mapper';

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
