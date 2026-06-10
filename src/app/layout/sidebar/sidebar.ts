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
        <span>SCS-TIX</span>
        <small>Platform Admin</small>
      </a>

      @for (section of platformMenu; track section.label) {
        <nav>
          <h2>{{ section.label }}</h2>
          @for (item of section.items; track item.path) {
            @if (accessControl.canAccess(item.requiredPermission, item.requiredFeature)) {
              <a [routerLink]="item.path" routerLinkActive="active">{{ item.label }}</a>
            }
          }
        </nav>
      }

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
      background: #12222d;
      color: #eaf0f3;
      min-height: 100dvh;
      padding: 1.25rem 1rem;
    }

    .brand {
      color: #fff;
      display: grid;
      gap: 0.15rem;
      margin-bottom: 1.5rem;
      text-decoration: none;
    }

    .brand span {
      font-size: 1.15rem;
      font-weight: 800;
    }

    .brand small {
      color: #9fb1bd;
    }

    nav {
      display: grid;
      gap: 0.3rem;
      margin-top: 1.2rem;
    }

    h2 {
      color: #9fb1bd;
      font-size: 0.75rem;
      letter-spacing: 0;
      margin: 0.5rem 0;
      text-transform: uppercase;
    }

    a {
      border-radius: 8px;
      color: #dce6eb;
      padding: 0.65rem 0.75rem;
      text-decoration: none;
    }

    a.active,
    a:hover {
      background: #1f3948;
      color: #fff;
    }

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
}
