import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { createTenantCreateOptions } from '../../../../testing/test-fixtures';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import { PlatformCreateTenantPage } from './platform-create-tenant-page';

describe('PlatformCreateTenantPage', () => {
  let api: {
    getCreateOptions: ReturnType<typeof vi.fn>;
    createTenant: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    api = {
      getCreateOptions: vi.fn().mockReturnValue(of(createTenantCreateOptions())),
      createTenant: vi.fn().mockReturnValue(of({ id: 'tenant-123', code: 'TEN-NEW', name: 'New Tenant' }))
    };

    await TestBed.configureTestingModule({
      imports: [PlatformCreateTenantPage],
      providers: [
        provideRouter([]),
        { provide: PlatformTenantApiService, useValue: api },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Create tenant failed safely' } }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  function createFixture(): ComponentFixture<PlatformCreateTenantPage> {
    const fixture = TestBed.createComponent(PlatformCreateTenantPage);
    fixture.detectChanges();
    return fixture;
  }

  function fillBusinessInfo(component: PlatformCreateTenantPage): void {
    component.businessInfoForm.patchValue({
      code: 'TEN-NEW',
      name: 'New Tenant',
      legalName: 'New Tenant Legal',
      countryCode: 'LK'
    });
  }

  function fillTenantAdmin(component: PlatformCreateTenantPage): void {
    component.tenantAdminForm.patchValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@tenant.com',
      phone: '+94112223344'
    });
  }

  function fillBilling(component: PlatformCreateTenantPage): void {
    component.billingSubscriptionForm.patchValue({
      billingMode: 'manual',
      billingCycle: 'monthly',
      subscriptionStatus: 'trial',
      createDraftInvoice: true,
      autoRenew: true,
      invoiceEmail: 'billing@tenant.com',
      paymentMethod: 'manual',
      notes: 'Create from wizard'
    });
  }

  it('renders all 7 wizard steps', () => {
    const fixture = createFixture();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Business Info');
    expect(text).toContain('Plan Selection');
    expect(text).toContain('Limits & Add-ons');
    expect(text).toContain('Feature Entitlements');
    expect(text).toContain('Tenant Admin');
    expect(text).toContain('Billing & Subscription');
    expect(text).toContain('Review & Create');
  });

  it('loads create-options on init', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    expect(api.getCreateOptions).toHaveBeenCalledOnce();
    expect(component.createOptions().plans.length).toBe(1);
    expect(component.createOptions().billingModes[0]?.value).toBe('manual');
  });

  it('validates each step before moving forward', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    component.nextStep();
    fixture.detectChanges();

    expect(component.currentStep()).toBe('business-info');

    fillBusinessInfo(component);
    component.nextStep();
    fixture.detectChanges();

    expect(component.currentStep()).toBe('plan-selection');
  });

  it('applies selected plan defaults to limits and billing cycle', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    component.selectPlan('plan-1');
    fixture.detectChanges();

    expect(component.planSelectionForm.controls.subscriptionPlanId.value).toBe('plan-1');
    expect(component.limitsAddonsForm.controls.maxOutlets.value).toBe(5);
    expect(component.billingSubscriptionForm.controls.billingCycle.value).toBe('monthly');
  });

  it('updates effective limits based on selected add-ons', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    component.selectPlan('plan-1');
    component.setAddonQuantity(component.createOptions().addons[0], 2);
    fixture.detectChanges();

    expect(component.effectiveLimit('max_outlets')).toBe(7);
  });

  it('constrains feature selection by selected plan entitlements', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.selectPlan('plan-1');
    fixture.detectChanges();

    const allowedFeature = component.createOptions().catalogModules[0].features[0];
    expect(component.isFeatureAllowed(allowedFeature)).toBe(true);

    component.toggleFeature(allowedFeature, { target: { checked: true } } as unknown as Event);
    expect(component.selectedFeatureIds()).toContain(allowedFeature.id);
  });

  it('shows pending invite guidance on tenant admin step', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.currentStep.set('tenant-admin');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('pending invite');
    expect(text).not.toContain('Send invite email');
  });

  it('enforces billing step required fields', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.currentStep.set('billing-subscription');
    component.billingSubscriptionForm.patchValue({
      billingMode: '',
      billingCycle: '',
      subscriptionStatus: ''
    });

    component.nextStep();
    fixture.detectChanges();

    expect(component.currentStep()).toBe('billing-subscription');
    expect(component.billingSubscriptionForm.invalid).toBe(true);
  });

  it('sends expected POST payload shape on create', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillBusinessInfo(component);
    component.selectPlan('plan-1');
    component.limitsAddonsForm.patchValue({ maxOutlets: 6, maxTills: 10, maxUsers: 20 });
    component.setAddonQuantity(component.createOptions().addons[0], 2);
    const feature = component.createOptions().catalogModules[0].features[0];
    component.toggleFeature(feature, { target: { checked: true } } as unknown as Event);
    fillTenantAdmin(component);
    fillBilling(component);
    component.currentStep.set('review-create');

    component.createTenant();
    fixture.detectChanges();

    expect(api.createTenant).toHaveBeenCalledTimes(1);
    expect(api.createTenant).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'TEN-NEW',
        name: 'New Tenant',
        subscriptionPlanId: 'plan-1',
        limits: expect.objectContaining({ maxOutlets: 6, maxTills: 10, maxUsers: 20 }),
        addons: [{ addonId: 'addon-1', quantity: 2 }],
        enabledFeatureIds: expect.arrayContaining([feature.id]),
        tenantAdmin: expect.objectContaining({
          firstName: 'Ada',
          email: 'ada@tenant.com',
          sendInvite: true
        }),
        subscription: expect.objectContaining({
          billingCycle: 'monthly',
          subscriptionStatus: 'trial',
          createDraftInvoice: true
        })
      })
    );
  });

  it('navigates to tenant detail on successful create', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillBusinessInfo(component);
    component.selectPlan('plan-1');
    component.limitsAddonsForm.patchValue({ maxOutlets: 5, maxTills: 10, maxUsers: 20 });
    const feature = component.createOptions().catalogModules[0].features[0];
    component.toggleFeature(feature, { target: { checked: true } } as unknown as Event);
    fillTenantAdmin(component);
    fillBilling(component);
    component.currentStep.set('review-create');

    component.createTenant();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/admin/tenants', 'tenant-123']);
  });

  it('shows API error message when create fails', () => {
    api.createTenant.mockReturnValueOnce(throwError(() => new Error('network failed')));
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillBusinessInfo(component);
    component.selectPlan('plan-1');
    component.limitsAddonsForm.patchValue({ maxOutlets: 5, maxTills: 10, maxUsers: 20 });
    const feature = component.createOptions().catalogModules[0].features[0];
    component.toggleFeature(feature, { target: { checked: true } } as unknown as Event);
    fillTenantAdmin(component);
    fillBilling(component);
    component.currentStep.set('review-create');

    component.createTenant();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Create tenant failed safely');
    expect(component.isSaving()).toBe(false);
  });
});
