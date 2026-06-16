import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthSessionService } from '../../core/services/auth-session.service';
import { TenantContextService } from '../../core/services/tenant-context.service';
import { AuthApiService } from '../../features/auth/services/auth-api.service';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="admin-header">
      <div>
        <p class="label">Selected tenant</p>
        <strong>{{ tenantContext.selectedTenant()?.tenantName ?? 'No tenant selected' }}</strong>
      </div>
      <div class="user-summary">
        <span>{{ authSession.currentUser()?.fullName ?? 'Platform session required' }}</span>
        <button type="button" [disabled]="isLoggingOut()" (click)="logout()">
          {{ isLoggingOut() ? 'Signing out' : 'Sign out' }}
        </button>
      </div>
    </header>
  `,
  styles: `
    .admin-header {
      align-items: center;
      background: #fff;
      border-bottom: 1px solid #d8e0e8;
      display: flex;
      justify-content: space-between;
      min-height: 4rem;
      padding: 0 1.5rem;
    }

    .label {
      color: #607080;
      font-size: 0.75rem;
      font-weight: 700;
      margin: 0 0 0.2rem;
      text-transform: uppercase;
    }

    strong,
    span {
      color: #18212b;
    }

    .user-summary {
      align-items: flex-end;
      color: #566575;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      text-align: right;
    }

    button {
      background: transparent;
      border: 0;
      color: #0b5cff;
      cursor: pointer;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 750;
      padding: 0;
    }

    button:disabled {
      color: #8a94a3;
      cursor: wait;
    }
  `
})
export class Header {
  readonly isLoggingOut = signal(false);

  constructor(
    private readonly authApi: AuthApiService,
    private readonly router: Router,
    readonly authSession: AuthSessionService,
    readonly tenantContext: TenantContextService
  ) {}

  logout(): void {
    if (this.isLoggingOut()) {
      return;
    }

    this.isLoggingOut.set(true);
    this.authApi
      .logout()
      .pipe(
        finalize(() => {
          this.authSession.clearSession();
          this.isLoggingOut.set(false);
          void this.router.navigate(['/login']);
        })
      )
      .subscribe({
        error: () => undefined
      });
  }
}
