import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { PlatformSettings, UpdatePlatformSettingsRequest } from '../../models/platform-settings.model';
import { TenantCreateLookupOption } from '../../models/platform-tenant-create.model';
import { PlatformSettingsApiService } from '../../services/platform-settings-api.service';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import {
  controlValidationMessage,
  isoCountryCodeValidator,
  isoCurrencyCodeValidator
} from '../../validators/platform-tenant-create.validators';

interface SettingsFormValue {
  platformDisplayName: string;
  supportEmail: string;
  defaultCountryCode: string;
  defaultCurrencyCode: string;
  defaultTimezone: string;
  defaultLocale: string;
}

@Component({
  selector: 'app-platform-system-settings-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="settings-page">
      <header class="page-heading">
        <div class="title-block">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <span>Platform</span>
            <span aria-hidden="true">/</span>
            <span class="current">System Settings</span>
          </nav>
          <h1>System Settings</h1>
          <p>Manage global platform defaults for new tenants and platform communication.</p>
          <span class="title-accent" aria-hidden="true"></span>
        </div>
      </header>

      @if (isLoading()) {
        <div class="state-card card">Loading platform settings from the backend...</div>
      } @else if (errorMessage()) {
        <div class="state-card card error">
          <strong>Platform settings could not be loaded</strong>
          <span>{{ errorMessage() }}</span>
          <button type="button" class="btn primary" (click)="loadPageData()">Try again</button>
        </div>
      } @else {
        @if (successMessage()) {
          <div class="banner success" role="status">{{ successMessage() }}</div>
        }

        @if (saveError()) {
          <div class="banner error" role="alert">{{ saveError() }}</div>
        }

        @if (!canUpdate()) {
          <div class="banner read-only" role="status">
            You have view-only access. Contact a platform administrator to update system settings.
          </div>
        }

        <div class="content-grid">
          <section class="card form-card">
            <header class="card-heading">
              <h2>General Platform Settings</h2>
            </header>

            <form [formGroup]="form" class="settings-form" (ngSubmit)="saveChanges()">
              <div class="field-grid">
                <label class="field">
                  <span class="field-label">Platform Display Name <span class="required">*</span></span>
                  <input type="text" formControlName="platformDisplayName" [readonly]="!canUpdate()" />
                  @if (fieldMessage('platformDisplayName', 'Platform display name')) {
                    <small class="error">{{ fieldMessage('platformDisplayName', 'Platform display name') }}</small>
                  }
                </label>

                <label class="field">
                  <span class="field-label">Support Email</span>
                  <input type="email" formControlName="supportEmail" [readonly]="!canUpdate()" />
                  @if (fieldMessage('supportEmail', 'Support email')) {
                    <small class="error">{{ fieldMessage('supportEmail', 'Support email') }}</small>
                  }
                </label>

                <label class="field">
                  <span class="field-label">Default Country <span class="required">*</span></span>
                  <select formControlName="defaultCountryCode">
                    <option value="">Select country</option>
                    @for (item of countryOptions(); track item.value) {
                      <option [value]="item.value">{{ item.label }}</option>
                    }
                  </select>
                  @if (optionsError()) {
                    <small class="error">{{ optionsError() }}</small>
                  } @else if (fieldMessage('defaultCountryCode', 'Default country')) {
                    <small class="error">{{ fieldMessage('defaultCountryCode', 'Default country') }}</small>
                  }
                </label>

                <label class="field">
                  <span class="field-label">Default Currency <span class="required">*</span></span>
                  <select formControlName="defaultCurrencyCode">
                    <option value="">Select currency</option>
                    @for (item of currencyOptions(); track item.value) {
                      <option [value]="item.value">{{ item.label }}</option>
                    }
                  </select>
                  @if (fieldMessage('defaultCurrencyCode', 'Default currency')) {
                    <small class="error">{{ fieldMessage('defaultCurrencyCode', 'Default currency') }}</small>
                  }
                </label>

                <label class="field">
                  <span class="field-label">Default Timezone <span class="required">*</span></span>
                  <select formControlName="defaultTimezone">
                    <option value="">Select timezone</option>
                    @for (item of timezoneOptions(); track item.value) {
                      <option [value]="item.value">{{ item.label }}</option>
                    }
                  </select>
                  @if (fieldMessage('defaultTimezone', 'Default timezone')) {
                    <small class="error">{{ fieldMessage('defaultTimezone', 'Default timezone') }}</small>
                  }
                </label>

                <label class="field">
                  <span class="field-label">Default Locale <span class="required">*</span></span>
                  <select formControlName="defaultLocale">
                    <option value="">Select locale</option>
                    @for (item of localeOptions(); track item.value) {
                      <option [value]="item.value">{{ item.label }}</option>
                    }
                  </select>
                  @if (fieldMessage('defaultLocale', 'Default locale')) {
                    <small class="error">{{ fieldMessage('defaultLocale', 'Default locale') }}</small>
                  }
                </label>
              </div>

              <div class="info-callout" role="note">
                <span class="info-icon" aria-hidden="true">i</span>
                <p>These defaults are used for platform-level configuration and tenant creation defaults.</p>
              </div>
            </form>
          </section>

          <aside class="card summary-card">
            <header class="card-heading">
              <h2>Configuration Summary</h2>
            </header>

            <dl class="summary-list">
              <div>
                <dt>Platform Display Name</dt>
                <dd>{{ summaryValue(form.controls.platformDisplayName.value) }}</dd>
              </div>
              <div>
                <dt>Support Email</dt>
                <dd>{{ summaryValue(form.controls.supportEmail.value) }}</dd>
              </div>
              <div>
                <dt>Default Country</dt>
                <dd>{{ lookupLabel(countryOptions(), form.controls.defaultCountryCode.value) }}</dd>
              </div>
              <div>
                <dt>Default Currency</dt>
                <dd>{{ lookupLabel(currencyOptions(), form.controls.defaultCurrencyCode.value) }}</dd>
              </div>
              <div>
                <dt>Default Timezone</dt>
                <dd>{{ lookupLabel(timezoneOptions(), form.controls.defaultTimezone.value) }}</dd>
              </div>
              <div>
                <dt>Default Locale</dt>
                <dd>{{ lookupLabel(localeOptions(), form.controls.defaultLocale.value) }}</dd>
              </div>
            </dl>
          </aside>
        </div>

        @if (canUpdate()) {
          <footer class="action-bar">
            <button type="button" class="secondary-button" [disabled]="!isDirty() || isSaving()" (click)="resetChanges()">
              Reset Changes
            </button>
            <button type="button" class="primary-button" [disabled]="!canSave()" (click)="saveChanges()">
              {{ isSaving() ? 'Saving...' : 'Save Changes' }}
            </button>
          </footer>
        }
      }
    </section>
  `,
  styles: `
    :host { color: #14213d; display: block; }
    * { box-sizing: border-box; }

    .settings-page {
      display: grid;
      gap: 1.15rem;
      padding-bottom: 5.5rem;
    }

    .page-heading { align-items: flex-start; display: flex; gap: 1.25rem; }

    .breadcrumb {
      align-items: center;
      color: #667085;
      display: flex;
      font-size: 0.78rem;
      gap: 0.45rem;
      margin-bottom: 0.45rem;
    }

    .breadcrumb .current { color: #155eef; font-weight: 700; }

    h1 {
      color: #10243b;
      font-size: 1.55rem;
      line-height: 1.2;
      margin: 0;
    }

    h2 {
      color: #10243b;
      font-size: 1rem;
      margin: 0;
    }

    .page-heading p {
      color: #5f738a;
      font-size: 0.88rem;
      line-height: 1.45;
      margin: 0.35rem 0 0;
      max-width: 46rem;
    }

    .title-accent {
      background: linear-gradient(90deg, #155eef, #60a5fa);
      border-radius: 999px;
      display: block;
      height: 3px;
      margin-top: 0.75rem;
      width: 3.5rem;
    }

    .card {
      background: #fff;
      border: 1px solid #e4e7ec;
      border-radius: 14px;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
    }

    .state-card {
      display: grid;
      gap: 0.65rem;
      padding: 1.25rem;
    }

    .state-card.error strong { color: #b42318; }

    .banner {
      border-radius: 10px;
      font-size: 0.86rem;
      padding: 0.75rem 1rem;
    }

    .banner.success {
      background: #ecfdf3;
      border: 1px solid #abefc6;
      color: #067647;
    }

    .banner.error {
      background: #fef3f2;
      border: 1px solid #fecdca;
      color: #b42318;
    }

    .banner.read-only {
      background: #f8fafc;
      border: 1px solid #e4e7ec;
      color: #475467;
    }

    .content-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.8fr);
    }

    .form-card,
    .summary-card {
      padding: 1.15rem 1.25rem 1.25rem;
    }

    .card-heading {
      border-bottom: 1px solid #edf2f7;
      margin-bottom: 1rem;
      padding-bottom: 0.85rem;
    }

    .settings-form { display: grid; gap: 1rem; }

    .field-grid {
      display: grid;
      gap: 0.95rem 1rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .field {
      display: grid;
      gap: 0.35rem;
    }

    .field-label {
      color: #344054;
      font-size: 0.82rem;
      font-weight: 700;
    }

    .required { color: #d92d20; }

    input,
    select {
      background: #fff;
      border: 1px solid #d0d5dd;
      border-radius: 8px;
      color: #10243b;
      font: inherit;
      min-height: 2.5rem;
      padding: 0.55rem 0.75rem;
      width: 100%;
    }

    input:focus,
    select:focus {
      border-color: #84adff;
      box-shadow: 0 0 0 3px rgba(21, 94, 239, 0.12);
      outline: none;
    }

    input[readonly],
    select:disabled {
      background: #f9fafb;
      color: #667085;
      cursor: not-allowed;
    }

    .error {
      color: #d92d20;
      font-size: 0.76rem;
    }

    .info-callout {
      align-items: flex-start;
      background: #eff8ff;
      border: 1px solid #b2ddff;
      border-radius: 10px;
      display: flex;
      gap: 0.65rem;
      padding: 0.85rem 0.95rem;
    }

    .info-icon {
      align-items: center;
      background: #155eef;
      border-radius: 999px;
      color: #fff;
      display: inline-flex;
      flex-shrink: 0;
      font-size: 0.72rem;
      font-weight: 800;
      height: 1.2rem;
      justify-content: center;
      width: 1.2rem;
    }

    .info-callout p {
      color: #175cd3;
      font-size: 0.82rem;
      line-height: 1.45;
      margin: 0;
    }

    .summary-list {
      display: grid;
      gap: 0.85rem;
      margin: 0;
    }

    .summary-list div {
      display: grid;
      gap: 0.2rem;
    }

    .summary-list dt {
      color: #667085;
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .summary-list dd {
      color: #10243b;
      font-size: 0.9rem;
      font-weight: 600;
      margin: 0;
      word-break: break-word;
    }

    .action-bar {
      align-items: center;
      background: rgba(255, 255, 255, 0.96);
      border-top: 1px solid #e4e7ec;
      bottom: 0;
      display: flex;
      gap: 0.65rem;
      justify-content: flex-end;
      left: 0;
      margin: 0 -1.5rem;
      padding: 0.85rem 1.5rem;
      position: sticky;
      z-index: 5;
    }

    .primary-button,
    .secondary-button,
    .btn.primary {
      border-radius: 8px;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      min-height: 2.5rem;
      padding: 0.55rem 1rem;
    }

    .primary-button {
      background: #155eef;
      border: 1px solid #155eef;
      color: #fff;
    }

    .primary-button:disabled,
    .secondary-button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .secondary-button,
    .btn.primary {
      background: #fff;
      border: 1px solid #d0d5dd;
      color: #344054;
    }

    .btn.primary {
      justify-self: start;
      width: fit-content;
    }

    @media (max-width: 960px) {
      .content-grid,
      .field-grid {
        grid-template-columns: 1fr;
      }
    }
  `
})
export class PlatformSystemSettingsPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly settingsApi = inject(PlatformSettingsApiService);
  private readonly tenantApi = inject(PlatformTenantApiService);
  private readonly accessControl = inject(AccessControlService);
  private readonly apiErrorService = inject(ApiErrorService);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly optionsError = signal<string | null>(null);

  readonly countryOptions = signal<TenantCreateLookupOption[]>([]);
  readonly currencyOptions = signal<TenantCreateLookupOption[]>([]);
  readonly timezoneOptions = signal<TenantCreateLookupOption[]>([]);
  readonly localeOptions = signal<TenantCreateLookupOption[]>([]);

  private readonly loadedSettings = signal<PlatformSettings | null>(null);

  readonly form = this.fb.nonNullable.group({
    platformDisplayName: ['', Validators.required],
    supportEmail: ['', Validators.email],
    defaultCountryCode: ['', [Validators.required, isoCountryCodeValidator()]],
    defaultCurrencyCode: ['', [Validators.required, isoCurrencyCodeValidator()]],
    defaultTimezone: ['', Validators.required],
    defaultLocale: ['', Validators.required]
  });

  readonly canUpdate = computed(() => this.accessControl.hasPermission(platformPermissions.settingsUpdate));

  readonly isDirty = computed(() => {
    const loaded = this.loadedSettings();
    if (!loaded) {
      return false;
    }

    return this.serializeForm(this.form.getRawValue()) !== this.serializeSettings(loaded);
  });

  readonly canSave = computed(() => this.canUpdate() && this.isDirty() && !this.isSaving() && this.form.valid);

  ngOnInit(): void {
    this.loadPageData();
    this.applyReadOnlyState();

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.saveError.set(null);
      this.successMessage.set(null);
    });
  }

  loadPageData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    forkJoin({
      settings: this.settingsApi.getSettings(),
      options: this.tenantApi.getCreateOptions()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ settings, options }) => {
          this.loadedSettings.set(settings);
          this.countryOptions.set(options.countryCodes);
          this.currencyOptions.set(options.currencies);
          this.timezoneOptions.set(options.timezones);
          this.localeOptions.set(options.locales);
          this.optionsError.set(options.countryCodes.length ? null : 'Lookup options could not be loaded.');
          this.patchFormFromSettings(settings);
          this.applyReadOnlyState();
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set(this.apiErrorService.toSafeMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  resetChanges(): void {
    const loaded = this.loadedSettings();
    if (!loaded) {
      return;
    }

    this.patchFormFromSettings(loaded);
    this.form.markAsPristine();
    this.saveError.set(null);
    this.successMessage.set(null);
  }

  saveChanges(): void {
    if (!this.canUpdate() || this.isSaving()) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.saveError.set('Fix the highlighted fields before saving.');
      return;
    }

    const request = this.toUpdateRequest(this.form.getRawValue());
    this.isSaving.set(true);
    this.saveError.set(null);
    this.successMessage.set(null);

    this.settingsApi
      .updateSettings(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          this.loadedSettings.set(settings);
          this.patchFormFromSettings(settings);
          this.form.markAsPristine();
          this.isSaving.set(false);
          this.successMessage.set('Platform settings saved successfully.');
        },
        error: (error) => {
          this.isSaving.set(false);
          this.saveError.set(this.apiErrorService.toSafeMessage(error));
          this.apiErrorService.applyFieldErrors(this.apiErrorService.toFieldErrors(error), {
            platformDisplayName: this.form.controls.platformDisplayName,
            supportEmail: this.form.controls.supportEmail,
            defaultCountryCode: this.form.controls.defaultCountryCode,
            defaultCurrencyCode: this.form.controls.defaultCurrencyCode,
            defaultTimezone: this.form.controls.defaultTimezone,
            defaultLocale: this.form.controls.defaultLocale
          });
        }
      });
  }

  fieldMessage(controlName: keyof SettingsFormValue, label: string): string | null {
    return controlValidationMessage(this.form.controls[controlName], label);
  }

  lookupLabel(options: TenantCreateLookupOption[], value: string | null | undefined): string {
    const normalized = value?.trim();
    if (!normalized) {
      return '—';
    }

    return options.find((item) => item.value === normalized)?.label ?? normalized;
  }

  summaryValue(value: string | null | undefined): string {
    const normalized = value?.trim();
    return normalized ? normalized : '—';
  }

  private applyReadOnlyState(): void {
    if (this.canUpdate()) {
      this.form.enable({ emitEvent: false });
      return;
    }

    this.form.disable({ emitEvent: false });
  }

  private patchFormFromSettings(settings: PlatformSettings): void {
    this.form.patchValue(
      {
        platformDisplayName: settings.platformDisplayName ?? '',
        supportEmail: settings.supportEmail ?? '',
        defaultCountryCode: settings.defaultCountryCode ?? '',
        defaultCurrencyCode: settings.defaultCurrencyCode ?? '',
        defaultTimezone: settings.defaultTimezone ?? '',
        defaultLocale: settings.defaultLocale ?? ''
      },
      { emitEvent: false }
    );
  }

  private toUpdateRequest(value: SettingsFormValue): UpdatePlatformSettingsRequest {
    const supportEmail = value.supportEmail.trim();
    return {
      platformDisplayName: value.platformDisplayName.trim(),
      supportEmail: supportEmail ? supportEmail : null,
      defaultCountryCode: value.defaultCountryCode.trim(),
      defaultCurrencyCode: value.defaultCurrencyCode.trim(),
      defaultTimezone: value.defaultTimezone.trim(),
      defaultLocale: value.defaultLocale.trim()
    };
  }

  private serializeSettings(settings: PlatformSettings): string {
    return JSON.stringify({
      platformDisplayName: settings.platformDisplayName?.trim() ?? '',
      supportEmail: settings.supportEmail?.trim() ?? '',
      defaultCountryCode: settings.defaultCountryCode?.trim().toUpperCase() ?? '',
      defaultCurrencyCode: settings.defaultCurrencyCode?.trim().toUpperCase() ?? '',
      defaultTimezone: settings.defaultTimezone?.trim() ?? '',
      defaultLocale: settings.defaultLocale?.trim() ?? ''
    });
  }

  private serializeForm(value: SettingsFormValue): string {
    return JSON.stringify({
      platformDisplayName: value.platformDisplayName.trim(),
      supportEmail: value.supportEmail.trim(),
      defaultCountryCode: value.defaultCountryCode.trim().toUpperCase(),
      defaultCurrencyCode: value.defaultCurrencyCode.trim().toUpperCase(),
      defaultTimezone: value.defaultTimezone.trim(),
      defaultLocale: value.defaultLocale.trim()
    });
  }
}
