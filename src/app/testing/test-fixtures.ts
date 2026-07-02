import { AuthSession } from '../core/models/auth-session.model';
import { allPlatformPermissionCodes } from '../core/config/permission-keys';
import { PlatformDashboard } from '../features/admin/models/platform-dashboard.model';
import {
  PlatformTenantFilterOptions,
  PlatformTenantListResponse,
  PlatformTenantSummary
} from '../features/admin/models/platform-tenant.model';
import { SubscriptionPlanListResponse } from '../features/admin/models/platform-subscription-plan.model';

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

export function createDashboard(overrides: Partial<PlatformDashboard> = {}): PlatformDashboard {
  return {
    kpis: {
      totalTenants: 3,
      totalTenantsChangePercent: 10,
      activeSubscriptions: 2,
      activeSubscriptionsChangePercent: 5,
      monthlyRecurringRevenue: 125000,
      monthlyRecurringRevenueChangePercent: 0,
      itemsRequiringAttention: 1,
      itemsRequiringAttentionChangePercent: -20,
      systemHealth: 'Healthy'
    },
    statusOverview: {
      tenantGrowth: 3,
      tenantGrowthChangePercent: 10,
      subscriptionHealthPercent: 80,
      activeSubscriptionCount: 2,
      atRiskSubscriptionCount: 1,
      revenueTrendTotal: 125000,
      revenueTrendChangePercent: 0,
      trend: [{ date: '2026-06-16', tenants: 3, subscriptions: 2, mrr: 125000 }]
    },
    attention: [
      {
        type: 'payment_failures',
        title: 'Payment Failures',
        description: 'Recent payment attempts failed',
        count: 1,
        severity: 'critical'
      }
    ],
    recentActivity: [
      {
        type: 'tenant_created',
        message: 'Tenant created',
        occurredAt: '2026-06-16T00:00:00Z'
      }
    ],
    tenantStatusSnapshot: {
      total: 3,
      items: [
        { status: 'Active', count: 2, percentage: 66.7 },
        { status: 'Trial', count: 1, percentage: 33.3 },
        { status: 'Suspended', count: 0, percentage: 0 },
        { status: 'Inactive', count: 0, percentage: 0 }
      ]
    },
    ...overrides
  };
}

export function createTenantSummary(overrides: Partial<PlatformTenantSummary> = {}): PlatformTenantSummary {
  return {
    totalTenants: 3,
    activeTenants: 2,
    suspendedTenants: 0,
    inactiveTenants: 0,
    trialTenants: 1,
    ...overrides
  };
}

export function createTenantListResponse(
  overrides: Partial<PlatformTenantListResponse> = {}
): PlatformTenantListResponse {
  return {
    items: [
      {
        id: 'tenant-1',
        name: 'Demo Tenant Alpha',
        email: 'alpha@example.com',
        ownerName: 'Owner Alpha',
        planName: 'Professional',
        region: 'Sri Lanka / Western',
        status: 'Active',
        userCount: 4,
        outletCount: 2,
        createdOn: '2026-06-01T00:00:00Z',
        lastActivityAt: '2026-06-12T00:00:00Z'
      }
    ],
    pageNumber: 1,
    pageSize: 10,
    totalCount: 1,
    totalPages: 1,
    ...overrides
  };
}

export function createTenantFilterOptions(
  overrides: Partial<PlatformTenantFilterOptions> = {}
): PlatformTenantFilterOptions {
  return {
    plans: ['Starter', 'Professional', 'Enterprise'],
    regions: ['Sri Lanka / Western', 'Australia / NSW'],
    statuses: ['Active', 'Suspended', 'Inactive', 'Trial'],
    ...overrides
  };
}

export function createSubscriptionPlanListResponse(
  overrides: Partial<SubscriptionPlanListResponse> = {}
): SubscriptionPlanListResponse {
  return {
    items: [
      {
        id: 'plan-1',
        planName: 'Test Subscription Plan',
        planCode: 'TEST-PLAN',
        planType: 'paid',
        billingCycle: 'monthly',
        currencyCode: 'LKR',
        tenantMonthlyPrice: 1000,
        tenantAnnualPrice: null,
        annualDiscountPercentage: null,
        includedModulesCount: 0,
        addOnsCount: 0,
        activeTenantsCount: 2,
        status: 'active',
        isDefault: false,
        lastUpdatedAt: '2026-06-01T00:00:00Z',
        canView: true,
        canEdit: true,
        canDuplicate: true,
        canArchive: true,
        canDelete: false,
        deleteBlockedReason: 'Plan has active tenants'
      }
    ],
    pageNumber: 1,
    pageSize: 10,
    totalItems: 1,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
    statusCounts: { all: 1, draft: 0, published: 1, archived: 0 },
    ...overrides
  };
}
