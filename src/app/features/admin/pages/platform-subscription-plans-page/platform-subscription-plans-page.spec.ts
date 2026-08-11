import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { createSubscriptionPlanListResponse } from '../../../../testing/test-fixtures';
import { PlatformSubscriptionPlanApiService } from '../../services/platform-subscription-plan-api.service';
import { PlatformSubscriptionPlansPage } from './platform-subscription-plans-page';

describe('PlatformSubscriptionPlansPage', () => {
  let api: {
    getSubscriptionPlans: ReturnType<typeof vi.fn>;
  };
  let permissions: Set<string>;

  async function createComponent(): Promise<ComponentFixture<PlatformSubscriptionPlansPage>> {
    await TestBed.configureTestingModule({
      imports: [PlatformSubscriptionPlansPage],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: PlatformSubscriptionPlanApiService, useValue: api },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Plans failed safely' } },
        {
          provide: AccessControlService,
          useValue: {
            hasPermission: (permission: string) => permissions.has(permission)
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PlatformSubscriptionPlansPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    permissions = new Set(Object.values(platformPermissions));
    api = {
      getSubscriptionPlans: vi.fn()
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders route title Subscription Plans', async () => {
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));
    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Subscription Plans');
  });

  it('shows loading skeleton while the first request is pending', async () => {
    api.getSubscriptionPlans.mockReturnValue(new Subject().asObservable());
    const fixture = await createComponent();

    expect(fixture.nativeElement.querySelector('app-loading-skeleton')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.skeleton-row')).toBeTruthy();
  });

  it('loads subscription plans once on construction', async () => {
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));
    await createComponent();

    expect(api.getSubscriptionPlans).toHaveBeenCalledTimes(1);
    expect(api.getSubscriptionPlans).toHaveBeenCalledWith(
      expect.objectContaining({
        pageNumber: 1,
        pageSize: 10,
        sortBy: 'updatedAt',
        sortDirection: 'desc'
      })
    );
    expect(api.getSubscriptionPlans.mock.calls[0][0].planType).toBeUndefined();
    expect(api.getSubscriptionPlans.mock.calls[0][0].currencyCode).toBeUndefined();
  });

  it('renders plan rows with Active label (not Published)', async () => {
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));
    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Test Subscription Plan');
    expect(text).toContain('TEST-PLAN');
    expect(text).toContain('Active');
    expect(text).not.toContain('Published');
    expect(text).not.toContain('Archived');
  });

  it('debounces search and reloads with search param', async () => {
    vi.useFakeTimers();
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));
    const fixture = await createComponent();
    fixture.detectChanges();

    expect(api.getSubscriptionPlans).toHaveBeenCalledTimes(1);

    fixture.componentInstance.onSearchChange('pro');
    vi.advanceTimersByTime(299);
    expect(api.getSubscriptionPlans).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(api.getSubscriptionPlans).toHaveBeenCalledTimes(2);
    expect(api.getSubscriptionPlans).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'pro', pageNumber: 1 })
    );
  });

  it('sends draft/active/retired status filter values', async () => {
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));
    const fixture = await createComponent();
    await fixture.whenStable();

    fixture.componentInstance.onStatusChange('draft');
    expect(api.getSubscriptionPlans).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'draft' })
    );

    fixture.componentInstance.onStatusChange('active');
    expect(api.getSubscriptionPlans).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'active' })
    );

    fixture.componentInstance.onStatusChange('retired');
    expect(api.getSubscriptionPlans).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'retired' })
    );
  });

  it('sends billing cycle filter', async () => {
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));
    const fixture = await createComponent();
    await fixture.whenStable();

    fixture.componentInstance.onBillingCycleChange('monthly');
    expect(api.getSubscriptionPlans).toHaveBeenLastCalledWith(
      expect.objectContaining({ billingCycle: 'monthly' })
    );

    fixture.componentInstance.onBillingCycleChange('yearly');
    expect(api.getSubscriptionPlans).toHaveBeenLastCalledWith(
      expect.objectContaining({ billingCycle: 'yearly' })
    );
  });

  it('does not render Plan Type or Currency filter controls', async () => {
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));
    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Plan Type');
    expect(text).not.toContain('Currency');
    expect(fixture.nativeElement.querySelector('option[value="free"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('option[value="LKR"]')).toBeNull();
  });

  it('does not render interactive sort controls', async () => {
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));
    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toMatch(/Sort by|Newest|Oldest/i);
    expect(fixture.nativeElement.querySelector('[aria-sort]')).toBeNull();
  });

  it('paginates with goToPage', async () => {
    api.getSubscriptionPlans.mockReturnValue(
      of(
        createSubscriptionPlanListResponse({
          pageNumber: 1,
          totalPages: 3,
          totalItems: 25,
          hasNextPage: true,
          hasPreviousPage: false
        })
      )
    );
    const fixture = await createComponent();
    await fixture.whenStable();

    fixture.componentInstance.goToPage(2);
    expect(api.getSubscriptionPlans).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageNumber: 2 })
    );
  });

  it('shows empty catalog copy with Create Plan when authorized', async () => {
    api.getSubscriptionPlans.mockReturnValue(
      of(
        createSubscriptionPlanListResponse({
          items: [],
          totalItems: 0,
          statusCounts: { all: 0, draft: 0, published: 0, archived: 0 }
        })
      )
    );
    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No subscription plans yet');
    expect(text).toContain('Create Plan');
    expect(text).not.toContain('Reset Filters');
  });

  it('shows filtered empty copy with Reset Filters', async () => {
    api.getSubscriptionPlans.mockReturnValue(
      of(
        createSubscriptionPlanListResponse({
          items: [],
          totalItems: 0,
          statusCounts: { all: 0, draft: 0, published: 0, archived: 0 }
        })
      )
    );
    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.componentInstance.onStatusChange('draft');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No plans match your current search or filters.');
    expect(text).toContain('Reset Filters');
  });

  it('shows error state with retry', async () => {
    api.getSubscriptionPlans.mockReturnValue(throwError(() => new Error('network')));
    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Unable to load subscription plans');
    expect(text).toContain('Try again');

    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));
    fixture.componentInstance.reload();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.getSubscriptionPlans).toHaveBeenCalledTimes(2);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Test Subscription Plan');
  });

  it('shows Create Plan when permitted and hides it when not', async () => {
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));
    let fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const createHosts = fixture.debugElement.queryAll(By.directive(RouterLink));
    expect(
      createHosts.some((node) =>
        ((node.nativeElement as HTMLElement).textContent ?? '').includes('Create Plan')
      )
    ).toBe(true);

    TestBed.resetTestingModule();
    permissions = new Set([platformPermissions.subscriptionPlansView]);
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));
    fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Create Plan');
  });

  it('wires View navigation to the plan detail route', async () => {
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));
    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const viewHosts = fixture.debugElement.queryAll(By.directive(RouterLink));
    const view = viewHosts.find((node) =>
      ((node.nativeElement as HTMLElement).textContent ?? '').includes('View')
    );
    expect(view).toBeTruthy();
    expect(fixture.componentInstance.viewRoute(createSubscriptionPlanListResponse().items[0])).toEqual([
      '/admin/subscriptions',
      createSubscriptionPlanListResponse().items[0].id
    ]);
  });

  it('does not expose confirm dialogs or row mutation menus', async () => {
    api.getSubscriptionPlans.mockReturnValue(of(createSubscriptionPlanListResponse()));
    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[aria-label="More actions"]')).toBeNull();
    expect(root.querySelector('[aria-label="Edit plan"]')).toBeNull();
    expect(root.querySelector('[aria-label="Duplicate plan"]')).toBeNull();
    expect(root.querySelector('.action-menu')).toBeNull();
    expect(root.querySelector('app-confirmation-dialog')).toBeNull();
    expect((fixture.componentInstance as { confirm?: unknown }).confirm).toBeUndefined();
  });
});
