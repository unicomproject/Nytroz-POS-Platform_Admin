import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { TENANT_SUBSCRIPTION_TYPE_OPTIONS } from '../../constants/tenant-subscription-type.constants';
import { mapCreateTenantRequest } from '../../mappers/platform-tenant-create.mapper';
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
                <label><span>Tenant Slug *</span><input formControlName="tenantSlug" /></label>
                <label><span>Requested Subdomain</span><input formControlName="requestedSubdomain" /></label>
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
              </form>
            }

            @case ('plan-selection') {
              <header class="step-header"><h2>Business & Contact Information</h2></header>
              <form [formGroup]="businessInfoForm" class="grid two">
                <label><span>Registered Address Line 1 *</span><input formControlName="addressLine1" /></label>
                <label><span>City</span><input formControlName="addressCity" /></label>
                <label><span>Address Country *</span><select formControlName="addressCountryCode">
                  <option value="">Select country</option>
                  @for (item of createOptions().countryCodes; track item.value) { <option [value]="item.value">{{ item.label }}</option> }
                </select></label>
                <label><span>Primary Contact Name *</span><input formControlName="primaryContactName" /></label>
                <label><span>Primary Contact Email *</span><input type="email" formControlName="primaryContactEmail" /></label>
                <label><span>Primary Contact Phone *</span><input formControlName="primaryContactPhone" /></label>
                <label><span>Website</span><input type="url" formControlName="websiteUrl" /></label>
                <label><span>Billing Contact Name *</span><input formControlName="billingContactName" /></label>
                <label><span>Billing Contact Email *</span><input type="email" formControlName="billingContactEmail" /></label>
                <label><span>Support Contact Name</span><input formControlName="supportContactName" /></label>
                <label><span>Support Contact Email</span><input type="email" formControlName="supportContactEmail" /></label>
              </form>
            }

            @case ('limits-addons') {
              <header class="step-header"><h2>Subscription Plan</h2></header>
              <form [formGroup]="planSelectionForm">
                <label><span>Subscription Plan *</span></label>
                <div class="plan-grid">
                  @for (plan of createOptions().plans; track plan.id) {
                    <article class="plan-card" [class.selected]="planSelectionForm.controls.subscriptionPlanId.value === plan.id">
                      <header><strong>{{ plan.name }}</strong><small>{{ plan.planCode }} • {{ plan.billingCycle }}</small></header>
                      <p>{{ plan.description || 'No description provided.' }}</p>
                      <div class="plan-meta"><span>Price: {{ plan.baseCurrency }} {{ plan.basePrice }}</span></div>
                      <button type="button" class="btn outline" (click)="selectPlan(plan.id)">Select</button>
                    </article>
                  }
                </div>
              </form>
              <h3>Limits & Add-ons</h3>
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
                <fieldset class="full subscription-type-fieldset">
                  <legend>Subscription Type *</legend>
                  <div class="subscription-type-options" role="radiogroup" aria-label="Subscription type">
                    @for (item of subscriptionTypeOptions; track item.value) {
                      <label class="subscription-type-option" [class.selected]="billingSubscriptionForm.controls.subscriptionType.value === item.value">
                        <input type="radio" formControlName="subscriptionType" [value]="item.value" />
                        <span>{{ item.label }}</span>
                      </label>
                    }
                  </div>
                  @if (fieldMessage(billingSubscriptionForm.controls.subscriptionType, 'Subscription type')) {
                    <small class="error">{{ fieldMessage(billingSubscriptionForm.controls.subscriptionType, 'Subscription type') }}</small>
                  }
                </fieldset>
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
                  @if (fieldMessage(billingSubscriptionForm.controls.billingCycle, 'Billing cycle')) {
                    <small class="error">{{ fieldMessage(billingSubscriptionForm.controls.billingCycle, 'Billing cycle') }}</small>
                  }
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
                <div><dt>Subscription Type</dt><dd>{{ billingSubscriptionForm.controls.subscriptionType.value || '—' }}</dd></div>
                <div><dt>Billing Cycle</dt><dd>{{ billingSubscriptionForm.controls.billingCycle.value || '—' }}</dd></div>
                <div><dt>Subscription Status</dt><dd>{{ billingSubscriptionForm.controls.subscriptionStatus.value || '—' }}</dd></div>
              </dl>
            }
          }
        }
      </section>

      <footer class="action-bar">
        <button type="button" class="btn outline" (click)="goBack()" [disabled]="isSaving()">Back</button>
        <span class="save-state" aria-live="polite">
          @if (saveState() === 'saving') { Saving draft... }
          @else if (saveState() === 'saved') { Saved {{ lastSavedAt() }} }
          @else if (saveState() === 'failed') { Draft save failed. Retry is available. }
        </span>
        <button type="button" class="btn outline" (click)="saveDraft()" [disabled]="isSaving() || isLoadingOptions()">Save Draft</button>
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
    .subscription-type-fieldset { border: 1px solid #eaecf0; border-radius: 12px; margin: 0; padding: 0.75rem 0.9rem 0.9rem; }
    .subscription-type-fieldset legend { font-size: 0.82rem; font-weight: 600; padding: 0 0.25rem; }
    .subscription-type-options { display: flex; flex-wrap: wrap; gap: 0.55rem; margin-top: 0.35rem; }
    .subscription-type-option { align-items: center; border: 1px solid #d0d5dd; border-radius: 10px; cursor: pointer; display: inline-flex; gap: 0.45rem; font-size: 0.88rem; font-weight: 600; min-height: 2.55rem; padding: 0.35rem 0.85rem; }
    .subscription-type-option.selected { border-color: #0b5cff; box-shadow: 0 0 0 3px rgba(11, 92, 255, 0.12); color: #0b5cff; }
    .subscription-type-option input { margin: 0; min-height: auto; width: auto; }
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
  private readonly route = inject(ActivatedRoute);

  readonly steps = [
    { key: 'business-info' as WizardStep, label: 'Tenant Basic Details' },
    { key: 'plan-selection' as WizardStep, label: 'Business & Contact Information' },
    { key: 'limits-addons' as WizardStep, label: 'Subscription Plan' },
    { key: 'billing-subscription' as WizardStep, label: 'Billing / Payment Setup' },
    { key: 'feature-entitlements' as WizardStep, label: 'Feature Entitlements' },
    { key: 'tenant-admin' as WizardStep, label: 'Tenant Admin User' },
    { key: 'review-create' as WizardStep, label: 'Review, Create & Activation' }
  ];

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
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly countryOptionsLoadError = signal<string | null>(null);
  readonly draftId = signal<string | null>(null);
  readonly draftVersion = signal<number | null>(null);
  readonly progressPercent = signal(0);
  readonly saveState = signal<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  readonly lastSavedAt = signal<string | null>(null);
  private finalizationKey: string | null = null;

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
    this.api.getOnboardingDraft(draftId).subscribe({
      next: (draft) => {
        this.applyDraftMetadata(draft);
        this.applyDraftPayload(draft.payload);
        const index = Math.max(0, Math.min(6, draft.currentStep - 1));
        this.currentStep.set(this.steps[index].key);
      },
      error: (error) => this.errorMessage.set(this.apiError.toSafeMessage(error))
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
