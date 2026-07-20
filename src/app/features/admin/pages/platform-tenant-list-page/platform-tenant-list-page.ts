import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import {
  PlatformTenantFilterOptions,
  PlatformTenantListQuery,
  PlatformTenantListResponse,
  PlatformTenantSummary
} from '../../models/platform-tenant.model';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';
import { PlatformTenantSearchService } from '../../services/platform-tenant-search.service';

@Component({
  selector: 'app-platform-tenant-list-page',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  template: `
    <section class="tenant-list-page">
      <header class="page-heading">
        <div class="title-block">
          <h1>Tenant List</h1>
          <p>View and manage all platform tenants</p>
          <span class="title-accent" aria-hidden="true"></span>
        </div>
        <div class="page-actions">
          <button type="button" class="btn outline" disabled title="Import Tenants is not available in TM-EPOS MVP">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10M8 9l4 4 4-4M5 21h14" /></svg>
            Import Tenants
          </button>
          <button type="button" class="btn primary" routerLink="/admin/tenants/create">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Create Tenant
          </button>
        </div>
      </header>

      @if (summary(); as summaryData) {
        <section class="kpi-grid">
          <article class="kpi-card">
            <span class="kpi-icon blue" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /></svg>
            </span>
            <div class="kpi-body">
              <span class="kpi-label">Total Tenants</span>
              <strong class="kpi-value">{{ summaryData.totalTenants }}</strong>
              <small class="kpi-meta neutral">All platform tenants</small>
            </div>
          </article>
          <article class="kpi-card">
            <span class="kpi-icon green" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /><path d="M10 12l2 2 4-4" /></svg>
            </span>
            <div class="kpi-body">
              <span class="kpi-label">Active Tenants</span>
              <strong class="kpi-value">{{ summaryData.activeTenants }}</strong>
              <small class="kpi-meta">{{ percent(summaryData.activeTenants, summaryData.totalTenants) }}</small>
            </div>
          </article>
          <article class="kpi-card">
            <span class="kpi-icon orange" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /><path d="M12 9v4M12 17h.01" /></svg>
            </span>
            <div class="kpi-body">
              <span class="kpi-label">Suspended Tenants</span>
              <strong class="kpi-value">{{ summaryData.suspendedTenants }}</strong>
              <small class="kpi-meta">{{ percent(summaryData.suspendedTenants, summaryData.totalTenants) }}</small>
            </div>
          </article>
          <article class="kpi-card">
            <span class="kpi-icon red" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /><path d="M10 10l4 4M14 10l-4 4" /></svg>
            </span>
            <div class="kpi-body">
              <span class="kpi-label">Inactive Tenants</span>
              <strong class="kpi-value">{{ summaryData.inactiveTenants }}</strong>
              <small class="kpi-meta">{{ percent(summaryData.inactiveTenants, summaryData.totalTenants) }}</small>
            </div>
          </article>
          <article class="kpi-card">
            <span class="kpi-icon violet" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
            </span>
            <div class="kpi-body">
              <span class="kpi-label">Trial Tenants</span>
              <strong class="kpi-value">{{ summaryData.trialTenants }}</strong>
              <small class="kpi-meta">{{ percent(summaryData.trialTenants, summaryData.totalTenants) }}</small>
            </div>
          </article>
        </section>
      }

      <section class="filters card">
        <label class="filter-field search-field">
          <span class="field-label">Search</span>
          <span class="input-wrap">
            <input
              type="search"
              placeholder="Search tenants..."
              [ngModel]="tenantSearch.searchTerm()"
              (ngModelChange)="onSearchChange($event)"
            />
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          </span>
        </label>
        <label class="filter-field">
          <span class="field-label">Status</span>
          <select [ngModel]="statusFilter()" (ngModelChange)="onStatusChange($event)">
            <option value="">All Status</option>
            @for (status of filterOptions().statuses; track status) {
              <option [value]="status">{{ status }}</option>
            }
          </select>
        </label>
        <label class="filter-field">
          <span class="field-label">Plan</span>
          <select [ngModel]="planFilter()" (ngModelChange)="onPlanChange($event)">
            <option value="">All Plans</option>
            @for (plan of filterOptions().plans; track plan.id) {
              <option [value]="plan.id">{{ plan.name }}</option>
            }
          </select>
        </label>
        <div class="filter-actions">
          <button type="button" class="btn outline" disabled title="More Filters is not available in TM-EPOS MVP">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            More Filters
          </button>
          <button type="button" class="btn outline" (click)="resetFilters()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 0115.5-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15.5 6.7L3 16M3 21v-5h5" /></svg>
            Reset
          </button>
        </div>
      </section>

      @if (isLoading()) {
        <div class="state-card card">Loading tenant data from the backend...</div>
      } @else if (errorMessage()) {
        <div class="state-card card error">
          <strong>Tenant list could not be loaded</strong>
          <span>{{ errorMessage() }}</span>
          <button type="button" class="btn primary" (click)="loadPage()">Try again</button>
        </div>
      } @else if (tenantList(); as list) {
        @if (list.items.length) {
          <section class="table-card card">
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Users</th>
                    <th>Outlets</th>
                    <th>Created On</th>
                    <th>Last Activity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (tenant of list.items; track tenant.id) {
                    <tr class="tenant-row" [routerLink]="['/admin/tenants', tenant.id]" tabindex="0">
                      <td>
                        <div class="tenant-cell">
                          <span class="avatar" [style.background]="avatarColor(tenant.name)">{{ initials(tenant.name) }}</span>
                          <span class="tenant-meta">
                            <strong>{{ tenant.name }}</strong>
                            <small>{{ tenant.code }}</small>
                          </span>
                        </div>
                      </td>
                      <td class="cell-text">{{ tenant.planName || '—' }}</td>
                      <td>
                        <span class="status-badge" [class]="statusClass(tenant.status)">{{ tenant.status }}</span>
                      </td>
                      <td class="cell-num">{{ tenant.userCount }}</td>
                      <td class="cell-num">{{ tenant.outletCount }}</td>
                      <td class="cell-text">{{ tenant.createdOn | date: 'mediumDate' }}</td>
                      <td>
                        @if (tenant.lastActivityAt) {
                          <span class="activity" [class.muted]="!isRecentActivity(tenant.lastActivityAt)">
                            <i [class.recent]="isRecentActivity(tenant.lastActivityAt)"></i>
                            {{ relativeTime(tenant.lastActivityAt) }}
                          </span>
                        } @else {
                          <span class="cell-muted">—</span>
                        }
                      </td>
                      <td>
                        <a class="actions-link" [routerLink]="['/admin/tenants', tenant.id]" (click)="$event.stopPropagation()">
                          View
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <footer class="pagination">
            <span class="range-label">{{ rangeLabel(list) }}</span>
            <div class="pagination-controls">
              <button type="button" class="page-btn nav" [disabled]="list.pageNumber <= 1" (click)="goToPage(list.pageNumber - 1)" aria-label="Previous page">
                ‹
              </button>
              @for (page of pageNumbers(list); track page) {
                <button
                  type="button"
                  class="page-btn"
                  [class.active]="page === list.pageNumber"
                  (click)="goToPage(page)"
                >
                  {{ page }}
                </button>
              }
              <button
                type="button"
                class="page-btn nav"
                [disabled]="list.pageNumber >= list.totalPages"
                (click)="goToPage(list.pageNumber + 1)"
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </footer>
        } @else {
          <div class="state-card card">No tenants match the current filters.</div>
        }
      }
    </section>
  `,
  styles: `
    :host { color: #14213d; display: block; }
    * { box-sizing: border-box; }

    .tenant-list-page { display: grid; gap: 1.15rem; }

    .page-heading {
      align-items: flex-start;
      display: flex;
      gap: 1.25rem;
      justify-content: space-between;
      margin-bottom: 0.15rem;
    }

    .title-block h1 {
      color: #101a38;
      font-size: clamp(1.65rem, 2.5vw, 2.05rem);
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0;
    }

    .title-block p {
      color: #667085;
      font-size: 0.92rem;
      margin: 0.4rem 0 0;
    }

    .title-accent {
      background: linear-gradient(90deg, #0b5cff, #5b8dff);
      border-radius: 99px;
      display: block;
      height: 3px;
      margin-top: 0.75rem;
      width: 2.75rem;
    }

    .page-actions {
      display: flex;
      flex-shrink: 0;
      flex-wrap: wrap;
      gap: 0.7rem;
      padding-top: 0.15rem;
    }

    .btn {
      align-items: center;
      border-radius: 10px;
      cursor: pointer;
      display: inline-flex;
      font-size: 0.84rem;
      font-weight: 700;
      gap: 0.45rem;
      min-height: 2.65rem;
      padding: 0 1rem;
      white-space: nowrap;
    }

    .btn svg {
      height: 1rem;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
      fill: none;
      width: 1rem;
    }

    .btn.outline {
      background: #fff;
      border: 1px solid #d0d9e6;
      color: #344054;
    }

    .btn.primary {
      background: #0b5cff;
      border: 0;
      color: #fff;
    }

    .btn:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .card {
      background: #fff;
      border: 1px solid #e5eaf2;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.06);
    }

    .kpi-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }

    .kpi-card {
      align-items: flex-start;
      background: #fff;
      border: 1px solid #e5eaf2;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.06);
      display: flex;
      gap: 0.85rem;
      min-height: 7.5rem;
      padding: 1.1rem 1rem;
    }

    .kpi-icon {
      align-items: center;
      border-radius: 50%;
      display: flex;
      flex-shrink: 0;
      height: 2.85rem;
      justify-content: center;
      width: 2.85rem;
    }

    .kpi-icon svg {
      height: 1.25rem;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.75;
      fill: none;
      width: 1.25rem;
    }

    .kpi-icon.blue { background: #eaf2ff; color: #1768e5; }
    .kpi-icon.green { background: #e8f8ed; color: #18a44b; }
    .kpi-icon.orange { background: #fff1e6; color: #f97316; }
    .kpi-icon.red { background: #fef2f2; color: #ef4444; }
    .kpi-icon.violet { background: #f0eaff; color: #7047eb; }

    .kpi-body { display: grid; gap: 0.2rem; min-width: 0; }

    .kpi-label {
      color: #667085;
      font-size: 0.76rem;
      font-weight: 600;
    }

    .kpi-value {
      color: #101a38;
      font-size: clamp(1.35rem, 2vw, 1.65rem);
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }

    .kpi-meta {
      color: #667085;
      font-size: 0.72rem;
      font-weight: 600;
    }

    .kpi-meta.neutral { color: #98a2b3; }

    .filters {
      align-items: end;
      display: grid;
      gap: 0.9rem 1rem;
      grid-template-columns: 1.35fr repeat(2, minmax(0, 1fr)) auto;
      padding: 1.1rem 1.15rem;
    }

    .filter-field { display: grid; gap: 0.4rem; min-width: 0; }

    .field-label {
      color: #667085;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .input-wrap {
      display: block;
      position: relative;
    }

    .input-wrap input,
    .filter-field select {
      appearance: none;
      background: #fff;
      border: 1px solid #d8e0ea;
      border-radius: 10px;
      color: #344054;
      font-size: 0.84rem;
      min-height: 2.55rem;
      padding: 0 2.25rem 0 0.8rem;
      width: 100%;
    }

    .input-wrap input::placeholder { color: #98a2b3; }

    .input-wrap svg {
      color: #98a2b3;
      height: 1rem;
      pointer-events: none;
      position: absolute;
      right: 0.75rem;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-width: 1.75;
      fill: none;
      top: 50%;
      transform: translateY(-50%);
      width: 1rem;
    }

    .select-wrap select { padding-right: 2.5rem; }

    .calendar-icon { right: 0.7rem !important; }

    .filter-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
    }

    .table-card { overflow: hidden; padding: 0; }

    .table-wrap { overflow-x: auto; }

    table {
      border-collapse: collapse;
      min-width: 1020px;
      width: 100%;
    }

    th {
      background: #f8fafc;
      border-bottom: 1px solid #edf1f6;
      color: #667085;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      padding: 0.9rem 1rem;
      text-align: left;
      text-transform: uppercase;
      white-space: nowrap;
    }

    td {
      border-bottom: 1px solid #edf1f6;
      padding: 1rem;
      vertical-align: middle;
    }

    tbody tr:last-child td { border-bottom: 0; }

    tbody tr:hover { background: #fafbfd; }

    .tenant-row { cursor: pointer; }

    .tenant-row:focus-visible {
      outline: 2px solid #0b5cff;
      outline-offset: -2px;
    }

    .tenant-cell {
      align-items: center;
      display: flex;
      gap: 0.8rem;
      min-width: 15rem;
    }

    .avatar {
      align-items: center;
      border-radius: 50%;
      color: #fff;
      display: flex;
      flex-shrink: 0;
      font-size: 0.72rem;
      font-weight: 800;
      height: 2.35rem;
      justify-content: center;
      width: 2.35rem;
    }

    .tenant-meta { display: grid; gap: 0.15rem; min-width: 0; }

    .tenant-meta strong {
      color: #101a38;
      font-size: 0.88rem;
      font-weight: 700;
    }

    .tenant-meta small {
      color: #667085;
      font-size: 0.76rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cell-text { color: #344054; font-size: 0.84rem; }
    .cell-num { color: #101a38; font-size: 0.84rem; font-weight: 600; }
    .cell-muted { color: #98a2b3; }

    .status-badge {
      border-radius: 999px;
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.3rem 0.7rem;
      white-space: nowrap;
    }

    .status-badge.active { background: #dcfce7; color: #15803d; }
    .status-badge.suspended { background: #ffedd5; color: #c2410c; }
    .status-badge.trial { background: #dbeafe; color: #1d4ed8; }
    .status-badge.inactive { background: #e2e8f0; color: #475569; }

    .activity {
      align-items: center;
      color: #344054;
      display: inline-flex;
      font-size: 0.82rem;
      gap: 0.45rem;
    }

    .activity.muted { color: #98a2b3; }

    .activity i {
      background: #cbd5e1;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
      height: 0.45rem;
      width: 0.45rem;
    }

    .activity i.recent { background: #16a34a; }

    .actions-link {
      color: #0b5cff;
      font-size: 0.82rem;
      font-weight: 700;
      text-decoration: none;
    }

    .actions-link:hover { text-decoration: underline; }

    .pagination {
      align-items: center;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      padding: 0.25rem 0.15rem;
    }

    .range-label {
      color: #667085;
      font-size: 0.82rem;
    }

    .pagination-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .page-btn {
      align-items: center;
      background: #fff;
      border: 1px solid #d8e0ea;
      border-radius: 8px;
      color: #344054;
      cursor: pointer;
      display: inline-flex;
      font-size: 0.82rem;
      font-weight: 600;
      height: 2.15rem;
      justify-content: center;
      min-width: 2.15rem;
      padding: 0 0.55rem;
    }

    .page-btn.active {
      background: #0b5cff;
      border-color: #0b5cff;
      color: #fff;
    }

    .page-btn:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .state-card {
      display: grid;
      gap: 0.75rem;
      padding: 2.25rem;
      text-align: center;
    }

    .state-card.error { color: #b42318; }

    @media (max-width: 1280px) {
      .kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .filters { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .filter-actions { grid-column: 1 / -1; }
    }

    @media (max-width: 900px) {
      .page-heading { flex-direction: column; }
      .page-actions { width: 100%; }
      .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .filters { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 560px) {
      .kpi-grid,
      .filters { grid-template-columns: 1fr; }
      .pagination { align-items: flex-start; flex-direction: column; }
    }
  `
})
export class PlatformTenantListPage {
  private readonly api = inject(PlatformTenantApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  readonly tenantSearch = inject(PlatformTenantSearchService);

  readonly summary = signal<PlatformTenantSummary | null>(null);
  readonly tenantList = signal<PlatformTenantListResponse | null>(null);
  readonly filterOptions = signal<PlatformTenantFilterOptions>({ plans: [], regions: [], statuses: [] });
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly statusFilter = signal('');
  readonly billingStatusFilter = signal('');
  readonly planFilter = signal('');
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const status = params.get('status');
    const billingStatus = params.get('billingStatus');
    if (status) {
      this.statusFilter.set(status);
    }
    if (billingStatus) {
      this.billingStatusFilter.set(billingStatus);
    }

    this.tenantSearch.searchChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageNumber.set(1);
        this.loadPage();
      });

    this.loadInitialData();
  }

  /** Exposed for tests */
  searchTerm(): string {
    return this.tenantSearch.searchTerm();
  }

  loadInitialData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      summary: this.api.getSummary(),
      filterOptions: this.api.getFilterOptions()
    }).subscribe({
      next: ({ summary, filterOptions }) => {
        this.summary.set(summary);
        this.filterOptions.set(filterOptions);
        this.loadPage(false);
      },
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  loadPage(showLoading = true): void {
    if (showLoading) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
    }

    this.api.getTenants(this.buildQuery()).subscribe({
      next: (response) => {
        this.tenantList.set(response);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(value: string): void {
    this.tenantSearch.setSearch(value);
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.pageNumber.set(1);
    this.loadPage();
  }

  onPlanChange(value: string): void {
    this.planFilter.set(value);
    this.pageNumber.set(1);
    this.loadPage();
  }

  resetFilters(): void {
    this.tenantSearch.searchTerm.set('');
    this.statusFilter.set('');
    this.billingStatusFilter.set('');
    this.planFilter.set('');
    this.pageNumber.set(1);
    this.loadPage();
  }

  goToPage(page: number): void {
    const totalPages = this.tenantList()?.totalPages ?? 1;
    const nextPage = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
    this.pageNumber.set(nextPage);
    this.loadPage();
  }

  rangeLabel(list: PlatformTenantListResponse): string {
    if (list.totalCount === 0) {
      return 'Showing 0 tenants';
    }

    const start = (list.pageNumber - 1) * list.pageSize + 1;
    const end = Math.min(list.pageNumber * list.pageSize, list.totalCount);
    return `Showing ${start} to ${end} of ${list.totalCount} tenants`;
  }

  pageNumbers(list: PlatformTenantListResponse): number[] {
    const total = Math.max(list.totalPages, 1);
    const current = list.pageNumber;
    const windowSize = 5;
    const start = Math.max(1, Math.min(current - 2, total - windowSize + 1));
    const end = Math.min(total, start + windowSize - 1);
    const adjustedStart = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }

  percent(value: number, total: number): string {
    if (total <= 0) {
      return '0.0% of total';
    }

    return `${((value / total) * 100).toFixed(1)}% of total`;
  }

  initials(name: string): string {
    return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  }

  avatarColor(name: string): string {
    const palette = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#ea580c', '#db2777'];
    const code = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return palette[code % palette.length];
  }

  statusClass(status: string): string {
    return status.toLowerCase();
  }

  isRecentActivity(value: string): boolean {
    return Date.now() - new Date(value).getTime() < 86_400_000;
  }

  relativeTime(value: string): string {
    const timestamp = new Date(value).getTime();
    const diffMs = Date.now() - timestamp;
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  private buildQuery(): PlatformTenantListQuery {
    const query: PlatformTenantListQuery = {
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      search: this.tenantSearch.searchTerm(),
      status: this.statusFilter(),
      billingStatus: this.billingStatusFilter(),
      planId: this.planFilter(),
      sortBy: 'createdOn',
      sortDirection: 'desc'
    };

    return query;
  }
}
