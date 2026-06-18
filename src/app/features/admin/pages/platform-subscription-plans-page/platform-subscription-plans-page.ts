import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import {
  SubscriptionPlanListResponse,
  SubscriptionPlanStatus
} from '../../models/platform-subscription-plan.model';
import { PlatformSubscriptionPlanApiService } from '../../services/platform-subscription-plan-api.service';

type StatusTab = 'all' | SubscriptionPlanStatus;

@Component({
  selector: 'app-platform-subscription-plans-page',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  template: `
    <section class="plans-page">
      <header class="page-heading">
        <div class="title-block">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <span>Subscriptions</span>
            <span aria-hidden="true">/</span>
            <span class="current">Plans</span>
          </nav>
          <h1>Subscription Plans</h1>
          <p>Create and manage plan templates for tenants.</p>
          <span class="title-accent" aria-hidden="true"></span>
        </div>
        @if (canCreate()) {
          <a class="btn primary" routerLink="/admin/subscriptions/create">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Create Plan
          </a>
        }
      </header>

      <div class="tabs" role="tablist" aria-label="Plan status filters">
        @for (tab of statusTabs; track tab.key) {
          <button
            type="button"
            role="tab"
            class="tab-btn"
            [class.active]="activeTab() === tab.key"
            [attr.aria-selected]="activeTab() === tab.key"
            (click)="onTabChange(tab.key)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="tab.icon" /></svg>
            {{ tab.label }}
            <span class="tab-count">{{ tabCountLabel(tab.key) }}</span>
          </button>
        }
      </div>

      <section class="filters card">
        <label class="filter-field">
          <span class="field-label">Plan Type</span>
          <select [ngModel]="planTypeFilter()" (ngModelChange)="onPlanTypeChange($event)">
            <option value="">All</option>
            <option value="free">Free</option>
            <option value="trial">Trial</option>
            <option value="paid">Paid</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label class="filter-field">
          <span class="field-label">Status</span>
          <select [ngModel]="statusFilter()" (ngModelChange)="onStatusChange($event)">
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label class="filter-field">
          <span class="field-label">Billing Cycle</span>
          <select [ngModel]="billingCycleFilter()" (ngModelChange)="onBillingCycleChange($event)">
            <option value="">All</option>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
            <option value="both">Both</option>
          </select>
        </label>
        <label class="filter-field">
          <span class="field-label">Currency</span>
          <select [ngModel]="currencyFilter()" (ngModelChange)="onCurrencyChange($event)">
            <option value="">All</option>
            <option value="LKR">LKR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
        <label class="filter-field search-field">
          <span class="field-label">Search</span>
          <span class="input-wrap">
            <input
              type="search"
              placeholder="Search plans..."
              [ngModel]="searchTerm()"
              (ngModelChange)="onSearchChange($event)"
              aria-label="Search plans by name or code"
            />
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          </span>
        </label>
        <div class="filter-actions">
          <button type="button" class="btn outline" (click)="resetFilters()">Reset</button>
        </div>
      </section>

      @if (errorMessage()) {
        <div class="state-card card error">
          <strong>Subscription plans could not be loaded</strong>
          <span>{{ errorMessage() }}</span>
          <button type="button" class="btn primary" (click)="loadPage()">Try again</button>
        </div>
      } @else if (isLoading()) {
        <section class="table-card card">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Plan Name</th>
                  <th>Plan Code</th>
                  <th>Plan Type</th>
                  <th>Tenant Monthly Price</th>
                  <th>Tenant Annual Price</th>
                  <th>Included Modules</th>
                  <th>Add-ons</th>
                  <th>Active Tenants</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (row of skeletonRows; track row) {
                  <tr class="skeleton-row">
                    @for (col of skeletonCols; track col) {
                      <td><span class="skeleton"></span></td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      } @else if (planList(); as list) {
        @if (list.items.length) {
          <section class="table-card card">
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Plan Name</th>
                    <th>Plan Code</th>
                    <th>Plan Type</th>
                    <th>Tenant Monthly Price</th>
                    <th>Tenant Annual Price</th>
                    <th>Included Modules</th>
                    <th>Add-ons</th>
                    <th>Active Tenants</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (plan of list.items; track plan.id) {
                    <tr>
                      <td>
                        <div class="plan-cell">
                          <span class="plan-icon" [style.background]="planColor(plan.planName)">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM8 10h8M8 14h5" /></svg>
                          </span>
                          <span class="plan-meta">
                            <strong>{{ plan.planName }}</strong>
                            @if (plan.isDefault) {
                              <span class="pill default">Default</span>
                            }
                          </span>
                        </div>
                      </td>
                      <td><code class="code-badge">{{ plan.planCode }}</code></td>
                      <td class="cell-text">{{ titleCase(plan.planType) }}</td>
                      <td class="cell-text">{{ formatPrice(plan.tenantMonthlyPrice, plan.currencyCode) }}</td>
                      <td class="cell-text">
                        <span>{{ formatPrice(plan.tenantAnnualPrice, plan.currencyCode) }}</span>
                        @if (plan.annualDiscountPercentage != null && plan.annualDiscountPercentage > 0) {
                          <span class="pill save">Save {{ plan.annualDiscountPercentage }}%</span>
                        }
                      </td>
                      <td class="cell-text">{{ plan.includedModulesCount }} modules</td>
                      <td class="cell-text">{{ plan.addOnsCount }} add-ons</td>
                      <td class="cell-num">{{ plan.activeTenantsCount }}</td>
                      <td>
                        <span class="status-badge" [class]="statusClass(plan.status)">{{ titleCase(plan.status) }}</span>
                      </td>
                      <td class="cell-text">{{ plan.lastUpdatedAt | date: 'mediumDate' }}</td>
                      <td class="actions-cell">
                        <button type="button" class="icon-btn" aria-label="View plan" [disabled]="!plan.canView" title="View">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                        <button type="button" class="icon-btn" aria-label="Edit plan" [disabled]="!plan.canEdit" title="Edit">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                        </button>
                        <button type="button" class="icon-btn" aria-label="Duplicate plan" [disabled]="!plan.canDuplicate" title="Duplicate">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                        </button>
                        <div class="menu-wrap">
                          <button
                            type="button"
                            class="icon-btn"
                            aria-label="More actions"
                            [attr.aria-expanded]="openMenuId() === plan.id"
                            (click)="toggleMenu(plan.id)"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
                              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                              <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
                            </svg>
                          </button>
                          @if (openMenuId() === plan.id) {
                            <div class="action-menu" role="menu">
                              @if (plan.status === 'draft') {
                                <button type="button" role="menuitem" disabled title="Publish API pending">Publish</button>
                              }
                              <button type="button" role="menuitem" [disabled]="!plan.canArchive">Archive</button>
                              <button
                                type="button"
                                role="menuitem"
                                class="danger"
                                [disabled]="!plan.canDelete"
                                [title]="plan.canDelete ? 'Delete plan' : (plan.deleteBlockedReason ?? 'Delete not allowed')"
                              >
                                Delete
                              </button>
                            </div>
                          }
                        </div>
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
              <button type="button" class="page-btn nav" [disabled]="!list.hasPreviousPage" (click)="goToPage(list.pageNumber - 1)" aria-label="Previous page">‹</button>
              @for (page of pageNumbers(list); track page) {
                <button type="button" class="page-btn" [class.active]="page === list.pageNumber" (click)="goToPage(page)">{{ page }}</button>
              }
              <button type="button" class="page-btn nav" [disabled]="!list.hasNextPage" (click)="goToPage(list.pageNumber + 1)" aria-label="Next page">›</button>
            </div>
          </footer>
        } @else {
          <div class="state-card card empty">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM8 10h8M8 14h5" /></svg>
            <strong>No subscription plans found</strong>
            <span>Try changing filters or create a new subscription plan.</span>
            @if (canCreate()) {
              <a class="btn primary" routerLink="/admin/subscriptions/create">Create Plan</a>
            }
          </div>
        }
      }
    </section>
  `,
  styles: `
    :host { color: #14213d; display: block; }
    * { box-sizing: border-box; }

    .plans-page { display: grid; gap: 1.15rem; }

    .page-heading {
      align-items: flex-start;
      display: flex;
      gap: 1.25rem;
      justify-content: space-between;
    }

    .breadcrumb {
      color: #667085;
      display: flex;
      font-size: 0.78rem;
      gap: 0.35rem;
      margin-bottom: 0.35rem;
    }

    .breadcrumb .current { color: #344054; font-weight: 600; }

    .title-block h1 {
      color: #101a38;
      font-size: clamp(1.65rem, 2.5vw, 2.05rem);
      font-weight: 800;
      letter-spacing: -0.02em;
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

    .tabs {
      background: #f4f6fb;
      border-radius: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      padding: 0.35rem;
    }

    .tab-btn {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 9px;
      color: #475467;
      cursor: pointer;
      display: inline-flex;
      font-size: 0.82rem;
      font-weight: 600;
      gap: 0.45rem;
      padding: 0.55rem 0.85rem;
    }

    .tab-btn svg {
      fill: none;
      height: 1rem;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.75;
      width: 1rem;
    }

    .tab-btn.active {
      background: #fff;
      box-shadow: 0 2px 8px rgba(16, 24, 40, 0.08);
      color: #0b5cff;
    }

    .tab-count {
      background: #eef2ff;
      border-radius: 99px;
      color: #344054;
      font-size: 0.72rem;
      min-width: 1.35rem;
      padding: 0.1rem 0.45rem;
      text-align: center;
    }

    .tab-btn.active .tab-count { background: #e0ebff; color: #0b5cff; }

    .card {
      background: #fff;
      border: 1px solid #eaecf0;
      border-radius: 14px;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
    }

    .filters {
      display: grid;
      gap: 0.85rem;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      padding: 1rem;
    }

    .filter-field { display: grid; gap: 0.35rem; }

    .field-label { color: #667085; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; }

    .filter-field select,
    .filter-field input {
      background: #fff;
      border: 1px solid #d0d5dd;
      border-radius: 10px;
      color: #101828;
      font-size: 0.86rem;
      min-height: 2.5rem;
      padding: 0.45rem 0.75rem;
      width: 100%;
    }

    .search-field { grid-column: span 2; }

    .input-wrap { display: grid; position: relative; }

    .input-wrap svg {
      fill: none;
      height: 1rem;
      pointer-events: none;
      position: absolute;
      right: 0.75rem;
      stroke: #98a2b3;
      stroke-linecap: round;
      stroke-width: 1.75;
      top: 50%;
      transform: translateY(-50%);
      width: 1rem;
    }

    .filter-actions { align-items: end; display: flex; }

    .btn {
      align-items: center;
      border-radius: 10px;
      cursor: pointer;
      display: inline-flex;
      font-size: 0.84rem;
      font-weight: 600;
      gap: 0.45rem;
      justify-content: center;
      min-height: 2.5rem;
      padding: 0.55rem 1rem;
      text-decoration: none;
    }

    .btn svg {
      fill: none;
      height: 1rem;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-width: 2;
      width: 1rem;
    }

    .btn.primary { background: #0b5cff; border: 1px solid #0b5cff; color: #fff; }
    .btn.outline { background: #fff; border: 1px solid #d0d5dd; color: #344054; }

    .table-card { overflow: hidden; padding: 0; }

    .table-wrap { overflow-x: auto; }

    table { border-collapse: collapse; min-width: 1100px; width: 100%; }

    th, td {
      border-bottom: 1px solid #f2f4f7;
      padding: 0.85rem 1rem;
      text-align: left;
      vertical-align: middle;
    }

    th {
      background: #f9fafb;
      color: #667085;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .plan-cell { align-items: center; display: flex; gap: 0.65rem; }

    .plan-icon {
      align-items: center;
      border-radius: 10px;
      color: #fff;
      display: flex;
      flex-shrink: 0;
      height: 2.2rem;
      justify-content: center;
      width: 2.2rem;
    }

    .plan-icon svg {
      fill: none;
      height: 1.1rem;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-width: 1.75;
      width: 1.1rem;
    }

    .plan-meta { align-items: center; display: flex; flex-wrap: wrap; gap: 0.4rem; }

    .plan-meta strong { color: #101828; font-size: 0.88rem; }

    .pill {
      border-radius: 99px;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
    }

    .pill.default { background: #eef4ff; color: #3538cd; }
    .pill.save { background: #ecfdf3; color: #027a48; margin-left: 0.35rem; }

    .code-badge {
      background: #f9fafb;
      border: 1px solid #eaecf0;
      border-radius: 6px;
      color: #344054;
      font-family: ui-monospace, monospace;
      font-size: 0.78rem;
      padding: 0.2rem 0.45rem;
    }

    .cell-text { color: #344054; font-size: 0.84rem; }
    .cell-num { color: #101828; font-size: 0.84rem; font-weight: 600; }

    .status-badge {
      border-radius: 99px;
      display: inline-flex;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.25rem 0.55rem;
    }

    .status-badge.published { background: #ecfdf3; color: #027a48; }
    .status-badge.draft { background: #fff6ed; color: #b54708; }
    .status-badge.archived { background: #f2f4f7; color: #475467; }

    .actions-cell { display: flex; gap: 0.25rem; position: relative; }

    .icon-btn {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 8px;
      color: #667085;
      cursor: pointer;
      display: inline-flex;
      height: 2rem;
      justify-content: center;
      width: 2rem;
    }

    .icon-btn:disabled { cursor: not-allowed; opacity: 0.4; }

    .icon-btn svg {
      fill: none;
      height: 1rem;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.75;
      width: 1rem;
    }

    .icon-btn:not(:disabled):hover { background: #f2f4f7; color: #0b5cff; }

    .menu-wrap { position: relative; }

    .action-menu {
      background: #fff;
      border: 1px solid #eaecf0;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(16, 24, 40, 0.12);
      display: grid;
      min-width: 9rem;
      padding: 0.35rem;
      position: absolute;
      right: 0;
      top: calc(100% + 0.25rem);
      z-index: 5;
    }

    .action-menu button {
      background: transparent;
      border: 0;
      border-radius: 8px;
      color: #344054;
      cursor: pointer;
      font-size: 0.82rem;
      padding: 0.45rem 0.65rem;
      text-align: left;
    }

    .action-menu button:disabled { cursor: not-allowed; opacity: 0.45; }
    .action-menu button.danger { color: #b42318; }

    .pagination {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: space-between;
    }

    .range-label { color: #667085; font-size: 0.82rem; }

    .pagination-controls { display: flex; gap: 0.35rem; }

    .page-btn {
      background: #fff;
      border: 1px solid #d0d5dd;
      border-radius: 8px;
      color: #344054;
      cursor: pointer;
      font-size: 0.82rem;
      min-width: 2rem;
      padding: 0.35rem 0.55rem;
    }

    .page-btn.active { background: #0b5cff; border-color: #0b5cff; color: #fff; }
    .page-btn:disabled { cursor: not-allowed; opacity: 0.45; }

    .state-card {
      align-items: center;
      display: grid;
      gap: 0.65rem;
      justify-items: center;
      padding: 2rem;
      text-align: center;
    }

    .state-card.error { justify-items: start; text-align: left; }
    .state-card.empty svg {
      fill: none;
      height: 2.5rem;
      stroke: #98a2b3;
      stroke-linecap: round;
      stroke-width: 1.75;
      width: 2.5rem;
    }

    .skeleton {
      animation: pulse 1.4s ease-in-out infinite;
      background: #eef2f6;
      border-radius: 6px;
      display: block;
      height: 0.85rem;
      width: 80%;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.45; }
    }

    @media (max-width: 720px) {
      .search-field { grid-column: span 1; }
      .page-heading { flex-direction: column; }
    }
  `
})
export class PlatformSubscriptionPlansPage {
  private readonly api = inject(PlatformSubscriptionPlanApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly accessControl = inject(AccessControlService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges$ = new Subject<string>();

  readonly skeletonRows = [1, 2, 3, 4, 5];
  readonly skeletonCols = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  readonly statusTabs = [
    { key: 'all' as StatusTab, label: 'All', icon: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
    { key: 'draft' as StatusTab, label: 'Draft', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
    { key: 'published' as StatusTab, label: 'Published', icon: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3' },
    { key: 'archived' as StatusTab, label: 'Archived', icon: 'M3 7h18M5 7l1 12h12l1-12M10 11v6M14 11v6M9 7V4h6v3' }
  ];

  readonly planList = signal<SubscriptionPlanListResponse | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly activeTab = signal<StatusTab>('all');
  readonly searchTerm = signal('');
  readonly planTypeFilter = signal('');
  readonly statusFilter = signal('');
  readonly billingCycleFilter = signal('');
  readonly currencyFilter = signal('');
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);
  readonly openMenuId = signal<string | null>(null);

  constructor() {
    this.searchChanges$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.pageNumber.set(1);
        this.loadPage();
      });

    this.loadPage();
  }

  canCreate(): boolean {
    return this.accessControl.hasPermission(platformPermissions.subscriptionPlansCreate)
      || this.accessControl.hasPermission(platformPermissions.subscriptionManage);
  }

  tabCount(tab: StatusTab): number {
    const counts = this.planList()?.statusCounts;
    if (!counts) {
      return 0;
    }

    return counts[tab];
  }

  tabCountLabel(tab: StatusTab): string {
    if (this.isLoading() && !this.planList()) {
      return '—';
    }

    return String(this.tabCount(tab));
  }

  onTabChange(tab: StatusTab): void {
    this.activeTab.set(tab);
    this.statusFilter.set(tab === 'all' ? '' : tab);
    this.pageNumber.set(1);
    this.loadPage();
  }

  onSearchChange(value: string): void {
    this.searchChanges$.next(value);
  }

  onPlanTypeChange(value: string): void {
    this.planTypeFilter.set(value);
    this.pageNumber.set(1);
    this.loadPage();
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.activeTab.set(value === '' ? 'all' : (value as StatusTab));
    this.pageNumber.set(1);
    this.loadPage();
  }

  onBillingCycleChange(value: string): void {
    this.billingCycleFilter.set(value);
    this.pageNumber.set(1);
    this.loadPage();
  }

  onCurrencyChange(value: string): void {
    this.currencyFilter.set(value);
    this.pageNumber.set(1);
    this.loadPage();
  }

  resetFilters(): void {
    this.activeTab.set('all');
    this.searchTerm.set('');
    this.planTypeFilter.set('');
    this.statusFilter.set('');
    this.billingCycleFilter.set('');
    this.currencyFilter.set('');
    this.pageNumber.set(1);
    this.loadPage();
  }

  loadPage(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.openMenuId.set(null);

    this.api.getPlans({
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      search: this.searchTerm(),
      planType: this.planTypeFilter(),
      status: this.statusFilter(),
      billingCycle: this.billingCycleFilter(),
      currencyCode: this.currencyFilter(),
      sortBy: 'updatedAt',
      sortDirection: 'desc'
    }).subscribe({
      next: (response) => {
        this.planList.set(response);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  goToPage(page: number): void {
    this.pageNumber.set(page);
    this.loadPage();
  }

  toggleMenu(planId: string): void {
    this.openMenuId.set(this.openMenuId() === planId ? null : planId);
  }

  rangeLabel(list: SubscriptionPlanListResponse): string {
    if (list.totalItems === 0) {
      return 'Showing 0 plans';
    }

    const start = (list.pageNumber - 1) * list.pageSize + 1;
    const end = Math.min(list.pageNumber * list.pageSize, list.totalItems);
    return `Showing ${start} to ${end} of ${list.totalItems} plans`;
  }

  pageNumbers(list: SubscriptionPlanListResponse): number[] {
    const total = Math.max(list.totalPages, 1);
    const current = list.pageNumber;
    const windowSize = 5;
    const start = Math.max(1, Math.min(current - 2, total - windowSize + 1));
    const end = Math.min(total, start + windowSize - 1);
    const adjustedStart = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }

  formatPrice(value: number | null, currencyCode: string): string {
    if (value == null) {
      return '—';
    }

    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode || 'USD',
      minimumFractionDigits: 2
    }).format(value);
  }

  titleCase(value: string): string {
    if (!value) {
      return '—';
    }

    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  statusClass(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized === 'published' || normalized === 'active') {
      return 'published';
    }

    if (normalized === 'draft') {
      return 'draft';
    }

    return 'archived';
  }

  planColor(name: string): string {
    const palette = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#ea580c'];
    const code = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return palette[code % palette.length];
  }
}
