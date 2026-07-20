import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { createDashboard } from '../../../../testing/test-fixtures';
import { PlatformDashboardApiService } from '../../services/platform-dashboard-api.service';
import { PlatformDashboardPage } from './platform-dashboard-page';

describe('PlatformDashboardPage', () => {
  let api: { getDashboard: ReturnType<typeof vi.fn> };

  async function createComponent(): Promise<ComponentFixture<PlatformDashboardPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformDashboardPage],
      providers: [
        provideRouter([]),
        { provide: PlatformDashboardApiService, useValue: api },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Dashboard failed safely' } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformDashboardPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    api = { getDashboard: vi.fn() };
  });

  it('shows a loading state while the API request is pending', async () => {
    api.getDashboard.mockReturnValue(new Subject().asObservable());

    const fixture = await createComponent();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading real platform data');
  });

  it('renders KPI values returned by the backend response', async () => {
    api.getDashboard.mockReturnValue(of(createDashboard()));

    const fixture = await createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Total Tenants');
    expect(text).toContain('3');
    expect(text).toContain('Active Subscriptions');
    expect(text).toContain('2');
    expect(text).toContain('Not tracked in TM-EPOS MVP');
    expect(text).toContain('No change yet');
    expect(text).toContain('Items Requiring Attention');
    expect(text).toContain('Demo Tenant Alpha');
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
    expect(component.attentionQueryParams('suspended_tenants')).toEqual({ status: 'suspended' });
    expect(component.attentionQueryParams('past_due_subscriptions')).toEqual({ billingStatus: 'PAST_DUE' });
    expect(component.attentionLink('pending_billing')).toBe('/admin/billing');
    expect(component.attentionQueryParams('pending_billing')).toBeNull();
  });

  it('shows clean empty states when backend data is empty', async () => {
    api.getDashboard.mockReturnValue(
      of(
        createDashboard({
          statusOverview: { ...createDashboard().statusOverview, trend: [] },
          recentActivity: [],
          tenantStatusSnapshot: { total: 0, items: [] }
        })
      )
    );

    const fixture = await createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Trend data will appear when platform records exist');
    expect(text).toContain('No platform activity has been recorded yet');
  });

  it('shows a safe error state on API failure', async () => {
    api.getDashboard.mockReturnValue(throwError(() => new Error('network failed')));

    const fixture = await createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Dashboard could not be loaded');
    expect(text).toContain('Dashboard failed safely');
  });

  it('formats LKR currency and chart values without requiring screenshot constants', async () => {
    api.getDashboard.mockReturnValue(of(createDashboard()));

    const fixture = await createComponent();
    const component = fixture.componentInstance;

    expect(component.money(2500)).toContain('2,500');
    expect(component.mrrLabel(0)).toBe('Not tracked in TM-EPOS MVP');
    expect(component.change(0)).toBe('No change yet');
    expect(component.chartPoints([{ date: '2026-06-16', tenants: 1, subscriptions: 2, mrr: 3 }], 'mrr')).toBe(
      '45.0,40.0'
    );
  });
});
