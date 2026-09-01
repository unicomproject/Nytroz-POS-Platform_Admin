import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { TenantLifecycleStatuses } from '../../constants/tenant-lifecycle-status.constants';
import {
  PlatformTenantEntitlementCatalogFeature,
  PlatformTenantEntitlementOptions,
  PlatformTenantEntitlementPlanOption
} from '../../models/platform-tenant-entitlements.model';
import {
  PlatformTenantAuditLogListResponse,
  PlatformTenantDetail,
  UpdatePlatformTenantRequest
} from '../../models/platform-tenant.model';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import {
  resolveTenantLifecycle,
  tenantLifecycleBadgeClass,
  tenantLifecycleLabel
} from '../../utils/tenant-lifecycle.util';

import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { BreadcrumbItem, PageHeader } from '../../../../shared/components/page-header/page-header';
import { Button } from '../../../../shared/ui/button/button';
import { FormField } from '../../../../shared/ui/form-field/form-field';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-platform-tenant-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    PageHeader,
    Button,
    StatusBadge,
    FormField,
    LoadingSkeleton,
    ErrorState,
    EmptyState,
    ConfirmationDialog
  ],
  template: `
    <section class="tenant-detail-page">
      @if (successMessage()) {
        <div class="toast success" role="status">{{ successMessage() }}</div>
      }

      <app-page-header
        [title]="tenant()?.name || 'Tenant Detail'"
        [description]="headerDescription()"
        [breadcrumbs]="breadcrumbItems()"
      >
        @if (tenant(); as data) {
          <div class="header-meta">
            <app-status-badge [variant]="mapStatusVariant(statusClass(data))">
              {{ statusLabel(data) }}
            </app-status-badge>
          </div>
          <div class="header-actions" role="group" aria-label="Tenant actions">
            @if (editMode()) {
              <app-button variant="secondary" [disabled]="isActionPending()" (click)="cancelEditTenant()">
                Cancel
              </app-button>
            } @else if (data.canUpdate && canUpdate()) {
              <app-button variant="primary" [disabled]="isActionPending()" (click)="toggleEditTenant()">
                Edit Profile
              </app-button>
            }
            @if (!editMode() && showActivate(data)) {
              <app-button
                [variant]="data.canUpdate && canUpdate() ? 'secondary' : 'primary'"
                [disabled]="isActionPending()"
                (click)="activateTenant()"
              >
                {{ isActionPending() ? 'Activating...' : 'Activate Tenant' }}
              </app-button>
            }
            @if (!editMode() && showReactivate(data)) {
              <app-button
                [variant]="data.canUpdate && canUpdate() ? 'secondary' : 'primary'"
                [disabled]="isActionPending()"
                (click)="reactivateTenant()"
              >
                {{ isActionPending() ? 'Reactivating...' : 'Reactivate Tenant' }}
              </app-button>
            }
            @if (!editMode() && showSuspend(data)) {
              <app-button variant="destructive" [disabled]="isActionPending()" (click)="confirmSuspend()">
                Suspend Tenant
              </app-button>
            }
            @if (!editMode() && canConfigureTenant()) {
              <app-button variant="primary" [disabled]="isActionPending()" (click)="configureTenant(data)">
                Configure Tenant
              </app-button>
            }
          </div>
        }
      </app-page-header>

      @if (isLoading()) {
        <div class="skeleton-wrap" aria-busy="true" aria-label="Loading tenant detail">
          <app-loading-skeleton [rows]="5" />
        </div>
      } @else if (errorMessage()) {
        <app-error-state
          title="Tenant detail could not be loaded"
          [message]="errorMessage()!"
          [hasRetry]="true"
          (retry)="reload()"
        />
      } @else if (actionError() && !editMode()) {
        <app-error-state
          title="Tenant lifecycle action failed"
          [message]="actionError()!"
          [hasRetry]="isConflictError()"
          (retry)="reload()"
        />
      }

      @if (tenant(); as data) {
        @if (hasAuditViewPermission()) {
          <nav class="detail-tabs" aria-label="Tenant detail navigation" role="tablist">
            <button
              type="button"
              role="tab"
              id="tab-details"
              class="tab-btn"
              [class.active]="activeTab() === 'details'"
              [attr.aria-selected]="activeTab() === 'details'"
              aria-controls="panel-details"
              (click)="activeTab.set('details')"
            >
              Details
            </button>
            <button
              type="button"
              role="tab"
              id="tab-audit"
              class="tab-btn"
              [class.active]="activeTab() === 'audit'"
              [attr.aria-selected]="activeTab() === 'audit'"
              aria-controls="panel-audit"
              (click)="switchTab('audit')"
            >
              Audit History
            </button>
          </nav>
        }

        @if (activeTab() === 'details') {
          <div id="panel-details" role="tabpanel" aria-labelledby="tab-details">
            @if (data.setupProgressPercent != null) {
              <section class="setup-section" aria-labelledby="setup-heading">
                <header class="setup-header">
                  <div>
                    <h2 id="setup-heading">Setup Progress</h2>
                    <p class="section-note">Mandatory onboarding checklist. Outlets and tills remain optional.</p>
                  </div>
                  <strong class="progress-percent" aria-label="Setup progress percent">
                    {{ data.setupProgressPercent }}%
                  </strong>
                </header>

                <div class="setup-columns">
                  <div>
                    <h3>Completed</h3>
                    @if (data.setupCompletedSteps?.length) {
                      <ul class="checklist-list completed">
                        @for (step of data.setupCompletedSteps; track step) {
                          <li>
                            <svg viewBox="0 0 24 24" class="check-icon" aria-hidden="true">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            <span>{{ formatSetupStep(step) }}</span>
                          </li>
                        }
                      </ul>
                    } @else {
                      <span class="checklist-muted">No mandatory steps completed yet.</span>
                    }
                  </div>
                  <div>
                    <h3>Missing</h3>
                    @if (data.setupMissingSteps?.length) {
                      <ul class="checklist-list missing">
                        @for (step of data.setupMissingSteps; track step) {
                          <li>
                            <svg viewBox="0 0 24 24" class="cross-icon" aria-hidden="true">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                            <span>{{ formatSetupStep(step) }}</span>
                          </li>
                        }
                      </ul>
                    } @else {
                      <span class="checklist-muted">All mandatory steps complete.</span>
                    }
                  </div>
                </div>

                @if (data.continueSetupPath || (data.setupMissingSteps && data.setupMissingSteps.length > 0)) {
                  <div class="setup-cta">
                    <a class="continue-link" [routerLink]="data.continueSetupPath || ['/admin/tenants', data.id]">
                      Continue Setup
                    </a>
                  </div>
                }
              </section>
            }

            <section class="summary-grid" aria-label="Tenant summary">
              @if (hasBillingViewPermission()) {
                <article class="summary-card">
                  <span class="label">Billing Status</span>
                  <strong class="summary-val">{{ data.billingStatus }}</strong>
                </article>
              }
              <article class="summary-card">
                <span class="label">Users</span>
                <strong class="summary-val">{{ data.userCount }}</strong>
              </article>
              <article class="summary-card">
                <span class="label">Outlets</span>
                <strong class="summary-val">{{ data.outletCount }}</strong>
              </article>
              @if (data.setupProgressPercent != null) {
                <article class="summary-card">
                  <span class="label">Setup Status</span>
                  <strong class="summary-val">{{ data.setupProgressPercent }}%</strong>
                </article>
              } @else {
                <article class="summary-card">
                  <span class="label">Tills</span>
                  <strong class="summary-val">{{ data.tillCount }}</strong>
                </article>
              }
            </section>

            <div class="detail-grid">
              <section class="panel" aria-labelledby="profile-heading">
                <h2 id="profile-heading">Tenant Profile</h2>
                @if (editMode()) {
                  <form class="edit-form" (ngSubmit)="saveTenantEdit()">
                    @if (actionError()) {
                      <p class="inline-error" role="alert">{{ actionError() }}</p>
                    }
                    <app-form-field
                      id="tenant-name"
                      label="Name"
                      [required]="true"
                      [error]="actionError() === 'Tenant name is required.' ? 'Tenant name is required.' : null"
                    >
                      <input
                        id="tenant-name"
                        type="text"
                        [ngModel]="editDraft().name"
                        (ngModelChange)="updateEditField('name', $event)"
                        name="name"
                        [attr.aria-invalid]="actionError() === 'Tenant name is required.' ? true : null"
                      />
                    </app-form-field>
                    <app-form-field id="operating-mode" label="Operating Mode">
                      <input
                        id="operating-mode"
                        type="text"
                        [ngModel]="editDraft().operatingMode"
                        (ngModelChange)="updateEditField('operatingMode', $event)"
                        name="operatingMode"
                      />
                    </app-form-field>
                    <app-form-field id="business-type" label="Business Type">
                      <input
                        id="business-type"
                        type="text"
                        [ngModel]="editDraft().businessType"
                        (ngModelChange)="updateEditField('businessType', $event)"
                        name="businessType"
                      />
                    </app-form-field>
                    <app-form-field id="base-currency" label="Base Currency">
                      <input
                        id="base-currency"
                        type="text"
                        [ngModel]="editDraft().baseCurrency"
                        (ngModelChange)="updateEditField('baseCurrency', $event)"
                        name="baseCurrency"
                      />
                    </app-form-field>
                    <app-form-field id="timezone" label="Timezone">
                      <input
                        id="timezone"
                        type="text"
                        [ngModel]="editDraft().defaultTimezone"
                        (ngModelChange)="updateEditField('defaultTimezone', $event)"
                        name="defaultTimezone"
                      />
                    </app-form-field>
                    <app-form-field id="locale" label="Locale">
                      <input
                        id="locale"
                        type="text"
                        [ngModel]="editDraft().defaultLocale"
                        (ngModelChange)="updateEditField('defaultLocale', $event)"
                        name="defaultLocale"
                      />
                    </app-form-field>
                    <app-form-field id="billing-status" label="Billing Status">
                      <input
                        id="billing-status"
                        type="text"
                        [ngModel]="editDraft().billingStatus"
                        (ngModelChange)="updateEditField('billingStatus', $event)"
                        name="billingStatus"
                      />
                    </app-form-field>
                    <div class="edit-actions">
                      <app-button variant="secondary" [disabled]="isActionPending()" (click)="cancelEditTenant()">
                        Cancel
                      </app-button>
                      <app-button type="submit" variant="primary" [disabled]="isActionPending()">
                        {{ isActionPending() ? 'Saving...' : 'Save' }}
                      </app-button>
                    </div>
                  </form>
                } @else {
                  <dl class="profile-list">
                    <div>
                      <dt>Tenant Code</dt>
                      <dd>{{ data.code }}</dd>
                    </div>
                    <div>
                      <dt>Operating Mode</dt>
                      <dd>{{ data.operatingMode }}</dd>
                    </div>
                    <div>
                      <dt>Business Type</dt>
                      <dd>{{ data.businessType || '—' }}</dd>
                    </div>
                    <div>
                      <dt>Base Currency</dt>
                      <dd>{{ data.baseCurrency }}</dd>
                    </div>
                    <div>
                      <dt>Timezone</dt>
                      <dd>{{ data.defaultTimezone }}</dd>
                    </div>
                    <div>
                      <dt>Locale</dt>
                      <dd>{{ data.defaultLocale }}</dd>
                    </div>
                    <div>
                      <dt>Created On</dt>
                      <dd>{{ data.createdOn | date: 'medium' }}</dd>
                    </div>
                    <div>
                      <dt>Last Activity</dt>
                      <dd>{{ data.lastActivityAt ? (data.lastActivityAt | date: 'medium') : '—' }}</dd>
                    </div>
                  </dl>
                }
              </section>

              @if (hasSubscriptionViewPermission()) {
                <section class="panel" aria-labelledby="subscription-heading">
                  <h2 id="subscription-heading">Subscription</h2>
                  @if (data.subscription) {
                    <dl class="profile-list">
                      <div>
                        <dt>Plan</dt>
                        <dd>{{ data.subscription.planName }}</dd>
                      </div>
                      <div>
                        <dt>Plan Code</dt>
                        <dd>{{ data.subscription.planCode }}</dd>
                      </div>
                      <div>
                        <dt>Subscription Status</dt>
                        <dd>{{ data.subscription.subscriptionStatus }}</dd>
                      </div>
                    </dl>
                  } @else {
                    <p class="muted">No subscription plan is assigned to this tenant.</p>
                  }
                </section>
              }

              <section class="panel" aria-labelledby="entitlements-heading">
                <div class="panel-heading">
                  <h2 id="entitlements-heading">Entitlements</h2>
                  @if (data.canManageEntitlements && canManageEntitlements()) {
                    <div class="panel-actions">
                      <app-button variant="secondary" size="compact" (click)="openEntitlementEditor()">
                        Edit Entitlements
                      </app-button>
                      <app-button variant="secondary" size="compact" (click)="confirmRestoreToPlan()">
                        Restore to Plan Baseline
                      </app-button>
                    </div>
                  }
                </div>
                <p class="section-note">Authoritative feature entitlements returned by the backend.</p>
                @if (entitlementOptions(); as options) {
                  <div class="catalog-modules-list">
                    @for (module of options.catalogModules; track module.id) {
                      <div class="module-group">
                        <h3 class="module-title">{{ module.name }}</h3>
                        <ul class="feature-catalog-list">
                          @for (feature of module.features; track feature.id) {
                            <li class="feature-card">
                              <div class="feature-info">
                                <div class="feature-header">
                                  <strong>{{ feature.name }}</strong>
                                  <code class="feature-code">{{ feature.code }}</code>
                                </div>
                                @if (feature.description) {
                                  <p class="feature-desc">{{ feature.description }}</p>
                                }
                                @if (feature.overrideReason || feature.effectiveFrom || feature.effectiveUntil) {
                                  <div class="override-meta-note">
                                    @if (feature.overrideReason) {
                                      <span><strong>Reason:</strong> {{ feature.overrideReason }}</span>
                                    }
                                    @if (feature.effectiveFrom) {
                                      <span><strong>From:</strong> {{ feature.effectiveFrom | date: 'short' }}</span>
                                    }
                                    @if (feature.effectiveUntil) {
                                      <span><strong>Until:</strong> {{ feature.effectiveUntil | date: 'short' }}</span>
                                    }
                                  </div>
                                }
                              </div>
                              <div class="feature-badges">
                                <span class="badge" [class.badge-success]="feature.planIncluded" [class.badge-secondary]="!feature.planIncluded">
                                  {{ feature.planIncluded ? 'Included in Plan' : 'Not in Plan' }}
                                </span>
                                @if (feature.isOverridden) {
                                  <span class="badge badge-warning">Overridden</span>
                                }
                                <span class="badge badge-info">{{ feature.sourceType || 'PLAN' }}</span>
                                <span class="badge" [class.badge-success]="data.enabledFeatureCodes.includes(feature.code)" [class.badge-danger]="!data.enabledFeatureCodes.includes(feature.code)">
                                  {{ data.enabledFeatureCodes.includes(feature.code) ? 'Enabled' : 'Disabled' }}
                                </span>
                              </div>
                            </li>
                          }
                        </ul>
                      </div>
                    }
                  </div>
                } @else if (data.enabledFeatureCodes.length) {
                  <ul class="feature-list">
                    @for (code of data.enabledFeatureCodes; track code) {
                      <li>
                        <span>{{ featureLabelForCode(code) }}</span>
                        <code class="feature-code">{{ code }}</code>
                        <span class="badge badge-success">Enabled</span>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="muted">No features are enabled for this tenant.</p>
                }
              </section>
            </div>
          </div>
        } @else if (activeTab() === 'audit') {
          <section id="panel-audit" class="audit-panel" role="tabpanel" aria-labelledby="tab-audit">
            <h2 id="audit-heading">Audit History</h2>
            @if (auditLogsLoading()) {
              <div class="skeleton-wrap" aria-busy="true" aria-label="Loading audit history">
                <app-loading-skeleton [rows]="4" />
              </div>
            } @else if (auditLogsError()) {
              <app-error-state
                title="Audit logs could not be loaded"
                [message]="auditLogsError()!"
                [hasRetry]="true"
                (retry)="loadAuditLogs()"
              />
            } @else if (auditLogs(); as logData) {
              @if (logData.items.length) {
                <div class="data-table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th scope="col">Timestamp</th>
                        <th scope="col">Actor</th>
                        <th scope="col">Action</th>
                        <th scope="col">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (log of logData.items; track log.id) {
                        <tr>
                          <td>{{ log.occurredAt | date: 'medium' }}</td>
                          <td>{{ log.actor.email || log.actor.platformUserId || 'System' }}</td>
                          <td><code>{{ log.action }}</code></td>
                          <td>{{ log.summary }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <footer class="pagination">
                  <span class="range-label">Page {{ logData.pageNumber }} of {{ logData.totalPages || 1 }}</span>
                  <div class="pagination-controls">
                    <app-button
                      variant="secondary"
                      size="compact"
                      [disabled]="logData.pageNumber <= 1"
                      (click)="changeAuditPage(logData.pageNumber - 1)"
                    >
                      Previous
                    </app-button>
                    <app-button
                      variant="secondary"
                      size="compact"
                      [disabled]="logData.pageNumber >= logData.totalPages"
                      (click)="changeAuditPage(logData.pageNumber + 1)"
                    >
                      Next
                    </app-button>
                  </div>
                </footer>
              } @else {
                <app-empty-state title="No audit history" message="No audit history recorded for this tenant." />
              }
            }
          </section>
        }
      }

      @if (editorOpen()) {
        <div class="editor-backdrop" (click)="closeEntitlementEditor()" role="presentation"></div>
        <aside class="editor-panel" role="dialog" aria-modal="true" aria-label="Edit tenant entitlements">
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
              <app-button variant="primary" (click)="openEntitlementEditor()">Try again</app-button>
            </div>
          } @else if (entitlementOptions(); as options) {
            @if (editorValidationError()) {
              <div class="editor-error" role="alert">{{ editorValidationError() }}</div>
            }
            @if (editorSaveError()) {
              <div class="editor-error" role="alert">{{ editorSaveError() }}</div>
            }
            @if (restoreError()) {
              <div class="editor-error" role="alert">{{ restoreError() }}</div>
            }

            @if (!options.plans.length) {
              <div class="editor-state empty">
                <strong>No active subscription plans available</strong>
                <span>Entitlement editing requires at least one active plan from the backend.</span>
              </div>
            } @else {
              <div class="editor-form">
                <app-form-field id="select-plan" label="Subscription Plan" [required]="true">
                  <select
                    id="select-plan"
                    [ngModel]="selectedPlanId()"
                    (ngModelChange)="onPlanChange($event)"
                    [disabled]="editorSaving() || isRestoring()"
                  >
                    @for (plan of options.plans; track plan.id) {
                      <option [value]="plan.id">{{ plan.name }} ({{ plan.code }})</option>
                    }
                  </select>
                </app-form-field>

                @if (selectedPlan(); as plan) {
                  <fieldset class="features-fieldset">
                    <legend>Feature Catalog & Custom Overrides</legend>
                    <p class="muted">Features can be enabled or disabled. Custom overrides beyond plan baseline require a reason.</p>
                    @if (!options.catalogModules.length) {
                      <p class="muted">No catalog modules returned from the backend.</p>
                    } @else {
                      @for (module of options.catalogModules; track module.id) {
                        <section class="module-block">
                          <h3>{{ module.name }}</h3>
                          <ul class="feature-options">
                            @for (feature of module.features; track feature.id) {
                              <li class="feature-editor-row">
                                <label class="feature-option-label">
                                  <input
                                    type="checkbox"
                                    [checked]="isFeatureEnabled(feature.id)"
                                    [disabled]="isFeatureDisabledInEditor(feature)"
                                    (change)="toggleFeature(feature, $event)"
                                  />
                                  <span class="feature-label">
                                    <strong>{{ feature.name }}</strong>
                                    <small>{{ feature.code }}</small>
                                  </span>
                                </label>
                                <div class="feature-badges">
                                  <span class="badge" [class.badge-success]="feature.planIncluded" [class.badge-secondary]="!feature.planIncluded">
                                    {{ feature.planIncluded ? 'Included in Plan' : 'Not in Plan' }}
                                  </span>
                                  @if (feature.isOverridden) {
                                    <span class="badge badge-warning">Overridden</span>
                                  }
                                  <span class="badge badge-info">{{ feature.sourceType || 'PLAN' }}</span>
                                </div>
                              </li>
                            }
                          </ul>
                        </section>
                      }
                    }
                  </fieldset>

                  <fieldset class="override-controls">
                    <legend>Override Configuration</legend>
                    <app-form-field id="override-reason" label="Override Reason" [required]="sourceType() === 'OVERRIDE'">
                      <textarea
                        id="override-reason"
                        rows="2"
                        [ngModel]="overrideReason()"
                        (ngModelChange)="overrideReason.set($event)"
                        [disabled]="editorSaving() || isRestoring()"
                        maxlength="500"
                        placeholder="Specify reason for custom entitlement override (required for OVERRIDE, max 500 characters)..."
                      ></textarea>
                    </app-form-field>

                    <div class="date-fields-grid">
                      <app-form-field id="effective-from" label="Effective From">
                        <input
                          type="datetime-local"
                          id="effective-from"
                          [ngModel]="effectiveFrom()"
                          (ngModelChange)="effectiveFrom.set($event)"
                          [disabled]="editorSaving() || isRestoring()"
                        />
                      </app-form-field>

                      <app-form-field id="effective-until" label="Effective Until (Optional)">
                        <input
                          type="datetime-local"
                          id="effective-until"
                          [ngModel]="effectiveUntil()"
                          (ngModelChange)="effectiveUntil.set($event)"
                          [disabled]="editorSaving() || isRestoring()"
                        />
                      </app-form-field>
                    </div>
                  </fieldset>
                }

                <footer class="editor-actions">
                  <app-button
                    variant="secondary"
                    [disabled]="editorSaving() || isRestoring()"
                    (click)="confirmRestoreToPlan()"
                  >
                    Restore to Plan Baseline
                  </app-button>
                  <app-button
                    variant="secondary"
                    [disabled]="editorSaving() || isRestoring()"
                    (click)="closeEntitlementEditor()"
                  >
                    Cancel
                  </app-button>
                  <app-button
                    variant="primary"
                    [disabled]="editorSaving() || isRestoring()"
                    (click)="saveEntitlements()"
                  >
                    {{ editorSaving() ? 'Saving...' : 'Save Entitlements' }}
                  </app-button>
                </footer>
              </div>
            }
          }
        </aside>
      }

      <app-confirmation-dialog
        [isOpen]="isRestoreConfirmOpen()"
        title="Restore Entitlements to Plan Baseline"
        message="Are you sure you want to restore tenant entitlements to the current subscription plan baseline? All custom tenant overrides will be removed. Add-on entitlements are preserved."
        confirmLabel="Restore Baseline"
        cancelLabel="Cancel"
        loadingLabel="Restoring..."
        variant="default"
        [isLoading]="isRestoring()"
        (confirm)="onRestoreConfirmed()"
        (cancel)="onRestoreCancelled()"
      />

      <app-confirmation-dialog
        [isOpen]="isConfirmDialogOpen()"
        title="Suspend Tenant"
        message="Are you sure you want to suspend this tenant? This will disable outlet operations and suspend subscription billing."
        confirmLabel="Suspend"
        cancelLabel="Cancel"
        loadingLabel="Suspending..."
        variant="destructive"
        [isLoading]="isActionPending() && isConfirmDialogOpen()"
        (confirm)="onSuspendConfirmed()"
        (cancel)="onSuspendCancelled()"
      />
    </section>
  `,
  styles: `
    :host { color: var(--text-primary); display: block; }

    .panel-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .catalog-modules-list,
    .module-group,
    .feature-catalog-list {
      display: grid;
      gap: 0.5rem;
    }

    .module-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0.5rem 0 0.25rem 0;
    }

    .feature-catalog-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .feature-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.6rem 0.8rem;
      background: var(--bg-subtle, #f9fafb);
      border: 1px solid var(--border-subtle, #e5e7eb);
      border-radius: 6px;
      gap: 1rem;
    }

    .feature-info {
      display: grid;
      gap: 0.2rem;
    }

    .feature-header {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .feature-desc {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .override-meta-note {
      display: flex;
      gap: 0.8rem;
      font-size: 0.75rem;
      color: var(--text-muted, #6b7280);
      margin-top: 0.2rem;
    }

    .feature-badges {
      display: flex;
      gap: 0.35rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .badge {
      display: inline-block;
      padding: 0.15rem 0.45rem;
      font-size: 0.72rem;
      font-weight: 600;
      border-radius: 4px;
      line-height: 1.2;
    }

    .badge-success {
      background-color: #d1fae5;
      color: #065f46;
    }

    .badge-secondary {
      background-color: #f3f4f6;
      color: #374151;
    }

    .badge-warning {
      background-color: #fef3c7;
      color: #92400e;
    }

    .badge-info {
      background-color: #e0e7ff;
      color: #3730a3;
    }

    .badge-danger {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .feature-editor-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.4rem 0.5rem;
      border-bottom: 1px solid var(--border-subtle, #f3f4f6);
    }

    .feature-option-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .override-controls {
      display: grid;
      gap: 0.8rem;
      padding: 0.8rem 1rem;
      border: 1px dashed var(--border-subtle, #cbd5e1);
      border-radius: 6px;
      background: var(--bg-subtle, #f8fafc);
      margin-top: 0.5rem;
    }

    .date-fields-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.8rem;
    }

    .tenant-detail-page,
    .setup-section,
    .panel,
    .edit-form,
    .audit-panel,
    .editor-form,
    .editor-state,
    .features-fieldset,
    .checklist-list,
    .feature-list,
    .feature-options,
    .feature-label,
    .profile-list,
    .profile-list div,
    .summary-card {
      display: grid;
    }

    .tenant-detail-page { gap: var(--space-5); }
    .setup-section,
    .panel,
    .edit-form,
    .features-fieldset { gap: var(--space-3); }
    .audit-panel,
    .editor-form,
    .editor-state { gap: var(--space-4); }
    .checklist-list,
    .feature-list,
    .feature-options {
      gap: var(--space-2);
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .feature-label { gap: 0.15rem; }
    .profile-list { gap: var(--space-3); margin: 0; }
    .profile-list div { gap: 0.2rem; }
    .summary-card { gap: 0.35rem; padding: 0.85rem 1rem; }

    .header-meta,
    .header-actions,
    .setup-header,
    .panel-heading,
    .edit-actions,
    .pagination,
    .pagination-controls,
    .editor-header,
    .editor-actions,
    .checklist-list li,
    .feature-list li,
    .feature-options label {
      display: flex;
      gap: var(--space-2);
    }

    .header-meta,
    .header-actions,
    .pagination {
      align-items: center;
      flex-wrap: wrap;
    }

    .setup-header,
    .editor-header {
      align-items: flex-start;
      gap: var(--space-4);
      justify-content: space-between;
    }

    .panel-heading {
      align-items: center;
      gap: var(--space-3);
      justify-content: space-between;
    }

    .edit-actions,
    .editor-actions { justify-content: flex-end; }
    .pagination { gap: var(--space-3); justify-content: space-between; }
    .edit-actions { margin-top: var(--space-1); }
    .editor-actions { gap: var(--space-3); padding-top: var(--space-2); }

    .setup-section {
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: var(--space-5);
    }

    .setup-header h2,
    .panel h2,
    .audit-panel h2,
    .editor-header h2,
    .features-fieldset legend {
      color: var(--text-primary);
      font-weight: 700;
      margin: 0;
    }
    .setup-header h2,
    .panel h2,
    .audit-panel h2 { font-size: 1rem; }
    .editor-header h2 { font-size: 1.1rem; }

    .editor-header p,
    .section-note,
    .muted,
    .range-label,
    .module-block h3,
    .editor-state {
      color: var(--text-secondary);
      font-size: 0.82rem;
      margin: 0;
    }
    .editor-header p { margin-top: var(--space-1); }
    .module-block h3 { margin-bottom: var(--space-2); }
    .editor-state {
      padding: var(--space-4) 0;
      text-align: center;
    }
    .editor-state.error { color: var(--status-danger); }
    .editor-state.empty { color: var(--text-muted); }

    .progress-percent {
      color: var(--primary);
      font-size: 1.25rem;
    }

    .setup-columns,
    .summary-grid,
    .detail-grid {
      display: grid;
      gap: var(--space-5);
    }
    .setup-columns { grid-template-columns: 1fr 1fr; }
    .summary-grid {
      gap: var(--space-3);
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .detail-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin-top: var(--space-2);
    }

    .setup-columns h3,
    .summary-card .label,
    .profile-list dt {
      color: var(--text-muted);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .setup-columns h3 { margin: 0 0 var(--space-2); }

    .checklist-list li {
      align-items: center;
      font-size: 0.875rem;
    }
    .checklist-list.completed li { color: var(--status-success-text); }
    .checklist-list.missing li { color: var(--status-danger-text); }

    .check-icon,
    .cross-icon {
      fill: none;
      height: 1rem;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2.5;
      width: 1rem;
    }

    .checklist-muted {
      color: var(--text-disabled);
      font-size: 0.875rem;
    }

    .continue-link {
      align-items: center;
      background: var(--primary);
      border-radius: var(--radius-md);
      color: var(--text-inverse);
      display: inline-flex;
      font-size: 0.875rem;
      font-weight: 600;
      margin-top: var(--space-1);
      min-height: var(--control-height-compact);
      padding: 0 var(--space-4);
      text-decoration: none;
    }

    .continue-link:focus-visible,
    .tab-btn:focus-visible,
    .icon-close:focus-visible {
      box-shadow: var(--shadow-focus);
      outline: none;
    }

    .summary-card,
    .feature-list li {
      background: var(--bg-surface-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
    }

    .summary-val {
      color: var(--text-primary);
      font-size: 1.2rem;
    }

    .panel {
      border-top: 1px solid var(--border-subtle);
      padding-top: var(--space-4);
    }

    .profile-list dd {
      color: var(--text-secondary);
      font-size: 0.88rem;
      margin: 0;
    }

    .inline-error,
    .editor-error,
    .toast {
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      font-size: 0.82rem;
      margin: 0;
      padding: 0.7rem 0.85rem;
    }
    .inline-error,
    .editor-error {
      background: var(--status-danger-bg);
      color: var(--status-danger-text);
    }
    .toast {
      background: var(--status-success-bg);
      color: var(--status-success-text);
      font-weight: 700;
    }

    .feature-list li {
      align-items: center;
      justify-content: space-between;
      padding: 0.7rem 0.85rem;
    }
    .feature-list span {
      color: var(--text-primary);
      font-size: 0.84rem;
      font-weight: 600;
    }
    .feature-code {
      background: var(--bg-surface-primary);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 0.72rem;
      padding: 0.2rem 0.45rem;
    }

    .detail-tabs {
      border-bottom: 1px solid var(--border-default);
      display: flex;
      gap: var(--space-1);
    }
    .tab-btn {
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 600;
      padding: var(--space-3) var(--space-4);
    }
    .tab-btn:hover { color: var(--text-primary); }
    .tab-btn.active {
      border-bottom-color: var(--primary);
      color: var(--primary);
    }

    .audit-panel .data-table-container { overflow-x: auto; }
    .audit-panel .data-table { min-width: 40rem; }

    .editor-backdrop {
      background: rgba(16, 24, 40, 0.45);
      inset: 0;
      position: fixed;
      z-index: 40;
    }
    .editor-panel {
      background: var(--bg-surface-primary);
      border-left: 1px solid var(--border-default);
      display: grid;
      gap: var(--space-4);
      inset: 0 0 0 auto;
      max-width: 32rem;
      overflow-y: auto;
      padding: var(--space-5);
      position: fixed;
      width: min(100%, 32rem);
      z-index: 50;
    }

    .icon-close {
      background: transparent;
      border: 0;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 1.5rem;
      line-height: 1;
      padding: 0;
    }

    .features-fieldset {
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      margin: 0;
      padding: var(--space-3);
    }
    .features-fieldset legend {
      font-size: 0.88rem;
      padding: 0 var(--space-1);
    }

    .feature-options li.disabled { opacity: 0.45; }
    .feature-options label {
      align-items: flex-start;
      cursor: pointer;
    }
    .feature-label strong {
      color: var(--text-secondary);
      font-size: 0.84rem;
    }
    .feature-label small {
      color: var(--text-muted);
      font-size: 0.72rem;
    }

    @media (max-width: 1100px) {
      .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .detail-grid { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 760px) {
      .summary-grid,
      .detail-grid,
      .setup-columns { grid-template-columns: 1fr; }
      .editor-panel { max-width: 100%; width: 100%; }
    }
  `
})
export class PlatformTenantDetailPage {
  private readonly api = inject(PlatformTenantApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly accessControl = inject(AccessControlService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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

  readonly isConfirmDialogOpen = signal(false);

  readonly hasSubscriptionViewPermission = computed(() =>
    this.accessControl.hasPermission(platformPermissions.tenantSubscriptionsView)
  );
  readonly hasBillingViewPermission = computed(() =>
    this.accessControl.hasPermission(platformPermissions.billingView)
  );
  readonly hasAuditViewPermission = computed(() =>
    this.accessControl.hasPermission(platformPermissions.auditView)
  );

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const tenant = this.tenant();
    return [
      { label: 'Tenants', path: '/admin/tenants' },
      { label: tenant?.name || 'Detail' }
    ];
  });

  readonly headerDescription = computed(() => {
    const tenant = this.tenant();
    if (!tenant) {
      return 'Loading tenant profile...';
    }

    return `${tenant.code} · ${tenant.operatingMode}`;
  });

  readonly activeTab = signal<'details' | 'audit'>('details');
  readonly auditLogs = signal<PlatformTenantAuditLogListResponse | null>(null);
  readonly auditLogsLoading = signal(false);
  readonly auditLogsError = signal<string | null>(null);
  readonly auditPageNumber = signal(1);

  readonly isConflictError = computed(() => {
    const err = (this.actionError() ?? '').toLowerCase();
    return err.includes('conflict') || err.includes('another user') || err.includes('stale');
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
  readonly overrideReason = signal('');
  readonly effectiveFrom = signal('');
  readonly effectiveUntil = signal('');
  readonly sourceType = signal('OVERRIDE');
  readonly isRestoreConfirmOpen = signal(false);
  readonly isRestoring = signal(false);
  readonly restoreError = signal<string | null>(null);

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
          this.loadEntitlementOptionsSilently(tenant.id);
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
        this.loadEntitlementOptionsSilently(tenant.id);
      },
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  private loadEntitlementOptionsSilently(tenantId: string): void {
    this.api.getEntitlementOptions(tenantId)?.subscribe({
      next: (options) => {
        this.entitlementOptions.set(options);
        this.cacheFeatureNames(options);
      },
      error: () => {
        // Silently ignore background catalog load errors for main detail display
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
    this.restoreError.set(null);
    this.entitlementOptions.set(null);

    this.api.getEntitlementOptions(tenantId).subscribe({
      next: (options) => {
        this.entitlementOptions.set(options);
        this.selectedPlanId.set(options.currentSubscriptionPlanId ?? options.plans[0]?.id ?? '');
        this.selectedFeatureIds.set([...options.enabledFeatureIds]);
        this.cacheFeatureNames(options);
        this.hydrateExistingOverrideMetadata(options);
        this.editorLoading.set(false);
      },
      error: (error) => {
        this.editorError.set(this.apiError.toSafeMessage(error));
        this.editorLoading.set(false);
      }
    });
  }

  private hydrateExistingOverrideMetadata(options: PlatformTenantEntitlementOptions): void {
    let existingReason = '';
    let existingFrom = '';
    let existingUntil = '';
    let existingSourceType = 'OVERRIDE';

    for (const module of options.catalogModules) {
      for (const feature of module.features) {
        if (feature.overrideReason) {
          existingReason = feature.overrideReason;
        }
        if (feature.effectiveFrom) {
          existingFrom = this.toDatetimeLocalFormat(feature.effectiveFrom);
        }
        if (feature.effectiveUntil) {
          existingUntil = this.toDatetimeLocalFormat(feature.effectiveUntil);
        }
        if (feature.sourceType) {
          existingSourceType = feature.sourceType;
        }
      }
    }

    this.overrideReason.set(existingReason);
    this.effectiveFrom.set(existingFrom);
    this.effectiveUntil.set(existingUntil);
    this.sourceType.set(existingSourceType === 'MANUAL' ? 'MANUAL' : 'OVERRIDE');
  }

  private toDatetimeLocalFormat(dateIso: string): string {
    try {
      const date = new Date(dateIso);
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  }

  closeEntitlementEditor(): void {
    if (this.editorSaving() || this.isRestoring()) {
      return;
    }

    this.editorOpen.set(false);
    this.editorLoading.set(false);
    this.editorError.set(null);
    this.editorSaveError.set(null);
    this.editorValidationError.set(null);
    this.restoreError.set(null);
    this.selectedPlanId.set('');
    this.selectedFeatureIds.set([]);
    this.overrideReason.set('');
    this.effectiveFrom.set('');
    this.effectiveUntil.set('');
    this.sourceType.set('OVERRIDE');
  }

  onPlanChange(planId: string): void {
    this.selectedPlanId.set(planId);
    this.editorValidationError.set(null);
  }

  isFeatureAllowed(
    _feature: PlatformTenantEntitlementCatalogFeature,
    _plan: PlatformTenantEntitlementPlanOption
  ): boolean {
    return true;
  }

  isFeatureEnabled(featureId: string): boolean {
    return this.selectedFeatureIds().includes(featureId);
  }

  isFeatureDisabledInEditor(feature: PlatformTenantEntitlementCatalogFeature): boolean {
    return feature.sourceType === 'ADDON' || this.editorSaving() || this.isRestoring();
  }

  toggleFeature(feature: PlatformTenantEntitlementCatalogFeature, event: Event): void {
    if (feature.sourceType === 'ADDON') {
      return;
    }
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      this.selectedFeatureIds.update((items) => (items.includes(feature.id) ? items : [...items, feature.id]));
    } else {
      this.selectedFeatureIds.update((items) => items.filter((id) => id !== feature.id));
    }
    this.editorValidationError.set(null);
  }

  saveEntitlements(): void {
    if (this.editorSaving() || this.isRestoring()) {
      return;
    }

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

    const currentSource = this.sourceType();
    const reason = this.overrideReason().trim();
    if (currentSource === 'OVERRIDE' && !reason) {
      this.editorValidationError.set('Override reason is required when custom overrides are applied (max 500 characters).');
      return;
    }

    if (reason.length > 500) {
      this.editorValidationError.set('Override reason cannot exceed 500 characters.');
      return;
    }

    const fromVal = this.effectiveFrom() ? new Date(this.effectiveFrom()).toISOString() : null;
    const untilVal = this.effectiveUntil() ? new Date(this.effectiveUntil()).toISOString() : null;

    if (fromVal && untilVal && new Date(untilVal) <= new Date(fromVal)) {
      this.editorValidationError.set('Effective Until date must be strictly after Effective From date.');
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
        enabledFeatureCodes,
        sourceType: currentSource,
        overrideReason: reason || undefined,
        effectiveFrom: fromVal,
        effectiveUntil: untilVal,
        concurrencyVersion: this.tenant()?.concurrencyVersion ?? undefined
      })
      .subscribe({
        next: (tenant) => {
          this.tenant.set(tenant);
          this.cacheFeatureNamesFromCodes(tenant.enabledFeatureCodes, options);
          this.editorSaving.set(false);
          this.closeEntitlementEditor();
          this.successMessage.set('Tenant entitlements updated successfully.');
          this.loadEntitlementOptionsSilently(tenant.id);
        },
        error: (error) => {
          this.editorSaveError.set(this.apiError.toSafeMessage(error));
          this.editorSaving.set(false);
        }
      });
  }

  confirmRestoreToPlan(): void {
    if (this.isRestoring() || this.editorSaving()) {
      return;
    }
    this.isRestoreConfirmOpen.set(true);
    this.restoreError.set(null);
  }

  onRestoreCancelled(): void {
    if (this.isRestoring()) {
      return;
    }
    this.isRestoreConfirmOpen.set(false);
    this.restoreError.set(null);
  }

  onRestoreConfirmed(): void {
    if (this.isRestoring() || this.editorSaving()) {
      return;
    }
    const tenantId = this.route.snapshot.paramMap.get('tenantId');
    if (!tenantId) {
      return;
    }

    this.isRestoring.set(true);
    this.restoreError.set(null);
    this.actionError.set(null);

    this.api.restoreEntitlementsToPlan(tenantId).subscribe({
      next: (tenant) => {
        this.tenant.set(tenant);
        this.isRestoring.set(false);
        this.isRestoreConfirmOpen.set(false);
        if (this.editorOpen()) {
          this.closeEntitlementEditor();
        }
        this.successMessage.set('Tenant entitlements restored to plan baseline successfully.');
        this.loadEntitlementOptionsSilently(tenant.id);
      },
      error: (error) => {
        this.isRestoring.set(false);
        const safeMsg = this.apiError.toSafeMessage(error);
        this.restoreError.set(safeMsg);
        if (!this.isRestoreConfirmOpen()) {
          this.actionError.set(safeMsg);
        }
      }
    });
  }

  featureLabelForCode(code: string): string {
    return this.featureNameByCode().get(code) ?? code;
  }

  activateTenant(): void {
    this.runLifecycleAction('activate');
  }

  reactivateTenant(): void {
    this.runLifecycleAction('reactivate');
  }

  suspendTenant(): void {
    this.runLifecycleAction('suspend');
  }

  confirmSuspend(): void {
    this.isConfirmDialogOpen.set(true);
  }

  onSuspendConfirmed(): void {
    this.suspendTenant();
  }

  onSuspendCancelled(): void {
    if (this.isActionPending()) {
      return;
    }

    this.isConfirmDialogOpen.set(false);
  }

  showActivate(tenant: PlatformTenantDetail): boolean {
    if (!tenant.canActivate || !this.canActivate()) {
      return false;
    }

    const lifecycle = resolveTenantLifecycle({
      lifecycleStatus: tenant.lifecycleStatus,
      status: tenant.status
    }).value;

    if (
      lifecycle === TenantLifecycleStatuses.PendingPayment
      || lifecycle === TenantLifecycleStatuses.Active
      || lifecycle === TenantLifecycleStatuses.Cancelled
      || lifecycle === TenantLifecycleStatuses.Suspended
    ) {
      return false;
    }

    return true;
  }

  showReactivate(tenant: PlatformTenantDetail): boolean {
    const lifecycle = resolveTenantLifecycle({
      lifecycleStatus: tenant.lifecycleStatus,
      status: tenant.status
    }).value;

    return (lifecycle === TenantLifecycleStatuses.Suspended || tenant.status === 'SUSPENDED') && this.canActivate();
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

  canConfigureTenant(): boolean {
    return (
      this.accessControl.hasPermission(platformPermissions.tenantsView) &&
      this.accessControl.hasPermission(platformPermissions.tenantsBootstrapAccess)
    );
  }

  configureTenant(tenant: PlatformTenantDetail): void {
    this.tenantContext.setSelectedTenant({
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantCode: tenant.code,
      status: tenant.lifecycleStatus || tenant.status,
      planName: tenant.subscription?.planName
    });
    void this.router.navigate(['/admin/tenants', tenant.id, 'configure']);
  }

  switchTab(tab: 'details' | 'audit'): void {
    this.activeTab.set(tab);
    if (tab === 'audit' && !this.auditLogs()) {
      this.loadAuditLogs();
    }
  }

  loadAuditLogs(): void {
    const tenantId = this.route.snapshot.paramMap.get('tenantId');
    if (!tenantId) {
      return;
    }

    this.auditLogsLoading.set(true);
    this.auditLogsError.set(null);

    this.api.getTenantAuditLogs(tenantId, this.auditPageNumber(), 10).subscribe({
      next: (response) => {
        this.auditLogs.set(response.data);
        this.auditLogsLoading.set(false);
      },
      error: (error) => {
        this.auditLogsError.set(this.apiError.toSafeMessage(error));
        this.auditLogsLoading.set(false);
      }
    });
  }

  changeAuditPage(page: number): void {
    this.auditPageNumber.set(page);
    this.loadAuditLogs();
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
    this.actionError.set(null);
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

    const payload: UpdatePlatformTenantRequest = {
      ...this.editDraft(),
      concurrencyVersion: tenant.concurrencyVersion ?? undefined
    };

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

  mapStatusVariant(badgeClass: string): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
    switch (badgeClass) {
      case 'active':
        return 'success';
      case 'pending_activation':
      case 'draft':
        return 'info';
      case 'suspended':
      case 'pending_payment':
        return 'warning';
      case 'cancelled':
        return 'danger';
      default:
        return 'neutral';
    }
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

  private runLifecycleAction(action: 'activate' | 'suspend' | 'reactivate'): void {
    const tenantId = this.route.snapshot.paramMap.get('tenantId');
    const current = this.tenant();
    if (!tenantId || !current) {
      return;
    }

    if (action === 'activate' && !this.showActivate(current)) {
      return;
    }

    if (action === 'reactivate' && !this.showReactivate(current)) {
      return;
    }

    if (action === 'suspend' && !this.showSuspend(current)) {
      return;
    }

    this.isActionPending.set(true);
    this.actionError.set(null);
    this.successMessage.set(null);

    const request$ = action === 'activate'
      ? this.api.activateTenant(tenantId)
      : action === 'reactivate'
        ? this.api.reactivateTenant(tenantId)
        : this.api.suspendTenant(tenantId);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (tenant) => {
        this.tenant.set(tenant);
        this.isActionPending.set(false);
        this.isConfirmDialogOpen.set(false);
        this.successMessage.set(
          action === 'activate'
            ? 'Tenant activated successfully.'
            : action === 'reactivate'
              ? 'Tenant reactivated successfully.'
              : 'Tenant suspended successfully.'
        );
      },
      error: (error) => {
        this.isActionPending.set(false);
        this.isConfirmDialogOpen.set(false);
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
