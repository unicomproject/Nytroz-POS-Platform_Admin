import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { AuthApiService } from '../../services/auth-api.service';
import { PlatformPasswordResetStatus } from '../../models/password-reset.model';
import {
  passwordPolicyGuidance,
  platformPasswordPolicyValidator
} from '../../validators/password-policy.validator';

type ResetPageView = 'loading' | 'invalid' | 'expired' | 'used' | 'revoked' | 'form' | 'success';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="reset-page">
      <section class="brand-panel" aria-label="SCS-TIX Platform Administration">
        <div class="brand-content">
          <a class="brand-mark" href="/" aria-label="SCS-TIX Platform Administration">
            <span class="shield" aria-hidden="true">
              <svg viewBox="0 0 32 38" role="img">
                <path d="M16 2 29 7v10c0 8.6-5.1 15.5-13 19-7.9-3.5-13-10.4-13-19V7l13-5Z" />
                <rect x="10.5" y="16" width="11" height="9" rx="1.7" />
                <path d="M12.8 16v-3.1a3.2 3.2 0 0 1 6.4 0V16" />
              </svg>
            </span>
            <span>
              <strong>SCS-TIX</strong>
              <small>Platform Administration</small>
            </span>
          </a>

          <div class="brand-copy">
            <h1>
              Secure access.<br />
              <span>Reset your password.</span>
            </h1>
            <div class="accent-line" aria-hidden="true"></div>
            <p>
              Use the secure link provided by a Platform Admin to set a new password for your account.
            </p>
          </div>
        </div>
      </section>

      <section class="auth-panel" aria-label="Reset platform admin password">
        <section class="reset-card">
          @switch (view()) {
            @case ('loading') {
              <h2>Checking reset link</h2>
              <p class="subtitle">Please wait while we validate your password reset link.</p>
              <div class="state-message loading" role="status">Validating reset link...</div>
            }
            @case ('invalid') {
              <h2>Invalid reset link</h2>
              <p class="subtitle">This password reset link is not valid.</p>
              <div class="state-message error" role="alert">
                The link may be malformed or no longer available. Ask a Platform Admin to send a new
                password reset.
              </div>
              <a class="link-button" routerLink="/login">Back to sign in</a>
            }
            @case ('expired') {
              <h2>Reset link expired</h2>
              <p class="subtitle">This password reset link has expired.</p>
              <div class="state-message error" role="alert">
                Ask a Platform Admin to send a new password reset link.
              </div>
              <a class="link-button" routerLink="/login">Back to sign in</a>
            }
            @case ('used') {
              <h2>Reset link already used</h2>
              <p class="subtitle">This password reset link has already been used.</p>
              <div class="state-message error" role="alert">
                Sign in with your new password or ask a Platform Admin to send another reset link.
              </div>
              <a class="link-button" routerLink="/login">Back to sign in</a>
            }
            @case ('revoked') {
              <h2>Reset link revoked</h2>
              <p class="subtitle">This password reset link is no longer active.</p>
              <div class="state-message error" role="alert">
                Ask a Platform Admin to send a new password reset link.
              </div>
              <a class="link-button" routerLink="/login">Back to sign in</a>
            }
            @case ('success') {
              <h2>Password updated</h2>
              <p class="subtitle">Your platform admin password has been reset successfully.</p>
              <div class="state-message success" role="status">
                You can now sign in with your new password.
              </div>
              <a class="link-button primary" routerLink="/login">Go to sign in</a>
            }
            @case ('form') {
              <h2>Set a new password</h2>
              <p class="subtitle">Choose a strong password for your Platform Admin account.</p>

              <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
                <div class="field-group">
                  <label for="new-password">New password</label>
                  <div class="input-shell">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                    <input
                      id="new-password"
                      [type]="isNewPasswordVisible() ? 'text' : 'password'"
                      formControlName="newPassword"
                      autocomplete="new-password"
                      placeholder="Enter your new password"
                      [attr.aria-invalid]="showNewPasswordError()"
                      aria-describedby="new-password-guidance new-password-error"
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
                  <p class="field-hint" id="new-password-guidance">{{ passwordGuidance }}</p>
                  @if (showNewPasswordError()) {
                    <p class="field-error" id="new-password-error">{{ newPasswordErrorMessage() }}</p>
                  }
                </div>

                <div class="field-group">
                  <label for="confirm-password">Confirm password</label>
                  <div class="input-shell">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                    <input
                      id="confirm-password"
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
                      [attr.aria-label]="isConfirmPasswordVisible() ? 'Hide password' : 'Show password'"
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

                @if (errorMessage()) {
                  <p class="form-error" role="alert">{{ errorMessage() }}</p>
                }

                <button class="submit-button" type="submit" [disabled]="isSubmitting()">
                  {{ isSubmitting() ? 'Updating Password' : 'Update Password' }}
                </button>
              </form>
            }
          }
        </section>

        <footer class="auth-footer">
          <span>&copy; 2025 SCS-TIX. All rights reserved.</span>
        </footer>
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    .reset-page {
      background: #f6f8fc;
      display: grid;
      grid-template-columns: minmax(28rem, 45%) minmax(32rem, 55%);
      height: 100vh;
      overflow: hidden;
    }

    .brand-panel {
      background:
        radial-gradient(circle at 48% 72%, rgba(19, 91, 255, 0.46), transparent 24rem),
        linear-gradient(145deg, #04142d 0%, #061b3a 44%, #082a5a 100%);
      color: #fff;
      display: grid;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      position: relative;
    }

    .brand-content {
      display: grid;
      gap: clamp(1.4rem, 3.8vh, 3.25rem);
      padding: clamp(1.45rem, 4vh, 3.1rem) clamp(2rem, 4vw, 3.8rem);
      position: relative;
      z-index: 2;
    }

    .brand-mark {
      align-items: center;
      color: inherit;
      display: inline-flex;
      gap: 0.9rem;
      justify-self: start;
      text-decoration: none;
    }

    .brand-mark strong,
    .brand-mark small {
      display: block;
    }

    .brand-mark strong {
      font-size: clamp(1.7rem, 2.7vw, 2.35rem);
      letter-spacing: 0;
      line-height: 1;
    }

    .brand-mark small {
      color: rgba(219, 231, 255, 0.72);
      font-size: clamp(0.95rem, 1.4vw, 1.2rem);
      font-weight: 600;
      margin-top: 0.25rem;
    }

    .shield {
      color: #3b82ff;
      display: inline-flex;
      width: clamp(3rem, 4.7vw, 4.2rem);
    }

    .shield svg,
    .input-shell svg,
    .icon-button svg {
      width: 100%;
    }

    svg {
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    .brand-copy h1 {
      color: #fff;
      font-size: clamp(2rem, 4vw, 3.5rem);
      line-height: 1.16;
      margin: 0;
    }

    .brand-copy h1 span {
      color: #2f7dff;
    }

    .accent-line {
      background: #2f7dff;
      border-radius: 99px;
      box-shadow: 0 0 22px rgba(47, 125, 255, 0.75);
      height: 0.22rem;
      margin: clamp(1rem, 2.3vh, 1.9rem) 0 clamp(0.95rem, 2.1vh, 1.7rem);
      width: 4rem;
    }

    .brand-copy p {
      color: rgba(230, 238, 255, 0.82);
      font-size: clamp(1rem, 1.45vw, 1.15rem);
      line-height: 1.58;
      margin: 0;
      max-width: 35rem;
    }

    .auth-panel {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      padding: clamp(0.75rem, 2.3vh, 2rem) clamp(1.25rem, 5vw, 5rem);
    }

    .reset-card {
      align-self: center;
      background: #fff;
      border: 1px solid rgba(217, 225, 236, 0.9);
      border-radius: 18px;
      box-shadow: 0 24px 70px rgba(15, 35, 71, 0.11);
      justify-self: center;
      max-width: 45.5rem;
      max-height: 100%;
      padding: clamp(1.5rem, 4vh, 3.45rem) clamp(2rem, 4.6vw, 4.25rem);
      width: min(100%, 45.5rem);
    }

    .reset-card h2 {
      color: #0f2347;
      font-size: clamp(2rem, 3.1vw, 2.6rem);
      line-height: 1.1;
      margin: 0 0 0.8rem;
    }

    .subtitle {
      color: #6b7280;
      font-size: clamp(1rem, 1.35vw, 1.17rem);
      font-weight: 600;
      margin: 0 0 clamp(1.15rem, 2.8vh, 2.2rem);
    }

    form {
      display: grid;
      gap: clamp(0.85rem, 1.85vh, 1.35rem);
    }

    .field-group {
      display: grid;
      gap: 0.45rem;
    }

    label {
      color: #17233d;
      font-weight: 800;
      letter-spacing: 0;
    }

    .input-shell {
      align-items: center;
      border: 1px solid #d9e1ec;
      border-radius: 8px;
      display: grid;
      gap: 0.8rem;
      grid-template-columns: 1.25rem 1fr auto;
      min-height: clamp(3rem, 6.6vh, 3.75rem);
      padding: 0 1.1rem;
    }

    .input-shell:focus-within {
      border-color: #0b5cff;
      box-shadow: 0 0 0 4px rgba(11, 92, 255, 0.12);
    }

    .input-shell svg {
      color: #7b8aa4;
      height: 1.25rem;
      stroke-width: 2;
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

    .field-hint {
      color: #667085;
      font-size: 0.88rem;
      font-weight: 600;
      margin: 0;
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

    .state-message {
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 650;
      margin-bottom: 1.25rem;
      padding: 0.95rem 1rem;
    }

    .state-message.loading {
      background: #f8fafc;
      border: 1px solid #e4e7ec;
      color: #344054;
    }

    .state-message.error {
      background: #fff1f0;
      border: 1px solid #ffd3cf;
      color: #b42318;
    }

    .state-message.success {
      background: #ecfdf3;
      border: 1px solid #abefc6;
      color: #027a48;
    }

    .submit-button,
    .link-button {
      align-items: center;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-size: 1.05rem;
      font-weight: 850;
      justify-content: center;
      min-height: clamp(3.3rem, 6.9vh, 4rem);
      padding: 0 1.4rem;
      text-decoration: none;
      width: 100%;
    }

    .submit-button {
      background: #0b5cff;
      border: 0;
      box-shadow: 0 12px 24px rgba(11, 92, 255, 0.22);
      color: #fff;
    }

    .submit-button:hover,
    .submit-button:focus-visible {
      background: #084fe1;
      outline: 0;
    }

    .submit-button:disabled {
      background: #8fb2ff;
      box-shadow: none;
      cursor: not-allowed;
    }

    .link-button {
      background: #fff;
      border: 1px solid #d0d5dd;
      color: #344054;
    }

    .link-button.primary {
      background: #0b5cff;
      border-color: #0b5cff;
      box-shadow: 0 12px 24px rgba(11, 92, 255, 0.22);
      color: #fff;
    }

    .auth-footer {
      align-items: center;
      color: #6b7280;
      display: flex;
      flex-wrap: wrap;
      font-size: 0.88rem;
      font-weight: 650;
      gap: 0.55rem 1.35rem;
      justify-content: center;
      padding-top: clamp(0.55rem, 1.6vh, 1.25rem);
    }

    @media (max-width: 68rem) {
      :host {
        height: auto;
        min-height: 100dvh;
        overflow: visible;
      }

      .reset-page {
        grid-template-columns: 1fr;
        height: auto;
        min-height: 100dvh;
        overflow-x: hidden;
        overflow-y: auto;
      }

      .brand-panel,
      .auth-panel {
        height: auto;
        min-height: auto;
        overflow: visible;
      }

      .auth-panel {
        padding-top: 1.25rem;
      }

      .reset-card {
        margin: 2rem 0;
      }
    }
  `
})
export class ResetPasswordPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly authApi = inject(AuthApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);

  readonly passwordGuidance = passwordPolicyGuidance();
  readonly view = signal<ResetPageView>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal(false);
  readonly wasSubmitted = signal(false);
  readonly isNewPasswordVisible = signal(false);
  readonly isConfirmPasswordVisible = signal(false);
  readonly token = signal('');

  readonly form = this.formBuilder.group(
    {
      newPassword: ['', [Validators.required, platformPasswordPolicyValidator]],
      confirmPassword: ['', Validators.required]
    },
    { validators: ResetPasswordPage.passwordsMatchValidator }
  );

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const token = params.get('token')?.trim() ?? '';
      this.token.set(token);

      if (!token) {
        this.view.set('invalid');
        return;
      }

      this.validateToken(token);
    });
  }

  showNewPasswordError(): boolean {
    const control = this.form.controls.newPassword;
    return control.invalid && (control.touched || this.wasSubmitted());
  }

  showConfirmPasswordError(): boolean {
    const control = this.form.controls.confirmPassword;
    return (
      (control.invalid && (control.touched || this.wasSubmitted())) ||
      (this.form.hasError('passwordMismatch') && (control.touched || this.wasSubmitted()))
    );
  }

  newPasswordErrorMessage(): string {
    const control = this.form.controls.newPassword;

    if (control.hasError('required')) {
      return 'New password is required.';
    }

    const policyError = control.getError('passwordPolicy') as string | undefined;
    if (policyError === 'minLength') {
      return 'Password must be at least 8 characters.';
    }
    if (policyError === 'maxLength') {
      return 'Password must be 128 characters or fewer.';
    }
    if (policyError === 'complexity') {
      return 'Password must include uppercase, lowercase, and a digit.';
    }

    return 'Enter a valid password.';
  }

  confirmPasswordErrorMessage(): string {
    if (this.form.hasError('passwordMismatch')) {
      return 'Passwords do not match.';
    }

    if (this.form.controls.confirmPassword.hasError('required')) {
      return 'Confirm password is required.';
    }

    return 'Enter a valid confirmation password.';
  }

  toggleNewPasswordVisibility(): void {
    this.isNewPasswordVisible.update((current) => !current);
  }

  toggleConfirmPasswordVisibility(): void {
    this.isConfirmPasswordVisible.update((current) => !current);
  }

  submit(): void {
    this.wasSubmitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { newPassword, confirmPassword } = this.form.getRawValue();

    this.authApi
      .completePasswordReset({
        token: this.token(),
        newPassword,
        confirmPassword
      })
      .subscribe({
        next: () => {
          this.view.set('success');
          this.isSubmitting.set(false);
        },
        error: (error) => {
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.isSubmitting.set(false);
        }
      });
  }

  private validateToken(token: string): void {
    this.view.set('loading');

    this.authApi.validatePasswordResetToken(token).subscribe({
      next: (validation) => {
        if (validation.isValid && validation.status === 'PENDING') {
          this.view.set('form');
          return;
        }

        this.view.set(this.mapInvalidStatus(validation.status));
      },
      error: () => {
        this.view.set('invalid');
      }
    });
  }

  private mapInvalidStatus(status: PlatformPasswordResetStatus): ResetPageView {
    switch (status) {
      case 'EXPIRED':
        return 'expired';
      case 'USED':
        return 'used';
      case 'REVOKED':
        return 'revoked';
      default:
        return 'invalid';
    }
  }

  private static passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value as string | undefined;
    const confirmPassword = control.get('confirmPassword')?.value as string | undefined;

    if (!newPassword || !confirmPassword) {
      return null;
    }

    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }
}
