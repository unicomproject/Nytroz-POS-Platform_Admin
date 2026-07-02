import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { PlatformTenantDetail } from '../../models/platform-tenant.model';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';

@Component({
  selector: 'app-platform-tenant-detail-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <section class="tenant-detail-page">
      @if (successMessage()) {
        <div class="toast success" role="status">{{ successMessage() }}</div>
      }

      <header class="page-heading">
        <div class="title-block">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <a routerLink="/admin/tenants">Tenants</a>
            <span aria-hidden="true">/</span>
            <span class="current">Detail</span>
          </nav>
          @if (tenant(); as data) {
            <h1>{{ data.name }}</h1>
            <p>{{ data.code }} · {{ data.operatingMode }}</p>
          } @else {
            <h1>Tenant Detail</h1>
            <p>Loading tenant profile from the backend...</p>
          }
          <span class="title-accent" aria-hidden="true"></span>
        </div>

        @if (tenant(); as data) {
          <div class="page-actions">
            @if (showActivate(data)) {
              <button type="button" class="btn success" [disabled]="isActionPending()" (click)="activateTenant()">
                {{ isActionPending() ? 'Activating...' : 'Activate Tenant' }}
              </button>
            }
            @if (showSuspend(data)) {
              <button type="button" class="btn danger" [disabled]="isActionPending()" (click)="suspendTenant()">
                {{ isActionPending() ? 'Suspending...' : 'Suspend Tenant' }}
              </button>
            }
          </div>
        }
      </header>

      @if (isLoading()) {
        <div class="state-card card">Loading tenant detail from the backend...</div>
      } @else if (errorMessage()) {
        <div class="state-card card error">
          <strong>Tenant detail could not be loaded</strong>
          <span>{{ errorMessage() }}</span>
          <button type="button" class="btn primary" (click)="reload()">Try again</button>
        </div>
      } @else if (actionError()) {
        <div class="state-card card error">
          <strong>Tenant lifecycle action failed</strong>
          <span>{{ actionError() }}</span>
        </div>
      }

      @if (tenant(); as data) {
        <section class="summary-grid">
          <article class="summary-card card">
            <span class="label">Status</span>
            <span class="status-badge" [class]="statusClass(data.status)">{{ data.status }}</span>
          </article>
          <article class="summary-card card">
            <span class="label">Billing Status</span>
            <strong>{{ data.billingStatus }}</strong>
          </article>
          <article class="summary-card card">
            <span class="label">Users</span>
            <strong>{{ data.userCount }}</strong>
          </article>
          <article class="summary-card card">
            <span class="label">Outlets</span>
            <strong>{{ data.outletCount }}</strong>
          </article>
          <article class="summary-card card">
            <span class="label">Tills</span>
            <strong>{{ data.tillCount }}</strong>
          </article>
        </section>

        <div class="detail-grid">
          <article class="panel card">
            <h2>Profile</h2>
            <dl>
              <div><dt>Tenant Code</dt><dd>{{ data.code }}</dd></div>
              <div><dt>Operating Mode</dt><dd>{{ data.operatingMode }}</dd></div>
              <div><dt>Business Type</dt><dd>{{ data.businessType || '—' }}</dd></div>
              <div><dt>Base Currency</dt><dd>{{ data.baseCurrency }}</dd></div>
              <div><dt>Timezone</dt><dd>{{ data.defaultTimezone }}</dd></div>
              <div><dt>Locale</dt><dd>{{ data.defaultLocale }}</dd></div>
              <div><dt>Created On</dt><dd>{{ data.createdOn | date: 'medium' }}</dd></div>
              <div><dt>Last Activity</dt><dd>{{ data.lastActivityAt ? (data.lastActivityAt | date: 'medium') : '—' }}</dd></div>
            </dl>
          </article>

          <article class="panel card">
            <h2>Subscription</h2>
            @if (data.subscription) {
              <dl>
                <div><dt>Plan</dt><dd>{{ data.subscription.planName }}</dd></div>
                <div><dt>Plan Code</dt><dd>{{ data.subscription.planCode }}</dd></div>
                <div><dt>Subscription Status</dt><dd>{{ data.subscription.subscriptionStatus }}</dd></div>
              </dl>
            } @else {
              <p class="muted">No subscription plan is assigned to this tenant.</p>
            }
          </article>

          <article class="panel card">
            <h2>Entitlements</h2>
            <p class="section-note">Read-only entitlement flags from the backend.</p>
            <ul class="flag-list">
              <li [class.enabled]="data.onlineStoreEnabled">
                <span>Online Store</span>
                <strong>{{ data.onlineStoreEnabled ? 'Enabled' : 'Disabled' }}</strong>
              </li>
              <li [class.enabled]="data.clickCollectEnabled">
                <span>Click &amp; Collect</span>
                <strong>{{ data.clickCollectEnabled ? 'Enabled' : 'Disabled' }}</strong>
              </li>
              <li [class.enabled]="data.offlineEnabled">
                <span>Offline Mode</span>
                <strong>{{ data.offlineEnabled ? 'Enabled' : 'Disabled' }}</strong>
              </li>
            </ul>
            @if (data.canManageEntitlements && canManageEntitlements()) {
              <p class="muted">Entitlement editing will be added in a later TM-EPOS MVP slice.</p>
            }
          </article>
        </div>
      }
    </section>
  `,
  styles: `
    :host { color: #14213d; display: block; }
    * { box-sizing: border-box; }

    .tenant-detail-page { display: grid; gap: 1.15rem; }

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

    .breadcrumb a { color: #0b5cff; text-decoration: none; }
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

    .page-actions { display: flex; flex-wrap: wrap; gap: 0.7rem; }

    .btn {
      align-items: center;
      border-radius: 10px;
      cursor: pointer;
      display: inline-flex;
      font-size: 0.84rem;
      font-weight: 700;
      min-height: 2.65rem;
      padding: 0 1rem;
    }

    .btn.primary { background: #0b5cff; border: 0; color: #fff; }
    .btn.success { background: #16a34a; border: 0; color: #fff; }
    .btn.danger { background: #ef4444; border: 0; color: #fff; }
    .btn:disabled { cursor: not-allowed; opacity: 0.55; }

    .card {
      background: #fff;
      border: 1px solid #e5eaf2;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.06);
    }

    .summary-grid {
      display: grid;
      gap: 0.85rem;
      grid-template-columns: repeat(5, minmax(0, 1fr));
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

    .detail-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .panel { padding: 1.1rem; }

    .panel h2 {
      color: #101a38;
      font-size: 1rem;
      margin: 0 0 0.85rem;
    }

    dl {
      display: grid;
      gap: 0.75rem;
      margin: 0;
    }

    dl div {
      display: grid;
      gap: 0.2rem;
    }

    dt {
      color: #667085;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    dd { color: #344054; font-size: 0.88rem; margin: 0; }

    .section-note, .muted {
      color: #667085;
      font-size: 0.82rem;
      margin: 0 0 0.85rem;
    }

    .flag-list {
      display: grid;
      gap: 0.65rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .flag-list li {
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e5eaf2;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0.85rem;
    }

    .flag-list li.enabled {
      background: #ecfdf5;
      border-color: #bbf7d0;
    }

    .flag-list span { color: #344054; font-size: 0.84rem; }
    .flag-list strong { color: #101a38; font-size: 0.82rem; }

    .status-badge {
      border-radius: 999px;
      display: inline-block;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.35rem 0.75rem;
      width: fit-content;
    }

    .status-badge.active { background: #dcfce7; color: #15803d; }
    .status-badge.suspended { background: #ffedd5; color: #c2410c; }
    .status-badge.trial { background: #dbeafe; color: #1d4ed8; }
    .status-badge.inactive, .status-badge.draft { background: #e2e8f0; color: #475569; }

    .state-card {
      display: grid;
      gap: 0.75rem;
      padding: 2rem;
      text-align: center;
    }

    .state-card.error { color: #b42318; }

    .toast {
      background: #ecfdf5;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      color: #15803d;
      font-size: 0.84rem;
      font-weight: 700;
      padding: 0.75rem 1rem;
    }

    @media (max-width: 1100px) {
      .summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .detail-grid { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 760px) {
      .page-heading { flex-direction: column; }
      .summary-grid, .detail-grid { grid-template-columns: 1fr; }
    }
  `
})
export class PlatformTenantDetailPage {
  private readonly api = inject(PlatformTenantApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly accessControl = inject(AccessControlService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly tenant = signal<PlatformTenantDetail | null>(null);
  readonly isLoading = signal(true);
  readonly isActionPending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
          this.actionError.set(null);
          this.successMessage.set(null);
          return this.api.getTenantById(params.get('tenantId') ?? '');
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (tenant) => {
          this.tenant.set(tenant);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.tenant.set(null);
          this.errorMessage.set(this.apiError.toSafeMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  reload(): void {
    const tenantId = this.route.snapshot.paramMap.get('tenantId');
    if (!tenantId) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.api.getTenantById(tenantId).subscribe({
      next: (tenant) => {
        this.tenant.set(tenant);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.apiError.toSafeMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  activateTenant(): void {
    this.runLifecycleAction('activate');
  }

  suspendTenant(): void {
    this.runLifecycleAction('suspend');
  }

  showActivate(tenant: PlatformTenantDetail): boolean {
    return tenant.canActivate && this.canActivate();
  }

  showSuspend(tenant: PlatformTenantDetail): boolean {
    return tenant.canSuspend && this.canSuspend();
  }

  canActivate(): boolean {
    return this.accessControl.hasPermission(platformPermissions.tenantsActivate);
  }

  canSuspend(): boolean {
    return this.accessControl.hasPermission(platformPermissions.tenantsSuspend);
  }

  canManageEntitlements(): boolean {
    return this.accessControl.hasPermission(platformPermissions.tenantsEntitlementsUpdate);
  }

  statusClass(status: string): string {
    return status.toLowerCase();
  }

  private runLifecycleAction(action: 'activate' | 'suspend'): void {
    const tenantId = this.route.snapshot.paramMap.get('tenantId');
    const current = this.tenant();
    if (!tenantId || !current) {
      return;
    }

    if (action === 'activate' && !this.showActivate(current)) {
      return;
    }

    if (action === 'suspend' && !this.showSuspend(current)) {
      return;
    }

    this.isActionPending.set(true);
    this.actionError.set(null);
    this.successMessage.set(null);

    const request$ = action === 'activate' ? this.api.activateTenant(tenantId) : this.api.suspendTenant(tenantId);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (tenant) => {
        this.tenant.set(tenant);
        this.isActionPending.set(false);
        this.successMessage.set(action === 'activate' ? 'Tenant activated successfully.' : 'Tenant suspended successfully.');
      },
      error: (error) => {
        this.isActionPending.set(false);
        this.actionError.set(this.apiError.toSafeMessage(error));
      }
    });
  }
}
