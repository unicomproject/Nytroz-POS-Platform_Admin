import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { mapCreateTenantRequest } from '../../mappers/platform-tenant-create.mapper';
import {
  TenantCreateAddonOption,
  TenantCreateCatalogFeature,
  TenantCreateOptions,
  TenantCreatePlanOption,
  TenantCreateWizardState
} from '../../models/platform-tenant-create.model';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
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

@Component({
  selector: 'app-platform-create-tenant-page',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  template: `
    <section class="wizard-page">
      @if (errorMessage()) {
        <div class="toast error" role="alert">{{ errorMessage() }}</div>
      }

      <header class="page-heading">
        <h1>Create Tenant</h1>
        <p>Configure business, subscription, features, and tenant administrator.</p>
      </header>

      <ol class="stepper" aria-label="Create tenant steps">
        @for (step of steps; track step.key; let index = $index) {
          <li [class.active]="currentStep() === step.key" [class.done]="stepIndex(currentStep()) > index">
            <span class="step-num">{{ index + 1 }}</span>
            <span class="step-label">{{ step.label }}</span>
            @if (stepErrorCount(step.key) > 0) {
              <span class="step-errors">{{ stepErrorCount(step.key) }}</span>
            }
          </li>
        }
      </ol>

      <section class="card">
        @if (isLoadingOptions()) {
          <p class="muted">Loading tenant create options...</p>
        } @else {
          @switch (currentStep()) {
            @case ('business-info') {
              <header class="step-header"><h2>Business Info</h2></header>
              <form [formGroup]="businessInfoForm" class="grid two">
                <label><span>Tenant Code *</span><input formControlName="code" /></label>
                <label><span>Business Name *</span><input formControlName="name" /></label>
                <label><span>Legal Name</span><input formControlName="legalName" /></label>
                <label><span>Registration Number</span><input formControlName="registrationNumber" /></label>
                <label><span>Tax Number</span><input formControlName="taxNumber" /></label>
                <label>
                  <span>Country *</span>
                  <select formControlName="countryCode">
                    <option value="">Select country</option>
                    @for (item of createOptions().countryCodes; track item.value) {
                      <option [value]="item.value">{{ item.label }}</option>
                    }
                  </select>
                  @if (countryOptionsLoadError()) {
                    <small class="error">{{ countryOptionsLoadError() }}</small>
                  } @else if (fieldMessage(businessInfoForm.controls.countryCode, 'Country')) {
                    <small class="error">{{ fieldMessage(businessInfoForm.controls.countryCode, 'Country') }}</small>
                  }
                </label>
                <label>
                  <span>Currency *</span>
                  <select formControlName="baseCurrency">
                    <option value="">Select currency</option>
                    @for (item of createOptions().currencies; track item.value) {
                      <option [value]="item.value">{{ item.label }}</option>
                    }
                  </select>
                  @if (fieldMessage(businessInfoForm.controls.baseCurrency, 'Currency')) {
                    <small class="error">{{ fieldMessage(businessInfoForm.controls.baseCurrency, 'Currency') }}</small>
                  }
                </label>
                <label>
                  <span>Timezone *</span>
                  <select formControlName="defaultTimezone">
                    <option value="">Select</option>
                    @for (item of createOptions().timezones; track item.value) {
                      <option [value]="item.value">{{ item.label }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span>Locale *</span>
                  <select formControlName="defaultLocale">
                    <option value="">Select</option>
                    @for (item of createOptions().locales; track item.value) {
                      <option [value]="item.value">{{ item.label }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span>Business Type</span>
                  <select formControlName="businessType">
                    <option value="">Select</option>
                    @for (item of createOptions().businessTypes; track item.value) {
                      <option [value]="item.value">{{ item.label }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span>Operating Mode *</span>
                  <select formControlName="operatingMode">
                    <option value="">Select</option>
                    @for (item of createOptions().operatingModes; track item.value) {
                      <option [value]="item.value">{{ item.label }}</option>
                    }
                  </select>
                </label>
                <label><span>Address Line 1</span><input formControlName="addressLine1" /></label>
                <label><span>City</span><input formControlName="addressCity" /></label>
                <label>
                  <span>Address Country</span>
                  <select formControlName="addressCountryCode">
                    <option value="">Same as business country</option>
                    @for (item of createOptions().countryCodes; track item.value) {
                      <option [value]="item.value">{{ item.label }}</option>
                    }
                  </select>
                  @if (fieldMessage(businessInfoForm.controls.addressCountryCode, 'Address country')) {
                    <small class="error">{{ fieldMessage(businessInfoForm.controls.addressCountryCode, 'Address country') }}</small>
                  }
                </label>
              </form>
            }

            @case ('plan-selection') {
              <header class="step-header"><h2>Plan Selection</h2></header>
              <form [formGroup]="planSelectionForm">
                <label><span>Subscription Plan *</span></label>
                <div class="plan-grid">
                  @for (plan of createOptions().plans; track plan.id) {
                    <article class="plan-card" [class.selected]="planSelectionForm.controls.subscriptionPlanId.value === plan.id">
                      <header>
                        <strong>{{ plan.name }}</strong>
                        <small>{{ plan.planCode }} • {{ plan.billingCycle }}</small>
                      </header>
                      <p>{{ plan.description || 'No description provided.' }}</p>
                      <div class="plan-meta">
                        <span>Price: {{ plan.baseCurrency }} {{ plan.basePrice }}</span>
                        <span>Limits: {{ plan.maxOutlets ?? '—' }}/{{ plan.maxTills ?? '—' }}/{{ plan.maxUsers ?? '—' }}</span>
                      </div>
                      <button type="button" class="btn outline" (click)="selectPlan(plan.id)">Select</button>
                    </article>
                  }
                </div>
              </form>
            }

            @case ('limits-addons') {
              <header class="step-header"><h2>Limits & Add-ons</h2></header>
              <form [formGroup]="limitsAddonsForm" class="grid three">
                <label><span>Max Outlets *</span><input type="number" min="1" formControlName="maxOutlets" /></label>
                <label><span>Max Tills *</span><input type="number" min="1" formControlName="maxTills" /></label>
                <label><span>Max Users *</span><input type="number" min="1" formControlName="maxUsers" /></label>
              </form>

              @if (createOptions().addons.length) {
                <h3>Add-ons</h3>
                <div class="addon-grid">
                  @for (addon of createOptions().addons; track addon.id) {
                    <article class="addon-card">
                      <strong>{{ addon.name }}</strong>
                      <small>{{ addon.addonCode }}</small>
                      <p>{{ addon.description || 'No description provided.' }}</p>
                      <div class="addon-footer">
                        <span>{{ addon.currency }} {{ addon.unitPrice }} / unit</span>
                        <input
                          type="number"
                          min="0"
                          [ngModel]="addonQuantity(addon.id)"
                          (ngModelChange)="setAddonQuantity(addon, $event)"
                        />
                      </div>
                    </article>
                  }
                </div>
              }

              <div class="effective-limits">
                <strong>Effective limits with selected add-ons</strong>
                <span>Outlets: {{ effectiveLimit('max_outlets') }}</span>
                <span>Tills: {{ effectiveLimit('max_tills') }}</span>
                <span>Users: {{ effectiveLimit('max_users') }}</span>
              </div>
            }

            @case ('feature-entitlements') {
              <header class="step-header"><h2>Feature Entitlements</h2></header>
              @if (!selectedPlan()) {
                <p class="muted">Select a plan first to configure feature entitlements.</p>
              } @else {
                @for (module of createOptions().catalogModules; track module.id) {
                  <section class="feature-group">
                    <h3>{{ module.name }}</h3>
                    <ul>
                      @for (feature of module.features; track feature.id) {
                        <li [class.disabled]="!isFeatureAllowed(feature)">
                          <label>
                            <input
                              type="checkbox"
                              [checked]="isFeatureEnabled(feature.id)"
                              [disabled]="!isFeatureAllowed(feature)"
                              (change)="toggleFeature(feature, $event)"
                            />
                            <span>{{ feature.name }}</span>
                            <small>{{ feature.featureCode }}</small>
                          </label>
                        </li>
                      }
                    </ul>
                  </section>
                }
              }
            }

            @case ('tenant-admin') {
              <header class="step-header"><h2>Tenant Admin</h2></header>
              <form [formGroup]="tenantAdminForm" class="grid two">
                <label><span>First Name *</span><input formControlName="firstName" /></label>
                <label><span>Last Name</span><input formControlName="lastName" /></label>
                <label><span>Email *</span><input formControlName="email" /></label>
                <label><span>Phone</span><input formControlName="phone" /></label>
                <p class="hint full">
                  The tenant admin is saved as a pending invite. Email delivery is not wired in this release.
                </p>
              </form>
            }

            @case ('billing-subscription') {
              <header class="step-header"><h2>Billing & Subscription</h2></header>
              <form [formGroup]="billingSubscriptionForm" class="grid two">
                <label>
                  <span>Billing Status *</span>
                  <select formControlName="billingStatus">
                    <option value="">Select</option>
                    @for (item of createOptions().billingStatuses; track item.value) {
                      <option [value]="item.value">{{ item.label }}</option>
                    }
                  </select>
                  @if (fieldMessage(billingSubscriptionForm.controls.billingStatus, 'Billing status')) {
                    <small class="error">{{ fieldMessage(billingSubscriptionForm.controls.billingStatus, 'Billing status') }}</small>
                  }
                </label>
                <label>
                  <span>Billing Cycle *</span>
                  <select formControlName="billingCycle">
                    <option value="">Select</option>
                    @for (item of createOptions().billingCycles; track item.value) {
                      <option [value]="item.value">{{ item.label }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span>Subscription Status *</span>
                  <select formControlName="subscriptionStatus">
                    <option value="">Select</option>
                    @for (item of createOptions().subscriptionStatuses; track item.value) {
                      <option [value]="item.value">{{ item.label }}</option>
                    }
                  </select>
                </label>
                <label><span>Invoice Email</span><input formControlName="invoiceEmail" /></label>
                <label>
                  <span>Payment Method</span>
                  <select formControlName="paymentMethod">
                    <option value="">Select</option>
                    @for (item of createOptions().paymentMethods; track item.value) {
                      <option [value]="item.value">{{ item.label }}</option>
                    }
                  </select>
                </label>
                <label class="full"><span>Notes</span><textarea rows="3" formControlName="notes"></textarea></label>
                <label class="checkbox"><input type="checkbox" formControlName="autoRenew" /><span>Auto renew</span></label>
                <label class="checkbox"><input type="checkbox" formControlName="createDraftInvoice" /><span>Create draft invoice</span></label>
              </form>
            }

            @case ('review-create') {
              <header class="step-header"><h2>Review & Create</h2></header>
              @if (validationSummary().length) {
                <div class="validation-summary" role="alert">
                  <strong>Fix the following before creating:</strong>
                  <ul>
                    @for (item of validationSummary(); track $index) {
                      <li>{{ item }}</li>
                    }
                  </ul>
                </div>
              }
              <dl class="review-list">
                <div><dt>Tenant</dt><dd>{{ businessInfoForm.controls.name.value || '—' }}</dd></div>
                <div><dt>Code</dt><dd>{{ businessInfoForm.controls.code.value || '—' }}</dd></div>
                <div><dt>Plan</dt><dd>{{ selectedPlan()?.name || '—' }}</dd></div>
                <div><dt>Features</dt><dd>{{ selectedFeatureIds().length }}</dd></div>
                <div><dt>Admin Email</dt><dd>{{ tenantAdminForm.controls.email.value || '—' }}</dd></div>
                <div><dt>Billing Status</dt><dd>{{ billingSubscriptionForm.controls.billingStatus.value || '—' }}</dd></div>
                <div><dt>Subscription Status</dt><dd>{{ billingSubscriptionForm.controls.subscriptionStatus.value || '—' }}</dd></div>
              </dl>
            }
          }
        }
      </section>

      <footer class="action-bar">
        <button type="button" class="btn outline" (click)="goBack()" [disabled]="isSaving()">Back</button>
        @if (currentStep() !== 'review-create') {
          <button type="button" class="btn primary" (click)="nextStep()" [disabled]="isSaving() || isLoadingOptions() || !isCurrentStepValid()">Next</button>
        } @else {
          <button type="button" class="btn primary" (click)="createTenant()" [disabled]="isSaving() || isLoadingOptions() || !canCreateTenant()">
            {{ isSaving() ? 'Creating...' : 'Create Tenant' }}
          </button>
        }
      </footer>
    </section>
  `,
  styles: `
    :host { background: #f8f9fa; color: #14213d; display: block; min-height: 100%; padding-bottom: 5.5rem; }
    * { box-sizing: border-box; }
    .wizard-page { display: grid; gap: 1rem; }
    .page-heading h1 { margin: 0; }
    .page-heading p { color: #667085; margin: 0.3rem 0 0; }
    .stepper { display: flex; list-style: none; margin: 0; padding: 0; gap: 0.35rem; flex-wrap: wrap; }
    .stepper li { align-items: center; color: #667085; display: inline-flex; gap: 0.45rem; }
    .stepper li.done, .stepper li.active { color: #0b5cff; font-weight: 600; }
    .step-errors { background: #fef3f2; border-radius: 999px; color: #b42318; font-size: 0.72rem; font-weight: 700; padding: 0.1rem 0.45rem; }
    .step-num { align-items: center; background: #f2f4f7; border-radius: 50%; display: inline-flex; height: 1.6rem; justify-content: center; width: 1.6rem; font-size: 0.75rem; }
    .stepper li.done .step-num, .stepper li.active .step-num { background: #0b5cff; color: #fff; }
    .card { background: #fff; border: 1px solid #eaecf0; border-radius: 14px; padding: 1rem; }
    .step-header h2 { margin: 0 0 0.85rem; }
    .grid { display: grid; gap: 0.8rem; }
    .grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .full { grid-column: 1 / -1; }
    label { display: grid; gap: 0.3rem; font-size: 0.82rem; }
    input, select, textarea { border: 1px solid #d0d5dd; border-radius: 10px; min-height: 2.55rem; padding: 0.45rem 0.7rem; width: 100%; }
    textarea { min-height: 5rem; }
    .checkbox { align-items: center; display: flex; gap: 0.5rem; }
    .checkbox input { min-height: auto; width: auto; }
    .plan-grid, .addon-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }
    .plan-card, .addon-card { border: 1px solid #eaecf0; border-radius: 12px; display: grid; gap: 0.5rem; padding: 0.75rem; }
    .plan-card.selected { border-color: #0b5cff; box-shadow: 0 0 0 3px rgba(11, 92, 255, 0.12); }
    .plan-card p, .addon-card p, .plan-meta, .muted { color: #667085; font-size: 0.8rem; }
    .plan-meta { display: grid; gap: 0.2rem; }
    .addon-footer { align-items: center; display: flex; gap: 0.65rem; justify-content: space-between; }
    .addon-footer input { max-width: 5rem; }
    .effective-limits { background: #f8fafc; border: 1px solid #eaecf0; border-radius: 10px; display: grid; gap: 0.25rem; margin-top: 0.9rem; padding: 0.8rem; }
    .feature-group ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.45rem; }
    .feature-group li { border: 1px solid #eaecf0; border-radius: 8px; padding: 0.45rem 0.65rem; }
    .feature-group li.disabled { opacity: 0.55; }
    .feature-group small { color: #667085; margin-left: 0.35rem; }
    .validation-summary { background: #fffaeb; border: 1px solid #fedf89; border-radius: 10px; margin-bottom: 0.85rem; padding: 0.75rem 0.9rem; }
    .validation-summary ul { margin: 0.45rem 0 0; padding-left: 1.1rem; }
    .review-list { display: grid; gap: 0.5rem; margin: 0; }
    .review-list div { display: grid; grid-template-columns: 10rem 1fr; }
    .review-list dt { color: #667085; }
    .review-list dd { margin: 0; }
    .action-bar { align-items: center; background: #fff; border-top: 1px solid #eaecf0; bottom: 0; display: flex; justify-content: space-between; left: 16.5rem; padding: 0.9rem 1.5rem; position: fixed; right: 0; }
    .btn { border-radius: 10px; cursor: pointer; font-weight: 600; min-height: 2.6rem; padding: 0.55rem 1rem; }
    .btn.primary { background: #0b5cff; border: 1px solid #0b5cff; color: #fff; }
    .btn.outline { background: #fff; border: 1px solid #d0d5dd; color: #344054; }
    .btn:disabled { cursor: not-allowed; opacity: 0.55; }
    .toast.error { background: #fef3f2; border: 1px solid #fecdca; border-radius: 12px; color: #b42318; font-size: 0.88rem; font-weight: 600; padding: 0.75rem 0.9rem; position: fixed; right: 1.4rem; top: 5.25rem; z-index: 30; }
    .error { color: #b42318; font-size: 0.75rem; }
    @media (max-width: 960px) {
      .grid.two, .grid.three { grid-template-columns: 1fr; }
      .action-bar { left: 0; }
    }
  `
})
export class PlatformCreateTenantPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PlatformTenantApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly router = inject(Router);

  readonly steps = [
    { key: 'business-info' as WizardStep, label: 'Business Info' },
    { key: 'plan-selection' as WizardStep, label: 'Plan Selection' },
    { key: 'limits-addons' as WizardStep, label: 'Limits & Add-ons' },
    { key: 'feature-entitlements' as WizardStep, label: 'Feature Entitlements' },
    { key: 'tenant-admin' as WizardStep, label: 'Tenant Admin' },
    { key: 'billing-subscription' as WizardStep, label: 'Billing & Subscription' },
    { key: 'review-create' as WizardStep, label: 'Review & Create' }
  ];

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
    billingCycles: []
  });
  readonly addonQuantities = signal<Record<string, number>>({});
  readonly selectedFeatureIds = signal<string[]>([]);
  readonly isLoadingOptions = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly countryOptionsLoadError = signal<string | null>(null);

  readonly businessInfoForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    legalName: [''],
    registrationNumber: [''],
    taxNumber: [''],
    baseCurrency: ['', [Validators.required, isoCurrencyCodeValidator()]],
    defaultTimezone: ['', Validators.required],
    defaultLocale: ['', Validators.required],
    operatingMode: ['', Validators.required],
    businessType: [''],
    countryCode: ['', [Validators.required, isoCountryCodeValidator()]],
    addressLine1: [''],
    addressCity: [''],
    addressCountryCode: ['', isoCountryCodeValidator()]
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
  }

  stepIndex(step: WizardStep): number {
    return this.steps.findIndex((item) => item.key === step);
  }

  nextStep(): void {
    if (!this.validateCurrentStep()) {
      return;
    }

    const index = this.stepIndex(this.currentStep());
    if (index < this.steps.length - 1) {
      this.currentStep.set(this.steps[index + 1].key);
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

    const state = this.buildWizardState();
    const request = mapCreateTenantRequest(state);

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.api.createTenant(request).subscribe({
      next: (tenant) => {
        this.isSaving.set(false);
        void this.router.navigate(['/admin/tenants', tenant.id]);
      },
      error: (error) => {
        this.applyServerFieldErrors(error);
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.isSaving.set(false);
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
      this.businessInfoForm.markAllAsTouched();
      return this.businessInfoForm.valid;
    }

    if (step === 'plan-selection') {
      this.planSelectionForm.markAllAsTouched();
      if (!this.planSelectionForm.valid) {
        this.errorMessage.set('Please select a subscription plan.');
      }
      return this.planSelectionForm.valid;
    }

    if (step === 'limits-addons') {
      this.limitsAddonsForm.markAllAsTouched();
      return this.limitsAddonsForm.valid;
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
      this.pushControlIssue(issues, this.businessInfoForm.controls.name, 'Business name');
      this.pushControlIssue(issues, this.businessInfoForm.controls.countryCode, 'Country');
      this.pushControlIssue(issues, this.businessInfoForm.controls.baseCurrency, 'Currency');
      this.pushControlIssue(issues, this.businessInfoForm.controls.defaultTimezone, 'Timezone');
      this.pushControlIssue(issues, this.businessInfoForm.controls.defaultLocale, 'Locale');
      this.pushControlIssue(issues, this.businessInfoForm.controls.operatingMode, 'Operating mode');
      this.pushControlIssue(issues, this.businessInfoForm.controls.addressCountryCode, 'Address country');
      return issues;
    }

    if (step === 'plan-selection' && this.planSelectionForm.invalid) {
      issues.push('Subscription plan is required.');
    }

    if (step === 'limits-addons') {
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
      'subscription.subscriptionStatus': this.billingSubscriptionForm.controls.subscriptionStatus,
      'subscription.paymentMethod': this.billingSubscriptionForm.controls.paymentMethod,
      'tenantAdmin.email': this.tenantAdminForm.controls.email
    });
  }

  private loadCreateOptions(): void {
    this.isLoadingOptions.set(true);
    this.countryOptionsLoadError.set(null);
    this.businessInfoForm.controls.countryCode.disable({ emitEvent: false });
    this.businessInfoForm.controls.addressCountryCode.disable({ emitEvent: false });
    this.api.getCreateOptions().subscribe({
      next: (options) => {
        this.createOptions.set(options);
        this.applyLookupDefaults(options);
        this.syncCountryControlState(options);
        this.isLoadingOptions.set(false);
      },
      error: (error) => {
        this.countryOptionsLoadError.set('Country list could not be loaded. Please retry.');
        this.errorMessage.set(this.apiError.toSafeMessage(error));
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
    const defaultCountryCode = this.resolveDefaultCountryCode(options);
    const defaultCurrency = this.resolveDefaultCurrency(options);

    this.businessInfoForm.patchValue({
      countryCode: this.businessInfoForm.controls.countryCode.value || defaultCountryCode,
      addressCountryCode: this.businessInfoForm.controls.addressCountryCode.value || defaultCountryCode,
      baseCurrency: this.businessInfoForm.controls.baseCurrency.value || defaultCurrency,
      defaultTimezone: this.businessInfoForm.controls.defaultTimezone.value || options.timezones[0]?.value || '',
      defaultLocale: this.businessInfoForm.controls.defaultLocale.value || options.locales[0]?.value || '',
      operatingMode: this.businessInfoForm.controls.operatingMode.value || options.operatingModes[0]?.value || '',
      businessType: this.businessInfoForm.controls.businessType.value || options.businessTypes[0]?.value || ''
    });

    this.billingSubscriptionForm.patchValue({
      billingStatus: this.billingSubscriptionForm.controls.billingStatus.value || options.billingStatuses[0]?.value || '',
      billingCycle: this.billingSubscriptionForm.controls.billingCycle.value || options.billingCycles[0]?.value || '',
      subscriptionStatus:
        this.billingSubscriptionForm.controls.subscriptionStatus.value || options.subscriptionStatuses[0]?.value || '',
      paymentMethod: this.billingSubscriptionForm.controls.paymentMethod.value || options.paymentMethods[0]?.value || ''
    });
  }

  private resolveDefaultCountryCode(options: TenantCreateOptions): string {
    if (options.countryCodes.length === 1) {
      return options.countryCodes[0].value;
    }

    const sriLanka = options.countryCodes.find((item) => item.value === 'LK');
    return sriLanka?.value ?? options.countryCodes[0]?.value ?? '';
  }

  private resolveDefaultCurrency(options: TenantCreateOptions): string {
    const lkr = options.currencies.find((item) => item.value === 'LKR');
    if (lkr) {
      return lkr.value;
    }

    if (options.currencies.length === 1) {
      return options.currencies[0].value;
    }

    return options.currencies[0]?.value ?? '';
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
    this.billingSubscriptionForm.controls.billingCycle.setValue(
      plan.billingCycle || this.billingSubscriptionForm.controls.billingCycle.value
    );
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
