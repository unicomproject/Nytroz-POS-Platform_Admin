import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { AuthSessionService } from '../../core/services/auth-session.service';
import { PlatformTenantSearchService } from '../../features/admin/services/platform-tenant-search.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <header class="admin-header">
      @if (isTenantListPage()) {
        <label class="global-search" aria-label="Search tenants">
          <input
            type="search"
            placeholder="Search tenants, owners, email..."
            [ngModel]="tenantSearch.searchTerm()"
            (ngModelChange)="onGlobalSearch($event)"
          />
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </label>
      } @else if (isSubscriptionCreatePage()) {
        <nav class="header-breadcrumb" aria-label="Breadcrumb">
          <a routerLink="/admin/subscriptions">Subscriptions</a>
          <span aria-hidden="true">/</span>
          <span class="current">Create Plan</span>
        </nav>
      } @else {
        <div class="header-spacer"></div>
      }

      <div class="header-actions">
        @if (isSubscriptionCreatePage()) {
          <button class="system-status" type="button" aria-label="System status">
            <span class="status-dot" aria-hidden="true"></span>
            All Systems Operational
            <span class="dropdown-caret" aria-hidden="true">▾</span>
          </button>
        } @else if (!isTenantListPage()) {
          <div class="date-range" aria-label="Current dashboard date range">Last 30 days <span>v</span></div>
        }

        <button class="icon-btn notification" type="button" aria-label="Notifications">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        </button>

        @if (!isSubscriptionCreatePage()) {
          <button class="icon-btn help" type="button" aria-label="Help">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9a2.5 2.5 0 014.8 1c0 2-2.5 2-2.5 4" />
              <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button class="icon-btn settings" type="button" aria-label="Settings">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        }

        <div class="avatar">{{ initials() }}</div>
        <div class="user-summary">
          <strong>{{ authSession.currentUser()?.fullName ?? 'Platform session required' }}</strong>
          <span>Super Administrator</span>
        </div>
        <span class="dropdown-caret" aria-hidden="true">▾</span>
      </div>
    </header>
  `,
  styles: `
    .admin-header {
      align-items: center;
      background: #fff;
      border-bottom: 1px solid #e5eaf2;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      min-height: 4.25rem;
      padding: 0.85rem 1.6rem;
    }

    .header-spacer {
      flex: 1;
    }

    .header-breadcrumb {
      align-items: center;
      color: #667085;
      display: flex;
      font-size: 0.84rem;
      gap: 0.45rem;
    }

    .header-breadcrumb a {
      color: #667085;
      text-decoration: none;
    }

    .header-breadcrumb a:hover {
      color: #344054;
    }

    .header-breadcrumb .current {
      color: #101828;
      font-weight: 700;
    }

    .global-search {
      align-items: center;
      display: flex;
      flex: 1;
      max-width: 34rem;
      position: relative;
    }

    .global-search input {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      color: #344054;
      font-size: 0.88rem;
      min-height: 2.65rem;
      padding: 0 2.75rem 0 1rem;
      width: 100%;
    }

    .global-search input::placeholder {
      color: #98a2b3;
    }

    .global-search input:focus {
      background: #fff;
      border-color: #84adff;
      outline: none;
    }

    .global-search svg {
      color: #98a2b3;
      height: 1.1rem;
      pointer-events: none;
      position: absolute;
      right: 0.85rem;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-width: 1.75;
      fill: none;
      width: 1.1rem;
    }

    .header-actions {
      align-items: center;
      display: flex;
      flex-shrink: 0;
      gap: 0.65rem;
    }

    .system-status {
      align-items: center;
      background: #fff;
      border: 1px solid #d0fae5;
      border-radius: 999px;
      color: #027a48;
      cursor: pointer;
      display: inline-flex;
      font-size: 0.82rem;
      font-weight: 600;
      gap: 0.45rem;
      min-height: 2.35rem;
      padding: 0.45rem 0.85rem;
    }

    .system-status .status-dot {
      background: #12b76a;
      border-radius: 50%;
      height: 0.45rem;
      width: 0.45rem;
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

    .icon-btn {
      align-items: center;
      background: #fff;
      border: 1px solid #e5eaf2;
      border-radius: 50%;
      color: #667085;
      cursor: pointer;
      display: flex;
      height: 2.35rem;
      justify-content: center;
      width: 2.35rem;
    }

    .icon-btn svg {
      height: 1.05rem;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.75;
      fill: none;
      width: 1.05rem;
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

    .dropdown-caret {
      color: #98a2b3;
      font-size: 0.85rem;
      margin-left: -0.15rem;
    }

    @media (max-width: 900px) {
      .user-summary,
      .dropdown-caret {
        display: none;
      }
    }

    @media (max-width: 700px) {
      .date-range,
      .system-status {
        display: none;
      }

      .global-search {
        max-width: none;
      }
    }
  `
})
export class Header {
  readonly authSession = inject(AuthSessionService);
  readonly tenantSearch = inject(PlatformTenantSearchService);

  private readonly router = inject(Router);

  readonly isTenantListPage = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.isTenantsRoute()),
      startWith(this.isTenantsRoute())
    ),
    { initialValue: this.isTenantsRoute() }
  );

  readonly isSubscriptionCreatePage = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.isSubscriptionCreateRoute()),
      startWith(this.isSubscriptionCreateRoute())
    ),
    { initialValue: this.isSubscriptionCreateRoute() }
  );

  onGlobalSearch(value: string): void {
    this.tenantSearch.setSearch(value);
  }

  initials(): string {
    return (this.authSession.currentUser()?.fullName ?? 'PA')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  private isTenantsRoute(): boolean {
    return this.router.url.split('?')[0] === '/admin/tenants';
  }

  private isSubscriptionCreateRoute(): boolean {
    return this.router.url.split('?')[0] === '/admin/subscriptions/create';
  }
}
