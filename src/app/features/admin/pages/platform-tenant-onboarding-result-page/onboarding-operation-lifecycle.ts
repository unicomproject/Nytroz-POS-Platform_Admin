import { TenantOnboardingOperation } from '../../models/platform-tenant-onboarding.model';

export type LifecycleVisual = 'completed' | 'active' | 'waiting' | 'failed';

export interface LifecycleNodeView {
  key: 'provisioning' | 'payment' | 'activation' | 'invitation';
  label: string;
  stateText: string;
  visual: LifecycleVisual;
  pulse: boolean;
}

export type OperationPageView =
  | 'running'
  | 'long-running'
  | 'payment-pending'
  | 'activation-pending'
  | 'invitation-pending'
  | 'success'
  | 'failure-retryable'
  | 'failure-final'
  | 'attention';

export interface StatusPresentation {
  pageView: OperationPageView;
  headline: string;
  subcopy: string;
  badgeText: string;
  badgeVariant: 'success' | 'info' | 'warning' | 'danger' | 'neutral';
  surfaceTone: 'blue' | 'success' | 'failure' | 'neutral';
  showSpinner: boolean;
}

export interface LifecycleContext {
  tenantStatus: string;
  isActiveTenant: boolean;
  isLongRunning: boolean;
}

export function normalizePaymentStatus(value: string | null | undefined): string {
  const normalized = (value ?? '').trim().toUpperCase();
  return normalized === 'PENDING' ? 'AWAITING_PAYMENT' : normalized;
}

export function normalizeTenantLifecycleStatus(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/-/g, '_');
}

export function isActiveTenantStatus(
  tenantStatus: string,
  operation: TenantOnboardingOperation | null
): boolean {
  if (normalizeTenantLifecycleStatus(tenantStatus) === 'active') {
    return true;
  }

  if (!operation) {
    return false;
  }

  const invite = operation.invitationStatus.trim().toUpperCase();
  const paid = normalizePaymentStatus(operation.paymentStatus) === 'PAID';
  return paid && ['SENT', 'ACCEPTED'].includes(invite);
}

export function provisioningComplete(op: TenantOnboardingOperation): boolean {
  const status = op.provisioningStatus.trim().toUpperCase();
  return op.status === 'SUCCEEDED' || status === 'SUCCEEDED' || status === 'COMPLETED' || !!op.tenantId;
}

export function paymentComplete(paymentStatus: string): boolean {
  const normalized = normalizePaymentStatus(paymentStatus);
  return ['PAID', 'NOT_REQUIRED'].includes(normalized);
}

export function invitationComplete(invitationStatus: string): boolean {
  return ['SENT', 'ACCEPTED'].includes(invitationStatus.trim().toUpperCase());
}

export function invitationFailed(invitationStatus: string): boolean {
  return invitationStatus.trim().toUpperCase() === 'FAILED';
}

export function formatLifecycleLabel(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) {
    return 'Not available';
  }

  return raw
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function invitationStateText(invitationStatus: string): string {
  const status = invitationStatus.trim().toUpperCase();
  if (status === 'NOT_ELIGIBLE') return 'Not eligible';
  if (status === 'PENDING') return 'Queued';
  if (status === 'SENT') return 'Sent';
  if (status === 'ACCEPTED') return 'Accepted';
  if (status === 'FAILED') return 'Failed';
  if (status === 'EXPIRED') return 'Expired';
  return formatLifecycleLabel(invitationStatus);
}

export function paymentStateText(paymentStatus: string): string {
  const normalized = normalizePaymentStatus(paymentStatus);
  if (normalized === 'AWAITING_PAYMENT') return 'Awaiting payment';
  if (normalized === 'PAID') return 'Paid';
  if (normalized === 'NOT_REQUIRED') return 'Not required';
  if (normalized === 'REJECTED') return 'Rejected';
  if (normalized === 'EXPIRED') return 'Expired';
  return formatLifecycleLabel(paymentStatus);
}

export function resolveOperationPageView(
  op: TenantOnboardingOperation,
  ctx: LifecycleContext
): OperationPageView {
  const operationStatus = op.status.trim().toUpperCase();

  if (operationStatus === 'PROCESSING') {
    return ctx.isLongRunning ? 'long-running' : 'running';
  }

  if (operationStatus === 'FAILED_RETRYABLE') {
    return 'failure-retryable';
  }

  if (operationStatus === 'FAILED_FINAL') {
    return 'failure-final';
  }

  const payment = normalizePaymentStatus(op.paymentStatus);
  const invite = op.invitationStatus.trim().toUpperCase();

  if (!paymentComplete(payment)) {
    return 'payment-pending';
  }

  if (!ctx.isActiveTenant) {
    return 'activation-pending';
  }

  if (invite === 'FAILED') {
    return 'attention';
  }

  if (!invitationComplete(op.invitationStatus) && invite !== 'NOT_ELIGIBLE') {
    return 'invitation-pending';
  }

  return 'success';
}

export function buildStatusPresentation(
  op: TenantOnboardingOperation,
  ctx: LifecycleContext
): StatusPresentation {
  const pageView = resolveOperationPageView(op, ctx);

  switch (pageView) {
    case 'running':
      return {
        pageView,
        headline: 'Tenant setup is in progress',
        subcopy: 'The tenant has been submitted and provisioning is continuing.',
        badgeText: 'Processing',
        badgeVariant: 'info',
        surfaceTone: 'blue',
        showSpinner: true
      };
    case 'long-running':
      return {
        pageView,
        headline: 'Tenant setup is taking longer than usual',
        subcopy: 'You can safely leave this page and return using this operation link.',
        badgeText: 'Still processing',
        badgeVariant: 'info',
        surfaceTone: 'blue',
        showSpinner: true
      };
    case 'payment-pending':
      return {
        pageView,
        headline: 'Tenant created — payment setup pending',
        subcopy: 'Core tenant provisioning completed. Manual payment setup is the current pending lifecycle stage.',
        badgeText: 'Payment pending',
        badgeVariant: 'warning',
        surfaceTone: 'blue',
        showSpinner: false
      };
    case 'activation-pending':
      return {
        pageView,
        headline: 'Payment approved — activation pending',
        subcopy: 'Tenant creation succeeded. Activation lifecycle is still in progress.',
        badgeText: 'Activation pending',
        badgeVariant: 'info',
        surfaceTone: 'blue',
        showSpinner: false
      };
    case 'invitation-pending':
      return {
        pageView,
        headline: 'Tenant created — invitation pending',
        subcopy: 'Activation is complete. Tenant Admin invitation lifecycle is still in progress.',
        badgeText: 'Invitation pending',
        badgeVariant: 'info',
        surfaceTone: 'blue',
        showSpinner: false
      };
    case 'attention':
      return {
        pageView,
        headline: 'Tenant setup needs attention',
        subcopy: 'Some tenant setup work may already be complete. Review the lifecycle and choose a safe next action.',
        badgeText: 'Needs attention',
        badgeVariant: 'warning',
        surfaceTone: 'failure',
        showSpinner: false
      };
    case 'success':
      return {
        pageView,
        headline: 'Tenant setup complete',
        subcopy: 'Tenant creation, payment, activation, and invitation lifecycle stages are complete.',
        badgeText: 'Complete',
        badgeVariant: 'success',
        surfaceTone: 'success',
        showSpinner: false
      };
    case 'failure-retryable':
      return {
        pageView,
        headline: 'Tenant setup needs attention',
        subcopy: 'Some tenant setup work may already be complete. Review the lifecycle and choose a safe recovery action.',
        badgeText: 'Retry eligible',
        badgeVariant: 'danger',
        surfaceTone: 'failure',
        showSpinner: false
      };
    case 'failure-final':
      return {
        pageView,
        headline: 'Tenant provisioning could not fully complete',
        subcopy: 'Review the lifecycle context before taking further action.',
        badgeText: 'Failed',
        badgeVariant: 'danger',
        surfaceTone: 'failure',
        showSpinner: false
      };
  }
}

export function buildLifecycleNodes(
  op: TenantOnboardingOperation,
  ctx: LifecycleContext
): LifecycleNodeView[] {
  const payment = normalizePaymentStatus(op.paymentStatus);
  const invite = op.invitationStatus.trim().toUpperCase();
  const provisioningDone = provisioningComplete(op);
  const paymentDone = paymentComplete(payment);
  const activationDone = ctx.isActiveTenant;
  const inviteDone = invitationComplete(op.invitationStatus);
  const inviteFail = invitationFailed(op.invitationStatus);
  const operationFailed = op.status.startsWith('FAILED');

  const provisioningVisual: LifecycleVisual = operationFailed && !provisioningDone
    ? 'failed'
    : provisioningDone
      ? 'completed'
      : op.status === 'PROCESSING'
        ? 'active'
        : 'waiting';

  let paymentVisual: LifecycleVisual = 'waiting';
  if (operationFailed && provisioningDone && !paymentDone) {
    paymentVisual = 'failed';
  } else if (paymentDone) {
    paymentVisual = 'completed';
  } else if (provisioningDone && !paymentDone) {
    paymentVisual = 'active';
  }

  let activationVisual: LifecycleVisual = 'waiting';
  if (operationFailed && paymentDone && !activationDone) {
    activationVisual = 'failed';
  } else if (activationDone) {
    activationVisual = 'completed';
  } else if (paymentDone && !activationDone) {
    activationVisual = 'active';
  }

  let invitationVisual: LifecycleVisual = 'waiting';
  if (inviteFail || (operationFailed && activationDone && !inviteDone)) {
    invitationVisual = 'failed';
  } else if (inviteDone) {
    invitationVisual = 'completed';
  } else if (activationDone && !inviteDone && invite !== 'NOT_ELIGIBLE') {
    invitationVisual = 'active';
  } else if (paymentDone && !activationDone) {
    invitationVisual = 'waiting';
  }

  return [
    {
      key: 'provisioning',
      label: 'Tenant created',
      stateText: provisioningDone ? 'Completed' : op.status === 'PROCESSING' ? 'In progress' : formatLifecycleLabel(op.provisioningStatus),
      visual: provisioningVisual,
      pulse: provisioningVisual === 'active' && op.status === 'PROCESSING'
    },
    {
      key: 'payment',
      label: 'Payment setup',
      stateText: paymentStateText(payment),
      visual: paymentVisual,
      pulse: paymentVisual === 'active'
    },
    {
      key: 'activation',
      label: 'Tenant activation',
      stateText: activationDone ? 'Active' : ctx.tenantStatus ? formatLifecycleLabel(ctx.tenantStatus) : 'Waiting',
      visual: activationVisual,
      pulse: activationVisual === 'active'
    },
    {
      key: 'invitation',
      label: 'Tenant Admin invitation',
      stateText: invitationStateText(op.invitationStatus),
      visual: invitationVisual,
      pulse: invitationVisual === 'active'
    }
  ];
}
