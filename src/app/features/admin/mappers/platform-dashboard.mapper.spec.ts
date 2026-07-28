import { describe, expect, it } from 'vitest';

import { mapPlatformDashboard } from './platform-dashboard.mapper';

describe('mapPlatformDashboard attention mapping', () => {
  it('keeps backend attention titles and counts without swapping past due and pending billing', () => {
    const dashboard = mapPlatformDashboard({
      totalTenants: 4,
      activeTenants: 2,
      suspendedTenants: 1,
      trialTenants: 1,
      totalSubscriptions: 4,
      activeSubscriptions: 1,
      pendingBillingCount: 3,
      totalOutlets: 0,
      totalTills: 0,
      totalUsers: 0,
      recentTenants: [],
      attentionItems: [
        {
          type: 'past_due_subscriptions',
          title: 'Past Due Subscriptions',
          description: 'Tenant subscriptions with PAST_DUE status.',
          count: 2,
          severity: 'critical'
        },
        {
          type: 'pending_billing',
          title: 'Pending Billing',
          description: 'Issued invoices that are PENDING with a balance due.',
          count: 3,
          severity: 'warning'
        },
        {
          type: 'suspended_tenants',
          title: 'Suspended Tenants',
          description: 'Tenants currently suspended.',
          count: 0,
          severity: 'critical'
        }
      ],
      generatedAt: '2026-07-20T00:00:00Z'
    });

    expect(dashboard.attention.find((item) => item.type === 'past_due_subscriptions')?.count).toBe(2);
    expect(dashboard.attention.find((item) => item.type === 'pending_billing')?.count).toBe(3);
    expect(dashboard.attention.find((item) => item.type === 'suspended_tenants')?.count).toBe(0);
    expect(dashboard.kpis.itemsRequiringAttention).toBe(5);
    expect(dashboard.tenantStatusSnapshot.items.find((item) => item.status === 'Suspended')?.count).toBe(1);
    expect(dashboard.tenantStatusSnapshot.items.find((item) => item.status === 'Pending Activation')?.count).toBe(0);
  });

  it('uses pendingActivationTenants for Pending Activation and keeps it out of Inactive', () => {
    const dashboard = mapPlatformDashboard({
      totalTenants: 10,
      activeTenants: 4,
      suspendedTenants: 1,
      trialTenants: 2,
      pendingActivationTenants: 3,
      totalSubscriptions: 10,
      activeSubscriptions: 4,
      pendingBillingCount: 0,
      totalOutlets: 0,
      totalTills: 0,
      totalUsers: 0,
      recentTenants: [],
      attentionItems: [],
      generatedAt: '2026-07-20T00:00:00Z'
    });

    expect(dashboard.tenantStatusSnapshot.items.find((item) => item.status === 'Pending Activation')?.count).toBe(3);
    expect(dashboard.tenantStatusSnapshot.items.find((item) => item.status === 'Inactive')?.count).toBe(0);
  });

  it('reads Pending Activation from canonical pending_activation attention when summary field is absent', () => {
    const dashboard = mapPlatformDashboard({
      totalTenants: 5,
      activeTenants: 2,
      suspendedTenants: 0,
      trialTenants: 0,
      totalSubscriptions: 5,
      activeSubscriptions: 2,
      pendingBillingCount: 0,
      totalOutlets: 0,
      totalTills: 0,
      totalUsers: 0,
      recentTenants: [],
      attentionItems: [
        {
          type: 'pending_activation',
          title: 'Pending Activation',
          description: 'Tenants in PENDING_ACTIVATION awaiting Super Admin activation.',
          count: 2,
          severity: 'warning'
        }
      ],
      generatedAt: '2026-07-20T00:00:00Z'
    });

    expect(dashboard.attention.find((item) => item.type === 'pending_activation')?.title).toBe('Pending Activation');
    expect(dashboard.tenantStatusSnapshot.items.find((item) => item.status === 'Pending Activation')?.count).toBe(2);
    expect(dashboard.tenantStatusSnapshot.items.find((item) => item.status === 'Inactive')?.count).toBe(1);
  });

  it('keeps deprecated setup_pending attention mapping only as compatibility fallback', () => {
    const dashboard = mapPlatformDashboard({
      totalTenants: 5,
      activeTenants: 2,
      suspendedTenants: 0,
      trialTenants: 0,
      totalSubscriptions: 5,
      activeSubscriptions: 2,
      pendingBillingCount: 0,
      totalOutlets: 0,
      totalTills: 0,
      totalUsers: 0,
      recentTenants: [],
      attentionItems: [
        {
          type: 'setup_pending',
          title: 'Pending Activation',
          description: 'Tenants in PENDING_ACTIVATION awaiting Super Admin activation.',
          count: 2,
          severity: 'warning'
        }
      ],
      generatedAt: '2026-07-20T00:00:00Z'
    });

    expect(dashboard.tenantStatusSnapshot.items.find((item) => item.status === 'Pending Activation')?.count).toBe(2);
    expect(dashboard.tenantStatusSnapshot.items.find((item) => item.status === 'Inactive')?.count).toBe(1);
  });

  it('prefers pending_activation attention over deprecated setup_pending when both exist', () => {
    const dashboard = mapPlatformDashboard({
      totalTenants: 6,
      activeTenants: 2,
      suspendedTenants: 0,
      trialTenants: 0,
      totalSubscriptions: 6,
      activeSubscriptions: 2,
      pendingBillingCount: 0,
      totalOutlets: 0,
      totalTills: 0,
      totalUsers: 0,
      recentTenants: [],
      attentionItems: [
        {
          type: 'setup_pending',
          title: 'Pending Activation',
          description: 'legacy',
          count: 9,
          severity: 'warning'
        },
        {
          type: 'pending_activation',
          title: 'Pending Activation',
          description: 'canonical',
          count: 1,
          severity: 'warning'
        }
      ],
      generatedAt: '2026-07-20T00:00:00Z'
    });

    expect(dashboard.tenantStatusSnapshot.items.find((item) => item.status === 'Pending Activation')?.count).toBe(1);
  });

  it('renders zero attention counts instead of dropping them', () => {
    const dashboard = mapPlatformDashboard({
      totalTenants: 0,
      activeTenants: 0,
      suspendedTenants: 0,
      trialTenants: 0,
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      pendingBillingCount: 0,
      totalOutlets: 0,
      totalTills: 0,
      totalUsers: 0,
      recentTenants: [],
      attentionItems: [
        {
          type: 'pending_billing',
          title: 'Pending Billing',
          description: 'Issued invoices that are PENDING with a balance due.',
          count: 0,
          severity: 'warning'
        }
      ],
      generatedAt: '2026-07-20T00:00:00Z'
    });

    expect(dashboard.attention[0]?.count).toBe(0);
    expect(dashboard.kpis.itemsRequiringAttention).toBe(0);
    expect(dashboard.kpis.systemHealth).toBe('Healthy');
  });
});
