import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { PlatformSubscriptionPlanApiService } from '../../services/platform-subscription-plan-api.service';
import { PlatformCreateSubscriptionPlanPage } from './platform-create-subscription-plan-page';

describe('PlatformCreateSubscriptionPlanPage', () => {
  let api: {
    getModules: ReturnType<typeof vi.fn>;
    getFeatures: ReturnType<typeof vi.fn>;
    createSubscriptionPlanDraft: ReturnType<typeof vi.fn>;
    updateSubscriptionPlanPricing: ReturnType<typeof vi.fn>;
    updateSubscriptionPlanLimits: ReturnType<typeof vi.fn>;
    publishSubscriptionPlan: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    api = {
      getModules: vi.fn().mockReturnValue(of([])),
      getFeatures: vi.fn().mockReturnValue(of([])),
      createSubscriptionPlanDraft: vi.fn().mockReturnValue(of({ id: 'draft-1', planName: 'Plan', planCode: 'PLAN', status: 'draft' })),
      updateSubscriptionPlanPricing: vi.fn().mockReturnValue(of({ id: 'draft-1', basePrice: 12900, status: 'draft' })),
      updateSubscriptionPlanLimits: vi.fn().mockReturnValue(of({ id: 'draft-1', maxOutlets: 5, maxTills: 10, maxUsers: 25, status: 'draft' })),
      publishSubscriptionPlan: vi.fn().mockReturnValue(of({ id: 'draft-1', planName: 'Plan', planCode: 'PLAN', status: 'active' }))
    };

    await TestBed.configureTestingModule({
      imports: [PlatformCreateSubscriptionPlanPage],
      providers: [
        provideRouter([]),
        {
          provide: PlatformSubscriptionPlanApiService,
          useValue: {
            getModules: api.getModules,
            getFeatures: api.getFeatures,
            saveDraft: api.createSubscriptionPlanDraft,
            createSubscriptionPlanDraft: api.createSubscriptionPlanDraft,
            updateSubscriptionPlanPricing: api.updateSubscriptionPlanPricing,
            updateSubscriptionPlanLimits: api.updateSubscriptionPlanLimits,
            publish: api.publishSubscriptionPlan,
            publishSubscriptionPlan: api.publishSubscriptionPlan
          }
        },
        { provide: ApiErrorService, useValue: { toSafeMessage: () => 'Save failed safely' } }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  function createFixture(): ComponentFixture<PlatformCreateSubscriptionPlanPage> {
    const fixture = TestBed.createComponent(PlatformCreateSubscriptionPlanPage);
    fixture.detectChanges();
    return fixture;
  }

  function fillBasics(component: PlatformCreateSubscriptionPlanPage): void {
    component.basicsForm.patchValue({
      planName: 'Test Subscription Plan',
      planCode: 'TEST-PLAN',
      billingCycle: 'monthly',
      baseCurrency: 'LKR'
    });
  }

  function goToPricing(component: PlatformCreateSubscriptionPlanPage): void {
    fillBasics(component);
    component.currentStep.set('pricing');
  }

  function goToLimits(component: PlatformCreateSubscriptionPlanPage): void {
    fillBasics(component);
    component.savedPlanId.set('draft-1');
    component.basicsSaved.set(true);
    component.pricingSaved.set(true);
    component.currentStep.set('limits');
  }

  function fillLimits(component: PlatformCreateSubscriptionPlanPage): void {
    component.limitsForm.patchValue({ maxOutlets: 5, maxTills: 10, maxUsers: 25 });
  }

  it('renders wizard steps and bottom action bar controls', () => {
    const fixture = createFixture();
    const root = fixture.nativeElement as HTMLElement;
    const text = root.textContent ?? '';

    expect(text).toContain('Create Subscription Plan');
    expect(text).toContain('Basics');
    expect(text).toContain('Review & Publish');
    expect(text).toContain('Save Draft');
    expect(text).toContain('Draft Summary');
    expect(root.querySelector('.action-bar .back-btn')).toBeTruthy();
    expect(root.querySelector('.action-bar .save-btn')).toBeTruthy();
    expect(root.querySelector('.action-bar .next-btn')).toBeTruthy();
    expect(root.querySelector('.top-actions')).toBeNull();
  });

  it('does not render duplicate top-right wizard action buttons', () => {
    const fixture = createFixture();
    const root = fixture.nativeElement as HTMLElement;
    const pageHeading = root.querySelector('.page-heading') as HTMLElement;

    expect(root.querySelector('.top-actions')).toBeNull();
    expect(pageHeading.querySelector('.back-btn')).toBeNull();
    expect(pageHeading.querySelector('.save-btn')).toBeNull();
    expect(pageHeading.querySelector('.next-btn')).toBeNull();
    expect(pageHeading.querySelector('.publish-btn')).toBeNull();
  });

  it('shows Publish Plan only in bottom action bar on Review step', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.currentStep.set('review');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const actionBar = root.querySelector('.action-bar') as HTMLElement;
    const stepCard = root.querySelector('.step-card') as HTMLElement;

    expect(actionBar.querySelector('.publish-btn')).toBeTruthy();
    expect(actionBar.querySelector('.next-btn')).toBeNull();
    expect(stepCard.querySelector('.publish-btn')).toBeNull();
  });

  it('does not render breadcrumb or removed non-R1 fields in page content', () => {
    const fixture = createFixture();
    const root = fixture.nativeElement as HTMLElement;
    const text = root.textContent ?? '';

    expect(root.querySelector('.breadcrumb')).toBeNull();
    expect(text).not.toContain('Tax Mode');
    expect(text).not.toContain('Monthly Price');
    expect(text).not.toContain('Annual Price');
    expect(text).not.toContain('Trial Days');
    expect(text).not.toContain('Setup Fee');
    expect(text).not.toContain('Add-on Pricing');
    expect(text).not.toContain('Revenue Preview');
  });

  it('renders pricing step with R1 fields only and step 4 active styling', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToPricing(component);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const text = root.textContent ?? '';
    const steps = [...root.querySelectorAll('.stepper li')];

    expect(text).toContain('Base Pricing');
    expect(text).toContain('Billing Cycle');
    expect(text).toContain('Currency');
    expect(text).toContain('Base Price');
    expect(text).toContain('Selected in Basics step.');
    expect(steps[3]?.classList.contains('active')).toBe(true);
  });

  it('shows draft summary progress in Modules, Features, Pricing, Limits order', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToPricing(component);
    component.basePriceInput.set('12900.00');
    component.onBasePriceBlur();
    fixture.detectChanges();

    const rows = [...fixture.nativeElement.querySelectorAll('.summary-progress div')].map(
      (row) => (row as HTMLElement).textContent?.replace(/\s+/g, ' ').trim() ?? ''
    );

    expect(rows[0]).toContain('Modules');
    expect(rows[1]).toContain('Features');
    expect(rows[2]).toContain('Pricing');
    expect(rows[3]).toContain('Limits');
    expect(component.pricingSummary()).toBe('Not configured');
    expect(component.limitsSummary()).toBe('Not configured');
  });

  it('renders billing cycle and currency as read-only on pricing step', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToPricing(component);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const readonlyFields = root.querySelectorAll('.pricing-form .field-shell.readonly');
    const basePriceInput = root.querySelector('.pricing-form input[aria-label="Base price"]') as HTMLInputElement | null;

    expect(readonlyFields.length).toBe(2);
    expect(basePriceInput).toBeTruthy();
    expect(basePriceInput?.readOnly).not.toBe(true);
  });

  it('displays billing cycle label from Basics state on pricing step', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToPricing(component);
    fixture.detectChanges();

    expect(component.billingCycleLabel()).toBe('Monthly');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Monthly');
  });

  it('creates draft and stores planId when Next is clicked on Basics', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillBasics(component);
    fixture.detectChanges();

    component.nextStep();
    fixture.detectChanges();

    expect(api.createSubscriptionPlanDraft).toHaveBeenCalledTimes(1);
    expect(component.savedPlanId()).toBe('draft-1');
    expect(component.basicsSaved()).toBe(true);
    expect(component.currentStep()).toBe('modules');
  });

  it('creates draft then patches pricing when Next is clicked on Pricing without planId', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToPricing(component);
    component.basePriceInput.set('12900.00');
    component.onBasePriceBlur();
    fixture.detectChanges();

    component.nextStep();
    fixture.detectChanges();

    expect(api.createSubscriptionPlanDraft).toHaveBeenCalledTimes(1);
    expect(api.updateSubscriptionPlanPricing).toHaveBeenCalledWith('draft-1', { basePrice: 12900 });
    expect(component.savedPlanId()).toBe('draft-1');
    expect(component.basicsSaved()).toBe(true);
    expect(component.currentStep()).toBe('limits');
    expect(component.pricingSaved()).toBe(true);
  });

  it('does not patch pricing when Basics is incomplete on Pricing Next', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.basicsForm.patchValue({
      planName: 'Partial Plan',
      planCode: 'PARTIAL',
      billingCycle: '',
      baseCurrency: 'LKR'
    });
    component.currentStep.set('pricing');
    component.basePriceInput.set('12900.00');
    component.onBasePriceBlur();
    fixture.detectChanges();

    component.nextStep();
    fixture.detectChanges();

    expect(api.createSubscriptionPlanDraft).not.toHaveBeenCalled();
    expect(api.updateSubscriptionPlanPricing).not.toHaveBeenCalled();
    expect(component.currentStep()).toBe('basics');
    expect(component.errorMessage()).toBe('Please complete and save the Basics step before configuring pricing.');
    expect(component.pricingSaved()).toBe(false);
  });

  it('uses existing planId on Pricing Next without creating another draft', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToPricing(component);
    component.savedPlanId.set('draft-1');
    component.basicsSaved.set(true);
    component.basePriceInput.set('12900.00');
    component.onBasePriceBlur();
    fixture.detectChanges();

    component.nextStep();
    fixture.detectChanges();

    expect(api.createSubscriptionPlanDraft).not.toHaveBeenCalled();
    expect(api.updateSubscriptionPlanPricing).toHaveBeenCalledWith('draft-1', { basePrice: 12900 });
    expect(component.currentStep()).toBe('limits');
  });

  it('marks pricing configured only after backend save', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToPricing(component);
    component.basePriceInput.set('12900.00');
    component.onBasePriceBlur();
    component.savedPlanId.set('draft-1');
    component.basicsSaved.set(true);
    component.saveDraft();
    fixture.detectChanges();

    expect(api.updateSubscriptionPlanPricing).toHaveBeenCalledWith('draft-1', { basePrice: 12900 });
    expect(component.pricingSaved()).toBe(true);
    expect(component.pricingSummary()).toBe('Configured');
  });

  it('calls pricing API on saveDraft when base price is valid', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToPricing(component);
    component.savedPlanId.set('draft-1');
    component.basicsSaved.set(true);
    component.basePriceInput.set('12900.00');
    component.onBasePriceBlur();
    fixture.detectChanges();

    component.saveDraft();
    fixture.detectChanges();

    expect(api.createSubscriptionPlanDraft).not.toHaveBeenCalled();
    expect(api.updateSubscriptionPlanPricing).toHaveBeenCalledWith('draft-1', { basePrice: 12900 });
    expect(component.successMessage()).toBe('Subscription plan saved as draft');
    expect(component.currentStep()).toBe('pricing');
  });

  it('creates draft then patches pricing on Save Draft when planId is missing', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToPricing(component);
    component.basePriceInput.set('12900.00');
    component.onBasePriceBlur();
    fixture.detectChanges();

    component.saveDraft();
    fixture.detectChanges();

    expect(api.createSubscriptionPlanDraft).toHaveBeenCalledTimes(1);
    expect(api.updateSubscriptionPlanPricing).toHaveBeenCalledWith('draft-1', { basePrice: 12900 });
    expect(component.currentStep()).toBe('pricing');
    expect(component.pricingSaved()).toBe(true);
  });

  it('calls limits API on saveDraft from limits step', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToLimits(component);
    fillLimits(component);
    fixture.detectChanges();

    component.saveDraft();
    fixture.detectChanges();

    expect(api.updateSubscriptionPlanLimits).toHaveBeenCalledWith('draft-1', {
      maxOutlets: 5,
      maxTills: 10,
      maxUsers: 25
    });
    expect(component.limitsSaved()).toBe(true);
    expect(component.currentStep()).toBe('limits');
    expect(component.successMessage()).toBe('Subscription plan saved as draft');
  });

  it('renders limits step with R1 fields only and step 5 active styling', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToLimits(component);
    fillLimits(component);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const text = root.textContent ?? '';
    const steps = [...root.querySelectorAll('.stepper li')];

    expect(text).toContain('Plan Limits');
    expect(text).toContain('Outlet Limit');
    expect(text).toContain('Till Limit');
    expect(text).toContain('User Limit');
    expect(text).toContain('Maximum outlets allowed for this plan.');
    expect(text).toContain('These limits define the default usage allowance for tenants on this plan.');
    expect(text).not.toContain('Product Limit');
    expect(text).not.toContain('Storage Limit');
    expect(text).not.toContain('API Access Limit');
    expect(text).not.toContain('Transaction Limit');
    expect(steps[4]?.classList.contains('active')).toBe(true);
  });

  it('renders editable numeric limit inputs on limits step', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToLimits(component);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const outletInput = root.querySelector('input[aria-label="Outlet limit"]') as HTMLInputElement | null;
    const tillInput = root.querySelector('input[aria-label="Till limit"]') as HTMLInputElement | null;
    const userInput = root.querySelector('input[aria-label="User limit"]') as HTMLInputElement | null;

    expect(outletInput?.type).toBe('number');
    expect(tillInput?.type).toBe('number');
    expect(userInput?.type).toBe('number');
    expect(outletInput?.readOnly).not.toBe(true);
  });

  it('persists limits and moves to Review on Next', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToLimits(component);
    fillLimits(component);
    fixture.detectChanges();

    component.nextStep();
    fixture.detectChanges();

    expect(api.updateSubscriptionPlanLimits).toHaveBeenCalledWith('draft-1', {
      maxOutlets: 5,
      maxTills: 10,
      maxUsers: 25
    });
    expect(component.currentStep()).toBe('review');
    expect(component.limitsSaved()).toBe(true);
    expect(component.limitsSummary()).toBe('Configured');
  });

  it('marks limits configured only after backend save', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToLimits(component);
    fillLimits(component);
    fixture.detectChanges();

    expect(component.limitsSummary()).toBe('Not configured');

    component.saveDraft();
    fixture.detectChanges();

    expect(component.limitsSaved()).toBe(true);
    expect(component.limitsSummary()).toBe('Configured');
  });

  it('does not mark limits configured when limits API fails', () => {
    api.updateSubscriptionPlanLimits.mockReturnValueOnce(throwError(() => ({ error: { success: false } })));

    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToLimits(component);
    fillLimits(component);
    fixture.detectChanges();

    component.saveDraft();
    fixture.detectChanges();

    expect(component.successMessage()).toBeNull();
    expect(component.errorMessage()).toBe('Save failed safely');
    expect(component.limitsSaved()).toBe(false);
    expect(component.limitsSummary()).toBe('Not configured');
    expect(component.currentStep()).toBe('limits');
  });

  it('does not patch limits when planId is missing', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillBasics(component);
    component.pricingSaved.set(true);
    component.currentStep.set('limits');
    fillLimits(component);
    fixture.detectChanges();

    component.saveDraft();
    fixture.detectChanges();

    expect(api.updateSubscriptionPlanLimits).not.toHaveBeenCalled();
    expect(component.currentStep()).toBe('basics');
    expect(component.errorMessage()).toBe('Please save the Basics step before configuring limits.');
  });

  it('blocks limits save when pricing is not saved', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillBasics(component);
    component.savedPlanId.set('draft-1');
    component.basicsSaved.set(true);
    component.pricingSaved.set(false);
    component.currentStep.set('limits');
    fillLimits(component);
    fixture.detectChanges();

    component.saveDraft();
    fixture.detectChanges();

    expect(api.updateSubscriptionPlanLimits).not.toHaveBeenCalled();
    expect(component.currentStep()).toBe('pricing');
    expect(component.errorMessage()).toBe('Please save the Pricing step before configuring limits.');
  });

  it('disables Next while limits save is in progress', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToLimits(component);
    fillLimits(component);
    component.isSaving.set(true);
    fixture.detectChanges();

    const nextButtons = [...fixture.nativeElement.querySelectorAll('.next-btn')] as HTMLButtonElement[];
    expect(nextButtons.every((button) => button.disabled)).toBe(true);
  });

  it('persists pricing and moves to Limits on Next', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToPricing(component);
    component.savedPlanId.set('draft-1');
    component.basicsSaved.set(true);
    component.basePriceInput.set('12900.00');
    component.onBasePriceBlur();
    fixture.detectChanges();

    component.nextStep();
    fixture.detectChanges();

    expect(api.updateSubscriptionPlanPricing).toHaveBeenCalledWith('draft-1', { basePrice: 12900 });
    expect(component.currentStep()).toBe('limits');
    expect(component.pricingSaved()).toBe(true);
  });

  it('shows error message when saveDraft pricing API fails', () => {
    api.updateSubscriptionPlanPricing.mockReturnValueOnce(throwError(() => ({ error: { success: false } })));

    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToPricing(component);
    component.savedPlanId.set('draft-1');
    component.basicsSaved.set(true);
    component.basePriceInput.set('12900.00');
    component.onBasePriceBlur();
    fixture.detectChanges();

    component.saveDraft();
    fixture.detectChanges();

    expect(component.successMessage()).toBeNull();
    expect(component.errorMessage()).toBe('Save failed safely');
    expect(component.pricingSaved()).toBe(false);
    expect(component.pricingSummary()).toBe('Not configured');
  });

  it('navigates back to subscriptions from step 1', () => {
    const fixture = createFixture();
    fixture.componentInstance.goBack();

    expect(router.navigate).toHaveBeenCalledWith(['/admin/subscriptions']);
  });

  it('calls publish API and navigates to list with success message', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillBasics(component);
    component.savedPlanId.set('draft-1');
    component.basePriceInput.set('12900.00');
    component.onBasePriceBlur();
    component.pricingSaved.set(true);
    component.limitsForm.patchValue({ maxOutlets: 5, maxTills: 10, maxUsers: 25 });
    component.limitsSaved.set(true);
    component.currentStep.set('review');
    fixture.detectChanges();

    component.confirmPublish();
    fixture.detectChanges();

    expect(api.updateSubscriptionPlanPricing).toHaveBeenCalledWith('draft-1', { basePrice: 12900 });
    expect(api.updateSubscriptionPlanLimits).toHaveBeenCalledWith('draft-1', {
      maxOutlets: 5,
      maxTills: 10,
      maxUsers: 25
    });
    expect(api.publishSubscriptionPlan).toHaveBeenCalledWith('draft-1');
    expect(router.navigate).toHaveBeenCalledWith(['/admin/subscriptions'], {
      state: { successMessage: 'Subscription plan published successfully.' }
    });
  });

  it('disables Next while pricing save is in progress', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToPricing(component);
    component.savedPlanId.set('draft-1');
    component.basicsSaved.set(true);
    component.basePriceInput.set('12900.00');
    component.onBasePriceBlur();
    component.isSaving.set(true);
    fixture.detectChanges();

    const nextButtons = [...fixture.nativeElement.querySelectorAll('.next-btn')] as HTMLButtonElement[];
    expect(nextButtons.length).toBeGreaterThan(0);
    expect(nextButtons.every((button) => button.disabled)).toBe(true);
  });

  it('shows modules and features as Not selected when catalog is empty', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    expect(component.modulesSummary()).toBe('Not selected');
    expect(component.featuresSummary()).toBe('Not selected');
  });
});
