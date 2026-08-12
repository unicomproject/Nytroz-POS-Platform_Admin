import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
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
        {
          provide: AccessControlService,
          useValue: { hasPermission: (permission: string) => permissions.has(permission) }
        }
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
  });

  it('loads the detail route by ID and renders commercial terms and Active tenants', async () => {
    const fixture = await createComponent();
    const text = fixture.nativeElement.textContent ?? '';

    expect(api.getSubscriptionPlanDetail).toHaveBeenCalledWith(PLAN_ID);
    expect(text).toContain('Professional Plan');
    expect(text).toContain('PRO');
    expect(text).toContain('LKR');
    expect(text).toContain('Active tenants');
    expect(text).toContain('Trial and past-due are not included');
    expect(text).toContain('Maximum outlets');
    expect(text).toContain('Core POS');
    expect(text).toContain('Sales');
    expect(text).not.toMatch(/invoice|payment recovery|override for tenant|billing ops/i);
  });

  it('shows loading skeleton while the request is pending', async () => {
    const fixture = await createComponent(PLAN_ID, new Subject<SubscriptionPlanDetail>());
    expect(fixture.nativeElement.querySelector('app-loading-skeleton')).toBeTruthy();
  });

  it('shows Draft label and draft actions', async () => {
    const fixture = await createComponent();
    const text = fixture.nativeElement.textContent ?? '';
    const buttons = buttonLabels(fixture);

    expect(text).toContain('Draft');
    expect(buttons).toContain('Publish');
    expect(buttons).toContain('Edit Plan');
    expect(buttons).toContain('Duplicate');
    expect(buttons).toContain('Delete draft');
    expect(buttons).not.toContain('Retire');
    expect(buttons).not.toContain('Reactivate');
  });

  it('shows Active label with Duplicate and Retire actions', async () => {
    const fixture = await createComponent(
      PLAN_ID,
      of(planFixture({ status: 'active', canEdit: false, canDelete: false, canArchive: true }))
    );
    const text = fixture.nativeElement.textContent ?? '';
    const buttons = buttonLabels(fixture);

    expect(text).toContain('Active');
    expect(text).not.toContain('Published');
    expect(buttons).toContain('Duplicate');
    expect(buttons).toContain('Retire');
    expect(buttons).not.toContain('Archive');
    expect(buttons).not.toContain('Publish');
    expect(buttons).not.toContain('Delete draft');
  });

  it('shows Retired label with Reactivate and Duplicate', async () => {
    const fixture = await createComponent(
      PLAN_ID,
      of(
        planFixture({
          status: 'retired',
          canEdit: false,
          canDelete: false,
          canArchive: false,
          canReactivate: true
        })
      )
    );
    const text = fixture.nativeElement.textContent ?? '';
    const buttons = buttonLabels(fixture);

    expect(text).toContain('Retired');
    expect(text).not.toContain('Archived');
    expect(buttons).toContain('Reactivate');
    expect(buttons).toContain('Duplicate');
    expect(buttons).not.toContain('Retire');
  });

  it('shows trial only when trialDays > 0', async () => {
    let fixture = await createComponent(PLAN_ID, of(planFixture({ trialDays: 14 })));
    expect(fixture.nativeElement.textContent).toContain('14-day trial');

    TestBed.resetTestingModule();
    fixture = await createComponent(PLAN_ID, of(planFixture({ trialDays: 0 })));
    expect(fixture.nativeElement.textContent).not.toContain('-day trial');
  });

  it.each([
    [404, 'Subscription plan not found'],
    [403, 'Permission denied'],
    [500, 'Unable to load this subscription plan']
  ])('shows the explicit %i response state', async (status, expected) => {
    const fixture = await createComponent(
      PLAN_ID,
      throwError(() => new HttpErrorResponse({ status }))
    );
    expect(fixture.nativeElement.textContent).toContain(expected);
    if (status === 500) {
      expect(fixture.nativeElement.textContent).toContain('Try again');
    }
  });

  it('rejects an invalid plan ID without calling the backend', async () => {
    const fixture = await createComponent('not-a-uuid');
    expect(api.getSubscriptionPlanDetail).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Subscription plan not found');
  });

  it('navigates Edit Plan to the wizard with edit state', async () => {
    const fixture = await createComponent();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.edit(planFixture());

    expect(navigate).toHaveBeenCalledWith(['/admin/subscriptions/create'], {
      state: { planId: PLAN_ID, mode: 'edit' }
    });
  });

  it('opens ConfirmationDialog and confirms Publish once', async () => {
    api.getSubscriptionPlanDetail
      .mockReturnValueOnce(of(planFixture()))
      .mockReturnValueOnce(of(planFixture({ status: 'active', canEdit: false, canArchive: true })));
    const fixture = await createComponent();

    fixture.componentInstance.requestPublish(planFixture());
    fixture.detectChanges();

    expect(api.publishSubscriptionPlan).not.toHaveBeenCalled();
    expect(fixture.debugElement.query(By.directive(ConfirmationDialog))).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Publish this plan?');

    fixture.componentInstance.confirmPending();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.publishSubscriptionPlan).toHaveBeenCalledTimes(1);
    expect(api.publishSubscriptionPlan).toHaveBeenCalledWith(PLAN_ID);
  });

  it('cancel closes ConfirmationDialog without mutation', async () => {
    const fixture = await createComponent();
    fixture.componentInstance.requestRetire(
      planFixture({ status: 'active', canEdit: false, canArchive: true })
    );
    fixture.detectChanges();

    fixture.componentInstance.cancelConfirm();
    fixture.detectChanges();

    expect(api.archiveSubscriptionPlan).not.toHaveBeenCalled();
    expect(fixture.componentInstance.confirmOpen()).toBe(false);
  });

  it('Retire confirmation calls archive API once with safe copy', async () => {
    const fixture = await createComponent(
      PLAN_ID,
      of(planFixture({ status: 'active', canEdit: false, canDelete: false, canArchive: true }))
    );

    fixture.componentInstance.requestRetire(
      planFixture({ status: 'active', canEdit: false, canArchive: true })
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('no longer be available for new assignments');
    expect(fixture.nativeElement.textContent).toContain('does not delete existing tenant relationships');

    fixture.componentInstance.confirmPending();
    expect(api.archiveSubscriptionPlan).toHaveBeenCalledTimes(1);
  });

  it('guards double-submit while an action is pending', async () => {
    const pending = new Subject<unknown>();
    api.publishSubscriptionPlan.mockReturnValue(pending.asObservable());
    const fixture = await createComponent();

    fixture.componentInstance.requestPublish(planFixture());
    fixture.componentInstance.confirmPending();
    fixture.componentInstance.confirmPending();

    expect(api.publishSubscriptionPlan).toHaveBeenCalledTimes(1);
    pending.complete();
  });

  it('hides actions when matching permissions are absent', async () => {
    permissions = new Set([platformPermissions.subscriptionPlansView]);
    const fixture = await createComponent();
    const text = fixture.nativeElement.textContent ?? '';

    expect(text).not.toContain('Edit Plan');
    expect(text).not.toContain('Publish');
    expect(text).not.toContain('Duplicate');
    expect(text).not.toContain('Delete draft');
  });

  it('does not use window.confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    const fixture = await createComponent();

    fixture.componentInstance.requestPublish(planFixture());
    fixture.componentInstance.confirmPending();

    expect(confirmSpy).not.toHaveBeenCalled();
  });
});

function buttonLabels(fixture: ComponentFixture<PlatformSubscriptionPlanDetailPage>): string[] {
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')]
    .map((button) => button.textContent?.trim() ?? '')
    .filter(Boolean);
}

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
    limits: [
      {
        id: 'limit-1',
        code: 'MAX_OUTLETS',
        name: 'Maximum outlets',
        value: 5,
        isUnlimited: false,
        unitCode: null
      }
    ],
    modules: [
      {
        id: 'module-1',
        code: 'CORE_POS',
        name: 'Core POS',
        description: 'Core selling tools.',
        features: [{ id: 'feature-1', code: 'SALES', name: 'Sales', description: 'Run sales.' }]
      }
    ],
    ...overrides
  };
}
