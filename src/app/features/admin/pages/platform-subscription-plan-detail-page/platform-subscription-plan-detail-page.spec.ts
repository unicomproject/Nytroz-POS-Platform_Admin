import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { SubscriptionPlanDetail } from '../../models/platform-subscription-plan.model';
import { PlatformSubscriptionPlanApiService } from '../../services/platform-subscription-plan-api.service';
import { PlatformSubscriptionPlanDetailPage } from './platform-subscription-plan-detail-page';

const PLAN_ID = '11111111-1111-4111-8111-111111111111';

describe('PlatformSubscriptionPlanDetailPage', () => {
  let api: {
    getSubscriptionPlanDetail: ReturnType<typeof vi.fn>;
    publishSubscriptionPlan: ReturnType<typeof vi.fn>;
    duplicateSubscriptionPlan: ReturnType<typeof vi.fn>;
    archiveSubscriptionPlan: ReturnType<typeof vi.fn>;
    reactivateSubscriptionPlan: ReturnType<typeof vi.fn>;
    deleteDraftSubscriptionPlan: ReturnType<typeof vi.fn>;
  };
  let permissions: Set<string>;
  let router: Router;

  async function createComponent(
    planId = PLAN_ID,
    response?: Observable<SubscriptionPlanDetail>
  ): Promise<ComponentFixture<PlatformSubscriptionPlanDetailPage>> {
    if (response) {
      api.getSubscriptionPlanDetail.mockReturnValue(response);
    }
    const paramMap = convertToParamMap({ planId });

    await TestBed.configureTestingModule({
      imports: [PlatformSubscriptionPlanDetailPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(paramMap), snapshot: { paramMap } } },
        { provide: PlatformSubscriptionPlanApiService, useValue: api },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Plan failed safely' } },
        { provide: AccessControlService, useValue: { hasPermission: (permission: string) => permissions.has(permission) } }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(PlatformSubscriptionPlanDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    permissions = new Set(Object.values(platformPermissions));
    api = {
      getSubscriptionPlanDetail: vi.fn().mockReturnValue(of(planFixture())),
      publishSubscriptionPlan: vi.fn().mockReturnValue(of({ id: PLAN_ID })),
      duplicateSubscriptionPlan: vi.fn().mockReturnValue(of({ id: '22222222-2222-4222-8222-222222222222' })),
      archiveSubscriptionPlan: vi.fn().mockReturnValue(of({ id: PLAN_ID })),
      reactivateSubscriptionPlan: vi.fn().mockReturnValue(of({ id: PLAN_ID })),
      deleteDraftSubscriptionPlan: vi.fn().mockReturnValue(of(true))
    };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => vi.restoreAllMocks());

  it('loads the detail route by ID and renders summary, pricing, limits and features', async () => {
    const fixture = await createComponent();
    const text = fixture.nativeElement.textContent ?? '';

    expect(api.getSubscriptionPlanDetail).toHaveBeenCalledWith(PLAN_ID);
    expect(text).toContain('Professional Plan');
    expect(text).toContain('PRO');
    expect(text).toContain('LKR');
    expect(text).toContain('Maximum outlets');
    expect(text).toContain('Core POS');
    expect(text).toContain('Sales');
  });

  it('shows the loading state while the request is pending', async () => {
    const fixture = await createComponent(PLAN_ID, new Subject<SubscriptionPlanDetail>());
    expect(fixture.nativeElement.querySelector('.detail-skeleton')).toBeTruthy();
  });

  it.each([
    [404, 'Subscription Plan Not Found'],
    [403, 'Permission denied'],
    [500, 'Subscription plan could not be loaded']
  ])('shows the explicit %i response state', async (status, expected) => {
    const fixture = await createComponent(
      PLAN_ID,
      throwError(() => new HttpErrorResponse({ status }))
    );
    expect(fixture.nativeElement.textContent).toContain(expected);
    if (status === 500) expect(fixture.nativeElement.textContent).toContain('Try again');
  });

  it('rejects an invalid plan ID without calling the backend', async () => {
    const fixture = await createComponent('not-a-uuid');
    expect(api.getSubscriptionPlanDetail).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Subscription Plan Not Found');
  });

  it('navigates Edit to the existing wizard with edit state', async () => {
    const fixture = await createComponent();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.edit(planFixture());

    expect(navigate).toHaveBeenCalledWith(['/admin/subscriptions/create'], {
      state: { planId: PLAN_ID, mode: 'edit' }
    });
  });

  it('hides actions when the matching permission is absent', async () => {
    permissions = new Set([platformPermissions.subscriptionPlansView]);
    const fixture = await createComponent();
    const text = fixture.nativeElement.textContent ?? '';

    expect(text).not.toContain('Edit');
    expect(text).not.toContain('Publish');
    expect(text).not.toContain('Duplicate');
    expect(text).not.toContain('Delete draft');
  });

  it('shows only lifecycle actions valid for the current status', async () => {
    const fixture = await createComponent(PLAN_ID, of(planFixture({ status: 'active', canEdit: false, canDelete: false, canArchive: true })));
    const text = fixture.nativeElement.textContent ?? '';
    const buttonLabels = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')]
      .map((button) => button.textContent?.trim());

    expect(text).toContain('Archive');
    expect(buttonLabels).not.toContain('Publish');
    expect(buttonLabels).not.toContain('Delete draft');
  });

  it('publishes after confirmation and refreshes detail from the backend', async () => {
    api.getSubscriptionPlanDetail
      .mockReturnValueOnce(of(planFixture()))
      .mockReturnValueOnce(of(planFixture({ status: 'active', canEdit: false, canArchive: true })));
    const fixture = await createComponent();

    fixture.componentInstance.publish(planFixture());

    expect(api.publishSubscriptionPlan).toHaveBeenCalledWith(PLAN_ID);
    expect(api.getSubscriptionPlanDetail).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.plan()?.status).toBe('active');
  });

  it('runs duplicate, archive, reactivate and delete through their real API methods', async () => {
    const fixture = await createComponent();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.duplicate(planFixture());
    fixture.componentInstance.archive(planFixture({ status: 'active', canEdit: false, canArchive: true }));
    fixture.componentInstance.reactivate(planFixture({ status: 'retired', canEdit: false, canReactivate: true }));
    fixture.componentInstance.deleteDraft(planFixture());

    expect(api.duplicateSubscriptionPlan).toHaveBeenCalledWith(PLAN_ID);
    expect(api.archiveSubscriptionPlan).toHaveBeenCalledWith(PLAN_ID);
    expect(api.reactivateSubscriptionPlan).toHaveBeenCalledWith(PLAN_ID);
    expect(api.deleteDraftSubscriptionPlan).toHaveBeenCalledWith(PLAN_ID);
    expect(navigate).toHaveBeenCalledWith(['/admin/subscriptions']);
  });
});

function planFixture(overrides: Partial<SubscriptionPlanDetail> = {}): SubscriptionPlanDetail {
  return {
    id: PLAN_ID,
    planName: 'Professional Plan',
    planCode: 'PRO',
    description: 'For growing commerce teams.',
    status: 'draft',
    billingCycle: 'monthly',
    baseCurrency: 'LKR',
    basePrice: 12500,
    pricingModel: 'fixed',
    trialDays: 14,
    maxOutlets: 5,
    maxTills: 10,
    maxUsers: 25,
    featureCount: 1,
    activeTenantCount: 3,
    canEdit: true,
    canDuplicate: true,
    canArchive: false,
    canDelete: true,
    canReactivate: false,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-12T00:00:00Z',
    limits: [{ id: 'limit-1', code: 'MAX_OUTLETS', name: 'Maximum outlets', value: 5, isUnlimited: false, unitCode: null }],
    modules: [{
      id: 'module-1', code: 'CORE_POS', name: 'Core POS', description: 'Core selling tools.',
      features: [{ id: 'feature-1', code: 'SALES', name: 'Sales', description: 'Run sales.' }]
    }],
    ...overrides
  };
}
