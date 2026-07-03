import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { ApiErrorService } from '../../../../core/services/api-error.service';
import {
  PlatformAuditLogListQuery,
  PlatformAuditLogListResponse
} from '../../models/platform-audit-log.model';
import { PlatformAuditLogApiService } from '../../services/platform-audit-log-api.service';

const LOGIN_AUDIT_ACTIONS = [
  { value: '', label: 'All actions' },
  { value: 'platform.login.success', label: 'Login success' },
  { value: 'platform.login.failed', label: 'Login failed' },
  { value: 'platform.login.locked', label: 'Login locked' }
] as const;

@Component({
  selector: 'app-platform-audit-logs-page',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <section class="audit-page">
      <header class="page-heading">
        <div class="title-block">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <span>Platform</span>
            <span aria-hidden="true">/</span>
            <span class="current">Platform Login Audit</span>
          </nav>
          <h1>Platform Login Audit</h1>
          <p>Security audit logs for platform login activity returned by the backend.</p>
          <span class="title-accent" aria-hidden="true"></span>
        </div>
      </header>

      @if (auditList()?.auditScopeDescription) {
        <section class="scope-notice card" aria-live="polite">
          <strong>Release 1 scope</strong>
          <p>{{ auditList()!.auditScopeDescription }}</p>
        </section>
      }

      <section class="filters card">
        <label class="filter-field search-field">
          <span class="field-label">Search</span>
          <span class="input-wrap">
            <input
              type="search"
              placeholder="Search actor email, action, or login result..."
              [ngModel]="searchTerm()"
              (ngModelChange)="onSearchChange($event)"
            />
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          </span>
        </label>
        <label class="filter-field">
          <span class="field-label">Action</span>
          <select [ngModel]="actionFilter()" (ngModelChange)="onActionChange($event)">
            @for (option of actionOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>
        <label class="filter-field">
          <span class="field-label">From</span>
          <input type="date" [ngModel]="fromDate()" (ngModelChange)="onFromDateChange($event)" />
        </label>
        <label class="filter-field">
          <span class="field-label">To</span>
          <input type="date" [ngModel]="toDate()" (ngModelChange)="onToDateChange($event)" />
        </label>
        <div class="filter-actions">
          <button type="button" class="btn outline" (click)="resetFilters()">Reset</button>
        </div>
      </section>

      @if (isLoading()) {
        <div class="state-card card">Loading platform login audit logs from the backend...</div>
      } @else if (errorMessage()) {
        <div class="state-card card error">
          <strong>Platform login audit logs could not be loaded</strong>
          <span>{{ errorMessage() }}</span>
          <button type="button" class="btn primary" (click)="loadPage()">Try again</button>
        </div>
      } @else if (auditList(); as list) {
        @if (!list.items.length) {
          <div class="state-card card empty">
            <strong>No login audit records found</strong>
            <span>Try adjusting the date range, action filter, or search term.</span>
          </div>
        } @else {
          <section class="table-card card">
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Occurred At</th>
                    <th>Actor Email</th>
                    <th>Action</th>
                    <th>Area</th>
                    <th>Entity Type</th>
                    <th>Entity ID</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of list.items; track item.id) {
                    <tr>
                      <td>{{ item.occurredAt | date: 'medium' }}</td>
                      <td>{{ item.actor.email || '—' }}</td>
                      <td><code>{{ item.action }}</code></td>
                      <td>{{ item.area }}</td>
                      <td>{{ item.entityType }}</td>
                      <td><code>{{ item.entityId || '—' }}</code></td>
                      <td>{{ item.summary }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <section class="pagination">
            <span>{{ rangeLabel(list) }}</span>
            <div class="page-controls">
              <button
                type="button"
                class="page-btn nav"
                [disabled]="list.pageNumber <= 1"
                (click)="goToPage(list.pageNumber - 1)"
                aria-label="Previous page"
              >
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
          </section>
        }
      }
    </section>
  `,
  styles: `
    :host { color: #14213d; display: block; }
    * { box-sizing: border-box; }

    .audit-page { display: grid; gap: 1.15rem; }

    .page-heading { align-items: flex-start; display: flex; gap: 1.25rem; justify-content: space-between; }

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

    .scope-notice {
      background: #fffaeb;
      border-color: #fedf89;
      display: grid;
      gap: 0.35rem;
      padding: 0.9rem 1rem;
    }

    .scope-notice strong { color: #b54708; font-size: 0.82rem; }
    .scope-notice p { color: #7a2e0e; font-size: 0.84rem; margin: 0; }

    .filters {
      align-items: end;
      display: grid;
      gap: 0.85rem;
      grid-template-columns: minmax(0, 1.5fr) repeat(3, minmax(0, 1fr)) auto;
      padding: 1rem;
    }

    .filter-field { display: grid; gap: 0.45rem; }

    .field-label {
      color: #667085;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .input-wrap { align-items: center; display: flex; position: relative; }

    .input-wrap input,
    .filter-field input,
    .filter-field select {
      border: 1px solid #d0d5dd;
      border-radius: 10px;
      min-height: 2.65rem;
      padding: 0 0.85rem;
      width: 100%;
    }

    .input-wrap input { padding-right: 2.35rem; }

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

    .filter-actions { display: flex; gap: 0.5rem; }

    .table-card { padding: 0.35rem 0.35rem 0; }

    .table-wrap { overflow-x: auto; }

    table { border-collapse: collapse; min-width: 100%; width: 100%; }

    th, td {
      border-bottom: 1px solid #eef2f7;
      padding: 0.75rem 0.65rem;
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
      word-break: break-all;
    }

    .state-card {
      display: grid;
      gap: 0.75rem;
      padding: 2rem;
      text-align: center;
    }

    .state-card.error { color: #b42318; }
    .state-card.empty { color: #667085; }

    .pagination {
      align-items: center;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
    }

    .pagination > span { color: #667085; font-size: 0.84rem; }

    .page-controls { display: flex; flex-wrap: wrap; gap: 0.35rem; }

    .page-btn,
    .btn {
      align-items: center;
      border-radius: 10px;
      cursor: pointer;
      display: inline-flex;
      font-size: 0.84rem;
      font-weight: 700;
      justify-content: center;
      min-height: 2.65rem;
      padding: 0 1rem;
    }

    .page-btn {
      background: #fff;
      border: 1px solid #d0d5dd;
      color: #344054;
      min-height: 2.2rem;
      min-width: 2.2rem;
      padding: 0;
    }

    .page-btn.active { background: #0b5cff; border-color: #0b5cff; color: #fff; }
    .page-btn:disabled { cursor: not-allowed; opacity: 0.45; }

    .btn.primary { background: #0b5cff; border: 0; color: #fff; margin: 0 auto; }

    .btn.outline { background: #fff; border: 1px solid #d0d5dd; color: #344054; }

    @media (max-width: 960px) {
      .filters { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 560px) {
      .filters { grid-template-columns: 1fr; }
      .pagination { align-items: flex-start; flex-direction: column; }
    }
  `
})
export class PlatformAuditLogsPage implements OnInit {
  private readonly api = inject(PlatformAuditLogApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);

  readonly actionOptions = LOGIN_AUDIT_ACTIONS;
  readonly auditList = signal<PlatformAuditLogListResponse | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly actionFilter = signal('');
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly pageNumber = signal(1);
  readonly pageSize = signal(20);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadPage();
  }

  loadPage(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.api
      .getAuditLogs(this.buildQuery())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.auditList.set(response);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.auditList.set(null);
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.pageNumber.set(1);
      this.loadPage();
    }, 300);
  }

  onActionChange(value: string): void {
    this.actionFilter.set(value);
    this.pageNumber.set(1);
    this.loadPage();
  }

  onFromDateChange(value: string): void {
    this.fromDate.set(value);
    this.pageNumber.set(1);
    this.loadPage();
  }

  onToDateChange(value: string): void {
    this.toDate.set(value);
    this.pageNumber.set(1);
    this.loadPage();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.actionFilter.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.pageNumber.set(1);
    this.loadPage();
  }

  goToPage(page: number): void {
    const totalPages = this.auditList()?.totalPages ?? 1;
    const nextPage = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
    this.pageNumber.set(nextPage);
    this.loadPage();
  }

  rangeLabel(list: PlatformAuditLogListResponse): string {
    if (list.totalCount === 0) {
      return 'Showing 0 audit records';
    }

    const start = (list.pageNumber - 1) * list.pageSize + 1;
    const end = Math.min(list.pageNumber * list.pageSize, list.totalCount);
    return `Showing ${start}-${end} of ${list.totalCount} audit records`;
  }

  pageNumbers(list: PlatformAuditLogListResponse): number[] {
    const total = Math.max(list.totalPages, 1);
    const current = list.pageNumber;
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    const pages: number[] = [];

    for (let page = adjustedStart; page <= end; page += 1) {
      pages.push(page);
    }

    return pages;
  }

  buildQuery(): PlatformAuditLogListQuery {
    return {
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      search: this.searchTerm().trim() || undefined,
      action: this.actionFilter().trim() || undefined,
      from: toIsoDateBoundary(this.fromDate(), 'start'),
      to: toIsoDateBoundary(this.toDate(), 'end')
    };
  }
}

function toIsoDateBoundary(dateValue: string, boundary: 'start' | 'end'): string | undefined {
  if (!dateValue) {
    return undefined;
  }

  const suffix = boundary === 'start' ? 'T00:00:00.000' : 'T23:59:59.999';
  return new Date(`${dateValue}${suffix}`).toISOString();
}
