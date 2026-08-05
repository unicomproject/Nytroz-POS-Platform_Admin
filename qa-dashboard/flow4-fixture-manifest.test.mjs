import assert from 'node:assert/strict';
import test from 'node:test';
import { playwrightEnvironment, requireManifest } from './flow4-fixture-manifest.mjs';

const runId = '11111111-1111-4111-8111-111111111111';
function fixture() {
  const scenarios = ['AWAITING_PAYMENT', 'PAYMENT_SUBMITTED', 'ACTION_REQUIRED', 'REJECTED', 'APPROVABLE_PAYMENT',
    'REJECTABLE_PAYMENT', 'REQUEST_INFORMATION_ELIGIBLE', 'CONCURRENT_REVIEW', 'UNCLEAN_EVIDENCE',
    'NOTIFICATION_FAILED', 'PAID_PENDING_ACTIVATION', 'ACTIVE_INVITATION_READY', 'RETRYABLE_OPERATION',
    'EXPIRED_PAYMENT_ACCESS', 'REVOKED_PAYMENT_ACCESS', 'CROSS_TENANT_PROOF', 'COMPLETE_HAPPY_PATH'];
  const identifiers = { PERSONA_ADMIN_EMAIL: 'a', PERSONA_SECOND_ADMIN_EMAIL: 'b', PERSONA_VIEW_ONLY_EMAIL: 'c', PERSONA_NO_BILLING_EMAIL: 'd' };
  const secrets = { PERSONA_ADMIN_PASSWORD: '1', PERSONA_SECOND_ADMIN_PASSWORD: '2', PERSONA_VIEW_ONLY_PASSWORD: '3', PERSONA_NO_BILLING_PASSWORD: '4' };
  for (const scenario of scenarios) {
    identifiers[`${scenario}.paymentId`] = `${scenario}-payment`;
    identifiers[`${scenario}.operationId`] = `${scenario}-operation`;
    identifiers[`${scenario}.evidenceId`] = `${scenario}-evidence`;
    secrets[`${scenario}.paymentToken`] = `${scenario}-token`;
  }
  return { metadata: { schemaVersion: '1.0', fixtureSetVersion: 'canonical-v1', testRunId: runId, expiresAt: '2099-01-01T00:00:00Z' }, identifiers, secrets, cleanup: { handle: 'owned' } };
}

test('validates run, version and expiry boundaries', () => {
  assert.equal(requireManifest(fixture(), runId).metadata.schemaVersion, '1.0');
  assert.throws(() => requireManifest({ ...fixture(), metadata: { ...fixture().metadata, testRunId: crypto.randomUUID() } }, runId));
  assert.throws(() => requireManifest({ ...fixture(), metadata: { ...fixture().metadata, expiresAt: '2020-01-01T00:00:00Z' } }, runId));
});

test('maps every exact Playwright fixture variable without values in logs or files', () => {
  const env = playwrightEnvironment(fixture(), { FLOW4_API_URL: 'http://api.test/api/v1' }, 'C:/safe-ephemeral');
  const expected = ['FLOW4_ADMIN_EMAIL', 'FLOW4_ADMIN_PASSWORD', 'FLOW4_SECOND_ADMIN_EMAIL', 'FLOW4_SECOND_ADMIN_PASSWORD',
    'FLOW4_VIEW_EMAIL', 'FLOW4_VIEW_PASSWORD', 'FLOW4_NO_BILLING_EMAIL', 'FLOW4_NO_BILLING_PASSWORD', 'FLOW4_OPERATION_ID',
    'FLOW4_AWAITING_TOKEN', 'FLOW4_SUBMITTED_TOKEN', 'FLOW4_SUBMITTED_PAYMENT_ID', 'FLOW4_APPROVABLE_PAYMENT_ID',
    'FLOW4_PAID_PAYMENT_ID', 'FLOW4_REJECTABLE_PAYMENT_ID', 'FLOW4_REJECTED_TOKEN', 'FLOW4_INFO_PAYMENT_ID',
    'FLOW4_ACTION_REQUIRED_TOKEN', 'FLOW4_CONFLICT_PAYMENT_ID', 'FLOW4_EXPIRED_TOKEN', 'FLOW4_REVOKED_TOKEN',
    'FLOW4_INVALID_EVIDENCE_TOKEN', 'FLOW4_UNCLEAN_PAYMENT_ID', 'FLOW4_NOTIFICATION_FAILED_PAYMENT_ID',
    'FLOW4_CROSS_TENANT_PROOF_URL', 'FLOW4_RETRY_OPERATION_ID', 'FLOW4_ACTIVE_PAYMENT_ID', 'FLOW4_HAPPY_OPERATION_ID',
    'FLOW4_HAPPY_PAYMENT_ID', 'FLOW4_HAPPY_TOKEN', 'FLOW4_PROOF_FILE'];
  assert.deepEqual(expected.filter(name => !env[name]), []);
  assert.equal(env.FLOW4_CROSS_TENANT_PROOF_URL,
    'http://api.test/api/v1/platform-admin/billing/manual-payments/CROSS_TENANT_PROOF-payment/proof/CROSS_TENANT_PROOF-evidence');
});
