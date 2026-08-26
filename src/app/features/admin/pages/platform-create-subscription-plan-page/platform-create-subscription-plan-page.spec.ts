import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { PlatformSubscriptionPlanApiService } from '../../services/platform-subscription-plan-api.service';
import { PlatformCreateSubscriptionPlanPage } from './platform-create-subscription-plan-page';

describe('PlatformCreateSubscriptionPlanPage', () => {
  let api: {
    getSubscriptionCatalog: ReturnType<typeof vi.fn>;
    getSubscriptionPlanDetail: ReturnType<typeof vi.fn>;
    createSubscriptionPlanDraft: ReturnType<typeof vi.fn>;
    updateSubscriptionPlanDraft: ReturnType<typeof vi.fn>;
    updateSubscriptionPlanFeatures: ReturnType<typeof vi.fn>;
    updateSubscriptionPlanPricing: ReturnType<typeof vi.fn>;
    updateSubscriptionPlanLimits: ReturnType<typeof vi.fn>;
    publishSubscriptionPlan: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  function planDetail(overrides: Record<string, unknown> = {}) {
    return {
      id: 'draft-1',
      planName: 'Growth Monthly',
      planCode: 'GROWTH_M',
      description: 'Growth tier plan',
      status: 'draft',
      billingCycle: 'monthly',
      baseCurrency: 'LKR',
      basePrice: 12900,
      pricingModel: 'flat',
      trialDays: 0,
      maxOutlets: 5,
      maxTills: 10,
      maxUsers: 25,
      featureCount: 2,
      activeTenantCount: 0,
      canEdit: true,
      canDuplicate: true,
      canArchive: true,
      canDelete: true,
      canReactivate: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      limits: [],
      modules: [
        {
          id: 'inventory',
          code: 'inventory',
          name: 'Inventory',
          description: 'Inventory management',
          features: [
            {
              id: 'feature-inventory',
              code: 'inventory_management',
              name: 'Inventory Management',
              description: 'Manage inventory'
            }
          ]
        }
      ],
      ...overrides
    };
  }

  beforeEach(async () => {
    history.replaceState({}, '');

    api = {
      getSubscriptionCatalog: vi.fn().mockReturnValue(of({ modules: [] })),
      getSubscriptionPlanDetail: vi.fn().mockReturnValue(of(planDetail())),
      createSubscriptionPlanDraft: vi.fn().mockReturnValue(of({ id: 'draft-1', planName: 'Plan', planCode: 'PLAN', status: 'draft' })),
      updateSubscriptionPlanDraft: vi.fn().mockReturnValue(of({ id: 'draft-1', planName: 'Plan', planCode: 'PLAN', status: 'draft' })),
      updateSubscriptionPlanFeatures: vi.fn().mockReturnValue(of({ id: 'draft-1', includedFeatureIds: ['feature-pos-checkout', 'feature-inventory'], status: 'draft' })),
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
            getSubscriptionCatalog: api.getSubscriptionCatalog,
            getSubscriptionPlanDetail: api.getSubscriptionPlanDetail,
            saveDraft: api.createSubscriptionPlanDraft,
            createSubscriptionPlanDraft: api.createSubscriptionPlanDraft,
            updateSubscriptionPlanDraft: api.updateSubscriptionPlanDraft,
            updateSubscriptionPlanFeatures: api.updateSubscriptionPlanFeatures,
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

  afterEach(() => {
    history.replaceState({}, '');
  });

  function createFixture(): ComponentFixture<PlatformCreateSubscriptionPlanPage> {
    const fixture = TestBed.createComponent(PlatformCreateSubscriptionPlanPage);
    fixture.detectChanges();
    return fixture;
  }

  function createEditFixture(): ComponentFixture<PlatformCreateSubscriptionPlanPage> {
    history.replaceState({ planId: 'draft-1', mode: 'edit' }, '');
    return createFixture();
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

  function readyForPublish(component: PlatformCreateSubscriptionPlanPage): void {
    fillBasics(component);
    component.savedPlanId.set('draft-1');
    component.basicsSaved.set(true);
    component.moduleAvailability.set({
      core_pos: 'included',
      inventory: 'included'
    });
    component.featureAvailability.set({
      'feature-pos-checkout': 'included',
      'feature-inventory': 'included'
    });
    component.featuresSaved.set(true);
    component.basePriceInput.set('12900.00');
    component.onBasePriceBlur();
    component.pricingSaved.set(true);
    fillLimits(component);
    component.limitsSaved.set(true);
    component.currentStep.set('review');
  }

  function mockCatalogSuccess(): void {
    api.getSubscriptionCatalog.mockReturnValue(of({
      modules: [
        {
          id: 'core_pos',
          code: 'core_pos',
          name: 'Core POS',
          description: 'Core selling and checkout capabilities',
          sortOrder: 10,
          isCore: true,
          isLocked: true,
          defaultAvailability: 'included',
          features: [
            {
              id: 'feature-pos-checkout',
              code: 'pos_checkout',
              name: 'POS Checkout',
              description: 'Canonical POS checkout entitlement',
              entitlementKey: 'pos_checkout',
              sortOrder: 10,
              isCore: true,
              isLocked: true,
              defaultAvailability: 'included'
            }
          ]
        },
        {
          id: 'inventory',
          code: 'inventory',
          name: 'Inventory',
          description: 'Inventory management',
          sortOrder: 30,
          isCore: false,
          isLocked: false,
          defaultAvailability: 'not_available',
          features: [
            {
              id: 'feature-inventory',
              code: 'inventory_management',
              name: 'Inventory Management',
              description: 'Manage inventory',
              entitlementKey: 'inventory_management',
              sortOrder: 10,
              isCore: false,
              isLocked: false,
              defaultAvailability: 'not_available'
            }
          ]
        }
      ]
    }));
  }

  function stepItems(fixture: ComponentFixture<PlatformCreateSubscriptionPlanPage>): HTMLElement[] {
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll('.step-nav .step-item')] as HTMLElement[];
  }

  function footerButton(
    fixture: ComponentFixture<PlatformCreateSubscriptionPlanPage>,
    selector: string
  ): HTMLButtonElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(`.wizard-footer ${selector} button`);
  }

  it('renders the six wizard steps in the approved order with exact labels', () => {
    const fixture = createFixture();
    const labels = stepItems(fixture).map(
      (item) => item.querySelector('.step-label')?.textContent?.trim() ?? ''
    );

    expect(labels).toEqual(['Basics', 'Modules', 'Features', 'Pricing', 'Limits', 'Review & Publish']);
  });

  it('renders the Modules step label in the stepper rail', () => {
    const fixture = createFixture();
    const labels = stepItems(fixture).map(
      (item) => item.querySelector('.step-label')?.textContent?.trim() ?? ''
    );

    expect(labels).toContain('Modules');
  });

  it('renders the equal-width stepper rail structure with per-step connectors', () => {
    const fixture = createFixture();
    const root = fixture.nativeElement as HTMLElement;
    const items = stepItems(fixture);

    expect(root.querySelector('.step-nav-wrap')).toBeTruthy();
    expect(root.querySelectorAll('.step-nav .step-item .step-rail').length).toBe(6);
    expect(root.querySelectorAll('.step-nav .step-item .step-indicator').length).toBe(6);
    expect(items[0].querySelector('.rail-before')?.classList.contains('rail-hidden')).toBe(true);
    expect(items[5].querySelector('.rail-after')?.classList.contains('rail-hidden')).toBe(true);
    expect(items[0].querySelector('.rail-after')?.classList.contains('rail-hidden')).toBe(false);
    expect(items[0].classList.contains('current')).toBe(true);
    expect(items[0].getAttribute('aria-current')).toBe('step');
  });

  it('marks the active step on the rail without collapsing indicator geometry', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToPricing(component);
    fixture.detectChanges();

    const items = stepItems(fixture);
    expect(items[3].classList.contains('current')).toBe(true);
    expect(items[3].getAttribute('data-state')).toBe('current');
    expect(items[3].querySelector('.indicator-num')).toBeTruthy();
    expect(items[3].querySelector('.indicator-check')).toBeTruthy();
  });

  it('renders create heading, breadcrumb, draft badge and footer actions', () => {
    const fixture = createFixture();
    const root = fixture.nativeElement as HTMLElement;
    const text = root.textContent ?? '';

    expect(root.querySelector('app-page-header h1')?.textContent).toContain('Create Subscription Plan');
    expect(root.querySelector('app-page-header .crumb-current')?.textContent).toContain('Create Plan');
    expect(root.querySelector('app-page-header app-status-badge')?.textContent).toContain('Draft');
    expect(text).toContain('Save Draft');
    expect(text).toContain('Draft Summary');
    expect(footerButton(fixture, '.back-btn')).toBeTruthy();
    expect(footerButton(fixture, '.save-btn')).toBeTruthy();
    expect(footerButton(fixture, '.next-btn')).toBeTruthy();
    expect(root.querySelector('.top-actions')).toBeNull();
  });

  it('shows the edit heading and breadcrumb when a planId is present in history state', () => {
    const fixture = createEditFixture();
    const root = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.isEditMode()).toBe(true);
    expect(fixture.componentInstance.pageTitle()).toBe('Edit Subscription Plan');
    expect(root.querySelector('app-page-header h1')?.textContent).toContain('Edit Subscription Plan');
    expect(root.querySelector('app-page-header .crumb-current')?.textContent).toContain('Growth Monthly');
    expect(api.getSubscriptionPlanDetail).toHaveBeenCalledWith('draft-1');
  });

  it('falls back to the Edit Plan breadcrumb when the plan name is unknown', () => {
    api.getSubscriptionPlanDetail.mockReturnValue(throwError(() => ({ error: { success: false } })));

    const fixture = createEditFixture();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('app-page-header h1')?.textContent).toContain('Edit Subscription Plan');
    expect(root.querySelector('app-page-header .crumb-current')?.textContent).toContain('Edit Plan');
  });

  it('hydrates basics, pricing and limits from the plan detail in edit mode', () => {
    const fixture = createEditFixture();
    const component = fixture.componentInstance;

    expect(component.savedPlanId()).toBe('draft-1');
    expect(component.basicsForm.controls.planName.value).toBe('Growth Monthly');
    expect(component.basicsForm.controls.planCode.value).toBe('GROWTH_M');
    expect(component.basicsForm.controls.billingCycle.value).toBe('monthly');
    expect(component.pricingForm.controls.basePrice.value).toBe(12900);
    expect(component.limitsForm.getRawValue()).toEqual({ maxOutlets: 5, maxTills: 10, maxUsers: 25 });
  });

  it('hydrates modules and features from the plan detail entitlements in edit mode', () => {
    mockCatalogSuccess();

    const fixture = createEditFixture();
    const component = fixture.componentInstance;

    expect(component.moduleAvailability()['inventory']).toBe('included');
    expect(component.moduleAvailability()['core_pos']).toBe('included');
    expect(component.featureAvailability()['feature-inventory']).toBe('included');
    expect(component.selectedModulesCount()).toBe(2);
    expect(component.featuresSaved()).toBe(true);
  });

  it('applies plan detail entitlements when the catalog resolves after the plan detail', () => {
    const catalogCalls: Array<(value: unknown) => void> = [];
    api.getSubscriptionCatalog.mockReturnValue({
      subscribe: (observer: { next: (value: unknown) => void }) => {
        catalogCalls.push(observer.next);
        return { unsubscribe: () => undefined };
      }
    });

    const fixture = createEditFixture();
    const component = fixture.componentInstance;

    expect(component.moduleAvailability()['inventory']).toBeUndefined();

    catalogCalls[0]({
      modules: [
        {
          id: 'inventory',
          code: 'inventory',
          name: 'Inventory',
          description: null,
          sortOrder: 10,
          isCore: false,
          isLocked: false,
          defaultAvailability: 'not_available',
          features: [
            {
              id: 'feature-inventory',
              code: 'inventory_management',
              name: 'Inventory Management',
              description: null,
              entitlementKey: 'inventory_management',
              sortOrder: 10,
              isCore: false,
              isLocked: false,
              defaultAvailability: 'not_available'
            }
          ]
        }
      ]
    });
    fixture.detectChanges();

    expect(component.moduleAvailability()['inventory']).toBe('included');
    expect(component.featureAvailability()['feature-inventory']).toBe('included');
  });

  it('blocks editing and shows an error state when the plan is no longer a draft', () => {
    api.getSubscriptionPlanDetail.mockReturnValue(of(planDetail({ status: 'active' })));

    const fixture = createEditFixture();
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;

    expect(component.editBlocked()).toBe(true);
    expect(component.savedPlanId()).toBeNull();
    expect(root.querySelector('app-error-state')?.textContent).toContain('This plan cannot be edited here');
    expect(root.textContent).toContain('Only draft plans can be edited in this workspace');
    expect(root.querySelector('.wizard-footer')).toBeNull();
    expect(root.querySelector('.step-nav')).toBeNull();
  });

  it('offers only the approved billing cycles and never one_time', () => {
    const fixture = createFixture();
    const root = fixture.nativeElement as HTMLElement;
    const optionValues = [...root.querySelectorAll('#billing-cycle option')].map(
      (option) => (option as HTMLOptionElement).value
    );

    expect(fixture.componentInstance.billingCycleOptions.map((option) => option.value)).toEqual([
      'monthly',
      'yearly',
      'custom',
      'trial',
      'demo'
    ]);
    expect(optionValues).toEqual(['', 'monthly', 'yearly', 'custom', 'trial', 'demo']);
    expect(optionValues).not.toContain('one_time');
    expect(root.textContent).not.toContain('One-time');
  });

  it('offers only the approved currencies', () => {
    const fixture = createFixture();
    const optionValues = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('#base-currency option')
    ].map((option) => (option as HTMLOptionElement).value);

    expect(optionValues).toEqual(['', 'LKR', 'USD', 'GBP', 'EUR']);
  });

  it('does not render trial days, feature search, or removed non-R1 fields', () => {
    const fixture = createFixture();
    const root = fixture.nativeElement as HTMLElement;
    const text = root.textContent ?? '';

    expect(text).not.toContain('Trial Days');
    expect(text).not.toContain('trialDays');
    expect(root.querySelector('[formControlName="trialDays"]')).toBeNull();
    expect(root.querySelector('input[type="search"]')).toBeNull();
    expect(text).not.toContain('Tax Mode');
    expect(text).not.toContain('Monthly Price');
    expect(text).not.toContain('Annual Price');
    expect(text).not.toContain('Setup Fee');
    expect(text).not.toContain('Add-on Pricing');
    expect(text).not.toContain('Revenue Preview');
  });

  it('does not render the prototype review toolbar', () => {
    const fixture = createFixture();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.proto-toolbar')).toBeNull();
    expect(root.textContent).not.toContain('Review only');
  });

  it('renders pricing step with R1 fields only and read-only basics context', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToPricing(component);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const text = root.textContent ?? '';
    const readOnlyInputs = [...root.querySelectorAll('.form-panel input[readonly]')] as HTMLInputElement[];
    const basePriceInput = root.querySelector('input[aria-label="Base price"]') as HTMLInputElement | null;

    expect(text).toContain('Base Pricing');
    expect(text).toContain('Billing Cycle');
    expect(text).toContain('Currency');
    expect(text).toContain('Base Price');
    expect(text).toContain('Selected in Basics step.');
    expect(readOnlyInputs.length).toBe(2);
    expect(basePriceInput).toBeTruthy();
    expect(basePriceInput?.readOnly).not.toBe(true);
  });

  it('shows live summary progress in Modules, Features, Pricing, Limits order', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToPricing(component);
    component.basePriceInput.set('12900.00');
    component.onBasePriceBlur();
    fixture.detectChanges();

    const rows = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.summary-progress li')].map(
      (row) => (row as HTMLElement).textContent?.replace(/\s+/g, ' ').trim() ?? ''
    );

    expect(rows[0]).toContain('Modules');
    expect(rows[1]).toContain('Features');
    expect(rows[2]).toContain('Pricing');
    expect(rows[3]).toContain('Limits');
    expect(component.pricingSummary()).toBe('Not configured');
    expect(component.limitsSummary()).toBe('Not configured');
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

    footerButton(fixture, '.next-btn')?.click();
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

  it('renders limits step with R1 fields only', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToLimits(component);
    fillLimits(component);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const text = root.textContent ?? '';

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
    expect(stepItems(fixture)[4].classList.contains('current')).toBe(true);
  });

  it('renders editable numeric limit inputs with a minimum of 1', () => {
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
    expect(outletInput?.getAttribute('min')).toBe('1');
    expect(tillInput?.getAttribute('min')).toBe('1');
    expect(userInput?.getAttribute('min')).toBe('1');
  });

  it('rejects limits below 1 and does not call the limits API', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToLimits(component);
    component.limitsForm.patchValue({ maxOutlets: 0, maxTills: 10, maxUsers: 25 });
    fixture.detectChanges();

    component.nextStep();
    fixture.detectChanges();

    expect(component.limitsForm.controls.maxOutlets.hasError('min')).toBe(true);
    expect(component.limitsFieldError('maxOutlets')).toBe('Limit must be at least 1.');
    expect(api.updateSubscriptionPlanLimits).not.toHaveBeenCalled();
    expect(component.currentStep()).toBe('limits');
  });

  it('reports required limits validation messages', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToLimits(component);
    fixture.detectChanges();

    component.nextStep();
    fixture.detectChanges();

    expect(component.limitsFieldError('maxOutlets')).toBe('This limit is required.');
    expect(api.updateSubscriptionPlanLimits).not.toHaveBeenCalled();
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

  it('disables footer actions while a save is in progress', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    goToLimits(component);
    fillLimits(component);
    component.isSaving.set(true);
    fixture.detectChanges();

    expect(footerButton(fixture, '.next-btn')?.disabled).toBe(true);
    expect(footerButton(fixture, '.save-btn')?.disabled).toBe(true);
    expect(footerButton(fixture, '.back-btn')?.disabled).toBe(true);
  });

  it('navigates back to subscriptions from step 1', () => {
    const fixture = createFixture();
    footerButton(fixture, '.back-btn')?.click();

    expect(router.navigate).toHaveBeenCalledWith(['/admin/subscriptions']);
  });

  it('shows Publish Plan only in the sticky footer on the Review step', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.currentStep.set('review');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;

    expect(footerButton(fixture, '.publish-btn')).toBeTruthy();
    expect(footerButton(fixture, '.next-btn')).toBeNull();
    expect(root.querySelector('.form-panel .publish-btn')).toBeNull();
  });

  it('does not call the publish API from Save Draft', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    readyForPublish(component);
    fixture.detectChanges();

    footerButton(fixture, '.save-btn')?.click();
    fixture.detectChanges();

    expect(api.publishSubscriptionPlan).not.toHaveBeenCalled();
    expect(component.successMessage()).toBe('Subscription plan saved as draft');
    expect(component.showPublishModal()).toBe(false);
  });

  it('opens the confirmation dialog with the approved publish copy', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    readyForPublish(component);
    fixture.detectChanges();

    footerButton(fixture, '.publish-btn')?.click();
    fixture.detectChanges();

    const dialog = (fixture.nativeElement as HTMLElement).querySelector('app-confirmation-dialog') as HTMLElement;

    expect(component.showPublishModal()).toBe(true);
    expect(dialog.querySelector('.dialog-header h2')?.textContent).toContain('Publish subscription plan?');
    expect(dialog.textContent).toContain(
      'Once published, this plan can be assigned to tenants. Some fields cannot be edited directly after publishing.'
    );
    expect(dialog.textContent).toContain('Publish Plan');
    expect((fixture.nativeElement as HTMLElement).querySelector('.modal-backdrop')).toBeNull();
    expect(api.publishSubscriptionPlan).not.toHaveBeenCalled();
  });

  it('publishes once when the dialog is confirmed and navigates with the success message', () => {
    mockCatalogSuccess();
    const fixture = createFixture();
    const component = fixture.componentInstance;
    readyForPublish(component);
    fixture.detectChanges();

    footerButton(fixture, '.publish-btn')?.click();
    fixture.detectChanges();

    const confirmButton = (fixture.nativeElement as HTMLElement).querySelector(
      'app-confirmation-dialog .dialog-footer app-button:last-of-type button'
    ) as HTMLButtonElement;
    confirmButton.click();
    fixture.detectChanges();

    expect(api.updateSubscriptionPlanPricing).toHaveBeenCalledWith('draft-1', { basePrice: 12900 });
    expect(api.updateSubscriptionPlanLimits).toHaveBeenCalledWith('draft-1', {
      maxOutlets: 5,
      maxTills: 10,
      maxUsers: 25
    });
    expect(api.publishSubscriptionPlan).toHaveBeenCalledTimes(1);
    expect(api.publishSubscriptionPlan).toHaveBeenCalledWith('draft-1');
    expect(router.navigate).toHaveBeenCalledWith(['/admin/subscriptions'], {
      state: { successMessage: 'Subscription plan published successfully.' }
    });
  });

  it('guards double publish submissions while isSaving is true', () => {
    mockCatalogSuccess();
    api.publishSubscriptionPlan.mockReturnValue(NEVER);

    const fixture = createFixture();
    const component = fixture.componentInstance;
    readyForPublish(component);
    fixture.detectChanges();

    component.confirmPublish();
    fixture.detectChanges();

    expect(component.isSaving()).toBe(true);

    component.confirmPublish();
    fixture.detectChanges();

    expect(api.publishSubscriptionPlan).toHaveBeenCalledTimes(1);
    expect(api.updateSubscriptionPlanPricing).toHaveBeenCalledTimes(1);
  });

  it('shows modules and features as Not selected when catalog is empty', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    expect(component.modulesSummary()).toBe('Not selected');
    expect(component.featuresSummary()).toBe('Not selected');
  });

  it('loads modules and features from catalog API service', () => {
    mockCatalogSuccess();

    const fixture = createFixture();
    const component = fixture.componentInstance;

    expect(api.getSubscriptionCatalog).toHaveBeenCalledOnce();
    expect(component.modules().map((module) => module.name)).toEqual(['Core POS', 'Inventory']);
    expect(component.features().map((feature) => feature.name)).toEqual(['POS Checkout', 'Inventory Management']);
    expect(component.moduleAvailability()['core_pos']).toBe('included');
    expect(component.featureAvailability()['feature-pos-checkout']).toBe('included');
    expect(component.catalogError()).toBeNull();
    expect(fixture.componentInstance.isEditMode()).toBe(false);
  });

  it('shows a retryable error state when the catalog API fails', () => {
    api.getSubscriptionCatalog.mockReturnValue(throwError(() => new Error('network')));

    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.currentStep.set('modules');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;

    expect(component.catalogError()).toBe('Save failed safely');
    expect(root.textContent).toContain('Module catalog could not be loaded');

    api.getSubscriptionCatalog.mockReturnValue(of({ modules: [] }));
    (root.querySelector('.form-panel app-error-state .retry-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(api.getSubscriptionCatalog).toHaveBeenCalledTimes(2);
    expect(component.catalogError()).toBeNull();
  });

  it('shows an empty state on the modules step when the catalog returns no modules', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.currentStep.set('modules');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.form-panel app-empty-state')).toBeTruthy();
    expect(root.textContent).toContain('No subscription modules found');
  });

  it('module selection controls which features are available', () => {
    mockCatalogSuccess();

    const fixture = createFixture();
    const component = fixture.componentInstance;

    component.setModuleAvailability('inventory', 'included');
    fixture.detectChanges();

    expect(component.selectedModulesCount()).toBe(2);
    expect(component.featureGroups().map((group) => group.moduleName)).toEqual(['Core POS', 'Inventory']);
    expect(component.isFeatureDisabled(component.features().find((feature) => feature.id === 'feature-pos-checkout')!)).toBe(true);
    expect(component.isFeatureDisabled(component.features().find((feature) => feature.id === 'feature-inventory')!)).toBe(false);
  });

  it('saves selected features with included and not_available payload only', () => {
    mockCatalogSuccess();

    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillBasics(component);
    component.savedPlanId.set('draft-1');
    component.basicsSaved.set(true);
    component.currentStep.set('features');
    component.setModuleAvailability('inventory', 'included');
    component.setFeatureAvailability('feature-inventory', 'included');
    fixture.detectChanges();

    component.nextStep();
    fixture.detectChanges();

    expect(api.updateSubscriptionPlanFeatures).toHaveBeenCalledWith('draft-1', {
      featureAvailability: {
        'feature-pos-checkout': 'included',
        'feature-inventory': 'included'
      }
    });
    expect(JSON.stringify(api.updateSubscriptionPlanFeatures.mock.calls[0][1])).not.toContain('addon');
    expect(component.featuresSaved()).toBe(true);
    expect(component.currentStep()).toBe('pricing');
  });

  it('keeps feature summary unsaved when feature PATCH fails', () => {
    mockCatalogSuccess();
    api.updateSubscriptionPlanFeatures.mockReturnValueOnce(throwError(() => ({ error: { success: false } })));

    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillBasics(component);
    component.savedPlanId.set('draft-1');
    component.basicsSaved.set(true);
    component.currentStep.set('features');
    component.setModuleAvailability('inventory', 'included');
    component.setFeatureAvailability('feature-inventory', 'included');
    fixture.detectChanges();

    component.saveDraft();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Save failed safely');
    expect(component.featuresSaved()).toBe(false);
    expect(component.currentStep()).toBe('features');
  });

  it('renders module availability choices as accessible radio pills', () => {
    mockCatalogSuccess();

    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.currentStep.set('modules');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const inventoryRadios = [
      ...root.querySelectorAll('input[name="module-inventory"]')
    ] as HTMLInputElement[];

    expect(inventoryRadios.length).toBe(2);
    expect(inventoryRadios.every((radio) => radio.type === 'radio')).toBe(true);

    inventoryRadios[0].click();
    fixture.detectChanges();

    expect(component.moduleAvailability()['inventory']).toBe('included');
  });

  it('review summary displays selected modules and features grouped by module', () => {
    mockCatalogSuccess();

    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.setModuleAvailability('inventory', 'included');
    component.setFeatureAvailability('feature-inventory', 'included');
    component.currentStep.set('review');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Selected Modules');
    expect(text).toContain('Core POS');
    expect(text).toContain('Inventory');
    expect(text).toContain('Selected Features');
    expect(text).toContain('POS Checkout');
    expect(text).toContain('Inventory Management');
    expect(component.modulesSummary()).toBe('2 selected');
    expect(component.featuresSummary()).toBe('2 enabled');
  });
});
