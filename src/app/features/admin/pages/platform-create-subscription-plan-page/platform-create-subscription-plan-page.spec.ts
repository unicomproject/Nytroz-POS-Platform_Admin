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
    expect(root.querySelector('.top-actions .save-btn')).toBeTruthy();
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
    expect(component.pricingSummary()).toBe('In progress');
    expect(component.limitsSummary()).toBe('Not configured');
  });

  it('marks pricing configured only after backend save', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToPricing(component);
    component.basePriceInput.set('12900.00');
    component.onBasePriceBlur();
    component.savedPlanId.set('draft-1');
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
    component.basePriceInput.set('12900.00');
    component.onBasePriceBlur();
    fixture.detectChanges();

    component.saveDraft();
    fixture.detectChanges();

    expect(api.updateSubscriptionPlanPricing).toHaveBeenCalledWith('draft-1', { basePrice: 12900 });
    expect(component.successMessage()).toBe('Subscription plan saved as draft');
  });

  it('calls limits API on saveDraft from limits step', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillBasics(component);
    goToPricing(component);
    component.savedPlanId.set('draft-1');
    component.pricingSaved.set(true);
    component.currentStep.set('limits');
    component.limitsForm.patchValue({ maxOutlets: 5, maxTills: 10, maxUsers: 25 });
    fixture.detectChanges();

    component.saveDraft();
    fixture.detectChanges();

    expect(api.updateSubscriptionPlanLimits).toHaveBeenCalledWith('draft-1', {
      maxOutlets: 5,
      maxTills: 10,
      maxUsers: 25
    });
    expect(component.limitsSaved()).toBe(true);
  });

  it('persists pricing and moves to Limits on Next', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToPricing(component);
    component.savedPlanId.set('draft-1');
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
    component.basePriceInput.set('12900.00');
    component.onBasePriceBlur();
    fixture.detectChanges();

    component.saveDraft();
    fixture.detectChanges();

    expect(component.successMessage()).toBeNull();
    expect(component.errorMessage()).toBe('Save failed safely');
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

  it('shows modules and features as Not selected when catalog is empty', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    expect(component.modulesSummary()).toBe('Not selected');
    expect(component.featuresSummary()).toBe('Not selected');
  });
});
