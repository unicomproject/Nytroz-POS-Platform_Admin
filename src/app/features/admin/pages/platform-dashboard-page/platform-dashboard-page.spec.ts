import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { createDashboard } from '../../../../testing/test-fixtures';
import { PlatformDashboardApiService } from '../../services/platform-dashboard-api.service';
import { PlatformDashboardPage } from './platform-dashboard-page';

describe('PlatformDashboardPage', () => {
  let api: { getDashboard: ReturnType<typeof vi.fn> };
  let accessControl: { hasPermission: ReturnType<typeof vi.fn> };

  async function createComponent(): Promise<ComponentFixture<PlatformDashboardPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformDashboardPage],
      providers: [
        provideRouter([]),
        { provide: PlatformDashboardApiService, useValue: api },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Dashboard failed safely' } },
        { provide: AccessControlService, useValue: accessControl }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformDashboardPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    api = { getDashboard: vi.fn() };
    const allowedPermissions = new Set<string>([
      platformPermissions.tenantsView,
      platformPermissions.tenantSubscriptionsView,
      platformPermissions.billingView,
      platformPermissions.usersView
    ]);
    accessControl = {
      hasPermission: vi.fn((permission?: string) => !!permission && allowedPermissions.has(permission))
    };
  });

  it('shows a loading skeleton while the API request is pending', async () => {
    api.getDashboard.mockReturnValue(new Subject().asObservable());

    const fixture = await createComponent();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('app-loading-skeleton')).toBeTruthy();
    expect(root.textContent).not.toContain('Total Tenants');
  });

  it('renders PageHeader title and Refresh action', async () => {
    api.getDashboard.mockReturnValue(of(createDashboard()));

    const fixture = await createComponent();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent).toContain('Dashboard');
    expect(root.textContent).toContain('Refresh');
    expect(root.querySelector('app-page-header')).toBeTruthy();
  });

  it('renders KPI values returned by the backend response', async () => {
    api.getDashboard.mockReturnValue(of(createDashboard()));

    const fixture = await createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Total Tenants');
    expect(text).toContain('3');
    expect(text).toContain('Active Paid Subscriptions');
    expect(text).toContain('2');
    expect(text).toContain('LKR');
    expect(text).toContain('2,500.00');
    expect(text).toContain('No change');
    expect(text).toContain('Items Requiring Attention');
    expect(text).toContain('Demo Tenant Alpha');
    expect(text).toContain('Recent Tenants');
    expect(text).toContain('Platform Footprint');
    expect(text).toContain('Last updated:');
  });

  it('renders each attention label with the matching backend count and does not swap past due vs pending', async () => {
    api.getDashboard.mockReturnValue(
      of(
        createDashboard({
          attention: [
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
              count: 5,
              severity: 'warning'
            }
          ],
          kpis: {
            ...createDashboard().kpis,
            itemsRequiringAttention: 7
          }
        })
      )
    );

    const fixture = await createComponent();
    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.attention-row'));
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Past Due Subscriptions');
    expect(rows[0].textContent).toContain('2');
    expect(rows[1].textContent).toContain('Pending Billing');
    expect(rows[1].textContent).toContain('5');
    expect(rows[0].getAttribute('href')).toContain('/admin/tenants');
    expect(rows[1].getAttribute('href')).toContain('/admin/billing');
  });

  it('maps attention row navigation query params for tenant filters', async () => {
    api.getDashboard.mockReturnValue(of(createDashboard()));
    const fixture = await createComponent();
    const component = fixture.componentInstance;

    expect(component.attentionLink('suspended_tenants')).toBe('/admin/tenants');
    expect(component.attentionQueryParams('pending_activation')).toEqual({ status: 'pending_activation' });
    expect(component.attentionQueryParams('setup_pending')).toEqual({ statusGroup: 'setup_pending' });
    expect(component.attentionQueryParams('past_due_subscriptions')).toEqual({ billingStatus: 'PAST_DUE' });
    expect(component.attentionLink('pending_billing')).toBe('/admin/billing');
    expect(component.attentionQueryParams('pending_billing')).toBeNull();
  });

  it('renders non-link attention rows when destination permission is missing', async () => {
    accessControl.hasPermission.mockImplementation((permission: string) => permission !== platformPermissions.tenantsView);
    api.getDashboard.mockReturnValue(
      of(
        createDashboard({
          attention: [
            {
              type: 'suspended_tenants',
              title: 'Suspended Tenants',
              description: 'Tenants currently suspended.',
              count: 1,
              severity: 'critical'
            }
          ]
        })
      )
    );

    const fixture = await createComponent();
    const row = (fixture.nativeElement as HTMLElement).querySelector('.attention-row.static');

    expect(row).toBeTruthy();
    expect(row?.getAttribute('href')).toBeNull();
  });

  it('shows attention empty state when there are no attention items', async () => {
    api.getDashboard.mockReturnValue(of(createDashboard({ attention: [], kpis: { ...createDashboard().kpis, itemsRequiringAttention: 0 } })));

    const fixture = await createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('No items require attention');
  });

  it('shows clean empty states when backend data is empty', async () => {
    api.getDashboard.mockReturnValue(
      of(
        createDashboard({
          statusOverview: { ...createDashboard().statusOverview, trend: [] },
          recentTenants: [],
          tenantStatusSnapshot: { total: 0, items: [] }
        })
      )
    );

    const fixture = await createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Trend data will appear when platform records exist');
    expect(text).toContain('No recent tenants have been recorded yet');
  });

  it('shows a safe error state on API failure', async () => {
    api.getDashboard.mockReturnValue(throwError(() => new Error('network failed')));

    const fixture = await createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Dashboard could not be loaded');
    expect(text).toContain('Dashboard failed safely');
  });

  it('retains dashboard data when refresh fails', async () => {
    api.getDashboard.mockReturnValueOnce(of(createDashboard())).mockReturnValueOnce(throwError(() => new Error('network failed')));

    const fixture = await createComponent();
    fixture.componentInstance.refreshDashboard();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Demo Tenant Alpha');
    expect(text).toContain('Refresh failed');
    expect(text).toContain('Dashboard failed safely');
  });

  it('invokes refresh without duplicate concurrent requests', async () => {
    const subject = new Subject();
    api.getDashboard.mockReturnValueOnce(of(createDashboard())).mockReturnValue(subject.asObservable());

    const fixture = await createComponent();
    expect(api.getDashboard).toHaveBeenCalledTimes(1);

    fixture.componentInstance.refreshDashboard();
    fixture.componentInstance.refreshDashboard();
    fixture.detectChanges();

    expect(api.getDashboard).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.isRefreshing()).toBe(true);
  });

  it('formats currency and change values without hard-coded LKR maps', async () => {
    api.getDashboard.mockReturnValue(of(createDashboard()));

    const fixture = await createComponent();
    const component = fixture.componentInstance;

    expect(component.formatMrrGroup({ currencyCode: 'USD', decimalPlaces: 2, amount: 2500 })).toContain('2,500.00');
    expect(component.change(0, 'ok')).toBe('No change');
    expect(component.change(null, 'new_no_baseline')).toBe('New — no prior baseline');
    expect(component.change(null, 'no_history')).toBe('No history yet');
    expect(component.change(null, null)).toBe('—');
    expect(component.chartPoints([{ date: '2026-06-16', tenants: 1, subscriptions: 2, mrr: 3 }], 'mrr')).toBe(
      '45.0,40.0'
    );
  });

  it('hides MRR when revenue is hidden by permissions', async () => {
    api.getDashboard.mockReturnValue(
      of(
        createDashboard({
          revenue: { status: 'HIDDEN', errorCode: null, groups: [] },
          permissions: {
            ...createDashboard().permissions,
            canViewTenantSubscriptions: false
          },
          kpis: {
            ...createDashboard().kpis,
            activeSubscriptions: null
          },
          subscriptionSnapshot: null
        })
      )
    );

    const fixture = await createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).not.toContain('Monthly Recurring Revenue');
    expect(text).not.toContain('Active Paid Subscriptions');
  });

  it('shows safe revenue unavailable state without zero MRR or charts for that section', async () => {
    api.getDashboard.mockReturnValue(
      of(
        createDashboard({
          revenue: {
            status: 'UNAVAILABLE',
            errorCode: 'platform_dashboard.currency_metadata_unavailable',
            groups: []
          },
          sectionErrors: ['platform_dashboard.currency_metadata_unavailable']
        })
      )
    );

    const fixture = await createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Monthly Recurring Revenue');
    expect(text).toContain('Revenue data is temporarily unavailable.');
    expect(text).toContain('Some dashboard sections could not be loaded');
    expect(text).toContain('Total Tenants');
    expect(text).toContain('Refresh');
    expect(text).not.toContain('2,500.00');
    expect(fixture.componentInstance.mrrDisplay({
      status: 'UNAVAILABLE',
      errorCode: 'platform_dashboard.currency_metadata_unavailable',
      groups: []
    })).toBe('Revenue data is temporarily unavailable.');
  });

  it('shows safe trends unavailable state without empty success chart', async () => {
    api.getDashboard.mockReturnValue(
      of(
        createDashboard({
          statusOverview: {
            ...createDashboard().statusOverview,
            trendsUnavailable: true,
            trendsErrorCode: 'platform_dashboard.timezone_unavailable',
            trend: []
          },
          sectionErrors: ['platform_dashboard.timezone_unavailable']
        })
      )
    );

    const fixture = await createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Trend data is temporarily unavailable.');
    expect(text).toContain('Total Tenants');
    expect(text).not.toContain('Trend data will appear when platform records exist');
  });

  it('renders controlled critical health without exposing probe internals', async () => {
    api.getDashboard.mockReturnValue(
      of(
        createDashboard({
          kpis: {
            ...createDashboard().kpis,
            systemHealthStatus: 'CRITICAL',
            systemHealthLabel: 'Critical'
          }
        })
      )
    );

    const fixture = await createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('System Health');
    expect(text).toContain('Critical');
    expect(text).toContain('Total Tenants');
    expect(text).not.toContain('Exception');
    expect(text).not.toContain('SecretKey');
  });

  it('links recent tenants to tenant detail when permitted', async () => {
    api.getDashboard.mockReturnValue(of(createDashboard()));

    const fixture = await createComponent();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a.tenant-link') as HTMLAnchorElement | null;

    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toContain('/admin/tenants/');
  });
});
