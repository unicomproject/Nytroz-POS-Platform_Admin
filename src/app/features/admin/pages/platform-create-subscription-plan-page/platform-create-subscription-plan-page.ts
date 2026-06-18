import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  ModuleAvailability,
  PlatformFeatureOption,
  PlatformModuleOption,
  SubscriptionPlanDraft
} from '../../models/platform-subscription-plan.model';
import { PlatformSubscriptionPlanApiService } from '../../services/platform-subscription-plan-api.service';

type WizardStep = 'basics' | 'modules' | 'features' | 'pricing' | 'limits' | 'review';

@Component({
  selector: 'app-platform-create-subscription-plan-page',
  standalone: true,
  imports: [DatePipe, FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="wizard-page">
      <header class="page-heading">
        <div class="title-block">
          <a class="back-link" routerLink="/admin/subscriptions" aria-label="Back to subscription plans">← Back</a>
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <span>Subscriptions</span>
            <span aria-hidden="true">/</span>
            <span class="current">Create Plan</span>
          </nav>
          <h1>Create Subscription Plan</h1>
          <p>Configure plan package, pricing, features, and limits.</p>
        </div>
        <button type="button" class="btn outline" (click)="saveDraft()" [disabled]="isSaving()">
          Save Draft
        </button>
      </header>

      <div class="wizard-layout">
        <div class="wizard-main">
          <ol class="stepper" aria-label="Create plan steps">
            @for (step of steps; track step.key; let index = $index) {
              <li [class.active]="currentStep() === step.key" [class.done]="stepIndex(currentStep()) > index">
                <span class="step-num">{{ index + 1 }}</span>
                <span class="step-label">{{ step.label }}</span>
              </li>
            }
          </ol>

          <section class="step-card card">
            @switch (currentStep()) {
              @case ('basics') {
                <header class="step-header">
                  <h2>Plan Basics</h2>
                  <p>Define the basic information about this plan.</p>
                </header>
                <form class="step-form" [formGroup]="basicsForm">
                  <label>
                    <span>Plan Name</span>
                    <input formControlName="planName" placeholder="Professional Plus" />
                    @if (basicsForm.controls.planName.touched && basicsForm.controls.planName.invalid) {
                      <small class="error">Plan name is required.</small>
                    }
                  </label>
                  <label>
                    <span>Plan Code</span>
                    <input formControlName="planCode" placeholder="PROF-PLUS" (input)="onPlanCodeInput($event)" />
                    <small>Unique code for internal reference. Cannot be changed after publish.</small>
                  </label>
                  <label class="full">
                    <span>Description</span>
                    <textarea formControlName="description" rows="4" maxlength="500"></textarea>
                    <small>{{ basicsForm.controls.description.value.length }}/500</small>
                  </label>
                  <label>
                    <span>Plan Type</span>
                    <select formControlName="planType">
                      <option value="free">Free</option>
                      <option value="trial">Trial</option>
                      <option value="paid">Paid</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                  <label>
                    <span>Currency</span>
                    <select formControlName="currencyCode">
                      <option value="LKR">LKR - Sri Lankan Rupee</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="EUR">EUR - Euro</option>
                    </select>
                  </label>
                  <label>
                    <span>Tax Mode</span>
                    <select formControlName="taxMode">
                      <option value="excluded">Excluded</option>
                      <option value="included">Included</option>
                    </select>
                  </label>
                  <fieldset class="full">
                    <legend>Visibility</legend>
                    <label class="radio"><input type="radio" formControlName="visibility" value="public" /> Public</label>
                    <label class="radio"><input type="radio" formControlName="visibility" value="internal" /> Internal</label>
                  </fieldset>
                  <label>
                    <span>Effective Date</span>
                    <input type="date" formControlName="effectiveFrom" />
                  </label>
                  <div class="alert draft full">
                    <strong>Status: Draft</strong>
                    <span>Plan is in Draft until you publish it. Only published plans can be assigned to tenants.</span>
                  </div>
                </form>
              }
              @case ('modules') {
                <header class="step-header">
                  <h2>Modules</h2>
                  <p>Select which modules are included or available as add-ons.</p>
                </header>
                @if (modulesLoading()) {
                  <p class="muted">Loading modules from platform catalog...</p>
                } @else if (!modules().length) {
                  <div class="empty-step">
                    <strong>Module catalog unavailable</strong>
                    <span>Modules will load from the platform API when the catalog endpoint is available.</span>
                  </div>
                } @else {
                  <div class="module-grid">
                    @for (module of modules(); track module.id) {
                      <article class="module-card" [class.selected]="moduleAvailability()[module.id] !== 'not_available'">
                        <div class="module-head">
                          <strong>{{ module.name }}</strong>
                          <p>{{ module.description || 'No description provided.' }}</p>
                        </div>
                        <select [ngModel]="moduleAvailability()[module.id]" (ngModelChange)="setModuleAvailability(module.id, $event)">
                          <option value="included">Included</option>
                          <option value="addon">Add-on</option>
                          <option value="not_available">Not Available</option>
                        </select>
                      </article>
                    }
                  </div>
                }
              }
              @case ('features') {
                <header class="step-header">
                  <h2>Features</h2>
                  <p>Configure feature entitlements grouped by module.</p>
                </header>
                @if (!features().length) {
                  <div class="empty-step">
                    <strong>Feature catalog unavailable</strong>
                    <span>Features will load from the platform API when the catalog endpoint is available.</span>
                  </div>
                } @else {
                  @for (group of featureGroups(); track group.moduleId) {
                    <section class="feature-group">
                      <h3>{{ group.moduleName }}</h3>
                      <table>
                        <thead>
                          <tr>
                            <th>Feature</th>
                            <th>Included</th>
                            <th>Add-on</th>
                            <th>Not Available</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (feature of group.features; track feature.id) {
                            <tr [class.disabled]="isFeatureDisabled(feature)">
                              <td><strong>{{ feature.name }}</strong></td>
                              @for (option of availabilityOptions; track option) {
                                <td class="radio-cell">
                                  <input
                                    type="radio"
                                    [name]="feature.id"
                                    [value]="option"
                                    [checked]="featureAvailability()[feature.id] === option"
                                    [disabled]="isFeatureDisabled(feature)"
                                    (change)="setFeatureAvailability(feature.id, option)"
                                  />
                                </td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                    </section>
                  }
                }
              }
              @case ('pricing') {
                <header class="step-header">
                  <h2>Pricing</h2>
                  <p>Set tenant monthly and annual pricing for this plan.</p>
                </header>
                <form class="step-form" [formGroup]="pricingForm">
                  <label><span>Tenant Monthly Price</span><input type="number" formControlName="monthlyPrice" min="0" step="0.01" /></label>
                  <label><span>Tenant Annual Price</span><input type="number" formControlName="annualPrice" min="0" step="0.01" /></label>
                  @if (annualDiscount() != null) {
                    <p class="discount-note full">Annual discount: {{ annualDiscount() }}%</p>
                  }
                  <label><span>Trial Days</span><input type="number" formControlName="trialDays" min="0" /></label>
                  <label>
                    <span>Billing Cycle</span>
                    <select formControlName="billingCycle">
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                      <option value="both">Both</option>
                    </select>
                  </label>
                  <label><span>Setup Fee (optional)</span><input type="number" formControlName="setupFee" min="0" step="0.01" /></label>
                </form>
              }
              @case ('limits') {
                <header class="step-header">
                  <h2>Limits</h2>
                  <p>Define usage limits for tenants on this plan.</p>
                </header>
                <form class="step-form" [formGroup]="limitsForm">
                  <label><span>Outlet Limit</span><input type="number" formControlName="outletLimit" min="0" /></label>
                  <label><span>Till Limit</span><input type="number" formControlName="tillLimit" min="0" /></label>
                  <label><span>User Limit</span><input type="number" formControlName="userLimit" min="0" /></label>
                </form>
              }
              @case ('review') {
                <header class="step-header">
                  <h2>Review &amp; Publish</h2>
                  <p>Review plan configuration before publishing.</p>
                </header>
                <dl class="review-list">
                  <div><dt>Plan Name</dt><dd>{{ basicsForm.controls.planName.value || '—' }}</dd></div>
                  <div><dt>Plan Code</dt><dd>{{ basicsForm.controls.planCode.value || '—' }}</dd></div>
                  <div><dt>Tenant Monthly Price</dt><dd>{{ pricingForm.controls.monthlyPrice.value ?? '—' }}</dd></div>
                  <div><dt>Tenant Annual Price</dt><dd>{{ pricingForm.controls.annualPrice.value ?? '—' }}</dd></div>
                </dl>
                <div class="review-actions">
                  <button type="button" class="btn outline" (click)="saveDraft()" [disabled]="isSaving()">Save Draft</button>
                  <button type="button" class="btn outline" disabled title="Preview tenant view API pending">Preview Tenant View</button>
                  <button type="button" class="btn primary" (click)="openPublishModal()">Publish Plan</button>
                </div>
              }
            }
          </section>

          <footer class="wizard-nav">
            <button type="button" class="btn outline" [disabled]="stepIndex(currentStep()) === 0" (click)="prevStep()">Previous</button>
            @if (currentStep() !== 'review') {
              <button type="button" class="btn primary" (click)="nextStep()">Next</button>
            }
          </footer>
        </div>

        <aside class="draft-summary card" aria-label="Draft summary">
          <h2>Draft Summary</h2>
          <dl>
            <div><dt>Plan Name</dt><dd>{{ basicsForm.controls.planName.value || '—' }}</dd></div>
            <div><dt>Plan Code</dt><dd>{{ basicsForm.controls.planCode.value || '—' }}</dd></div>
            <div><dt>Plan Type</dt><dd>{{ basicsForm.controls.planType.value || '—' }}</dd></div>
            <div><dt>Status</dt><dd><span class="status-dot draft">Draft</span></dd></div>
            <div><dt>Modules</dt><dd>{{ includedModulesCount() || '—' }}</dd></div>
            <div><dt>Tenant Monthly Price</dt><dd>{{ pricingForm.controls.monthlyPrice.value ?? '—' }}</dd></div>
            <div><dt>Tenant Annual Price</dt><dd>{{ pricingForm.controls.annualPrice.value ?? '—' }}</dd></div>
            <div><dt>Effective Date</dt><dd>{{ basicsForm.controls.effectiveFrom.value | date: 'mediumDate' }}</dd></div>
          </dl>
          <p class="summary-note">Complete all steps to see full summary.</p>
        </aside>
      </div>

      @if (showPublishModal()) {
        <div class="modal-backdrop" role="presentation" (click)="closePublishModal()"></div>
        <dialog class="modal" open aria-labelledby="publish-title">
          <h3 id="publish-title">Publish subscription plan?</h3>
          <p>
            Once published, this plan can be assigned to tenants. Some fields cannot be edited directly after publishing.
            Pricing, feature, or limit changes should create a new plan version. Do you want to continue?
          </p>
          <div class="modal-actions">
            <button type="button" class="btn outline" (click)="closePublishModal()">Cancel</button>
            <button type="button" class="btn primary" (click)="confirmPublish()" [disabled]="isSaving()">Publish Plan</button>
          </div>
        </dialog>
      }
    </section>
  `,
  styles: `
    :host { color: #14213d; display: block; }
    * { box-sizing: border-box; }
    .wizard-page { display: grid; gap: 1rem; }
    .page-heading { align-items: flex-start; display: flex; gap: 1rem; justify-content: space-between; }
    .back-link { color: #667085; font-size: 0.82rem; text-decoration: none; }
    .breadcrumb { color: #667085; display: flex; font-size: 0.78rem; gap: 0.35rem; margin: 0.35rem 0; }
    .breadcrumb .current { color: #344054; font-weight: 600; }
    h1 { color: #101a38; font-size: clamp(1.5rem, 2.2vw, 1.95rem); font-weight: 800; margin: 0; }
    .title-block p { color: #667085; font-size: 0.9rem; margin: 0.35rem 0 0; }
    .wizard-layout { align-items: start; display: grid; gap: 1rem; grid-template-columns: minmax(0, 1fr) 18rem; }
    .stepper { display: flex; flex-wrap: wrap; gap: 0.5rem; list-style: none; margin: 0 0 0.85rem; padding: 0; }
    .stepper li { align-items: center; color: #667085; display: inline-flex; font-size: 0.78rem; gap: 0.4rem; }
    .step-num { align-items: center; background: #f2f4f7; border-radius: 50%; display: inline-flex; font-weight: 700; height: 1.5rem; justify-content: center; width: 1.5rem; }
    .stepper li.active .step-num, .stepper li.done .step-num { background: #0b5cff; color: #fff; }
    .stepper li.active { color: #0b5cff; font-weight: 700; }
    .card { background: #fff; border: 1px solid #eaecf0; border-radius: 14px; box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04); padding: 1.15rem; }
    .step-header h2 { font-size: 1.1rem; margin: 0; }
    .step-header p { color: #667085; font-size: 0.86rem; margin: 0.35rem 0 1rem; }
    .step-form { display: grid; gap: 0.85rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .step-form label, .step-form fieldset { display: grid; gap: 0.35rem; }
    .step-form .full { grid-column: 1 / -1; }
    .step-form span, .step-form legend { color: #344054; font-size: 0.82rem; font-weight: 600; }
    .step-form input, .step-form select, .step-form textarea { border: 1px solid #d0d5dd; border-radius: 10px; font-size: 0.86rem; min-height: 2.5rem; padding: 0.45rem 0.75rem; width: 100%; }
    .step-form small { color: #667085; font-size: 0.75rem; }
    .step-form small.error { color: #b42318; }
    .radio { align-items: center; display: inline-flex; gap: 0.35rem; margin-right: 1rem; }
    .alert.draft { background: #fff6ed; border: 1px solid #fedf89; border-radius: 10px; color: #7a2e0e; padding: 0.75rem; }
    .module-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }
    .module-card { border: 1px solid #eaecf0; border-radius: 12px; display: grid; gap: 0.65rem; padding: 0.85rem; }
    .module-card.selected { border-color: #84adff; box-shadow: 0 0 0 3px rgba(11, 92, 255, 0.12); }
    .module-head p { color: #667085; font-size: 0.78rem; margin: 0.2rem 0 0; }
    .feature-group { margin-bottom: 1rem; }
    .feature-group h3 { font-size: 0.95rem; margin: 0 0 0.5rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #f2f4f7; padding: 0.55rem 0.35rem; text-align: left; }
    th { color: #667085; font-size: 0.72rem; text-transform: uppercase; }
    tr.disabled { opacity: 0.5; }
    .radio-cell { text-align: center; width: 5rem; }
    .empty-step, .muted { color: #667085; }
    .empty-step { background: #f9fafb; border: 1px dashed #d0d5dd; border-radius: 12px; display: grid; gap: 0.35rem; padding: 1.25rem; }
    .discount-note { color: #027a48; font-size: 0.82rem; font-weight: 600; }
    .review-list { display: grid; gap: 0.65rem; margin: 0 0 1rem; }
    .review-list div { display: grid; gap: 0.15rem; grid-template-columns: 10rem 1fr; }
    .review-list dt { color: #667085; font-size: 0.78rem; font-weight: 600; }
    .review-list dd { margin: 0; }
    .review-actions, .wizard-nav, .modal-actions { display: flex; flex-wrap: wrap; gap: 0.65rem; justify-content: flex-end; }
    .wizard-nav { justify-content: space-between; margin-top: 0.5rem; }
    .draft-summary { position: sticky; top: 1rem; }
    .draft-summary h2 { font-size: 0.95rem; margin: 0 0 0.75rem; }
    .draft-summary dl { display: grid; gap: 0.55rem; margin: 0; }
    .draft-summary dt { color: #667085; font-size: 0.72rem; font-weight: 600; }
    .draft-summary dd { font-size: 0.82rem; margin: 0; }
    .status-dot.draft::before { background: #f79009; border-radius: 50%; content: ''; display: inline-block; height: 0.45rem; margin-right: 0.35rem; width: 0.45rem; }
    .summary-note { background: #eef4ff; border-radius: 8px; color: #175cd3; font-size: 0.75rem; margin: 0.85rem 0 0; padding: 0.55rem 0.65rem; }
    .btn { align-items: center; border-radius: 10px; cursor: pointer; display: inline-flex; font-size: 0.84rem; font-weight: 600; gap: 0.45rem; min-height: 2.5rem; padding: 0.55rem 1rem; }
    .btn.primary { background: #0b5cff; border: 1px solid #0b5cff; color: #fff; }
    .btn.outline { background: #fff; border: 1px solid #d0d5dd; color: #344054; }
    .btn:disabled { cursor: not-allowed; opacity: 0.5; }
    .modal-backdrop { background: rgba(16, 24, 40, 0.45); inset: 0; position: fixed; z-index: 20; }
    .modal { background: #fff; border: 0; border-radius: 14px; box-shadow: 0 20px 40px rgba(16, 24, 40, 0.18); left: 50%; margin: 0; max-width: 32rem; padding: 1.25rem; position: fixed; top: 50%; transform: translate(-50%, -50%); width: calc(100% - 2rem); z-index: 21; }
    .modal p { color: #475467; font-size: 0.88rem; line-height: 1.5; }
    @media (max-width: 960px) {
      .wizard-layout { grid-template-columns: 1fr; }
      .draft-summary { position: static; }
      .step-form { grid-template-columns: 1fr; }
    }
  `
})
export class PlatformCreateSubscriptionPlanPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PlatformSubscriptionPlanApiService);

  readonly steps = [
    { key: 'basics' as WizardStep, label: 'Basics' },
    { key: 'modules' as WizardStep, label: 'Modules' },
    { key: 'features' as WizardStep, label: 'Features' },
    { key: 'pricing' as WizardStep, label: 'Pricing' },
    { key: 'limits' as WizardStep, label: 'Limits' },
    { key: 'review' as WizardStep, label: 'Review & Publish' }
  ];

  readonly availabilityOptions: ModuleAvailability[] = ['included', 'addon', 'not_available'];

  readonly currentStep = signal<WizardStep>('basics');
  readonly modules = signal<PlatformModuleOption[]>([]);
  readonly features = signal<PlatformFeatureOption[]>([]);
  readonly modulesLoading = signal(false);
  readonly moduleAvailability = signal<Record<string, ModuleAvailability>>({});
  readonly featureAvailability = signal<Record<string, ModuleAvailability>>({});
  readonly isSaving = signal(false);
  readonly showPublishModal = signal(false);

  readonly basicsForm = this.fb.nonNullable.group({
    planName: ['', Validators.required],
    planCode: ['', Validators.required],
    description: [''],
    planType: ['paid' as const],
    currencyCode: ['LKR'],
    taxMode: ['excluded' as const],
    visibility: ['public' as const],
    effectiveFrom: [new Date().toISOString().slice(0, 10)]
  });

  readonly pricingForm = this.fb.nonNullable.group({
    monthlyPrice: [null as number | null],
    annualPrice: [null as number | null],
    trialDays: [null as number | null],
    billingCycle: ['both' as const],
    setupFee: [null as number | null]
  });

  readonly limitsForm = this.fb.nonNullable.group({
    outletLimit: [null as number | null],
    tillLimit: [null as number | null],
    userLimit: [null as number | null]
  });

  readonly annualDiscount = computed(() => {
    const monthly = this.pricingForm.controls.monthlyPrice.value;
    const annual = this.pricingForm.controls.annualPrice.value;
    if (monthly == null || annual == null || monthly <= 0) {
      return null;
    }

    const fullYear = monthly * 12;
    if (fullYear <= 0 || annual >= fullYear) {
      return null;
    }

    return Math.round(((fullYear - annual) / fullYear) * 100);
  });

  readonly featureGroups = computed(() => {
    const groups = new Map<string, { moduleId: string; moduleName: string; features: PlatformFeatureOption[] }>();
    for (const feature of this.features()) {
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

  readonly includedModulesCount = computed(() =>
    Object.values(this.moduleAvailability()).filter((value) => value === 'included').length
  );

  ngOnInit(): void {
    this.loadCatalogs();
  }

  stepIndex(step: WizardStep): number {
    return this.steps.findIndex((item) => item.key === step);
  }

  nextStep(): void {
    if (this.currentStep() === 'basics' && this.basicsForm.invalid) {
      this.basicsForm.markAllAsTouched();
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

  onPlanCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase();
    this.basicsForm.controls.planCode.setValue(upper, { emitEvent: false });
    input.value = upper;
  }

  setModuleAvailability(moduleId: string, value: ModuleAvailability): void {
    this.moduleAvailability.update((current) => ({ ...current, [moduleId]: value }));

    if (value === 'not_available') {
      const moduleFeatures = this.features().filter((feature) => feature.moduleId === moduleId);
      this.featureAvailability.update((current) => {
        const next = { ...current };
        for (const feature of moduleFeatures) {
          next[feature.id] = 'not_available';
        }
        return next;
      });
    }
  }

  setFeatureAvailability(featureId: string, value: ModuleAvailability): void {
    this.featureAvailability.update((current) => ({ ...current, [featureId]: value }));
  }

  isFeatureDisabled(feature: PlatformFeatureOption): boolean {
    return this.moduleAvailability()[feature.moduleId] === 'not_available';
  }

  saveDraft(): void {
    this.isSaving.set(true);
    this.api.saveDraft(this.buildDraft()).subscribe({
      next: () => this.isSaving.set(false),
      error: () => this.isSaving.set(false)
    });
  }

  openPublishModal(): void {
    this.showPublishModal.set(true);
  }

  closePublishModal(): void {
    this.showPublishModal.set(false);
  }

  confirmPublish(): void {
    this.isSaving.set(true);
    this.api.saveDraft(this.buildDraft()).subscribe({
      next: ({ id }) => {
        this.api.publish(id).subscribe({
          next: () => {
            this.isSaving.set(false);
            this.closePublishModal();
          },
          error: () => this.isSaving.set(false)
        });
      },
      error: () => this.isSaving.set(false)
    });
  }

  private loadCatalogs(): void {
    this.modulesLoading.set(true);
    this.api.getModules().subscribe({
      next: (modules) => {
        this.modules.set(modules);
        const availability: Record<string, ModuleAvailability> = {};
        for (const module of modules) {
          availability[module.id] = 'not_available';
        }
        this.moduleAvailability.set(availability);
        this.modulesLoading.set(false);
      },
      error: () => this.modulesLoading.set(false)
    });

    this.api.getFeatures().subscribe({
      next: (features) => {
        this.features.set(features);
        const availability: Record<string, ModuleAvailability> = {};
        for (const feature of features) {
          availability[feature.id] = 'not_available';
        }
        this.featureAvailability.set(availability);
      }
    });
  }

  private buildDraft(): SubscriptionPlanDraft {
    return {
      ...this.basicsForm.getRawValue(),
      ...this.pricingForm.getRawValue(),
      ...this.limitsForm.getRawValue(),
      moduleAvailability: this.moduleAvailability(),
      featureAvailability: this.featureAvailability()
    };
  }
}
