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
          </button>
        }
        <div class="avatar">{{ initials() }}</div>
        <div class="user-summary">
          <strong>{{ authSession.currentUser()?.fullName ?? 'Platform session required' }}</strong>
          <span>Platform account</span>
        </div>
      </div>
    </header>
  `,
  styles: `
    .admin-header {
      align-items: center;
      background: var(--bg-surface-primary, #fff);
      border-bottom: 1px solid var(--border-default, #e5eaf2);
      display: flex;
      gap: var(--space-4, 1rem);
      justify-content: space-between;
      min-height: 4.25rem;
      padding: 0.85rem var(--space-5, 1.6rem);
    }

    .header-spacer {
      flex: 1;
    }

    .header-breadcrumb {
      align-items: center;
      color: var(--text-secondary, #667085);
      display: flex;
      font-size: 0.84rem;
      gap: 0.45rem;
    }

    .header-breadcrumb a {
      color: var(--text-secondary, #667085);
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .header-breadcrumb a:hover {
      color: var(--primary, #0b5cff);
    }

    .header-breadcrumb .current {
      color: var(--text-primary, #101828);
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
      background: var(--bg-surface-secondary, #f8fafc);
      border: 1px solid var(--border-default, #e2e8f0);
      border-radius: var(--radius-md, 10px);
      color: var(--text-primary, #344054);
      font-size: 0.88rem;
      min-height: var(--control-height-default, 2.65rem);
      padding: 0 2.75rem 0 1rem;
      width: 100%;
      transition: border-color 0.15s ease, background-color 0.15s ease;
    }

    .global-search input::placeholder {
      color: var(--text-muted, #98a2b3);
    }

    .global-search input:focus {
      background: var(--bg-surface-primary, #fff);
      border-color: var(--border-focus, #0b5cff);
      outline: none;
    }

    .global-search svg {
      color: var(--text-muted, #98a2b3);
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
      gap: var(--space-3, 0.65rem);
    }

    .system-status {
      align-items: center;
      background: var(--status-success-bg, #ecfdf5);
      border: 1px solid var(--status-success-text, #047857);
      border-radius: var(--radius-pill, 9999px);
      color: var(--status-success-text, #047857);
      cursor: pointer;
      display: inline-flex;
      font-size: 0.82rem;
      font-weight: 600;
      gap: 0.45rem;
      min-height: 2.25rem;
      padding: 0.45rem var(--space-4, 0.85rem);
    }

    .system-status .status-dot {
      background: var(--status-success, #12b76a);
      border-radius: 50%;
      height: 0.45rem;
      width: 0.45rem;
    }

    .avatar {
      align-items: center;
      background: linear-gradient(145deg, var(--primary, #0b5cff), #7c3aed);
      border-radius: 50%;
      color: #fff;
      display: flex;
      font-size: 0.78rem;
      font-weight: 800;
      height: 2.25rem;
      justify-content: center;
      width: 2.25rem;
    }

    .user-summary {
      display: grid;
      gap: 0.08rem;
    }

    .user-summary strong {
      color: var(--text-primary, #17213a);
      font-size: 0.875rem;
      font-weight: 600;
    }

    .user-summary span {
      color: var(--text-muted, #667085);
      font-size: 0.75rem;
    }

    @media (max-width: 900px) {
      .user-summary {
        display: none;
      }
    }

    @media (max-width: 700px) {
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


