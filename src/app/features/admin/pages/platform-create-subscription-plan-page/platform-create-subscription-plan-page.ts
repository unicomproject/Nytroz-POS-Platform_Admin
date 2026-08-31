import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { BreadcrumbItem, PageHeader } from '../../../../shared/components/page-header/page-header';
import { Button } from '../../../../shared/ui/button/button';
import { FormField } from '../../../../shared/ui/form-field/form-field';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import {
  ModuleAvailability,
  PlatformFeatureOption,
  PlatformModuleOption,
  SubscriptionDbBillingCycle,
  SubscriptionPlanDetail,
  SubscriptionPlanDraft,
  SubscriptionPlanLimitsMutationResponse
} from '../../models/platform-subscription-plan.model';
import { subscriptionPlanStatusLabel } from '../../models/subscription-plan-status.util';
import { PlatformSubscriptionPlanApiService } from '../../services/platform-subscription-plan-api.service';
import {
  CreateSubscriptionPlanWizardNav,
  SubscriptionPlanStepVisualState
} from './create-subscription-plan-wizard-nav';

type WizardStep = 'basics' | 'modules' | 'features' | 'pricing' | 'limits' | 'review';

type PendingEditSelection = {
  moduleKeys: string[];
  featureKeys: string[];
};

@Component({
  selector: 'app-platform-create-subscription-plan-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeader,
    Button,
    FormField,
    StatusBadge,
    LoadingSkeleton,
    EmptyState,
    ErrorState,
    ConfirmationDialog,
    CreateSubscriptionPlanWizardNav
  ],
  templateUrl: './platform-create-subscription-plan-page.html',
  styleUrl: './platform-create-subscription-plan-page.scss'
})
export class PlatformCreateSubscriptionPlanPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PlatformSubscriptionPlanApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly steps = [
    { key: 'basics' as WizardStep, label: 'Basics' },
    { key: 'modules' as WizardStep, label: 'Modules' },
    { key: 'features' as WizardStep, label: 'Features' },
    { key: 'pricing' as WizardStep, label: 'Pricing' },
    { key: 'limits' as WizardStep, label: 'Limits' },
    { key: 'review' as WizardStep, label: 'Review & Publish' }
  ];

  readonly billingCycleOptions: ReadonlyArray<{ value: SubscriptionDbBillingCycle; label: string }> = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'custom', label: 'Custom' },
    { value: 'trial', label: 'Trial' },
    { value: 'demo', label: 'Demo' }
  ];

  readonly currencyOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'LKR', label: 'LKR - Sri Lankan Rupee' },
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'EUR', label: 'EUR - Euro' }
  ];

  readonly availabilityOptions: ModuleAvailability[] = ['included', 'not_available'];

  readonly currentStep = signal<WizardStep>('basics');
  readonly modules = signal<PlatformModuleOption[]>([]);
  readonly features = signal<PlatformFeatureOption[]>([]);
  readonly modulesLoading = signal(false);
  readonly featuresLoading = signal(false);
  readonly catalogError = signal<string | null>(null);
  readonly moduleAvailability = signal<Record<string, ModuleAvailability>>({});
  readonly featureAvailability = signal<Record<string, ModuleAvailability>>({});
  readonly isSaving = signal(false);
  readonly showPublishModal = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly savedPlanId = signal<string | null>(null);
  readonly loadedForEdit = signal(false);
  readonly basicsSaved = signal(false);
  readonly featuresSaved = signal(false);
  readonly pricingSaved = signal(false);
  readonly limitsSaved = signal(false);
  readonly basePriceInput = signal('');

  readonly isEditMode = signal(false);
  readonly editPlanName = signal<string | null>(null);
  readonly planLoading = signal(false);
  readonly editBlocked = signal(false);
  readonly editBlockedMessage = signal('');

  private readonly catalogLoaded = signal(false);
  private readonly pendingEditSelection = signal<PendingEditSelection | null>(null);

  private readonly currencyLabels: Record<string, string> = {
    LKR: 'LKR - Sri Lankan Rupee',
    USD: 'USD - US Dollar',
    GBP: 'GBP - British Pound',
    EUR: 'EUR - Euro'
  };

  readonly basicsForm = this.fb.nonNullable.group({
    planName: ['', Validators.required],
    planCode: ['', Validators.required],
    description: ['', Validators.maxLength(500)],
    billingCycle: ['' as SubscriptionDbBillingCycle | '', Validators.required],
    baseCurrency: ['LKR', Validators.required]
  });

  readonly pricingForm = this.fb.nonNullable.group({
    basePrice: [null as number | null, [Validators.required, Validators.min(0)]]
  });

  readonly limitsForm = this.fb.nonNullable.group({
    maxOutlets: [null as number | null, [Validators.required, Validators.min(1)]],
    maxTills: [null as number | null, [Validators.required, Validators.min(1)]],
    maxUsers: [null as number | null, [Validators.required, Validators.min(1)]]
  });

  readonly pageTitle = computed(() =>
    this.isEditMode() ? 'Edit Subscription Plan' : 'Create Subscription Plan'
  );

  readonly pageDescription = computed(() =>
    this.isEditMode()
      ? 'Update this draft plan. Status stays Draft until you publish from Review.'
      : 'Build a subscription package for tenant assignment. Status stays Draft until you publish from Review.'
  );

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => [
    { label: 'Subscription Plans', path: '/admin/subscriptions' },
    { label: this.isEditMode() ? this.editPlanName() ?? 'Edit Plan' : 'Create Plan' }
  ]);

  readonly configBandHeading = computed(() =>
    this.isEditMode() ? 'Edit plan configuration' : 'Plan configuration'
  );

  readonly currentStepNumber = computed(() => this.stepIndex(this.currentStep()) + 1);

  readonly wizardStepStates = computed<Record<string, SubscriptionPlanStepVisualState>>(() => {
    const states: Record<string, SubscriptionPlanStepVisualState> = {};
    this.steps.forEach((step, index) => {
      if (this.currentStep() === step.key) {
        states[step.key] = 'current';
        return;
      }

      states[step.key] = this.isStepComplete(step.key, index) ? 'completed' : 'upcoming';
    });

    return states;
  });

  readonly featureGroups = computed(() => {
    const groups = new Map<string, { moduleId: string; moduleName: string; features: PlatformFeatureOption[] }>();
    const selectedModuleIds = new Set(this.selectedModuleIds());
    for (const feature of this.features().filter((item) => selectedModuleIds.has(item.moduleId))) {
      const existing = groups.get(feature.moduleId);
      if (existing) {
        existing.features.push(feature);
      } else {
        groups.set(feature.moduleId, {
          moduleId: feature.moduleId,
          moduleName: feature.moduleName,
          features: [feature]
        });
      }
    }

    return [...groups.values()];
  });

  readonly selectedModuleIds = computed(() =>
    Object.entries(this.moduleAvailability())
      .filter(([, value]) => value === 'included')
      .map(([moduleId]) => moduleId)
  );

  readonly selectedModuleNames = computed(() => {
    const selected = new Set(this.selectedModuleIds());
    return this.modules()
      .filter((module) => selected.has(module.id))
      .map((module) => module.name);
  });

  readonly selectedFeatureGroups = computed(() =>
    this.featureGroups()
      .map((group) => ({
        moduleName: group.moduleName,
        featureNames: group.features
          .filter((feature) => this.featureAvailability()[feature.id] === 'included')
          .map((feature) => feature.name)
      }))
      .filter((group) => group.featureNames.length > 0)
  );

  availabilityLabel(option: ModuleAvailability): string {
    return option === 'included' ? 'Included' : 'Not Available';
  }

  billingCycleLabel(): string {
    const value = this.basicsForm.controls.billingCycle.value;
    return this.billingCycleOptions.find((option) => option.value === value)?.label ?? 'â€”';
  }

  currencyLabel(): string {
    const code = this.basicsForm.controls.baseCurrency.value;
    return this.currencyLabels[code] ?? code ?? 'â€”';
  }

  currencyCode(): string {
    return this.basicsForm.controls.baseCurrency.value || 'â€”';
  }

  descriptionHelperText(): string {
    const length = this.basicsForm.controls.description.value?.length ?? 0;
    return `Short description about this plan. ${length}/500 characters.`;
  }

  basicsFieldError(
    controlName: 'planName' | 'planCode' | 'description' | 'billingCycle' | 'baseCurrency'
  ): string | null {
    const control: AbstractControl = this.basicsForm.controls[controlName];
    if (!control.touched || control.valid) {
      return null;
    }

    if (control.errors?.['maxlength']) {
      return 'Description cannot exceed 500 characters.';
    }

    const labels: Record<typeof controlName, string> = {
      planName: 'Plan name is required.',
      planCode: 'Plan code is required.',
      description: 'Description is invalid.',
      billingCycle: 'Billing cycle is required.',
      baseCurrency: 'Currency is required.'
    };

    return labels[controlName];
  }

  basePriceError(): string | null {
    const control = this.pricingForm.controls.basePrice;
    if (!control.touched || control.valid) {
      return null;
    }

    return 'Base price is required and cannot be negative.';
  }

  basePriceSummaryLabel(): string {
    const price = this.pricingForm.controls.basePrice.value;
    const currency = this.basicsForm.controls.baseCurrency.value || 'LKR';
    if (price == null) {
      return 'â€”';
    }

    return `${currency} ${this.formatCurrencyAmount(price)}`;
  }

  showBasePriceInSummary(): boolean {
    const stepIndex = this.stepIndex(this.currentStep());
    return this.pricingForm.controls.basePrice.value != null || stepIndex >= this.stepIndex('pricing');
  }

  readonly selectedModulesCount = computed(() =>
    Object.values(this.moduleAvailability()).filter((value) => value === 'included').length
  );

  readonly enabledFeaturesCount = computed(() =>
    Object.values(this.featureAvailability()).filter((value) => value === 'included').length
  );

  readonly modulesSummary = computed(() =>
    this.selectedModulesCount() > 0 ? `${this.selectedModulesCount()} selected` : 'Not selected'
  );

  readonly featuresSummary = computed(() =>
    this.enabledFeaturesCount() > 0 ? `${this.enabledFeaturesCount()} enabled` : 'Not selected'
  );

  readonly pricingSummary = computed(() =>
    this.pricingSaved() ? 'Configured' : 'Not configured'
  );

  readonly limitsSummary = computed(() =>
    this.limitsSaved() ? 'Configured' : 'Not configured'
  );

  readonly modulesSummaryClass = computed(() =>
    this.modulesSummary() === 'Not selected' ? 'status-muted' : 'status-success'
  );

  readonly featuresSummaryClass = computed(() =>
    this.featuresSummary() === 'Not selected' ? 'status-muted' : 'status-success'
  );

  readonly pricingSummaryClass = computed(() =>
    this.pricingSummary() === 'Configured' ? 'status-info' : 'status-muted'
  );

  readonly limitsSummaryClass = computed(() =>
    this.limitsSummary() === 'Configured' ? 'status-info' : 'status-muted'
  );

  ngOnInit(): void {
    this.loadCatalogs();
    const routePlanId = this.route.snapshot.paramMap.get('planId');
    const state = history.state as { planId?: string; mode?: 'view' | 'edit' };
    const planId = routePlanId || state?.planId;

    if (planId) {
      this.isEditMode.set(true);
      this.loadPlanForEdit(planId);
    }
  }

  stepIndex(step: WizardStep): number {
    return this.steps.findIndex((item) => item.key === step);
  }

  isStepComplete(step: WizardStep, index: number): boolean {
    const currentIndex = this.stepIndex(this.currentStep());

    if (step === 'basics') {
      return this.basicsSaved();
    }

    if (step === 'modules') {
      return this.basicsSaved() && currentIndex > index;
    }

    if (step === 'features') {
      return this.featuresSaved();
    }

    if (step === 'pricing') {
      return this.pricingSaved();
    }

    if (step === 'limits') {
      return this.limitsSaved();
    }

    return false;
  }

  limitsFieldError(controlName: 'maxOutlets' | 'maxTills' | 'maxUsers'): string | null {
    const control = this.limitsForm.controls[controlName];
    if (!control.touched || control.valid) {
      return null;
    }

    if (control.errors?.['required']) {
      return 'This limit is required.';
    }

    if (control.errors?.['min']) {
      return 'Limit must be at least 1.';
    }

    return 'Enter a valid whole number.';
  }

  nextStep(): void {
    if (this.currentStep() === 'basics') {
      if (!this.validateBasicsStep()) {
        return;
      }

      this.persistBasicsAndAdvance();
      return;
    }

    if (this.currentStep() === 'pricing') {
      this.persistPricing({ advanceToLimits: true });
      return;
    }

    if (this.currentStep() === 'features') {
      this.persistFeatures({ advanceToPricing: true });
      return;
    }

    if (this.currentStep() === 'limits') {
      this.persistLimits({ advanceToReview: true });
      return;
    }

    const index = this.stepIndex(this.currentStep());
    if (index < this.steps.length - 1) {
      this.currentStep.set(this.steps[index + 1].key);
    }
  }

  prevStep(): void {
    const index = this.stepIndex(this.currentStep());
    if (index > 0) {
      this.currentStep.set(this.steps[index - 1].key);
    }
  }

  goBack(): void {
    if (this.currentStep() === 'basics') {
      if (this.isEditMode() && this.savedPlanId()) {
        void this.router.navigate(['/admin/subscriptions', this.savedPlanId()]);
        return;
      }
      void this.router.navigate(['/admin/subscriptions']);
      return;
    }

    this.prevStep();
  }

  onPlanCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase();
    this.basicsForm.controls.planCode.setValue(upper, { emitEvent: false });
    input.value = upper;
  }

  onBasePriceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.basePriceInput.set(input.value);
    const parsed = this.parseCurrencyAmount(input.value);
    this.pricingForm.controls.basePrice.setValue(parsed);
    this.pricingForm.controls.basePrice.markAsTouched();
    this.pricingForm.controls.basePrice.updateValueAndValidity();
  }

  onBasePriceBlur(): void {
    const parsed = this.parseCurrencyAmount(this.basePriceInput());
    if (parsed == null) {
      this.pricingForm.controls.basePrice.setValue(null);
      return;
    }

    this.pricingForm.controls.basePrice.setValue(parsed);
    this.basePriceInput.set(this.formatCurrencyAmount(parsed));
  }

  setModuleAvailability(moduleId: string, value: ModuleAvailability): void {
    const module = this.modules().find((item) => item.id === moduleId);
    if (module?.isLocked) {
      this.moduleAvailability.update((current) => ({ ...current, [moduleId]: 'included' }));
      return;
    }

    this.moduleAvailability.update((current) => ({ ...current, [moduleId]: value }));
    this.featuresSaved.set(false);

    if (value === 'not_available') {
      const moduleFeatures = this.features().filter((feature) => feature.moduleId === moduleId);
      this.featureAvailability.update((current) => {
        const next = { ...current };
        for (const feature of moduleFeatures) {
          next[feature.id] = 'not_available';
        }
        return next;
      });
      return;
    }

    const moduleFeatures = this.features().filter((feature) => feature.moduleId === moduleId);
    this.featureAvailability.update((current) => {
      const next = { ...current };
      for (const feature of moduleFeatures) {
        next[feature.id] = next[feature.id] ?? 'not_available';
      }
      return next;
    });
  }

  setFeatureAvailability(featureId: string, value: ModuleAvailability): void {
    const feature = this.features().find((item) => item.id === featureId);
    if (feature?.isLocked) {
      this.featureAvailability.update((current) => ({ ...current, [featureId]: 'included' }));
      return;
    }

    this.featureAvailability.update((current) => ({ ...current, [featureId]: value }));
    this.featuresSaved.set(false);
  }

  isFeatureDisabled(feature: PlatformFeatureOption): boolean {
    return feature.isLocked || this.moduleAvailability()[feature.moduleId] !== 'included';
  }

  saveDraft(): void {
    if (this.currentStep() === 'basics') {
      this.saveBasicsDraft();
      return;
    }

    if (this.currentStep() === 'pricing') {
      this.persistPricing({ advanceToLimits: false });
      return;
    }

    if (this.currentStep() === 'limits') {
      this.persistLimits({ advanceToReview: false });
      return;
    }

    if (this.currentStep() === 'features') {
      this.persistFeatures({ advanceToPricing: false });
      return;
    }

    if (!this.validateBasicsStep()) {
      this.errorMessage.set('Plan name, plan code, billing cycle, and currency are required before saving.');
      return;
    }

    if (this.shouldValidatePricingForSave() && !this.pricingSaved() && !this.validatePricingStep()) {
      this.errorMessage.set('Base price is required before saving.');
      return;
    }

    if (this.shouldValidateLimitsForSave() && !this.validateLimitsStep()) {
      this.errorMessage.set('Outlet, till, and user limits are required before saving.');
      return;
    }

    this.isSaving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.ensureDraftPlanId((planId) => {
      if (this.shouldValidatePricingForSave() && !this.pricingSaved()) {
        this.api.updateSubscriptionPlanPricing(planId, {
          basePrice: this.pricingForm.controls.basePrice.value!
        }).subscribe({
          next: () => {
            this.pricingSaved.set(true);
            this.persistLimitsDraft(planId);
          },
          error: (error) => {
            this.errorMessage.set(this.apiError.toSafeMessage(error));
            this.isSaving.set(false);
          }
        });
        return;
      }

      this.persistLimitsDraft(planId);
    });
  }

  private persistFeatures(options: { advanceToPricing: boolean }): void {
    if (!this.validateFeaturesStep()) {
      return;
    }

    this.isSaving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.ensureDraftPlanId((planId) => {
      this.api.updateSubscriptionPlanFeatures(planId, {
        featureAvailability: this.buildFeatureAvailabilityRequest()
      }).subscribe({
        next: (response) => {
          this.applyFeaturesResponse(response.includedFeatureIds);
          this.featuresSaved.set(true);
          this.isSaving.set(false);
          if (options.advanceToPricing) {
            this.currentStep.set('pricing');
          } else {
            this.successMessage.set('Subscription plan saved as draft');
          }
        },
        error: (error) => {
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.isSaving.set(false);
        }
      });
    });
  }

  private saveBasicsDraft(): void {
    if (!this.validateBasicsStep()) {
      this.errorMessage.set('Plan name, plan code, billing cycle, and currency are required before saving.');
      return;
    }

    this.isSaving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const existingPlanId = this.savedPlanId();
    const saveRequest$ = existingPlanId
      ? this.api.updateSubscriptionPlanDraft(existingPlanId, {
        planCode: this.basicsForm.controls.planCode.value,
        planName: this.basicsForm.controls.planName.value,
        description: this.basicsForm.controls.description.value ?? '',
        billingCycle: this.basicsForm.controls.billingCycle.value as SubscriptionDbBillingCycle
      })
      : this.api.createSubscriptionPlanDraft(this.buildDraft());

    saveRequest$.subscribe({
      next: (response) => {
        this.applyDraftResponse(response);
        this.successMessage.set('Subscription plan saved as draft');
        this.isSaving.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.isSaving.set(false);
      }
    });
  }

  private persistBasicsAndAdvance(): void {
    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const existingPlanId = this.savedPlanId();
    const saveRequest$ = existingPlanId
      ? this.api.updateSubscriptionPlanDraft(existingPlanId, {
        planCode: this.basicsForm.controls.planCode.value,
        planName: this.basicsForm.controls.planName.value,
        description: this.basicsForm.controls.description.value ?? '',
        billingCycle: this.basicsForm.controls.billingCycle.value as SubscriptionDbBillingCycle
      })
      : this.api.createSubscriptionPlanDraft(this.buildDraft());

    saveRequest$.subscribe({
      next: (response) => {
        this.applyDraftResponse(response);
        this.isSaving.set(false);
        this.currentStep.set('modules');
      },
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.isSaving.set(false);
      }
    });
  }

  private persistPricing(options: { advanceToLimits: boolean }): void {
    if (!this.validatePricingStep()) {
      return;
    }

    this.isSaving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const completePricingSave = (planId: string) => {
      this.api.updateSubscriptionPlanPricing(planId, {
        basePrice: this.pricingForm.controls.basePrice.value!
      }).subscribe({
        next: () => {
          this.pricingSaved.set(true);
          this.isSaving.set(false);
          if (options.advanceToLimits) {
            this.currentStep.set('limits');
          } else {
            this.successMessage.set('Subscription plan saved as draft');
          }
        },
        error: (error) => {
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.isSaving.set(false);
        }
      });
    };

    this.ensureDraftExistsBeforePricing(completePricingSave);
  }

  private ensureDraftExistsBeforePricing(onReady: (planId: string) => void): void {
    const existingPlanId = this.savedPlanId();
    if (existingPlanId) {
      onReady(existingPlanId);
      return;
    }

    if (!this.validateBasicsStep()) {
      this.isSaving.set(false);
      this.errorMessage.set('Please complete and save the Basics step before configuring pricing.');
      this.currentStep.set('basics');
      return;
    }

    this.api.createSubscriptionPlanDraft(this.buildDraft()).subscribe({
      next: (response) => {
        this.applyDraftResponse(response);
        onReady(response.id);
      },
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.isSaving.set(false);
      }
    });
  }

  private applyDraftResponse(response: { id: string; status?: string }): void {
    this.savedPlanId.set(response.id);
    this.basicsSaved.set(true);
  }

  private persistLimitsDraft(planId: string): void {
    if (this.shouldValidateLimitsForSave()) {
      this.api.updateSubscriptionPlanLimits(planId, this.buildLimitsRequest()).subscribe({
        next: (response) => {
          this.applyLimitsResponse(response);
          this.limitsSaved.set(true);
          this.successMessage.set('Subscription plan saved as draft');
          this.isSaving.set(false);
        },
        error: (error) => {
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.isSaving.set(false);
        }
      });
      return;
    }

    this.successMessage.set('Subscription plan saved as draft');
    this.isSaving.set(false);
  }

  private persistLimits(options: { advanceToReview: boolean }): void {
    if (!this.validateLimitsStep()) {
      return;
    }

    const prerequisiteError = this.validateLimitsPrerequisites();
    if (prerequisiteError) {
      this.errorMessage.set(prerequisiteError.message);
      if (prerequisiteError.step) {
        this.currentStep.set(prerequisiteError.step);
      }
      return;
    }

    this.isSaving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.api.updateSubscriptionPlanLimits(this.savedPlanId()!, this.buildLimitsRequest()).subscribe({
      next: (response) => {
        this.applyLimitsResponse(response);
        this.limitsSaved.set(true);
        this.isSaving.set(false);
        if (options.advanceToReview) {
          this.currentStep.set('review');
        } else {
          this.successMessage.set('Subscription plan saved as draft');
        }
      },
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.isSaving.set(false);
      }
    });
  }

  private validateLimitsPrerequisites(): { message: string; step?: WizardStep } | null {
    if (!this.savedPlanId()) {
      return {
        message: 'Please save the Basics step before configuring limits.',
        step: 'basics'
      };
    }

    if (!this.pricingSaved()) {
      return {
        message: 'Please save the Pricing step before configuring limits.',
        step: 'pricing'
      };
    }

    return null;
  }

  private applyLimitsResponse(response: SubscriptionPlanLimitsMutationResponse): void {
    this.limitsForm.patchValue({
      maxOutlets: response.maxOutlets,
      maxTills: response.maxTills,
      maxUsers: response.maxUsers
    });
  }

  private ensureDraftPlanId(onReady: (planId: string) => void): void {
    const existingPlanId = this.savedPlanId();
    if (existingPlanId) {
      onReady(existingPlanId);
      return;
    }

    if (!this.validateBasicsStep()) {
      this.errorMessage.set('Plan name, plan code, billing cycle, and currency are required before saving.');
      this.isSaving.set(false);
      return;
    }

    this.api.createSubscriptionPlanDraft(this.buildDraft()).subscribe({
      next: (response) => {
        this.applyDraftResponse(response);
        onReady(response.id);
      },
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.isSaving.set(false);
      }
    });
  }

  private shouldValidatePricingForSave(): boolean {
    return this.currentStep() === 'pricing'
      || this.currentStep() === 'limits'
      || this.currentStep() === 'review'
      || this.basePriceInput().trim().length > 0;
  }

  private shouldValidateLimitsForSave(): boolean {
    return this.currentStep() === 'limits'
      || this.currentStep() === 'review'
      || this.hasLimitsInput();
  }

  openPublishModal(): void {
    this.showPublishModal.set(true);
  }

  closePublishModal(): void {
    this.showPublishModal.set(false);
  }

  confirmPublish(): void {
    if (this.isSaving()) {
      return;
    }

    if (!this.validateBasicsStep()) {
      this.errorMessage.set('Plan name, plan code, billing cycle, and currency are required before publishing.');
      return;
    }

    if (!this.validateFeaturesStep() || !this.enabledFeaturesCount()) {
      this.errorMessage.set('At least one included feature must be configured before publishing.');
      return;
    }

    if (!this.validatePricingStep()) {
      this.errorMessage.set('Base price is required before publishing.');
      return;
    }

    if (!this.validateLimitsStep()) {
      this.errorMessage.set('Outlet, till, and user limits are required before publishing.');
      return;
    }

    this.isSaving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.ensureDraftPlanId((planId) => {
      this.api.updateSubscriptionPlanFeatures(planId, {
        featureAvailability: this.buildFeatureAvailabilityRequest()
      }).subscribe({
        next: (response) => {
          this.applyFeaturesResponse(response.includedFeatureIds);
          this.featuresSaved.set(true);
          if (!response.includedFeatureIds.length) {
            this.errorMessage.set('At least one included feature must be configured before publishing.');
            this.isSaving.set(false);
            return;
          }

          this.api.updateSubscriptionPlanPricing(planId, {
            basePrice: this.pricingForm.controls.basePrice.value!
          }).subscribe({
            next: () => {
              this.pricingSaved.set(true);
              this.api.updateSubscriptionPlanLimits(planId, this.buildLimitsRequest()).subscribe({
                next: () => {
                  this.limitsSaved.set(true);
                  this.api.publishSubscriptionPlan(planId).subscribe({
                    next: () => {
                      this.isSaving.set(false);
                      this.closePublishModal();
                      void this.router.navigate(['/admin/subscriptions'], {
                        state: { successMessage: 'Subscription plan published successfully.' }
                      });
                    },
                    error: (error) => {
                      this.errorMessage.set(this.apiError.toSafeMessage(error));
                      this.isSaving.set(false);
                    }
                  });
                },
                error: (error) => {
                  this.errorMessage.set(this.apiError.toSafeMessage(error));
                  this.isSaving.set(false);
                }
              });
            },
            error: (error) => {
              this.errorMessage.set(this.apiError.toSafeMessage(error));
              this.isSaving.set(false);
            }
          });
        },
        error: (error) => {
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.isSaving.set(false);
        }
      });
    });
  }

  private validateBasicsStep(): boolean {
    this.basicsForm.markAllAsTouched();
    return this.basicsForm.valid;
  }

  private validatePricingStep(): boolean {
    this.syncBasePriceFromInput();
    this.pricingForm.markAllAsTouched();
    return this.pricingForm.valid;
  }

  private validateFeaturesStep(): boolean {
    if (!this.modules().length || !this.features().length) {
      this.errorMessage.set('Module and feature catalog must be loaded before saving features.');
      return false;
    }

    if (!this.selectedModulesCount()) {
      this.errorMessage.set('Select at least one module before saving features.');
      return false;
    }

    if (!this.enabledFeaturesCount()) {
      this.errorMessage.set('Select at least one included feature before continuing.');
      return false;
    }

    return true;
  }

  private validateLimitsStep(): boolean {
    this.limitsForm.markAllAsTouched();
    return this.limitsForm.valid;
  }

  private hasLimitsInput(): boolean {
    const { maxOutlets, maxTills, maxUsers } = this.limitsForm.getRawValue();
    return maxOutlets != null || maxTills != null || maxUsers != null;
  }

  private buildLimitsRequest() {
    const { maxOutlets, maxTills, maxUsers } = this.limitsForm.getRawValue();
    return {
      maxOutlets: maxOutlets!,
      maxTills: maxTills!,
      maxUsers: maxUsers!
    };
  }

  private buildFeatureAvailabilityRequest(): Record<string, ModuleAvailability> {
    const availability: Record<string, ModuleAvailability> = {};
    const selectedModules = new Set(this.selectedModuleIds());

    for (const feature of this.features()) {
      availability[feature.id] = feature.isLocked
        || (selectedModules.has(feature.moduleId) && this.featureAvailability()[feature.id] === 'included')
        ? 'included'
        : 'not_available';
    }

    return availability;
  }

  private applyFeaturesResponse(includedFeatureIds: string[]): void {
    const included = new Set(includedFeatureIds);
    this.featureAvailability.update((current) => {
      const next = { ...current };
      for (const feature of this.features()) {
        next[feature.id] = feature.isLocked || included.has(feature.id) ? 'included' : 'not_available';
      }
      return next;
    });
  }

  private syncBasePriceFromInput(): void {
    const parsed = this.parseCurrencyAmount(this.basePriceInput());
    this.pricingForm.controls.basePrice.setValue(parsed);
    this.pricingForm.controls.basePrice.updateValueAndValidity();
  }

  private parseCurrencyAmount(raw: string): number | null {
    const cleaned = raw.replace(/,/g, '').trim();
    if (!cleaned) {
      return null;
    }

    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private formatCurrencyAmount(value: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  reloadCatalogs(): void {
    this.loadCatalogs();
  }

  private loadCatalogs(): void {
    this.modulesLoading.set(true);
    this.featuresLoading.set(true);
    this.catalogError.set(null);
    this.catalogLoaded.set(false);

    this.api.getSubscriptionCatalog().subscribe({
      next: (catalog) => {
        const modules = catalog.modules.map((module) => ({
          id: module.id,
          moduleKey: module.code,
          name: module.name,
          description: module.description ?? null,
          sortOrder: module.sortOrder,
          isCore: module.isCore,
          isLocked: module.isLocked,
          defaultAvailability: module.defaultAvailability
        }));
        const features = catalog.modules.flatMap((module) =>
          module.features.map((feature) => ({
            id: feature.id,
            moduleId: module.id,
            moduleName: module.name,
            featureKey: feature.code,
            name: feature.name,
            description: feature.description ?? null,
            entitlementKey: feature.entitlementKey ?? null,
            sortOrder: feature.sortOrder,
            isCore: feature.isCore,
            isLocked: feature.isLocked,
            defaultAvailability: feature.defaultAvailability
          }))
        );

        this.modules.set(modules);
        this.features.set(features);

        const availability: Record<string, ModuleAvailability> = {};
        for (const module of modules) {
          availability[module.id] = module.defaultAvailability;
        }
        this.moduleAvailability.set(availability);

        const featureAvailability: Record<string, ModuleAvailability> = {};
        for (const feature of features) {
          featureAvailability[feature.id] = feature.defaultAvailability;
        }
        this.featureAvailability.set(featureAvailability);
        this.modulesLoading.set(false);
        this.featuresLoading.set(false);
        this.catalogLoaded.set(true);
        this.applyEditSelection();
      },
      error: (error) => {
        this.modules.set([]);
        this.features.set([]);
        this.moduleAvailability.set({});
        this.featureAvailability.set({});
        this.catalogError.set(this.apiError.toSafeMessage(error));
        this.modulesLoading.set(false);
        this.featuresLoading.set(false);
      }
    });
  }

  private loadPlanForEdit(planId: string): void {
    this.planLoading.set(true);

    this.api.getSubscriptionPlanDetail(planId).subscribe({
      next: (plan) => {
        this.planLoading.set(false);
        this.editPlanName.set(plan.planName);

        if (!this.isDraftPlan(plan)) {
          this.editBlocked.set(true);
          this.editBlockedMessage.set(
            `Only draft plans can be edited in this workspace. This plan is ${subscriptionPlanStatusLabel(plan.status)}.`
          );
          return;
        }

        this.savedPlanId.set(plan.id);
        this.loadedForEdit.set(true);
        this.basicsSaved.set(true);
        this.pricingSaved.set(true);
        this.limitsSaved.set(true);
        this.basicsForm.patchValue({
          planName: plan.planName,
          planCode: plan.planCode,
          description: plan.description ?? '',
          billingCycle: plan.billingCycle,
          baseCurrency: plan.baseCurrency
        });
        this.pricingForm.patchValue({ basePrice: plan.basePrice });
        this.basePriceInput.set(plan.basePrice.toString());
        this.limitsForm.patchValue({
          maxOutlets: plan.maxOutlets,
          maxTills: plan.maxTills,
          maxUsers: plan.maxUsers
        });

        this.queueEditSelection(plan);
      },
      error: (error) => {
        this.planLoading.set(false);
        this.errorMessage.set(this.apiError.toSafeMessage(error));
      }
    });
  }

  private isDraftPlan(plan: SubscriptionPlanDetail): boolean {
    const status = String(plan.status ?? '').trim().toLowerCase();
    return status === '' || status === 'draft';
  }

  /** Entitlements arrive with the plan detail; the catalog may still be in flight. */
  private queueEditSelection(plan: SubscriptionPlanDetail): void {
    const planModules = plan.modules ?? [];
    if (!planModules.length) {
      return;
    }

    const moduleKeys: string[] = [];
    const featureKeys: string[] = [];

    for (const module of planModules) {
      moduleKeys.push(module.id, module.code);
      for (const feature of module.features ?? []) {
        featureKeys.push(feature.id, feature.code);
      }
    }

    this.pendingEditSelection.set({ moduleKeys, featureKeys });
    this.applyEditSelection();
  }

  private applyEditSelection(): void {
    const selection = this.pendingEditSelection();
    if (!selection || !this.catalogLoaded()) {
      return;
    }

    const includedModules = new Set(selection.moduleKeys.filter((key) => !!key));
    const includedFeatures = new Set(selection.featureKeys.filter((key) => !!key));

    this.moduleAvailability.update((current) => {
      const next = { ...current };
      for (const module of this.modules()) {
        next[module.id] = module.isLocked || includedModules.has(module.id) || includedModules.has(module.moduleKey)
          ? 'included'
          : 'not_available';
      }
      return next;
    });

    this.featureAvailability.update((current) => {
      const next = { ...current };
      for (const feature of this.features()) {
        next[feature.id] = feature.isLocked || includedFeatures.has(feature.id) || includedFeatures.has(feature.featureKey)
          ? 'included'
          : 'not_available';
      }
      return next;
    });

    if (includedFeatures.size > 0) {
      this.featuresSaved.set(true);
    }

    this.pendingEditSelection.set(null);
  }

  private buildDraft(): SubscriptionPlanDraft {
    return {
      planName: this.basicsForm.controls.planName.value,
      planCode: this.basicsForm.controls.planCode.value,
      description: this.basicsForm.controls.description.value,
      billingCycle: this.basicsForm.controls.billingCycle.value,
      baseCurrency: this.basicsForm.controls.baseCurrency.value,
      basePrice: this.pricingForm.controls.basePrice.value,
      maxOutlets: this.limitsForm.controls.maxOutlets.value,
      maxTills: this.limitsForm.controls.maxTills.value,
      maxUsers: this.limitsForm.controls.maxUsers.value,
      moduleAvailability: this.moduleAvailability(),
      featureAvailability: this.featureAvailability()
    };
  }
}
