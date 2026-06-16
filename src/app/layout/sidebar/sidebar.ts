import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { platformMenuConfig, tenantMenuConfig } from '../../core/config/menu.config';
import { AccessControlService } from '../../core/services/access-control.service';
import { TenantContextService } from '../../core/services/tenant-context.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <a class="brand" routerLink="/admin/dashboard">
        <i>S</i>
        <span><strong>SCS TIX</strong><small>UNIFIED COMMERCE</small></span>
      </a>

      @for (section of platformMenu; track section.label) {
        <nav>
          @for (item of section.items; track item.path) {
            @if (accessControl.canAccess(item.requiredPermission, item.requiredFeature)) {
              <a [routerLink]="item.path" routerLinkActive="active"><b>{{ menuIcon(item.label) }}</b>{{ item.label }}</a>
            }
          }
        </nav>
      }

      <div class="version-card">
        <strong>SCS TIX Platform</strong>
        <span>Version 1.0.0 <i></i></span>
        <div class="platform-cube">S</div>
      </div>

      @if (tenantContext.selectedTenant(); as tenant) {
        @for (section of tenantMenu; track section.label) {
          <nav>
            <h2>{{ section.label }}</h2>
            @for (item of section.items; track item.path) {
              @if (accessControl.canAccess(item.requiredPermission, item.requiredFeature)) {
                <a [routerLink]="resolveTenantPath(item.path, tenant.tenantId)" routerLinkActive="active">{{ item.label }}</a>
              }
            }
          </nav>
        }
      }
    </aside>
  `,
  styles: `
    .sidebar {
      background: linear-gradient(180deg, #061a38 0%, #03152e 100%);
      color: #eaf0f3;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      padding: 1.25rem 0.7rem;
    }

    .brand {
      color: #fff;
      align-items: center;
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      text-decoration: none;
    }

    .brand > i {
      align-items: center;
      background: linear-gradient(145deg, #3b82f6, #0b5cff);
      border-radius: 10px;
      display: flex;
      font-size: 1.15rem;
      font-style: normal;
      font-weight: 900;
      height: 2.5rem;
      justify-content: center;
      width: 2.5rem;
    }

    .brand span {
      display: grid;
      gap: 0.15rem;
    }

    .brand strong {
      font-size: 1.05rem;
      letter-spacing: 0.04em;
    }

    .brand small {
      color: #91a8c6;
      font-size: 0.55rem;
      letter-spacing: 0.16em;
    }

    nav {
      display: grid;
      gap: 0.3rem;
      margin-top: 0.45rem;
    }

    a {
      border-radius: 8px;
      color: #dce6eb;
      align-items: center;
      display: flex;
      font-size: 0.9rem;
      gap: 0.75rem;
      padding: 0.72rem 0.75rem;
      text-decoration: none;
    }

    a.active,
    a:hover {
      background: linear-gradient(90deg, #0868e8, #064ab9);
      box-shadow: 0 8px 20px rgba(3, 82, 190, 0.25);
      color: #fff;
    }

    a b {
      align-items: center;
      border: 1px solid rgba(255, 255, 255, 0.45);
      border-radius: 5px;
      display: flex;
      font-size: 0.62rem;
      height: 1.25rem;
      justify-content: center;
      width: 1.25rem;
    }

    .version-card {
      background: linear-gradient(145deg, rgba(7, 45, 91, 0.95), rgba(3, 31, 66, 0.95));
      border: 1px solid #0a3c7a;
      border-radius: 12px;
      display: grid;
      gap: 0.35rem;
      margin-top: auto;
      min-height: 7rem;
      overflow: hidden;
      padding: 1rem;
      position: relative;
    }

    .version-card strong { font-size: 0.82rem; }
    .version-card span { color: #b4c6dc; font-size: 0.72rem; }
    .version-card span i { background: #10b981; border-radius: 50%; display: inline-block; height: 0.45rem; width: 0.45rem; }
    .platform-cube { align-items: center; align-self: end; background: #0b5cff; border: 5px solid rgba(65, 143, 255, 0.35); border-radius: 12px; color: #fff; display: flex; font-weight: 900; height: 2.8rem; justify-content: center; justify-self: center; width: 2.8rem; }

    @media (max-width: 820px) {
      .sidebar {
        min-height: auto;
      }
    }
  `
})
export class Sidebar {
  readonly platformMenu = platformMenuConfig;
  readonly tenantMenu = tenantMenuConfig;

  constructor(
    readonly accessControl: AccessControlService,
    readonly tenantContext: TenantContextService
  ) {}

  resolveTenantPath(path: string, tenantId: string): string {
    return path.replace(':tenantId', tenantId);
  }

  menuIcon(label: string): string {
    return label.split(/\s|&/).filter(Boolean).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
  }
}
