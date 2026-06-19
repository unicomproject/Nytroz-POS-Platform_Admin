import { SubscriptionPlanStatus } from './platform-subscription-plan.model';

export type SubscriptionPlanStatusTab = 'all' | 'draft' | 'published' | 'archived';

const STATUS_LABELS: Record<SubscriptionPlanStatus, string> = {
  draft: 'Draft',
  active: 'Published',
  retired: 'Archived'
};

export function normalizeSubscriptionPlanStatus(status: string | null | undefined): SubscriptionPlanStatus | null {
  const normalized = status?.trim().toLowerCase();

  switch (normalized) {
    case 'draft':
      return 'draft';
    case 'active':
    case 'published':
      return 'active';
    case 'retired':
    case 'archived':
      return 'retired';
    default:
      return null;
  }
}

export function subscriptionPlanStatusLabel(status: string | null | undefined): string {
  const normalized = normalizeSubscriptionPlanStatus(status);
  return normalized ? STATUS_LABELS[normalized] : '—';
}

export function subscriptionPlanStatusBadgeClass(status: string | null | undefined): string {
  const normalized = normalizeSubscriptionPlanStatus(status);

  switch (normalized) {
    case 'draft':
      return 'draft';
    case 'active':
      return 'published';
    case 'retired':
      return 'archived';
    default:
      return 'archived';
  }
}

/** Maps UI tab keys to backend list query status filters (DB values preferred). */
export function subscriptionPlanTabToApiStatusFilter(tab: SubscriptionPlanStatusTab): string | undefined {
  switch (tab) {
    case 'draft':
      return 'draft';
    case 'published':
      return 'active';
    case 'archived':
      return 'retired';
    default:
      return undefined;
  }
}

/** Maps backend status filter values to UI tab keys. */
export function subscriptionPlanApiStatusFilterToTab(status: string): SubscriptionPlanStatusTab {
  const normalized = status.trim().toLowerCase();

  switch (normalized) {
    case 'draft':
      return 'draft';
    case 'active':
    case 'published':
      return 'published';
    case 'retired':
    case 'archived':
      return 'archived';
    default:
      return 'all';
  }
}

export function subscriptionPlanStatusFilterToApiValue(status: string): string {
  const normalized = status.trim().toLowerCase();

  switch (normalized) {
    case 'published':
      return 'active';
    case 'archived':
      return 'retired';
    default:
      return normalized;
  }
}
