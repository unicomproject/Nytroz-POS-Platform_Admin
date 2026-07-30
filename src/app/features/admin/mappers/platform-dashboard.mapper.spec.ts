import { describe, expect, it } from 'vitest';

import { createDashboardAccessControlStub, createDashboardApiDto } from '../../../testing/test-fixtures';
import { AccessControlService } from '../../../core/services/access-control.service';
import { mapPlatformDashboard } from './platform-dashboard.mapper';

describe('mapPlatformDashboard', () => {
  const access = createDashboardAccessControlStub() as AccessControlService;

  it('keeps backend attention titles and counts without swapping past due and pending billing', () => {
    const dashboard = mapPlatformDashboard(
      createDashboardApiDto({
        attentionSummary: {
          status: 'SUCCESS',
          data: {
            items: [
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
            totalCount: 5
          }
        },
        tenantSummary: {
          status: 'SUCCESS',
          data: {
            totalTenants: 4,
            activeTenants: 2,
            setupPendingTenants: 0,
            suspendedTenants: 1,
            inactiveTenants: 1,
            lifecycle: [
              { bucket: 'Active', count: 2 },
              { bucket: 'Suspended', count: 1 },
              { bucket: 'Inactive', count: 1 }
            ]
          }
        }
      }),
      access
    );

    expect(dashboard.attention.find((item) => item.type === 'past_due_subscriptions')?.count).toBe(2);
    expect(dashboard.attention.find((item) => item.type === 'pending_billing')?.count).toBe(3);
    expect(dashboard.attention.find((item) => item.type === 'suspended_tenants')?.count).toBe(0);
    expect(dashboard.kpis.itemsRequiringAttention).toBe(5);
    expect(dashboard.tenantStatusSnapshot.items.find((item) => item.status === 'Suspended')?.count).toBe(1);
    expect(dashboard.revenue.groups[0]?.amount).toBe(2500);
    expect(dashboard.kpis.systemHealthLabel).toBe('Healthy');
  });

  it('renders zero attention counts instead of dropping them', () => {
    const dashboard = mapPlatformDashboard(
      createDashboardApiDto({
        attentionSummary: {
          status: 'SUCCESS',
          data: {
            items: [
              {
                type: 'pending_billing',
                title: 'Pending Billing',
                description: 'Issued invoices that are PENDING with a balance due.',
                count: 0,
                severity: 'warning'
              }
            ],
            totalCount: 0
          }
        },
        tenantSummary: {
          status: 'SUCCESS',
          data: {
            totalTenants: 0,
            activeTenants: 0,
            setupPendingTenants: 0,
            suspendedTenants: 0,
            inactiveTenants: 0,
            lifecycle: []
          }
        },
        subscriptionSummary: {
          status: 'SUCCESS',
          data: {
            totalSubscriptions: 0,
            trialSubscriptions: 0,
            activeSubscriptions: 0,
            pastDueSubscriptions: 0,
            cancelledSubscriptions: 0,
            expiredSubscriptions: 0
          }
        }
      }),
      access
    );

    expect(dashboard.attention[0]?.count).toBe(0);
    expect(dashboard.kpis.itemsRequiringAttention).toBe(0);
    expect(dashboard.kpis.systemHealthLabel).toBe('Healthy');
  });

  it('collects unavailable section error codes', () => {
    const dashboard = mapPlatformDashboard(
      createDashboardApiDto({
        trends: {
          status: 'UNAVAILABLE',
          errorCode: 'platform_dashboard.timezone_unavailable',
          data: null
        },
        revenueSummary: {
          status: 'UNAVAILABLE',
          errorCode: 'platform_dashboard.currency_metadata_unavailable',
          data: null
        }
      }),
      access
    );

    expect(dashboard.sectionErrors).toContain('platform_dashboard.timezone_unavailable');
    expect(dashboard.sectionErrors).toContain('platform_dashboard.currency_metadata_unavailable');
    expect(dashboard.statusOverview.trendsUnavailable).toBe(true);
    expect(dashboard.revenue.status).toBe('UNAVAILABLE');
  });
});
