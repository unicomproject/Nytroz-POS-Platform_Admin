import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { PlatformRoleSummary } from '../../models/platform-role-management.model';
import { platformUserStatusOptions, PlatformUserDetail, PlatformUserSummary } from '../../models/platform-user.model';
import { PlatformRoleManagementApiService } from '../../services/platform-role-management-api.service';
import { PlatformUserApiService } from '../../services/platform-user-api.service';

@Component({
  selector: 'app-platform-users-page',
  standalone: true,
  imports: [DatePipe, FormsModule, ReactiveFormsModule],
  template: `
    <section class="users-page">
      @if (successMessage()) {
        <div class="toast success" role="status">{{ successMessage() }}</div>
      }

      <header class="page-heading">
        <div class="title-block">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <span>Platform</span>
            <span aria-hidden="true">/</span>
            <span class="current">Users</span>
          </nav>
          <h1>Platform Users</h1>
          <p>Manage internal platform staff accounts and role assignments.</p>
          <span class="title-accent" aria-hidden="true"></span>
        </div>
        @if (canCreate()) {
          <button type="button" class="btn primary" (click)="openCreate()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Add Platform User
          </button>
        }
      </header>

      <section class="filters card">
        <label class="filter-field search-field">
          <span class="field-label">Search</span>
          <span class="input-wrap">
            <input
              type="search"
              placeholder="Search by email or role..."
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
            />
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          </span>
        </label>
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
                        <span class="user-meta">
                          <strong>{{ user.displayName || user.email }}</strong>
                          <small>{{ user.email }}</small>
                        </span>
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
        </section>
      } @else {
        <div class="state-card card empty">
          <strong>No platform users found</strong>
          <span>{{ searchTerm() ? 'Try a different search term.' : 'Add the first platform user to get started.' }}</span>
          @if (canCreate() && !searchTerm()) {
            <button type="button" class="btn primary" (click)="openCreate()">Add Platform User</button>
          }
        </div>
      }

      @if (editorOpen()) {
        <div class="editor-backdrop" (click)="closeEditor()"></div>
        <aside class="editor-panel card" role="dialog" aria-modal="true" [attr.aria-label]="editorMode() === 'create' ? 'Create platform user' : 'Edit platform user'">
          <header class="editor-header">
            <div>
              <h2>{{ editorMode() === 'create' ? 'Add Platform User' : 'Edit Platform User' }}</h2>
              @if (selectedUser(); as user) {
                <p>{{ user.email }}</p>
              }
            </div>
            <button type="button" class="icon-close" aria-label="Close" (click)="closeEditor()">×</button>
          </header>

          @if (editorError()) {
            <div class="editor-error" role="alert">{{ editorError() }}</div>
          }

          @if (editorMode() === 'create') {
            <form class="editor-form" [formGroup]="createForm" (ngSubmit)="submitCreate()">
              <label>
                <span>Email *</span>
                <input type="email" formControlName="email" autocomplete="off" />
              </label>
              <label>
                <span>Status *</span>
                <select formControlName="status">
                  @for (option of statusOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
              <fieldset class="roles-fieldset">
                <legend>Platform roles *</legend>
                @if (availableRoles().length === 0) {
                  <p class="muted">No platform roles returned from the backend.</p>
                } @else {
                  @for (role of availableRoles(); track role.id) {
                    <label class="role-option">
                      <input
                        type="checkbox"
                        [checked]="isRoleSelected(role.id)"
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
              <footer class="editor-actions">
                <button type="button" class="btn outline" (click)="closeEditor()">Cancel</button>
                <button type="submit" class="btn primary" [disabled]="createForm.invalid || selectedRoleIds().length === 0 || isSaving()">
                  {{ isSaving() ? 'Creating...' : 'Create User' }}
                </button>
              </footer>
            </form>
          } @else if (selectedUser(); as user) {
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
            </div>
          }
        </aside>
      }
    </section>
  `,
  styles: `
    :host { color: #14213d; display: block; }
    * { box-sizing: border-box; }

    .users-page { display: grid; gap: 1.15rem; position: relative; }

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

    .breadcrumb { color: #667085; display: flex; font-size: 0.78rem; gap: 0.35rem; margin-bottom: 0.35rem; }
    .breadcrumb .current { color: #344054; font-weight: 600; }
    h1 { font-size: 1.55rem; margin: 0; }
    .title-block p { color: #667085; font-size: 0.9rem; margin: 0.35rem 0 0; }
    .title-accent { display: block; height: 3px; margin-top: 0.65rem; width: 3.5rem; background: linear-gradient(90deg, #0b5cff, #5b9dff); border-radius: 99px; }

    .btn {
      align-items: center;
      border-radius: 10px;
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-size: 0.86rem;
      font-weight: 700;
      gap: 0.45rem;
      padding: 0.62rem 0.95rem;
      text-decoration: none;
    }

    .btn svg { fill: none; height: 1rem; stroke: currentColor; stroke-linecap: round; stroke-width: 1.75; width: 1rem; }
    .btn.primary { background: #0b5cff; border: 1px solid #0b5cff; color: #fff; }
    .btn.outline { background: #fff; border: 1px solid #d0d5dd; color: #344054; }
    .btn:disabled { cursor: not-allowed; opacity: 0.55; }

    .card { background: #fff; border: 1px solid #eaecf0; border-radius: 14px; box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05); }

    .filters { display: grid; gap: 0.85rem; padding: 1rem; }
    .filter-field { display: grid; gap: 0.35rem; }
    .field-label { color: #667085; font-size: 0.78rem; font-weight: 600; }
    .input-wrap { position: relative; }
    .input-wrap input { border: 1px solid #d0d5dd; border-radius: 10px; font: inherit; padding: 0.62rem 2.2rem 0.62rem 0.75rem; width: 100%; }
    .input-wrap svg { height: 1rem; left: auto; position: absolute; right: 0.75rem; stroke: #98a2b3; stroke-width: 1.75; top: 50%; transform: translateY(-50%); width: 1rem; fill: none; }

    .state-card { display: grid; gap: 0.65rem; padding: 1.25rem; text-align: center; }
    .state-card.error { color: #b42318; }
    .state-card.empty strong { color: #101828; }

    .table-wrap { overflow-x: auto; }
    table { border-collapse: collapse; min-width: 760px; width: 100%; }
    th, td { border-bottom: 1px solid #f2f4f7; padding: 0.85rem 1rem; text-align: left; vertical-align: middle; }
    th { color: #667085; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
    .user-row { cursor: pointer; }
    .user-row:hover { background: #f9fafb; }

    .user-cell { align-items: center; display: flex; gap: 0.75rem; }
    .avatar { align-items: center; border-radius: 50%; color: #fff; display: inline-flex; font-size: 0.78rem; font-weight: 800; height: 2.2rem; justify-content: center; width: 2.2rem; }
    .user-meta { display: grid; gap: 0.12rem; }
    .user-meta small { color: #667085; font-size: 0.76rem; }

    .status-badge { border-radius: 99px; display: inline-flex; font-size: 0.72rem; font-weight: 700; padding: 0.25rem 0.55rem; }
    .status-badge.active { background: #ecfdf3; color: #027a48; }
    .status-badge.inactive { background: #f2f4f7; color: #475467; }
    .status-badge.locked { background: #fef3f2; color: #b42318; }
    .status-badge.deleted { background: #fef3f2; color: #912018; }

    .pill.invite { background: #eff8ff; border-radius: 99px; color: #175cd3; display: inline-flex; font-size: 0.68rem; font-weight: 700; margin-left: 0.35rem; padding: 0.15rem 0.45rem; }
    .cell-text { color: #344054; font-size: 0.84rem; }
    .cell-num { color: #101828; font-size: 0.84rem; font-weight: 600; }

    .editor-backdrop { background: rgba(16, 24, 40, 0.45); inset: 0; position: fixed; z-index: 20; }
    .editor-panel {
      display: grid;
      gap: 1rem;
      max-height: calc(100vh - 2rem);
      overflow: auto;
      padding: 1.15rem;
      position: fixed;
      right: 1rem;
      top: 1rem;
      width: min(28rem, calc(100vw - 2rem));
      z-index: 21;
    }

    .editor-header { align-items: flex-start; display: flex; justify-content: space-between; }
    .editor-header h2 { font-size: 1.15rem; margin: 0; }
    .editor-header p { color: #667085; font-size: 0.82rem; margin: 0.25rem 0 0; }
    .icon-close { background: transparent; border: 0; color: #667085; cursor: pointer; font-size: 1.5rem; line-height: 1; }

    .editor-error { background: #fef3f2; border: 1px solid #fecdca; border-radius: 10px; color: #b42318; font-size: 0.84rem; padding: 0.75rem; }
    .editor-form { display: grid; gap: 0.85rem; }
    .editor-form label { display: grid; gap: 0.35rem; font-size: 0.82rem; font-weight: 600; }
    .editor-form input, .editor-form select { border: 1px solid #d0d5dd; border-radius: 10px; font: inherit; padding: 0.62rem 0.75rem; }

    .roles-fieldset { border: 1px solid #eaecf0; border-radius: 12px; display: grid; gap: 0.55rem; margin: 0; padding: 0.85rem; }
    .roles-fieldset legend { color: #344054; font-size: 0.82rem; font-weight: 700; padding: 0 0.25rem; }
    .role-option { align-items: flex-start; display: flex; gap: 0.55rem; font-weight: 400; }
    .role-option span { display: grid; gap: 0.1rem; }
    .role-option small { color: #667085; font-size: 0.74rem; }
    .muted { color: #667085; font-size: 0.82rem; margin: 0; }

    .editor-actions { display: flex; gap: 0.65rem; justify-content: flex-end; }
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
  readonly editorMode = signal<'create' | 'edit'>('create');
  readonly selectedUser = signal<PlatformUserDetail | null>(null);
  readonly selectedRoleIds = signal<string[]>([]);
  readonly editStatus = signal('INACTIVE');
  readonly editorError = signal<string | null>(null);

  readonly createForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    status: ['INACTIVE', Validators.required]
  });

  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const items = this.users();

    if (!term) {
      return items;
    }

    return items.filter((user) => {
      const haystack = [
        user.email,
        user.displayName ?? '',
        ...user.roleNames,
        ...user.roleCodes,
        user.status
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  });

  constructor() {
    this.loadPage();
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

  isRoleActive(status: string): boolean {
    return status.trim().toLowerCase() !== 'inactive';
  }

  loadPage(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      users: this.userApi.getUsers(),
      roles: this.roleApi.getRoles()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ users, roles }) => {
          this.users.set(users.users);
          this.availableRoles.set(roles.roles.filter((role) => this.isRoleActive(role.status)));
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  openCreate(): void {
    this.editorMode.set('create');
    this.selectedUser.set(null);
    this.selectedRoleIds.set([]);
    this.editorError.set(null);
    this.createForm.reset({ email: '', status: 'INACTIVE' });
    this.editorOpen.set(true);
  }

  openEdit(user: PlatformUserSummary): void {
    this.editorMode.set('edit');
    this.editorError.set(null);
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
        email: value.email,
        status: value.status,
        roleIds: this.selectedRoleIds()
      })
      .subscribe({
        next: (created) => {
          this.users.set([created, ...this.users()]);
          this.successMessage.set(`Platform user ${created.email} created.`);
          this.isSaving.set(false);
          this.closeEditor();
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
