import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import {
  ModuleAvailability,
  PlatformFeatureOption,
  PlatformModuleOption,
  SubscriptionDbBillingCycle,
  SubscriptionPlanDraft,
  SubscriptionPlanLimitsMutationResponse
} from '../../models/platform-subscription-plan.model';
import { PlatformSubscriptionPlanApiService } from '../../services/platform-subscription-plan-api.service';

type WizardStep = 'basics' | 'modules' | 'features' | 'pricing' | 'limits' | 'review';

@Component({
  selector: 'app-platform-create-subscription-plan-page',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  template: `
    <section class="wizard-page">
      @if (successMessage()) {
        <div class="toast success" role="status">{{ successMessage() }}</div>
      }
      @if (errorMessage()) {
        <div class="toast error" role="alert">{{ errorMessage() }}</div>
      }

      <header class="page-heading">
        <h1>Create Subscription Plan</h1>
        <p>Build a subscription package for your tenants.</p>
      </header>

      <ol class="stepper" aria-label="Create plan steps">
        @for (step of steps; track step.key; let index = $index) {
          <li
            [class.active]="currentStep() === step.key"
            [class.done]="isStepComplete(step.key, index)"
          >
            <span class="step-num">
              @if (isStepComplete(step.key, index) && currentStep() !== step.key) {
                <svg class="step-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12l4 4 8-8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
              } @else {
                {{ index + 1 }}
              }
            </span>
            <span class="step-label">{{ step.label }}</span>
          </li>
        }
      </ol>

      <div class="wizard-layout">
        <div class="wizard-main">
          <section class="step-card card">
            @switch (currentStep()) {
              @case ('basics') {
                <header class="step-header with-icon">
                  <span class="step-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M8 4h8a2 2 0 0 1 2 2v14H6V6a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.6" />
                      <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                    </svg>
                  </span>
                  <div>
                    <h2>Plan Basics</h2>
                    <p>Define the basic information about this plan.</p>
                  </div>
                </header>
                <form class="step-form basics-form" [formGroup]="basicsForm">
                  <label>
                    <span>Plan Name <em>*</em></span>
                    <div class="field-shell">
                      <span class="field-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M8 4h8v16H8zM10 8h4M10 12h4M10 16h3" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
                      </span>
                      <input formControlName="planName" placeholder="Enter plan name" />
                    </div>
                    @if (basicsForm.controls.planName.touched && basicsForm.controls.planName.invalid) {
                      <small class="error">Plan name is required.</small>
                    } @else {
                      <small>This name will be visible to tenants.</small>
                    }
                  </label>

                  <label>
                    <span>Plan Code <em>*</em></span>
                    <div class="field-shell">
                      <span class="field-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M8 8l-2 2 2 2M16 8l2 2-2 2M14 6l-4 12" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
                      </span>
                      <input formControlName="planCode" placeholder="Enter plan code" (input)="onPlanCodeInput($event)" />
                    </div>
                    @if (basicsForm.controls.planCode.touched && basicsForm.controls.planCode.invalid) {
                      <small class="error">Plan code is required.</small>
                    } @else {
                      <small>Unique code for internal reference. Cannot be changed after publish.</small>
                    }
                  </label>

                  <label class="full">
                    <span>Description</span>
                    <div class="field-shell textarea-shell">
                      <span class="field-icon top" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M4 20h16M7 16l9-9 3 3-9 9H7z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
                      </span>
                      <textarea formControlName="description" rows="4" maxlength="500" placeholder="Enter description about this plan"></textarea>
                    </div>
                    <div class="field-meta">
                      @if (basicsForm.controls.description.touched && basicsForm.controls.description.invalid) {
                        <small class="error">Description cannot exceed 500 characters.</small>
                      } @else {
                        <small>Short description about this plan.</small>
                      }
                      <small class="char-count">{{ basicsForm.controls.description.value.length }}/500</small>
                    </div>
                  </label>

                  <div class="row-three">
                    <label>
                      <span>Billing Cycle <em>*</em></span>
                      <div class="field-shell">
                        <span class="field-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" stroke-width="1.5"/></svg>
                        </span>
                        <select formControlName="billingCycle">
                          <option value="">Select billing cycle</option>
                          @for (option of billingCycleOptions; track option.value) {
                            <option [value]="option.value">{{ option.label }}</option>
                          }
                        </select>
                      </div>
                      @if (basicsForm.controls.billingCycle.touched && basicsForm.controls.billingCycle.invalid) {
                        <small class="error">Billing cycle is required.</small>
                      } @else {
                        <small>Choose how this plan will be billed.</small>
                      }
                    </label>

                    <label>
                      <span>Currency <em>*</em></span>
                      <div class="field-shell">
                        <span class="field-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24"><path d="M12 3v18M8 7h6a3 3 0 0 1 0 6H8M8 13h7a3 3 0 0 1 0 6H8" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
                        </span>
                        <select formControlName="baseCurrency">
                          <option value="">Select currency</option>
                          <option value="LKR">LKR - Sri Lankan Rupee</option>
                          <option value="USD">USD - US Dollar</option>
                          <option value="GBP">GBP - British Pound</option>
                          <option value="EUR">EUR - Euro</option>
                        </select>
                      </div>
                      @if (basicsForm.controls.baseCurrency.touched && basicsForm.controls.baseCurrency.invalid) {
                        <small class="error">Currency is required.</small>
                      } @else {
                        <small>Default currency for pricing.</small>
                      }
                    </label>

                    <label>
                      <span>Status</span>
                      <div class="field-shell readonly status-field">
                        <span class="status-dot draft" aria-hidden="true"></span>
                        <span class="status-value">Draft</span>
                      </div>
                      <small>Plan is in draft until you publish it.</small>
                    </label>
                  </div>

                  <div class="alert draft full">
                    <span class="alert-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="M8 4h8v16H8zM10 8h4M10 12h4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
                    </span>
                    <div>
                      <strong>Plan Status: Draft</strong>
                      <span>Plan is in draft until you publish it. Only active plans can be assigned to tenants.</span>
                    </div>
                  </div>
                </form>
              }
              @case ('modules') {
                <header class="step-header"><h2>Modules</h2><p>Select commercial subscription modules for this plan.</p></header>
                @if (modulesLoading()) {
                  <p class="muted">Loading subscription modules...</p>
                } @else if (catalogError()) {
                  <div class="empty-step"><strong>Module catalog could not be loaded</strong><span>{{ catalogError() }}</span></div>
                } @else if (!modules().length) {
                  <div class="empty-step"><strong>No subscription modules found</strong><span>The backend subscription catalog did not return TM-EPOS MVP modules.</span></div>
                } @else {
                  <div class="module-grid">
                    @for (module of modules(); track module.id) {
                      <article class="module-card" [class.selected]="moduleAvailability()[module.id] === 'included'" [class.locked]="module.isLocked">
                        <div class="module-head">
                          <strong>{{ module.name }}</strong>
                          <p>{{ module.description || 'No description provided.' }}</p>
                          @if (module.isLocked) {
                            <small>Included by default</small>
                          }
                        </div>
                        <select [ngModel]="moduleAvailability()[module.id]" [disabled]="module.isLocked" (ngModelChange)="setModuleAvailability(module.id, $event)">
                          <option value="included">Included</option>
                          <option value="not_available">Not Available</option>
                        </select>
                      </article>
                    }
                  </div>
                }
              }
              @case ('features') {
                <header class="step-header"><h2>Features</h2><p>Configure feature entitlements grouped by module.</p></header>
                @if (featuresLoading()) {
                  <p class="muted">Loading subscription features...</p>
                } @else if (catalogError()) {
                  <div class="empty-step"><strong>Feature catalog could not be loaded</strong><span>{{ catalogError() }}</span></div>
                } @else if (!selectedModulesCount()) {
                  <div class="empty-step"><strong>Select modules first</strong><span>Features are shown after at least one module is included.</span></div>
                } @else if (!featureGroups().length) {
                  <div class="empty-step"><strong>No features found</strong><span>The selected modules do not expose subscription feature entitlements.</span></div>
                } @else {
                  @for (group of featureGroups(); track group.moduleId) {
                    <section class="feature-group">
                      <h3>{{ group.moduleName }}</h3>
                      <table>
                        <thead><tr><th>Feature</th><th>Included</th><th>Not Available</th></tr></thead>
                        <tbody>
                          @for (feature of group.features; track feature.id) {
                            <tr [class.disabled]="isFeatureDisabled(feature)">
                              <td>
                                <strong>{{ feature.name }}</strong>
                                <span>{{ feature.description || feature.entitlementKey || feature.featureKey }}</span>
                                @if (feature.isLocked) {
                                  <small>Included by default</small>
                                }
                              </td>
                              @for (option of availabilityOptions; track option) {
                                <td class="radio-cell">
                                  <input type="radio" [name]="feature.id" [value]="option" [checked]="featureAvailability()[feature.id] === option" [disabled]="isFeatureDisabled(feature)" (change)="setFeatureAvailability(feature.id, option)" />
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
                <header class="step-header with-icon pricing-step-header">
                  <span class="step-icon pricing-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M4 7h16v10H4z" stroke="currentColor" stroke-width="1.6" />
                      <path d="M8 11h8M8 14h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                    </svg>
                  </span>
                  <div>
                    <h2>Base Pricing</h2>
                    <p>Define the base price for this subscription plan.</p>
                  </div>
                </header>
                <form class="pricing-form" [formGroup]="pricingForm">
                  <div class="row-three pricing-fields">
                    <label>
                      <span>Billing Cycle</span>
                      <div class="field-shell readonly" aria-readonly="true">
                        <span class="field-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" stroke-width="1.5"/></svg>
                        </span>
                        <span class="readonly-value">{{ billingCycleLabel() }}</span>
                      </div>
                      <small>Selected in Basics step.</small>
                    </label>

                    <label>
                      <span>Currency</span>
                      <div class="field-shell readonly" aria-readonly="true">
                        <span class="field-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24"><path d="M12 3v18M8 7h6a3 3 0 0 1 0 6H8M8 13h7a3 3 0 0 1 0 6H8" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
                        </span>
                        <span class="readonly-value">{{ currencyLabel() }}</span>
                      </div>
                      <small>Selected in Basics step.</small>
                    </label>

                    <label>
                      <span>Base Price <em>*</em></span>
                      <div class="field-shell" [class.invalid]="pricingForm.controls.basePrice.touched && pricingForm.controls.basePrice.invalid">
                        <span class="currency-prefix">{{ currencyCode() }}</span>
                        <input
                          [value]="basePriceInput()"
                          placeholder="0.00"
                          inputmode="decimal"
                          aria-label="Base price"
                          (input)="onBasePriceInput($event)"
                          (blur)="onBasePriceBlur()"
                        />
                      </div>
                      @if (pricingForm.controls.basePrice.touched && pricingForm.controls.basePrice.invalid) {
                        <small class="error">Base price is required and cannot be negative.</small>
                      } @else {
                        <small>This is the base subscription price for the selected billing cycle.</small>
                      }
                    </label>
                  </div>

                  <div class="alert info pricing-info full">
                    <span class="alert-icon info" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 10v6M12 7h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                    </span>
                    <span>This base price will be used for tenant subscription billing based on the selected billing cycle.</span>
                  </div>
                </form>
              }
              @case ('limits') {
                <header class="step-header with-icon limits-step-header">
                  <span class="step-icon limits-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M12 3a9 9 0 1 0 9 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                      <path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                    </svg>
                  </span>
                  <div>
                    <h2>Plan Limits</h2>
                    <p>Define usage limits for tenants on this plan.</p>
                  </div>
                </header>
                <form class="limits-form" [formGroup]="limitsForm">
                  <div class="row-three limits-fields">
                    <label>
                      <span>Outlet Limit <em>*</em></span>
                      <div class="field-shell" [class.invalid]="limitsForm.controls.maxOutlets.touched && limitsForm.controls.maxOutlets.invalid">
                        <input type="number" formControlName="maxOutlets" min="1" step="1" aria-label="Outlet limit" />
                      </div>
                      @if (limitsFieldError('maxOutlets'); as error) {
                        <small class="error">{{ error }}</small>
                      } @else {
                        <small>Maximum outlets allowed for this plan.</small>
                      }
                    </label>

                    <label>
                      <span>Till Limit <em>*</em></span>
                      <div class="field-shell" [class.invalid]="limitsForm.controls.maxTills.touched && limitsForm.controls.maxTills.invalid">
                        <input type="number" formControlName="maxTills" min="1" step="1" aria-label="Till limit" />
                      </div>
                      @if (limitsFieldError('maxTills'); as error) {
                        <small class="error">{{ error }}</small>
                      } @else {
                        <small>Maximum tills allowed for this plan.</small>
                      }
                    </label>

                    <label>
                      <span>User Limit <em>*</em></span>
                      <div class="field-shell" [class.invalid]="limitsForm.controls.maxUsers.touched && limitsForm.controls.maxUsers.invalid">
                        <input type="number" formControlName="maxUsers" min="1" step="1" aria-label="User limit" />
                      </div>
                      @if (limitsFieldError('maxUsers'); as error) {
                        <small class="error">{{ error }}</small>
                      } @else {
                        <small>Maximum users allowed for this plan.</small>
                      }
                    </label>
                  </div>

                  <div class="alert info limits-info full">
                    <span class="alert-icon info" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 10v6M12 7h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                    </span>
                    <span>These limits define the default usage allowance for tenants on this plan.</span>
                  </div>
                </form>
              }
              @case ('review') {
                <header class="step-header"><h2>Review &amp; Publish</h2><p>Review plan configuration before publishing.</p></header>
                <dl class="review-list">
                  <div><dt>Plan Name</dt><dd>{{ basicsForm.controls.planName.value || '—' }}</dd></div>
                  <div><dt>Plan Code</dt><dd>{{ basicsForm.controls.planCode.value || '—' }}</dd></div>
                  <div><dt>Billing Cycle</dt><dd>{{ billingCycleLabel() }}</dd></div>
                  <div><dt>Currency</dt><dd>{{ basicsForm.controls.baseCurrency.value || '—' }}</dd></div>
                  <div><dt>Base Price</dt><dd>{{ pricingForm.controls.basePrice.value ?? '—' }}</dd></div>
                </dl>
              }
            }
          </section>
        </div>

        <aside class="draft-summary card" aria-label="Draft summary">
          <header class="summary-head">
            <span class="summary-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 4h8v16H8zM10 8h4M10 12h4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
            </span>
            <h2>Draft Summary</h2>
          </header>
          <dl class="summary-rows">
            <div><dt>Plan Name</dt><dd>{{ basicsForm.controls.planName.value || '—' }}</dd></div>
            <div><dt>Plan Code</dt><dd>{{ basicsForm.controls.planCode.value || '—' }}</dd></div>
            <div><dt>Billing Cycle</dt><dd>{{ billingCycleLabel() }}</dd></div>
            <div><dt>Currency</dt><dd>{{ currencyLabel() }}</dd></div>
            @if (showBasePriceInSummary()) {
              <div><dt>Base Price</dt><dd>{{ basePriceSummaryLabel() }}</dd></div>
            }
            <div><dt>Status</dt><dd><span class="status-dot draft">Draft</span></dd></div>
          </dl>
          <div class="summary-progress">
            <div><span>Modules</span><strong [class]="modulesSummaryClass()">{{ modulesSummary() }}</strong></div>
            <div><span>Features</span><strong [class]="featuresSummaryClass()">{{ featuresSummary() }}</strong></div>
            <div><span>Pricing</span><strong [class]="pricingSummaryClass()">{{ pricingSummary() }}</strong></div>
            <div><span>Limits</span><strong [class]="limitsSummaryClass()">{{ limitsSummary() }}</strong></div>
          </div>
          @if (selectedModuleNames().length) {
            <section class="selection-summary" aria-label="Selected modules">
              <h3>Selected Modules</h3>
              <ul>
                @for (moduleName of selectedModuleNames(); track moduleName) {
                  <li>{{ moduleName }}</li>
                }
              </ul>
            </section>
          }
          @if (selectedFeatureGroups().length) {
            <section class="selection-summary" aria-label="Selected features">
              <h3>Selected Features</h3>
              @for (group of selectedFeatureGroups(); track group.moduleName) {
                <strong>{{ group.moduleName }}</strong>
                <ul>
                  @for (featureName of group.featureNames; track featureName) {
                    <li>{{ featureName }}</li>
                  }
                </ul>
              }
            </section>
          }
          <p class="summary-note">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 10v6M12 7h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            Complete all steps to see full summary.
          </p>
        </aside>
      </div>

      <footer class="action-bar">
        <button type="button" class="btn outline back-btn" (click)="goBack()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Back
        </button>
        <div class="action-group">
          <button type="button" class="btn outline save-btn" (click)="saveDraft()" [disabled]="isSaving()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5zM8 5V3h8v2M12 11v5M9.5 13.5L12 11l2.5 2.5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
            {{ isSaving() ? 'Saving...' : 'Save Draft' }}
          </button>
          @if (currentStep() !== 'review') {
            <button type="button" class="btn primary next-btn" (click)="nextStep()" [disabled]="isSaving()">
              {{ isSaving() ? 'Saving...' : 'Next' }}
              @if (!isSaving()) {
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
              }
            </button>
          } @else {
            <button type="button" class="btn primary publish-btn" (click)="openPublishModal()" [disabled]="isSaving()">
              Publish Plan
            </button>
          }
        </div>
      </footer>

      @if (showPublishModal()) {
        <div class="modal-backdrop" role="presentation" (click)="closePublishModal()"></div>
        <dialog class="modal" open aria-labelledby="publish-title">
          <h3 id="publish-title">Publish subscription plan?</h3>
          <p>Once published, this plan can be assigned to tenants. Some fields cannot be edited directly after publishing.</p>
          <div class="modal-actions">
            <button type="button" class="btn outline" (click)="closePublishModal()">Cancel</button>
            <button type="button" class="btn primary" (click)="confirmPublish()" [disabled]="isSaving()">Publish Plan</button>
          </div>
        </dialog>
      }
    </section>
  `,
  styles: `
    :host { background: #f8f9fa; color: #14213d; display: block; min-height: 100%; padding-bottom: 5.75rem; }
    * { box-sizing: border-box; }
    .wizard-page { display: grid; gap: 1.25rem; }
    .toast { border-radius: 12px; box-shadow: 0 10px 24px rgba(16, 24, 40, 0.12); font-size: 0.88rem; font-weight: 600; padding: 0.85rem 1rem; position: fixed; right: 1.6rem; top: 5.5rem; z-index: 30; }
    .toast.success { background: #ecfdf3; border: 1px solid #abefc6; color: #027a48; }
    .toast.error { background: #fef3f2; border: 1px solid #fecdca; color: #b42318; }
    .page-heading { display: grid; gap: 0.4rem; margin-top: 0.15rem; }
    h1 { color: #101828; font-size: clamp(1.65rem, 2.2vw, 2.05rem); font-weight: 800; letter-spacing: -0.02em; margin: 0; }
    .page-heading p { color: #667085; font-size: 0.92rem; margin: 0; }
    .stepper { align-items: center; display: flex; flex-wrap: wrap; gap: 0; list-style: none; margin: 0; padding: 0; }
    .stepper li { align-items: center; color: #667085; display: inline-flex; font-size: 0.82rem; gap: 0.5rem; position: relative; }
    .stepper li:not(:last-child) { margin-right: 0.35rem; padding-right: 2.15rem; }
    .stepper li:not(:last-child)::after { background: #eaecf0; content: ''; height: 1px; position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 1.65rem; }
    .step-num { align-items: center; background: #f2f4f7; border-radius: 50%; color: #667085; display: inline-flex; flex-shrink: 0; font-size: 0.74rem; font-weight: 700; height: 1.65rem; justify-content: center; width: 1.65rem; }
    .step-check { height: 0.85rem; width: 0.85rem; }
    .stepper li.active .step-num, .stepper li.done .step-num { background: #0b5cff; color: #fff; }
    .stepper li.active, .stepper li.done { color: #0b5cff; font-weight: 600; }
    .stepper li.active { font-weight: 700; }
    .wizard-layout { align-items: start; display: grid; gap: 1.15rem; grid-template-columns: minmax(0, 7fr) minmax(17rem, 3fr); }
    .card { background: #fff; border: 1px solid #eaecf0; border-radius: 16px; box-shadow: 0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04); padding: 1.35rem 1.4rem; }
    .step-header h2 { color: #101828; font-size: 1.05rem; font-weight: 700; margin: 0; }
    .step-header p { color: #667085; font-size: 0.84rem; margin: 0.3rem 0 0; }
    .step-header.with-icon { align-items: flex-start; display: flex; gap: 0.85rem; margin-bottom: 1.15rem; }
    .step-icon { align-items: center; background: #eef4ff; border-radius: 50%; color: #175cd3; display: inline-flex; flex-shrink: 0; height: 2.35rem; justify-content: center; width: 2.35rem; }
    .step-icon svg { height: 1.1rem; width: 1.1rem; }
    .basics-form { display: grid; gap: 1.1rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .basics-form label { display: grid; gap: 0.42rem; }
    .basics-form .full, .basics-form .row-three { grid-column: 1 / -1; }
    .row-three { display: grid; gap: 1.1rem; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .basics-form span { color: #344054; font-size: 0.82rem; font-weight: 600; }
    .basics-form em { color: #d92d20; font-style: normal; }
    .field-shell { align-items: center; background: #fff; border: 1px solid #d0d5dd; border-radius: 12px; display: flex; gap: 0.55rem; min-height: 2.85rem; padding: 0 0.85rem; transition: border-color 0.15s ease; }
    .field-shell:focus-within { border-color: #84adff; box-shadow: 0 0 0 3px rgba(11, 92, 255, 0.12); }
    .field-shell.readonly { background: #f9fafb; box-shadow: none; }
    .field-shell.status-field { gap: 0.5rem; }
    .status-value { color: #344054; font-size: 0.88rem; font-weight: 600; }
    .field-shell textarea, .field-shell input, .field-shell select { background: transparent; border: 0; color: #101828; flex: 1; font-size: 0.88rem; min-height: 2.4rem; outline: none; width: 100%; }
    .field-shell select { cursor: pointer; }
    .textarea-shell { align-items: stretch; min-height: auto; padding-top: 0.7rem; }
    .textarea-shell textarea { min-height: 6.25rem; resize: vertical; }
    .field-icon { align-items: center; color: #98a2b3; display: inline-flex; flex: 0 0 auto; }
    .field-icon svg { height: 1rem; width: 1rem; }
    .field-icon.top { align-self: flex-start; margin-top: 0.2rem; }
    .field-meta { align-items: baseline; display: flex; justify-content: space-between; gap: 0.75rem; }
    .char-count { color: #98a2b3; flex-shrink: 0; }
    .basics-form small { color: #667085; font-size: 0.75rem; line-height: 1.35; }
    .basics-form small.error { color: #b42318; }
    .status-dot.draft::before { background: #f79009; border-radius: 50%; content: ''; display: inline-block; height: 0.45rem; margin-right: 0.35rem; width: 0.45rem; vertical-align: middle; }
    .status-field .status-dot.draft::before { margin-right: 0; }
    .alert.draft { align-items: flex-start; background: #fff6ed; border: 1px solid #fedf89; border-radius: 12px; color: #7a2e0e; display: flex; gap: 0.75rem; padding: 0.9rem 1rem; }
    .alert-icon { align-items: center; background: #ffead5; border-radius: 50%; color: #f79009; display: inline-flex; flex-shrink: 0; height: 2rem; justify-content: center; width: 2rem; }
    .alert-icon svg { height: 1rem; width: 1rem; }
    .alert.draft strong { color: #7a2e0e; display: block; font-size: 0.84rem; margin-bottom: 0.2rem; }
    .alert.draft span { color: #93370d; display: block; font-size: 0.78rem; line-height: 1.45; }
    .step-icon.pricing-icon { background: #eef4ff; border-radius: 10px; color: #175cd3; }
    .pricing-step-header { margin-bottom: 1.25rem; }
    .pricing-fields { margin-bottom: 0.25rem; }
    .pricing-info { margin-top: 0.15rem; }
    .step-icon.limits-icon { background: #eef4ff; border-radius: 10px; color: #175cd3; }
    .limits-step-header { border-bottom: 1px solid #f2f4f7; margin-bottom: 1.25rem; padding-bottom: 1rem; }
    .limits-form { display: grid; gap: 1.1rem; }
    .limits-form label { display: grid; gap: 0.42rem; }
    .limits-form span { color: #344054; font-size: 0.82rem; font-weight: 600; }
    .limits-form em { color: #d92d20; font-style: normal; }
    .limits-form small { color: #667085; font-size: 0.75rem; line-height: 1.35; }
    .limits-form small.error { color: #b42318; }
    .limits-fields { margin-bottom: 0.25rem; }
    .limits-info { margin-top: 0.15rem; }
    .limits-form .field-shell input { min-height: 2.4rem; }
    .pricing-form { display: grid; gap: 1.1rem; }
    .pricing-form label { display: grid; gap: 0.42rem; }
    .pricing-form span { color: #344054; font-size: 0.82rem; font-weight: 600; }
    .pricing-form em { color: #d92d20; font-style: normal; }
    .pricing-form small { color: #667085; font-size: 0.75rem; line-height: 1.35; }
    .pricing-form small.error { color: #b42318; }
    .readonly-value { color: #344054; flex: 1; font-size: 0.88rem; font-weight: 500; }
    .currency-prefix { border-right: 1px solid #eaecf0; color: #667085; font-size: 0.82rem; font-weight: 600; margin-right: 0.35rem; padding-right: 0.65rem; }
    .field-shell.invalid { border-color: #fda29b; }
    .alert.info { align-items: flex-start; background: #eff8ff; border: 1px solid #b2ddff; border-radius: 12px; color: #175cd3; display: flex; gap: 0.75rem; padding: 0.9rem 1rem; }
    .alert-icon.info { align-items: center; background: #d1e9ff; border-radius: 50%; color: #175cd3; display: inline-flex; flex-shrink: 0; height: 2rem; justify-content: center; width: 2rem; }
    .alert.info span { color: #175cd3; font-size: 0.78rem; line-height: 1.45; }
    .module-grid, .empty-step, .feature-group, .review-list, .summary-progress { margin-top: 0.5rem; }
    .module-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }
    .module-card { border: 1px solid #eaecf0; border-radius: 12px; display: grid; gap: 0.65rem; padding: 0.85rem; }
    .module-card.selected { border-color: #84adff; box-shadow: 0 0 0 3px rgba(11, 92, 255, 0.12); }
    .module-head p, .module-head small, .muted, .empty-step span { color: #667085; font-size: 0.78rem; }
    .empty-step { background: #f9fafb; border: 1px dashed #d0d5dd; border-radius: 12px; display: grid; gap: 0.35rem; padding: 1.25rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #f2f4f7; padding: 0.55rem 0.35rem; text-align: left; }
    th { color: #667085; font-size: 0.72rem; text-transform: uppercase; }
    td span { color: #667085; display: block; font-size: 0.75rem; margin-top: 0.2rem; }
    tr.disabled { opacity: 0.5; }
    .radio-cell { text-align: center; width: 5rem; }
    .review-list { display: grid; gap: 0.65rem; margin-bottom: 1rem; }
    .review-list div { display: grid; gap: 0.15rem; grid-template-columns: 10rem 1fr; }
    .review-list dt { color: #667085; font-size: 0.78rem; font-weight: 600; }
    .review-list dd { margin: 0; }
    .draft-summary { position: sticky; top: 1rem; }
    .summary-head { align-items: center; border-bottom: 1px solid #f2f4f7; display: flex; gap: 0.55rem; margin-bottom: 1rem; padding-bottom: 0.85rem; }
    .summary-icon { align-items: center; color: #667085; display: inline-flex; }
    .summary-icon svg { height: 1rem; width: 1rem; }
    .summary-head h2 { color: #101828; font-size: 0.95rem; font-weight: 700; margin: 0; }
    .summary-rows { display: grid; gap: 0.65rem; margin: 0; }
    .summary-rows div { align-items: center; display: flex; gap: 0.5rem; justify-content: space-between; }
    .summary-rows dt { color: #667085; font-size: 0.76rem; font-weight: 500; }
    .summary-rows dd { color: #344054; font-size: 0.8rem; font-weight: 600; margin: 0; text-align: right; }
    .summary-progress { border-top: 1px solid #f2f4f7; display: grid; gap: 0.65rem; margin-top: 1rem; padding-top: 1rem; }
    .summary-progress div { align-items: center; display: flex; justify-content: space-between; gap: 0.75rem; }
    .summary-progress span { color: #667085; font-size: 0.76rem; }
    .summary-progress strong { color: #98a2b3; font-size: 0.76rem; font-weight: 500; }
    .summary-progress strong.status-success { color: #027a48; font-weight: 600; }
    .summary-progress strong.status-info { color: #175cd3; font-weight: 600; }
    .summary-progress strong.status-progress { color: #175cd3; font-weight: 600; }
    .summary-progress strong.status-muted { color: #98a2b3; font-weight: 500; }
    .summary-note { align-items: center; background: #eef4ff; border-radius: 10px; color: #175cd3; display: flex; font-size: 0.75rem; gap: 0.45rem; line-height: 1.35; margin: 1rem 0 0; padding: 0.65rem 0.75rem; }
    .summary-note svg { flex-shrink: 0; height: 1rem; stroke: currentColor; stroke-width: 1.5; fill: none; width: 1rem; }
    .selection-summary { border-top: 1px solid #f2f4f7; display: grid; gap: 0.45rem; margin-top: 1rem; padding-top: 1rem; }
    .selection-summary h3 { color: #101828; font-size: 0.82rem; margin: 0; }
    .selection-summary strong { color: #344054; font-size: 0.76rem; }
    .selection-summary ul { display: grid; gap: 0.25rem; list-style: none; margin: 0; padding: 0; }
    .selection-summary li { color: #667085; font-size: 0.75rem; line-height: 1.35; }
    .action-bar { align-items: center; background: #fff; border-top: 1px solid #eaecf0; bottom: 0; box-shadow: 0 -4px 18px rgba(16, 24, 40, 0.06); display: flex; gap: 0.75rem; justify-content: space-between; left: 16.5rem; padding: 0.95rem 1.6rem; position: fixed; right: 0; z-index: 10; }
    .action-group { align-items: center; display: flex; flex-wrap: wrap; gap: 0.65rem; justify-content: flex-end; }
    .btn { align-items: center; border-radius: 10px; cursor: pointer; display: inline-flex; font-size: 0.86rem; font-weight: 600; gap: 0.45rem; justify-content: center; min-height: 2.65rem; padding: 0.55rem 1.05rem; }
    .btn svg { height: 1rem; stroke: currentColor; stroke-width: 1.75; fill: none; width: 1rem; }
    .btn.primary { background: #0b5cff; border: 1px solid #0b5cff; color: #fff; }
    .btn.outline { background: #fff; border: 1px solid #d0d5dd; color: #344054; }
    .btn:disabled { cursor: not-allowed; opacity: 0.5; }
    .modal-backdrop { background: rgba(16, 24, 40, 0.45); inset: 0; position: fixed; z-index: 20; }
    .modal { background: #fff; border: 0; border-radius: 14px; box-shadow: 0 20px 40px rgba(16, 24, 40, 0.18); left: 50%; margin: 0; max-width: 32rem; padding: 1.25rem; position: fixed; top: 50%; transform: translate(-50%, -50%); width: calc(100% - 2rem); z-index: 21; }
    .modal-actions { display: flex; gap: 0.65rem; justify-content: flex-end; }
    @media (max-width: 1100px) {
      .row-three { grid-template-columns: 1fr; }
    }
    @media (max-width: 960px) {
      .wizard-layout { grid-template-columns: 1fr; }
      .draft-summary { position: static; }
      .basics-form { grid-template-columns: 1fr; }
      .action-bar { left: 0; }
    }
  `
})
export class PlatformCreateSubscriptionPlanPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PlatformSubscriptionPlanApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly router = inject(Router);

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

  billingCycleLabel(): string {
    const value = this.basicsForm.controls.billingCycle.value;
    return this.billingCycleOptions.find((option) => option.value === value)?.label ?? '—';
  }

  currencyLabel(): string {
    const code = this.basicsForm.controls.baseCurrency.value;
    return this.currencyLabels[code] ?? code ?? '—';
  }

  currencyCode(): string {
    return this.basicsForm.controls.baseCurrency.value || '—';
  }

  basePriceSummaryLabel(): string {
    const price = this.pricingForm.controls.basePrice.value;
    const currency = this.basicsForm.controls.baseCurrency.value || 'LKR';
    if (price == null) {
      return '—';
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
    const state = history.state as { planId?: string; mode?: 'view' | 'edit' };
    if (state?.planId) {
      this.loadPlanForEdit(state.planId);
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
    if (!this.validateBasicsStep()) {
      this.errorMessage.set('Plan name, plan code, billing cycle, and currency are required before publishing.');
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

  private loadCatalogs(): void {
    this.modulesLoading.set(true);
    this.featuresLoading.set(true);
    this.catalogError.set(null);

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
    this.api.getSubscriptionPlanDetail(planId).subscribe({
      next: (plan) => {
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
      },
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
      }
    });
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
