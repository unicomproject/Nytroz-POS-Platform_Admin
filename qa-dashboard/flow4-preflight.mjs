import { access } from 'node:fs/promises';
import { connect } from 'node:net';

const release = process.argv.includes('--release') || (process.env.FLOW4_VALIDATION_MODE || '').toLowerCase() === 'release';
const ui = process.env.FLOW4_BASE_URL || process.env.QA_BASE_URL || 'http://127.0.0.1:4200';
const api = process.env.FLOW4_API_URL || `${ui}/api/v1`;
// Internal fixture keys only. ACS/mailbox/HTTPS-email are reported as BLOCKED_EXTERNAL and do not fail local preflight.
const mandatory = [
  'FLOW4_ADMIN_EMAIL', 'FLOW4_ADMIN_PASSWORD', 'FLOW4_SECOND_ADMIN_EMAIL', 'FLOW4_SECOND_ADMIN_PASSWORD',
  'FLOW4_VIEW_EMAIL', 'FLOW4_VIEW_PASSWORD', 'FLOW4_NO_BILLING_EMAIL', 'FLOW4_NO_BILLING_PASSWORD',
  'FLOW4_OPERATION_ID', 'FLOW4_AWAITING_TOKEN', 'FLOW4_PROOF_FILE', 'FLOW4_SUBMITTED_TOKEN',
  'FLOW4_SUBMITTED_PAYMENT_ID', 'FLOW4_APPROVABLE_PAYMENT_ID',
  'FLOW4_PAID_PAYMENT_ID', 'FLOW4_REJECTABLE_PAYMENT_ID', 'FLOW4_REJECTED_TOKEN', 'FLOW4_INFO_PAYMENT_ID',
  'FLOW4_ACTION_REQUIRED_TOKEN', 'FLOW4_CONFLICT_PAYMENT_ID', 'FLOW4_EXPIRED_TOKEN', 'FLOW4_REVOKED_TOKEN',
  'FLOW4_INVALID_EVIDENCE_TOKEN', 'FLOW4_UNCLEAN_PAYMENT_ID', 'FLOW4_NOTIFICATION_FAILED_PAYMENT_ID',
  'FLOW4_CROSS_TENANT_PROOF_URL', 'FLOW4_RETRY_OPERATION_ID', 'FLOW4_ACTIVE_PAYMENT_ID',
  'FLOW4_HAPPY_OPERATION_ID', 'FLOW4_HAPPY_PAYMENT_ID', 'FLOW4_HAPPY_TOKEN'
];
const results = [];
const add = (classification, check, detail) => results.push({ classification, check, detail });

async function http(name, url) {
  try {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
    add(response.status < 500 ? 'READY' : 'FAILED_LOCAL', name, `HTTP ${response.status}`);
  } catch (error) {
    add('FAILED_LOCAL', name, error.cause?.code || error.message);
  }
}

async function tcp(name, host, port) {
  await new Promise((resolve) => {
    const socket = connect({ host, port: Number(port), timeout: 3000 });
    socket.once('connect', () => { add('READY', name, `${host}:${port}`); socket.destroy(); resolve(); });
    socket.once('timeout', () => { add('FAILED_LOCAL', name, 'timeout'); socket.destroy(); resolve(); });
    socket.once('error', (error) => { add('FAILED_LOCAL', name, error.code || error.message); resolve(); });
  });
}

const healthBase = api.replace(/\/api\/v1\/?$/, '');
await Promise.all([
  http('Angular', ui),
  http('Backend health', `${healthBase}/api/v1/health`),
  tcp('PostgreSQL', '127.0.0.1', process.env.FLOW4_POSTGRES_PORT || 55438),
  tcp('ClamAV', '127.0.0.1', process.env.ManualPaymentEvidenceScanner__Port || 53310)
]);

const missing = mandatory.filter((name) => !process.env[name]);
add(missing.length ? 'FAILED_LOCAL' : 'READY', 'Scenario variables', missing.length ? `missing ${missing.join(', ')}` : 'all present');
if (process.env.FLOW4_PROOF_FILE) {
  try { await access(process.env.FLOW4_PROOF_FILE); add('READY', 'Proof fixture', 'present'); }
  catch { add('FAILED_LOCAL', 'Proof fixture', 'missing'); }
}
add(process.env.AzureBlobStorage__ConnectionString ? 'READY' : 'BLOCKED_EXTERNAL', 'Blob configuration', process.env.AzureBlobStorage__ConnectionString ? 'configured' : 'not configured');
const acsLive = process.env.FLOW4_LIVE_EMAIL_ENABLED === 'true'
  && !!(process.env.AzureCommunicationEmail__ConnectionString || process.env.AzureCommunicationEmail__Endpoint)
  && !!process.env.FLOW4_TEST_MAILBOX
  && !!process.env.FLOW4_RECIPIENT_ALLOWLIST;
add(acsLive ? 'READY' : 'BLOCKED_EXTERNAL', 'ACS live provider + mailbox', acsLive ? 'live email prerequisites present' : 'live ACS/mailbox/allow-list unavailable (internal E2E may still run)');
add(process.env.FLOW4_TEST_MAILBOX ? 'READY' : 'BLOCKED_EXTERNAL', 'Controlled mailbox', process.env.FLOW4_TEST_MAILBOX ? 'configured' : 'not configured');
const httpsPayment = /^https:\/\//i.test(process.env.TenantOnboardingOutbox__PaymentAccessBaseUrl || '');
const httpsSetup = /^https:\/\//i.test(process.env.TenantOnboardingOutbox__TenantAdminAppBaseUrl || '');
add(httpsPayment ? 'READY' : 'BLOCKED_EXTERNAL', 'HTTPS payment email base', httpsPayment ? 'configured' : 'not configured');
add(httpsSetup ? 'READY' : 'BLOCKED_EXTERNAL', 'HTTPS setup email base', httpsSetup ? 'configured' : 'not configured');

for (const item of results) console.log(`${item.classification.padEnd(16)} ${item.check}: ${item.detail}`);
const failed = results.some((item) => item.classification === 'FAILED_LOCAL');
const blocked = results.some((item) => item.classification === 'BLOCKED_EXTERNAL');
// Local/internal mode: only FAILED_LOCAL fails. Release mode also fails on external blocks.
if (failed || (release && blocked)) process.exitCode = 1;
