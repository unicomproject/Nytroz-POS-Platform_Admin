import { resolve } from 'node:path';

export function requireManifest(manifest, runId, now = Date.now()) {
  if (manifest?.metadata?.schemaVersion !== '1.0' || manifest?.metadata?.fixtureSetVersion !== 'canonical-v1')
    throw new Error('Unsupported Flow 4 fixture manifest.');
  if (manifest.metadata.testRunId.toLowerCase() !== runId.toLowerCase()) throw new Error('Fixture run boundary mismatch.');
  if (Date.parse(manifest.metadata.expiresAt) <= now) throw new Error('Fixture manifest is expired.');
  if (!manifest.cleanup?.handle || !manifest.identifiers || !manifest.secrets) throw new Error('Fixture manifest is incomplete.');
  return manifest;
}

const id = (manifest, scenario, field) => manifest.identifiers[`${scenario}.${field}`];
const secret = (manifest, scenario, field) => manifest.secrets[`${scenario}.${field}`];

export function playwrightEnvironment(manifest, sourceEnvironment, dashboardRoot) {
  const api = sourceEnvironment.FLOW4_API_URL || `${sourceEnvironment.FLOW4_BASE_URL || 'http://127.0.0.1:4200'}/api/v1`;
  const payment = scenario => id(manifest, scenario, 'paymentId');
  return {
    ...sourceEnvironment,
    FLOW4_ADMIN_EMAIL: manifest.identifiers.PERSONA_ADMIN_EMAIL,
    FLOW4_ADMIN_PASSWORD: manifest.secrets.PERSONA_ADMIN_PASSWORD,
    FLOW4_SECOND_ADMIN_EMAIL: manifest.identifiers.PERSONA_SECOND_ADMIN_EMAIL,
    FLOW4_SECOND_ADMIN_PASSWORD: manifest.secrets.PERSONA_SECOND_ADMIN_PASSWORD,
    FLOW4_VIEW_EMAIL: manifest.identifiers.PERSONA_VIEW_ONLY_EMAIL,
    FLOW4_VIEW_PASSWORD: manifest.secrets.PERSONA_VIEW_ONLY_PASSWORD,
    FLOW4_NO_BILLING_EMAIL: manifest.identifiers.PERSONA_NO_BILLING_EMAIL,
    FLOW4_NO_BILLING_PASSWORD: manifest.secrets.PERSONA_NO_BILLING_PASSWORD,
    FLOW4_OPERATION_ID: id(manifest, 'AWAITING_PAYMENT', 'operationId'),
    FLOW4_AWAITING_TOKEN: secret(manifest, 'AWAITING_PAYMENT', 'paymentToken'),
    FLOW4_SUBMITTED_TOKEN: secret(manifest, 'PAYMENT_SUBMITTED', 'paymentToken'),
    FLOW4_SUBMITTED_PAYMENT_ID: payment('PAYMENT_SUBMITTED'),
    FLOW4_APPROVABLE_PAYMENT_ID: payment('APPROVABLE_PAYMENT'),
    FLOW4_PAID_PAYMENT_ID: payment('PAID_PENDING_ACTIVATION'),
    FLOW4_REJECTABLE_PAYMENT_ID: payment('REJECTABLE_PAYMENT'),
    FLOW4_REJECTED_TOKEN: secret(manifest, 'REJECTED', 'paymentToken'),
    FLOW4_INFO_PAYMENT_ID: payment('REQUEST_INFORMATION_ELIGIBLE'),
    FLOW4_ACTION_REQUIRED_TOKEN: secret(manifest, 'ACTION_REQUIRED', 'paymentToken'),
    FLOW4_CONFLICT_PAYMENT_ID: payment('CONCURRENT_REVIEW'),
    FLOW4_EXPIRED_TOKEN: secret(manifest, 'EXPIRED_PAYMENT_ACCESS', 'paymentToken'),
    FLOW4_REVOKED_TOKEN: secret(manifest, 'REVOKED_PAYMENT_ACCESS', 'paymentToken'),
    FLOW4_INVALID_EVIDENCE_TOKEN: secret(manifest, 'UNCLEAN_EVIDENCE', 'paymentToken'),
    FLOW4_UNCLEAN_PAYMENT_ID: payment('UNCLEAN_EVIDENCE'),
    FLOW4_NOTIFICATION_FAILED_PAYMENT_ID: payment('NOTIFICATION_FAILED'),
    FLOW4_CROSS_TENANT_PROOF_URL: `${api}/platform-admin/billing/manual-payments/${payment('CROSS_TENANT_PROOF')}/proof/${id(manifest, 'CROSS_TENANT_PROOF', 'evidenceId')}`,
    FLOW4_RETRY_OPERATION_ID: id(manifest, 'RETRYABLE_OPERATION', 'operationId'),
    FLOW4_ACTIVE_PAYMENT_ID: payment('ACTIVE_INVITATION_READY'),
    FLOW4_HAPPY_OPERATION_ID: id(manifest, 'COMPLETE_HAPPY_PATH', 'operationId'),
    FLOW4_HAPPY_PAYMENT_ID: payment('COMPLETE_HAPPY_PATH'),
    FLOW4_HAPPY_TOKEN: secret(manifest, 'COMPLETE_HAPPY_PATH', 'paymentToken'),
    FLOW4_PROOF_FILE: sourceEnvironment.FLOW4_PROOF_FILE || resolve(dashboardRoot, '.flow4', 'fixtures', 'valid-proof.pdf')
  };
}
