import { Component, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { platformMenuConfig } from '../../core/config/menu.config';
import { AuthSessionService } from '../../core/services/auth-session.service';
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
        @for (section of platformMenu; track section.label) {
          @for (item of section.items; track item.path) {
            <a
              class="menu-item"
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.path === '/admin/dashboard' }"
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
            <span>Super Administrator</span>
          </div>
          <span class="user-chevron" aria-hidden="true">›</span>
        </div>

        <div class="footer-bar">
          <p class="copyright">© 2025 SCS-TIX. All rights reserved.</p>
          <button class="collapse-toggle" type="button" aria-label="Collapse sidebar">«</button>
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

    .footer-bar {
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      gap: 0.65rem;
      justify-content: space-between;
      padding: 0.75rem 0.35rem 0;
    }

    .copyright {
      color: #8fa4be;
      font-size: 0.62rem;
      line-height: 1.35;
      margin: 0;
    }

    .collapse-toggle {
      background: transparent;
      border: 0;
      color: #b8c9dc;
      cursor: default;
      font-size: 1rem;
      line-height: 1;
      padding: 0;
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
  readonly platformMenu = platformMenuConfig;

  readonly userInitials = computed(() =>
    (this.authSession.currentUser()?.fullName ?? 'Admin User')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  );

  constructor(readonly authSession: AuthSessionService) {}
}
