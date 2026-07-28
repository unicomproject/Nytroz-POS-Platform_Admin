import { describe, expect, it } from 'vitest';

import { resolveTenantLifecycle, tenantLifecycleFilterOptions, tenantLifecycleLabel } from './tenant-lifecycle.util';

describe('resolveTenantLifecycle', () => {
  it('prefers lifecycleStatus over status and billingStatus', () => {
    const resolved = resolveTenantLifecycle({
      lifecycleStatus: 'pending_payment',
      status: 'active',
      billingStatus: 'paid'
    });

    expect(resolved.value).toBe('pending_payment');
    expect(resolved.label).toBe('Pending Payment');
    expect(resolved.usedDeprecatedFallback).toBe(false);
  });

  it('falls back to status when lifecycleStatus is missing', () => {
    const resolved = resolveTenantLifecycle({
      status: 'pending_activation',
      billingStatus: 'pending'
    });

    expect(resolved.value).toBe('pending_activation');
    expect(resolved.label).toBe('Pending Activation');
    expect(resolved.usedDeprecatedFallback).toBe(true);
  });

  it('uses deprecated billingStatus lifecycle alias only when lifecycle fields are absent', () => {
    const resolved = resolveTenantLifecycle({
      billingStatus: 'draft'
    });

    expect(resolved.value).toBe('draft');
    expect(resolved.usedDeprecatedFallback).toBe(true);
  });

  it('does not treat actual billing status as lifecycle when lifecycleStatus is present', () => {
    const resolved = resolveTenantLifecycle({
      lifecycleStatus: 'active',
      billingStatus: 'overdue'
    });

    expect(resolved.value).toBe('active');
    expect(resolved.label).toBe('Active');
  });

  it('returns Unknown for unrecognized values', () => {
    const resolved = resolveTenantLifecycle({ lifecycleStatus: 'not_a_real_status' });

    expect(resolved.value).toBeNull();
    expect(resolved.label).toBe('Unknown');
    expect(resolved.badgeClass).toBe('unknown');
  });

  it('maps temporary setup_pending alias to pending_activation without exposing it as a filter', () => {
    expect(resolveTenantLifecycle({ status: 'setup_pending' }).value).toBe('pending_activation');
    expect(tenantLifecycleFilterOptions(['setup_pending', 'inactive']).map((item) => item.value)).not.toContain(
      'setup_pending'
    );
    expect(tenantLifecycleFilterOptions(['setup_pending', 'inactive']).map((item) => item.value)).not.toContain(
      'inactive'
    );
  });

  it('labels all six approved lifecycle states', () => {
    expect(tenantLifecycleLabel('draft')).toBe('Draft');
    expect(tenantLifecycleLabel('pending_payment')).toBe('Pending Payment');
    expect(tenantLifecycleLabel('pending_activation')).toBe('Pending Activation');
    expect(tenantLifecycleLabel('active')).toBe('Active');
    expect(tenantLifecycleLabel('suspended')).toBe('Suspended');
    expect(tenantLifecycleLabel('cancelled')).toBe('Cancelled');
  });
});
