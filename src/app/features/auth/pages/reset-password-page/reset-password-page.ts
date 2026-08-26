import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { AuthApiService } from '../../services/auth-api.service';
import {
  extractResetErrorCode,
  isRateLimited,
  mapCompleteResetErrorCode,
  mapValidateTokenResponse,
  resetPasswordStateMessage,
  ResetPasswordViewState
} from '../../utils/password-reset-error.util';
import {
  platformPasswordErrorMessage,
  platformPasswordPolicyValidator,
  passwordsMatchValidator
} from '../../validators/platform-password.validators';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="reset-page">
      <section class="reset-card" [attr.aria-busy]="viewState() === 'validating' || isSubmitting()">
        <a class="brand-mark" routerLink="/login" aria-label="OneVerz Platform Administration">
          <span class="shield" aria-hidden="true">
            <svg viewBox="0 0 32 38" role="img">
              <path d="M16 2 29 7v10c0 8.6-5.1 15.5-13 19-7.9-3.5-13-10.4-13-19V7l13-5Z" />
              <rect x="10.5" y="16" width="11" height="9" rx="1.7" />
              <path d="M12.8 16v-3.1a3.2 3.2 0 0 1 6.4 0V16" />
            </svg>
          </span>
          <span>
            <strong>OneVerz</strong>
            <small>Platform Administration</small>
          </span>
        </a>

        @if (viewState() === 'validating') {
          <h1>Reset your password</h1>
          <p class="subtitle">Checking your reset linkâ€¦</p>
          <div class="loading-row" role="status">Validating reset link</div>
        } @else if (viewState() === 'success') {
          <h1>Password reset successful</h1>
          <p class="subtitle">You can now sign in with your new password.</p>
          <p class="success-banner" role="status">{{ successMessage() }}</p>
          <a class="submit-button" routerLink="/login">Back to Sign In</a>
        } @else if (viewState() === 'valid') {
          <h1>Reset your password</h1>
          <p class="subtitle">Choose a new password for your Platform Admin account.</p>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field-group">
              <label for="newPassword">New Password</label>
              <div class="input-shell">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                <input
                  id="newPassword"
                  [type]="isNewPasswordVisible() ? 'text' : 'password'"
                  formControlName="newPassword"
                  autocomplete="new-password"
                  placeholder="Enter a new password"
                  [attr.aria-invalid]="showNewPasswordError()"
                  aria-describedby="new-password-error"
                />
                <button
                  class="icon-button"
                  type="button"
                  [attr.aria-label]="isNewPasswordVisible() ? 'Hide password' : 'Show password'"
                  (click)="toggleNewPasswordVisibility()"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    @if (isNewPasswordVisible()) {
                      <path d="m3 3 18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c5 0 8.8 4 10 8a11.8 11.8 0 0 1-3 4.7" />
                      <path d="M6.4 6.4A11.8 11.8 0 0 0 2 12c1.2 4 5 8 10 8 1.7 0 3.3-.5 4.7-1.3" />
                    } @else {
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    }
                  </svg>
                </button>
              </div>
              @if (showNewPasswordError()) {
                <p class="field-error" id="new-password-error">{{ newPasswordErrorMessage() }}</p>
              }
            </div>

            <div class="field-group">
              <label for="confirmPassword">Confirm Password</label>
              <div class="input-shell">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                <input
                  id="confirmPassword"
                  [type]="isConfirmPasswordVisible() ? 'text' : 'password'"
                  formControlName="confirmPassword"
                  autocomplete="new-password"
                  placeholder="Confirm your new password"
                  [attr.aria-invalid]="showConfirmPasswordError()"
                  aria-describedby="confirm-password-error"
                />
                <button
                  class="icon-button"
                  type="button"
                  [attr.aria-label]="isConfirmPasswordVisible() ? 'Hide confirm password' : 'Show confirm password'"
                  (click)="toggleConfirmPasswordVisibility()"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    @if (isConfirmPasswordVisible()) {
                      <path d="m3 3 18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c5 0 8.8 4 10 8a11.8 11.8 0 0 1-3 4.7" />
                      <path d="M6.4 6.4A11.8 11.8 0 0 0 2 12c1.2 4 5 8 10 8 1.7 0 3.3-.5 4.7-1.3" />
                    } @else {
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    }
                  </svg>
                </button>
              </div>
              @if (showConfirmPasswordError()) {
                <p class="field-error" id="confirm-password-error">{{ confirmPasswordErrorMessage() }}</p>
              }
            </div>

            @if (formError()) {
              <p class="form-error" role="alert">{{ formError() }}</p>
            }

            <button class="submit-button" type="submit" [disabled]="isSubmitting()">
              {{ isSubmitting() ? 'Resetting Password' : 'Reset Password' }}
            </button>
          </form>
        } @else {
          <h1>{{ errorTitle() }}</h1>
          <p class="subtitle">{{ resetPasswordStateMessage(viewState()) }}</p>
          @if (viewState() === 'failure') {
            <p class="form-error" role="alert">{{ formError() || resetPasswordStateMessage('failure') }}</p>
            <button class="submit-button" type="button" (click)="retryValidation()">Try again</button>
          }
          <a class="text-link" routerLink="/login">Back to Sign In</a>
        }
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
    }

    .reset-page {
      background: #f6f8fc;
      display: grid;
      min-height: 100dvh;
      overflow-x: hidden;
      padding: clamp(1rem, 4vh, 3rem) clamp(1rem, 4vw, 2.5rem);
      place-items: center;
    }

    .reset-card {
      background: #fff;
      border: 1px solid rgba(217, 225, 236, 0.9);
      border-radius: 18px;
      box-shadow: 0 24px 70px rgba(15, 35, 71, 0.11);
      display: grid;
      gap: clamp(0.85rem, 1.8vh, 1.25rem);
      max-width: 32.5rem;
      padding: clamp(1.5rem, 4vh, 3rem) clamp(1.4rem, 4vw, 2.75rem);
      width: min(100%, 32.5rem);
    }

    .brand-mark {
      align-items: center;
      color: inherit;
      display: inline-flex;
      gap: 0.75rem;
      justify-self: start;
      text-decoration: none;
    }

    .brand-mark strong,
    .brand-mark small {
      display: block;
    }

    .brand-mark strong {
      color: #0f2347;
      font-size: 1.35rem;
      line-height: 1;
    }

    .brand-mark small {
      color: #6b7280;
      font-size: 0.85rem;
      font-weight: 600;
      margin-top: 0.2rem;
    }

    .shield {
      color: #3b82ff;
      display: inline-flex;
      width: 2.6rem;
    }

    svg {
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
      width: 100%;
    }

    h1 {
      color: #0f2347;
      font-size: clamp(1.7rem, 3vw, 2.15rem);
      line-height: 1.15;
      margin: 0.35rem 0 0;
    }

    .subtitle {
      color: #6b7280;
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
    }

    form {
      display: grid;
      gap: 1rem;
    }

    .field-group {
      display: grid;
      gap: 0.45rem;
    }

    label {
      color: #17233d;
      font-weight: 800;
    }

    .input-shell {
      align-items: center;
      border: 1px solid #d9e1ec;
      border-radius: 8px;
      display: grid;
      gap: 0.8rem;
      grid-template-columns: 1.25rem 1fr auto;
      min-height: 3.25rem;
      padding: 0 1.1rem;
    }

    .input-shell:focus-within {
      border-color: var(--border-focus, #0b5cff);
      box-shadow: var(--shadow-focus);
    }

    .input-shell svg {
      color: #7b8aa4;
      height: 1.25rem;
    }

    input[type='password'],
    input[type='text'] {
      border: 0;
      color: #0f2347;
      font: inherit;
      font-weight: 650;
      min-width: 0;
      outline: 0;
      width: 100%;
    }

    input::placeholder {
      color: #8995aa;
      font-weight: 650;
    }

    .icon-button {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 8px;
      color: #7b8aa4;
      cursor: pointer;
      display: inline-flex;
      height: 2.25rem;
      justify-content: center;
      padding: 0;
      width: 2.25rem;
    }

    .icon-button:hover,
    .icon-button:focus-visible {
      color: #0b5cff;
      outline: 0;
    }

    .field-error,
    .form-error {
      color: #b42318;
      font-size: 0.9rem;
      font-weight: 650;
      margin: 0;
    }

    .form-error {
      background: #fff1f0;
      border: 1px solid #ffd3cf;
      border-radius: 8px;
      padding: 0.85rem 1rem;
    }

    .success-banner {
      background: #ecfdf3;
      border: 1px solid #abefc6;
      border-radius: 8px;
      color: #027a48;
      font-weight: 650;
      margin: 0;
      padding: 0.85rem 1rem;
    }

    .loading-row {
      color: #344054;
      font-weight: 650;
    }

    .submit-button {
      align-items: center;
      background: var(--primary, #0b5cff);
      border: 0;
      border-radius: var(--radius-md, 8px);
      box-shadow: var(--shadow-md);
      color: var(--text-inverse, #fff);
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-size: 1.05rem;
      font-weight: 850;
      justify-content: center;
      min-height: 3.4rem;
      padding: 0 1.4rem;
      text-decoration: none;
      width: 100%;
    }

    .submit-button:hover,
    .submit-button:focus-visible {
      background: var(--primary-hover, #084fe1);
      outline: 0;
    }

    .submit-button:disabled {
      background: var(--text-disabled, #8fb2ff);
      box-shadow: none;
      cursor: not-allowed;
    }

    .text-link {
      color: #0b5cff;
      font-weight: 800;
      justify-self: start;
      text-decoration: none;
    }

    .text-link:hover,
    .text-link:focus-visible {
      text-decoration: underline;
    }
  `
})
export class ResetPasswordPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly authApi = inject(AuthApiService);
  private readonly apiError = inject(ApiErrorService);
  private resetToken = '';

  readonly viewState = signal<ResetPasswordViewState>('validating');
  readonly isSubmitting = signal(false);
  readonly wasSubmitted = signal(false);
  readonly formError = signal<string | null>(null);
  readonly successMessage = signal('Password reset successful');
  readonly isNewPasswordVisible = signal(false);
  readonly isConfirmPasswordVisible = signal(false);
  readonly resetPasswordStateMessage = resetPasswordStateMessage;

  readonly form = this.formBuilder.group(
    {
      newPassword: ['', [platformPasswordPolicyValidator()]],
      confirmPassword: ['', [platformPasswordPolicyValidator()]]
    },
    { validators: passwordsMatchValidator('newPassword', 'confirmPassword') }
  );

  constructor() {
    this.resetToken = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
    this.validateToken();
  }

  errorTitle(): string {
    switch (this.viewState()) {
      case 'expired':
        return 'Reset link expired';
      case 'used':
        return 'Reset link already used';
      case 'revoked':
        return 'Reset link no longer valid';
      case 'unavailable':
        return 'Account cannot be reset';
      case 'failure':
        return 'Password reset failed';
      default:
        return 'Invalid reset link';
    }
  }

  showNewPasswordError(): boolean {
    const control = this.form.controls.newPassword;
    return control.invalid && (control.touched || this.wasSubmitted());
  }

  showConfirmPasswordError(): boolean {
    const control = this.form.controls.confirmPassword;
    const mismatch = this.form.hasError('passwordMismatch');
    return (control.invalid || mismatch) && (control.touched || this.wasSubmitted());
  }

  newPasswordErrorMessage(): string {
    return platformPasswordErrorMessage(this.form.controls.newPassword);
  }

  confirmPasswordErrorMessage(): string {
    if (this.form.hasError('passwordMismatch') && this.form.controls.confirmPassword.value) {
      return 'Passwords must match.';
    }

    if (this.form.controls.confirmPassword.hasError('required')) {
      return 'Confirm password is required.';
    }

    return platformPasswordErrorMessage(this.form.controls.confirmPassword);
  }

  toggleNewPasswordVisibility(): void {
    this.isNewPasswordVisible.update((current) => !current);
  }

  toggleConfirmPasswordVisibility(): void {
    this.isConfirmPasswordVisible.update((current) => !current);
  }

  retryValidation(): void {
    this.formError.set(null);
    this.viewState.set('validating');
    this.validateToken();
  }

  submit(): void {
    this.wasSubmitted.set(true);
    this.formError.set(null);

    if (this.isSubmitting() || this.viewState() !== 'valid') {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.resetToken) {
      this.viewState.set('invalid');
      return;
    }

    this.isSubmitting.set(true);
    const { newPassword, confirmPassword } = this.form.getRawValue();

    this.authApi
      .completePasswordReset({
        token: this.resetToken,
        newPassword,
        confirmPassword
      })
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          this.resetToken = '';
          this.successMessage.set(response.message || 'Password reset successful');
          this.viewState.set('success');
        },
        error: (error: unknown) => {
          this.isSubmitting.set(false);
          this.applyCompleteError(error);
        }
      });
  }

  private validateToken(): void {
    if (!this.resetToken) {
      this.viewState.set('invalid');
      return;
    }

    this.authApi.validatePasswordResetToken(this.resetToken).subscribe({
      next: (response) => {
        this.viewState.set(mapValidateTokenResponse(response));
      },
      error: (error: unknown) => {
        if (isRateLimited(error)) {
          this.formError.set('Too many attempts. Please wait a moment and try again.');
        } else {
          this.formError.set(this.apiError.toSafeMessage(error));
        }
        this.viewState.set('failure');
      }
    });
  }

  private applyCompleteError(error: unknown): void {
    if (isRateLimited(error)) {
      this.formError.set('Too many attempts. Please wait a moment and try again.');
      return;
    }

    const mapped = mapCompleteResetErrorCode(extractResetErrorCode(error));

    if (mapped === 'mismatch') {
      this.formError.set('Passwords must match.');
      return;
    }

    if (mapped === 'password') {
      const message = this.apiError.toSafeMessage(error);
      this.form.controls.newPassword.setErrors({
        ...(this.form.controls.newPassword.errors ?? {}),
        server: message
      });
      this.form.controls.newPassword.markAsTouched();
      return;
    }

    if (
      mapped === 'invalid' ||
      mapped === 'expired' ||
      mapped === 'used' ||
      mapped === 'revoked' ||
      mapped === 'unavailable'
    ) {
      this.viewState.set(mapped);
      this.resetToken = '';
      return;
    }

    this.formError.set(this.apiError.toSafeMessage(error));
  }
}
