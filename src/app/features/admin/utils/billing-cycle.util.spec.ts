import { describe, expect, it } from 'vitest';

import { normalizeBillingCycleForApi } from './billing-cycle.util';

describe('normalizeBillingCycleForApi', () => {
  it('maps monthly and yearly', () => {
    expect(normalizeBillingCycleForApi('monthly')).toBe('monthly');
    expect(normalizeBillingCycleForApi('yearly')).toBe('yearly');
  });

  it('maps annual to yearly', () => {
    expect(normalizeBillingCycleForApi('annual')).toBe('yearly');
  });

  it('omits both/all/blank and classification tokens', () => {
    expect(normalizeBillingCycleForApi('both')).toBeNull();
    expect(normalizeBillingCycleForApi('all')).toBeNull();
    expect(normalizeBillingCycleForApi('')).toBeNull();
    expect(normalizeBillingCycleForApi('demo')).toBeNull();
    expect(normalizeBillingCycleForApi('trial')).toBeNull();
    expect(normalizeBillingCycleForApi('paid')).toBeNull();
  });
});
