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
