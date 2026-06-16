import { Component } from '@angular/core';

import { AuthSessionService } from '../../core/services/auth-session.service';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="admin-header">
      <div class="header-spacer"></div>
      <div class="header-actions">
        <div class="date-range" aria-label="Current dashboard date range">Last 30 days <span>v</span></div>
        <button class="notification" type="button" aria-label="Notifications">!</button>
        <div class="avatar">{{ initials() }}</div>
        <div class="user-summary">
          <strong>{{ authSession.currentUser()?.fullName ?? 'Platform session required' }}</strong>
          <span>Platform Admin</span>
        </div>
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

    .header-actions {
      align-items: center;
      display: flex;
      gap: 0.75rem;
    }

    .date-range {
      border: 1px solid #dce3ef;
      border-radius: 10px;
      color: #344054;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 0.65rem 0.85rem;
    }

    .date-range span {
      color: #667085;
      margin-left: 0.65rem;
    }

    .notification {
      background: #fff1f2;
      border: 0;
      border-radius: 50%;
      color: #e11d48;
      font-weight: 900;
      height: 2.25rem;
      width: 2.25rem;
    }

    .avatar {
      align-items: center;
      background: linear-gradient(145deg, #0b5cff, #7c3aed);
      border-radius: 50%;
      color: #fff;
      display: flex;
      font-size: 0.78rem;
      font-weight: 900;
      height: 2.5rem;
      justify-content: center;
      width: 2.5rem;
    }

    .user-summary {
      display: grid;
      gap: 0.1rem;
    }

    .user-summary strong {
      color: #17213a;
      font-size: 0.88rem;
    }

    .user-summary span {
      color: #667085;
      font-size: 0.75rem;
    }

    @media (max-width: 700px) {
      .date-range,
      .user-summary span {
        display: none;
      }
    }
  `
})
export class Header {
  constructor(
    readonly authSession: AuthSessionService
  ) {}

  initials(): string {
    return (this.authSession.currentUser()?.fullName ?? 'PA')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
