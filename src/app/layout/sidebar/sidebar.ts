import { Component, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { MenuSectionConfig, platformMenuConfig } from '../../core/config/menu.config';
import { AccessControlService } from '../../core/services/access-control.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { AuthApiService } from '../../features/auth/services/auth-api.service';
import { SidebarMenuIcon } from './sidebar-menu-icon';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, SidebarMenuIcon],
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
          <strong>SCS-TIX</strong>
          <small>Platform Administration</small>
        </span>
      </a>

      <nav class="menu sidebar-scroll" aria-label="Platform administration">
        @for (section of visibleMenu(); track section.label) {
          @for (item of section.items; track item.path) {
            <a
              class="menu-item"
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="linkActiveOptions(item.path)"
            >
              <app-sidebar-menu-icon [icon]="item.icon" />
              <span class="menu-label">{{ item.label }}</span>
              @if (item.hasSubmenu) {
                <span class="menu-chevron" aria-hidden="true">›</span>
              }
            </a>
          }
        }
      </nav>

      <div class="sidebar-footer">
        <div class="user-card">
          <div class="user-avatar">{{ userInitials() }}</div>
          <div class="user-copy">
            <strong>{{ authSession.currentUser()?.fullName ?? 'Admin User' }}</strong>
            <span>Platform account</span>
          </div>
          <span class="user-chevron" aria-hidden="true">›</span>
        </div>

        <button class="logout-button" type="button" (click)="logout()">Sign out</button>

        <div class="version-card">
          <div class="version-copy">
            <strong>SCS TIX Platform</strong>
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
      background: linear-gradient(180deg, #0a2f63 0%, #061a38 55%, #04152d 100%);
      box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.04);
      color: #e8eef5;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 100vh;
      overflow: hidden;
      padding: 1.35rem 0.85rem 1rem;
      width: 16.5rem;
    }

    .brand {
      align-items: center;
      color: inherit;
      display: flex;
      flex-shrink: 0;
      gap: 0.8rem;
      margin-bottom: 1.35rem;
      padding: 0 0.35rem;
      text-decoration: none;
    }

    .brand-logo {
      align-items: center;
      background: linear-gradient(145deg, #2f7bff, #0b5cff);
      border-radius: 10px;
      box-shadow: 0 8px 18px rgba(11, 92, 255, 0.28);
      color: #fff;
      display: flex;
      height: 2.45rem;
      justify-content: center;
      width: 2.45rem;
    }

    .brand-logo svg {
      height: 1.35rem;
      width: 1.35rem;
    }

    .brand-copy {
      display: grid;
      gap: 0.12rem;
    }

    .brand-copy strong {
      color: #fff;
      font-size: 1.02rem;
      letter-spacing: 0.03em;
    }

    .brand-copy small {
      color: #9eb2cb;
      font-size: 0.72rem;
    }

    .menu {
      display: grid;
      flex: 1;
      gap: 0.18rem;
      min-height: 0;
    }

    .sidebar-scroll {
      background: transparent;
      overflow-x: hidden;
      overflow-y: auto;
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .sidebar-scroll::-webkit-scrollbar {
      display: none;
      height: 0;
      width: 0;
    }

    .menu-item {
      align-items: center;
      border-radius: 10px;
      color: #d8e3ef;
      display: flex;
      font-size: 0.88rem;
      gap: 0.72rem;
      min-height: 2.65rem;
      padding: 0.62rem 0.72rem;
      text-decoration: none;
      transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
    }

    .menu-item:hover,
    .menu-item.active {
      background: linear-gradient(90deg, #0868e8 0%, #064ab9 100%);
      box-shadow: 0 8px 18px rgba(3, 82, 190, 0.22);
      color: #fff;
    }

    .menu-label {
      flex: 1;
      line-height: 1.2;
    }

    .menu-chevron,
    .user-chevron {
      color: rgba(255, 255, 255, 0.72);
      font-size: 1rem;
      line-height: 1;
      transform: rotate(90deg);
    }

    .sidebar-footer {
      display: grid;
      flex-shrink: 0;
      gap: 0.85rem;
      margin-top: 1rem;
      padding-top: 0.85rem;
    }

    .user-card {
      align-items: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      display: flex;
      gap: 0.7rem;
      padding: 0.75rem 0.8rem;
    }

    .user-avatar {
      align-items: center;
      background: linear-gradient(145deg, #2f7bff, #0b5cff);
      border-radius: 50%;
      color: #fff;
      display: flex;
      flex: 0 0 2rem;
      font-size: 0.78rem;
      font-weight: 800;
      height: 2rem;
      justify-content: center;
      width: 2rem;
    }

    .user-copy {
      display: grid;
      flex: 1;
      gap: 0.08rem;
      min-width: 0;
    }

    .user-copy strong,
    .user-copy span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-copy strong {
      color: #fff;
      font-size: 0.82rem;
    }

    .user-copy span {
      color: #9eb2cb;
      font-size: 0.68rem;
    }

    .logout-button {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      color: #e8eef5;
      cursor: pointer;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 700;
      min-height: 2.35rem;
      padding: 0.58rem 0.8rem;
      text-align: left;
      transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
    }

    .logout-button:hover,
    .logout-button:focus-visible {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.18);
      color: #fff;
      outline: none;
    }

    .version-card {
      align-items: center;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      display: flex;
      gap: 0.65rem;
      justify-content: space-between;
      padding: 0.75rem 0.85rem;
    }

    .version-copy {
      display: grid;
      gap: 0.12rem;
    }

    .version-copy strong {
      color: #fff;
      font-size: 0.78rem;
    }

    .version-copy span {
      color: #9eb2cb;
      font-size: 0.68rem;
    }

    .version-art svg {
      height: 2.1rem;
      width: 2.1rem;
    }

    @media (max-width: 820px) {
      .sidebar {
        min-height: auto;
        position: static;
        width: 100%;
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

  readonly userInitials = computed(() =>
    (this.authSession.currentUser()?.fullName ?? 'Admin User')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
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

  linkActiveOptions(path: string): { exact: boolean } {
    if (path === '/admin/dashboard') {
      return { exact: true };
    }

    if (path === '/admin/subscriptions' || path === '/admin/tenants') {
      return { exact: false };
    }

    return { exact: true };
  }
}
