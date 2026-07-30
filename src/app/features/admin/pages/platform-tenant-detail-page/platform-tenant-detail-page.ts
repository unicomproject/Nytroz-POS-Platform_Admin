import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { TenantLifecycleStatuses } from '../../constants/tenant-lifecycle-status.constants';
import {
  PlatformTenantEntitlementCatalogFeature,
  PlatformTenantEntitlementOptions,
  PlatformTenantEntitlementPlanOption
} from '../../models/platform-tenant-entitlements.model';
import { PlatformTenantDetail, UpdatePlatformTenantRequest } from '../../models/platform-tenant.model';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import { tenantLifecycleBadgeClass, tenantLifecycleLabel, resolveTenantLifecycle } from '../../utils/tenant-lifecycle.util';

@Component({
  selector: 'app-platform-tenant-detail-page',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  template: `
    <section class="tenant-detail-page">
      @if (successMessage()) {
        <div class="toast success" role="status">{{ successMessage() }}</div>
      }

      <header class="page-heading">
        <div class="title-block">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <a routerLink="/admin/tenants">Tenants</a>
            <span aria-hidden="true">/</span>
            <span class="current">Detail</span>
          </nav>
          @if (tenant(); as data) {
            <h1>{{ data.name }}</h1>
            <p>{{ data.code }} · {{ data.operatingMode }}</p>
          } @else {
            <h1>Tenant Detail</h1>
            <p>Loading tenant profile from the backend...</p>
          }
          <span class="title-accent" aria-hidden="true"></span>
        </div>

        @if (tenant(); as data) {
          <div class="page-actions">
            @if (data.canUpdate && canUpdate()) {
              <button type="button" class="btn secondary" [disabled]="isActionPending()" (click)="toggleEditTenant()">
                {{ editMode() ? 'Cancel Edit' : 'Edit Tenant' }}
              </button>
            }
            @if (showActivate(data)) {
              <button type="button" class="btn success" [disabled]="isActionPending()" (click)="activateTenant()">
                {{ isActionPending() ? 'Activating...' : 'Activate Tenant' }}
              </button>
            }
            @if (showSuspend(data)) {
              <button type="button" class="btn danger" [disabled]="isActionPending()" (click)="suspendTenant()">
                {{ isActionPending() ? 'Suspending...' : 'Suspend Tenant' }}
              </button>
            }
          </div>
        }
      </header>

      @if (isLoading()) {
        <div class="state-card card">Loading tenant detail from the backend...</div>
      } @else if (errorMessage()) {
        <div class="state-card card error">
          <strong>Tenant detail could not be loaded</strong>
          <span>{{ errorMessage() }}</span>
          <button type="button" class="btn primary" (click)="reload()">Try again</button>
        </div>
      } @else if (actionError()) {
        <div class="state-card card error">
          <strong>Tenant lifecycle action failed</strong>
          <span>{{ actionError() }}</span>
        </div>
      }

      @if (tenant(); as data) {
        @if (data.setupProgressPercent != null) {
          <article class="card setup-checklist-card">
            <header class="setup-header">
              <h2>Setup Progress</h2>
              <strong>{{ data.setupProgressPercent }}%</strong>
            </header>
            <p>Mandatory onboarding checklist. Outlets and tills remain optional.</p>
            <div class="setup-columns">
              <div>
                <h3>Completed</h3>
                @if (data.setupCompletedSteps?.length) {
                  <ul>
                    @for (step of data.setupCompletedSteps; track step) {
                      <li>{{ formatSetupStep(step) }}</li>
                    }
                  </ul>
                } @else {
                  <span>No mandatory steps completed yet.</span>
                }
              </div>
              <div>
                <h3>Missing</h3>
                @if (data.setupMissingSteps?.length) {
                  <ul>
                    @for (step of data.setupMissingSteps; track step) {
                      <li>{{ formatSetupStep(step) }}</li>
                    }
                  </ul>
                } @else {
                  <span>All mandatory steps complete.</span>
                }
              </div>
            </div>
          </article>
        }
        <section class="summary-grid">
          <article class="summary-card card">
            <span class="label">Lifecycle Status</span>
            <span
              class="status-badge"
              [class]="statusClass(data)"
              [attr.aria-label]="'Lifecycle status: ' + statusLabel(data)"
            >{{ statusLabel(data) }}</span>
          </article>
          <article class="summary-card card">
            <span class="label">Billing Status</span>
            <strong>{{ data.billingStatus }}</strong>
          </article>
          <article class="summary-card card">
            <span class="label">Users</span>
            <strong>{{ data.userCount }}</strong>
          </article>
          <article class="summary-card card">
            <span class="label">Outlets</span>
            <strong>{{ data.outletCount }}</strong>
          </article>
          <article class="summary-card card">
            <span class="label">Tills</span>
            <strong>{{ data.tillCount }}</strong>
          </article>
        </section>

        <div class="detail-grid">
          <article class="panel card">
            <h2>Profile</h2>
            @if (editMode()) {
              <form class="edit-form" (ngSubmit)="saveTenantEdit()">
                <label>
                  <span>Name</span>
                  <input type="text" [ngModel]="editDraft().name" (ngModelChange)="updateEditField('name', $event)" name="name" />
                </label>
                <label>
                  <span>Operating Mode</span>
                  <input type="text" [ngModel]="editDraft().operatingMode" (ngModelChange)="updateEditField('operatingMode', $event)" name="operatingMode" />
                </label>
                <label>
                  <span>Business Type</span>
                  <input type="text" [ngModel]="editDraft().businessType" (ngModelChange)="updateEditField('businessType', $event)" name="businessType" />
                </label>
                <label>
                  <span>Base Currency</span>
                  <input type="text" [ngModel]="editDraft().baseCurrency" (ngModelChange)="updateEditField('baseCurrency', $event)" name="baseCurrency" />
                </label>
                <label>
                  <span>Timezone</span>
                  <input type="text" [ngModel]="editDraft().defaultTimezone" (ngModelChange)="updateEditField('defaultTimezone', $event)" name="defaultTimezone" />
                </label>
                <label>
                  <span>Locale</span>
                  <input type="text" [ngModel]="editDraft().defaultLocale" (ngModelChange)="updateEditField('defaultLocale', $event)" name="defaultLocale" />
                </label>
                <label>
                  <span>Billing Status</span>
                  <input type="text" [ngModel]="editDraft().billingStatus" (ngModelChange)="updateEditField('billingStatus', $event)" name="billingStatus" />
                </label>
                <div class="edit-actions">
                  <button type="button" class="btn ghost" [disabled]="isActionPending()" (click)="cancelEditTenant()">Cancel</button>
                  <button type="submit" class="btn primary" [disabled]="isActionPending()">{{ isActionPending() ? 'Saving...' : 'Save Tenant' }}</button>
                </div>
              </form>
            } @else {
              <dl>
                <div><dt>Tenant Code</dt><dd>{{ data.code }}</dd></div>
                <div><dt>Operating Mode</dt><dd>{{ data.operatingMode }}</dd></div>
                <div><dt>Business Type</dt><dd>{{ data.businessType || '—' }}</dd></div>
                <div><dt>Base Currency</dt><dd>{{ data.baseCurrency }}</dd></div>
                <div><dt>Timezone</dt><dd>{{ data.defaultTimezone }}</dd></div>
                <div><dt>Locale</dt><dd>{{ data.defaultLocale }}</dd></div>
                <div><dt>Created On</dt><dd>{{ data.createdOn | date: 'medium' }}</dd></div>
                <div><dt>Last Activity</dt><dd>{{ data.lastActivityAt ? (data.lastActivityAt | date: 'medium') : '—' }}</dd></div>
              </dl>
            }
          </article>

          <article class="panel card">
            <h2>Subscription</h2>
            @if (data.subscription) {
              <dl>
                <div><dt>Plan</dt><dd>{{ data.subscription.planName }}</dd></div>
                <div><dt>Plan Code</dt><dd>{{ data.subscription.planCode }}</dd></div>
                <div><dt>Subscription Status</dt><dd>{{ data.subscription.subscriptionStatus }}</dd></div>
              </dl>
            } @else {
              <p class="muted">No subscription plan is assigned to this tenant.</p>
            }
          </article>

          <article class="panel card">
            <div class="panel-heading">
              <h2>Entitlements</h2>
              @if (data.canManageEntitlements && canManageEntitlements()) {
                <button type="button" class="btn secondary" (click)="openEntitlementEditor()">Edit Entitlements</button>
              }
            </div>
            <p class="section-note">Enabled features returned by the tenant detail API.</p>
            @if (data.enabledFeatureCodes.length) {
              <ul class="feature-list">
                @for (code of data.enabledFeatureCodes; track code) {
                  <li>
                    <span>{{ featureLabelForCode(code) }}</span>
                    <code class="feature-code">{{ code }}</code>
                  </li>
                }
              </ul>
            } @else {
              <p class="muted">No features are enabled for this tenant.</p>
            }
          </article>
        </div>
      }

      @if (editorOpen()) {
        <div class="editor-backdrop" (click)="closeEntitlementEditor()"></div>
        <aside class="editor-panel card" role="dialog" aria-modal="true" aria-label="Edit tenant entitlements">
          <header class="editor-header">
            <div>
              <h2>Edit Entitlements</h2>
              @if (tenant(); as data) {
                <p>{{ data.name }}</p>
              }
            </div>
            <button type="button" class="icon-close" aria-label="Close" (click)="closeEntitlementEditor()">×</button>
          </header>

          @if (editorLoading()) {
            <div class="editor-state">Loading entitlement options from the backend...</div>
          } @else if (editorError()) {
            <div class="editor-state error" role="alert">
              <strong>Entitlement options could not be loaded</strong>
              <span>{{ editorError() }}</span>
              <button type="button" class="btn primary" (click)="openEntitlementEditor()">Try again</button>
            </div>
          } @else if (entitlementOptions(); as options) {
            @if (editorValidationError()) {
              <div class="editor-error" role="alert">{{ editorValidationError() }}</div>
            }
            @if (editorSaveError()) {
              <div class="editor-error" role="alert">{{ editorSaveError() }}</div>
            }

            @if (!options.plans.length) {
              <div class="editor-state empty">
                <strong>No active subscription plans available</strong>
                <span>Entitlement editing requires at least one active plan from the backend.</span>
              </div>
            } @else {
              <div class="editor-form">
                <label>
                  <span>Subscription Plan *</span>
                  <select
                    [ngModel]="selectedPlanId()"
                    (ngModelChange)="onPlanChange($event)"
                    [disabled]="editorSaving()"
                  >
                    @for (plan of options.plans; track plan.id) {
                      <option [value]="plan.id">{{ plan.name }} ({{ plan.code }})</option>
                    }
                  </select>
                </label>

                @if (selectedPlan(); as plan) {
                  <fieldset class="features-fieldset">
                    <legend>Enabled Features</legend>
                    <p class="muted">Only features included in the selected plan can be enabled.</p>
                    @if (!options.catalogModules.length) {
                      <p class="muted">No catalog modules returned from the backend.</p>
                    } @else {
                      @for (module of options.catalogModules; track module.id) {
                        <section class="module-block">
                          <h3>{{ module.name }}</h3>
                          <ul class="feature-options">
                            @for (feature of module.features; track feature.id) {
                              <li [class.disabled]="!isFeatureAllowed(feature, plan)">
                                <label>
                                  <input
                                    type="checkbox"
                                    [checked]="isFeatureEnabled(feature.id)"
                                    [disabled]="!isFeatureAllowed(feature, plan) || editorSaving()"
                                    (change)="toggleFeature(feature, $event)"
                                  />
                                  <span class="feature-label">
                                    <strong>{{ feature.name }}</strong>
                                    <small>{{ feature.code }}</small>
                                  </span>
                                </label>
                              </li>
                            }
                          </ul>
                        </section>
                      }
                    }
                  </fieldset>
                }

                <footer class="editor-actions">
                  <button type="button" class="btn ghost" [disabled]="editorSaving()" (click)="closeEntitlementEditor()">
                    Cancel
                  </button>
                  <button type="button" class="btn primary" [disabled]="editorSaving()" (click)="saveEntitlements()">
                    {{ editorSaving() ? 'Saving...' : 'Save Entitlements' }}
                  </button>
                </footer>
              </div>
            }
          }
        </aside>
      }
    </section>
  `,
  styles: `
    :host { color: #14213d; display: block; }
    * { box-sizing: border-box; }

    .tenant-detail-page { display: grid; gap: 1.15rem; }

    .page-heading {
      align-items: flex-start;
      display: flex;
      gap: 1.25rem;
      justify-content: space-between;
    }

    .breadcrumb {
      align-items: center;
      color: #667085;
      display: flex;
      font-size: 0.78rem;
      gap: 0.45rem;
      margin-bottom: 0.45rem;
    }

    .breadcrumb a { color: #0b5cff; text-decoration: none; }
    .breadcrumb .current { color: #344054; font-weight: 700; }

    .title-block h1 {
      color: #101a38;
      font-size: clamp(1.55rem, 2.4vw, 2rem);
      margin: 0;
    }

    .title-block p { color: #667085; font-size: 0.92rem; margin: 0.4rem 0 0; }

    .title-accent {
      background: linear-gradient(90deg, #0b5cff, #5b8dff);
      border-radius: 99px;
      display: block;
      height: 3px;
      margin-top: 0.75rem;
      width: 2.75rem;
    }

    .page-actions { display: flex; flex-wrap: wrap; gap: 0.7rem; }

    .btn {
      align-items: center;
      border-radius: 10px;
      cursor: pointer;
      display: inline-flex;
      font-size: 0.84rem;
      font-weight: 700;
      min-height: 2.65rem;
      padding: 0 1rem;
    }

    .btn.primary { background: #0b5cff; border: 0; color: #fff; }
    .btn.secondary { background: #fff; border: 1px solid #d0d5dd; color: #344054; }
    .btn.ghost { background: #fff; border: 1px solid #d0d5dd; color: #344054; }
    .btn.success { background: #16a34a; border: 0; color: #fff; }
    .btn.danger { background: #ef4444; border: 0; color: #fff; }
    .btn:disabled { cursor: not-allowed; opacity: 0.55; }

    .card {
      background: #fff;
      border: 1px solid #e5eaf2;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.06);
    }

    .summary-grid {
      display: grid;
      gap: 0.85rem;
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }

    .summary-card {
      display: grid;
      gap: 0.45rem;
      padding: 1rem;
    }

    .summary-card .label {
      color: #667085;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .summary-card strong { color: #101a38; font-size: 1.35rem; }

    .detail-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .panel { padding: 1.1rem; }

    .panel-heading {
      align-items: center;
      display: flex;
      gap: 0.75rem;
      justify-content: space-between;
      margin-bottom: 0.85rem;
    }

    .panel h2, .panel-heading h2 {
      color: #101a38;
      font-size: 1rem;
      margin: 0;
    }

    dl {
      display: grid;
      gap: 0.75rem;
      margin: 0;
    }

    dl div {
      display: grid;
      gap: 0.2rem;
    }

    dt {
      color: #667085;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    dd { color: #344054; font-size: 0.88rem; margin: 0; }

    .edit-form {
      display: grid;
      gap: 0.65rem;
    }

    .edit-form label {
      display: grid;
      gap: 0.35rem;
    }

    .edit-form label > span {
      color: #667085;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .edit-form input {
      border: 1px solid #d0d5dd;
      border-radius: 10px;
      min-height: 2.4rem;
      padding: 0 0.7rem;
    }

    .edit-actions {
      display: flex;
      gap: 0.55rem;
      justify-content: flex-end;
      margin-top: 0.4rem;
    }

    .section-note, .muted {
      color: #667085;
      font-size: 0.82rem;
      margin: 0 0 0.85rem;
    }

    .feature-list {
      display: grid;
      gap: 0.65rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .feature-list li {
      align-items: center;
      background: #ecfdf5;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0.85rem;
    }

    .feature-list span { color: #344054; font-size: 0.84rem; font-weight: 600; }

    .feature-code {
      background: #f8fafc;
      border-radius: 6px;
      color: #475569;
      font-size: 0.72rem;
      padding: 0.2rem 0.45rem;
    }

    .status-badge {
      border-radius: 999px;
      display: inline-block;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.35rem 0.75rem;
      width: fit-content;
    }

    .status-badge.active { background: #dcfce7; color: #15803d; }
    .status-badge.suspended { background: #ffedd5; color: #c2410c; }
    .status-badge.draft { background: #e2e8f0; color: #475569; }
    .status-badge.pending_payment { background: #fef3c7; color: #b45309; }
    .status-badge.pending_activation { background: #dbeafe; color: #1d4ed8; }
    .status-badge.cancelled { background: #fee2e2; color: #b91c1c; }
    .status-badge.unknown { background: #f2f4f7; color: #667085; }

    .state-card {
      display: grid;
      gap: 0.75rem;
      padding: 2rem;
      text-align: center;
    }

    .state-card.error { color: #b42318; }

    .toast {
      background: #ecfdf5;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      color: #15803d;
      font-size: 0.84rem;
      font-weight: 700;
      padding: 0.75rem 1rem;
    }

    .editor-backdrop {
      background: rgba(16, 24, 40, 0.45);
      inset: 0;
      position: fixed;
      z-index: 40;
    }

    .editor-panel {
      display: grid;
      gap: 1rem;
      inset: 0 0 0 auto;
      max-width: 32rem;
      overflow-y: auto;
      padding: 1.25rem;
      position: fixed;
      width: min(100%, 32rem);
      z-index: 50;
    }

    .editor-header {
      align-items: flex-start;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
    }

    .editor-header h2 {
      color: #101a38;
      font-size: 1.1rem;
      margin: 0;
    }

    .editor-header p {
      color: #667085;
      font-size: 0.82rem;
      margin: 0.35rem 0 0;
    }

    .icon-close {
      background: transparent;
      border: 0;
      color: #667085;
      cursor: pointer;
      font-size: 1.5rem;
      line-height: 1;
      padding: 0;
    }

    .editor-state {
      display: grid;
      gap: 0.65rem;
      padding: 1rem 0;
      text-align: center;
    }

    .editor-state.error { color: #b42318; }
    .editor-state.empty { color: #667085; }

    .editor-error {
      background: #fef3f2;
      border: 1px solid #fecdca;
      border-radius: 10px;
      color: #b42318;
      font-size: 0.82rem;
      padding: 0.75rem 0.85rem;
    }

    .editor-form {
      display: grid;
      gap: 1rem;
    }

    .editor-form label {
      display: grid;
      gap: 0.4rem;
    }

    .editor-form label > span {
      color: #344054;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .editor-form select {
      border: 1px solid #d0d5dd;
      border-radius: 10px;
      min-height: 2.65rem;
      padding: 0 0.75rem;
    }

    .features-fieldset {
      border: 1px solid #e5eaf2;
      border-radius: 10px;
      display: grid;
      gap: 0.85rem;
      margin: 0;
      padding: 0.85rem;
    }

    .features-fieldset legend {
      color: #101a38;
      font-size: 0.88rem;
      font-weight: 700;
      padding: 0 0.25rem;
    }

    .module-block h3 {
      color: #344054;
      font-size: 0.82rem;
      margin: 0 0 0.5rem;
    }

    .feature-options {
      display: grid;
      gap: 0.45rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .feature-options li.disabled { opacity: 0.45; }

    .feature-options label {
      align-items: flex-start;
      cursor: pointer;
      display: flex;
      gap: 0.55rem;
    }

    .feature-label {
      display: grid;
      gap: 0.15rem;
    }

    .feature-label strong { color: #344054; font-size: 0.84rem; }
    .feature-label small { color: #667085; font-size: 0.72rem; }

    .editor-actions {
      display: flex;
      gap: 0.65rem;
      justify-content: flex-end;
      padding-top: 0.5rem;
    }

    @media (max-width: 1100px) {
      .summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .detail-grid { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 760px) {
      .page-heading { flex-direction: column; }
      .summary-grid, .detail-grid { grid-template-columns: 1fr; }
      .editor-panel { max-width: 100%; width: 100%; }
    }
  `
})
export class PlatformTenantDetailPage {
  private readonly api = inject(PlatformTenantApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly accessControl = inject(AccessControlService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly tenant = signal<PlatformTenantDetail | null>(null);
  readonly isLoading = signal(true);
  readonly isActionPending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly editMode = signal(false);
  readonly editDraft = signal<UpdatePlatformTenantRequest>({
    name: '',
    baseCurrency: '',
    defaultTimezone: '',
    defaultLocale: '',
    operatingMode: '',
    businessType: '',
    billingStatus: ''
  });

  readonly editorOpen = signal(false);
  readonly editorLoading = signal(false);
  readonly editorError = signal<string | null>(null);
  readonly editorSaveError = signal<string | null>(null);
  readonly editorValidationError = signal<string | null>(null);
  readonly editorSaving = signal(false);
  readonly entitlementOptions = signal<PlatformTenantEntitlementOptions | null>(null);
  readonly selectedPlanId = signal('');
  readonly selectedFeatureIds = signal<string[]>([]);

  readonly selectedPlan = computed<PlatformTenantEntitlementPlanOption | null>(() => {
    const options = this.entitlementOptions();
    const planId = this.selectedPlanId();
    if (!options || !planId) {
      return null;
    }

    return options.plans.find((plan) => plan.id === planId) ?? null;
  });

  private readonly featureNameByCode = signal<Map<string, string>>(new Map());

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
          this.actionError.set(null);
          this.successMessage.set(null);
          return this.api.getTenantById(params.get('tenantId') ?? '');
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (tenant) => {
          this.tenant.set(tenant);
          this.hydrateEditDraft(tenant);
          this.editMode.set(false);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.tenant.set(null);
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  reload(): void {
    const tenantId = this.route.snapshot.paramMap.get('tenantId');
    if (!tenantId) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.api.getTenantById(tenantId).subscribe({
      next: (tenant) => {
        this.tenant.set(tenant);
        this.hydrateEditDraft(tenant);
        this.editMode.set(false);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  openEntitlementEditor(): void {
    const tenantId = this.route.snapshot.paramMap.get('tenantId');
    const current = this.tenant();
    if (!tenantId || !current?.canManageEntitlements || !this.canManageEntitlements()) {
      return;
    }

    this.editorOpen.set(true);
    this.editorLoading.set(true);
    this.editorError.set(null);
    this.editorSaveError.set(null);
    this.editorValidationError.set(null);
    this.entitlementOptions.set(null);

    this.api.getEntitlementOptions(tenantId).subscribe({
      next: (options) => {
        this.entitlementOptions.set(options);
        this.selectedPlanId.set(options.currentSubscriptionPlanId ?? options.plans[0]?.id ?? '');
        this.selectedFeatureIds.set([...options.enabledFeatureIds]);
        this.cacheFeatureNames(options);
        this.editorLoading.set(false);
      },
      error: (error) => {
        this.editorError.set(this.apiError.toSafeMessage(error));
        this.editorLoading.set(false);
      }
    });
  }

  closeEntitlementEditor(): void {
    if (this.editorSaving()) {
      return;
    }

    this.editorOpen.set(false);
    this.editorLoading.set(false);
    this.editorError.set(null);
    this.editorSaveError.set(null);
    this.editorValidationError.set(null);
    this.entitlementOptions.set(null);
    this.selectedPlanId.set('');
    this.selectedFeatureIds.set([]);
  }

  onPlanChange(planId: string): void {
    this.selectedPlanId.set(planId);
    this.syncFeaturesForPlan();
    this.editorValidationError.set(null);
  }

  isFeatureAllowed(
    feature: PlatformTenantEntitlementCatalogFeature,
    plan: PlatformTenantEntitlementPlanOption
  ): boolean {
    return plan.includedFeatureIds.includes(feature.id) || plan.includedFeatureCodes.includes(feature.code);
  }

  isFeatureEnabled(featureId: string): boolean {
    return this.selectedFeatureIds().includes(featureId);
  }

  toggleFeature(feature: PlatformTenantEntitlementCatalogFeature, event: Event): void {
    const plan = this.selectedPlan();
    if (!plan || !this.isFeatureAllowed(feature, plan)) {
      return;
    }

    const input = event.target as HTMLInputElement;
    if (input.checked) {
      this.selectedFeatureIds.update((items) => (items.includes(feature.id) ? items : [...items, feature.id]));
      return;
    }

    this.selectedFeatureIds.update((items) => items.filter((id) => id !== feature.id));
    this.editorValidationError.set(null);
  }

  saveEntitlements(): void {
    const tenantId = this.route.snapshot.paramMap.get('tenantId');
    const planId = this.selectedPlanId();
    const options = this.entitlementOptions();
    if (!tenantId || !options) {
      return;
    }

    if (!planId) {
      this.editorValidationError.set('Select a subscription plan before saving.');
      return;
    }

    if (!this.selectedFeatureIds().length) {
      this.editorValidationError.set('Select at least one enabled feature before saving.');
      return;
    }

    const featureCodeById = this.buildFeatureCodeById(options);
    const enabledFeatureCodes = this.selectedFeatureIds()
      .map((id) => featureCodeById.get(id))
      .filter((code): code is string => Boolean(code));

    this.editorSaving.set(true);
    this.editorSaveError.set(null);
    this.editorValidationError.set(null);

    this.api
      .updateEntitlements(tenantId, {
        subscriptionPlanId: planId,
        enabledFeatureIds: [...this.selectedFeatureIds()],
        enabledFeatureCodes
      })
      .subscribe({
        next: (tenant) => {
          this.tenant.set(tenant);
          this.cacheFeatureNamesFromCodes(tenant.enabledFeatureCodes, options);
          this.editorSaving.set(false);
          this.closeEntitlementEditor();
          this.successMessage.set('Tenant entitlements updated successfully.');
        },
        error: (error) => {
          this.editorSaveError.set(this.apiError.toSafeMessage(error));
          this.editorSaving.set(false);
        }
      });
  }

  featureLabelForCode(code: string): string {
    return this.featureNameByCode().get(code) ?? code;
  }

  activateTenant(): void {
    this.runLifecycleAction('activate');
  }

  suspendTenant(): void {
    this.runLifecycleAction('suspend');
  }

  showActivate(tenant: PlatformTenantDetail): boolean {
    if (!tenant.canActivate || !this.canActivate()) {
      return false;
    }

    const lifecycle = resolveTenantLifecycle({
      lifecycleStatus: tenant.lifecycleStatus,
      status: tenant.status
    }).value;

    // Backend canActivate is authoritative; still hide clearly non-activatable UI states.
    if (
      lifecycle === TenantLifecycleStatuses.PendingPayment
      || lifecycle === TenantLifecycleStatuses.Active
      || lifecycle === TenantLifecycleStatuses.Cancelled
    ) {
      return false;
    }

    return true;
  }

  showSuspend(tenant: PlatformTenantDetail): boolean {
    return tenant.canSuspend && this.canSuspend();
  }

  canActivate(): boolean {
    return this.accessControl.hasPermission(platformPermissions.tenantsActivate);
  }

  canSuspend(): boolean {
    return this.accessControl.hasPermission(platformPermissions.tenantsSuspend);
  }

  canManageEntitlements(): boolean {
    return this.accessControl.hasPermission(platformPermissions.tenantsEntitlementsUpdate);
  }

  canUpdate(): boolean {
    return this.accessControl.hasPermission(platformPermissions.tenantsUpdate);
  }

  toggleEditTenant(): void {
    const tenant = this.tenant();
    if (!tenant || !tenant.canUpdate || !this.canUpdate()) {
      return;
    }

    if (this.editMode()) {
      this.cancelEditTenant();
      return;
    }

    this.hydrateEditDraft(tenant);
    this.editMode.set(true);
    this.actionError.set(null);
  }

  cancelEditTenant(): void {
    const tenant = this.tenant();
    if (tenant) {
      this.hydrateEditDraft(tenant);
    }

    this.editMode.set(false);
  }

  updateEditField(field: keyof UpdatePlatformTenantRequest, value: string): void {
    this.editDraft.update((current) => ({
      ...current,
      [field]: value
    }));
  }

  saveTenantEdit(): void {
    const tenantId = this.route.snapshot.paramMap.get('tenantId');
    const tenant = this.tenant();
    if (!tenantId || !tenant || !tenant.canUpdate || !this.canUpdate()) {
      return;
    }

    const payload = this.editDraft();
    if (!payload.name.trim()) {
      this.actionError.set('Tenant name is required.');
      return;
    }

    this.isActionPending.set(true);
    this.actionError.set(null);
    this.successMessage.set(null);

    this.api.updateTenant(tenantId, payload).subscribe({
      next: (updated) => {
        this.tenant.set(updated);
        this.hydrateEditDraft(updated);
        this.editMode.set(false);
        this.isActionPending.set(false);
        this.successMessage.set('Tenant updated successfully.');
      },
      error: (error) => {
        this.isActionPending.set(false);
        this.actionError.set(this.apiError.toSafeMessage(error));
      }
    });
  }

  statusLabel(tenant: PlatformTenantDetail): string {
    return tenantLifecycleLabel({
      lifecycleStatus: tenant.lifecycleStatus,
      status: tenant.status
    });
  }

  statusClass(tenant: PlatformTenantDetail): string {
    return tenantLifecycleBadgeClass({
      lifecycleStatus: tenant.lifecycleStatus,
      status: tenant.status
    });
  }

  formatSetupStep(step: string): string {
    return ({
      business_profile: 'Business profile',
      subscription_plan: 'Subscription plan',
      entitlements: 'Feature entitlements',
      billing_condition: 'Billing condition',
      tenant_admin: 'Tenant admin user'
    } as Record<string, string>)[step] ?? step;
  }

  private syncFeaturesForPlan(): void {
    const plan = this.selectedPlan();
    if (!plan) {
      this.selectedFeatureIds.set([]);
      return;
    }

    const allowedIds = this.selectedFeatureIds().filter((featureId) => {
      const feature = this.findFeature(featureId);
      if (!feature) {
        return false;
      }

      return this.isFeatureAllowed(feature, plan);
    });

    this.selectedFeatureIds.set(Array.from(new Set(allowedIds)));
  }

  private findFeature(featureId: string): PlatformTenantEntitlementCatalogFeature | null {
    const options = this.entitlementOptions();
    if (!options) {
      return null;
    }

    for (const module of options.catalogModules) {
      const feature = module.features.find((item) => item.id === featureId);
      if (feature) {
        return feature;
      }
    }

    return null;
  }

  private buildFeatureCodeById(options: PlatformTenantEntitlementOptions): Map<string, string> {
    const map = new Map<string, string>();
    for (const module of options.catalogModules) {
      for (const feature of module.features) {
        map.set(feature.id, feature.code);
      }
    }

    return map;
  }

  private cacheFeatureNames(options: PlatformTenantEntitlementOptions): void {
    const map = new Map<string, string>();
    for (const module of options.catalogModules) {
      for (const feature of module.features) {
        map.set(feature.code, feature.name);
      }
    }

    this.featureNameByCode.set(map);
  }

  private cacheFeatureNamesFromCodes(codes: string[], options: PlatformTenantEntitlementOptions): void {
    const map = new Map(this.featureNameByCode());
    for (const module of options.catalogModules) {
      for (const feature of module.features) {
        if (codes.includes(feature.code)) {
          map.set(feature.code, feature.name);
        }
      }
    }

    this.featureNameByCode.set(map);
  }

  private runLifecycleAction(action: 'activate' | 'suspend'): void {
    const tenantId = this.route.snapshot.paramMap.get('tenantId');
    const current = this.tenant();
    if (!tenantId || !current) {
      return;
    }

    if (action === 'activate' && !this.showActivate(current)) {
      return;
    }

    if (action === 'suspend' && !this.showSuspend(current)) {
      return;
    }

    this.isActionPending.set(true);
    this.actionError.set(null);
    this.successMessage.set(null);

    const request$ = action === 'activate' ? this.api.activateTenant(tenantId) : this.api.suspendTenant(tenantId);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (tenant) => {
        this.tenant.set(tenant);
        this.isActionPending.set(false);
        this.successMessage.set(action === 'activate' ? 'Tenant activated successfully.' : 'Tenant suspended successfully.');
      },
      error: (error) => {
        this.isActionPending.set(false);
        this.actionError.set(this.apiError.toSafeMessage(error));
      }
    });
  }

  private hydrateEditDraft(tenant: PlatformTenantDetail): void {
    this.editDraft.set({
      name: tenant.name,
      baseCurrency: tenant.baseCurrency,
      defaultTimezone: tenant.defaultTimezone,
      defaultLocale: tenant.defaultLocale,
      operatingMode: tenant.operatingMode,
      businessType: tenant.businessType,
      billingStatus: tenant.billingStatus
    });
  }
}
