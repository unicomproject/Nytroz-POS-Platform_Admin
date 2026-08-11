import {
  buildLifecycleNodes,
  buildStatusPresentation,
  invitationStateText,
  normalizePaymentStatus,
  paymentStateText,
  resolveOperationPageView
} from './onboarding-operation-lifecycle';
import { TenantOnboardingOperation } from '../../models/platform-tenant-onboarding.model';

function operation(overrides: Partial<TenantOnboardingOperation> = {}): TenantOnboardingOperation {
  return {
    id: 'operation-1',
    draftId: 'draft-1',
    tenantId: 'tenant-1',
    status: 'SUCCEEDED',
    provisioningStatus: 'SUCCEEDED',
    paymentStatus: 'AWAITING_PAYMENT',
    invitationStatus: 'NOT_ELIGIBLE',
    attemptCount: 1,
    failureCode: null,
    retryable: false,
    nextRetryAt: null,
    version: 1,
    updatedAt: '2026-08-11T00:00:00Z',
    ...overrides
  };
}

describe('onboarding-operation-lifecycle', () => {
  it('maps pending payment without claiming activation success', () => {
    const view = resolveOperationPageView(operation(), {
      tenantStatus: 'PENDING_PAYMENT',
      isActiveTenant: false,
      isLongRunning: false
    });

    expect(view).toBe('payment-pending');
    expect(buildStatusPresentation(operation(), {
      tenantStatus: 'PENDING_PAYMENT',
      isActiveTenant: false,
      isLongRunning: false
    }).headline).toContain('payment setup pending');
  });

  it('does not mark invitation sent when backend only reports queued', () => {
    expect(invitationStateText('PENDING')).toBe('Queued');
    expect(invitationStateText('SENT')).toBe('Sent');
  });

  it('does not treat operation success as full lifecycle completion', () => {
    const nodes = buildLifecycleNodes(
      operation({ paymentStatus: 'AWAITING_PAYMENT', invitationStatus: 'NOT_ELIGIBLE' }),
      { tenantStatus: 'PENDING_PAYMENT', isActiveTenant: false, isLongRunning: false }
    );

    expect(nodes[0].visual).toBe('completed');
    expect(nodes[1].visual).toBe('active');
    expect(nodes[2].visual).toBe('waiting');
  });

  it('maps retryable failure separately from payment pending', () => {
    const failed = operation({
      status: 'FAILED_RETRYABLE',
      retryable: true,
      paymentStatus: 'PAID',
      invitationStatus: 'FAILED'
    });

    expect(resolveOperationPageView(failed, {
      tenantStatus: 'ACTIVE',
      isActiveTenant: true,
      isLongRunning: false
    })).toBe('failure-retryable');
  });

  it('normalizes legacy pending payment status', () => {
    expect(normalizePaymentStatus('PENDING')).toBe('AWAITING_PAYMENT');
    expect(paymentStateText('AWAITING_PAYMENT')).toBe('Awaiting payment');
  });
});
