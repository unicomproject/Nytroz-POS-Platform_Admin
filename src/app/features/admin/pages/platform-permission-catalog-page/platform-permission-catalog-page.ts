import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { platformPermissions } from '../../../../core/config/permission-keys';
import {
  PermissionCatalogFeature,
  PermissionCatalogModule,
  PermissionCatalogPermission,
  PermissionCatalogScopeFilter,
  PermissionCatalogTreeResponse
} from '../../models/platform-permission-catalog.model';
import { PlatformRoleDetail, PlatformRoleSummary } from '../../models/platform-role-management.model';
import { PlatformPermissionCatalogApiService } from '../../services/platform-permission-catalog-api.service';
import { PlatformRoleManagementApiService } from '../../services/platform-role-management-api.service';

type ModuleFilter = '';
type GrantFilter = '' | 'granted' | 'not-granted';
type ActionFilter = '';
type PermissionMode = 'custom' | 'readOnly' | 'fullAccess';

interface FilteredPermissionCatalogModule extends PermissionCatalogModule {
  features: FilteredPermissionCatalogFeature[];
}

interface FilteredPermissionCatalogFeature extends PermissionCatalogFeature {
  permissions: PermissionCatalogPermission[];
}

interface RoleFormState {
  code: string;
  name: string;
  description: string;
  status: string;
}

interface RoleSnapshot {
  form: RoleFormState;
  permissionCodes: string[];
}

@Component({
  selector: 'app-platform-permission-catalog-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="roles-page">
      <header class="page-heading">
        <div>
          <h1>Roles & Permissions</h1>
          <p>Create and manage platform roles and assign permissions.</p>
        </div>
        @if (successMessage()) {
          <div class="toast success" role="status">{{ successMessage() }}</div>
        }
      </header>

      @if (isLoading()) {
        <section class="state-card loading" aria-busy="true">
          <div class="skeleton-row"></div>
          <div class="skeleton-row short"></div>
          <div class="skeleton-row"></div>
          <p>Loading roles and permissions...</p>
        </section>
      } @else if (loadError()) {
        <section class="state-card error">
          <strong>Roles & Permissions could not be loaded</strong>
          <span>{{ loadError() }}</span>
          <button type="button" (click)="loadPage()">Try again</button>
        </section>
      } @else {
        <section class="roles-layout">
          <aside class="panel roles-panel" aria-label="Platform roles">
            <div class="panel-heading">
              <div>
                <h2>Roles</h2>
                <p>{{ roles().length }} platform role{{ roles().length === 1 ? '' : 's' }}</p>
              </div>
              @if (canCreateRole()) {
                <button type="button" class="primary-button" (click)="startCreate()">+ Create Role</button>
              }
            </div>

            <label class="field search-field">
              <span>Search roles</span>
              <input
                type="search"
                placeholder="Search roles..."
                [ngModel]="roleSearch()"
                (ngModelChange)="roleSearch.set($event)"
              />
            </label>

            <div class="role-list">
              @if (!filteredRoles().length) {
                <div class="empty-inline">No roles match the current search.</div>
              }

              @for (role of filteredRoles(); track role.id) {
                <button
                  type="button"
                  class="role-card"
                  [class.selected]="selectedRoleId() === role.id && !isCreateMode()"
                  (click)="selectRole(role.id)"
                >
                  <span class="role-mark" [class.system]="role.isSystem"></span>
                  <span class="role-copy">
                    <strong>{{ role.name }}</strong>
                    <small>{{ role.assignedUserCount }} user{{ role.assignedUserCount === 1 ? '' : 's' }}</small>
                  </span>
                  <span class="role-meta">
                    @if (role.isSystem) {
                      <span class="status-chip system">System</span>
                    } @else {
                      <span class="status-chip" [class.inactive]="!isRoleActive(role.status)">{{ role.status }}</span>
                    }
                    <small>{{ role.permissionCount }} permissions</small>
                  </span>
                </button>
              }
            </div>
          </aside>

          <main class="panel editor-panel" aria-label="Role editor">
            <div class="panel-heading">
              <div>
                <h2>{{ isCreateMode() ? 'Create Role' : 'Edit Role' }}</h2>
                <p>{{ selectedRole()?.code || 'New platform role' }}</p>
              </div>
              @if (selectedRole()?.isSystem) {
                <span class="system-badge">System Role</span>
              }
            </div>

            @if (detailError()) {
              <div class="inline-error" role="alert">{{ detailError() }}</div>
            }

            <section class="role-form" aria-label="Role details">
              @if (isCreateMode()) {
                <label class="field">
                  <span>Role Code *</span>
                  <input
                    type="text"
                    [disabled]="isSaving()"
                    [ngModel]="form().code"
                    (ngModelChange)="updateForm('code', normalizeRoleCode($event))"
                    placeholder="support_admin"
                  />
                </label>
              }

              <label class="field">
                <span>Role Name *</span>
                <input
                  type="text"
                  [disabled]="formDisabled()"
                  [ngModel]="form().name"
                  (ngModelChange)="updateForm('name', $event)"
                  placeholder="Support Admin"
                />
              </label>

              <label class="field">
                <span>Status</span>
                <select [disabled]="formDisabled()" [ngModel]="form().status" (ngModelChange)="updateForm('status', $event)">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>

              <label class="field description-field">
                <span>Description</span>
                <textarea
                  rows="3"
                  [disabled]="formDisabled()"
                  [ngModel]="form().description"
                  (ngModelChange)="updateForm('description', $event)"
                  placeholder="Describe the role responsibilities."
                ></textarea>
              </label>
            </section>

            @if (selectedRole()?.isSystem) {
              <div class="notice">
                <strong>Protected system role</strong>
                <span>The backend protects system role details and permission assignments from updates.</span>
              </div>
            }

            <section class="summary-strip" aria-label="Role permission summary">
              <article>
                <span>Available Permissions</span>
                <strong>{{ allPermissions().length }}</strong>
              </article>
              <article>
                <span>Granted</span>
                <strong>{{ selectedPermissionCodes().size }}</strong>
              </article>
              <article>
                <span>Not Granted</span>
                <strong>{{ notGrantedCount() }}</strong>
              </article>
              <article>
                <span>Sensitive</span>
                <strong>{{ selectedSensitivePermissions().length }}</strong>
              </article>
              <article>
                <span>Assigned Users</span>
                <strong>{{ assignedUserCount() }}</strong>
              </article>
              <article class="dirty-summary" [class.active]="isDirty()">
                <span>Unsaved Changes</span>
                <strong>{{ changedPermissionCount() }}</strong>
              </article>
            </section>

            <section class="permission-mode" aria-label="Permission mode">
              <span>Permission Mode</span>
              <button
                type="button"
                [class.selected]="permissionMode() === 'custom'"
                [disabled]="permissionsDisabled()"
                (click)="setPermissionMode('custom')"
              >
                Custom Access
              </button>
              <button
                type="button"
                [class.selected]="permissionMode() === 'readOnly'"
                [disabled]="permissionsDisabled()"
                (click)="setPermissionMode('readOnly')"
              >
                Read Only
              </button>
              <button
                type="button"
                [class.selected]="permissionMode() === 'fullAccess'"
                [disabled]="permissionsDisabled()"
                (click)="setPermissionMode('fullAccess')"
              >
                Full Access
              </button>
            </section>

            <section class="toolbar" aria-label="Permission filters">
              <label class="field search-field">
                <span>Search permissions</span>
                <input
                  type="search"
                  placeholder="Search permissions by name or code..."
                  [ngModel]="permissionSearchInput()"
                  (ngModelChange)="onPermissionSearchChange($event)"
                />
              </label>

              <label class="field">
                <span>Module</span>
                <select [ngModel]="moduleFilter()" (ngModelChange)="onModuleChange($event)">
                  <option value="">All Modules</option>
                  @for (module of modules(); track module.id) {
                    <option [value]="module.code">{{ module.name }}</option>
                  }
                </select>
              </label>

              <label class="field">
                <span>Scope</span>
                <select [ngModel]="scopeFilter()" (ngModelChange)="onScopeChange($event)">
                  <option value="">All Scopes</option>
                  <option value="platform">Platform</option>
                  <option value="tenant">Tenant</option>
                  <option value="pos">POS</option>
                </select>
              </label>

              <label class="field">
                <span>Action</span>
                <select [ngModel]="actionFilter()" (ngModelChange)="onActionFilterChange($event)">
                  <option value="">All Actions</option>
                  @for (action of actionOptions(); track action) {
                    <option [value]="action">{{ action }}</option>
                  }
                </select>
              </label>

              <div class="toolbar-actions">
                <button type="button" (click)="expandAll()">Expand All</button>
                <button type="button" (click)="collapseAll()">Collapse All</button>
              </div>
            </section>

            @if (isDirty()) {
              <section class="dirty-banner" role="status">
                <span>You have changes that haven't been saved.</span>
                <button type="button" (click)="showPreview.set(true)">Review Summary</button>
              </section>
            }

            @if (!filteredModules().length) {
              <div class="state-card empty">
                <strong>No permissions match the current filters</strong>
                <span>Try clearing search, module, scope, or grant filters.</span>
              </div>
            } @else {
              <section class="catalog-tree" aria-label="Backend permission catalog tree">
                <div class="tree-header" aria-hidden="true">
                  <span>Permission</span>
                  <span>Code</span>
                  <span>Description</span>
                  <span>Scope</span>
                  <span>Action</span>
                  <span>Access</span>
                </div>

                @for (module of filteredModules(); track module.id) {
                  <article class="module-block">
                    <button
                      type="button"
                      class="group-row module-row"
                      [attr.aria-expanded]="isExpanded('module', module.id)"
                      (click)="toggleExpanded('module', module.id)"
                    >
                      <span class="chevron" [class.open]="isExpanded('module', module.id)" aria-hidden="true"></span>
                      <span class="folder-icon" aria-hidden="true"></span>
                      <span class="group-copy">
                        <strong>{{ module.name }}</strong>
                        <small>{{ module.description || module.code }}</small>
                      </span>
                      <span class="count-pill">{{ selectedCountForModule(module) }} / {{ permissionCountForModule(module) }}</span>
                    </button>

                    @if (isExpanded('module', module.id)) {
                      @for (feature of module.features; track feature.id) {
                        <section class="feature-block">
                          <button
                            type="button"
                            class="group-row feature-row"
                            [attr.aria-expanded]="isExpanded('feature', feature.id)"
                            (click)="toggleExpanded('feature', feature.id)"
                          >
                            <span class="chevron" [class.open]="isExpanded('feature', feature.id)" aria-hidden="true"></span>
                            <span class="folder-icon small" aria-hidden="true"></span>
                            <span class="group-copy">
                              <strong>{{ feature.name }}</strong>
                              <small>{{ feature.description || feature.code }}</small>
                            </span>
                            <span class="count-pill subtle">{{ selectedCountForFeature(feature) }} / {{ feature.permissions.length }}</span>
                          </button>

                          @if (isExpanded('feature', feature.id)) {
                            <ul class="permission-list">
                              @for (permission of feature.permissions; track permission.id) {
                                <li class="permission-row">
                                  <span class="permission-copy">
                                    <strong>{{ permission.name }}</strong>
                                  </span>
                                  <code>{{ permission.code }}</code>
                                  <span class="permission-description">{{ permission.description || '-' }}</span>
                                  <span class="scope-badge" [class]="permission.scope">{{ permission.scope || 'platform' }}</span>
                                  <span class="action-badge">{{ actionLabel(permission) }}</span>
                                  @if (isSensitive(permission)) {
                                    <span class="sensitive-badge">Sensitive</span>
                                  }
                                  @if (!permission.isActive) {
                                    <span class="inactive-badge">Inactive</span>
                                  }
                                  <input
                                    type="checkbox"
                                    [disabled]="permissionsDisabled() || !permission.isActive"
                                    [checked]="hasPermission(permission.code)"
                                    (change)="togglePermission(permission.code, $any($event.target).checked)"
                                    [attr.aria-label]="'Toggle ' + permission.name"
                                  />
                                </li>
                              }
                            </ul>
                          }
                        </section>
                      }
                    }
                  </article>
                }
              </section>
            }

            <footer class="action-bar">
              <button type="button" class="secondary-button" [disabled]="!isDirty() || isSaving()" (click)="resetChanges()">
                Reset Changes
              </button>
              <span class="save-error" role="alert">{{ saveError() }}</span>
              <button type="button" class="secondary-button" [disabled]="isSaving()" (click)="cancelChanges()">Cancel</button>
              <button type="button" class="secondary-button preview-button" (click)="showPreview.set(true)">Preview Impact</button>
              <button type="button" class="primary-button" [disabled]="!canSave()" (click)="saveRole()">
                {{ isSaving() ? 'Saving...' : 'Save Changes' }}
              </button>
            </footer>
          </main>

        </section>
      }

      @if (showPreview()) {
        <div class="modal-backdrop" role="presentation" (click)="showPreview.set(false)">
          <section class="preview-modal" role="dialog" aria-modal="true" aria-label="Preview impact" (click)="$event.stopPropagation()">
            <header>
              <div>
                <h2>Preview Impact</h2>
                <p>Review how your changes will affect access before saving.</p>
              </div>
              <button type="button" aria-label="Close preview" (click)="showPreview.set(false)">x</button>
            </header>

            <section class="modal-section">
              <h3>1. Role Summary</h3>
              <div class="modal-card-grid">
                <article><span>Available Permissions</span><strong>{{ allPermissions().length }}</strong></article>
                <article><span>Granted</span><strong>{{ selectedPermissionCodes().size }}</strong></article>
                <article><span>Not Granted</span><strong>{{ notGrantedCount() }}</strong></article>
                <article><span>Assigned Users</span><strong>{{ assignedUserCount() }}</strong></article>
                <article><span>Sensitive Permissions</span><strong>{{ selectedSensitivePermissions().length }}</strong></article>
              </div>
            </section>

            <section class="modal-section">
              <h3>2. Change Impact</h3>
              <div class="modal-card-grid impact">
                <article><span>Added Permissions</span><strong>+{{ addedPermissionCodes().length }}</strong></article>
                <article><span>Removed Permissions</span><strong>-{{ removedPermissionCodes().length }}</strong></article>
                <article><span>Affected Users</span><strong>{{ assignedUserCount() }}</strong></article>
                <article><span>Sensitive Permissions</span><strong>{{ selectedSensitivePermissions().length }}</strong></article>
              </div>
            </section>

            <section class="modal-section sensitive-modal-card">
              <h3>3. Sensitive Permissions</h3>
              @if (selectedSensitivePermissions().length) {
                <ul>
                  @for (permission of selectedSensitivePermissions(); track permission.id) {
                    <li><code>{{ permission.code }}</code></li>
                  }
                </ul>
              } @else {
                <p>No sensitive permissions selected.</p>
              }
            </section>

            <section class="modal-section">
              <h3>4. Access Preview</h3>
              <div class="access-preview">
                <article class="can-access">
                  <strong>Can Access</strong>
                  @if (grantedPreviewPermissions().length) {
                    @for (permission of grantedPreviewPermissions().slice(0, 8); track permission.id) {
                      <span>{{ permission.name }} <code>{{ permission.code }}</code></span>
                    }
                  } @else {
                    <span>No granted permissions selected.</span>
                  }
                </article>
                <article class="cannot-access">
                  <strong>Cannot Access</strong>
                  @if (deniedPreviewPermissions().length) {
                    @for (permission of deniedPreviewPermissions().slice(0, 8); track permission.id) {
                      <span>{{ permission.name }} <code>{{ permission.code }}</code></span>
                    }
                  } @else {
                    <span>All catalog permissions are selected.</span>
                  }
                </article>
              </div>
            </section>

            <footer class="modal-actions">
              <button type="button" class="secondary-button" (click)="showPreview.set(false)">Close</button>
              <button type="button" class="primary-button" (click)="showPreview.set(false)">Apply Changes</button>
            </footer>
          </section>
        </div>
      }
    </section>
  `,
  styles: `
    .roles-page {
      display: grid;
      gap: 1rem;
    }

    .page-heading {
      align-items: start;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
    }

    h1,
    h2,
    h3,
    p {
      margin: 0;
    }

    h1 {
      color: #10243b;
      font-size: 1.55rem;
      line-height: 1.2;
    }

    h2 {
      color: #10243b;
      font-size: 1rem;
      line-height: 1.25;
    }

    h3 {
      color: #10243b;
      font-size: 0.9rem;
    }

    .page-heading p,
    .panel-heading p,
    .notice span,
    .preview-card p,
    .sensitive-card p,
    .updated-card p {
      color: #5f738a;
      font-size: 0.84rem;
      line-height: 1.45;
    }

    .roles-layout {
      align-items: start;
      display: grid;
      gap: 1rem;
      grid-template-columns: minmax(250px, 320px) minmax(640px, 1fr);
    }

    .panel,
    .state-card {
      background: #fff;
      border: 1px solid #dfe8f2;
      border-radius: 12px;
      box-shadow: 0 14px 28px rgba(16, 36, 59, 0.05);
      padding: 1rem;
    }

    .panel-heading {
      align-items: start;
      display: flex;
      gap: 0.75rem;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .primary-button,
    .secondary-button,
    .preview-card button,
    .state-card button {
      border-radius: 8px;
      cursor: pointer;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 800;
      min-height: 38px;
      padding: 0.55rem 0.85rem;
      white-space: nowrap;
    }

    .primary-button {
      background: #155eef;
      border: 1px solid #155eef;
      color: #fff;
    }

    .secondary-button {
      background: #fff;
      border: 1px solid #d8e3ef;
      color: #10243b;
    }

    button:disabled,
    input:disabled,
    select:disabled,
    textarea:disabled {
      cursor: not-allowed;
      opacity: 0.58;
    }

    .field {
      display: grid;
      gap: 0.35rem;
    }

    .field span {
      color: #355272;
      font-size: 0.68rem;
      font-weight: 900;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .field input,
    .field select,
    .field textarea {
      background: #f8fbff;
      border: 1px solid #d8e3ef;
      border-radius: 8px;
      color: #10243b;
      font: inherit;
      min-height: 38px;
      padding: 0.55rem 0.65rem;
      width: 100%;
    }

    .field textarea {
      min-height: 86px;
      resize: vertical;
    }

    .role-list {
      display: grid;
      gap: 0.65rem;
      margin-top: 1rem;
      max-height: 680px;
      overflow: auto;
      padding-right: 0.15rem;
    }

    .role-card {
      align-items: center;
      background: #fff;
      border: 1px solid #dfe8f2;
      border-radius: 10px;
      cursor: pointer;
      display: grid;
      gap: 0.65rem;
      grid-template-columns: auto 1fr auto;
      padding: 0.78rem;
      text-align: left;
    }

    .role-card.selected {
      background: #f5f9ff;
      border-color: #155eef;
      box-shadow: inset 3px 0 0 #155eef;
    }

    .role-mark {
      background: #eef5ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      height: 2rem;
      width: 2rem;
    }

    .role-mark.system {
      background: #eff6ff;
      border-color: #93c5fd;
    }

    .role-copy,
    .role-meta {
      display: grid;
      gap: 0.18rem;
      min-width: 0;
    }

    .role-copy strong {
      color: #10243b;
      font-size: 0.86rem;
    }

    .role-copy small,
    .role-meta small {
      color: #5f738a;
      font-size: 0.74rem;
    }

    .status-chip,
    .system-badge {
      background: #dcfce7;
      border-radius: 999px;
      color: #15803d;
      font-size: 0.68rem;
      font-weight: 900;
      padding: 0.24rem 0.52rem;
      text-align: center;
    }

    .status-chip.inactive {
      background: #edf2f7;
      color: #55708c;
    }

    .status-chip.system,
    .system-badge {
      background: #eef5ff;
      color: #155eef;
    }

    .role-form {
      display: grid;
      gap: 0.9rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-bottom: 1rem;
    }

    .description-field {
      grid-column: 1 / -1;
    }

    .notice,
    .inline-error,
    .save-error {
      border-radius: 10px;
      font-size: 0.82rem;
    }

    .notice {
      background: #fff8ed;
      border: 1px solid #fed7aa;
      display: grid;
      gap: 0.25rem;
      margin-bottom: 1rem;
      padding: 0.75rem;
    }

    .summary-strip {
      border: 1px solid #dfe8f2;
      border-radius: 10px;
      display: grid;
      gap: 0;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      margin-bottom: 1rem;
      overflow: hidden;
    }

    .summary-strip article {
      background: #fbfdff;
      border-right: 1px solid #dfe8f2;
      display: grid;
      gap: 0.25rem;
      min-height: 66px;
      padding: 0.75rem;
    }

    .summary-strip article:last-child {
      border-right: 0;
    }

    .summary-strip span {
      color: #55708c;
      font-size: 0.68rem;
      font-weight: 800;
    }

    .summary-strip strong {
      color: #10243b;
      font-size: 1.2rem;
      line-height: 1;
    }

    .summary-strip .dirty-summary.active {
      background: #fff8ed;
    }

    .inline-error,
    .save-error {
      color: #b42318;
    }

    .inline-error {
      background: #fff7f7;
      border: 1px solid #f3c7c7;
      margin-bottom: 1rem;
      padding: 0.75rem;
    }

    .permission-mode {
      align-items: center;
      border-top: 1px solid #edf2f7;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
      padding-top: 1rem;
    }

    .permission-mode span {
      color: #10243b;
      font-size: 0.82rem;
      font-weight: 900;
      margin-right: 0.25rem;
    }

    .permission-mode button,
    .toolbar-actions button {
      background: #fff;
      border: 1px solid #d8e3ef;
      border-radius: 8px;
      color: #10243b;
      cursor: pointer;
      font: inherit;
      font-size: 0.78rem;
      font-weight: 800;
      min-height: 34px;
      padding: 0.42rem 0.72rem;
    }

    .permission-mode button.selected {
      background: #eef5ff;
      border-color: #155eef;
      color: #155eef;
    }

    .toolbar {
      align-items: end;
      display: grid;
      gap: 0.7rem;
      grid-template-columns: minmax(220px, 1.35fr) minmax(140px, 0.75fr) minmax(120px, 0.65fr) minmax(130px, 0.65fr) auto;
      margin-bottom: 1rem;
    }

    .dirty-banner {
      align-items: center;
      background: #fff8ed;
      border: 1px solid #fed7aa;
      border-radius: 8px;
      color: #7c2d12;
      display: flex;
      font-size: 0.82rem;
      gap: 0.75rem;
      justify-content: space-between;
      margin-bottom: 1rem;
      padding: 0.65rem 0.8rem;
    }

    .dirty-banner button {
      background: transparent;
      border: 0;
      color: #155eef;
      cursor: pointer;
      font: inherit;
      font-weight: 900;
    }

    .toolbar-actions {
      display: flex;
      gap: 0.45rem;
      justify-content: end;
    }

    .catalog-tree {
      border: 1px solid #dfe8f2;
      border-radius: 12px;
      max-height: 520px;
      overflow: auto;
    }

    .tree-header {
      background: #f8fbff;
      border-bottom: 1px solid #dfe8f2;
      color: #55708c;
      display: grid;
      font-size: 0.7rem;
      font-weight: 900;
      grid-template-columns: minmax(180px, 1.2fr) minmax(180px, 1fr) minmax(220px, 1.1fr) 90px 90px 80px;
      letter-spacing: 0.03em;
      padding: 0.65rem 0.9rem;
      position: sticky;
      text-transform: uppercase;
      top: 0;
      z-index: 1;
    }

    .module-block + .module-block,
    .feature-block,
    .permission-row {
      border-top: 1px solid #e8eef5;
    }

    .group-row {
      align-items: center;
      background: #fff;
      border: 0;
      cursor: pointer;
      display: grid;
      gap: 0.6rem;
      grid-template-columns: auto auto 1fr auto;
      padding: 0.72rem 0.9rem;
      text-align: left;
      width: 100%;
    }

    .module-row {
      background: #fbfdff;
    }

    .feature-row {
      padding-left: 2rem;
    }

    .chevron {
      border-right: 2px solid #7a8fa6;
      border-top: 2px solid #7a8fa6;
      height: 0.5rem;
      transform: rotate(45deg);
      transition: transform 0.15s ease;
      width: 0.5rem;
    }

    .chevron.open {
      transform: rotate(135deg);
    }

    .folder-icon {
      border: 2px solid #355272;
      border-radius: 3px;
      height: 0.9rem;
      position: relative;
      width: 1.05rem;
    }

    .folder-icon::before {
      background: #fff;
      border: 2px solid #355272;
      border-bottom: 0;
      border-radius: 3px 3px 0 0;
      content: '';
      height: 0.28rem;
      left: -2px;
      position: absolute;
      top: -0.38rem;
      width: 0.55rem;
    }

    .folder-icon.small {
      border-color: #55708c;
      transform: scale(0.9);
    }

    .folder-icon.small::before {
      border-color: #55708c;
    }

    .group-copy,
    .permission-copy {
      display: grid;
      gap: 0.16rem;
      min-width: 0;
    }

    .group-copy strong,
    .permission-copy strong {
      color: #10243b;
      font-size: 0.86rem;
    }

    .group-copy small,
    .permission-copy small {
      color: #6b8198;
      font-size: 0.74rem;
    }

    .count-pill,
    .scope-badge,
    .action-badge,
    .sensitive-badge,
    .inactive-badge {
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 900;
      padding: 0.25rem 0.5rem;
      white-space: nowrap;
    }

    .count-pill {
      background: #eef5ff;
      color: #155eef;
    }

    .count-pill.subtle {
      background: #f0f5fa;
      color: #55708c;
    }

    .permission-list {
      display: grid;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .permission-row {
      align-items: start;
      display: grid;
      gap: 0.65rem;
      grid-template-columns: minmax(160px, 1.1fr) minmax(180px, 1fr) minmax(220px, 1.1fr) auto auto auto auto;
      padding: 0.68rem 0.9rem 0.68rem 3.2rem;
    }

    .permission-row input[type='checkbox'] {
      height: 1rem;
      margin-top: 0.12rem;
      width: 1rem;
    }

    .permission-row > code,
    .sensitive-card code {
      background: #f0f5fa;
      border-radius: 6px;
      color: #355272;
      font-size: 0.74rem;
      padding: 0.15rem 0.4rem;
      width: fit-content;
    }

    .permission-description {
      color: #6b8198;
      font-size: 0.74rem;
      line-height: 1.35;
    }

    .scope-badge.platform {
      background: #eef0ff;
      color: #4f46e5;
    }

    .scope-badge.tenant {
      background: #e8f7ef;
      color: #15803d;
    }

    .scope-badge.pos {
      background: #fff4e8;
      color: #c2410c;
    }

    .action-badge {
      background: #eef5ff;
      color: #155eef;
    }

    .sensitive-badge {
      background: #fff7e6;
      color: #b45309;
    }

    .inactive-badge {
      background: #fdecec;
      color: #b42318;
    }

    .action-bar {
      align-items: center;
      border-top: 1px solid #edf2f7;
      display: grid;
      gap: 0.65rem;
      grid-template-columns: auto 1fr auto auto auto;
      margin-top: 1rem;
      padding-top: 1rem;
    }

    .preview-button {
      border-color: #155eef;
      color: #155eef;
    }

    .summary-grid {
      display: grid;
      gap: 0.75rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin: 1rem 0;
    }

    .summary-card {
      border: 1px solid #dfe8f2;
      border-radius: 10px;
      display: grid;
      gap: 0.35rem;
      min-height: 84px;
      padding: 0.8rem;
    }

    .summary-card span {
      color: #355272;
      font-size: 0.74rem;
      font-weight: 800;
      line-height: 1.25;
    }

    .summary-card strong {
      color: #10243b;
      font-size: 1.5rem;
      line-height: 1;
    }

    .summary-card.purple { background: #f5f3ff; }
    .summary-card.blue { background: #eff6ff; }
    .summary-card.green { background: #ecfdf5; }
    .summary-card.red { background: #fef2f2; }
    .summary-card.users { background: #f8fbff; grid-column: 1 / -1; }

    .sensitive-card,
    .preview-card,
    .updated-card {
      border-radius: 10px;
      display: grid;
      gap: 0.6rem;
      margin-top: 1rem;
      padding: 0.85rem;
    }

    .sensitive-card {
      background: #fff8ed;
      border: 1px solid #fed7aa;
    }

    .sensitive-card ul {
      display: grid;
      gap: 0.35rem;
      margin: 0;
      padding-left: 1.1rem;
    }

    .preview-card {
      background: #f8fbff;
      border: 1px solid #d8e8ff;
    }

    .updated-card {
      background: #fff;
      border: 1px solid #dfe8f2;
    }

    .state-card {
      display: grid;
      gap: 0.65rem;
    }

    .state-card.error {
      background: #fff7f7;
      border-color: #f3c7c7;
    }

    .state-card.empty {
      background: #fbfdff;
      box-shadow: none;
    }

    .empty-inline {
      color: #5f738a;
      font-size: 0.82rem;
      padding: 0.8rem;
      text-align: center;
    }

    .toast {
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 800;
      padding: 0.65rem 0.8rem;
    }

    .toast.success {
      background: #ecfdf5;
      color: #15803d;
    }

    .skeleton-row {
      animation: pulse 1.4s ease-in-out infinite;
      background: linear-gradient(90deg, #edf3fa 25%, #f8fbff 50%, #edf3fa 75%);
      background-size: 200% 100%;
      border-radius: 10px;
      height: 14px;
      width: 100%;
    }

    .skeleton-row.short {
      width: 55%;
    }

    .modal-backdrop {
      align-items: center;
      background: rgba(8, 21, 38, 0.42);
      display: flex;
      inset: 0;
      justify-content: center;
      padding: 1rem;
      position: fixed;
      z-index: 30;
    }

    .preview-modal {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(8, 21, 38, 0.24);
      max-height: min(720px, 86vh);
      max-width: 760px;
      overflow: auto;
      padding: 1rem;
      width: 100%;
    }

    .preview-modal header {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .preview-modal header p {
      color: #5f738a;
      font-size: 0.82rem;
      margin-top: 0.25rem;
    }

    .preview-modal header button {
      background: #f0f5fa;
      border: 0;
      border-radius: 999px;
      color: #10243b;
      cursor: pointer;
      font-size: 1rem;
      height: 2rem;
      width: 2rem;
    }

    .preview-list {
      display: grid;
      gap: 0.55rem;
    }

    .modal-section {
      display: grid;
      gap: 0.6rem;
      margin-top: 1rem;
    }

    .modal-card-grid {
      display: grid;
      gap: 0.55rem;
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }

    .modal-card-grid.impact {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .modal-card-grid article {
      border: 1px solid #dfe8f2;
      border-radius: 8px;
      display: grid;
      gap: 0.25rem;
      min-height: 64px;
      padding: 0.65rem;
    }

    .modal-card-grid span {
      color: #55708c;
      font-size: 0.68rem;
      font-weight: 800;
    }

    .modal-card-grid strong {
      color: #10243b;
      font-size: 1.15rem;
    }

    .sensitive-modal-card {
      background: #fff8ed;
      border: 1px solid #fed7aa;
      border-radius: 10px;
      padding: 0.75rem;
    }

    .sensitive-modal-card ul {
      display: grid;
      gap: 0.3rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin: 0;
      padding-left: 1rem;
    }

    .sensitive-modal-card code,
    .access-preview code {
      background: #f0f5fa;
      border-radius: 6px;
      color: #355272;
      font-size: 0.72rem;
      padding: 0.1rem 0.35rem;
    }

    .access-preview {
      display: grid;
      gap: 0.75rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .access-preview article {
      border-radius: 10px;
      display: grid;
      gap: 0.45rem;
      padding: 0.75rem;
    }

    .access-preview span {
      border-radius: 7px;
      display: grid;
      gap: 0.15rem;
      padding: 0.45rem;
    }

    .can-access {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
    }

    .can-access span {
      background: #dcfce7;
    }

    .cannot-access {
      background: #fff7f7;
      border: 1px solid #fecaca;
    }

    .cannot-access span {
      background: #fee2e2;
    }

    .modal-actions {
      align-items: center;
      display: flex;
      gap: 0.6rem;
      justify-content: space-between;
      margin-top: 1rem;
    }

    .preview-list article {
      align-items: center;
      border: 1px solid #dfe8f2;
      border-radius: 10px;
      display: flex;
      gap: 0.75rem;
      justify-content: space-between;
      padding: 0.7rem;
    }

    .preview-list span {
      color: #5f738a;
      font-size: 0.82rem;
    }

    @keyframes pulse {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }

    @media (max-width: 1280px) {
      .roles-layout {
        grid-template-columns: 300px minmax(0, 1fr);
      }
    }

    @media (max-width: 900px) {
      .roles-layout,
      .toolbar,
      .role-form,
      .summary-strip,
      .modal-card-grid,
      .modal-card-grid.impact,
      .access-preview,
      .action-bar {
        grid-template-columns: 1fr;
      }

      .tree-header {
        display: none;
      }

      .permission-row {
        grid-template-columns: auto 1fr;
        padding-left: 1rem;
      }
    }
  `
})
export class PlatformPermissionCatalogPage {
  private readonly catalogApi = inject(PlatformPermissionCatalogApiService);
  private readonly roleApi = inject(PlatformRoleManagementApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly accessControl = inject(AccessControlService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly permissionSearchChanges$ = new Subject<string>();

  readonly catalog = signal<PermissionCatalogTreeResponse | null>(null);
  readonly roles = signal<PlatformRoleSummary[]>([]);
  readonly selectedRoleId = signal<string | null>(null);
  readonly selectedRole = signal<PlatformRoleDetail | null>(null);
  readonly selectedPermissionCodes = signal<Set<string>>(new Set());
  readonly isLoading = signal(true);
  readonly isDetailLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isCreateMode = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly detailError = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly showPreview = signal(false);

  readonly roleSearch = signal('');
  readonly permissionSearchInput = signal('');
  readonly permissionSearchTerm = signal('');
  readonly moduleFilter = signal<ModuleFilter | string>('');
  readonly scopeFilter = signal<PermissionCatalogScopeFilter>('');
  readonly grantFilter = signal<GrantFilter>('');
  readonly actionFilter = signal<ActionFilter | string>('');
  readonly permissionMode = signal<PermissionMode>('custom');
  readonly form = signal<RoleFormState>({ code: '', name: '', description: '', status: 'Active' });
  private readonly snapshot = signal<RoleSnapshot | null>(null);
  private readonly expandedKeys = signal<Set<string>>(new Set());

  readonly modules = computed(() => this.catalog()?.modules ?? []);
  readonly allPermissions = computed(() => permissionsFromModules(this.modules()));
  readonly actionOptions = computed(() =>
    [...new Set(this.allPermissions().map((permission) => this.actionLabel(permission)).filter(Boolean))].sort()
  );
  readonly filteredRoles = computed(() => {
    const term = this.roleSearch().trim().toLowerCase();
    if (!term) {
      return this.roles();
    }

    return this.roles().filter((role) =>
      [role.name, role.code, role.description ?? '', role.status].some((value) => value.toLowerCase().includes(term))
    );
  });
  readonly filteredModules = computed(() =>
    filterCatalog(
      this.modules(),
      this.permissionSearchTerm(),
      this.moduleFilter(),
      this.scopeFilter(),
      this.grantFilter(),
      this.actionFilter(),
      this.selectedPermissionCodes()
    )
  );
  readonly selectedSensitivePermissions = computed(() =>
    this.allPermissions().filter((permission) => this.hasPermission(permission.code) && isSensitivePermission(permission))
  );
  readonly notGrantedCount = computed(() => Math.max(this.allPermissions().length - this.selectedPermissionCodes().size, 0));
  readonly addedPermissionCodes = computed(() => {
    const loaded = new Set(this.snapshot()?.permissionCodes ?? []);
    return [...this.selectedPermissionCodes()].filter((code) => !loaded.has(code)).sort();
  });
  readonly removedPermissionCodes = computed(() => {
    const selected = this.selectedPermissionCodes();
    return [...(this.snapshot()?.permissionCodes ?? [])].filter((code) => !selected.has(code)).sort();
  });
  readonly changedPermissionCount = computed(() => this.addedPermissionCodes().length + this.removedPermissionCodes().length);
  readonly grantedPreviewPermissions = computed(() =>
    this.allPermissions().filter((permission) => this.selectedPermissionCodes().has(permission.code))
  );
  readonly deniedPreviewPermissions = computed(() =>
    this.allPermissions().filter((permission) => !this.selectedPermissionCodes().has(permission.code))
  );
  readonly assignedUserCount = computed(() =>
    this.selectedRole()?.assignedUserCount ?? this.roles().find((role) => role.id === this.selectedRoleId())?.assignedUserCount ?? 0
  );
  readonly lastUpdated = computed(() => {
    const raw = this.selectedRole()?.updatedAt;
    if (!raw) {
      return '';
    }

    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleString();
  });
  readonly isDirty = computed(() => {
    const snapshot = this.snapshot();
    if (!snapshot) {
      return false;
    }

    return !sameForm(snapshot.form, this.form()) || !sameCodes(snapshot.permissionCodes, [...this.selectedPermissionCodes()]);
  });
  readonly formDisabled = computed(
    () => this.isSaving() || this.selectedRole()?.isSystem === true || !this.canEditRoleMetadata()
  );
  readonly permissionsDisabled = computed(
    () =>
      this.isSaving() ||
      this.isDetailLoading() ||
      this.selectedRole()?.isSystem === true ||
      !this.canEditRolePermissions()
  );
  readonly canCreateRole = computed(() => this.accessControl.hasPermission(platformPermissions.rolesCreate));
  readonly canSave = computed(() => {
    const form = this.form();
    const hasRequiredFields = this.isCreateMode()
      ? Boolean(form.code.trim()) && Boolean(form.name.trim())
      : Boolean(form.name.trim());

    if (!hasRequiredFields || !this.isDirty() || this.isSaving() || this.selectedRole()?.isSystem === true) {
      return false;
    }

    if (this.isCreateMode()) {
      return this.canEditRoleMetadata() && this.canEditRolePermissions();
    }

    const snapshot = this.snapshot();
    const formChanged = snapshot ? !sameForm(snapshot.form, form) : false;
    const permissionsChanged = snapshot
      ? !sameCodes(snapshot.permissionCodes, [...this.selectedPermissionCodes()])
      : false;

    if (formChanged && !this.canEditRoleMetadata()) {
      return false;
    }

    if (permissionsChanged && !this.canEditRolePermissions()) {
      return false;
    }

    return formChanged || permissionsChanged;
  });

  constructor() {
    this.permissionSearchChanges$
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.permissionSearchTerm.set(term);
        this.expandAll();
      });

    this.loadPage();
  }

  loadPage(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.successMessage.set(null);

    forkJoin({
      catalog: this.catalogApi.getPermissionCatalog(),
      roles: this.roleApi.getRoles()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ catalog, roles }) => {
          this.catalog.set(catalog);
          this.roles.set(roles.roles);
          this.expandedKeys.set(buildDefaultExpandedKeys(catalog.modules));
          this.isLoading.set(false);

          if (roles.roles.length) {
            this.selectRole(roles.roles[0].id);
          } else {
            this.startCreate();
          }
        },
        error: (error) => {
          this.catalog.set(null);
          this.roles.set([]);
          this.loadError.set(this.apiError.toSafeMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  selectRole(roleId: string): void {
    if (this.selectedRoleId() === roleId && !this.isCreateMode()) {
      return;
    }

    this.isCreateMode.set(false);
    this.selectedRoleId.set(roleId);
    this.loadRole(roleId);
  }

  startCreate(): void {
    this.isCreateMode.set(true);
    this.selectedRoleId.set(null);
    this.selectedRole.set(null);
    this.selectedPermissionCodes.set(new Set());
    this.permissionMode.set('custom');
    this.form.set({ code: '', name: '', description: '', status: 'Active' });
    this.snapshot.set({ form: this.cloneForm(this.form()), permissionCodes: [] });
    this.detailError.set(null);
    this.saveError.set(null);
  }

  loadRole(roleId: string): void {
    this.isDetailLoading.set(true);
    this.detailError.set(null);
    this.saveError.set(null);
    this.successMessage.set(null);

    forkJoin({
      role: this.roleApi.getRole(roleId),
      permissions: this.roleApi.getRolePermissions(roleId)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ role, permissions }) => {
          this.selectedRole.set(role);
          this.selectedPermissionCodes.set(new Set(permissions.assignedPermissionCodes));
          this.permissionMode.set('custom');
          this.form.set({
            code: role.code,
            name: role.name,
            description: role.description ?? '',
            status: normalizeStatus(role.status)
          });
          this.snapshot.set({
            form: this.cloneForm(this.form()),
            permissionCodes: [...permissions.assignedPermissionCodes].sort()
          });
          this.isDetailLoading.set(false);
        },
        error: (error) => {
          this.detailError.set(this.apiError.toSafeMessage(error));
          this.isDetailLoading.set(false);
        }
      });
  }

  updateForm(field: keyof RoleFormState, value: string): void {
    this.form.update((form) => ({ ...form, [field]: value }));

    if (field === 'name' && this.isCreateMode() && !this.form().code.trim()) {
      this.form.update((form) => ({ ...form, code: normalizeRoleCode(value) }));
    }
  }

  onPermissionSearchChange(value: string): void {
    this.permissionSearchInput.set(value);
    this.permissionSearchChanges$.next(value);
  }

  onModuleChange(value: string): void {
    this.moduleFilter.set(value);
    this.expandAll();
  }

  onScopeChange(value: PermissionCatalogScopeFilter): void {
    this.scopeFilter.set(value);
    this.expandAll();
  }

  onGrantFilterChange(value: GrantFilter): void {
    this.grantFilter.set(value);
    this.expandAll();
  }

  onActionFilterChange(value: string): void {
    this.actionFilter.set(value);
    this.expandAll();
  }

  isExpanded(kind: 'module' | 'feature', id: string): boolean {
    return this.expandedKeys().has(`${kind}:${id}`);
  }

  toggleExpanded(kind: 'module' | 'feature', id: string): void {
    const key = `${kind}:${id}`;
    const next = new Set(this.expandedKeys());

    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }

    this.expandedKeys.set(next);
  }

  expandAll(): void {
    this.expandedKeys.set(buildAllExpandedKeys(this.filteredModules()));
  }

  collapseAll(): void {
    this.expandedKeys.set(new Set());
  }

  setPermissionMode(mode: PermissionMode): void {
    this.permissionMode.set(mode);

    if (mode === 'custom') {
      return;
    }

    const next = mode === 'fullAccess'
      ? this.allPermissions().map((permission) => permission.code)
      : this.allPermissions().filter((permission) => isReadOnlyPermission(permission)).map((permission) => permission.code);

    this.selectedPermissionCodes.set(new Set(next));
  }

  togglePermission(code: string, checked: boolean): void {
    this.permissionMode.set('custom');
    const next = new Set(this.selectedPermissionCodes());

    if (checked) {
      next.add(code);
    } else {
      next.delete(code);
    }

    this.selectedPermissionCodes.set(next);
  }

  hasPermission(code: string): boolean {
    return this.selectedPermissionCodes().has(code);
  }

  canEditRoleMetadata(): boolean {
    return this.isCreateMode()
      ? this.accessControl.hasPermission(platformPermissions.rolesCreate)
      : this.accessControl.hasPermission(platformPermissions.rolesUpdate);
  }

  canEditRolePermissions(): boolean {
    return this.accessControl.hasPermission(platformPermissions.rolePermissionsUpdate);
  }

  resetChanges(): void {
    const snapshot = this.snapshot();
    if (!snapshot) {
      return;
    }

    this.form.set(this.cloneForm(snapshot.form));
    this.selectedPermissionCodes.set(new Set(snapshot.permissionCodes));
    this.permissionMode.set('custom');
    this.saveError.set(null);
    this.successMessage.set(null);
  }

  cancelChanges(): void {
    if (this.isCreateMode()) {
      const firstRole = this.roles()[0];
      if (firstRole) {
        this.selectRole(firstRole.id);
      } else {
        this.startCreate();
      }
      return;
    }

    this.resetChanges();
  }

  saveRole(): void {
    if (!this.canSave()) {
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);
    this.successMessage.set(null);
    const form = this.form();
    const permissionCodes = [...this.selectedPermissionCodes()].sort();

    const save$ = this.isCreateMode()
      ? this.roleApi.createRole({
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim(),
          status: form.status
        }).pipe(
          switchMap((created) =>
            permissionCodes.length
              ? this.roleApi.updateRolePermissions(created.id, { permissionCodes }).pipe(switchMap(() => of(created)))
              : of(created)
          )
        )
      : this.roleApi.updateRole(this.selectedRoleId() ?? '', {
          name: form.name.trim(),
          description: form.description.trim(),
          status: form.status
        }).pipe(
          switchMap((updated) =>
            this.roleApi.updateRolePermissions(updated.id, { permissionCodes }).pipe(switchMap(() => of(updated)))
          )
        );

    save$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (role) => {
          this.afterSave(role.id);
        },
        error: (error) => {
          this.saveError.set(this.apiError.toSafeMessage(error));
          this.isSaving.set(false);
        }
      });
  }

  selectedCountForModule(module: PermissionCatalogModule): number {
    return permissionsFromModules([module]).filter((permission) => this.hasPermission(permission.code)).length;
  }

  selectedCountForFeature(feature: PermissionCatalogFeature): number {
    return feature.permissions.filter((permission) => this.hasPermission(permission.code)).length;
  }

  permissionCountForModule(module: PermissionCatalogModule): number {
    return permissionsFromModules([module]).length;
  }

  actionLabel(permission: PermissionCatalogPermission): string {
    return getActionLabel(permission);
  }

  isSensitive(permission: PermissionCatalogPermission): boolean {
    return isSensitivePermission(permission);
  }

  isRoleActive(status: string): boolean {
    return normalizeStatus(status) === 'Active';
  }

  normalizeRoleCode(value: string): string {
    return normalizeRoleCode(value);
  }

  private afterSave(roleId: string): void {
    this.roleApi.getRoles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => {
          this.roles.set(roles.roles);
          this.isCreateMode.set(false);
          this.selectedRoleId.set(roleId);
          this.successMessage.set('Role permissions saved.');
          this.isSaving.set(false);
          this.loadRole(roleId);
        },
        error: (error) => {
          this.saveError.set(this.apiError.toSafeMessage(error));
          this.isSaving.set(false);
        }
      });
  }

  private cloneForm(form: RoleFormState): RoleFormState {
    return { code: form.code, name: form.name, description: form.description, status: form.status };
  }
}

function buildDefaultExpandedKeys(modules: PermissionCatalogModule[]): Set<string> {
  const keys = new Set<string>();

  for (const module of modules.slice(0, 2)) {
    keys.add(`module:${module.id}`);

    for (const feature of module.features.slice(0, 1)) {
      keys.add(`feature:${feature.id}`);
    }
  }

  return keys;
}

function buildAllExpandedKeys(modules: PermissionCatalogModule[]): Set<string> {
  const keys = new Set<string>();

  for (const module of modules) {
    keys.add(`module:${module.id}`);

    for (const feature of module.features) {
      keys.add(`feature:${feature.id}`);
    }
  }

  return keys;
}

function filterCatalog(
  modules: PermissionCatalogModule[],
  searchTerm: string,
  moduleFilter: string,
  scopeFilter: PermissionCatalogScopeFilter,
  grantFilter: GrantFilter,
  actionFilter: string,
  selectedCodes: Set<string>
): FilteredPermissionCatalogModule[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return modules
    .filter((module) => !moduleFilter || module.code === moduleFilter)
    .map((module) => {
      const features = module.features
        .map((feature) => {
          const permissions = feature.permissions.filter(
            (permission) =>
              matchesScope(permission.scope, scopeFilter) &&
              matchesGrant(permission.code, grantFilter, selectedCodes) &&
              matchesAction(permission, actionFilter) &&
              matchesSearch(permission, normalizedSearch, module, feature)
          );

          if (!permissions.length) {
            return null;
          }

          return { ...feature, permissions };
        })
        .filter((feature): feature is FilteredPermissionCatalogFeature => feature !== null);

      if (!features.length) {
        return null;
      }

      return { ...module, features };
    })
    .filter((module): module is FilteredPermissionCatalogModule => module !== null);
}

function matchesScope(scope: string, scopeFilter: PermissionCatalogScopeFilter): boolean {
  return !scopeFilter || scope === scopeFilter;
}

function matchesGrant(code: string, grantFilter: GrantFilter, selectedCodes: Set<string>): boolean {
  if (!grantFilter) {
    return true;
  }

  const isGranted = selectedCodes.has(code);
  return grantFilter === 'granted' ? isGranted : !isGranted;
}

function matchesAction(permission: PermissionCatalogPermission, actionFilter: string): boolean {
  if (!actionFilter) {
    return true;
  }

  return getActionLabel(permission) === actionFilter;
}

function matchesSearch(
  permission: PermissionCatalogPermission,
  searchTerm: string,
  module: PermissionCatalogModule,
  feature: PermissionCatalogFeature
): boolean {
  if (!searchTerm) {
    return true;
  }

  return [
    permission.code,
    permission.name,
    permission.description ?? '',
    feature.code,
    feature.name,
    module.code,
    module.name
  ].some((value) => value.toLowerCase().includes(searchTerm));
}

function permissionsFromModules(modules: PermissionCatalogModule[]): PermissionCatalogPermission[] {
  return modules.flatMap((module) => module.features.flatMap((feature) => feature.permissions));
}

function isReadOnlyPermission(permission: PermissionCatalogPermission): boolean {
  return permission.code.toLowerCase().endsWith('.view') || (permission.action ?? '').toLowerCase() === 'view';
}

function getActionLabel(permission: PermissionCatalogPermission): string {
  const explicitAction = permission.action?.trim();
  if (explicitAction) {
    return explicitAction;
  }

  const parts = permission.code.split('.');
  return parts.at(-1) || 'access';
}

function isSensitivePermission(permission: PermissionCatalogPermission): boolean {
  const sensitiveCodes = new Set([
    'platform.permissions.view',
    'platform.modules.view',
    'platform.features.view',
    'platform.tenants.subscription.update',
    'platform.tenants.entitlements.update',
    'platform.roles.permissions.update',
    'platform.roles.update',
    'platform.users.roles.assign',
    'roles.permissions.update',
    'users.roles.assign'
  ]);
  const code = permission.code.toLowerCase();
  const action = (permission.action ?? '').toLowerCase();

  return (
    sensitiveCodes.has(code) ||
    action === 'approve' ||
    action === 'delete' ||
    code.endsWith('.delete') ||
    code.endsWith('.approve') ||
    code.includes('entitlement')
  );
}

function normalizeStatus(status: string): string {
  return status.toLowerCase() === 'inactive' ? 'Inactive' : 'Active';
}

function normalizeRoleCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function sameForm(left: RoleFormState, right: RoleFormState): boolean {
  return (
    left.code.trim() === right.code.trim() &&
    left.name.trim() === right.name.trim() &&
    left.description.trim() === right.description.trim() &&
    left.status === right.status
  );
}

function sameCodes(left: string[], right: string[]): boolean {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();

  return sortedLeft.length === sortedRight.length && sortedLeft.every((code, index) => code === sortedRight[index]);
}
