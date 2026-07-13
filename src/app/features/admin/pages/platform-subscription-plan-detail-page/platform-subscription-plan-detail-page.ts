import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, switchMap } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { SubscriptionPlanDetail } from '../../models/platform-subscription-plan.model';
import {
  subscriptionPlanStatusBadgeClass,
  subscriptionPlanStatusLabel
} from '../../models/subscription-plan-status.util';
import { PlatformSubscriptionPlanApiService } from '../../services/platform-subscription-plan-api.service';

type DetailState = 'loading' | 'ready' | 'not-found' | 'forbidden' | 'error';

@Component({
  selector: 'app-platform-subscription-plan-detail-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <section class="detail-page">
      @if (successMessage()) {
        <div class="toast success" role="status">{{ successMessage() }}</div>
      }

      @if (state() === 'loading') {
        <div class="detail-skeleton" aria-label="Loading subscription plan">
          <div class="skeleton hero"></div>
          <div class="summary-grid">
            <div class="skeleton card"></div>
            <div class="skeleton card"></div>
            <div class="skeleton card"></div>
          </div>
        </div>
      } @else if (state() === 'not-found') {
        <section class="state-card" role="alert">
          <span class="state-icon">?</span>
          <h1>Subscription Plan Not Found</h1>
          <p>The plan ID is invalid, or this subscription plan no longer exists.</p>
          <a class="btn primary" routerLink="/admin/subscriptions">Back to Subscription Plans</a>
        </section>
      } @else if (state() === 'forbidden') {
        <section class="state-card" role="alert">
          <span class="state-icon lock">!</span>
          <h1>Permission denied</h1>
          <p>You do not have permission to view this subscription plan.</p>
          <a class="btn outline" routerLink="/admin/subscriptions">Back to Subscription Plans</a>
        </section>
      } @else if (state() === 'error') {
        <section class="state-card" role="alert">
          <span class="state-icon error">!</span>
          <h1>Subscription plan could not be loaded</h1>
          <p>{{ errorMessage() }}</p>
          <div class="state-actions">
            <button type="button" class="btn primary" (click)="reload()">Try again</button>
            <a class="btn outline" routerLink="/admin/subscriptions">Back to Subscription Plans</a>
          </div>
        </section>
      } @else if (plan(); as current) {
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a routerLink="/admin/subscriptions">Subscription Plans</a>
          <span aria-hidden="true">/</span>
          <span>{{ current.planName }}</span>
        </nav>

        <header class="plan-header">
          <div>
            <div class="eyebrow">
              <code>{{ current.planCode }}</code>
              <span class="status" [class]="statusClass(current.status)">{{ statusLabel(current.status) }}</span>
            </div>
            <h1>{{ current.planName }}</h1>
            <p>{{ current.description || 'No description has been provided for this plan.' }}</p>
            <div class="dates">
              <span>Created {{ current.createdAt | date: 'mediumDate' }}</span>
              <span>Updated {{ current.updatedAt | date: 'medium' }}</span>
            </div>
          </div>
          <div class="header-actions">
            <a class="btn outline" routerLink="/admin/subscriptions">Back to plans</a>
            @if (canEdit(current)) {
              <button type="button" class="btn outline" (click)="edit(current)">Edit</button>
            }
            @if (canPublish(current)) {
              <button type="button" class="btn primary" [disabled]="isActionPending()" (click)="publish(current)">Publish</button>
            }
            @if (canDuplicate(current)) {
              <button type="button" class="btn outline" [disabled]="isActionPending()" (click)="duplicate(current)">Duplicate</button>
            }
            @if (canArchive(current)) {
              <button type="button" class="btn warning" [disabled]="isActionPending()" (click)="archive(current)">Archive</button>
            }
            @if (canReactivate(current)) {
              <button type="button" class="btn primary" [disabled]="isActionPending()" (click)="reactivate(current)">Reactivate</button>
            }
            @if (canDelete(current)) {
              <button type="button" class="btn danger" [disabled]="isActionPending()" (click)="deleteDraft(current)">Delete draft</button>
            }
          </div>
        </header>

        @if (actionError()) {
          <div class="action-error" role="alert">{{ actionError() }}</div>
        }

        <div class="summary-grid">
          <article class="summary-card">
            <span class="summary-label">Pricing</span>
            <strong>{{ formatPrice(current.basePrice, current.baseCurrency) }}</strong>
            <span>{{ titleCase(current.pricingModel) }} · {{ titleCase(current.billingCycle) }}</span>
            @if (current.trialDays > 0) {
              <small>{{ current.trialDays }}-day trial</small>
            }
          </article>
          <article class="summary-card">
            <span class="summary-label">Enabled features</span>
            <strong>{{ current.featureCount }}</strong>
            <span>Across {{ current.modules.length }} module{{ current.modules.length === 1 ? '' : 's' }}</span>
          </article>
          <article class="summary-card">
            <span class="summary-label">Assigned tenants</span>
            <strong>{{ current.activeTenantCount }}</strong>
            <span>Active subscriptions</span>
          </article>
        </div>

        <div class="content-grid">
          <article class="section-card">
            <header><h2>Plan limits</h2><p>Configured usage and capacity limits.</p></header>
            @if (current.limits.length) {
              <dl class="limit-list">
                @for (limit of current.limits; track limit.id) {
                  <div>
                    <dt>{{ limit.name }}</dt>
                    <dd>{{ formatLimit(limit.value, limit.isUnlimited, limit.unitCode) }}</dd>
                  </div>
                }
              </dl>
            } @else {
              <div class="empty-state">No limits are configured for this plan.</div>
            }
          </article>

          <article class="section-card modules-card">
            <header><h2>Modules and features</h2><p>Capabilities included with this plan.</p></header>
            @if (current.modules.length) {
              <div class="module-list">
                @for (module of current.modules; track module.id) {
                  <section class="module-block">
                    <div class="module-heading">
                      <div><h3>{{ module.name }}</h3><code>{{ module.code }}</code></div>
                      <span>{{ module.features.length }} feature{{ module.features.length === 1 ? '' : 's' }}</span>
                    </div>
                    @if (module.description) { <p>{{ module.description }}</p> }
                    <ul>
                      @for (feature of module.features; track feature.id) {
                        <li>
                          <span class="check">✓</span>
                          <div><strong>{{ feature.name }}</strong><small>{{ feature.description || feature.code }}</small></div>
                        </li>
                      }
                    </ul>
                  </section>
                }
              </div>
            } @else {
              <div class="empty-state">No modules or features are configured for this plan.</div>
            }
          </article>
        </div>
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .detail-page { color: #101828; display: grid; gap: 1.25rem; }
    .breadcrumb { align-items: center; color: #667085; display: flex; font-size: .78rem; gap: .5rem; }
    .breadcrumb a { color: #175cd3; text-decoration: none; }
    .plan-header { align-items: flex-start; background: linear-gradient(135deg, #fff 0%, #f5f8ff 100%); border: 1px solid #dce4f0; border-radius: 16px; display: flex; gap: 1rem; justify-content: space-between; padding: 1.5rem; }
    .eyebrow, .dates, .header-actions, .state-actions { align-items: center; display: flex; flex-wrap: wrap; gap: .65rem; }
    .eyebrow code, .module-heading code { background: #eef4ff; border-radius: 6px; color: #1849a9; font-size: .72rem; padding: .25rem .45rem; }
    .status { border-radius: 99px; font-size: .7rem; font-weight: 700; padding: .3rem .55rem; }
    .status.draft { background: #fff7d6; color: #854a0e; }
    .status.published { background: #dcfae6; color: #067647; }
    .status.archived { background: #f2f4f7; color: #475467; }
    h1 { font-size: 1.8rem; margin: .7rem 0 .35rem; }
    .plan-header p { color: #667085; margin: 0; max-width: 50rem; }
    .dates { color: #667085; font-size: .75rem; margin-top: 1rem; }
    .header-actions { justify-content: flex-end; max-width: 30rem; }
    .btn { align-items: center; border: 1px solid transparent; border-radius: 8px; cursor: pointer; display: inline-flex; font: inherit; font-size: .78rem; font-weight: 700; justify-content: center; min-height: 2.35rem; padding: .55rem .85rem; text-decoration: none; }
    .btn:disabled { cursor: wait; opacity: .55; }
    .btn.primary { background: #155eef; color: #fff; }
    .btn.outline { background: #fff; border-color: #d0d5dd; color: #344054; }
    .btn.warning { background: #fff6ed; border-color: #fedf89; color: #b54708; }
    .btn.danger { background: #fff; border-color: #fda29b; color: #b42318; }
    .summary-grid { display: grid; gap: 1rem; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .summary-card, .section-card { background: #fff; border: 1px solid #dce4f0; border-radius: 14px; }
    .summary-card { display: grid; gap: .25rem; padding: 1.15rem; }
    .summary-card strong { color: #101828; font-size: 1.45rem; }
    .summary-card span:not(.summary-label), .summary-card small { color: #667085; font-size: .78rem; }
    .summary-label { color: #475467; font-size: .72rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    .content-grid { align-items: start; display: grid; gap: 1rem; grid-template-columns: minmax(16rem, .7fr) minmax(24rem, 1.3fr); }
    .section-card { overflow: hidden; }
    .section-card > header { border-bottom: 1px solid #eaecf0; padding: 1rem 1.15rem; }
    .section-card h2 { font-size: 1rem; margin: 0; }
    .section-card header p { color: #667085; font-size: .75rem; margin: .2rem 0 0; }
    .limit-list { margin: 0; padding: .35rem 1.15rem; }
    .limit-list div { align-items: center; border-bottom: 1px solid #f2f4f7; display: flex; justify-content: space-between; padding: .8rem 0; }
    .limit-list div:last-child { border-bottom: 0; }
    .limit-list dt { color: #475467; font-size: .8rem; }
    .limit-list dd { font-size: .85rem; font-weight: 700; margin: 0; }
    .module-list { display: grid; gap: .9rem; padding: 1rem; }
    .module-block { border: 1px solid #eaecf0; border-radius: 10px; padding: .9rem; }
    .module-heading { align-items: flex-start; display: flex; justify-content: space-between; }
    .module-heading h3 { font-size: .9rem; margin: 0 0 .25rem; }
    .module-heading > span { color: #667085; font-size: .72rem; }
    .module-block > p { color: #667085; font-size: .75rem; margin: .65rem 0; }
    .module-block ul { display: grid; gap: .55rem; list-style: none; margin: .75rem 0 0; padding: 0; }
    .module-block li { align-items: flex-start; display: flex; gap: .55rem; }
    .module-block li div { display: grid; gap: .12rem; }
    .module-block li strong { font-size: .8rem; }
    .module-block li small { color: #667085; font-size: .7rem; }
    .check { background: #dcfae6; border-radius: 99px; color: #067647; display: grid; flex: 0 0 1.25rem; font-size: .72rem; height: 1.25rem; place-items: center; }
    .empty-state { color: #667085; font-size: .82rem; padding: 2rem 1rem; text-align: center; }
    .action-error { background: #fef3f2; border: 1px solid #fecdca; border-radius: 8px; color: #b42318; font-size: .8rem; padding: .75rem; }
    .toast { border-radius: 8px; font-size: .8rem; padding: .75rem 1rem; }
    .toast.success { background: #ecfdf3; border: 1px solid #abefc6; color: #067647; }
    .state-card { align-items: center; background: #fff; border: 1px solid #dce4f0; border-radius: 14px; display: flex; flex-direction: column; margin: 3rem auto; max-width: 36rem; padding: 2.5rem; text-align: center; }
    .state-card h1 { font-size: 1.25rem; margin: .8rem 0 .35rem; }
    .state-card p { color: #667085; margin: 0 0 1.2rem; }
    .state-icon { background: #eef4ff; border-radius: 99px; color: #155eef; display: grid; font-size: 1.1rem; font-weight: 800; height: 3rem; place-items: center; width: 3rem; }
    .state-icon.error { background: #fef3f2; color: #d92d20; }
    .state-icon.lock { background: #fff6ed; color: #b54708; }
    .detail-skeleton { display: grid; gap: 1rem; }
    .skeleton { animation: pulse 1.2s infinite; background: #e9eef5; border-radius: 14px; min-height: 8rem; }
    .skeleton.hero { min-height: 12rem; }
    @keyframes pulse { 50% { opacity: .55; } }
    @media (max-width: 900px) { .plan-header { flex-direction: column; } .header-actions { justify-content: flex-start; } .content-grid { grid-template-columns: 1fr; } }
    @media (max-width: 620px) { .summary-grid { grid-template-columns: 1fr; } }
  `
})
export class PlatformSubscriptionPlanDetailPage {
  private readonly api = inject(PlatformSubscriptionPlanApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly accessControl = inject(AccessControlService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<DetailState>('loading');
  readonly plan = signal<SubscriptionPlanDetail | null>(null);
  readonly errorMessage = signal('Something went wrong. Please try again.');
  readonly actionError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isActionPending = signal(false);

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => this.load(params.get('planId'))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({ next: (plan) => this.showPlan(plan), error: (error) => this.showLoadError(error) });
  }

  reload(): void {
    const planId = this.route.snapshot.paramMap.get('planId');
    this.load(planId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (plan) => this.showPlan(plan),
      error: (error) => this.showLoadError(error)
    });
  }

  canEdit(plan: SubscriptionPlanDetail): boolean {
    return plan.canEdit && this.accessControl.hasPermission(platformPermissions.subscriptionPlansEdit);
  }

  canPublish(plan: SubscriptionPlanDetail): boolean {
    return plan.status === 'draft' && this.canEdit(plan);
  }

  canDuplicate(plan: SubscriptionPlanDetail): boolean {
    return plan.canDuplicate && this.accessControl.hasPermission(platformPermissions.subscriptionPlansDuplicate);
  }

  canArchive(plan: SubscriptionPlanDetail): boolean {
    return plan.status === 'active' && plan.canArchive && this.accessControl.hasPermission(platformPermissions.subscriptionPlansArchive);
  }

  canReactivate(plan: SubscriptionPlanDetail): boolean {
    return plan.status === 'retired' && plan.canReactivate && this.accessControl.hasPermission(platformPermissions.subscriptionPlansArchive);
  }

  canDelete(plan: SubscriptionPlanDetail): boolean {
    return plan.status === 'draft' && plan.canDelete && this.accessControl.hasPermission(platformPermissions.subscriptionPlansDelete);
  }

  edit(plan: SubscriptionPlanDetail): void {
    if (this.canEdit(plan)) {
      this.router.navigate(['/admin/subscriptions/create'], { state: { planId: plan.id, mode: 'edit' } });
    }
  }

  publish(plan: SubscriptionPlanDetail): void {
    if (!this.canPublish(plan) || !confirm(`Publish "${plan.planName}"?`)) return;
    this.runMutation(this.api.publishSubscriptionPlan(plan.id), 'Subscription plan published successfully.');
  }

  duplicate(plan: SubscriptionPlanDetail): void {
    if (!this.canDuplicate(plan) || !confirm(`Duplicate "${plan.planName}" as a new draft?`)) return;
    this.beginAction();
    this.api.duplicateSubscriptionPlan(plan.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (duplicated) => {
        this.isActionPending.set(false);
        this.router.navigate(['/admin/subscriptions', duplicated.id]);
      },
      error: (error) => this.showActionError(error)
    });
  }

  archive(plan: SubscriptionPlanDetail): void {
    if (!this.canArchive(plan) || !confirm('Archive this active plan? It will no longer be available for new assignments.')) return;
    this.runMutation(this.api.archiveSubscriptionPlan(plan.id), 'Subscription plan archived successfully.');
  }

  reactivate(plan: SubscriptionPlanDetail): void {
    if (!this.canReactivate(plan) || !confirm('Reactivate this archived plan?')) return;
    this.runMutation(this.api.reactivateSubscriptionPlan(plan.id), 'Subscription plan reactivated successfully.');
  }

  deleteDraft(plan: SubscriptionPlanDetail): void {
    if (!this.canDelete(plan) || !confirm(`Delete draft plan "${plan.planName}"? This cannot be undone.`)) return;
    this.beginAction();
    this.api.deleteDraftSubscriptionPlan(plan.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.router.navigate(['/admin/subscriptions']),
      error: (error) => this.showActionError(error)
    });
  }

  statusLabel(status: string): string { return subscriptionPlanStatusLabel(status); }
  statusClass(status: string): string { return `status ${subscriptionPlanStatusBadgeClass(status)}`; }
  titleCase(value: string): string { return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '—'; }

  formatPrice(value: number, currency: string): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(value);
  }

  formatLimit(value: number | null, isUnlimited: boolean, unitCode: string | null): string {
    if (isUnlimited) return 'Unlimited';
    if (value == null) return 'Not set';
    return `${new Intl.NumberFormat().format(value)}${unitCode ? ` ${unitCode}` : ''}`;
  }

  private load(planId: string | null): Observable<SubscriptionPlanDetail> {
    this.state.set('loading');
    this.plan.set(null);
    this.actionError.set(null);
    this.successMessage.set(null);
    if (!planId || !isUuid(planId)) {
      this.state.set('not-found');
      return new Observable<SubscriptionPlanDetail>(() => undefined);
    }
    return this.api.getSubscriptionPlanDetail(planId);
  }

  private showPlan(plan: SubscriptionPlanDetail): void {
    this.plan.set(plan);
    this.state.set('ready');
  }

  private showLoadError(error: unknown): void {
    this.plan.set(null);
    if (error instanceof HttpErrorResponse && error.status === 404) this.state.set('not-found');
    else if (error instanceof HttpErrorResponse && error.status === 403) this.state.set('forbidden');
    else {
      this.errorMessage.set(this.apiError.toSafeMessage(error));
      this.state.set('error');
    }
  }

  private runMutation(request: Observable<unknown>, message: string): void {
    this.beginAction();
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isActionPending.set(false);
        this.successMessage.set(message);
        this.reload();
      },
      error: (error) => this.showActionError(error)
    });
  }

  private beginAction(): void {
    this.isActionPending.set(true);
    this.actionError.set(null);
    this.successMessage.set(null);
  }

  private showActionError(error: unknown): void {
    this.isActionPending.set(false);
    this.actionError.set(this.apiError.toSafeMessage(error));
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
