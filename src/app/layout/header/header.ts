import { Component } from '@angular/core';

import { AuthSessionService } from '../../core/services/auth-session.service';
import { TenantContextService } from '../../core/services/tenant-context.service';

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
        <span>{{ authSession.currentUser()?.displayName ?? 'Platform session required' }}</span>
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
      color: #566575;
      text-align: right;
    }
  `
})
export class Header {
  constructor(
    readonly authSession: AuthSessionService,
    readonly tenantContext: TenantContextService
  ) {}
}
