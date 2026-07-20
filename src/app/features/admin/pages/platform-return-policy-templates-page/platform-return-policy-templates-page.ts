import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { ReturnPolicyTemplateListResponse } from '../../models/platform-return-policy-template.model';
import { PlatformReturnPolicyTemplateApiService } from '../../services/platform-return-policy-template-api.service';
import {
  canCreateReturnPolicyTemplates,
  canViewReturnPolicyTemplates
} from '../../utils/return-policy-template-access.util';

@Component({
  selector: 'app-platform-return-policy-templates-page',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  template: `
    <section class="templates-page">
      <header class="page-heading">
        <div class="title-block">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <span>Platform</span>
            <span aria-hidden="true">/</span>
            <span class="current">Return Policy Templates</span>
          </nav>
          <h1>Return Policy Templates</h1>
          <p>Reusable platform return policy templates for tenant catalog setup.</p>
          <span class="title-accent" aria-hidden="true"></span>
        </div>
        @if (canCreate()) {
          <a class="btn primary" routerLink="/admin/return-policy-templates/create">Create Template</a>
        }
      </header>

      <section class="filters card">
        <label class="filter-field search-field">
          <span class="field-label">Search</span>
          <span class="input-wrap">
            <input
              type="search"
              placeholder="Search by template code or name..."
              [ngModel]="searchTerm()"
              (ngModelChange)="onSearchChange($event)"
            />
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          </span>
        </label>
        <div class="filter-actions">
          <button type="button" class="btn outline" (click)="resetFilters()">Reset</button>
        </div>
      </section>

      @if (isLoading()) {
        <div class="state-card card">Loading return policy templates from the backend...</div>
      } @else if (errorMessage()) {
        <div class="state-card card error">
          <strong>Return policy templates could not be loaded</strong>
          <span>{{ errorMessage() }}</span>
          <button type="button" class="btn primary" (click)="loadPage()">Try again</button>
        </div>
      } @else if (templateList(); as list) {
        @if (!list.items.length) {
          <div class="state-card card empty">
            <strong>No return policy templates found</strong>
            <span>{{ searchTerm() ? 'Try a different search term.' : 'Create the first template to get started.' }}</span>
          </div>
        } @else {
          <section class="table-card card">
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Template Code</th>
                    <th>Name</th>
                    <th>Return Window (days)</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of list.items; track item.id) {
                    <tr>
                      <td><code>{{ item.templateCode }}</code></td>
                      <td>{{ item.name }}</td>
                      <td>{{ item.returnWindowDays ?? '—' }}</td>
                      <td><span class="status-badge" [class]="statusClass(item.status)">{{ item.status }}</span></td>
                      <td>{{ (item.updatedAt || item.createdAt) | date: 'medium' }}</td>
                      <td><a class="link" [routerLink]="['/admin/return-policy-templates', item.id]">View</a></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <section class="pagination">
            <span>{{ rangeLabel(list) }}</span>
            <div class="page-controls">
              <button type="button" class="page-btn nav" [disabled]="list.pageNumber <= 1" (click)="goToPage(list.pageNumber - 1)">‹</button>
              @for (page of pageNumbers(list); track page) {
                <button type="button" class="page-btn" [class.active]="page === list.pageNumber" (click)="goToPage(page)">{{ page }}</button>
              }
              <button type="button" class="page-btn nav" [disabled]="list.pageNumber >= list.totalPages" (click)="goToPage(list.pageNumber + 1)">›</button>
            </div>
          </section>
        }
      }
    </section>
  `,
  styles: `
    :host { color: #14213d; display: block; }
    * { box-sizing: border-box; }
    .templates-page { display: grid; gap: 1.15rem; }
    .page-heading { align-items: flex-start; display: flex; gap: 1.25rem; justify-content: space-between; flex-wrap: wrap; }
    .breadcrumb { align-items: center; color: #667085; display: flex; font-size: 0.78rem; gap: 0.45rem; margin-bottom: 0.45rem; }
    .breadcrumb .current { color: #344054; font-weight: 700; }
    .title-block h1 { color: #101a38; font-size: clamp(1.55rem, 2.4vw, 2rem); margin: 0; }
    .title-block p { color: #667085; font-size: 0.92rem; margin: 0.4rem 0 0; }
    .title-accent { background: linear-gradient(90deg, #0b5cff, #5b8dff); border-radius: 99px; display: block; height: 3px; margin-top: 0.75rem; width: 2.75rem; }
    .card { background: #fff; border: 1px solid #e5eaf2; border-radius: 13px; box-shadow: 0 7px 22px rgba(31, 51, 86, 0.045); }
    .filters { display: grid; gap: 0.85rem; grid-template-columns: minmax(0, 1.5fr) auto; padding: 1rem; align-items: end; }
    .filter-field { display: grid; gap: 0.35rem; }
    .field-label { color: #344054; font-size: 0.78rem; font-weight: 700; }
    .input-wrap { align-items: center; display: flex; position: relative; }
    .input-wrap input { border: 1px solid #d0d5dd; border-radius: 10px; font: inherit; padding: 0.65rem 2.2rem 0.65rem 0.75rem; width: 100%; }
    .input-wrap svg { height: 1rem; position: absolute; right: 0.75rem; stroke: #98a2b3; width: 1rem; fill: none; stroke-width: 2; }
    .btn { align-items: center; border-radius: 10px; cursor: pointer; display: inline-flex; font-size: 0.84rem; font-weight: 700; gap: 0.35rem; justify-content: center; padding: 0.65rem 1rem; text-decoration: none; border: 1px solid transparent; }
    .btn.primary { background: #0b5cff; border-color: #0b5cff; color: #fff; }
    .btn.outline { background: #fff; border-color: #d0d5dd; color: #344054; }
    .table-card { overflow: hidden; }
    .table-wrap { overflow-x: auto; }
    table { border-collapse: collapse; min-width: 720px; width: 100%; }
    th, td { border-bottom: 1px solid #edf0f5; font-size: 0.82rem; padding: 0.85rem 1rem; text-align: left; vertical-align: middle; }
    th { background: #f8fafc; color: #475467; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; }
    .status-badge { border-radius: 999px; font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.55rem; text-transform: uppercase; }
    .status-badge.active { background: #dcfce7; color: #15803d; }
    .status-badge.inactive { background: #e2e8f0; color: #475569; }
    .link { color: #0b5cff; font-weight: 700; text-decoration: none; }
    .state-card { display: grid; gap: 0.75rem; padding: 2rem; text-align: center; }
    .state-card.error { color: #b42318; }
    .state-card.empty { color: #667085; }
    .pagination { align-items: center; display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: space-between; }
    .page-controls { display: flex; gap: 0.35rem; }
    .page-btn { background: #fff; border: 1px solid #d0d5dd; border-radius: 8px; cursor: pointer; min-width: 2rem; padding: 0.35rem 0.55rem; }
    .page-btn.active { background: #0b5cff; border-color: #0b5cff; color: #fff; }
    .page-btn:disabled { cursor: not-allowed; opacity: 0.5; }
    @media (max-width: 720px) { .filters { grid-template-columns: 1fr; } }
  `
})
export class PlatformReturnPolicyTemplatesPage implements OnInit {
  private readonly api = inject(PlatformReturnPolicyTemplateApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly accessControl = inject(AccessControlService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges$ = new Subject<string>();

  readonly templateList = signal<ReturnPolicyTemplateListResponse | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly pageNumber = signal(1);
  readonly pageSize = signal(20);

  readonly canCreate = computed(() => canCreateReturnPolicyTemplates(this.accessControl));

  ngOnInit(): void {
    if (!canViewReturnPolicyTemplates(this.accessControl)) {
      this.isLoading.set(false);
      this.errorMessage.set('You do not have permission to view return policy templates.');
      return;
    }

    this.searchChanges$
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageNumber.set(1);
        this.loadPage();
      });

    this.loadPage();
  }

  loadPage(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.api
      .getTemplates({
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize(),
        search: this.searchTerm()
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.templateList.set(response);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.searchChanges$.next(value);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.pageNumber.set(1);
    this.loadPage();
  }

  goToPage(page: number): void {
    const totalPages = this.templateList()?.totalPages ?? 1;
    this.pageNumber.set(Math.min(Math.max(page, 1), Math.max(totalPages, 1)));
    this.loadPage();
  }

  rangeLabel(list: ReturnPolicyTemplateListResponse): string {
    if (list.totalCount === 0) return 'Showing 0 templates';
    const start = (list.pageNumber - 1) * list.pageSize + 1;
    const end = Math.min(list.pageNumber * list.pageSize, list.totalCount);
    return `Showing ${start} to ${end} of ${list.totalCount} templates`;
  }

  pageNumbers(list: ReturnPolicyTemplateListResponse): number[] {
    const total = Math.max(list.totalPages, 1);
    const current = list.pageNumber;
    const windowSize = 5;
    const start = Math.max(1, Math.min(current - 2, total - windowSize + 1));
    const end = Math.min(total, start + windowSize - 1);
    const adjustedStart = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }

  statusClass(status: string): string {
    return status.toLowerCase();
  }
}
