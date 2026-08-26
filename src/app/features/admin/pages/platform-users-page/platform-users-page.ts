import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { PlatformRoleSummary } from '../../models/platform-role-management.model';
import { platformUserStatusOptions, PlatformUserDetail, PlatformUserSummary } from '../../models/platform-user.model';
import { PlatformRoleManagementApiService } from '../../services/platform-role-management-api.service';
import { PlatformUserApiService } from '../../services/platform-user-api.service';

@Component({
  selector: 'app-platform-users-page',
  standalone: true,
  imports: [DatePipe, FormsModule, ReactiveFormsModule, ConfirmationDialog],
  template: `
    <section class="users-page">
      @if (successMessage()) {
        <div class="toast success" role="status">{{ successMessage() }}</div>
      }

      <header class="page-heading">
        <div class="title-block">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            @if (isAddingUser()) {
              <span class="link" (click)="cancelCreate()">Platform Users</span>
              <span class="sep" aria-hidden="true">&gt;</span>
              <span class="current">Add Platform User</span>
            } @else {
              <span>Platform</span>
              <span class="sep" aria-hidden="true">/</span>
              <span class="current">Users</span>
            }
          </nav>
          <h1>{{ isAddingUser() ? 'Add Platform User' : 'Platform Users' }}</h1>
          <p>{{ isAddingUser() ? 'Create a Platform Admin user and send them a secure invitation.' : 'Manage internal platform staff accounts and role assignments.' }}</p>
          <span class="title-accent" aria-hidden="true"></span>
        </div>
        @if (canCreate() && !isAddingUser()) {
          <button type="button" class="btn primary" (click)="openCreate()">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="icon-plus"><path d="M12 5v14M5 12h14" /></svg>
            Add Platform User
          </button>
        }
      </header>

      @if (isAddingUser()) {
        <div class="layout-grid">
          <!-- LEFT PANEL: Add Platform User Form -->
          <section class="left-panel card">
            @if (editorError()) {
              <div class="editor-error" role="alert">{{ editorError() }}</div>
            }
            <form [formGroup]="createForm" (ngSubmit)="submitCreate()" class="r1-form">
              <!-- Section 1 -->
              <div class="form-section">
                <h3 class="section-title">
                  <span class="step-number">1</span>
                  Account Information
                </h3>
                
                <div class="form-group">
                  <label for="fullName">Full Name *</label>
                  <input
                    type="text"
                    id="fullName"
                    formControlName="fullName"
                    placeholder="Enter full name"
                    autocomplete="off"
                  />
                  @if (createForm.controls.fullName.touched && createForm.controls.fullName.invalid) {
                    <span class="field-error">Full name is required (max 100 characters)</span>
                  }
                </div>

                <div class="form-group">
                  <label for="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    formControlName="email"
                    placeholder="Enter email address"
                    autocomplete="off"
                  />
                  @if (createForm.controls.email.touched && createForm.controls.email.invalid) {
                    <span class="field-error">Please enter a valid email address</span>
                  }
                </div>

                <div class="form-group">
                  <label for="phone">Phone Number</label>
                  <input
                    type="text"
                    id="phone"
                    formControlName="phone"
                    placeholder="Enter phone number (optional)"
                    autocomplete="off"
                  />
                </div>
              </div>

              <hr class="section-divider" />

              <!-- Section 2 -->
              <div class="form-section">
                <h3 class="section-title">
                  <span class="step-number">2</span>
                  Platform Access
                </h3>

                <div class="form-group">
                  <label>Platform Role(s) *</label>
                  <div class="dropdown-wrapper">
                    <button
                      type="button"
                      class="dropdown-trigger"
                      (click)="dropdownOpen.set(!dropdownOpen())"
                    >
                      <span>{{ selectedRoleLabels() }}</span>
                      <svg viewBox="0 0 24 24" aria-hidden="true" class="icon-chevron" [class.open]="dropdownOpen()"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                    
                    @if (dropdownOpen()) {
                      <div class="dropdown-menu">
                        @if (availableRoles().length === 0) {
                          <div class="dropdown-no-roles">No platform roles available</div>
                        } @else {
                          @for (role of availableRoles(); track role.id) {
                            <label class="dropdown-item">
                              <input
                                type="checkbox"
                                [checked]="isRoleSelected(role.id)"
                                (change)="toggleRole(role.id, $any($event.target).checked)"
                              />
                              <div class="role-meta">
                                <span class="role-name">{{ role.name }}</span>
                                <span class="role-code">{{ role.code }}</span>
                              </div>
                            </label>
                          }
                        }
                      </div>
                    }
                  </div>
                  <span class="field-helper">Choose the platform role(s) this user will have access to.</span>
                  @if (createForm.touched && selectedRoleIds().length === 0) {
                    <span class="field-error">At least one platform role is required</span>
                  }
                </div>

                <div class="info-callout">
                  <svg viewBox="0 0 24 24" aria-hidden="true" class="icon-info"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                  <div class="callout-content">
                    <strong>An invitation email will be sent to this Platform User.</strong>
                    <span>They will use the invitation link to set up their account.</span>
                  </div>
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="btn outline" (click)="cancelCreate()" [disabled]="isSaving()">Cancel</button>
                <button
                  type="submit"
                  class="btn primary"
                  [disabled]="createForm.invalid || selectedRoleIds().length === 0 || isSaving()"
                >
                  {{ isSaving() ? 'Sending Invite...' : 'Save & Send Invite' }}
                </button>
              </div>
            </form>
          </section>

          <!-- RIGHT PANEL: Platform Users List -->
          <section class="right-panel card">
            <div class="right-panel-header">
              <div>
                <h2>Platform Users</h2>
                <p>Manage all Platform Admin users and their access.</p>
              </div>
              @if (canCreate()) {
                <button type="button" class="btn primary btn-sm" (click)="openCreate()" [disabled]="isAddingUser()">
                  <svg viewBox="0 0 24 24" aria-hidden="true" class="icon-plus"><path d="M12 5v14M5 12h14" /></svg>
                  Add Platform User
                </button>
              }
            </div>

            <!-- Inline Search and Filters -->
            <div class="table-search-row">
              <div class="search-wrap">
                <input
                  type="search"
                  placeholder="Search by name or email..."
                  [ngModel]="searchTerm()"
                  (ngModelChange)="onSearchInput($event)"
                />
                <svg viewBox="0 0 24 24" aria-hidden="true" class="icon-search"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              </div>
              <button type="button" class="btn outline btn-filter" [class.active]="filterPanelOpen() || activeFilterCount() > 0" (click)="toggleFilterPanel()">
                <svg viewBox="0 0 24 24" aria-hidden="true" class="icon-filter"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                Filters
                @if (activeFilterCount() > 0) {
                  <span class="filter-badge">{{ activeFilterCount() }}</span>
                }
              </button>
            </div>

            @if (filterPanelOpen()) {
              <div class="filter-drawer card">
                <div class="filter-group">
                  <label>Status</label>
                  <select [ngModel]="statusFilter()" (ngModelChange)="onStatusFilterChange($event)">
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="INVITED">Invited</option>
                    <option value="LOCKED">Locked</option>
                  </select>
                </div>
                <div class="filter-group">
                  <label>Role</label>
                  <select [ngModel]="roleFilter()" (ngModelChange)="onRoleFilterChange($event)">
                    <option value="">All Roles</option>
                    @for (role of availableRoles(); track role.id) {
                      <option [value]="role.code">{{ role.name }}</option>
                    }
                  </select>
                </div>
                <div class="filter-actions">
                  <button type="button" class="btn outline btn-sm" (click)="resetFilters()" [disabled]="activeFilterCount() === 0">Reset Filters</button>
                </div>
              </div>
            }

            @if (isLoading()) {
              <div class="state-card loading">Loading platform users...</div>
            } @else if (errorMessage()) {
              <div class="state-card error">
                <strong>Platform users could not be loaded</strong>
                <span>{{ errorMessage() }}</span>
                <button type="button" class="btn primary" (click)="loadPage()">Try again</button>
              </div>
            } @else if (filteredUsers().length) {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role(s)</th>
                      <th>Invitation Status</th>
                      <th>Invited On</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (user of filteredUsers(); track user.id) {
                      <tr class="user-row" tabindex="0" (click)="openEdit(user)" (keyup.enter)="openEdit(user)">
                        <td>
                          <div class="user-cell">
                            <span class="avatar" [style.background]="avatarColor(user.email)">{{ initials(user) }}</span>
                            <div class="user-meta">
                              <strong>{{ user.displayName || user.email }}</strong>
                              <small>{{ user.email }}</small>
                            </div>
                          </div>
                        </td>
                        <td class="cell-text">
                          <span class="role-badge">{{ roleLabel(user) }}</span>
                        </td>
                        <td>
                          <span class="status-badge" [class]="statusClass(user.status)">{{ user.status }}</span>
                        </td>
                        <td class="cell-text">{{ user.createdAt | date: 'mediumDate' }}</td>
                        <td>
                          <button type="button" class="btn-actions" aria-label="Actions">•••</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <footer class="pagination-row">
                <span class="pagination-count">Showing {{ showingStart() }} to {{ showingEnd() }} of {{ totalCount() }} users</span>
                <div class="pagination-controls">
                  <select [value]="pageSize()" (change)="onPageSizeChange($event)" class="page-size-select">
                    <option [value]="10">10 / page</option>
                    <option [value]="25">25 / page</option>
                    <option [value]="50">50 / page</option>
                  </select>
                  <button type="button" class="btn outline btn-icon" [disabled]="pageNumber() <= 1 || isLoading()" (click)="previousPage()">&lt;</button>
                  <span class="page-current">Page {{ pageNumber() }} of {{ totalPages() || 1 }}</span>
                  <button type="button" class="btn outline btn-icon" [disabled]="pageNumber() >= totalPages() || totalPages() === 0 || isLoading()" (click)="nextPage()">&gt;</button>
                </div>
              </footer>
            } @else {
              <div class="state-card empty">
                <strong>No platform users found</strong>
                <span>{{ activeFilterCount() > 0 ? 'Try clearing or adjusting your filters.' : 'No platform users available.' }}</span>
                @if (activeFilterCount() > 0) {
                  <button type="button" class="btn outline btn-sm" (click)="resetFilters()">Clear Filters</button>
                }
              </div>
            }
          </section>
        </div>
      } @else {
        <!-- Standard 100% Width Layout -->
        <section class="filters card">
          <div class="filters-grid">
            <label class="filter-field search-field">
              <span class="field-label">Search</span>
              <span class="input-wrap">
                <input
                  type="search"
                  placeholder="Search by name or email..."
                  [ngModel]="searchTerm()"
                  (ngModelChange)="onSearchInput($event)"
                />
                <svg viewBox="0 0 24 24" aria-hidden="true" class="icon-search"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              </span>
            </label>
            <label class="filter-field">
              <span class="field-label">Status</span>
              <select [ngModel]="statusFilter()" (ngModelChange)="onStatusFilterChange($event)" class="select-input">
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="INVITED">Invited</option>
                <option value="LOCKED">Locked</option>
              </select>
            </label>
            <label class="filter-field">
              <span class="field-label">Role</span>
              <select [ngModel]="roleFilter()" (ngModelChange)="onRoleFilterChange($event)" class="select-input">
                <option value="">All Roles</option>
                @for (role of availableRoles(); track role.id) {
                  <option [value]="role.code">{{ role.name }}</option>
                }
              </select>
            </label>
            <div class="filter-actions-col">
              <button type="button" class="btn outline" (click)="resetFilters()" [disabled]="activeFilterCount() === 0">Reset Filters</button>
            </div>
          </div>
        </section>

        @if (isLoading()) {
          <div class="state-card card">Loading platform users from the backend...</div>
        } @else if (errorMessage()) {
          <div class="state-card card error">
            <strong>Platform users could not be loaded</strong>
            <span>{{ errorMessage() }}</span>
            <button type="button" class="btn primary" (click)="loadPage()">Try again</button>
          </div>
        } @else if (filteredUsers().length) {
          <section class="table-card card">
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Roles</th>
                    <th>Permissions</th>
                    <th>Last Login</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  @for (user of filteredUsers(); track user.id) {
                    <tr class="user-row" tabindex="0" (click)="openEdit(user)" (keyup.enter)="openEdit(user)">
                      <td>
                        <div class="user-cell">
                          <span class="avatar" [style.background]="avatarColor(user.email)">{{ initials(user) }}</span>
                          <div class="user-meta">
                            <strong>{{ user.displayName || user.email }}</strong>
                            <small>{{ user.email }}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="status-badge" [class]="statusClass(user.status)">{{ user.status }}</span>
                      </td>
                      <td class="cell-text">{{ roleLabel(user) }}</td>
                      <td class="cell-num">{{ user.permissionCount }}</td>
                      <td class="cell-text">{{ user.lastLoginAt ? (user.lastLoginAt | date: 'medium') : '—' }}</td>
                      <td class="cell-text">{{ user.updatedAt | date: 'mediumDate' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <footer class="pagination-row">
              <span class="pagination-count">Showing {{ showingStart() }} to {{ showingEnd() }} of {{ totalCount() }} users</span>
              <div class="pagination-controls">
                <select [value]="pageSize()" (change)="onPageSizeChange($event)" class="page-size-select">
                  <option [value]="10">10 / page</option>
                  <option [value]="25">25 / page</option>
                  <option [value]="50">50 / page</option>
                </select>
                <button type="button" class="btn outline btn-icon" [disabled]="pageNumber() <= 1 || isLoading()" (click)="previousPage()">&lt;</button>
                <span class="page-current">Page {{ pageNumber() }} of {{ totalPages() || 1 }}</span>
                <button type="button" class="btn outline btn-icon" [disabled]="pageNumber() >= totalPages() || totalPages() === 0 || isLoading()" (click)="nextPage()">&gt;</button>
              </div>
            </footer>
          </section>
        } @else {
          <div class="state-card card empty">
            <strong>No platform users found</strong>
            <span>{{ activeFilterCount() > 0 ? 'Try clearing or adjusting your filter criteria.' : 'Add the first platform user to get started.' }}</span>
            @if (activeFilterCount() > 0) {
              <button type="button" class="btn outline" (click)="resetFilters()">Clear Filters</button>
            } @else if (canCreate()) {
              <button type="button" class="btn primary" (click)="openCreate()">Add Platform User</button>
            }
          </div>
        }
      }

      @if (editorOpen() && editorMode() === 'edit' && selectedUser(); as user) {
        <div class="editor-backdrop" (click)="closeEditor()"></div>
        <aside class="editor-panel card" role="dialog" aria-modal="true" aria-label="Edit platform user">
          <header class="editor-header">
            <div>
              <h2>Edit Platform User</h2>
              <p>{{ user.email }}</p>
            </div>
            <button type="button" class="icon-close" aria-label="Close" (click)="closeEditor()">×</button>
          </header>

          @if (editorError()) {
            <div class="editor-error" role="alert">{{ editorError() }}</div>
          }

          <div class="editor-form">
            <label>
              <span>Status</span>
              <select [ngModel]="editStatus()" (ngModelChange)="editStatus.set($event)" [disabled]="!canUpdate() || isSaving()">
                @for (option of statusOptions; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </label>
            @if (canUpdate()) {
              <button type="button" class="btn outline" [disabled]="isSaving() || editStatus() === user.status" (click)="saveStatus(user.id)">
                {{ isSaving() ? 'Saving...' : 'Save Status' }}
              </button>
            }

            <fieldset class="roles-fieldset">
              <legend>Platform roles</legend>
              @if (availableRoles().length === 0) {
                <p class="muted">No platform roles returned from the backend.</p>
              } @else {
                @for (role of availableRoles(); track role.id) {
                  <label class="role-option">
                    <input
                      type="checkbox"
                      [checked]="isRoleSelected(role.id)"
                      [disabled]="!canAssignRoles()"
                      (change)="toggleRole(role.id, $any($event.target).checked)"
                    />
                    <span>
                      <strong>{{ role.name }}</strong>
                      <small>{{ role.code }}</small>
                    </span>
                  </label>
                }
              }
            </fieldset>
            @if (canAssignRoles()) {
              <button type="button" class="btn primary" [disabled]="isSaving() || selectedRoleIds().length === 0" (click)="saveRoles(user.id)">
                {{ isSaving() ? 'Saving...' : 'Save Roles' }}
              </button>
            }

            @if (canUpdate() && canInitiatePasswordReset(user)) {
              <section class="reset-section">
                <h3>Password reset</h3>
                <p>Send a one-time reset link. The user sets a new password on the public reset page. Previous unused links stop working.</p>
                <button
                  type="button"
                  class="btn outline"
                  [disabled]="isSaving() || isResetting()"
                  (click)="openResetConfirm()"
                >
                  Send Password Reset
                </button>
                @if (resetDeliveryMessage()) {
                  <p class="reset-note">{{ resetDeliveryMessage() }}</p>
                }
                @if (adminResetUrl()) {
                  <div class="reset-link-box">
                    <label>
                      <span>Secure reset link</span>
                      <input type="text" readonly [value]="adminResetUrl()" />
                    </label>
                    <div class="reset-link-actions">
                      <button type="button" class="btn outline" (click)="copyAdminResetUrl()">Copy Link</button>
                      <a class="btn primary" [href]="adminResetUrl() ?? ''" target="_blank" rel="noopener noreferrer">Open Link</a>
                    </div>
                  </div>
                }
              </section>
            }
          </div>
        </aside>
      }

      <app-confirmation-dialog
        [isOpen]="resetConfirmOpen()"
        title="Send password reset?"
        [message]="resetConfirmMessage()"
        confirmLabel="Send Password Reset"
        cancelLabel="Cancel"
        [isLoading]="isResetting()"
        (confirm)="confirmPasswordReset()"
        (cancel)="closeResetConfirm()"
      />
    </section>
  `,
  styles: `
    :host { color: #14213d; display: block; }
    * { box-sizing: border-box; }

    .users-page { display: grid; gap: 1.5rem; position: relative; }

    .toast {
      background: #ecfdf3;
      border: 1px solid #abefc6;
      border-radius: 12px;
      color: #027a48;
      font-size: 0.88rem;
      font-weight: 600;
      padding: 0.85rem 1rem;
    }

    .page-heading {
      align-items: flex-start;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
    }

    .breadcrumb { color: #667085; display: flex; font-size: 0.82rem; gap: 0.5rem; margin-bottom: 0.5rem; }
    .breadcrumb .current { color: #344054; font-weight: 600; }
    .breadcrumb .link { color: #0b5cff; cursor: pointer; font-weight: 500; }
    .breadcrumb .link:hover { text-decoration: underline; }
    .breadcrumb .sep { color: #98a2b3; }
    
    h1 { font-size: 1.75rem; font-weight: 700; margin: 0; color: #101828; }
    .title-block p { color: #667085; font-size: 0.95rem; margin: 0.4rem 0 0; }
    .title-accent { display: block; height: 3px; margin-top: 0.75rem; width: 4rem; background: linear-gradient(90deg, #0b5cff, #5b9dff); border-radius: 99px; }

    .btn {
      align-items: center;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-size: 0.88rem;
      font-weight: 600;
      gap: 0.5rem;
      padding: 0.65rem 1.1rem;
      text-decoration: none;
      transition: all 0.2s ease-in-out;
    }
    .btn-sm { padding: 0.5rem 0.85rem; font-size: 0.8rem; }
    .btn-icon { padding: 0.5rem; border-radius: 6px; width: 32px; height: 32px; justify-content: center; }

    .btn svg { fill: none; height: 1.1rem; stroke: currentColor; stroke-linecap: round; stroke-width: 2; width: 1.1rem; }
    .btn.primary { background: #0b5cff; border: 1px solid #0b5cff; color: #fff; }
    .btn.primary:hover:not(:disabled) { background: #004bdf; border-color: #004bdf; }
    .btn.outline { background: #fff; border: 1px solid #d0d5dd; color: #344054; }
    .btn.outline:hover:not(:disabled) { background: #f9fafb; border-color: #c3c9d6; }
    .btn.outline.btn-filter.active { background: #eff8ff; border-color: #84caef; color: #175cd3; }
    .btn:disabled { cursor: not-allowed; opacity: 0.55; }

    .card { background: #fff; border: 1px solid #eaecf0; border-radius: 12px; box-shadow: 0 1px 3px rgba(16, 24, 40, 0.05), 0 1px 2px rgba(16, 24, 40, 0.03); }

    .layout-grid {
      display: grid;
      grid-template-columns: 4.1fr 5.9fr;
      gap: 24px;
      align-items: start;
    }

    .left-panel { padding: 24px; }
    .right-panel { padding: 24px; }

    .right-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .right-panel-header h2 { font-size: 1.25rem; font-weight: 700; margin: 0; color: #101828; }
    .right-panel-header p { color: #667085; font-size: 0.88rem; margin: 4px 0 0; }

    .table-search-row {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    .table-search-row .search-wrap { flex-grow: 1; position: relative; }
    .table-search-row .search-wrap input {
      width: 100%;
      height: 40px;
      padding: 0 40px 0 14px;
      border: 1px solid #d0d5dd;
      border-radius: 8px;
      font: inherit;
    }
    .table-search-row .search-wrap .icon-search {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      stroke: #667085;
      fill: none;
      stroke-width: 2;
    }
    .btn-filter { height: 40px; }
    .filter-badge {
      background: #0b5cff;
      color: #fff;
      border-radius: 99px;
      padding: 1px 7px;
      font-size: 0.72rem;
      font-weight: 700;
    }

    .filter-drawer {
      padding: 16px;
      margin-bottom: 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: flex-end;
      background: #f9fafb;
    }
    .filter-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 140px; }
    .filter-group label { font-size: 0.78rem; font-weight: 600; color: #344054; }
    .filter-group select {
      height: 38px;
      border: 1px solid #d0d5dd;
      border-radius: 8px;
      padding: 0 10px;
      font: inherit;
      background: #fff;
      color: #101828;
    }

    .r1-form { display: flex; flex-direction: column; gap: 20px; }
    .form-section { display: flex; flex-direction: column; gap: 16px; }
    .section-title {
      font-size: 1rem;
      font-weight: 700;
      color: #101828;
      margin: 0;
      display: flex;
      align-items: center;
    }
    .step-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: #0b5cff;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      margin-right: 12px;
    }

    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { color: #344054; font-size: 0.88rem; font-weight: 600; }
    .form-group input {
      height: 44px;
      border: 1px solid #d0d5dd;
      border-radius: 8px;
      padding: 0 14px;
      font: inherit;
      color: #101828;
      background: #fff;
    }
    .form-group input::placeholder { color: #98a2b3; }
    .field-helper { color: #667085; font-size: 0.78rem; }
    .field-error { color: #d92d20; font-size: 0.78rem; font-weight: 500; }

    .section-divider { border: 0; border-top: 1px solid #eaecf0; margin: 8px 0; }

    .dropdown-wrapper { position: relative; }
    .dropdown-trigger {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      height: 44px;
      padding: 0 14px;
      border: 1px solid #d0d5dd;
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
      text-align: left;
      font: inherit;
      color: #101828;
    }
    .dropdown-trigger span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 90%;
    }
    .dropdown-trigger .icon-chevron {
      width: 16px;
      height: 16px;
      stroke: #667085;
      fill: none;
      stroke-width: 2.5;
      transition: transform 0.2s ease;
    }
    .dropdown-trigger .icon-chevron.open { transform: rotate(180deg); }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      width: 100%;
      background: #fff;
      border: 1px solid #eaecf0;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(16, 24, 40, 0.08);
      z-index: 10;
      max-height: 220px;
      overflow-y: auto;
      margin-top: 4px;
      padding: 6px;
    }
    .dropdown-no-roles { padding: 12px; color: #667085; font-size: 0.88rem; text-align: center; }
    .dropdown-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 400;
    }
    .dropdown-item:hover { background-color: #f9fafb; }
    .dropdown-item input[type="checkbox"] {
      width: 16px;
      height: 16px;
      margin-top: 2px;
      cursor: pointer;
    }
    .role-meta { display: flex; flex-direction: column; gap: 2px; }
    .role-name { font-size: 0.88rem; font-weight: 600; color: #344054; }
    .role-code { font-size: 0.75rem; color: #667085; }

    .info-callout {
      display: flex;
      gap: 12px;
      background: #f5fafe;
      border: 1px solid #d1e9ff;
      border-radius: 8px;
      padding: 12px 16px;
      align-items: flex-start;
    }
    .info-callout .icon-info {
      width: 20px;
      height: 20px;
      stroke: #1570ef;
      fill: none;
      stroke-width: 2;
      flex-shrink: 0;
    }
    .callout-content { display: flex; flex-direction: column; gap: 2px; font-size: 0.82rem; }
    .callout-content strong { color: #175cd3; font-weight: 600; }
    .callout-content span { color: #3538cd; }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 8px;
    }

    .filters { padding: 1rem; }
    .filters-grid { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 1rem; align-items: end; }
    .filter-field { display: flex; flex-direction: column; gap: 0.35rem; }
    .field-label { color: #667085; font-size: 0.78rem; font-weight: 600; }
    .input-wrap { position: relative; }
    .input-wrap input { border: 1px solid #d0d5dd; border-radius: 10px; font: inherit; padding: 0.62rem 2.2rem 0.62rem 0.75rem; width: 100%; }
    .input-wrap svg { height: 1rem; left: auto; position: absolute; right: 0.75rem; stroke: #98a2b3; stroke-width: 1.75; top: 50%; transform: translateY(-50%); width: 1rem; fill: none; }
    .select-input { border: 1px solid #d0d5dd; border-radius: 10px; font: inherit; padding: 0.62rem 0.75rem; width: 100%; background: #fff; color: #101828; height: 42px; }

    .state-card { display: grid; gap: 0.65rem; padding: 1.5rem; text-align: center; font-size: 0.88rem; }
    .state-card.loading { color: #667085; }
    .state-card.error { color: #b42318; }
    .state-card.empty strong { color: #101828; }

    .table-wrap { overflow-x: auto; margin: 0 -24px; border-top: 1px solid #eaecf0; }
    table { border-collapse: collapse; min-width: 100%; width: 100%; }
    th, td { border-bottom: 1px solid #eaecf0; padding: 12px 24px; text-align: left; vertical-align: middle; }
    th { color: #667085; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; background: #f9fafb; }
    .user-row { cursor: pointer; transition: background 0.15s ease-in-out; }
    .user-row:hover { background: #f9fafb; }

    .user-cell { align-items: center; display: flex; gap: 12px; }
    .avatar { align-items: center; border-radius: 50%; color: #fff; display: inline-flex; font-size: 0.78rem; font-weight: 800; height: 32px; justify-content: center; width: 32px; }
    .user-meta { display: flex; flex-direction: column; gap: 2px; }
    .user-meta strong { font-size: 0.88rem; color: #344054; font-weight: 600; }
    .user-meta small { color: #667085; font-size: 0.78rem; }

    .status-badge { border-radius: 99px; display: inline-flex; font-size: 0.72rem; font-weight: 700; padding: 2px 8px; text-transform: capitalize; }
    .status-badge.active { background: #ecfdf3; color: #027a48; }
    .status-badge.inactive { background: #f2f4f7; color: #475467; }
    .status-badge.invited { background: #eff8ff; color: #175cd3; }
    .status-badge.locked { background: #fef3f2; color: #b42318; }
    
    .role-badge { color: #344054; font-size: 0.84rem; }
    .cell-text { color: #475467; font-size: 0.84rem; }
    .cell-num { color: #101828; font-size: 0.84rem; font-weight: 600; }
    .btn-actions { background: transparent; border: 0; color: #98a2b3; cursor: pointer; font-size: 1.1rem; padding: 4px; }
    .btn-actions:hover { color: #667085; }

    .pagination-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-top: 1px solid #eaecf0;
    }
    .pagination-count { color: #475467; font-size: 0.84rem; }
    .pagination-controls { display: flex; align-items: center; gap: 8px; }
    .page-size-select {
      height: 32px;
      border: 1px solid #d0d5dd;
      border-radius: 6px;
      padding: 0 8px;
      font-size: 0.8rem;
      background: #fff;
      color: #344054;
    }
    .page-current { font-size: 0.82rem; color: #344054; font-weight: 600; padding: 0 4px; }

    .editor-backdrop { background: rgba(16, 24, 40, 0.45); inset: 0; position: fixed; z-index: 20; }
    .editor-panel {
      display: grid;
      gap: 1rem;
      max-height: calc(100vh - 2rem);
      overflow: auto;
      padding: 1.5rem;
      position: fixed;
      right: 1rem;
      top: 1rem;
      width: min(28rem, calc(100vw - 2rem));
      z-index: 21;
    }

    .editor-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .editor-header h2 { margin: 0; font-size: 1.25rem; color: #101828; }
    .editor-header p { margin: 0.25rem 0 0; color: #667085; font-size: 0.85rem; }
    .icon-close { background: transparent; border: 0; font-size: 1.5rem; color: #667085; cursor: pointer; padding: 0; line-height: 1; }
    .editor-error { background: #fef3f2; border: 1px solid #fecdca; border-radius: 8px; color: #b42318; font-size: 0.84rem; padding: 0.75rem 1rem; }

    .editor-form { display: grid; gap: 1.25rem; }
    .editor-form label { display: grid; gap: 0.35rem; font-size: 0.85rem; color: #344054; font-weight: 600; }
    .editor-form select { border: 1px solid #d0d5dd; border-radius: 8px; font: inherit; padding: 0.6rem 0.75rem; background: #fff; }

    .roles-fieldset { border: 1px solid #eaecf0; border-radius: 8px; display: grid; gap: 0.65rem; padding: 0.85rem; margin: 0; }
    .roles-fieldset legend { color: #344054; font-size: 0.82rem; font-weight: 600; padding: 0 0.35rem; }
    .role-option { display: flex; align-items: flex-start; gap: 0.6rem; cursor: pointer; font-weight: 400; }
    .role-option input { margin-top: 0.25rem; }
    .role-option span { display: grid; gap: 0.15rem; }
    .role-option strong { color: #101828; font-size: 0.84rem; }
    .role-option small { color: #667085; font-size: 0.75rem; }

    .reset-section { border-top: 1px solid #eaecf0; display: grid; gap: 0.65rem; padding-top: 1rem; }
    .reset-section h3 { color: #101828; font-size: 0.95rem; font-weight: 700; margin: 0; }
    .reset-section p { color: #667085; font-size: 0.8rem; margin: 0; line-height: 1.4; }
    .reset-note { color: #027a48; font-weight: 600; }
    .reset-link-box { display: grid; gap: 0.65rem; }
    .reset-link-box input { width: 100%; }
    .reset-link-actions { display: flex; flex-wrap: wrap; gap: 0.55rem; }
  `
})
export class PlatformUsersPage {
  private readonly userApi = inject(PlatformUserApiService);
  private readonly roleApi = inject(PlatformRoleManagementApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly accessControl = inject(AccessControlService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly statusOptions = platformUserStatusOptions;
  readonly users = signal<PlatformUserSummary[]>([]);
  readonly availableRoles = signal<PlatformRoleSummary[]>([]);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly editorOpen = signal(false);
  readonly editorMode = signal<'create' | 'edit'>('edit');
  readonly selectedUser = signal<PlatformUserDetail | null>(null);
  readonly selectedRoleIds = signal<string[]>([]);
  readonly editStatus = signal('INACTIVE');
  readonly editorError = signal<string | null>(null);
  readonly isResetting = signal(false);
  readonly resetConfirmOpen = signal(false);
  readonly resetDeliveryMessage = signal<string | null>(null);
  readonly adminResetUrl = signal<string | null>(null);

  readonly isAddingUser = signal(false);
  readonly dropdownOpen = signal(false);

  // Server-side pagination & filter state
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  readonly statusFilter = signal('');
  readonly roleFilter = signal('');
  readonly filterPanelOpen = signal(false);

  readonly showingStart = computed(() => (this.totalCount() === 0 ? 0 : (this.pageNumber() - 1) * this.pageSize() + 1));
  readonly showingEnd = computed(() => Math.min(this.pageNumber() * this.pageSize(), this.totalCount()));
  readonly activeFilterCount = computed(() => (this.statusFilter() ? 1 : 0) + (this.roleFilter() ? 1 : 0) + (this.searchTerm().trim() ? 1 : 0));

  readonly createForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    phone: ['', [Validators.maxLength(20)]]
  });

  readonly filteredUsers = computed(() => this.users());

  constructor() {
    this.loadPage();
  }

  selectedRoleLabels(): string {
    const selectedIds = this.selectedRoleIds();
    if (selectedIds.length === 0) {
      return 'Select one or more roles';
    }
    const roles = this.availableRoles()
      .filter((role) => selectedIds.includes(role.id))
      .map((role) => role.name);
    return roles.join(', ');
  }

  canCreate(): boolean {
    return this.accessControl.hasPermission(platformPermissions.usersCreate);
  }

  canUpdate(): boolean {
    return this.accessControl.hasPermission(platformPermissions.usersUpdate);
  }

  canAssignRoles(): boolean {
    return this.accessControl.hasPermission(platformPermissions.usersRolesAssign);
  }

  canInitiatePasswordReset(user: PlatformUserDetail): boolean {
    if (user.invitePending) {
      return false;
    }

    const status = user.status.trim().toUpperCase();
    return status === 'ACTIVE' || status === 'LOCKED';
  }

  resetConfirmMessage(): string {
    const email = this.selectedUser()?.email ?? 'this user';
    return `Send a password reset email to ${email}? Their current password stays active until they complete the reset. Any previous unused reset link will stop working.`;
  }

  openResetConfirm(): void {
    this.editorError.set(null);
    this.resetConfirmOpen.set(true);
  }

  closeResetConfirm(): void {
    if (this.isResetting()) {
      return;
    }

    this.resetConfirmOpen.set(false);
  }

  confirmPasswordReset(): void {
    const user = this.selectedUser();
    if (!user || this.isResetting()) {
      return;
    }

    this.isResetting.set(true);
    this.editorError.set(null);
    this.resetDeliveryMessage.set(null);
    this.adminResetUrl.set(null);

    this.userApi.initiatePasswordReset(user.id).subscribe({
      next: (result) => {
        this.isResetting.set(false);
        this.resetConfirmOpen.set(false);
        this.resetDeliveryMessage.set(result.message);
        this.adminResetUrl.set(result.resetUrl);
        this.successMessage.set(result.message);
      },
      error: (error) => {
        this.isResetting.set(false);
        this.resetConfirmOpen.set(false);
        this.editorError.set(this.apiError.toSafeMessage(error));
      }
    });
  }

  copyAdminResetUrl(): void {
    const resetUrl = this.adminResetUrl();
    if (!resetUrl || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }

    void navigator.clipboard.writeText(resetUrl);
  }

  isRoleActive(status: string): boolean {
    return status.trim().toLowerCase() !== 'inactive';
  }

  loadPage(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      usersResponse: this.userApi.getUsers({
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize(),
        search: this.searchTerm(),
        status: this.statusFilter(),
        role: this.roleFilter()
      }),
      roles: this.roleApi.getRoles()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ usersResponse, roles }) => {
          this.users.set(usersResponse.users);
          this.pageNumber.set(usersResponse.pageNumber ?? 1);
          this.pageSize.set(usersResponse.pageSize ?? 10);
          this.totalCount.set(usersResponse.totalCount ?? usersResponse.users.length);
          this.totalPages.set(usersResponse.totalPages ?? (usersResponse.users.length > 0 ? 1 : 0));
          this.availableRoles.set(roles.roles.filter((role) => this.isRoleActive(role.status)));
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  fetchUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.userApi
      .getUsers({
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize(),
        search: this.searchTerm(),
        status: this.statusFilter(),
        role: this.roleFilter()
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.users.set(res.users);
          this.pageNumber.set(res.pageNumber ?? 1);
          this.pageSize.set(res.pageSize ?? 10);
          this.totalCount.set(res.totalCount ?? res.users.length);
          this.totalPages.set(res.totalPages ?? (res.users.length > 0 ? 1 : 0));
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.pageNumber.set(1);
    this.fetchUsers();
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.pageNumber.set(1);
    this.fetchUsers();
  }

  onRoleFilterChange(value: string): void {
    this.roleFilter.set(value);
    this.pageNumber.set(1);
    this.fetchUsers();
  }

  toggleFilterPanel(): void {
    this.filterPanelOpen.set(!this.filterPanelOpen());
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('');
    this.roleFilter.set('');
    this.pageNumber.set(1);
    this.fetchUsers();
  }

  goToPage(page: number): void {
    if (page < 1 || (this.totalPages() > 0 && page > this.totalPages()) || page === this.pageNumber()) {
      return;
    }
    this.pageNumber.set(page);
    this.fetchUsers();
  }

  previousPage(): void {
    this.goToPage(this.pageNumber() - 1);
  }

  nextPage(): void {
    this.goToPage(this.pageNumber() + 1);
  }

  onPageSizeChange(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value);
    if (size > 0 && size !== this.pageSize()) {
      this.pageSize.set(size);
      this.pageNumber.set(1);
      this.fetchUsers();
    }
  }

  openCreate(): void {
    this.isAddingUser.set(true);
    this.editorError.set(null);
    this.selectedRoleIds.set([]);
    this.createForm.reset({ fullName: '', email: '', phone: '' });
  }

  cancelCreate(): void {
    this.isAddingUser.set(false);
    this.editorError.set(null);
    this.selectedRoleIds.set([]);
    this.createForm.reset();
  }

  openEdit(user: PlatformUserSummary): void {
    this.editorMode.set('edit');
    this.editorError.set(null);
    this.resetDeliveryMessage.set(null);
    this.adminResetUrl.set(null);
    this.editorOpen.set(true);
    this.isSaving.set(true);

    this.userApi.getUserById(user.id).subscribe({
      next: (detail) => {
        this.selectedUser.set(detail);
        this.editStatus.set(detail.status);
        this.syncSelectedRolesFromUser(detail);
        this.isSaving.set(false);
      },
      error: (error) => {
        this.editorError.set(this.apiError.toSafeMessage(error));
        this.isSaving.set(false);
      }
    });
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.editorError.set(null);
    this.selectedUser.set(null);
    this.selectedRoleIds.set([]);
    this.resetConfirmOpen.set(false);
    this.resetDeliveryMessage.set(null);
    this.adminResetUrl.set(null);
  }

  isRoleSelected(roleId: string): boolean {
    return this.selectedRoleIds().includes(roleId);
  }

  toggleRole(roleId: string, checked: boolean): void {
    const current = new Set(this.selectedRoleIds());
    if (checked) {
      current.add(roleId);
    } else {
      current.delete(roleId);
    }
    this.selectedRoleIds.set([...current]);
  }

  submitCreate(): void {
    if (this.createForm.invalid || this.selectedRoleIds().length === 0) {
      return;
    }

    this.isSaving.set(true);
    this.editorError.set(null);

    const value = this.createForm.getRawValue();
    this.userApi
      .createUser({
        fullName: value.fullName,
        email: value.email,
        phone: value.phone || undefined,
        roleIds: this.selectedRoleIds()
      })
      .subscribe({
        next: (created) => {
          this.successMessage.set(`Platform user ${created.displayName || created.email} created. Invitation queued.`);
          this.isSaving.set(false);
          this.cancelCreate();
          this.fetchUsers();
        },
        error: (error) => {
          this.editorError.set(this.apiError.toSafeMessage(error));
          this.isSaving.set(false);
        }
      });
  }

  saveStatus(userId: string): void {
    this.isSaving.set(true);
    this.editorError.set(null);

    this.userApi.updateUser(userId, { status: this.editStatus() }).subscribe({
      next: (updated) => {
        this.applyUpdatedUser(updated);
        this.successMessage.set('Platform user status updated.');
        this.isSaving.set(false);
        this.fetchUsers();
      },
      error: (error) => {
        this.editorError.set(this.apiError.toSafeMessage(error));
        this.isSaving.set(false);
      }
    });
  }

  saveRoles(userId: string): void {
    if (this.selectedRoleIds().length === 0) {
      return;
    }

    this.isSaving.set(true);
    this.editorError.set(null);

    this.userApi.assignRoles(userId, { roleIds: this.selectedRoleIds() }).subscribe({
      next: (updated) => {
        this.applyUpdatedUser(updated);
        this.successMessage.set('Platform user roles updated.');
        this.isSaving.set(false);
        this.fetchUsers();
      },
      error: (error) => {
        this.editorError.set(this.apiError.toSafeMessage(error));
        this.isSaving.set(false);
      }
    });
  }

  roleLabel(user: PlatformUserSummary): string {
    if (user.roleNames.length) {
      return user.roleNames.join(', ');
    }

    return user.roleCodes.join(', ') || '—';
  }

  statusClass(status: string): string {
    return status.trim().toLowerCase();
  }

  initials(user: PlatformUserSummary): string {
    const source = user.displayName?.trim() || user.email;
    return source
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  avatarColor(seed: string): string {
    const palette = ['#0b5cff', '#7a5af8', '#12b76a', '#f79009', '#ef6820', '#2e90fa'];
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
      hash = seed.charCodeAt(index) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  }

  private syncSelectedRolesFromUser(user: PlatformUserDetail): void {
    const roleIds = this.availableRoles()
      .filter((role) => user.roleCodes.includes(role.code))
      .map((role) => role.id);

    this.selectedRoleIds.set(roleIds);
  }

  private applyUpdatedUser(updated: PlatformUserDetail): void {
    this.selectedUser.set(updated);
    this.editStatus.set(updated.status);
    this.syncSelectedRolesFromUser(updated);
    this.users.set(this.users().map((user) => (user.id === updated.id ? updated : user)));
  }
}
