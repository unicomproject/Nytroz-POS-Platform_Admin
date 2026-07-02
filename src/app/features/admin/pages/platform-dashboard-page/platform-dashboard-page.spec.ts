import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    expect(text).toContain('LKR');
    expect(text).toContain('Items Requiring Attention');
    expect(text).toContain('Demo Tenant Alpha');
  });

  it('shows clean empty states when backend data is empty', async () => {
    api.getDashboard.mockReturnValue(of(createDashboard({
      statusOverview: { ...createDashboard().statusOverview, trend: [] },
      recentActivity: [],
      tenantStatusSnapshot: { total: 0, items: [] }
    })));

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
    expect(component.chartPoints([{ date: '2026-06-16', tenants: 1, subscriptions: 2, mrr: 3 }], 'mrr')).toBe('45.0,40.0');
  });
});
