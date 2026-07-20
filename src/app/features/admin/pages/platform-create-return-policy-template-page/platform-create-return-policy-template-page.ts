import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { returnPolicyTemplateStatusOptions, ReturnPolicyTemplateStatus } from '../../models/platform-return-policy-template.model';
import { PlatformReturnPolicyTemplateApiService } from '../../services/platform-return-policy-template-api.service';
import { canCreateReturnPolicyTemplates } from '../../utils/return-policy-template-access.util';

@Component({
  selector: 'app-platform-create-return-policy-template-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="template-page">
      <header class="page-heading">
        <div class="title-block">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <a routerLink="/admin/return-policy-templates">Return Policy Templates</a>
            <span aria-hidden="true">/</span>
            <span class="current">Create</span>
          </nav>
          <h1>Create Return Policy Template</h1>
          <p>Add a reusable platform return policy template.</p>
        </div>
      </header>

      @if (accessDenied()) {
        <div class="state-card card error">You do not have permission to create return policy templates.</div>
      } @else {
        @if (saveError()) {
          <div class="banner error" role="alert">{{ saveError() }}</div>
        }

        <section class="card form-card">
          <form [formGroup]="form" class="template-form" (ngSubmit)="submit()">
            <label class="field">
              <span class="field-label">Template Code <span class="required">*</span></span>
              <input type="text" formControlName="templateCode" maxlength="80" placeholder="e.g. 7DAYS" />
              @if (fieldMessage('templateCode', 'Template code')) {
                <small class="error">{{ fieldMessage('templateCode', 'Template code') }}</small>
              }
            </label>

            <label class="field">
              <span class="field-label">Name <span class="required">*</span></span>
              <input type="text" formControlName="name" maxlength="200" placeholder="Display name" />
              @if (fieldMessage('name', 'Name')) {
                <small class="error">{{ fieldMessage('name', 'Name') }}</small>
              }
            </label>

            <label class="field">
              <span class="field-label">Return Window (days)</span>
              <input type="number" min="0" formControlName="returnWindowDays" placeholder="Leave blank for no window" />
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
              <a class="btn outline" routerLink="/admin/return-policy-templates">Cancel</a>
              <button type="submit" class="btn primary" [disabled]="isSaving() || form.invalid">{{ isSaving() ? 'Saving...' : 'Create Template' }}</button>
            </div>
          </form>
        </section>
      }
    </section>
  `,
  styles: `
    :host { display: block; color: #14213d; }
    .template-page { display: grid; gap: 1rem; }
    .breadcrumb { align-items: center; display: flex; gap: 0.45rem; font-size: 0.78rem; margin-bottom: 0.45rem; }
    .breadcrumb a { color: #0b5cff; text-decoration: none; font-weight: 700; }
    .breadcrumb .current { color: #344054; font-weight: 700; }
    .title-block h1 { margin: 0; font-size: clamp(1.5rem, 2.2vw, 1.9rem); }
    .title-block p { color: #667085; margin: 0.35rem 0 0; }
    .card { background: #fff; border: 1px solid #e5eaf2; border-radius: 13px; box-shadow: 0 7px 22px rgba(31, 51, 86, 0.045); }
    .form-card { padding: 1.25rem; max-width: 42rem; }
    .template-form { display: grid; gap: 1rem; }
    .field { display: grid; gap: 0.35rem; }
    .field-label { font-size: 0.78rem; font-weight: 700; color: #344054; }
    .required { color: #b42318; }
    input, select { border: 1px solid #d0d5dd; border-radius: 10px; font: inherit; padding: 0.65rem 0.75rem; width: 100%; }
    .error { color: #b42318; font-size: 0.75rem; }
    .banner.error, .state-card.error { background: #fef3f2; border: 1px solid #fecdca; border-radius: 10px; color: #b42318; padding: 0.75rem 1rem; }
    .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .btn { align-items: center; border-radius: 10px; cursor: pointer; display: inline-flex; font-size: 0.84rem; font-weight: 700; padding: 0.65rem 1rem; text-decoration: none; border: 1px solid transparent; }
    .btn.primary { background: #0b5cff; border-color: #0b5cff; color: #fff; }
    .btn.outline { background: #fff; border-color: #d0d5dd; color: #344054; }
    .btn:disabled { cursor: not-allowed; opacity: 0.65; }
  `
})
export class PlatformCreateReturnPolicyTemplatePage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PlatformReturnPolicyTemplateApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly accessControl = inject(AccessControlService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly statusOptions = returnPolicyTemplateStatusOptions;
  readonly isSaving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly accessDenied = signal(!canCreateReturnPolicyTemplates(this.accessControl));

  readonly form = this.fb.nonNullable.group({
    templateCode: ['', [Validators.required, Validators.maxLength(80)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    returnWindowDays: this.fb.control<number | null>(null, [Validators.min(0)]),
    status: ['ACTIVE' as ReturnPolicyTemplateStatus, Validators.required]
  });

  submit(): void {
    if (this.accessDenied() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);
    const value = this.form.getRawValue();

    this.api
      .createTemplate({
        templateCode: value.templateCode,
        name: value.name,
        returnWindowDays: value.returnWindowDays,
        status: value.status
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.isSaving.set(false);
          void this.router.navigate(['/admin/return-policy-templates', created.id]);
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

  fieldMessage(controlName: 'templateCode' | 'name' | 'returnWindowDays' | 'status', label: string): string | null {
    const control = this.form.controls[controlName];
    if (!control.touched && !control.dirty) return null;
    if (control.hasError('required')) return `${label} is required.`;
    if (control.hasError('maxlength')) return `${label} is too long.`;
    if (control.hasError('min')) return `${label} must be zero or greater.`;
    if (control.hasError('server')) return String(control.getError('server'));
    return null;
  }
}
