/** Approved tenant lifecycle values (API may serialize lowercase). */
export const TenantLifecycleStatuses = {
  Draft: 'draft',
  PendingPayment: 'pending_payment',
  PendingActivation: 'pending_activation',
  Active: 'active',
  Suspended: 'suspended',
  Cancelled: 'cancelled'
} as const;

export type TenantLifecycleStatus =
  (typeof TenantLifecycleStatuses)[keyof typeof TenantLifecycleStatuses];

export const TENANT_LIFECYCLE_STATUS_LABELS: Record<TenantLifecycleStatus, string> = {
  draft: 'Draft',
  pending_payment: 'Pending Payment',
  pending_activation: 'Pending Activation',
  active: 'Active',
  suspended: 'Suspended',
  cancelled: 'Cancelled'
};

/** Canonical filter values shown in tenant list Status dropdown. */
export const TENANT_LIFECYCLE_FILTER_OPTIONS: ReadonlyArray<{
  value: TenantLifecycleStatus;
  label: string;
}> = [
  { value: TenantLifecycleStatuses.Draft, label: TENANT_LIFECYCLE_STATUS_LABELS.draft },
  { value: TenantLifecycleStatuses.PendingPayment, label: TENANT_LIFECYCLE_STATUS_LABELS.pending_payment },
  { value: TenantLifecycleStatuses.PendingActivation, label: TENANT_LIFECYCLE_STATUS_LABELS.pending_activation },
  { value: TenantLifecycleStatuses.Active, label: TENANT_LIFECYCLE_STATUS_LABELS.active },
  { value: TenantLifecycleStatuses.Suspended, label: TENANT_LIFECYCLE_STATUS_LABELS.suspended },
  { value: TenantLifecycleStatuses.Cancelled, label: TENANT_LIFECYCLE_STATUS_LABELS.cancelled }
];

export function isApprovedTenantLifecycleStatus(
  value: string | null | undefined
): value is TenantLifecycleStatus {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return (Object.values(TenantLifecycleStatuses) as string[]).includes(normalized);
}
