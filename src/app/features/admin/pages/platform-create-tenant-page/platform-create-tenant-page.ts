import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { BreadcrumbItem, PageHeader } from '../../../../shared/components/page-header/page-header';
import { Button } from '../../../../shared/ui/button/button';
import { FormField } from '../../../../shared/ui/form-field/form-field';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { TENANT_SUBSCRIPTION_TYPE_OPTIONS } from '../../constants/tenant-subscription-type.constants';
import {
  TenantCreateAddonOption,
  TenantCreateCatalogFeature,
  TenantCreateOptions,
  TenantCreatePlanOption,
  TenantCreateWizardState
} from '../../models/platform-tenant-create.model';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import { TenantOnboardingDraft, TenantOnboardingPayload } from '../../models/platform-tenant-onboarding.model';
import { normalizeBillingCycleForApi } from '../../utils/billing-cycle.util';
import {
  controlIssueMessage,
  controlValidationMessage,
  isoCountryCodeValidator,
  isoCurrencyCodeValidator
} from '../../validators/platform-tenant-create.validators';

type WizardStep =
  | 'business-info'
  | 'plan-selection'
  | 'limits-addons'
  | 'feature-entitlements'
  | 'tenant-admin'
  | 'billing-subscription'
  | 'review-create';

type StepVisualState = 'current' | 'completed' | 'upcoming' | 'error';

@Component({
  selector: 'app-platform-create-tenant-page',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeader,
    Button,
    FormField,
    StatusBadge,
    LoadingSkeleton,
    ErrorState,
    EmptyState
  ],
  templateUrl: './platform-create-tenant-page.html',
  styleUrl: './platform-create-tenant-page.scss'
})
export class PlatformCreateTenantPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PlatformTenantApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly steps = [
    { key: 'business-info' as WizardStep, label: 'Tenant Basic Details', shortLabel: 'Identity' },
    { key: 'plan-selection' as WizardStep, label: 'Business & Contact Information', shortLabel: 'Contacts' },
    { key: 'limits-addons' as WizardStep, label: 'Subscription Plan', shortLabel: 'Plan' },
    { key: 'billing-subscription' as WizardStep, label: 'Billing / Payment Setup', shortLabel: 'Billing' },
    { key: 'feature-entitlements' as WizardStep, label: 'Feature Entitlements', shortLabel: 'Features' },
    { key: 'tenant-admin' as WizardStep, label: 'Tenant Admin User', shortLabel: 'Admin' },
    { key: 'review-create' as WizardStep, label: 'Review, Create & Activation', shortLabel: 'Review' }
  ];

  private readonly stepPurposeByKey: Record<WizardStep, string> = {
    'business-info': 'Define tenant identity, locale defaults, and operating mode.',
    'plan-selection': 'Capture registered address and primary billing contacts.',
    'limits-addons': 'Choose a subscription plan, base limits, and optional add-ons.',
    'billing-subscription': 'Set subscription type and billing preferences for later activation.',
    'feature-entitlements': 'Enable plan-allowed features for the new tenant.',
    'tenant-admin': 'Invite the first tenant administrator after activation.',
    'review-create': 'Confirm the configuration before provisioning begins.'
  };

  readonly subscriptionTypeOptions = TENANT_SUBSCRIPTION_TYPE_OPTIONS;

  readonly currentStep = signal<WizardStep>('business-info');
  readonly createOptions = signal<TenantCreateOptions>({
    plans: [],
    addons: [],
    catalogModules: [],
    billingStatuses: [],
    paymentMethods: [],
    countryCodes: [],
    currencies: [],
    timezones: [],
    locales: [],
    businessTypes: [],
    operatingModes: [],
    subscriptionStatuses: [],
    billingCycles: [],
    defaults: { countryCode: null, currencyCode: null, timezone: null, locale: null, billingCycle: null },
    validation: { tenantCodePattern: '^[A-Z0-9-]{3,60}$', tenantSlugPattern: '^[a-z0-9-]+$', draftRetentionDays: 30, platformBaseDomain: null }
  });
  readonly addonQuantities = signal<Record<string, number>>({});
  readonly selectedFeatureIds = signal<string[]>([]);
  readonly isLoadingOptions = signal(true);
  readonly isLoadingDraft = signal(false);
  readonly optionsLoadFailed = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly countryOptionsLoadError = signal<string | null>(null);
  readonly draftId = signal<string | null>(null);
  readonly draftVersion = signal<number | null>(null);
  readonly progressPercent = signal(0);
  readonly saveState = signal<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  readonly lastSavedAt = signal<string | null>(null);
  private finalizationKey: string | null = null;

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => [
    { label: 'Tenants', path: '/admin/tenants' },
    { label: this.draftId() ? 'Resume' : 'Create' }
  ]);

  readonly pageTitle = computed(() =>
    this.draftId() ? 'Resume tenant onboarding' : 'Create a new tenant'
  );

  readonly pageDescription = computed(() =>
    this.draftId()
      ? 'Continue durable onboarding from the saved draft.'
      : 'Set up the business, subscription and first Tenant Administrator.'
  );

  readonly currentStepLabel = computed(() => {
    const step = this.steps.find((item) => item.key === this.currentStep());
    return step?.label ?? '';
  });

  readonly currentStepPurpose = computed(() => this.stepPurposeByKey[this.currentStep()]);

  readonly currentStepNumber = computed(() => this.stepIndex(this.currentStep()) + 1);

  readonly wizardStepProgressPercent = computed(() =>
    Math.round((this.currentStepNumber() / this.steps.length) * 100)
  );

  readonly businessInfoForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
    tenantSlug: ['', Validators.required],
    requestedSubdomain: [''],
    name: ['', Validators.required],
    legalName: ['', Validators.required],
    registrationNumber: [''],
    taxNumber: [''],
    baseCurrency: ['', [Validators.required, isoCurrencyCodeValidator()]],
    defaultTimezone: ['', Validators.required],
    defaultLocale: ['', Validators.required],
    operatingMode: ['', Validators.required],
    businessType: ['', Validators.required],
    countryCode: ['', [Validators.required, isoCountryCodeValidator()]],
    addressLine1: ['', Validators.required],
    addressCity: [''],
    addressCountryCode: ['', [Validators.required, isoCountryCodeValidator()]],
    primaryContactName: ['', Validators.required],
    primaryContactEmail: ['', [Validators.required, Validators.email]],
    primaryContactPhone: ['', Validators.required],
    websiteUrl: [''],
    billingContactName: ['', Validators.required],
    billingContactEmail: ['', [Validators.required, Validators.email]],
    supportContactName: [''],
    supportContactEmail: ['', Validators.email]
  });

  readonly planSelectionForm = this.fb.nonNullable.group({
    subscriptionPlanId: ['', Validators.required]
  });

  readonly limitsAddonsForm = this.fb.group({
    maxOutlets: [null as number | null, [Validators.required, Validators.min(1)]],
    maxTills: [null as number | null, [Validators.required, Validators.min(1)]],
    maxUsers: [null as number | null, [Validators.required, Validators.min(1)]]
  });

  readonly tenantAdminForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: ['']
  });

  readonly billingSubscriptionForm = this.fb.nonNullable.group({
    subscriptionType: ['', Validators.required],
    billingStatus: ['', Validators.required],
    billingCycle: ['', Validators.required],
    subscriptionStatus: ['', Validators.required],
    createDraftInvoice: [false],
    autoRenew: [true],
    invoiceEmail: ['', Validators.email],
    paymentMethod: [''],
    notes: ['']
  });

  selectedPlan(): TenantCreatePlanOption | null {
    const planId = this.planSelectionForm.controls.subscriptionPlanId.value;
    return this.createOptions().plans.find((plan) => plan.id === planId) ?? null;
  }

  ngOnInit(): void {
    this.loadCreateOptions();
    const draftId = this.route.snapshot.paramMap.get('draftId');
    if (draftId) {
      this.loadDraft(draftId);
    }
  }

  stepIndex(step: WizardStep): number {
    return this.steps.findIndex((item) => item.key === step);
  }

  stepState(step: WizardStep, index: number): StepVisualState {
    if (this.currentStep() === step) {
      return 'current';
    }

    if (this.stepIndex(this.currentStep()) > index) {
      return this.stepErrorCount(step) > 0 ? 'error' : 'completed';
    }

    return 'upcoming';
  }

  showStepErrorCount(step: WizardStep, index: number): boolean {
    // Past steps with unresolved issues keep an accessible count badge.
    // Current-step field errors stay in the form; avoid a noisy badge on first paint.
    return this.stepState(step, index) === 'error' && this.stepErrorCount(step) > 0;
  }

  stepPurpose(step: WizardStep): string {
    return this.stepPurposeByKey[step];
  }

  displayValue(value: string | null | undefined): string {
    const trimmed = (value ?? '').trim();
    return trimmed.length ? trimmed : '—';
  }

  summaryValue(value: string | null | undefined, emptyLabel = 'Not entered'): string {
    const trimmed = (value ?? '').trim();
    return trimmed.length ? trimmed : emptyLabel;
  }

  stepErrorAriaLabel(stepLabel: string, count: number): string {
    return `${stepLabel} — ${count} validation error${count === 1 ? '' : 's'}`;
  }

  adminDisplayName(): string {
    return this.displayValue(
      [this.tenantAdminForm.controls.firstName.value, this.tenantAdminForm.controls.lastName.value]
        .filter((part) => Boolean(part?.trim()))
        .join(' ')
    );
  }

  saveStateVariant(): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
    switch (this.saveState()) {
      case 'saving':
        return 'info';
      case 'saved':
        return 'success';
      case 'failed':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  saveStateLabel(): string {
    switch (this.saveState()) {
      case 'saving':
        return 'Saving';
      case 'saved':
        return 'Saved';
      case 'failed':
        return 'Save failed';
      default:
        return 'Not saved';
    }
  }

  retryLoadOptions(): void {
    this.loadCreateOptions();
  }

  cancelWizard(): void {
    void this.router.navigate(['/admin/tenants']);
  }

  nextStep(): void {
    if (!this.validateCurrentStep()) {
      return;
    }

    const index = this.stepIndex(this.currentStep());
    if (index < this.steps.length - 1) {
      this.currentStep.set(this.steps[index + 1].key);
      this.saveDraft();
    }
  }

  goBack(): void {
    const index = this.stepIndex(this.currentStep());
    if (index <= 0) {
      void this.router.navigate(['/admin/tenants']);
      return;
    }

    this.currentStep.set(this.steps[index - 1].key);
  }

  selectPlan(planId: string): void {
    this.planSelectionForm.controls.subscriptionPlanId.setValue(planId);
    this.errorMessage.set(null);
    this.applyPlanDefaults();
    this.syncFeaturesForPlan();
  }

  addonQuantity(addonId: string): number {
    return this.addonQuantities()[addonId] ?? 0;
  }

  setAddonQuantity(addon: TenantCreateAddonOption, rawValue: string | number): void {
    const value = Math.max(0, Number.parseInt(String(rawValue), 10) || 0);
    this.addonQuantities.update((current) => ({ ...current, [addon.id]: value }));
  }

  effectiveLimit(limitKey: 'max_outlets' | 'max_tills' | 'max_users'): number {
    const base = this.baseLimit(limitKey);
    let increment = 0;

    for (const addon of this.createOptions().addons) {
      const quantity = this.addonQuantities()[addon.id] ?? 0;
      if (!quantity) {
        continue;
      }

      increment += (addon.limitIncrementByKey[limitKey] ?? 0) * quantity;
    }

    return base + increment;
  }

  isFeatureAllowed(feature: TenantCreateCatalogFeature): boolean {
    const plan = this.selectedPlan();
    if (!plan) {
      return false;
    }

    return plan.includedFeatureIds.includes(feature.id) || plan.includedFeatureCodes.includes(feature.featureCode);
  }

  isFeatureEnabled(featureId: string): boolean {
    return this.selectedFeatureIds().includes(featureId);
  }

  toggleFeature(feature: TenantCreateCatalogFeature, event: Event): void {
    if (!this.isFeatureAllowed(feature)) {
      return;
    }

    const input = event.target as HTMLInputElement;
    if (input.checked) {
      this.selectedFeatureIds.update((items) => (items.includes(feature.id) ? items : [...items, feature.id]));
      return;
    }

    this.selectedFeatureIds.update((items) => items.filter((id) => id !== feature.id));
  }

  createTenant(): void {
    if (!this.validateAllSteps()) {
      return;
    }

    if (!this.draftId()) {
      this.saveDraft(() => this.finalizeDraft());
      return;
    }
    this.finalizeDraft();
  }

  saveDraft(afterSave?: () => void): void {
    if (this.isSaving()) {
      return;
    }
    const payload = this.buildOnboardingPayload();
    const step = this.stepIndex(this.currentStep()) + 1;
    this.isSaving.set(true);
    this.saveState.set('saving');
    this.errorMessage.set(null);
    const request$ = this.draftId() && this.draftVersion()
      ? this.api.saveOnboardingDraft(this.draftId()!, this.draftVersion()!, payload, step)
      : this.api.createOnboardingDraft(payload, step);
    request$.subscribe({
      next: (draft) => {
        this.applyDraftMetadata(draft);
        this.isSaving.set(false);
        this.saveState.set('saved');
        this.lastSavedAt.set(new Date(draft.updatedAt ?? draft.createdAt).toLocaleTimeString());
        afterSave?.();
      },
      error: (error) => {
        this.isSaving.set(false);
        this.saveState.set('failed');
        this.errorMessage.set(this.apiError.toSafeMessage(error));
      }
    });
  }

  fieldMessage(control: AbstractControl, label: string): string | null {
    return controlValidationMessage(control, label);
  }

  stepErrorCount(step: WizardStep): number {
    return this.collectStepIssues(step).length;
  }

  isCurrentStepValid(): boolean {
    return this.collectStepIssues(this.currentStep()).length === 0;
  }

  canCreateTenant(): boolean {
    return this.steps.every((step) => this.collectStepIssues(step.key).length === 0);
  }

  validationSummary(): string[] {
    return this.steps.flatMap((step) => this.collectStepIssues(step.key));
  }

  private validateCurrentStep(): boolean {
    this.errorMessage.set(null);
    const step = this.currentStep();

    if (step === 'business-info') {
      return this.collectStepIssues(step).length === 0;
    }

    if (step === 'plan-selection') {
      return this.collectStepIssues(step).length === 0;
    }

    if (step === 'limits-addons') {
      this.planSelectionForm.markAllAsTouched();
      this.limitsAddonsForm.markAllAsTouched();
      return this.planSelectionForm.valid && this.limitsAddonsForm.valid;
    }

    if (step === 'feature-entitlements') {
      if (!this.selectedPlan()) {
        this.errorMessage.set('Please select a plan before configuring features.');
        return false;
      }

      if (!this.selectedFeatureIds().length) {
        this.errorMessage.set('At least one allowed feature must be selected.');
        return false;
      }

      return true;
    }

    if (step === 'tenant-admin') {
      this.tenantAdminForm.markAllAsTouched();
      return this.tenantAdminForm.valid;
    }

    if (step === 'billing-subscription') {
      this.billingSubscriptionForm.markAllAsTouched();
      return this.billingSubscriptionForm.valid;
    }

    if (step === 'review-create') {
      return this.validateAllSteps();
    }

    return true;
  }

  private validateAllSteps(): boolean {
    this.businessInfoForm.markAllAsTouched();
    this.planSelectionForm.markAllAsTouched();
    this.limitsAddonsForm.markAllAsTouched();
    this.tenantAdminForm.markAllAsTouched();
    this.billingSubscriptionForm.markAllAsTouched();

    const issues = this.validationSummary();
    if (issues.length) {
      this.errorMessage.set('Please fix validation issues before creating the tenant.');
      return false;
    }

    return true;
  }

  private collectStepIssues(step: WizardStep): string[] {
    const issues: string[] = [];

    if (step === 'business-info') {
      if (this.countryOptionsLoadError()) {
        issues.push(this.countryOptionsLoadError()!);
      }

      this.pushControlIssue(issues, this.businessInfoForm.controls.code, 'Tenant code');
      this.pushControlIssue(issues, this.businessInfoForm.controls.tenantSlug, 'Tenant slug');
      this.pushControlIssue(issues, this.businessInfoForm.controls.name, 'Business name');
      this.pushControlIssue(issues, this.businessInfoForm.controls.legalName, 'Legal name');
      this.pushControlIssue(issues, this.businessInfoForm.controls.countryCode, 'Country');
      this.pushControlIssue(issues, this.businessInfoForm.controls.baseCurrency, 'Currency');
      this.pushControlIssue(issues, this.businessInfoForm.controls.defaultTimezone, 'Timezone');
      this.pushControlIssue(issues, this.businessInfoForm.controls.defaultLocale, 'Locale');
      this.pushControlIssue(issues, this.businessInfoForm.controls.operatingMode, 'Operating mode');
      this.pushControlIssue(issues, this.businessInfoForm.controls.businessType, 'Business type');
      return issues;
    }

    if (step === 'plan-selection') {
      this.pushControlIssue(issues, this.businessInfoForm.controls.addressLine1, 'Registered address');
      this.pushControlIssue(issues, this.businessInfoForm.controls.addressCountryCode, 'Address country');
      this.pushControlIssue(issues, this.businessInfoForm.controls.primaryContactName, 'Primary contact name');
      this.pushControlIssue(issues, this.businessInfoForm.controls.primaryContactEmail, 'Primary contact email');
      this.pushControlIssue(issues, this.businessInfoForm.controls.primaryContactPhone, 'Primary contact phone');
      this.pushControlIssue(issues, this.businessInfoForm.controls.billingContactName, 'Billing contact name');
      this.pushControlIssue(issues, this.businessInfoForm.controls.billingContactEmail, 'Billing contact email');
    }

    if (step === 'limits-addons') {
      if (this.planSelectionForm.invalid) issues.push('Subscription plan is required.');
      this.pushControlIssue(issues, this.limitsAddonsForm.controls.maxOutlets, 'Max outlets');
      this.pushControlIssue(issues, this.limitsAddonsForm.controls.maxTills, 'Max tills');
      this.pushControlIssue(issues, this.limitsAddonsForm.controls.maxUsers, 'Max users');
    }

    if (step === 'feature-entitlements') {
      if (!this.selectedPlan()) {
        issues.push('Select a plan before configuring features.');
      } else if (!this.selectedFeatureIds().length) {
        issues.push('Select at least one allowed feature.');
      }
    }

    if (step === 'tenant-admin') {
      this.pushControlIssue(issues, this.tenantAdminForm.controls.firstName, 'First name');
      this.pushControlIssue(issues, this.tenantAdminForm.controls.email, 'Admin email');
    }

    if (step === 'billing-subscription') {
      this.pushControlIssue(issues, this.billingSubscriptionForm.controls.subscriptionType, 'Subscription type');
      this.pushControlIssue(issues, this.billingSubscriptionForm.controls.billingStatus, 'Billing status');
      this.pushControlIssue(issues, this.billingSubscriptionForm.controls.billingCycle, 'Billing cycle');
      this.pushControlIssue(issues, this.billingSubscriptionForm.controls.subscriptionStatus, 'Subscription status');
      this.pushControlIssue(issues, this.billingSubscriptionForm.controls.invoiceEmail, 'Invoice email');
    }

    return issues;
  }

  private pushControlIssue(issues: string[], control: AbstractControl | null, label: string): void {
    const message = controlIssueMessage(control, label);
    if (message) {
      issues.push(message);
    }
  }

  private applyServerFieldErrors(error: unknown): void {
    this.apiError.applyFieldErrors(this.apiError.toFieldErrors(error), {
      countryCode: this.businessInfoForm.controls.countryCode,
      'address.countryCode': this.businessInfoForm.controls.addressCountryCode,
      baseCurrency: this.businessInfoForm.controls.baseCurrency,
      billingStatus: this.billingSubscriptionForm.controls.billingStatus,
      'subscription.subscriptionType': this.billingSubscriptionForm.controls.subscriptionType,
      'subscription.subscriptionStatus': this.billingSubscriptionForm.controls.subscriptionStatus,
      'subscription.billingCycle': this.billingSubscriptionForm.controls.billingCycle,
      'subscription.paymentMethod': this.billingSubscriptionForm.controls.paymentMethod,
      'tenantAdmin.email': this.tenantAdminForm.controls.email
    });
  }

  private buildOnboardingPayload(): TenantOnboardingPayload {
    const business = this.businessInfoForm.getRawValue();
    const plan = this.planSelectionForm.getRawValue();
    const limits = this.limitsAddonsForm.getRawValue();
    const billing = this.billingSubscriptionForm.getRawValue();
    const admin = this.tenantAdminForm.getRawValue();
    return {
      basicDetails: {
        displayName: business.name,
        legalName: business.legalName,
        tenantCode: business.code,
        tenantSlug: business.tenantSlug,
        requestedSubdomain: business.requestedSubdomain || null,
        registrationNumber: business.registrationNumber || null,
        taxNumber: business.taxNumber || null,
        businessTypeCode: business.businessType,
        operatingMode: business.operatingMode,
        defaultCountryCode: business.countryCode,
        baseCurrencyCode: business.baseCurrency,
        timezone: business.defaultTimezone,
        locale: business.defaultLocale
      },
      businessContact: {
        registeredAddress: {
          line1: business.addressLine1,
          line2: null,
          city: business.addressCity,
          stateOrProvince: null,
          postalCode: null,
          countryCode: business.addressCountryCode || business.countryCode
        },
        primaryContact: {
          name: business.primaryContactName,
          email: business.primaryContactEmail,
          phone: business.primaryContactPhone
        },
        websiteUrl: business.websiteUrl || null,
        billingContactSameAsPrimary: false,
        billingContact: {
          name: business.billingContactName,
          email: business.billingContactEmail,
          phone: null
        },
        billingAddressSameAsRegistered: true,
        billingAddress: null,
        supportContact: business.supportContactName || business.supportContactEmail
          ? { name: business.supportContactName, email: business.supportContactEmail || null, phone: null }
          : null
      },
      plan: {
        subscriptionPlanId: plan.subscriptionPlanId || null,
        subscriptionType: billing.subscriptionType,
        billingCycle: normalizeBillingCycleForApi(billing.billingCycle),
        addons: this.createOptions().addons
          .map((addon) => ({ addonId: addon.id, quantity: this.addonQuantities()[addon.id] ?? 0 }))
          .filter((addon) => addon.quantity > 0),
        requestedLimits: limits
      },
      billing: {
        invoiceEmail: billing.invoiceEmail || null,
        paymentMethod: billing.paymentMethod || null,
        trialStartAt: null,
        trialEndAt: null,
        billingStartAt: null,
        nextBillingAt: null,
        autoRenew: billing.autoRenew,
        discountType: null,
        discountValue: null,
        taxPercentage: null,
        notes: billing.notes || null,
        waiverReason: null
      },
      entitlements: { featureIds: [...this.selectedFeatureIds()] },
      tenantAdmin: admin,
      reviewConfirmed: this.currentStep() === 'review-create'
    };
  }

  private loadDraft(draftId: string): void {
    this.isLoadingDraft.set(true);
    this.api.getOnboardingDraft(draftId).subscribe({
      next: (draft) => {
        this.applyDraftMetadata(draft);
        this.applyDraftPayload(draft.payload);
        const index = Math.max(0, Math.min(6, draft.currentStep - 1));
        this.currentStep.set(this.steps[index].key);
        this.isLoadingDraft.set(false);
      },
      error: (error) => {
        this.isLoadingDraft.set(false);
        this.errorMessage.set(this.apiError.toSafeMessage(error));
      }
    });
  }

  private applyDraftMetadata(draft: TenantOnboardingDraft): void {
    this.draftId.set(draft.id);
    this.draftVersion.set(draft.version);
    this.progressPercent.set(draft.progressPercent);
  }

  private applyDraftPayload(payload: TenantOnboardingPayload): void {
    const basic = payload.basicDetails as Record<string, unknown> | null;
    const contacts = payload.businessContact as Record<string, unknown> | null;
    const registered = contacts?.['registeredAddress'] as Record<string, unknown> | undefined;
    const primary = contacts?.['primaryContact'] as Record<string, unknown> | undefined;
    const billingContact = contacts?.['billingContact'] as Record<string, unknown> | undefined;
    const support = contacts?.['supportContact'] as Record<string, unknown> | undefined;
    this.businessInfoForm.patchValue({
      code: String(basic?.['tenantCode'] ?? ''), tenantSlug: String(basic?.['tenantSlug'] ?? ''),
      requestedSubdomain: String(basic?.['requestedSubdomain'] ?? ''), name: String(basic?.['displayName'] ?? ''),
      legalName: String(basic?.['legalName'] ?? ''), registrationNumber: String(basic?.['registrationNumber'] ?? ''),
      taxNumber: String(basic?.['taxNumber'] ?? ''), businessType: String(basic?.['businessTypeCode'] ?? ''),
      operatingMode: String(basic?.['operatingMode'] ?? ''), countryCode: String(basic?.['defaultCountryCode'] ?? ''),
      baseCurrency: String(basic?.['baseCurrencyCode'] ?? ''), defaultTimezone: String(basic?.['timezone'] ?? ''),
      defaultLocale: String(basic?.['locale'] ?? ''), addressLine1: String(registered?.['line1'] ?? ''),
      addressCity: String(registered?.['city'] ?? ''), addressCountryCode: String(registered?.['countryCode'] ?? ''),
      primaryContactName: String(primary?.['name'] ?? ''), primaryContactEmail: String(primary?.['email'] ?? ''),
      primaryContactPhone: String(primary?.['phone'] ?? ''), websiteUrl: String(contacts?.['websiteUrl'] ?? ''),
      billingContactName: String(billingContact?.['name'] ?? primary?.['name'] ?? ''),
      billingContactEmail: String(billingContact?.['email'] ?? primary?.['email'] ?? ''),
      supportContactName: String(support?.['name'] ?? ''), supportContactEmail: String(support?.['email'] ?? '')
    });
    const plan = payload.plan as Record<string, unknown> | null;
    const billing = payload.billing as Record<string, unknown> | null;
    this.planSelectionForm.patchValue({ subscriptionPlanId: String(plan?.['subscriptionPlanId'] ?? '') });
    this.limitsAddonsForm.patchValue((plan?.['requestedLimits'] ?? {}) as never);
    this.billingSubscriptionForm.patchValue({
      subscriptionType: String(plan?.['subscriptionType'] ?? ''), billingCycle: String(plan?.['billingCycle'] ?? ''),
      invoiceEmail: String(billing?.['invoiceEmail'] ?? ''), paymentMethod: String(billing?.['paymentMethod'] ?? ''),
      autoRenew: Boolean(billing?.['autoRenew'] ?? true), notes: String(billing?.['notes'] ?? '')
    });
    const rawAddons = plan?.['addons'];
    if (Array.isArray(rawAddons)) {
      const quantities: Record<string, number> = {};
      for (const item of rawAddons) {
        const addon = item as { addonId?: unknown; quantity?: unknown };
        const addonId = typeof addon.addonId === 'string' ? addon.addonId : '';
        const quantity = typeof addon.quantity === 'number' ? addon.quantity : Number(addon.quantity);
        if (addonId && Number.isFinite(quantity) && quantity > 0) {
          quantities[addonId] = quantity;
        }
      }
      this.addonQuantities.set(quantities);
    } else {
      this.addonQuantities.set({});
    }
    const entitlements = payload.entitlements as { featureIds?: string[] } | null;
    this.selectedFeatureIds.set(entitlements?.featureIds ?? []);
    this.tenantAdminForm.patchValue((payload.tenantAdmin ?? {}) as never);
  }

  private finalizeDraft(): void {
    const draftId = this.draftId();
    const version = this.draftVersion();
    if (!draftId || !version) {
      return;
    }
    this.finalizationKey ??= globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    this.isSaving.set(true);
    this.api.finalizeOnboardingDraft(draftId, version, this.finalizationKey).subscribe({
      next: (receipt) => {
        this.isSaving.set(false);
        void this.router.navigate(['/admin/tenants/onboarding/operations', receipt.operationId]);
      },
      error: (error) => {
        this.isSaving.set(false);
        this.applyServerFieldErrors(error);
        this.errorMessage.set(this.apiError.toSafeMessage(error));
      }
    });
  }

  private loadCreateOptions(): void {
    this.isLoadingOptions.set(true);
    this.optionsLoadFailed.set(false);
    this.countryOptionsLoadError.set(null);
    this.businessInfoForm.controls.countryCode.disable({ emitEvent: false });
    this.businessInfoForm.controls.addressCountryCode.disable({ emitEvent: false });
    this.api.getCreateOptions().subscribe({
      next: (options) => {
        this.createOptions.set(options);
        this.applyLookupDefaults(options);
        this.syncCountryControlState(options);
        this.optionsLoadFailed.set(false);
        this.isLoadingOptions.set(false);
      },
      error: (error) => {
        this.countryOptionsLoadError.set('Country list could not be loaded. Please retry.');
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.optionsLoadFailed.set(true);
        this.businessInfoForm.controls.countryCode.disable({ emitEvent: false });
        this.businessInfoForm.controls.addressCountryCode.disable({ emitEvent: false });
        this.isLoadingOptions.set(false);
      }
    });
  }

  private syncCountryControlState(options: TenantCreateOptions): void {
    if (options.countryCodes.length === 0) {
      this.countryOptionsLoadError.set('Country list could not be loaded. Please retry.');
      this.businessInfoForm.controls.countryCode.disable({ emitEvent: false });
      this.businessInfoForm.controls.addressCountryCode.disable({ emitEvent: false });
      return;
    }

    this.countryOptionsLoadError.set(null);
    this.businessInfoForm.controls.countryCode.enable({ emitEvent: false });
    this.businessInfoForm.controls.addressCountryCode.enable({ emitEvent: false });
  }

  private applyLookupDefaults(options: TenantCreateOptions): void {
    const defaultCountryCode = options.defaults.countryCode ?? '';
    const defaultCurrency = options.defaults.currencyCode ?? '';

    this.businessInfoForm.patchValue({
      countryCode: this.businessInfoForm.controls.countryCode.value || defaultCountryCode,
      addressCountryCode: this.businessInfoForm.controls.addressCountryCode.value || defaultCountryCode,
      baseCurrency: this.businessInfoForm.controls.baseCurrency.value || defaultCurrency,
      defaultTimezone: this.businessInfoForm.controls.defaultTimezone.value || options.defaults.timezone || '',
      defaultLocale: this.businessInfoForm.controls.defaultLocale.value || options.defaults.locale || '',
      operatingMode: this.businessInfoForm.controls.operatingMode.value || options.operatingModes[0]?.value || '',
      businessType: this.businessInfoForm.controls.businessType.value || options.businessTypes[0]?.value || ''
    });

    this.billingSubscriptionForm.patchValue({
      billingStatus: this.billingSubscriptionForm.controls.billingStatus.value || options.billingStatuses[0]?.value || '',
      billingCycle: this.billingSubscriptionForm.controls.billingCycle.value || options.defaults.billingCycle || '',
      subscriptionStatus:
        this.billingSubscriptionForm.controls.subscriptionStatus.value || options.subscriptionStatuses[0]?.value || '',
      paymentMethod: this.billingSubscriptionForm.controls.paymentMethod.value || options.paymentMethods[0]?.value || ''
    });
  }

  private applyPlanDefaults(): void {
    const plan = this.selectedPlan();
    if (!plan) {
      return;
    }

    this.limitsAddonsForm.patchValue({
      maxOutlets: plan.maxOutlets ?? this.limitsAddonsForm.controls.maxOutlets.value,
      maxTills: plan.maxTills ?? this.limitsAddonsForm.controls.maxTills.value,
      maxUsers: plan.maxUsers ?? this.limitsAddonsForm.controls.maxUsers.value
    });

    this.businessInfoForm.controls.baseCurrency.setValue(plan.baseCurrency || this.businessInfoForm.controls.baseCurrency.value);
    const planBillingCycle = normalizeBillingCycleForApi(plan.billingCycle);
    if (planBillingCycle) {
      this.billingSubscriptionForm.controls.billingCycle.setValue(planBillingCycle);
    }
  }

  private syncFeaturesForPlan(): void {
    const plan = this.selectedPlan();
    if (!plan) {
      this.selectedFeatureIds.set([]);
      return;
    }

    const availableFeatureIds = new Set(
      this.createOptions().catalogModules.flatMap((module) => module.features.map((feature) => feature.id))
    );
    const selectedIds = plan.includedFeatureIds.filter((id) => availableFeatureIds.has(id));

    for (const module of this.createOptions().catalogModules) {
      for (const feature of module.features) {
        if (
          !selectedIds.includes(feature.id)
          && plan.includedFeatureCodes.includes(feature.featureCode)
        ) {
          selectedIds.push(feature.id);
        }
      }
    }

    this.selectedFeatureIds.set(Array.from(new Set(selectedIds)));
  }

  private buildWizardState(): TenantCreateWizardState {
    const featureCodeById = new Map<string, string>();
    for (const module of this.createOptions().catalogModules) {
      for (const feature of module.features) {
        featureCodeById.set(feature.id, feature.featureCode);
      }
    }

    return {
      businessInfo: this.businessInfoForm.getRawValue(),
      planSelection: this.planSelectionForm.getRawValue(),
      limitsAddons: {
        ...this.limitsAddonsForm.getRawValue(),
        addons: this.createOptions().addons
          .map((addon) => ({
            addonId: addon.id,
            quantity: this.addonQuantities()[addon.id] ?? 0
          }))
          .filter((item) => item.quantity > 0)
      },
      featureEntitlements: {
        enabledFeatureIds: [...this.selectedFeatureIds()],
        enabledFeatureCodes: this.selectedFeatureIds()
          .map((id) => featureCodeById.get(id))
          .filter((value): value is string => Boolean(value))
      },
      tenantAdmin: this.tenantAdminForm.getRawValue(),
      billingSubscription: this.billingSubscriptionForm.getRawValue()
    };
  }

  private baseLimit(limitKey: 'max_outlets' | 'max_tills' | 'max_users'): number {
    const controls = this.limitsAddonsForm.controls;

    if (limitKey === 'max_outlets') {
      return controls.maxOutlets.value ?? this.selectedPlan()?.maxOutlets ?? 0;
    }

    if (limitKey === 'max_tills') {
      return controls.maxTills.value ?? this.selectedPlan()?.maxTills ?? 0;
    }

    return controls.maxUsers.value ?? this.selectedPlan()?.maxUsers ?? 0;
  }
}
