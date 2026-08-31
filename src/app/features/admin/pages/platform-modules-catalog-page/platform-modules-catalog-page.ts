import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import {
  PlatformModulesCatalogFeature,
  PlatformModulesCatalogModule,
  PlatformModulesCatalogPermission
} from '../../models/platform-modules-catalog.model';
import { PlatformModulesCatalogApiService } from '../../services/platform-modules-catalog-api.service';

type ScopeTab = 'all' | 'platform' | 'tenant';

@Component({
  selector: 'app-platform-modules-catalog-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="catalog-page">
      <header class="page-heading">
        <div class="title-block">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <span>Platform</span>
            <span aria-hidden="true">/</span>
            <span class="current">Modules &amp; Features</span>
          </nav>
          <h1>Modules &amp; Features</h1>
          <p>Canonical platform capability registry returned by the backend.</p>
          <span class="title-accent" aria-hidden="true"></span>
        </div>
      </header>

      <!-- UNIFIED CONTROL TOOLBAR -->
      <section class="toolbar-card card">
        <div class="toolbar-row main-row">
          <div class="scope-tabs" role="tablist" aria-label="Scope Filter">
            <button
              type="button"
              role="tab"
              class="tab-btn"
              [class.active]="scopeFilter() === 'all'"
              [attr.aria-selected]="scopeFilter() === 'all'"
              (click)="setScope('all')"
            >
              All Scopes
            </button>
            <button
              type="button"
              role="tab"
              class="tab-btn"
              [class.active]="scopeFilter() === 'platform'"
              [attr.aria-selected]="scopeFilter() === 'platform'"
              (click)="setScope('platform')"
            >
              Platform Scope
            </button>
            <button
              type="button"
              role="tab"
              class="tab-btn"
              [class.active]="scopeFilter() === 'tenant'"
              [attr.aria-selected]="scopeFilter() === 'tenant'"
              (click)="setScope('tenant')"
            >
              Tenant Scope
            </button>
          </div>

          <label class="search-field">
            <span class="sr-only">Search capabilities</span>
            <div class="input-wrap">
              <svg viewBox="0 0 24 24" class="search-icon" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                type="search"
                placeholder="Search by module, feature, code, or permission..."
                [ngModel]="searchTerm()"
                (ngModelChange)="searchTerm.set($event)"
              />
              @if (searchTerm().trim().length > 0) {
                <button
                  type="button"
                  class="clear-btn"
                  aria-label="Clear search"
                  (click)="clearSearch()"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              }
            </div>
          </label>
        </div>

        <div class="toolbar-row meta-row">
          <div class="summary-pills">
            <span class="stat-pill">
              <strong class="stat-value">{{ filteredModules().length }}</strong>
              <span class="stat-label">Modules</span>
            </span>
            <span class="stat-divider" aria-hidden="true">•</span>
            <span class="stat-pill">
              <strong class="stat-value">{{ filteredFeatureCount() }}</strong>
              <span class="stat-label">Features</span>
            </span>
            <span class="stat-divider" aria-hidden="true">•</span>
            <span class="stat-pill">
              <strong class="stat-value">{{ filteredPermissionCount() }}</strong>
              <span class="stat-label">Permissions</span>
            </span>
          </div>

          <div class="accordion-controls">
            <button
              type="button"
              class="text-action-btn"
              (click)="expandAll()"
              [disabled]="!filteredModules().length"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" /></svg>
              Expand All
            </button>
            <span class="action-divider" aria-hidden="true">|</span>
            <button
              type="button"
              class="text-action-btn"
              (click)="collapseAll()"
              [disabled]="!filteredModules().length"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14l5-5 5 5" /></svg>
              Collapse All
            </button>
          </div>
        </div>
      </section>

      <!-- MAIN CONTENT STATES -->
      @if (isLoading()) {
        <div class="skeleton-container" aria-label="Loading modules and features">
          @for (item of [1, 2, 3]; track item) {
            <div class="skeleton-card card">
              <div class="skeleton-header">
                <div class="skeleton-line title"></div>
                <div class="skeleton-line badge"></div>
              </div>
              <div class="skeleton-line subtitle"></div>
              <div class="skeleton-body">
                <div class="skeleton-line row"></div>
                <div class="skeleton-line row"></div>
              </div>
            </div>
          }
        </div>
      } @else if (errorMessage()) {
        <div class="state-card card error" role="alert">
          <svg viewBox="0 0 24 24" class="state-icon" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <strong>Modules and features could not be loaded</strong>
          <span>{{ errorMessage() }}</span>
          <button type="button" class="btn primary" (click)="loadCatalog()">Try again</button>
        </div>
      } @else if (!(catalog()?.modules?.length)) {
        <div class="state-card card empty">
          <svg viewBox="0 0 24 24" class="state-icon" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18M3 9h18" />
          </svg>
          <strong>No modules found</strong>
          <span>The backend catalog did not return any capability modules for this filter.</span>
        </div>
      } @else if (!filteredModules().length) {
        <div class="state-card card empty">
          <svg viewBox="0 0 24 24" class="state-icon" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <strong>No matching modules or features</strong>
          <span>Try a different search term or scope tab.</span>
          <button type="button" class="btn secondary" (click)="clearSearch()">Clear search</button>
        </div>
      } @else {
        <!-- MODULE ACCORDION LIST -->
        <section class="catalog-list">
          @for (module of filteredModules(); track module.id; let idx = $index) {
            <article class="module-card card" [class.expanded]="isModuleExpanded(module.id, idx)">
              <header
                class="module-header"
                (click)="toggleModule(module.id)"
                (keydown.enter)="toggleModule(module.id)"
                (keydown.space)="$event.preventDefault(); toggleModule(module.id)"
                tabindex="0"
                role="button"
                [attr.aria-expanded]="isModuleExpanded(module.id, idx)"
                [attr.aria-controls]="'module-body-' + module.id"
              >
                <div class="header-main">
                  <span class="chevron-wrap" aria-hidden="true">
                    <svg viewBox="0 0 24 24" class="chevron-icon">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </span>
                  <div class="title-meta-wrap">
                    <div class="module-title-row">
                      <h2>{{ module.name }}</h2>
                      <span
                        class="scope-tag"
                        [class.platform]="module.scope === 'PLATFORM'"
                      >
                        {{ module.scope }}
                      </span>
                    </div>
                    <p class="module-code"><code>{{ module.moduleCode }}</code></p>
                  </div>
                </div>

                <div class="header-sub">
                  <span class="meta-pill">
                    {{ module.features.length }} features · {{ getModulePermissionCount(module) }} perms
                  </span>
                  <span class="status-badge active">{{ module.status }}</span>
                </div>
              </header>

              @if (isModuleExpanded(module.id, idx)) {
                <div [id]="'module-body-' + module.id" class="module-body">
                  @if (module.description) {
                    <p class="module-description">{{ module.description }}</p>
                  }

                  @if (!canViewFeatures()) {
                    <div class="restricted-note">
                      Feature details require the <code>platform.features.view</code> permission.
                    </div>
                  } @else if (!module.features.length) {
                    <p class="muted">No features returned for this module.</p>
                  } @else {
                    <!-- RESPONSIVE FEATURE LIST -->
                    <div class="feature-list">
                      @for (feature of module.features; track feature.id) {
                        <div class="feature-card">
                          <div class="feature-header-row">
                            <div class="feature-title-block">
                              <h3>{{ feature.name }}</h3>
                              <code>{{ feature.featureCode }}</code>
                            </div>
                            <div class="feature-tags">
                              <span
                                class="scope-tag small"
                                [class.platform]="feature.scope === 'PLATFORM'"
                              >
                                {{ feature.scope }}
                              </span>
                              <span class="status-badge active small">{{ feature.status }}</span>
                            </div>
                          </div>

                          @if (feature.description) {
                            <p class="feature-description">{{ feature.description }}</p>
                          }

                          <div class="permissions-block">
                            <div class="permissions-header">
                              <span class="permissions-label">
                                Permissions ({{ feature.permissions.length }})
                              </span>
                            </div>

                            @if (feature.permissions.length) {
                              <div class="permission-pill-list">
                                @for (perm of feature.permissions; track perm.id) {
                                  <span
                                    class="permission-pill"
                                    [title]="perm.description || (perm.name + ' (' + perm.permissionCode + ')')"
                                  >
                                    <code class="perm-code">{{ perm.permissionCode }}</code>
                                    <span class="action-badge" [class]="getActionClass(perm.actionType)">
                                      {{ perm.actionType }}
                                    </span>
                                  </span>
                                }
                              </div>
                            } @else {
                              <span class="muted font-small">No explicit granular permissions attached.</span>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </article>
          }
        </section>
      }
    </section>
  `,
  styles: `
    :host {
      color: #14213d;
      display: block;
      max-width: 1400px;
      margin: 0 auto;
    }
    * { box-sizing: border-box; }

    .catalog-page { display: grid; gap: 1rem; }

    .page-heading {
      align-items: flex-start;
      display: flex;
      gap: 1.25rem;
      justify-content: space-between;
    }

    .breadcrumb {
      align-items: center;
      color: #667085;
      display: flex;
      font-size: 0.78rem;
      gap: 0.45rem;
      margin-bottom: 0.45rem;
    }

    .breadcrumb .current { color: #344054; font-weight: 700; }

    .title-block h1 {
      color: #101a38;
      font-size: clamp(1.5rem, 2.2vw, 1.85rem);
      margin: 0;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .title-block p { color: #667085; font-size: 0.88rem; margin: 0.35rem 0 0; }

    .title-accent {
      background: linear-gradient(90deg, #0b5cff, #5b8dff);
      border-radius: 99px;
      display: block;
      height: 3px;
      margin-top: 0.65rem;
      width: 2.5rem;
    }

    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04), 0 4px 16px rgba(16, 24, 40, 0.03);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    /* TOOLBAR CARD */
    .toolbar-card {
      display: grid;
      gap: 0.85rem;
      padding: 0.85rem 1.15rem;
    }

    .toolbar-row {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 0.85rem;
      justify-content: space-between;
    }

    .toolbar-row.main-row { gap: 1rem; }

    .scope-tabs {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      display: flex;
      gap: 0.25rem;
      padding: 0.25rem;
    }

    .tab-btn {
      background: transparent;
      border: 0;
      border-radius: 6px;
      color: #64748b;
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 700;
      padding: 0.45rem 0.85rem;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .tab-btn:hover { color: #1e293b; background: #f1f5f9; }

    .tab-btn.active {
      background: #ffffff;
      color: #0b5cff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      font-weight: 800;
    }

    .search-field {
      flex: 1;
      min-width: 18rem;
    }

    .input-wrap {
      align-items: center;
      display: flex;
      position: relative;
      width: 100%;
    }

    .input-wrap input {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.84rem;
      min-height: 2.35rem;
      padding: 0 2.25rem 0 2.25rem;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      width: 100%;
    }

    .input-wrap input:focus {
      outline: none;
      border-color: #0b5cff;
      box-shadow: 0 0 0 3px rgba(11, 92, 255, 0.12);
    }

    .search-icon {
      color: #94a3b8;
      fill: none;
      height: 0.95rem;
      left: 0.75rem;
      pointer-events: none;
      position: absolute;
      stroke: currentColor;
      stroke-width: 2.2;
      width: 0.95rem;
    }

    .clear-btn {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 4px;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      height: 1.5rem;
      justify-content: center;
      padding: 0;
      position: absolute;
      right: 0.5rem;
      width: 1.5rem;
    }

    .clear-btn:hover { color: #334155; background: #f1f5f9; }
    .clear-btn svg { fill: none; height: 0.9rem; stroke: currentColor; stroke-width: 2.5; width: 0.9rem; }

    .summary-pills {
      align-items: center;
      display: flex;
      gap: 0.65rem;
    }

    .stat-pill {
      align-items: baseline;
      display: flex;
      gap: 0.35rem;
    }

    .stat-value { color: #0b5cff; font-size: 0.95rem; font-weight: 800; }
    .stat-label { color: #64748b; font-size: 0.76rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
    .stat-divider { color: #cbd5e1; font-size: 0.75rem; }

    .accordion-controls {
      align-items: center;
      display: flex;
      gap: 0.5rem;
    }

    .text-action-btn {
      align-items: center;
      background: transparent;
      border: 0;
      color: #475569;
      cursor: pointer;
      display: inline-flex;
      font-size: 0.78rem;
      font-weight: 700;
      gap: 0.25rem;
      padding: 0.25rem 0.45rem;
      transition: color 0.15s ease;
    }

    .text-action-btn:hover:not(:disabled) { color: #0b5cff; }
    .text-action-btn:disabled { color: #cbd5e1; cursor: not-allowed; }
    .text-action-btn svg { fill: none; height: 0.85rem; stroke: currentColor; stroke-width: 2.2; width: 0.85rem; }
    .action-divider { color: #e2e8f0; font-size: 0.8rem; }

    /* MODULE ACCORDION */
    .catalog-list { display: grid; gap: 0.75rem; }

    .module-card {
      padding: 0;
      overflow: hidden;
    }

    .module-card.expanded {
      border-color: #cbd5e1;
      box-shadow: 0 2px 8px rgba(16, 24, 40, 0.06);
    }

    .module-header {
      align-items: center;
      background: #ffffff;
      cursor: pointer;
      display: flex;
      flex-wrap: wrap;
      gap: 0.85rem;
      justify-content: space-between;
      padding: 0.9rem 1.15rem;
      transition: background 0.15s ease;
      user-select: none;
    }

    .module-header:hover { background: #f8fafc; }
    .module-header:focus-visible { outline: 2px solid #0b5cff; outline-offset: -2px; }

    .header-main {
      align-items: center;
      display: flex;
      gap: 0.75rem;
      flex: 1;
      min-width: 15rem;
    }

    .chevron-wrap {
      align-items: center;
      color: #64748b;
      display: flex;
      height: 1.5rem;
      justify-content: center;
      transition: transform 0.2s ease;
      width: 1.5rem;
    }

    .module-card.expanded .chevron-wrap { transform: rotate(90deg); color: #0b5cff; }

    .chevron-icon { fill: none; height: 1.1rem; stroke: currentColor; stroke-width: 2.5; width: 1.1rem; }

    .title-meta-wrap { display: grid; gap: 0.15rem; }

    .module-title-row {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .module-title-row h2 {
      color: #0f172a;
      font-size: 1.05rem;
      font-weight: 800;
      margin: 0;
    }

    .module-code code {
      background: #f1f5f9;
      border-radius: 4px;
      color: #475569;
      font-size: 0.75rem;
      padding: 0.1rem 0.35rem;
    }

    .header-sub {
      align-items: center;
      display: flex;
      gap: 0.65rem;
    }

    .meta-pill {
      background: #f1f5f9;
      border-radius: 99px;
      color: #475569;
      font-size: 0.74rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      white-space: nowrap;
    }

    .scope-tag {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      color: #475569;
      font-size: 0.68rem;
      font-weight: 800;
      padding: 0.15rem 0.45rem;
      letter-spacing: 0.04em;
    }

    .scope-tag.platform {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #1d4ed8;
    }

    .scope-tag.small { font-size: 0.62rem; padding: 0.1rem 0.35rem; }

    .status-badge {
      border-radius: 99px;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
    }

    .status-badge.active { background: #dcfce7; color: #15803d; }
    .status-badge.small { font-size: 0.65rem; padding: 0.15rem 0.45rem; }

    /* MODULE BODY */
    .module-body {
      border-top: 1px solid #f1f5f9;
      padding: 1rem 1.15rem;
      background: #fafbfc;
    }

    .module-description {
      color: #475569;
      font-size: 0.85rem;
      margin: 0 0 1rem;
      line-height: 1.45;
    }

    /* RESPONSIVE FEATURE LIST */
    .feature-list { display: grid; gap: 0.75rem; }

    .feature-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.85rem 1rem;
      display: grid;
      gap: 0.6rem;
    }

    .feature-header-row {
      align-items: flex-start;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: space-between;
    }

    .feature-title-block {
      align-items: baseline;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .feature-title-block h3 {
      color: #0f172a;
      font-size: 0.95rem;
      font-weight: 800;
      margin: 0;
    }

    .feature-title-block code {
      color: #64748b;
      font-size: 0.76rem;
    }

    .feature-tags { display: flex; gap: 0.4rem; align-items: center; }

    .feature-description {
      color: #64748b;
      font-size: 0.82rem;
      margin: 0;
      line-height: 1.4;
    }

    .permissions-block {
      display: grid;
      gap: 0.35rem;
      margin-top: 0.25rem;
    }

    .permissions-label {
      color: #94a3b8;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .permission-pill-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .permission-pill {
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      display: inline-flex;
      gap: 0.35rem;
      padding: 0.25rem 0.5rem;
      transition: border-color 0.15s ease;
    }

    .permission-pill:hover { border-color: #cbd5e1; }

    .perm-code {
      color: #334155;
      font-size: 0.76rem;
      font-weight: 600;
    }

    /* ACTION MICRO-BADGES */
    .action-badge {
      border-radius: 4px;
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.03em;
      padding: 0.1rem 0.35rem;
      text-transform: uppercase;
    }

    .action-view { background: #eff6ff; color: #1d4ed8; }
    .action-create { background: #ecfdf5; color: #15803d; }
    .action-manage { background: #fff7ed; color: #c2410c; }
    .action-delete { background: #fef2f2; color: #b91c1c; }
    .action-default { background: #f1f5f9; color: #475569; }

    .muted { color: #94a3b8; font-size: 0.8rem; margin: 0; }
    .font-small { font-size: 0.78rem; }

    .restricted-note {
      background: #fffbe6;
      border: 1px solid #ffe58f;
      border-radius: 8px;
      color: #d48806;
      font-size: 0.82rem;
      padding: 0.65rem 0.85rem;
    }

    /* SKELETON LOADERS */
    .skeleton-container { display: grid; gap: 0.75rem; }
    .skeleton-card { padding: 1rem 1.15rem; display: grid; gap: 0.75rem; }
    .skeleton-header { display: flex; justify-content: space-between; }
    .skeleton-line {
      animation: pulse 1.5s ease-in-out infinite;
      background: #f1f5f9;
      border-radius: 4px;
    }
    .skeleton-line.title { height: 1.2rem; width: 12rem; }
    .skeleton-line.badge { height: 1.2rem; width: 5rem; }
    .skeleton-line.subtitle { height: 0.85rem; width: 18rem; }
    .skeleton-line.row { height: 3rem; width: 100%; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.45; }
    }

    /* STATE CARDS */
    .state-card {
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      padding: 2.5rem 1.5rem;
      text-align: center;
    }

    .state-icon {
      color: #94a3b8;
      fill: none;
      height: 2.25rem;
      stroke: currentColor;
      stroke-width: 1.8;
      width: 2.25rem;
    }

    .state-card.error { color: #b42318; }
    .state-card.error .state-icon { color: #f04438; }

    .btn {
      align-items: center;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      font-size: 0.84rem;
      font-weight: 700;
      justify-content: center;
      min-height: 2.35rem;
      padding: 0 1rem;
      transition: all 0.15s ease;
    }

    .btn.primary { background: #0b5cff; border: 0; color: #ffffff; }
    .btn.primary:hover { background: #004ecc; }
    .btn.secondary { background: #ffffff; border: 1px solid #cbd5e1; color: #334155; }
    .btn.secondary:hover { background: #f8fafc; border-color: #94a3b8; }

    .sr-only {
      border: 0;
      clip: rect(0, 0, 0, 0);
      height: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      position: absolute;
      width: 1px;
    }

    /* RESPONSIVE MEDIA QUERIES */
    @media (max-width: 1024px) {
      .toolbar-card { gap: 0.75rem; padding: 0.75rem 1rem; }
      .search-field { min-width: 100%; order: 2; }
      .scope-tabs { width: 100%; justify-content: space-between; order: 1; }
      .tab-btn { flex: 1; text-align: center; }
      .toolbar-row.meta-row { justify-content: space-between; }
    }

    @media (max-width: 640px) {
      .module-header { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
      .header-sub { width: 100%; justify-content: space-between; }
      .summary-pills { font-size: 0.72rem; }
    }
  `
})
export class PlatformModulesCatalogPage implements OnInit {
  private readonly api = inject(PlatformModulesCatalogApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly accessControl = inject(AccessControlService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchTerm = signal('');
  readonly scopeFilter = signal<ScopeTab>('all');
  readonly catalog = signal<{ modules: PlatformModulesCatalogModule[] } | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly expandedModules = signal<Set<string>>(new Set());
  readonly hasUserToggled = signal(false);

  readonly searchActive = computed(() => this.searchTerm().trim().length > 0);

  readonly filteredModules = computed(() =>
    filterModules(this.catalog()?.modules ?? [], this.searchTerm())
  );

  readonly filteredFeatureCount = computed(() =>
    this.filteredModules().reduce((total, module) => total + module.features.length, 0)
  );

  readonly filteredPermissionCount = computed(() =>
    this.filteredModules().reduce(
      (total, module) =>
        total +
        module.features.reduce((fTotal, feature) => fTotal + (feature.permissions?.length ?? 0), 0),
      0
    )
  );

  ngOnInit(): void {
    this.loadCatalog();
  }

  setScope(scope: ScopeTab): void {
    this.scopeFilter.set(scope);
    this.hasUserToggled.set(false);
    this.expandedModules.set(new Set());
    this.loadCatalog();
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  loadCatalog(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const scopeParam = this.scopeFilter() === 'all' ? undefined : this.scopeFilter();

    this.api
      .getCatalog(scopeParam)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.catalog.set(response);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.catalog.set(null);
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  isModuleExpanded(moduleId: string, index: number): boolean {
    if (this.searchActive()) {
      return true;
    }
    if (this.hasUserToggled()) {
      return this.expandedModules().has(moduleId);
    }
    // Default: first module expanded, or all expanded if user expanded all
    return index === 0 || this.expandedModules().has(moduleId);
  }

  toggleModule(moduleId: string): void {
    this.hasUserToggled.set(true);
    const current = new Set(this.expandedModules());
    if (current.has(moduleId)) {
      current.delete(moduleId);
    } else {
      current.add(moduleId);
    }
    this.expandedModules.set(current);
  }

  expandAll(): void {
    this.hasUserToggled.set(true);
    const allIds = new Set(this.filteredModules().map((m) => m.id));
    this.expandedModules.set(allIds);
  }

  collapseAll(): void {
    this.hasUserToggled.set(true);
    this.expandedModules.set(new Set());
  }

  getModulePermissionCount(module: PlatformModulesCatalogModule): number {
    return module.features.reduce(
      (total, f) => total + (f.permissions?.length ?? 0),
      0
    );
  }

  getActionClass(actionType: string): string {
    const action = actionType.toLowerCase();
    if (['view', 'read', 'list', 'get'].includes(action)) return 'action-view';
    if (['create', 'add', 'insert'].includes(action)) return 'action-create';
    if (['edit', 'update', 'manage', 'adjust'].includes(action)) return 'action-manage';
    if (['delete', 'remove', 'revoke'].includes(action)) return 'action-delete';
    return 'action-default';
  }

  canViewFeatures(): boolean {
    return this.accessControl.hasPermission(platformPermissions.featuresView);
  }
}

function filterModules(
  modules: PlatformModulesCatalogModule[],
  searchTerm: string
): PlatformModulesCatalogModule[] {
  const term = searchTerm.trim().toLowerCase();
  if (!term) {
    return modules;
  }

  return modules
    .map((module) => ({
      ...module,
      features: module.features.filter(
        (feature) => matchesFeature(feature, term) || matchesModule(module, term)
      )
    }))
    .filter((module) => matchesModule(module, term) || module.features.length > 0);
}

function matchesModule(module: PlatformModulesCatalogModule, term: string): boolean {
  return module.name.toLowerCase().includes(term) || module.moduleCode.toLowerCase().includes(term);
}

function matchesFeature(feature: PlatformModulesCatalogFeature, term: string): boolean {
  const matchesSelf =
    feature.name.toLowerCase().includes(term) ||
    feature.featureCode.toLowerCase().includes(term) ||
    (feature.description?.toLowerCase().includes(term) ?? false);

  const matchesPermissions = (feature.permissions ?? []).some(
    (perm) =>
      perm.name.toLowerCase().includes(term) ||
      perm.permissionCode.toLowerCase().includes(term)
  );

  return matchesSelf || matchesPermissions;
}
