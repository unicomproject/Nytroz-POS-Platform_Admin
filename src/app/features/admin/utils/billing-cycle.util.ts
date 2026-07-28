/** Backend-supported tenant/plan billing-cycle API values. */
export const BillingCycleApiValues = {
  Monthly: 'monthly',
  Yearly: 'yearly'
} as const;

export type BillingCycleApiValue =
  (typeof BillingCycleApiValues)[keyof typeof BillingCycleApiValues];

/**
 * Normalize UI/API billing-cycle tokens for create/filter requests.
 * - monthly → monthly
 * - yearly | annual → yearly
 * - both / all / blank → null (omit parameter)
 * - demo / trial / paid → null (never valid billing cycles)
 */
export function normalizeBillingCycleForApi(
  value: string | null | undefined
): BillingCycleApiValue | null {
  if (!value?.trim()) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'monthly') {
    return BillingCycleApiValues.Monthly;
  }

  if (normalized === 'yearly' || normalized === 'annual') {
    return BillingCycleApiValues.Yearly;
  }

  // Both/All and classification tokens are never sent as billingCycle.
  return null;
}

export function isSupportedBillingCycleOption(value: string | null | undefined): boolean {
  return normalizeBillingCycleForApi(value) != null;
}
