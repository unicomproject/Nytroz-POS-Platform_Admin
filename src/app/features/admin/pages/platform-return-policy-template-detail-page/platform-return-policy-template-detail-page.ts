import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import {
  ReturnPolicyTemplateDetail,
  ReturnPolicyTemplateStatus,
  returnPolicyTemplateStatusOptions
} from '../../models/platform-return-policy-template.model';
import { PlatformReturnPolicyTemplateApiService } from '../../services/platform-return-policy-template-api.service';
import {
  canDeleteReturnPolicyTemplates,
  canUpdateReturnPolicyTemplates,
  canViewReturnPolicyTemplates
} from '../../utils/return-policy-template-access.util';

@Component({
  selector: 'app-platform-return-policy-template-detail-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  template: `
    <section class="template-page">
      <header class="page-heading">
        <div class="title-block">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <a routerLink="/admin/return-policy-templates">Return Policy Templates</a>
            <span aria-hidden="true">/</span>
            <span class="current">{{ template()?.templateCode || 'Detail' }}</span>
          </nav>
          <h1>{{ template()?.name || 'Return Policy Template' }}</h1>
          <p>View and update platform return policy template details.</p>
        </div>
        <div class="heading-actions">
          @if (!isEditing() && canUpdate()) {
            <button type="button" class="btn outline" (click)="startEdit()">Edit</button>
          }
          @if (canDelete() && template()) {
            <button type="button" class="btn danger" [disabled]="isSaving() || isDeleting()" (click)="confirmDelete()">
              {{ isDeleting() ? 'Deleting...' : 'Delete' }}
            </button>
          }
        </div>
      </header>

      @if (isLoading()) {
        <div class="state-card card">Loading return policy template...</div>
      } @else if (errorMessage()) {
        <div class="state-card card error">
          <strong>Template could not be loaded</strong>
          <span>{{ errorMessage() }}</span>
          <button type="button" class="btn primary" (click)="reload()">Try again</button>
        </div>
      } @else if (template(); as item) {
        @if (successMessage()) {
          <div class="banner success" role="status">{{ successMessage() }}</div>
        }
        @if (saveError()) {
          <div class="banner error" role="alert">{{ saveError() }}</div>
        }

        @if (isEditing()) {
          <section class="card form-card">
            <form [formGroup]="form" class="template-form" (ngSubmit)="saveChanges()">
              <label class="field">
                <span class="field-label">Template Code <span class="required">*</span></span>
                <input type="text" formControlName="templateCode" maxlength="80" />
                @if (fieldMessage('templateCode', 'Template code')) {
                  <small class="error">{{ fieldMessage('templateCode', 'Template code') }}</small>
                }
              </label>
              <label class="field">
                <span class="field-label">Name <span class="required">*</span></span>
                <input type="text" formControlName="name" maxlength="200" />
                @if (fieldMessage('name', 'Name')) {
                  <small class="error">{{ fieldMessage('name', 'Name') }}</small>
                }
              </label>
              <label class="field">
                <span class="field-label">Return Window (days)</span>
                <input type="number" min="0" formControlName="returnWindowDays" />
                @if (fieldMessage('returnWindowDays', 'Return window days')) {
                  <small class="error">{{ fieldMessage('returnWindowDays', 'Return window days') }}</small>
                }
              </label>
              <label class="field">
                <span class="field-label">Status <span class="required">*</span></span>
                <select formControlName="status">
                  @for (option of statusOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
              <div class="actions">
                <button type="button" class="btn outline" (click)="cancelEdit()">Cancel</button>
                <button type="submit" class="btn primary" [disabled]="isSaving() || form.invalid">{{ isSaving() ? 'Saving...' : 'Save Changes' }}</button>
              </div>
            </form>
          </section>
        } @else {
          <section class="card detail-card">
            <dl class="detail-grid">
              <div><dt>Template Code</dt><dd><code>{{ item.templateCode }}</code></dd></div>
              <div><dt>Name</dt><dd>{{ item.name }}</dd></div>
              <div><dt>Return Window (days)</dt><dd>{{ item.returnWindowDays ?? '—' }}</dd></div>
              <div><dt>Status</dt><dd><span class="status-badge" [class]="statusClass(item.status)">{{ item.status }}</span></dd></div>
              <div><dt>Created</dt><dd>{{ item.createdAt | date: 'medium' }}</dd></div>
              <div><dt>Updated</dt><dd>{{ item.updatedAt ? (item.updatedAt | date: 'medium') : '—' }}</dd></div>
            </dl>
          </section>
        }
      }
    </section>
  `,
  styles: `
    :host { display: block; color: #14213d; }
    .template-page { display: grid; gap: 1rem; }
    .page-heading { align-items: flex-start; display: flex; gap: 1rem; justify-content: space-between; flex-wrap: wrap; }
    .heading-actions { display: flex; gap: 0.65rem; flex-wrap: wrap; }
    .breadcrumb { align-items: center; display: flex; gap: 0.45rem; font-size: 0.78rem; margin-bottom: 0.45rem; }
    .breadcrumb a { color: #0b5cff; text-decoration: none; font-weight: 700; }
    .breadcrumb .current { color: #344054; font-weight: 700; }
    .title-block h1 { margin: 0; font-size: clamp(1.5rem, 2.2vw, 1.9rem); }
    .title-block p { color: #667085; margin: 0.35rem 0 0; }
    .card { background: #fff; border: 1px solid #e5eaf2; border-radius: 13px; box-shadow: 0 7px 22px rgba(31, 51, 86, 0.045); }
    .detail-card, .form-card { padding: 1.25rem; max-width: 42rem; }
    .detail-grid { display: grid; gap: 0.85rem; margin: 0; }
    .detail-grid div { display: grid; gap: 0.2rem; }
    dt { color: #667085; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; }
    dd { margin: 0; font-size: 0.92rem; }
    .status-badge { border-radius: 999px; display: inline-block; font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.55rem; text-transform: uppercase; }
    .status-badge.active { background: #dcfce7; color: #15803d; }
    .status-badge.inactive { background: #e2e8f0; color: #475569; }
    .template-form { display: grid; gap: 1rem; }
    .field { display: grid; gap: 0.35rem; }
    .field-label { font-size: 0.78rem; font-weight: 700; color: #344054; }
    .required { color: #b42318; }
    input, select { border: 1px solid #d0d5dd; border-radius: 10px; font: inherit; padding: 0.65rem 0.75rem; width: 100%; }
    .error { color: #b42318; font-size: 0.75rem; }
    .banner.success { background: #ecfdf3; border: 1px solid #abefc6; border-radius: 10px; color: #067647; padding: 0.75rem 1rem; }
    .banner.error, .state-card.error { background: #fef3f2; border: 1px solid #fecdca; border-radius: 10px; color: #b42318; padding: 0.75rem 1rem; }
    .state-card { padding: 2rem; text-align: center; }
    .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .btn { align-items: center; border-radius: 10px; cursor: pointer; display: inline-flex; font-size: 0.84rem; font-weight: 700; padding: 0.65rem 1rem; text-decoration: none; border: 1px solid transparent; }
    .btn.primary { background: #0b5cff; border-color: #0b5cff; color: #fff; }
    .btn.outline { background: #fff; border-color: #d0d5dd; color: #344054; }
    .btn.danger { background: #fff; border-color: #fda29b; color: #b42318; }
    .btn:disabled { cursor: not-allowed; opacity: 0.65; }
  `
})
export class PlatformReturnPolicyTemplateDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PlatformReturnPolicyTemplateApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly accessControl = inject(AccessControlService);
  private readonly destroyRef = inject(DestroyRef);

  readonly statusOptions = returnPolicyTemplateStatusOptions;
  readonly template = signal<ReturnPolicyTemplateDetail | null>(null);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isDeleting = signal(false);
  readonly isEditing = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly canUpdate = computed(() => canUpdateReturnPolicyTemplates(this.accessControl));
  readonly canDelete = computed(() => canDeleteReturnPolicyTemplates(this.accessControl));

  readonly form = this.fb.nonNullable.group({
    templateCode: ['', [Validators.required, Validators.maxLength(80)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    returnWindowDays: this.fb.control<number | null>(null, [Validators.min(0)]),
    status: ['ACTIVE' as ReturnPolicyTemplateStatus, Validators.required]
  });

  ngOnInit(): void {
    if (!canViewReturnPolicyTemplates(this.accessControl)) {
      this.isLoading.set(false);
      this.errorMessage.set('You do not have permission to view return policy templates.');
      return;
    }

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reload());
  }

  reload(): void {
    const templateId = this.route.snapshot.paramMap.get('templateId');
    if (!templateId) {
      this.errorMessage.set('Template id is missing.');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.api
      .getTemplate(templateId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.template.set(detail);
          this.patchForm(detail);
          this.isLoading.set(false);
          this.isEditing.set(false);
        },
        error: (error) => {
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  startEdit(): void {
    const item = this.template();
    if (!item || !this.canUpdate()) return;
    this.patchForm(item);
    this.isEditing.set(true);
    this.saveError.set(null);
  }

  cancelEdit(): void {
    const item = this.template();
    if (item) this.patchForm(item);
    this.isEditing.set(false);
    this.saveError.set(null);
  }

  saveChanges(): void {
    const item = this.template();
    if (!item || !this.canUpdate() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);
    const value = this.form.getRawValue();

    this.api
      .updateTemplate(item.id, {
        templateCode: value.templateCode,
        name: value.name,
        returnWindowDays: value.returnWindowDays,
        status: value.status
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.template.set(updated);
          this.patchForm(updated);
          this.isSaving.set(false);
          this.isEditing.set(false);
          this.successMessage.set('Return policy template updated successfully.');
        },
        error: (error) => {
          this.isSaving.set(false);
          this.saveError.set(this.apiError.toSafeMessage(error));
          this.apiError.applyFieldErrors(this.apiError.toFieldErrors(error), {
            templateCode: this.form.controls.templateCode,
            name: this.form.controls.name,
            returnWindowDays: this.form.controls.returnWindowDays,
            status: this.form.controls.status
          });
        }
      });
  }

  confirmDelete(): void {
    const item = this.template();
    if (!item || !this.canDelete()) return;
    if (!window.confirm(`Delete return policy template "${item.name}"?`)) return;

    this.isDeleting.set(true);
    this.saveError.set(null);

    this.api
      .deleteTemplate(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDeleting.set(false);
          void this.router.navigate(['/admin/return-policy-templates']);
        },
        error: (error) => {
          this.isDeleting.set(false);
          this.saveError.set(this.apiError.toSafeMessage(error));
        }
      });
  }

  statusClass(status: string): string {
    return status.toLowerCase();
  }

  fieldMessage(controlName: 'templateCode' | 'name' | 'returnWindowDays' | 'status', label: string): string | null {
    const control = this.form.controls[controlName];
    if (!control.touched && !control.dirty) return null;
    if (control.hasError('required')) return `${label} is required.`;
    if (control.hasError('maxlength')) return `${label} is too long.`;
    if (control.hasError('min')) return `${label} must be zero or greater.`;
    if (control.hasError('server')) return String(control.getError('server'));
    return null;
  }

  private patchForm(item: ReturnPolicyTemplateDetail): void {
    this.form.patchValue({
      templateCode: item.templateCode,
      name: item.name,
      returnWindowDays: item.returnWindowDays,
      status: item.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });
  }
}
