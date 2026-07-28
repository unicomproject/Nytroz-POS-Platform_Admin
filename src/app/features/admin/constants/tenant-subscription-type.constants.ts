/** Commercial subscription type for wizard create (authoritative create-mode classification). */
export const TenantSubscriptionTypes = {
  Paid: 'PAID',
  Trial: 'TRIAL',
  Demo: 'DEMO'
} as const;

export type TenantSubscriptionType =
  (typeof TenantSubscriptionTypes)[keyof typeof TenantSubscriptionTypes];

export const TENANT_SUBSCRIPTION_TYPE_OPTIONS: ReadonlyArray<{
  value: TenantSubscriptionType;
  label: string;
}> = [
  { value: TenantSubscriptionTypes.Paid, label: 'Paid' },
  { value: TenantSubscriptionTypes.Trial, label: 'Trial' },
  { value: TenantSubscriptionTypes.Demo, label: 'Demo' }
];

export function isTenantSubscriptionType(value: string | null | undefined): value is TenantSubscriptionType {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toUpperCase();
  return (
    normalized === TenantSubscriptionTypes.Paid
    || normalized === TenantSubscriptionTypes.Trial
    || normalized === TenantSubscriptionTypes.Demo
  );
}

export function normalizeTenantSubscriptionType(
  value: string | null | undefined
): TenantSubscriptionType | null {
  if (!isTenantSubscriptionType(value)) {
    return null;
  }

  return value.trim().toUpperCase() as TenantSubscriptionType;
}
