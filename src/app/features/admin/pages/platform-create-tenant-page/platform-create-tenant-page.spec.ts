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
        {
          provide: ApiErrorService,
          useValue: {
            toSafeMessage: (error: unknown) => {
              const body = (error as { error?: { message?: string } })?.error;
              return body?.message ?? 'Create tenant failed safely';
            },
            toFieldErrors: (error: unknown) => (error as { error?: { errors?: { field: string; message: string }[] } })?.error?.errors ?? [],
            applyFieldErrors: (
              fieldErrors: { field: string; message: string }[],
              controlsByField: Record<string, { setErrors: (errors: Record<string, string>) => void; markAsTouched: () => void } | null | undefined>
            ) => {
              for (const item of fieldErrors) {
                const control = controlsByField[item.field];
                if (!control) {
                  continue;
                }

                control.setErrors({ server: item.message });
                control.markAsTouched();
              }
            }
          }
        }
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
      countryCode: 'LK',
      addressLine1: '123 Main Street',
      addressCity: 'Colombo',
      addressCountryCode: 'LK',
      baseCurrency: 'LKR',
      defaultTimezone: 'Asia/Colombo',
      defaultLocale: 'en-LK',
      operatingMode: 'unified_epos'
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
      billingStatus: 'pending',
      billingCycle: 'monthly',
      subscriptionStatus: 'trial',
      createDraftInvoice: true,
      autoRenew: true,
      invoiceEmail: 'billing@tenant.com',
      paymentMethod: 'manual',
      notes: 'Create from wizard'
    });
  }

  function fillValidWizard(component: PlatformCreateTenantPage): void {
    fillBusinessInfo(component);
    component.selectPlan('plan-1');
    component.limitsAddonsForm.patchValue({ maxOutlets: 5, maxTills: 10, maxUsers: 20 });
    const feature = component.createOptions().catalogModules[0].features[0];
    component.toggleFeature(feature, { target: { checked: true } } as unknown as Event);
    fillTenantAdmin(component);
    fillBilling(component);
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
    expect(component.createOptions().billingStatuses[0]?.value).toBe('pending');
    expect(component.createOptions().paymentMethods[0]?.value).toBe('manual');
    expect(component.createOptions().countryCodes[0]?.value).toBe('LK');
    expect(component.createOptions().countryCodes[0]?.label).toBe('Sri Lanka');
  });

  it('renders countryCodes as dropdown options from create-options', () => {
    const fixture = createFixture();
    fixture.detectChanges();

    const countrySelect = (fixture.nativeElement as HTMLElement).querySelector('select[formcontrolname="countryCode"]') as HTMLSelectElement;
    const options = Array.from(countrySelect.options).map((option) => ({
      value: option.value,
      label: option.textContent?.trim() ?? ''
    }));

    expect(options.some((option) => option.value === 'LK' && option.label === 'Sri Lanka')).toBe(true);
  });

  it('auto-selects LK when only one country option exists', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    expect(component.businessInfoForm.controls.countryCode.value).toBe('LK');
    expect(component.businessInfoForm.controls.addressCountryCode.value).toBe('LK');
    expect(component.businessInfoForm.controls.countryCode.disabled).toBe(false);
    expect(component.businessInfoForm.controls.addressCountryCode.disabled).toBe(false);
  });

  it('shows country load error and disables Next when countryCodes is empty', () => {
    api.getCreateOptions.mockReturnValueOnce(
      of(createTenantCreateOptions({ countryCodes: [] }))
    );
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.countryOptionsLoadError()).toBe('Country list could not be loaded. Please retry.');
    expect(component.isCurrentStepValid()).toBe(false);
    const nextButton = (fixture.nativeElement as HTMLElement).querySelector('.action-bar .btn.primary') as HTMLButtonElement;
    expect(nextButton.disabled).toBe(true);
  });

  it('enables country field after options load', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    expect(component.businessInfoForm.controls.countryCode.disabled).toBe(false);
    expect(component.countryOptionsLoadError()).toBeNull();
  });

  it('posts LK country and LKR currency values, not labels', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillValidWizard(component);
    component.currentStep.set('review-create');

    component.createTenant();
    fixture.detectChanges();

    expect(api.createTenant).toHaveBeenCalledWith(
      expect.objectContaining({
        countryCode: 'LK',
        baseCurrency: 'LKR',
        defaultLocale: 'en-LK',
        operatingMode: 'unified_epos',
        address: expect.objectContaining({ countryCode: 'LK' })
      })
    );
  });

  it('posts non-default locale, operatingMode and businessType from wizard state', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillValidWizard(component);
    component.businessInfoForm.patchValue({
      defaultLocale: 'en-GB',
      operatingMode: 'pos_only',
      businessType: 'retail',
      countryCode: 'GB',
      addressCountryCode: 'GB'
    });
    component.currentStep.set('review-create');

    component.createTenant();
    fixture.detectChanges();

    expect(api.createTenant).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultLocale: 'en-GB',
        operatingMode: 'pos_only',
        businessType: 'retail',
        countryCode: 'GB'
      })
    );
  });

  it('retains wizard locale and operatingMode when navigating between steps', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillValidWizard(component);
    component.businessInfoForm.patchValue({
      defaultLocale: 'en-GB',
      operatingMode: 'pos_only',
      businessType: 'retail'
    });

    component.nextStep();
    component.goBack();
    fixture.detectChanges();

    expect(component.businessInfoForm.controls.defaultLocale.value).toBe('en-GB');
    expect(component.businessInfoForm.controls.operatingMode.value).toBe('pos_only');
    expect(component.businessInfoForm.controls.businessType.value).toBe('retail');
  });

  it('shows visible country validation error for invalid country code', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.businessInfoForm.patchValue({ countryCode: 'Sri Lanka' });
    component.businessInfoForm.controls.countryCode.markAsTouched();
    fixture.detectChanges();

    expect(component.fieldMessage(component.businessInfoForm.controls.countryCode, 'Country')).toContain('2-letter ISO');
    expect(component.isCurrentStepValid()).toBe(false);
  });

  it('disables Next when current step is invalid', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isCurrentStepValid()).toBe(false);
    const nextButton = (fixture.nativeElement as HTMLElement).querySelector('.action-bar .btn.primary') as HTMLButtonElement;
    expect(nextButton.disabled).toBe(true);
  });

  it('shows review validation summary when create is blocked', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.currentStep.set('review-create');
    fixture.detectChanges();

    expect(component.validationSummary().length).toBeGreaterThan(0);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Fix the following before creating');
  });

  it('maps server validation errors to form fields', () => {
    api.createTenant.mockReturnValueOnce(
      throwError(() => ({
        error: {
          success: false,
          message: 'One or more tenant create fields are invalid.',
          errorCode: 'platform_tenants.validation_failed',
          errors: [{ field: 'countryCode', message: 'Country must be a 2-letter ISO code (for example LK).' }]
        }
      }))
    );
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillValidWizard(component);
    component.currentStep.set('review-create');

    component.createTenant();
    fixture.detectChanges();

    expect(component.fieldMessage(component.businessInfoForm.controls.countryCode, 'Country')).toContain('2-letter ISO');
    expect(component.errorMessage()).toBe('One or more tenant create fields are invalid.');
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
      billingStatus: '',
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
    fillValidWizard(component);
    component.limitsAddonsForm.patchValue({ maxOutlets: 6, maxTills: 10, maxUsers: 20 });
    component.setAddonQuantity(component.createOptions().addons[0], 2);
    const feature = component.createOptions().catalogModules[0].features[0];
    component.toggleFeature(feature, { target: { checked: true } } as unknown as Event);
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
          paymentMethod: 'manual',
          createDraftInvoice: true
        }),
        billingStatus: 'pending',
        address: expect.objectContaining({ countryCode: 'LK' })
      })
    );
  });

  it('navigates to tenant detail on successful create', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillValidWizard(component);
    component.currentStep.set('review-create');

    component.createTenant();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/admin/tenants', 'tenant-123']);
  });

  it('shows API error message when create fails with invalid billing status', () => {
    api.createTenant.mockReturnValueOnce(throwError(() => ({
      error: {
        success: false,
        message: 'One or more tenant create fields are invalid.',
        errorCode: 'platform_tenants.validation_failed',
        errors: [{ field: 'billingStatus', message: 'Billing status must be one of pending, paid, overdue, failed, or waived.' }]
      }
    })));
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillValidWizard(component);
    component.billingSubscriptionForm.patchValue({ billingStatus: 'trial' });
    component.currentStep.set('review-create');

    component.createTenant();
    fixture.detectChanges();

    expect(api.createTenant).toHaveBeenCalledWith(expect.objectContaining({ billingStatus: 'trial' }));
    expect(component.errorMessage()).toBe('One or more tenant create fields are invalid.');
    expect(component.isSaving()).toBe(false);
  });

  it('shows API error message when create fails', () => {
    api.createTenant.mockReturnValueOnce(throwError(() => new Error('network failed')));
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillValidWizard(component);
    component.currentStep.set('review-create');

    component.createTenant();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Create tenant failed safely');
    expect(component.isSaving()).toBe(false);
  });
});
