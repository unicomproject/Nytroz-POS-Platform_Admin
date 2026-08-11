import { Component, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { MenuSectionConfig, platformMenuConfig } from '../../core/config/menu.config';
import { AccessControlService } from '../../core/services/access-control.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { AuthApiService } from '../../features/auth/services/auth-api.service';
import { SidebarMenuIcon } from './sidebar-menu-icon';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, SidebarMenuIcon],
  template: `
    <aside class="sidebar">
      <a class="brand" routerLink="/admin/dashboard">
        <span class="brand-logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <path
              d="M12 3 4 6.5V12c0 4.4 3.2 8.5 8 9.5 4.8-1 8-5.1 8-9.5V6.5z"
              stroke-linejoin="round"
            />
            <rect x="10" y="10" width="4" height="5" rx="1" />
            <path d="M12 10V8.5a1.5 1.5 0 0 1 3 0V10" />
          </svg>
        </span>
        <span class="brand-copy">
          <strong>OneVerz</strong>
          <small>Platform Administration</small>
        </span>
      </a>

      <nav class="menu sidebar-scroll" aria-label="Platform administration">
        @for (section of visibleMenu(); track section.label) {
          @for (item of section.items; track item.path) {
            <a
              class="menu-item"
              [routerLink]="item.path"
              [class.active]="isMenuItemActive(item.path)"
            >
              <app-sidebar-menu-icon [icon]="item.icon" />
              <span class="menu-label">{{ item.label }}</span>
            </a>
          }
        }
      </nav>

      <div class="sidebar-footer">
        <button class="logout-button" type="button" (click)="logout()">
          <svg class="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>

        <div class="version-card">
          <div class="version-copy">
            <strong>OneVerz Platform</strong>
            <span>Version 2.4.0</span>
          </div>
          <span class="version-art" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 4 4 8v8l8 4 8-4V8z" stroke="url(#cubeGrad)" stroke-width="1.2" />
              <path d="M12 4v16M4 8l8 4 8-4" stroke="url(#cubeGrad)" stroke-width="1.2" opacity="0.85" />
              <defs>
                <linearGradient id="cubeGrad" x1="4" y1="4" x2="20" y2="20">
                  <stop stop-color="#5b9dff" />
                  <stop offset="1" stop-color="#0b5cff" />
                </linearGradient>
              </defs>
            </svg>
          </span>
        </div>
      </div>
    </aside>
  `,
  styles: `
    .sidebar {
      background: #0f172a;
      border-right: 1px solid rgba(255, 255, 255, 0.05);
      color: #cbd5e1;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 100vh;
      overflow: hidden;
      padding: var(--space-4, 1rem) var(--space-3, 0.75rem);
      width: 16.5rem;
    }

    .brand {
      align-items: center;
      color: inherit;
      display: flex;
      flex-shrink: 0;
      gap: var(--space-3, 0.75rem);
      margin-bottom: var(--space-5, 1.5rem);
      padding: 0 var(--space-2, 0.5rem);
      text-decoration: none;
    }

    .brand-logo {
      align-items: center;
      background: linear-gradient(145deg, #2f7bff, var(--primary, #0b5cff));
      border-radius: var(--radius-md, 8px);
      box-shadow: 0 4px 12px rgba(11, 92, 255, 0.25);
      color: #fff;
      display: flex;
      height: 2.25rem;
      justify-content: center;
      width: 2.25rem;
    }

    .brand-logo svg {
      height: 1.25rem;
      width: 1.25rem;
    }

    .brand-copy {
      display: grid;
      gap: 0.12rem;
    }

    .brand-copy strong {
      color: #fff;
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .brand-copy small {
      color: var(--text-muted, #64748b);
      font-size: 0.6875rem;
    }

    .menu {
      display: grid;
      flex: 1;
      gap: 0.25rem;
      min-height: 0;
    }

    .sidebar-scroll {
      background: transparent;
      overflow-x: hidden;
      overflow-y: auto;
      scrollbar-width: none;
    }

    .sidebar-scroll::-webkit-scrollbar {
      display: none;
    }

    .menu-item {
      align-items: center;
      border-radius: var(--radius-md, 8px);
      color: #94a3b8;
      display: flex;
      font-size: 0.875rem;
      font-weight: 500;
      gap: var(--space-3, 0.75rem);
      min-height: 2.5rem;
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
      text-decoration: none;
      transition: background-color 0.15s ease, color 0.15s ease;
    }

    .menu-item:hover {
      background-color: rgba(255, 255, 255, 0.05);
      color: #f8fafc;
    }

    .menu-item.active {
      background-color: var(--primary, #0b5cff);
      color: #fff;
    }

    .menu-label {
      flex: 1;
      line-height: 1.2;
    }

    .sidebar-footer {
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      gap: var(--space-3, 0.75rem);
      margin-top: var(--space-4, 1rem);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: var(--space-4, 1rem);
    }

    .logout-button {
      align-items: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-md, 8px);
      color: #cbd5e1;
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      gap: var(--space-2, 0.5rem);
      min-height: 2.25rem;
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
      transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }

    .logout-button:hover,
    .logout-button:focus-visible {
      background-color: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.2);
      color: var(--status-danger, #ef4444);
      outline: none;
    }

    .logout-icon {
      height: 1rem;
      width: 1rem;
    }

    .version-card {
      align-items: center;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: var(--radius-md, 8px);
      display: flex;
      gap: var(--space-2, 0.5rem);
      justify-content: space-between;
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
    }

    .version-copy {
      display: grid;
      gap: 0.12rem;
    }

    .version-copy strong {
      color: #f8fafc;
      font-size: 0.75rem;
    }

    .version-copy span {
      color: var(--text-muted, #64748b);
      font-size: 0.6875rem;
    }

    .version-art svg {
      height: 1.75rem;
      width: 1.75rem;
    }

    @media (max-width: 820px) {
      .sidebar {
        min-height: auto;
        position: static;
        width: 100%;
        border-right: 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .menu {
        max-height: none;
      }
    }
  `
})
export class Sidebar {
  readonly visibleMenu = computed(() =>
    platformMenuConfig
      .map(
        (section): MenuSectionConfig => ({
          ...section,
          items: section.items.filter((item) =>
            [item.requiredPermission, ...(item.alternatePermissions ?? [])].some(
              (permission) => !permission || this.accessControl.hasPermission(permission)
            ) && this.accessControl.hasFeature(item.requiredFeature)
          )
        })
      )
      .filter((section) => section.items.length > 0)
  );

  constructor(
    readonly authSession: AuthSessionService,
    private readonly accessControl: AccessControlService,
    private readonly authApi: AuthApiService,
    private readonly router: Router
  ) {}

  logout(): void {
    this.authApi.logout().subscribe({
      next: () => this.completeLogout(),
      error: () => this.completeLogout()
    });
  }

  private completeLogout(): void {
    this.authSession.clearSession();
    void this.router.navigate(['/login']);
  }

  isMenuItemActive(path: string): boolean {
    const url = this.router.url.split('?')[0];

    if (path === '/admin/dashboard') {
      return url === '/admin/dashboard';
    }

    if (path === '/admin/tenants') {
      if (url.startsWith('/admin/tenants/onboarding')) {
        return false;
      }
      return url === '/admin/tenants' || url.startsWith('/admin/tenants/');
    }

    if (path === '/admin/tenants/onboarding/drafts') {
      return url === '/admin/tenants/onboarding/drafts';
    }

    if (path === '/admin/subscriptions') {
      return url === '/admin/subscriptions' || url.startsWith('/admin/subscriptions/');
    }

    return url === path || url.startsWith(`${path}/`);
  }
}
