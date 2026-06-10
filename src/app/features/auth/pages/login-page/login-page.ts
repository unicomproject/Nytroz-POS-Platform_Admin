import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import { Button } from '../../../../shared/ui/button/button';
import { AuthApiService } from '../../services/auth-api.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [Button, ReactiveFormsModule],
  template: `
    <main class="login-page">
      <section class="login-panel">
        <p class="eyebrow">SCS-TIX</p>
        <h1>Platform Admin</h1>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>
            Email
            <input type="email" formControlName="email" autocomplete="username" />
          </label>
          <label>
            Password
            <input type="password" formControlName="password" autocomplete="current-password" />
          </label>
          @if (errorMessage()) {
            <p class="error">{{ errorMessage() }}</p>
          }
          <app-button type="submit" [disabled]="form.invalid || isSubmitting()">
            {{ isSubmitting() ? 'Signing in' : 'Sign in' }}
          </app-button>
        </form>
      </section>
    </main>
  `,
  styles: `
    .login-page {
      align-items: center;
      background: #eef3f5;
      display: grid;
      min-height: 100dvh;
      padding: 1rem;
    }

    .login-panel {
      background: #fff;
      border: 1px solid #d8e0e8;
      border-radius: 8px;
      margin: auto;
      max-width: 24rem;
      padding: 1.5rem;
      width: 100%;
    }

    .eyebrow {
      color: #607080;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0;
      margin: 0 0 0.35rem;
    }

    h1 {
      color: #18212b;
      font-size: 1.6rem;
      margin: 0 0 1.25rem;
    }

    form,
    label {
      display: grid;
      gap: 0.5rem;
    }

    form {
      gap: 1rem;
    }

    label {
      color: #344555;
      font-weight: 700;
    }

    input {
      border: 1px solid #c9d4dc;
      border-radius: 8px;
      font: inherit;
      min-height: 2.5rem;
      padding: 0 0.75rem;
    }

    .error {
      color: #a33a2a;
      margin: 0;
    }
  `
})
export class LoginPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal(false);
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

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.authApi.login(this.form.getRawValue()).subscribe({
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
