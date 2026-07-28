import {
  isApprovedTenantLifecycleStatus,
  TENANT_LIFECYCLE_FILTER_OPTIONS,
  TENANT_LIFECYCLE_STATUS_LABELS,
  TenantLifecycleStatus,
  TenantLifecycleStatuses
} from '../constants/tenant-lifecycle-status.constants';

export interface TenantLifecycleSource {
  lifecycleStatus?: string | null;
  /** @deprecated Temporary compatibility — prefer lifecycleStatus. */
  status?: string | null;
  /**
   * @deprecated Temporary lifecycle alias only.
   * Must not be used when lifecycleStatus is present.
   * Actual billing concern values must never be shown as tenant lifecycle.
   */
  billingStatus?: string | null;
}

export interface ResolvedTenantLifecycle {
  /** Normalized approved value, or null when unknown. */
  value: TenantLifecycleStatus | null;
  /** User-facing label (Unknown for unrecognized values). */
  label: string;
  /** CSS modifier class for badges. */
  badgeClass: string;
  /** Raw unresolved token for diagnostics / a11y. */
  raw: string | null;
  /** True when value came from a deprecated fallback field. */
  usedDeprecatedFallback: boolean;
}

/**
 * Authoritative UI lifecycle resolver.
 * Preference: lifecycleStatus → status → deprecated billingStatus lifecycle alias.
 */
export function resolveTenantLifecycle(source: TenantLifecycleSource): ResolvedTenantLifecycle {
  const fromLifecycle = normalizeLifecycleToken(source.lifecycleStatus);
  if (fromLifecycle) {
    return presentLifecycle(fromLifecycle, source.lifecycleStatus ?? fromLifecycle, false);
  }

  const fromStatus = normalizeLifecycleToken(source.status);
  if (fromStatus) {
    return presentLifecycle(fromStatus, source.status ?? fromStatus, true);
  }

  // Temporary/deprecated: only accept billingStatus when it looks like a lifecycle value.
  const fromBillingAlias = normalizeLifecycleToken(source.billingStatus);
  if (fromBillingAlias) {
    return presentLifecycle(fromBillingAlias, source.billingStatus ?? fromBillingAlias, true);
  }

  const raw = firstNonEmpty(source.lifecycleStatus, source.status, source.billingStatus);
  if (!raw) {
    return {
      value: null,
      label: 'Unknown',
      badgeClass: 'unknown',
      raw: null,
      usedDeprecatedFallback: false
    };
  }

  return {
    value: null,
    label: 'Unknown',
    badgeClass: 'unknown',
    raw,
    usedDeprecatedFallback: false
  };
}

export function tenantLifecycleLabel(source: TenantLifecycleSource | string | null | undefined): string {
  if (typeof source === 'string' || source == null) {
    return resolveTenantLifecycle({ lifecycleStatus: source }).label;
  }

  return resolveTenantLifecycle(source).label;
}

export function tenantLifecycleBadgeClass(source: TenantLifecycleSource | string | null | undefined): string {
  if (typeof source === 'string' || source == null) {
    return resolveTenantLifecycle({ lifecycleStatus: source }).badgeClass;
  }

  return resolveTenantLifecycle(source).badgeClass;
}

/** Status filter options: only approved lifecycle values (never setup_pending / inactive). */
export function tenantLifecycleFilterOptions(
  apiStatuses?: readonly string[] | null
): ReadonlyArray<{ value: string; label: string }> {
  const approvedFromApi = (apiStatuses ?? [])
    .map((status) => normalizeLifecycleToken(status))
    .filter((status): status is TenantLifecycleStatus => status != null);

  const values = new Set<TenantLifecycleStatus>([
    ...TENANT_LIFECYCLE_FILTER_OPTIONS.map((item) => item.value),
    ...approvedFromApi
  ]);

  return TENANT_LIFECYCLE_FILTER_OPTIONS.filter((item) => values.has(item.value));
}

function presentLifecycle(
  value: TenantLifecycleStatus,
  raw: string,
  usedDeprecatedFallback: boolean
): ResolvedTenantLifecycle {
  return {
    value,
    label: TENANT_LIFECYCLE_STATUS_LABELS[value],
    badgeClass: value,
    raw,
    usedDeprecatedFallback
  };
}

/**
 * Maps known tokens (including temporary legacy aliases) to approved lifecycle values.
 * Legacy aliases are recognized only here — never offered as filter options.
 */
function normalizeLifecycleToken(value: string | null | undefined): TenantLifecycleStatus | null {
  if (!value?.trim()) {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (isApprovedTenantLifecycleStatus(normalized)) {
    return normalized;
  }

  // Temporary compatibility aliases — not selectable filters.
  switch (normalized) {
    case 'setup_pending':
      return TenantLifecycleStatuses.PendingActivation;
    case 'inactive':
      return TenantLifecycleStatuses.Suspended;
    default:
      return null;
  }
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}
