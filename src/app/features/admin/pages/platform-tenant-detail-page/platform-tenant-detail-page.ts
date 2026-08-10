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
                    <app-button variant="secondary" size="compact" (click)="openEntitlementEditor()">
                      Edit Entitlements
                    </app-button>
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
                    [disabled]="editorSaving()"
                  >
                    @for (plan of options.plans; track plan.id) {
                      <option [value]="plan.id">{{ plan.name }} ({{ plan.code }})</option>
                    }
                  </select>
                </app-form-field>

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
                  <app-button variant="secondary" [disabled]="editorSaving()" (click)="closeEntitlementEditor()">
                    Cancel
                  </app-button>
                  <app-button variant="primary" [disabled]="editorSaving()" (click)="saveEntitlements()">
                    {{ editorSaving() ? 'Saving...' : 'Save Entitlements' }}
                  </app-button>
                </footer>
              </div>
            }
          }
        </aside>
      }

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
    :host {
      color: var(--text-primary, #0f172a);
      display: block;
    }

    * {
      box-sizing: border-box;
    }

    .tenant-detail-page {
      display: grid;
      gap: var(--space-5, 1.5rem);
    }

    .header-meta,
    .header-actions {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2, 0.5rem);
    }

    .skeleton-wrap {
      padding: var(--space-2, 0.5rem) 0;
    }

    .setup-section {
      border-bottom: 1px solid var(--border-subtle, #f1f5f9);
      display: grid;
      gap: var(--space-3, 0.75rem);
      padding-bottom: var(--space-5, 1.5rem);
    }

    .setup-header {
      align-items: flex-start;
      display: flex;
      gap: var(--space-4, 1rem);
      justify-content: space-between;
    }

    .setup-header h2,
    .panel h2,
    .audit-panel h2 {
      color: var(--text-primary, #0f172a);
      font-size: 1rem;
      font-weight: 700;
      margin: 0;
    }

    .progress-percent {
      color: var(--primary, #0b5cff);
      font-size: 1.25rem;
      line-height: 1;
    }

    .setup-columns {
      display: grid;
      gap: var(--space-5, 1.5rem);
      grid-template-columns: 1fr 1fr;
    }

    .setup-columns h3 {
      color: var(--text-muted, #64748b);
      font-size: 0.75rem;
      letter-spacing: 0.05em;
      margin: 0 0 var(--space-2, 0.5rem);
      text-transform: uppercase;
    }

    .checklist-list {
      display: grid;
      gap: var(--space-2, 0.5rem);
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .checklist-list li {
      align-items: center;
      display: flex;
      font-size: 0.875rem;
      gap: var(--space-2, 0.5rem);
    }

    .checklist-list.completed li {
      color: var(--status-success-text, #047857);
    }

    .checklist-list.missing li {
      color: var(--status-danger-text, #b91c1c);
    }

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
      color: var(--text-disabled, #94a3b8);
      font-size: 0.875rem;
    }

    .setup-cta {
      margin-top: var(--space-1, 0.25rem);
    }

    .continue-link {
      align-items: center;
      background: var(--primary, #0b5cff);
      border-radius: var(--radius-md, 8px);
      color: var(--text-inverse, #fff);
      display: inline-flex;
      font-size: 0.875rem;
      font-weight: 600;
      min-height: var(--control-height-compact, 2rem);
      padding: 0 var(--space-4, 1rem);
      text-decoration: none;
    }

    .continue-link:focus-visible {
      box-shadow: var(--shadow-focus);
      outline: none;
    }

    .summary-grid {
      display: grid;
      gap: var(--space-3, 0.75rem);
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .summary-card {
      background: var(--bg-surface-secondary, #f8fafc);
      border: 1px solid var(--border-subtle, #f1f5f9);
      border-radius: var(--radius-md, 8px);
      display: grid;
      gap: 0.35rem;
      padding: 0.85rem 1rem;
    }

    .summary-card .label {
      color: var(--text-muted, #64748b);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .summary-val {
      color: var(--text-primary, #0f172a);
      font-size: 1.2rem;
    }

    .detail-grid {
      display: grid;
      gap: var(--space-5, 1.5rem);
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin-top: var(--space-2, 0.5rem);
    }

    .panel {
      border-top: 1px solid var(--border-subtle, #f1f5f9);
      display: grid;
      gap: var(--space-3, 0.75rem);
      padding-top: var(--space-4, 1rem);
    }

    .panel-heading {
      align-items: center;
      display: flex;
      gap: 0.75rem;
      justify-content: space-between;
    }

    .profile-list {
      display: grid;
      gap: 0.75rem;
      margin: 0;
    }

    .profile-list div {
      display: grid;
      gap: 0.2rem;
    }

    .profile-list dt {
      color: var(--text-muted, #64748b);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .profile-list dd {
      color: var(--text-secondary, #475569);
      font-size: 0.88rem;
      margin: 0;
    }

    .edit-form {
      display: grid;
      gap: var(--space-3, 0.75rem);
    }

    .edit-actions {
      display: flex;
      gap: var(--space-2, 0.5rem);
      justify-content: flex-end;
      margin-top: 0.25rem;
    }

    .inline-error {
      background: var(--status-danger-bg, #fef2f2);
      border: 1px solid var(--status-danger-border, #fecdca);
      border-radius: var(--radius-md, 8px);
      color: var(--status-danger-text, #b91c1c);
      font-size: 0.82rem;
      margin: 0;
      padding: 0.65rem 0.75rem;
    }

    .section-note,
    .muted {
      color: var(--text-secondary, #475569);
      font-size: 0.82rem;
      margin: 0;
    }

    .feature-list {
      display: grid;
      gap: var(--space-2, 0.5rem);
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .feature-list li {
      align-items: center;
      background: var(--bg-surface-secondary, #f8fafc);
      border: 1px solid var(--border-subtle, #f1f5f9);
      border-radius: var(--radius-md, 8px);
      display: flex;
      justify-content: space-between;
      padding: 0.7rem 0.85rem;
    }

    .feature-list span {
      color: var(--text-primary, #344054);
      font-size: 0.84rem;
      font-weight: 600;
    }

    .feature-code {
      background: var(--bg-surface-primary, #fff);
      border-radius: 6px;
      color: var(--text-secondary, #475569);
      font-size: 0.72rem;
      padding: 0.2rem 0.45rem;
    }

    .detail-tabs {
      border-bottom: 1px solid var(--border-default, #e2e8f0);
      display: flex;
      gap: var(--space-1, 0.25rem);
    }

    .tab-btn {
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-secondary, #475569);
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: -1px;
      padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
    }

    .tab-btn:hover {
      color: var(--text-primary, #0f172a);
    }

    .tab-btn.active {
      border-bottom-color: var(--primary, #0b5cff);
      color: var(--primary, #0b5cff);
    }

    .tab-btn:focus-visible {
      box-shadow: var(--shadow-focus);
      outline: none;
    }

    .toast {
      background: var(--status-success-bg, #ecfdf5);
      border: 1px solid var(--status-success-border, #bbf7d0);
      border-radius: var(--radius-md, 8px);
      color: var(--status-success-text, #047857);
      font-size: 0.84rem;
      font-weight: 700;
      padding: 0.75rem 1rem;
    }

    .audit-panel {
      display: grid;
      gap: var(--space-4, 1rem);
    }

    .data-table-container {
      overflow-x: auto;
    }

    .data-table {
      border-collapse: collapse;
      min-width: 40rem;
      width: 100%;
    }

    .data-table th,
    .data-table td {
      border-bottom: 1px solid var(--border-subtle, #f1f5f9);
      font-size: 0.84rem;
      padding: 0.75rem 0.5rem;
      text-align: left;
    }

    .data-table th {
      color: var(--text-muted, #64748b);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .data-table td {
      color: var(--text-secondary, #475569);
    }

    .pagination {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3, 0.75rem);
      justify-content: space-between;
    }

    .range-label {
      color: var(--text-muted, #64748b);
      font-size: 0.82rem;
    }

    .pagination-controls {
      display: flex;
      gap: var(--space-2, 0.5rem);
    }

    .editor-backdrop {
      background: rgba(16, 24, 40, 0.45);
      inset: 0;
      position: fixed;
      z-index: 40;
    }

    .editor-panel {
      background: var(--bg-surface-primary, #fff);
      border-left: 1px solid var(--border-default, #e2e8f0);
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
      color: var(--text-primary, #0f172a);
      font-size: 1.1rem;
      margin: 0;
    }

    .editor-header p {
      color: var(--text-secondary, #475569);
      font-size: 0.82rem;
      margin: 0.35rem 0 0;
    }

    .icon-close {
      background: transparent;
      border: 0;
      color: var(--text-secondary, #475569);
      cursor: pointer;
      font-size: 1.5rem;
      line-height: 1;
      padding: 0;
    }

    .icon-close:focus-visible {
      box-shadow: var(--shadow-focus);
      outline: none;
    }

    .editor-state {
      color: var(--text-secondary, #475569);
      display: grid;
      gap: 0.65rem;
      padding: 1rem 0;
      text-align: center;
    }

    .editor-state.error {
      color: var(--status-danger, #ef4444);
    }

    .editor-state.empty {
      color: var(--text-muted, #64748b);
    }

    .editor-error {
      background: var(--status-danger-bg, #fef2f2);
      border: 1px solid var(--status-danger-border, #fecdca);
      border-radius: var(--radius-md, 8px);
      color: var(--status-danger-text, #b91c1c);
      font-size: 0.82rem;
      padding: 0.75rem 0.85rem;
    }

    .editor-form {
      display: grid;
      gap: 1rem;
    }

    .features-fieldset {
      border: 1px solid var(--border-default, #e2e8f0);
      border-radius: var(--radius-md, 8px);
      display: grid;
      gap: 0.85rem;
      margin: 0;
      padding: 0.85rem;
    }

    .features-fieldset legend {
      color: var(--text-primary, #0f172a);
      font-size: 0.88rem;
      font-weight: 700;
      padding: 0 0.25rem;
    }

    .module-block h3 {
      color: var(--text-secondary, #475569);
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

    .feature-options li.disabled {
      opacity: 0.45;
    }

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

    .feature-label strong {
      color: var(--text-secondary, #475569);
      font-size: 0.84rem;
    }

    .feature-label small {
      color: var(--text-muted, #64748b);
      font-size: 0.72rem;
    }

    .editor-actions {
      display: flex;
      gap: var(--space-3, 0.75rem);
      justify-content: flex-end;
      padding-top: 0.5rem;
    }

    @media (max-width: 1100px) {
      .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .detail-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 760px) {
      .summary-grid,
      .detail-grid,
      .setup-columns {
        grid-template-columns: 1fr;
      }

      .editor-panel {
        max-width: 100%;
        width: 100%;
      }
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
        enabledFeatureCodes,
        concurrencyVersion: this.tenant()?.concurrencyVersion ?? undefined
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
