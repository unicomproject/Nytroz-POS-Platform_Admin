import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import {
  SubscriptionPlanCatalogFeature,
  SubscriptionPlanCatalogModule
} from '../../models/platform-subscription-plan.model';
import { PlatformModulesCatalogApiService } from '../../services/platform-modules-catalog-api.service';

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
          <p>Platform module and feature catalog returned by the backend.</p>
          <span class="title-accent" aria-hidden="true"></span>
        </div>
      </header>

      <section class="filters card">
        <label class="filter-field search-field">
          <span class="field-label">Search</span>
          <span class="input-wrap">
            <input
              type="search"
              placeholder="Search by module name, feature name, or feature code..."
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
            />
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          </span>
        </label>
      </section>

      @if (isLoading()) {
        <div class="state-card card">Loading modules and features from the backend...</div>
      } @else if (errorMessage()) {
        <div class="state-card card error">
          <strong>Modules and features could not be loaded</strong>
          <span>{{ errorMessage() }}</span>
          <button type="button" class="btn primary" (click)="loadCatalog()">Try again</button>
        </div>
      } @else if (!(catalog()?.modules?.length)) {
        <div class="state-card card empty">
          <strong>No modules found</strong>
          <span>The backend catalog did not return any platform modules.</span>
        </div>
      } @else if (!filteredModules().length) {
        <div class="state-card card empty">
          <strong>No matching modules or features</strong>
          <span>Try a different search term.</span>
        </div>
      } @else {
        <section class="summary-grid">
          <article class="summary-card card">
            <span class="label">Modules</span>
            <strong>{{ filteredModules().length }}</strong>
          </article>
          <article class="summary-card card">
            <span class="label">Features</span>
            <strong>{{ filteredFeatureCount() }}</strong>
          </article>
        </section>

        <section class="catalog-list">
          @for (module of filteredModules(); track module.id) {
            <article class="module-card card">
              <header class="module-header">
                <div>
                  <h2>{{ module.name }}</h2>
                  <p>{{ module.code }}</p>
                  @if (module.description) {
                    <p class="module-description">{{ module.description }}</p>
                  }
                </div>
                <div class="module-meta">
                  <span class="meta-badge">{{ module.features.length }} features</span>
                  <span class="meta-badge active">Active</span>
                </div>
              </header>

              @if (!canViewFeatures()) {
                <p class="restricted-note">Feature details require the platform.features.view permission.</p>
              } @else if (!module.features.length) {
                <p class="muted">No features returned for this module.</p>
              } @else {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th>Code</th>
                        <th>Description</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (feature of module.features; track feature.id) {
                        <tr>
                          <td><strong>{{ feature.name }}</strong></td>
                          <td><code>{{ feature.code }}</code></td>
                          <td>{{ feature.description || '—' }}</td>
                          <td><span class="status-badge active">Active</span></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </article>
          }
        </section>
      }
    </section>
  `,
  styles: `
    :host { color: #14213d; display: block; }
    * { box-sizing: border-box; }

    .catalog-page { display: grid; gap: 1.15rem; }

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
      font-size: clamp(1.55rem, 2.4vw, 2rem);
      margin: 0;
    }

    .title-block p { color: #667085; font-size: 0.92rem; margin: 0.4rem 0 0; }

    .title-accent {
      background: linear-gradient(90deg, #0b5cff, #5b8dff);
      border-radius: 99px;
      display: block;
      height: 3px;
      margin-top: 0.75rem;
      width: 2.75rem;
    }

    .card {
      background: #fff;
      border: 1px solid #e5eaf2;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.06);
    }

    .filters { padding: 1rem; }

    .filter-field {
      display: grid;
      gap: 0.45rem;
    }

    .field-label {
      color: #667085;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .input-wrap {
      align-items: center;
      display: flex;
      position: relative;
    }

    .input-wrap input {
      border: 1px solid #d0d5dd;
      border-radius: 10px;
      min-height: 2.65rem;
      padding: 0 2.35rem 0 0.85rem;
      width: 100%;
    }

    .input-wrap svg {
      color: #98a2b3;
      height: 1rem;
      pointer-events: none;
      position: absolute;
      right: 0.85rem;
      stroke: currentColor;
      stroke-width: 2;
      width: 1rem;
    }

    .summary-grid {
      display: grid;
      gap: 0.85rem;
      grid-template-columns: repeat(2, minmax(0, 12rem));
    }

    .summary-card {
      display: grid;
      gap: 0.45rem;
      padding: 1rem;
    }

    .summary-card .label {
      color: #667085;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .summary-card strong { color: #101a38; font-size: 1.35rem; }

    .catalog-list {
      display: grid;
      gap: 1rem;
    }

    .module-card { padding: 1.1rem; }

    .module-header {
      align-items: flex-start;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      margin-bottom: 0.85rem;
    }

    .module-header h2 {
      color: #101a38;
      font-size: 1rem;
      margin: 0;
    }

    .module-header p {
      color: #667085;
      font-size: 0.82rem;
      margin: 0.25rem 0 0;
    }

    .module-description { max-width: 42rem; }

    .module-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .meta-badge {
      background: #f8fafc;
      border: 1px solid #e5eaf2;
      border-radius: 999px;
      color: #475569;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.35rem 0.65rem;
    }

    .meta-badge.active {
      background: #ecfdf5;
      border-color: #bbf7d0;
      color: #15803d;
    }

    .table-wrap { overflow-x: auto; }

    table {
      border-collapse: collapse;
      min-width: 100%;
      width: 100%;
    }

    th, td {
      border-bottom: 1px solid #eef2f7;
      padding: 0.75rem 0.5rem;
      text-align: left;
      vertical-align: top;
    }

    th {
      color: #667085;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    td { color: #344054; font-size: 0.84rem; }

    td code {
      background: #f8fafc;
      border-radius: 6px;
      color: #475569;
      font-size: 0.78rem;
      padding: 0.15rem 0.4rem;
    }

    .status-badge {
      border-radius: 999px;
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.25rem 0.55rem;
    }

    .status-badge.active { background: #dcfce7; color: #15803d; }

    .muted, .restricted-note {
      color: #667085;
      font-size: 0.82rem;
      margin: 0;
    }

    .restricted-note {
      background: #fffaeb;
      border: 1px solid #fedf89;
      border-radius: 10px;
      padding: 0.75rem 0.85rem;
    }

    .state-card {
      display: grid;
      gap: 0.75rem;
      padding: 2rem;
      text-align: center;
    }

    .state-card.error { color: #b42318; }
    .state-card.empty { color: #667085; }

    .btn {
      align-items: center;
      border-radius: 10px;
      cursor: pointer;
      display: inline-flex;
      font-size: 0.84rem;
      font-weight: 700;
      justify-content: center;
      margin: 0 auto;
      min-height: 2.65rem;
      padding: 0 1rem;
    }

    .btn.primary { background: #0b5cff; border: 0; color: #fff; }

    @media (max-width: 760px) {
      .module-header { flex-direction: column; }
      .summary-grid { grid-template-columns: 1fr 1fr; }
    }
  `
})
export class PlatformModulesCatalogPage implements OnInit {
  private readonly api = inject(PlatformModulesCatalogApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly accessControl = inject(AccessControlService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchTerm = signal('');
  readonly catalog = signal<{ modules: SubscriptionPlanCatalogModule[] } | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly filteredModules = computed(() => filterModules(this.catalog()?.modules ?? [], this.searchTerm()));

  readonly filteredFeatureCount = computed(() =>
    this.filteredModules().reduce((total, module) => total + module.features.length, 0)
  );

  ngOnInit(): void {
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.api
      .getCatalog()
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

  canViewFeatures(): boolean {
    return this.accessControl.hasPermission(platformPermissions.featuresView);
  }
}

function filterModules(
  modules: SubscriptionPlanCatalogModule[],
  searchTerm: string
): SubscriptionPlanCatalogModule[] {
  const term = searchTerm.trim().toLowerCase();
  if (!term) {
    return modules;
  }

  return modules
    .map((module) => ({
      ...module,
      features: module.features.filter((feature) => matchesFeature(feature, term) || matchesModule(module, term))
    }))
    .filter((module) => matchesModule(module, term) || module.features.length > 0);
}

function matchesModule(module: SubscriptionPlanCatalogModule, term: string): boolean {
  return module.name.toLowerCase().includes(term) || module.code.toLowerCase().includes(term);
}

function matchesFeature(feature: SubscriptionPlanCatalogFeature, term: string): boolean {
  return (
    feature.name.toLowerCase().includes(term) ||
    feature.code.toLowerCase().includes(term) ||
    (feature.description?.toLowerCase().includes(term) ?? false)
  );
}
