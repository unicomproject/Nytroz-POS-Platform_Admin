import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { TenantOnboardingDraftSummary } from '../../models/platform-tenant-onboarding.model';
import { PlatformTenantApiService } from '../../services/platform-tenant-api.service';

const SETUP_STEP_LABELS = [
  'Tenant Basic Details',
  'Business & Contact Information',
  'Subscription Plan',
  'Billing / Payment Setup',
  'Feature Entitlements',
  'Tenant Admin User',
  'Review, Create & Activation'
] as const;

@Component({
  selector: 'app-platform-tenant-onboarding-drafts-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    PageHeader,
    Button,
    StatusBadge,
    LoadingSkeleton,
    EmptyState,
    ErrorState,
    ConfirmationDialog
  ],
  templateUrl: './platform-tenant-onboarding-drafts-page.html',
  styleUrl: './platform-tenant-onboarding-drafts-page.scss'
})
export class PlatformTenantOnboardingDraftsPage implements OnInit {
  private readonly api = inject(PlatformTenantApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly accessControl = inject(AccessControlService);

  private listSub: Subscription | null = null;

  readonly canCreateTenant = this.accessControl.hasPermission(platformPermissions.tenantsCreate);
  readonly canViewAllDrafts = this.accessControl.hasPermission(platformPermissions.tenantsUpdate);

  readonly mineOnly = signal(true);
  readonly drafts = signal<TenantOnboardingDraftSummary[]>([]);
  readonly loading = signal(true);
  readonly listError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  readonly discardTarget = signal<TenantOnboardingDraftSummary | null>(null);
  readonly discardOpen = signal(false);
  readonly discardLoading = signal(false);

  readonly draftCountLabel = computed(() => {
    const count = this.drafts().length;
    return `${count} draft${count === 1 ? '' : 's'}`;
  });

  readonly emptyTitle = computed(() =>
    this.mineOnly() ? 'No drafts of yours yet' : 'No active onboarding drafts'
  );

  readonly emptyMessage = computed(() =>
    this.mineOnly()
      ? 'Saved tenant setups you own will appear here so you can resume or discard them.'
      : 'Saved tenant setups will appear here so operators can resume or discard unfinished onboarding.'
  );

  readonly discardDialogMessage = computed(() => {
    const draft = this.discardTarget();
    if (!draft) {
      return 'This saved onboarding draft will no longer appear in the active draft list.';
    }
    const identity = this.displayName(draft);
    return `${identity}\n\nThis saved onboarding draft will no longer appear in the active draft list.`;
  });

  ngOnInit(): void {
    this.reload();
  }

  setMineScope(mineOnly: boolean): void {
    if (this.mineOnly() === mineOnly) {
      return;
    }
    if (!mineOnly && !this.canViewAllDrafts) {
      return;
    }
    this.mineOnly.set(mineOnly);
    this.reload();
  }

  reload(): void {
    this.listSub?.unsubscribe();
    this.loading.set(true);
    this.listError.set(null);
    this.actionError.set(null);

    this.listSub = this.api.listOnboardingDrafts(this.mineOnly()).subscribe({
      next: (drafts) => {
        this.drafts.set(drafts);
        this.loading.set(false);
      },
      error: (error) => {
        this.listError.set(this.apiError.toSafeMessage(error));
        this.drafts.set([]);
        this.loading.set(false);
      }
    });
  }

  displayName(draft: TenantOnboardingDraftSummary): string {
    return draft.displayName?.trim() || 'Untitled tenant';
  }

  displayCode(draft: TenantOnboardingDraftSummary): string {
    return draft.tenantCode?.trim() || 'No code yet';
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'in_progress':
        return 'In progress';
      case 'finalizing':
        return 'Finalizing';
      case 'completed':
        return 'Completed';
      case 'discarded':
        return 'Discarded';
      case 'expired':
        return 'Expired';
      default:
        return status.replace(/_/g, ' ');
    }
  }

  statusVariant(status: string): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
    switch (status) {
      case 'in_progress':
        return 'info';
      case 'finalizing':
        return 'warning';
      case 'completed':
        return 'success';
      case 'discarded':
      case 'expired':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  stepLabel(currentStep: number): string {
    const index = Math.max(1, Math.min(7, currentStep)) - 1;
    return SETUP_STEP_LABELS[index];
  }

  stepText(currentStep: number): string {
    const step = Math.max(1, Math.min(7, currentStep || 1));
    return `Step ${step} of 7`;
  }

  canResume(draft: TenantOnboardingDraftSummary): boolean {
    return draft.status === 'in_progress';
  }

  canDiscard(draft: TenantOnboardingDraftSummary): boolean {
    return draft.status === 'in_progress';
  }

  /** UI-3A create route — page-level primary CTA. */
  readonly createTenantRoute = '/admin/tenants/create';

  /** UI-3A draft resume route — navigation only, no mutation. */
  resumeRoute(draft: TenantOnboardingDraftSummary): (string | number)[] {
    return ['/admin/tenants/onboarding', draft.id];
  }

  relativeUpdated(value: string | null): string {
    if (!value) {
      return 'Not updated';
    }
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) {
      return 'Not updated';
    }
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  openDiscard(draft: TenantOnboardingDraftSummary): void {
    if (!this.canDiscard(draft) || this.discardLoading()) {
      return;
    }
    this.actionError.set(null);
    this.discardTarget.set(draft);
    this.discardOpen.set(true);
  }

  cancelDiscard(): void {
    if (this.discardLoading()) {
      return;
    }
    this.discardOpen.set(false);
    this.discardTarget.set(null);
  }

  confirmDiscard(): void {
    const draft = this.discardTarget();
    if (!draft || this.discardLoading()) {
      return;
    }

    this.discardLoading.set(true);
    this.actionError.set(null);

    this.api.discardOnboardingDraft(draft.id, draft.version).subscribe({
      next: () => {
        this.discardLoading.set(false);
        this.discardOpen.set(false);
        this.discardTarget.set(null);
        this.reload();
      },
      error: (error) => {
        this.discardLoading.set(false);
        this.discardOpen.set(false);
        this.discardTarget.set(null);
        this.actionError.set(this.concurrencyMessage(error) ?? this.apiError.toSafeMessage(error));
      }
    });
  }

  private concurrencyMessage(error: unknown): string | null {
    const code = (error as { error?: { errorCode?: string } })?.error?.errorCode ?? '';
    const message = (error as { error?: { message?: string } })?.error?.message ?? '';
    if (
      code.includes('concurrency_conflict') ||
      /changed since|concurrency|latest version/i.test(message)
    ) {
      return 'This draft changed since the list was loaded. Refresh the list and try again.';
    }
    return null;
  }
}
