import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import { AuthApiService } from '../../services/auth-api.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <main class="login-page">
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
              Manage. Monitor.<br />
              Grow. <span>All in One Platform.</span>
            </h1>
            <div class="accent-line" aria-hidden="true"></div>
            <p>
              SCS-TIX is the unified platform to manage tenants, subscriptions, operations and performance across all
              your venues.
            </p>
          </div>

          <ul class="feature-list" aria-label="Platform highlights">
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16 11a4 4 0 1 0-3.3-6.3" />
                <path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                <path d="M2.5 21v-2a5.5 5.5 0 0 1 11 0v2" />
                <path d="M14.5 21v-1.6a5 5 0 0 0-1.1-3.1 5.5 5.5 0 0 1 8.1 4.8" />
              </svg>
              <span>Multi-Tenant<br />Management</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 19h16" />
                <path d="M6 17V9" />
                <path d="M11 17V5" />
                <path d="M16 17v-7" />
              </svg>
              <span>Real-time<br />Analytics</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2 20 5v6c0 5-3.1 9.3-8 11-4.9-1.7-8-6-8-11V5l8-3Z" />
                <path d="m8.5 12 2.3 2.3 4.8-5" />
              </svg>
              <span>Secure &amp;<br />Reliable</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
                <path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2 3.3-.1-.1a1.8 1.8 0 0 0-2.1-.2 8.8 8.8 0 0 1-1.7.7 1.8 1.8 0 0 0-1.3 1.7V23H8.8v-.3a1.8 1.8 0 0 0-1.2-1.7 8.8 8.8 0 0 1-1.8-.7 1.8 1.8 0 0 0-2.1.2l-.1.1-2-3.3.1-.1a1.8 1.8 0 0 0 .4-2 8.2 8.2 0 0 1-.3-1.9A1.8 1.8 0 0 0 0 11.6v-.2l1.8-.3a1.8 1.8 0 0 0 1.5-1.4c.1-.6.3-1.2.6-1.8a1.8 1.8 0 0 0-.3-2.1l-.1-.1 2-3.3.1.1a1.8 1.8 0 0 0 2.1.2c.5-.3 1.1-.5 1.7-.7A1.8 1.8 0 0 0 10.7.3V0h3.8v.3A1.8 1.8 0 0 0 15.8 2c.6.2 1.1.4 1.7.7a1.8 1.8 0 0 0 2.1-.2l.1-.1 2 3.3-.1.1a1.8 1.8 0 0 0-.3 2.1c.2.6.4 1.2.6 1.8a1.8 1.8 0 0 0 1.5 1.4l.6.1v3.8l-.6.1A1.8 1.8 0 0 0 19.4 15Z" />
              </svg>
              <span>Enterprise<br />Ready</span>
            </li>
          </ul>
        </div>

        <div class="venue-visual" aria-hidden="true">
          <div class="skyline">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
          <div class="venue">
            <div class="venue-roof"></div>
            <div class="venue-body"></div>
          </div>
        </div>
      </section>

      <section class="auth-panel" aria-label="Platform Admin sign in">
        <section class="login-card">
          <h2>Welcome Back</h2>
          <p class="subtitle">Sign in to your Platform Admin account</p>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field-group">
              <label for="email">Email Address</label>
              <div class="input-shell">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  autocomplete="username"
                  placeholder="Enter your email address"
                  [attr.aria-invalid]="showEmailError()"
                  aria-describedby="email-error"
                />
              </div>
              @if (showEmailError()) {
                <p class="field-error" id="email-error">{{ emailErrorMessage() }}</p>
              }
            </div>

            <div class="field-group">
              <label for="password">Password</label>
              <div class="input-shell">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                <input
                  id="password"
                  [type]="isPasswordVisible() ? 'text' : 'password'"
                  formControlName="password"
                  autocomplete="current-password"
                  placeholder="Enter your password"
                  [attr.aria-invalid]="showPasswordError()"
                  aria-describedby="password-error"
                />
                <button
                  class="icon-button"
                  type="button"
                  [attr.aria-label]="isPasswordVisible() ? 'Hide password' : 'Show password'"
                  (click)="togglePasswordVisibility()"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    @if (isPasswordVisible()) {
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
              @if (showPasswordError()) {
                <p class="field-error" id="password-error">Password is required.</p>
              }
            </div>

            <div class="form-options">
              <!-- TODO: Link this when the platform password-reset API and route are implemented. -->
              <span class="unavailable-link" aria-disabled="true" title="Password reset is not available yet">
                Forgot Password?
              </span>
            </div>

            @if (errorMessage()) {
              <p class="form-error" role="alert">{{ errorMessage() }}</p>
            }

            <button class="submit-button" type="submit" [disabled]="isSubmitting()">
              {{ isSubmitting() ? 'Signing In' : 'Sign In' }}
            </button>
          </form>
        </section>

        <footer class="auth-footer">
          <span>&copy; 2025 SCS-TIX. All rights reserved.</span>
          <a href="/" (click)="$event.preventDefault()">Privacy Policy</a>
          <a href="/" (click)="$event.preventDefault()">Terms of Service</a>
          <span class="system-status"><i aria-hidden="true"></i> System Status: <strong>Online</strong></span>
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

    .login-page {
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

    .brand-panel::after {
      background: linear-gradient(180deg, transparent 0%, rgba(1, 11, 28, 0.5) 68%, rgba(1, 9, 23, 0.9) 100%);
      content: '';
      inset: 0;
      pointer-events: none;
      position: absolute;
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
    .feature-list svg,
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

    .brand-copy {
      max-width: 39rem;
    }

    .brand-copy h1 {
      color: #fff;
      font-size: clamp(2rem, 4vw, 4rem);
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
      font-size: clamp(1rem, 1.45vw, 1.28rem);
      line-height: 1.58;
      margin: 0;
      max-width: 35rem;
    }

    .feature-list {
      display: grid;
      gap: 0;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      list-style: none;
      margin: 0;
      max-width: 44rem;
      padding: 0;
    }

    .feature-list li {
      align-items: center;
      border-left: 1px solid rgba(127, 169, 240, 0.25);
      display: grid;
      gap: 0.55rem;
      justify-items: center;
      min-height: clamp(5.2rem, 12vh, 7rem);
      padding: 0.5rem 0.85rem;
      text-align: center;
    }

    .feature-list li:first-child {
      border-left: 0;
    }

    .feature-list svg {
      color: #2f7dff;
      filter: drop-shadow(0 0 12px rgba(47, 125, 255, 0.5));
      height: 2.2rem;
      max-width: 2.7rem;
      stroke-width: 1.8;
    }

    .feature-list span {
      color: #f7fbff;
      font-size: 0.95rem;
      font-weight: 750;
      line-height: 1.35;
    }

    .venue-visual {
      bottom: 0;
      height: clamp(10rem, 30vh, 21rem);
      left: 0;
      pointer-events: none;
      position: absolute;
      right: 0;
      z-index: 1;
    }

    .skyline {
      align-items: end;
      bottom: 0;
      display: grid;
      gap: 1.2rem;
      grid-template-columns: 1fr 0.7fr 0.9fr 1.2fr 0.8fr 1fr;
      height: 72%;
      left: 4%;
      opacity: 0.95;
      position: absolute;
      right: 4%;
    }

    .skyline span {
      background:
        linear-gradient(180deg, rgba(111, 178, 255, 0.92), rgba(111, 178, 255, 0.04) 8%),
        linear-gradient(180deg, rgba(16, 50, 97, 0.95), rgba(5, 20, 46, 0.72));
      border-radius: 6px 6px 0 0;
      box-shadow: 0 0 26px rgba(56, 139, 255, 0.3);
      min-height: 5rem;
    }

    .skyline span:nth-child(1) {
      height: 54%;
    }

    .skyline span:nth-child(2) {
      height: 76%;
    }

    .skyline span:nth-child(3) {
      height: 62%;
    }

    .skyline span:nth-child(4) {
      height: 88%;
    }

    .skyline span:nth-child(5) {
      height: 66%;
    }

    .skyline span:nth-child(6) {
      height: 80%;
    }

    .venue {
      bottom: 0.3rem;
      height: 72%;
      left: 22%;
      position: absolute;
      right: 16%;
    }

    .venue-roof {
      background: linear-gradient(115deg, rgba(200, 229, 255, 0.16), rgba(47, 125, 255, 0.68));
      border: 1px solid rgba(177, 216, 255, 0.5);
      border-radius: 50% 50% 18% 18% / 52% 52% 28% 28%;
      box-shadow: 0 0 38px rgba(47, 125, 255, 0.62);
      height: 42%;
      transform: perspective(15rem) rotateX(52deg);
      transform-origin: bottom;
    }

    .venue-body {
      background:
        repeating-linear-gradient(90deg, rgba(208, 235, 255, 0.38) 0 0.6rem, rgba(27, 83, 144, 0.5) 0.6rem 1.1rem),
        linear-gradient(180deg, rgba(43, 128, 255, 0.75), rgba(6, 25, 62, 0.95));
      border: 1px solid rgba(177, 216, 255, 0.36);
      border-radius: 10px 10px 2px 2px;
      bottom: 0;
      box-shadow: 0 0 34px rgba(47, 125, 255, 0.45);
      height: 49%;
      left: 10%;
      position: absolute;
      right: 8%;
    }

    .auth-panel {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      padding: clamp(0.75rem, 2.3vh, 2rem) clamp(1.25rem, 5vw, 5rem);
    }

    .login-card {
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

    .login-card h2 {
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

    input[type='email'],
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

    .form-options {
      align-items: center;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
    }

    .unavailable-link {
      color: #8a94a3;
      cursor: not-allowed;
      font-weight: 800;
      margin-left: auto;
    }

    a {
      color: #0b5cff;
      font-weight: 800;
      text-decoration: none;
    }

    a:hover,
    a:focus-visible {
      text-decoration: underline;
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

    .submit-button {
      align-items: center;
      background: #0b5cff;
      border: 0;
      border-radius: 8px;
      box-shadow: 0 12px 24px rgba(11, 92, 255, 0.22);
      color: #fff;
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-size: 1.12rem;
      font-weight: 850;
      justify-content: center;
      min-height: clamp(3.3rem, 6.9vh, 4rem);
      padding: 0 1.4rem;
      width: 100%;
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

    .system-status {
      align-items: center;
      display: inline-flex;
      gap: 0.55rem;
    }

    .system-status i {
      background: #18b26b;
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(24, 178, 107, 0.13);
      display: inline-block;
      height: 0.75rem;
      width: 0.75rem;
    }

    .system-status strong {
      color: #18a461;
    }

    @media (max-width: 68rem) {
      :host {
        height: auto;
        min-height: 100dvh;
        overflow: visible;
      }

      .login-page {
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

      .brand-content {
        gap: 2rem;
        padding-bottom: 13rem;
      }

      .feature-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .feature-list li:nth-child(odd) {
        border-left: 0;
      }

      .venue-visual {
        height: 11rem;
        min-height: 11rem;
      }

      .auth-panel {
        padding-top: 1.25rem;
      }

      .login-card {
        margin: 2rem 0;
      }
    }

    @media (max-width: 34rem) {
      .brand-content {
        padding: 1.35rem 1.15rem 11rem;
      }

      .feature-list {
        grid-template-columns: 1fr;
      }

      .feature-list li {
        border-left: 0;
        border-top: 1px solid rgba(127, 169, 240, 0.25);
        grid-template-columns: 2.5rem 1fr;
        justify-items: start;
        min-height: 4.4rem;
        text-align: left;
      }

      .feature-list li:first-child {
        border-top: 0;
      }

      .auth-panel {
        padding: 1rem;
      }

      .login-card {
        border-radius: 14px;
      }

      .form-options {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `
})
export class LoginPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly errorMessage = signal<string | null>(null);
  readonly isPasswordVisible = signal(false);
  readonly isSubmitting = signal(false);
  readonly wasSubmitted = signal(false);
  readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  constructor(
    private readonly apiError: ApiErrorService,
    private readonly authApi: AuthApiService,
    private readonly authSession: AuthSessionService,
    private readonly router: Router
  ) {}

  showEmailError(): boolean {
    const control = this.form.controls.email;
    return control.invalid && (control.touched || this.wasSubmitted());
  }

  showPasswordError(): boolean {
    const control = this.form.controls.password;
    return control.invalid && (control.touched || this.wasSubmitted());
  }

  emailErrorMessage(): string {
    const control = this.form.controls.email;

    if (control.hasError('required')) {
      return 'Email address is required.';
    }

    return 'Enter a valid email address.';
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible.update((current) => !current);
  }

  submit(): void {
    this.wasSubmitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.form.getRawValue();

    this.authApi.login({ email, password }).subscribe({
      next: (session) => {
        this.authSession.setSession(session);
        void this.router.navigate(['/admin/dashboard']);
      },
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.isSubmitting.set(false);
      }
    });
  }
}
