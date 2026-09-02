import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PageHeader } from '../../../../shared/components/page-header/page-header';
import {
  BusinessCapabilityMapItem,
  BusinessCapabilityMapResponse,
  BusinessModuleMapItem,
  TechnicalFeatureMapItem
} from '../../models/business-capability-map.model';
import { PlatformBusinessCapabilityApiService } from '../../services/platform-business-capability-api.service';

@Component({
  selector: 'app-platform-business-capability-map-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeader],
  template: `
    <div class="capability-map-page">
      <app-page-header
        title="Business Capability Map"
        description="View how OneVerz R1 business modules map to technical modules, features, permissions and commercial availability."
      >
        <button
          type="button"
          class="btn btn-secondary"
          (click)="loadMap()"
          [disabled]="loading()"
        >
          <svg class="icon-refresh" [class.spinning]="loading()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
          </svg>
          Refresh Catalog
        </button>
      </app-page-header>

      <div class="security-info-banner">
        <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          <strong>Commercial Security Architecture:</strong> Subscription plans grant feature entitlements; user permissions remain role-based and are enforced separately at runtime.
        </span>
      </div>

      @if (loading()) {
        <div class="state-container loading-state">
          <div class="spinner"></div>
          <p>Loading Business Capability Catalog...</p>
        </div>
      } @else if (error()) {
        <div class="state-container error-state">
          <div class="error-icon">!</div>
          <h3>Unable to load Business Capability Map</h3>
          <p>{{ error() }}</p>
          <button type="button" class="btn btn-primary" (click)="loadMap()">Retry</button>
        </div>
      } @else if (mapData(); as data) {
        <!-- Summary Cards Grid -->
        <section class="summary-cards-grid">
          <div class="summary-card">
            <span class="card-label">R1 Business Modules</span>
            <span class="card-value">{{ data.summary.businessModuleCount }}</span>
            <span class="card-subtext">Canonical release modules</span>
          </div>

          <div class="summary-card">
            <span class="card-label">R1 Business Capabilities</span>
            <span class="card-value">{{ data.summary.businessCapabilityCount }}</span>
            <span class="card-subtext">Active business functions</span>
          </div>

          <div class="summary-card">
            <span class="card-label">Technical Features</span>
            <span class="card-value">{{ data.summary.technicalFeatureCount }}</span>
            <span class="card-subtext">Distinct tenant features</span>
          </div>

          <div class="summary-card">
            <span class="card-label">Tenant Permissions</span>
            <span class="card-value">{{ data.summary.tenantPermissionCount }}</span>
            <span class="card-subtext">Action-level security permissions</span>
          </div>

          <div class="summary-card excluded-card">
            <span class="card-label">R1 Excluded Definitions</span>
            <span class="card-value">5</span>
            <span class="card-subtext">Deferred promo & loyalty engine</span>
          </div>
        </section>

        <!-- Filter & Search Toolbar -->
        <section class="toolbar-card">
          <div class="search-input-group">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              class="search-input"
              placeholder="Search BM code, capability, feature code, permission..."
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event || '')"
            />
            @if (searchQuery()) {
              <button type="button" class="clear-search-btn" (click)="searchQuery.set('')">✕</button>
            }
          </div>

          <div class="filter-controls">
            <select
              class="filter-select"
              [ngModel]="statusFilter()"
              (ngModelChange)="statusFilter.set($event)"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRODUCTION READY / CLOSED">Production Ready / Closed</option>
              <option value="IMPLEMENTED — NOT YET E2E CLOSED">Implemented — Not E2E Closed</option>
              <option value="PARTIAL">Partial</option>
            </select>

            <select
              class="filter-select"
              [ngModel]="commercialFilter()"
              (ngModelChange)="commercialFilter.set($event)"
            >
              <option value="ALL">All Commercial States</option>
              <option value="CORE">Core</option>
              <option value="SELECTABLE">Selectable</option>
            </select>

            <select
              class="filter-select"
              [ngModel]="techModuleFilter()"
              (ngModelChange)="techModuleFilter.set($event)"
            >
              <option value="ALL">All Technical Modules</option>
              @for (mod of availableTechModules(); track mod) {
                <option [value]="mod">{{ mod }}</option>
              }
            </select>

            <button type="button" class="btn btn-secondary btn-compact" (click)="resetFilters()">
              Reset Filters
            </button>
          </div>
        </section>

        <!-- Modules Accordion List -->
        <section class="modules-accordion-section">
          @if (filteredModules().length === 0) {
            <div class="state-container empty-state">
              <p>No business capability modules match your filter criteria.</p>
              <button type="button" class="btn btn-secondary" (click)="resetFilters()">Clear Filters</button>
            </div>
          } @else {
            @for (bm of filteredModules(); track bm.code) {
              <article class="module-accordion-card" [class.expanded]="isExpanded(bm.code)">
                <header class="module-header" (click)="toggleExpanded(bm.code)">
                  <div class="module-title-group">
                    <span class="bm-code-badge">{{ bm.code }}</span>
                    <div class="module-name-container">
                      <h3>{{ bm.name }}</h3>
                      <p class="module-desc">{{ bm.description }}</p>
                    </div>
                  </div>

                  <div class="module-badges-group">
                    <span class="badge status-badge" [class]="getStatusBadgeClass(bm.currentR1Status)">
                      {{ bm.currentR1Status }}
                    </span>
                    <span class="badge commercial-badge" [class]="bm.commercialState.toLowerCase()">
                      {{ bm.commercialState }}
                    </span>
                    <span class="badge count-badge">
                      {{ bm.capabilities.length }} Caps · {{ getFeatureCount(bm) }} Feats · {{ getPermissionCount(bm) }} Perms
                    </span>
                    <button type="button" class="btn-toggle" [attr.aria-expanded]="isExpanded(bm.code)">
                      <svg class="chevron-icon" [class.rotated]="isExpanded(bm.code)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>
                </header>

                @if (isExpanded(bm.code)) {
                  <div class="module-details-body">
                    <!-- Business Capabilities Section -->
                    <div class="details-sub-section">
                      <h4 class="section-heading">Business Capabilities ({{ bm.capabilities.length }})</h4>
                      <div class="capabilities-grid">
                        @for (cap of bm.capabilities; track cap.code) {
                          <div class="capability-item-card">
                            <div class="cap-header">
                              <span class="cap-code">{{ cap.code }}</span>
                              <span class="badge cap-class-badge" [class]="cap.commercialClassification.toLowerCase()">
                                {{ formatClassification(cap.commercialClassification) }}
                              </span>
                            </div>
                            <h5 class="cap-name">{{ cap.name }}</h5>
                            <p class="cap-desc">{{ cap.description }}</p>
                            @if (cap.mappedTechnicalFeatureCodes.length) {
                              <div class="cap-mapped-features">
                                <span class="meta-label">Mapped Features:</span>
                                @for (fCode of cap.mappedTechnicalFeatureCodes; track fCode) {
                                  <code class="feature-code-tag">{{ fCode }}</code>
                                }
                              </div>
                            }
                          </div>
                        }
                      </div>
                    </div>

                    <!-- Technical Modules & Features Section -->
                    <div class="details-sub-section">
                      <h4 class="section-heading">Technical System Mapping</h4>
                      @for (techMod of bm.technicalModules; track techMod.code) {
                        <div class="tech-module-group">
                          <div class="tech-mod-header">
                            <span class="tech-mod-badge">{{ techMod.code }}</span>
                            <span class="tech-mod-name">{{ techMod.name }}</span>
                            <span class="badge scope-badge">{{ techMod.scope }}</span>
                          </div>

                          <div class="features-list">
                            @for (feat of techMod.features; track feat.code) {
                              <div class="feature-card">
                                <div class="feature-header">
                                  <div class="feature-identity">
                                    <strong class="feature-name">{{ feat.name }}</strong>
                                    <code class="feature-code">{{ feat.code }}</code>
                                  </div>
                                  <div class="feature-badges">
                                    <span class="badge eligibility-badge" [class.eligible]="feat.isPlanEligible">
                                      {{ feat.isPlanEligible ? 'Plan Selectable' : 'Core Always Included' }}
                                    </span>
                                    <span class="badge active-badge" [class.active]="feat.isActive">
                                      {{ feat.isActive ? 'ACTIVE' : 'INACTIVE' }}
                                    </span>
                                    <button
                                      type="button"
                                      class="btn-permissions-toggle"
                                      (click)="togglePermissions(feat.code)"
                                    >
                                      Permissions ({{ feat.permissions.length }})
                                      <svg class="chevron-icon-sm" [class.rotated]="isPermissionsExpanded(feat.code)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="6 9 12 15 18 9" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>

                                @if (isPermissionsExpanded(feat.code)) {
                                  <div class="permissions-table-container">
                                    <table class="permissions-table">
                                      <thead>
                                        <tr>
                                          <th>Permission Code</th>
                                          <th>Action Name</th>
                                          <th>Action Type</th>
                                          <th>Scope</th>
                                          <th>Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        @for (perm of feat.permissions; track perm.code) {
                                          <tr>
                                            <td><code class="perm-code">{{ perm.code }}</code></td>
                                            <td>{{ perm.name }}</td>
                                            <td><span class="action-type-tag" [class]="perm.actionType.toLowerCase()">{{ perm.actionType }}</span></td>
                                            <td>{{ perm.scope }}</td>
                                            <td><span class="status-dot" [class.active]="perm.isActive"></span> {{ perm.isActive ? 'Active' : 'Inactive' }}</td>
                                          </tr>
                                        }
                                      </tbody>
                                    </table>
                                  </div>
                                }
                              </div>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }
              </article>
            }
          }
        </section>
      }
    </div>
  `,
  styles: `
    .capability-map-page {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 1.5rem;
      max-width: 100%;
      box-sizing: border-box;
    }

    .security-info-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 0.875rem 1.25rem;
      color: #1e40af;
      font-size: 0.875rem;
    }

    .info-icon {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
    }

    .summary-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .summary-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .summary-card.excluded-card {
      background: #fdf2f8;
      border-color: #fbcfe8;
    }

    .card-label {
      font-size: 0.8125rem;
      color: #64748b;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .card-value {
      font-size: 2rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0.25rem 0;
    }

    .card-subtext {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .toolbar-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      justify-content: space-between;
    }

    .search-input-group {
      position: relative;
      flex: 1;
      min-width: 280px;
    }

    .search-icon {
      position: absolute;
      left: 0.875rem;
      top: 50%;
      transform: translateY(-50%);
      width: 1.125rem;
      height: 1.125rem;
      color: #94a3b8;
    }

    .search-input {
      width: 100%;
      padding: 0.625rem 2.5rem 0.625rem 2.5rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.875rem;
      outline: none;
      box-sizing: border-box;

      &:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }
    }

    .clear-search-btn {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .filter-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }

    .filter-select {
      padding: 0.625rem 0.875rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.875rem;
      background: #ffffff;
      color: #1e293b;
      outline: none;
    }

    .modules-accordion-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .module-accordion-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        border-color: #cbd5e1;
      }

      &.expanded {
        border-color: #93c5fd;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }
    }

    .module-header {
      padding: 1.25rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
      background: #fafafa;
    }

    .module-title-group {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .bm-code-badge {
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.875rem;
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      letter-spacing: 0.025em;
    }

    .module-name-container h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: #0f172a;
    }

    .module-desc {
      margin: 0.25rem 0 0 0;
      font-size: 0.8125rem;
      color: #64748b;
    }

    .module-badges-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      text-transform: uppercase;
    }

    .status-closed {
      background: #dcfce7;
      color: #15803d;
    }

    .status-impl {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .status-partial {
      background: #fef3c7;
      color: #b45309;
    }

    .commercial-badge.core {
      background: #f3e8ff;
      color: #6b21a8;
    }

    .commercial-badge.selectable {
      background: #e0f2fe;
      color: #0369a1;
    }

    .count-badge {
      background: #f1f5f9;
      color: #475569;
      text-transform: none;
      font-weight: 500;
    }

    .btn-toggle {
      background: none;
      border: none;
      cursor: pointer;
      color: #64748b;
      display: flex;
      align-items: center;
      padding: 0.25rem;
    }

    .chevron-icon {
      width: 1.25rem;
      height: 1.25rem;
      transition: transform 0.2s ease;

      &.rotated {
        transform: rotate(180deg);
      }
    }

    .module-details-body {
      padding: 1.5rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    .section-heading {
      margin: 0 0 1rem 0;
      font-size: 0.9375rem;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .capabilities-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .capability-item-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .cap-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .cap-code {
      font-family: monospace;
      font-size: 0.75rem;
      font-weight: 700;
      color: #475569;
    }

    .cap-name {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      color: #0f172a;
    }

    .cap-desc {
      margin: 0;
      font-size: 0.8125rem;
      color: #64748b;
    }

    .feature-code-tag {
      background: #e2e8f0;
      color: #1e293b;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-family: monospace;
      margin-left: 0.25rem;
    }

    .tech-module-group {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 1.25rem;
      margin-bottom: 1rem;
    }

    .tech-mod-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .tech-mod-badge {
      background: #1e293b;
      color: #ffffff;
      font-family: monospace;
      font-weight: 700;
      font-size: 0.8125rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    .tech-mod-name {
      font-weight: 600;
      color: #0f172a;
    }

    .features-list {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .feature-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 1rem;
    }

    .feature-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .feature-name {
      font-size: 0.9375rem;
      color: #0f172a;
    }

    .feature-code {
      font-family: monospace;
      font-size: 0.8125rem;
      color: #64748b;
      margin-left: 0.5rem;
    }

    .feature-badges {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .eligibility-badge {
      background: #f1f5f9;
      color: #475569;

      &.eligible {
        background: #dbeafe;
        color: #1d4ed8;
      }
    }

    .btn-permissions-toggle {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .chevron-icon-sm {
      width: 0.875rem;
      height: 0.875rem;
      transition: transform 0.2s ease;

      &.rotated {
        transform: rotate(180deg);
      }
    }

    .permissions-table-container {
      margin-top: 0.875rem;
      overflow-x: auto;
    }

    .permissions-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;

      th, td {
        padding: 0.5rem 0.75rem;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
      }

      th {
        background: #f1f5f9;
        color: #475569;
        font-weight: 600;
      }
    }

    .perm-code {
      font-family: monospace;
      color: #0f172a;
      font-weight: 600;
    }

    .action-type-tag {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      text-transform: uppercase;

      &.read { background: #e0f2fe; color: #0369a1; }
      &.create { background: #dcfce7; color: #15803d; }
      &.update { background: #fef3c7; color: #b45309; }
      &.delete { background: #ffe4e6; color: #be123c; }
    }

    .status-dot {
      display: inline-block;
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: #94a3b8;

      &.active {
        background: #22c55e;
      }
    }

    .state-container {
      padding: 3rem 1.5rem;
      text-align: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }

    .spinner {
      width: 2rem;
      height: 2rem;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem auto;
    }

    .icon-refresh.spinning {
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .btn {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary { background: #2563eb; color: #ffffff; }
    .btn-secondary { background: #ffffff; border: 1px solid #cbd5e1; color: #334155; }
    .btn-compact { padding: 0.375rem 0.75rem; font-size: 0.8125rem; }
  `
})
export class PlatformBusinessCapabilityMapPage implements OnInit {
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly mapData = signal<BusinessCapabilityMapResponse | null>(null);

  readonly searchQuery = signal('');
  readonly statusFilter = signal('ALL');
  readonly commercialFilter = signal('ALL');
  readonly techModuleFilter = signal('ALL');

  readonly expandedModules = signal<Set<string>>(new Set());
  readonly expandedPermissions = signal<Set<string>>(new Set());

  readonly availableTechModules = computed(() => {
    const data = this.mapData();
    if (!data) return [];
    const set = new Set<string>();
    for (const bm of data.businessModules) {
      for (const tm of bm.technicalModules) {
        set.add(tm.code);
      }
    }
    return Array.from(set).sort();
  });

  readonly filteredModules = computed(() => {
    const data = this.mapData();
    if (!data) return [];

    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const commercial = this.commercialFilter();
    const techMod = this.techModuleFilter();

    return data.businessModules.filter((bm) => {
      // Status filter
      if (status !== 'ALL' && bm.currentR1Status !== status) {
        return false;
      }

      // Commercial filter
      if (commercial !== 'ALL' && bm.commercialState !== commercial) {
        return false;
      }

      // Technical module filter
      if (techMod !== 'ALL' && !bm.technicalModules.some((tm) => tm.code === techMod)) {
        return false;
      }

      // Search query
      if (!query) return true;

      const matchesBm =
        bm.code.toLowerCase().includes(query) ||
        bm.name.toLowerCase().includes(query) ||
        bm.description.toLowerCase().includes(query);

      if (matchesBm) return true;

      const matchesCaps = bm.capabilities.some(
        (c) =>
          c.code.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query)
      );

      if (matchesCaps) return true;

      const matchesTech = bm.technicalModules.some(
        (tm) =>
          tm.code.toLowerCase().includes(query) ||
          tm.name.toLowerCase().includes(query) ||
          tm.features.some(
            (f) =>
              f.code.toLowerCase().includes(query) ||
              f.name.toLowerCase().includes(query) ||
              f.permissions.some((p) => p.code.toLowerCase().includes(query) || p.name.toLowerCase().includes(query))
          )
      );

      return matchesTech;
    });
  });

  constructor(private readonly apiService: PlatformBusinessCapabilityApiService) {}

  ngOnInit(): void {
    this.loadMap();
  }

  loadMap(): void {
    this.loading.set(true);
    this.error.set(null);

    this.apiService.getBusinessCapabilityMap().subscribe({
      next: (res) => {
        this.mapData.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to communicate with Platform Admin backend API.');
        this.loading.set(false);
      }
    });
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('ALL');
    this.commercialFilter.set('ALL');
    this.techModuleFilter.set('ALL');
  }

  isExpanded(bmCode: string): boolean {
    return this.expandedModules().has(bmCode);
  }

  toggleExpanded(bmCode: string): void {
    const current = new Set(this.expandedModules());
    if (current.has(bmCode)) {
      current.delete(bmCode);
    } else {
      current.add(bmCode);
    }
    this.expandedModules.set(current);
  }

  isPermissionsExpanded(featureCode: string): boolean {
    return this.expandedPermissions().has(featureCode);
  }

  togglePermissions(featureCode: string): void {
    const current = new Set(this.expandedPermissions());
    if (current.has(featureCode)) {
      current.delete(featureCode);
    } else {
      current.add(featureCode);
    }
    this.expandedPermissions.set(current);
  }

  getStatusBadgeClass(status: string): string {
    if (status === 'PRODUCTION READY / CLOSED') return 'status-closed';
    if (status === 'IMPLEMENTED — NOT YET E2E CLOSED') return 'status-impl';
    return 'status-partial';
  }

  formatClassification(classification: string): string {
    switch (classification) {
      case 'CORE_ENTITLEMENT_INDEPENDENT': return 'Core / Always Available';
      case 'CORE_ALWAYS_INCLUDED': return 'Core Plan Feature';
      case 'PLAN_SELECTABLE': return 'Plan Selectable';
      case 'EXCLUDED_R1': return 'R1 Excluded';
      default: return classification;
    }
  }

  getFeatureCount(bm: BusinessModuleMapItem): number {
    return bm.technicalModules.reduce((acc, tm) => acc + tm.features.length, 0);
  }

  getPermissionCount(bm: BusinessModuleMapItem): number {
    return bm.technicalModules.reduce(
      (acc, tm) => acc + tm.features.reduce((fAcc, f) => fAcc + f.permissions.length, 0),
      0
    );
  }
}
