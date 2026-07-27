import { describe, expect, it } from 'vitest';

import {
  mapPlatformTenantFilterOptions,
  mapPlatformTenantListItem,
  mapPlatformTenantSummary
} from './platform-tenant.mapper';

describe('mapPlatformTenantListItem lifecycle', () => {
  it('prefers lifecycleStatus over status', () => {
    const item = mapPlatformTenantListItem({
      id: '1',
      code: 'T1',
      name: 'Tenant',
      status: 'active',
      lifecycleStatus: 'pending_payment',
      billingStatus: 'pending',
      operatingMode: 'pos_only',
      baseCurrency: 'LKR',
      defaultTimezone: 'Asia/Colombo',
      defaultLocale: 'en-LK',
      outletCount: 1,
      tillCount: 1,
      userCount: 1,
      onlineStoreEnabled: false,
      clickCollectEnabled: false,
      offlineEnabled: true,
      createdAt: '2026-07-01T00:00:00Z'
    });

    expect(item.lifecycleStatus).toBe('pending_payment');
    expect(item.status).toBe('pending_payment');
  });

  it('falls back to status when lifecycleStatus is absent', () => {
    const item = mapPlatformTenantListItem({
      id: '1',
      code: 'T1',
      name: 'Tenant',
      status: 'pending_activation',
      billingStatus: 'paid',
      operatingMode: 'pos_only',
      baseCurrency: 'LKR',
      defaultTimezone: 'Asia/Colombo',
      defaultLocale: 'en-LK',
      outletCount: 1,
      tillCount: 1,
      userCount: 1,
      onlineStoreEnabled: false,
      clickCollectEnabled: false,
      offlineEnabled: true,
      createdAt: '2026-07-01T00:00:00Z'
    });

    expect(item.lifecycleStatus).toBe('pending_activation');
  });
});

describe('mapPlatformTenantSummary pending activation', () => {
  it('exposes pendingActivationTenants separately from inactive residual', () => {
    const summary = mapPlatformTenantSummary({
      totalTenants: 10,
      activeTenants: 4,
      suspendedTenants: 1,
      trialTenants: 2,
      pendingActivationTenants: 3,
      pendingBillingCount: 0,
      totalOutlets: 0,
      totalTills: 0
    });

    expect(summary.pendingActivationTenants).toBe(3);
    expect(summary.inactiveTenants).toBe(0);
  });

  it('marks pending activation unavailable when field is missing', () => {
    const summary = mapPlatformTenantSummary({
      totalTenants: 2,
      activeTenants: 1,
      suspendedTenants: 0,
      trialTenants: 0,
      pendingBillingCount: 0,
      totalOutlets: 0,
      totalTills: 0
    });

    expect(summary.pendingActivationTenants).toBeNull();
  });
});

describe('mapPlatformTenantFilterOptions', () => {
  it('exposes only approved lifecycle filters and excludes setup_pending/inactive', () => {
    const options = mapPlatformTenantFilterOptions({
      statuses: ['active', 'setup_pending', 'inactive', 'pending_payment'],
      billingStatuses: [],
      operatingModes: [],
      plans: []
    });

    expect(options.statuses).toEqual([
      'draft',
      'pending_payment',
      'pending_activation',
      'active',
      'suspended',
      'cancelled'
    ]);
    expect(options.statuses).not.toContain('setup_pending');
    expect(options.statuses).not.toContain('inactive');
  });
});
