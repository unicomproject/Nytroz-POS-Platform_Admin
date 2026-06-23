import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import {
  PermissionCatalogFeature,
  PermissionCatalogModule,
  PermissionCatalogPermission,
  PermissionCatalogScopeFilter,
  PermissionCatalogTreeResponse
} from '../../models/platform-permission-catalog.model';
import { PlatformPermissionCatalogApiService } from '../../services/platform-permission-catalog-api.service';

interface FilteredPermissionCatalogModule extends PermissionCatalogModule {
  features: FilteredPermissionCatalogFeature[];
}

interface FilteredPermissionCatalogFeature extends PermissionCatalogFeature {
  permissions: PermissionCatalogPermission[];
}

@Component({
  selector: 'app-platform-permission-catalog-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="catalog-page">
      <header class="page-heading">
        <div class="title-block">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <span>Platform</span>
            <span aria-hidden="true">/</span>
            <span class="current">Permission Catalog</span>
          </nav>
          <h1>Roles and Permissions</h1>
          <p>Browse the backend permission catalog by module, feature, and permission code.</p>
          <span class="title-accent" aria-hidden="true"></span>
        </div>
      </header>

      <section class="filters card">
        <label class="filter-field search-field">
          <span class="field-label">Search</span>
          <span class="input-wrap">
            <input
              type="search"
              placeholder="Search by permission code or name..."
              [ngModel]="searchInput()"
              (ngModelChange)="onSearchChange($event)"
              aria-label="Search permission catalog"
            />
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          </span>
        </label>

        <label class="filter-field">
          <span class="field-label">Scope</span>
          <select [ngModel]="scopeFilter()" (ngModelChange)="onScopeChange($event)">
            <option value="">All scopes</option>
            <option value="platform">Platform</option>
            <option value="tenant">Tenant</option>
            <option value="pos">POS</option>
          </select>
        </label>

        <div class="summary-pills" aria-live="polite">
          <span class="pill">{{ summaryLabel('modules', moduleCount()) }}</span>
          <span class="pill">{{ summaryLabel('features', featureCount()) }}</span>
          <span class="pill">{{ summaryLabel('permissions', permissionCount()) }}</span>
        </div>
      </section>

      @if (isLoading()) {
        <div class="state-card loading" aria-busy="true">
          <div class="skeleton-row"></div>
          <div class="skeleton-row short"></div>
          <div class="skeleton-row"></div>
          <p>Loading permission catalog...</p>
        </div>
      } @else if (errorMessage()) {
        <div class="state-card error">
          <strong>Permission catalog could not be loaded</strong>
          <span>{{ errorMessage() }}</span>
          <button type="button" (click)="loadCatalog()">Try again</button>
        </div>
      } @else if (!filteredModules().length) {
        <div class="state-card empty">
          <strong>No permissions match the current filters</strong>
          <span>Try clearing the search term or choosing a different scope.</span>
        </div>
      } @else {
        <section class="catalog-tree card" aria-label="Permission catalog tree">
          @for (module of filteredModules(); track module.id) {
            <article class="module-block">
              <button
                type="button"
                class="module-header"
                [attr.aria-expanded]="isExpanded('module', module.id)"
                (click)="toggleExpanded('module', module.id)"
              >
                <span class="chevron" [class.open]="isExpanded('module', module.id)" aria-hidden="true"></span>
                <div class="heading-copy">
                  <strong>{{ module.name }}</strong>
                  <span>{{ module.code }}</span>
                </div>
                <span class="scope-badge" [class]="module.scope">{{ module.scope }}</span>
                <span class="count-badge">{{ module.features.length }} features</span>
              </button>

              @if (isExpanded('module', module.id)) {
                <div class="module-body">
                  @for (feature of module.features; track feature.id) {
                    <section class="feature-block">
                      <button
                        type="button"
                        class="feature-header"
                        [attr.aria-expanded]="isExpanded('feature', feature.id)"
                        (click)="toggleExpanded('feature', feature.id)"
                      >
                        <span class="chevron" [class.open]="isExpanded('feature', feature.id)" aria-hidden="true"></span>
                        <div class="heading-copy">
                          <strong>{{ feature.name }}</strong>
                          <span>{{ feature.code }}</span>
                        </div>
                        <span class="count-badge subtle">{{ feature.permissions.length }} permissions</span>
                      </button>

                      @if (isExpanded('feature', feature.id)) {
                        <ul class="permission-list">
                          @for (permission of feature.permissions; track permission.id) {
                            <li>
                              <div class="permission-row">
                                <div class="permission-copy">
                                  <strong>{{ permission.name }}</strong>
                                  <code>{{ permission.code }}</code>
                                  @if (permission.description) {
                                    <p>{{ permission.description }}</p>
                                  }
                                </div>
                                <div class="permission-meta">
                                  <span class="scope-badge" [class]="permission.scope">{{ permission.scope }}</span>
                                  @if (permission.action) {
                                    <span class="action-badge">{{ permission.action }}</span>
                                  }
                                  @if (!permission.isActive) {
                                    <span class="inactive-badge">Inactive</span>
                                  }
                                </div>
                              </div>
                            </li>
                          }
                        </ul>
                      }
                    </section>
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
    .catalog-page {
      display: grid;
      gap: 1rem;
    }

    .page-heading {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    .title-block h1 {
      color: #10243b;
      font-size: 1.65rem;
      margin: 0.35rem 0 0.4rem;
    }

    .title-block p {
      color: #5f738a;
      margin: 0;
    }

    .breadcrumb {
      align-items: center;
      color: #7a8fa6;
      display: flex;
      font-size: 0.78rem;
      gap: 0.35rem;
    }

    .breadcrumb .current {
      color: #355272;
      font-weight: 600;
    }

    .title-accent {
      background: linear-gradient(90deg, #2f80ed, #56ccf2);
      border-radius: 999px;
      display: block;
      height: 3px;
      margin-top: 0.75rem;
      width: 3.5rem;
    }

    .card {
      background: #fff;
      border: 1px solid #e4ebf3;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(16, 36, 59, 0.04);
    }

    .filters {
      align-items: end;
      display: grid;
      gap: 1rem;
      grid-template-columns: minmax(240px, 1.5fr) minmax(160px, 0.7fr) minmax(220px, 1fr);
      padding: 1rem 1.1rem;
    }

    .filter-field {
      display: grid;
      gap: 0.35rem;
    }

    .field-label {
      color: #5f738a;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .filter-field select,
    .filter-field input {
      background: #f8fbff;
      border: 1px solid #d8e3ef;
      border-radius: 10px;
      color: #10243b;
      font: inherit;
      min-height: 42px;
      padding: 0.55rem 0.75rem;
      width: 100%;
    }

    .search-field .input-wrap {
      position: relative;
    }

    .search-field svg {
      height: 1rem;
      pointer-events: none;
      position: absolute;
      right: 0.75rem;
      stroke: #8aa0b8;
      stroke-width: 2;
      top: 50%;
      transform: translateY(-50%);
      width: 1rem;
    }

    .search-field svg path:last-child {
      fill: none;
    }

    .summary-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .pill {
      background: #eef5ff;
      border-radius: 999px;
      color: #355272;
      font-size: 0.78rem;
      font-weight: 600;
      padding: 0.45rem 0.75rem;
    }

    .state-card {
      align-items: start;
      background: #fff;
      border: 1px solid #e4ebf3;
      border-radius: 16px;
      display: grid;
      gap: 0.65rem;
      padding: 1.25rem;
    }

    .state-card strong {
      color: #10243b;
    }

    .state-card span {
      color: #5f738a;
    }

    .state-card.error {
      border-color: #f3c7c7;
      background: #fff7f7;
    }

    .state-card.empty {
      background: #fbfdff;
    }

    .state-card button {
      background: #2f80ed;
      border: 0;
      border-radius: 10px;
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-weight: 600;
      padding: 0.55rem 0.9rem;
      width: fit-content;
    }

    .skeleton-row {
      animation: pulse 1.4s ease-in-out infinite;
      background: linear-gradient(90deg, #edf3fa 25%, #f8fbff 50%, #edf3fa 75%);
      background-size: 200% 100%;
      border-radius: 10px;
      height: 14px;
      width: 100%;
    }

    .skeleton-row.short {
      width: 55%;
    }

    @keyframes pulse {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }

    .catalog-tree {
      display: grid;
      gap: 0.75rem;
      padding: 0.85rem;
    }

    .module-block,
    .feature-block {
      border: 1px solid #e8eef5;
      border-radius: 14px;
      overflow: hidden;
    }

    .module-header,
    .feature-header {
      align-items: center;
      background: #f8fbff;
      border: 0;
      cursor: pointer;
      display: grid;
      gap: 0.75rem;
      grid-template-columns: auto 1fr auto auto;
      padding: 0.85rem 1rem;
      text-align: left;
      width: 100%;
    }

    .feature-header {
      background: #fcfdff;
      grid-template-columns: auto 1fr auto;
    }

    .heading-copy {
      display: grid;
      gap: 0.15rem;
    }

    .heading-copy strong {
      color: #10243b;
      font-size: 0.95rem;
    }

    .heading-copy span {
      color: #7a8fa6;
      font-size: 0.78rem;
    }

    .chevron {
      border-right: 2px solid #7a8fa6;
      border-top: 2px solid #7a8fa6;
      height: 0.55rem;
      transform: rotate(45deg);
      transition: transform 0.15s ease;
      width: 0.55rem;
    }

    .chevron.open {
      transform: rotate(135deg);
    }

    .scope-badge,
    .action-badge,
    .count-badge,
    .inactive-badge {
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      padding: 0.25rem 0.55rem;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .scope-badge.platform {
      background: #eef0ff;
      color: #4f46e5;
    }

    .scope-badge.tenant {
      background: #e8f7ef;
      color: #15803d;
    }

    .scope-badge.pos {
      background: #fff4e8;
      color: #c2410c;
    }

    .count-badge {
      background: #edf3fa;
      color: #355272;
    }

    .count-badge.subtle {
      background: #f3f6fa;
      color: #6b8198;
    }

    .action-badge {
      background: #eef5ff;
      color: #2563eb;
    }

    .inactive-badge {
      background: #fdecec;
      color: #b42318;
    }

    .module-body {
      display: grid;
      gap: 0.65rem;
      padding: 0.65rem;
    }

    .permission-list {
      display: grid;
      gap: 0.55rem;
      list-style: none;
      margin: 0;
      padding: 0 0.85rem 0.85rem 2.2rem;
    }

    .permission-row {
      align-items: start;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
    }

    .permission-copy {
      display: grid;
      gap: 0.2rem;
      min-width: 0;
    }

    .permission-copy strong {
      color: #10243b;
      font-size: 0.88rem;
    }

    .permission-copy code {
      background: #f3f6fa;
      border-radius: 6px;
      color: #355272;
      font-size: 0.76rem;
      padding: 0.15rem 0.4rem;
      width: fit-content;
    }

    .permission-copy p {
      color: #6b8198;
      font-size: 0.78rem;
      margin: 0;
    }

    .permission-meta {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      justify-content: flex-end;
    }

    @media (max-width: 900px) {
      .filters {
        grid-template-columns: 1fr;
      }

      .summary-pills {
        justify-content: flex-start;
      }

      .module-header,
      .feature-header,
      .permission-row {
        grid-template-columns: auto 1fr;
      }

      .permission-row {
        flex-direction: column;
      }
    }
  `
})
export class PlatformPermissionCatalogPage {
  private readonly api = inject(PlatformPermissionCatalogApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges$ = new Subject<string>();

  readonly catalog = signal<PermissionCatalogTreeResponse | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly searchInput = signal('');
  readonly searchTerm = signal('');
  readonly scopeFilter = signal<PermissionCatalogScopeFilter>('');
  private readonly expandedKeys = signal<Set<string>>(new Set());

  readonly filteredModules = computed(() =>
    filterCatalog(this.catalog()?.modules ?? [], this.searchTerm(), this.scopeFilter())
  );

  readonly moduleCount = computed(() => this.filteredModules().length);
  readonly featureCount = computed(() =>
    this.filteredModules().reduce((total, module) => total + module.features.length, 0)
  );
  readonly permissionCount = computed(() =>
    this.filteredModules().reduce(
      (total, module) =>
        total + module.features.reduce((featureTotal, feature) => featureTotal + feature.permissions.length, 0),
      0
    )
  );

  constructor() {
    this.searchChanges$
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => this.searchTerm.set(term));

    this.loadCatalog();
  }

  loadCatalog(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.api
      .getPermissionCatalog()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.catalog.set(response);
          this.expandedKeys.set(buildDefaultExpandedKeys(response.modules));
          this.isLoading.set(false);
        },
        error: (error) => {
          this.catalog.set(null);
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  onSearchChange(value: string): void {
    this.searchInput.set(value);
    this.searchChanges$.next(value);
  }

  onScopeChange(value: PermissionCatalogScopeFilter): void {
    this.scopeFilter.set(value);
  }

  summaryLabel(label: string, count: number): string {
    if (this.isLoading()) {
      return `${label}: —`;
    }

    return `${label}: ${count}`;
  }

  isExpanded(kind: 'module' | 'feature', id: string): boolean {
    return this.expandedKeys().has(`${kind}:${id}`);
  }

  toggleExpanded(kind: 'module' | 'feature', id: string): void {
    const key = `${kind}:${id}`;
    const next = new Set(this.expandedKeys());

    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }

    this.expandedKeys.set(next);
  }
}

function buildDefaultExpandedKeys(modules: PermissionCatalogModule[]): Set<string> {
  const keys = new Set<string>();

  for (const module of modules.slice(0, 2)) {
    keys.add(`module:${module.id}`);

    for (const feature of module.features.slice(0, 1)) {
      keys.add(`feature:${feature.id}`);
    }
  }

  return keys;
}

function filterCatalog(
  modules: PermissionCatalogModule[],
  searchTerm: string,
  scopeFilter: PermissionCatalogScopeFilter
): FilteredPermissionCatalogModule[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return modules
    .map((module) => {
      const features = module.features
        .map((feature) => {
          const permissions = feature.permissions.filter((permission) =>
            matchesScope(permission.scope, scopeFilter) &&
            matchesSearch(permission, normalizedSearch, module, feature)
          );

          if (!permissions.length) {
            return null;
          }

          return { ...feature, permissions };
        })
        .filter((feature): feature is FilteredPermissionCatalogFeature => feature !== null);

      if (!features.length) {
        return null;
      }

      return { ...module, features };
    })
    .filter((module): module is FilteredPermissionCatalogModule => module !== null);
}

function matchesScope(scope: string, scopeFilter: PermissionCatalogScopeFilter): boolean {
  if (!scopeFilter) {
    return true;
  }

  return scope === scopeFilter;
}

function matchesSearch(
  permission: PermissionCatalogPermission,
  searchTerm: string,
  module: PermissionCatalogModule,
  feature: PermissionCatalogFeature
): boolean {
  if (!searchTerm) {
    return true;
  }

  return [
    permission.code,
    permission.name,
    permission.description ?? '',
    feature.code,
    feature.name,
    module.code,
    module.name
  ].some((value) => value.toLowerCase().includes(searchTerm));
}
