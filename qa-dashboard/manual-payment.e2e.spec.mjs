/**
 * Flow 4 manual-payment browser acceptance suite.
 *
 * This suite never mocks HTTP and never mutates browser storage to bypass the
 * backend state machine. It requires a controlled PostgreSQL/Blob/scan/email
 * environment and purpose-specific test fixtures supplied through environment
 * variables. Without that environment every scenario is reported as blocked.
 */
import { test, expect } from '@playwright/test';

const UI = process.env.FLOW4_BASE_URL || process.env.QA_BASE_URL || 'http://localhost:4200';
const API = process.env.FLOW4_API_URL || `${UI}/api/v1`;
const validationMode = (process.env.FLOW4_VALIDATION_MODE || 'local').toLowerCase();
const releaseMode = validationMode === 'release';
const value = (name) => process.env[name] || '';

test.describe.configure({ mode: 'serial' });
test.describe('Flow 4 — Manual Payment canonical E2E', () => {
  test('E2E 1 — valid prepaid tenant creation reaches Pending Payment', async ({ page }) => {
    requireValues('FLOW4_OPERATION_ID', 'FLOW4_ADMIN_EMAIL', 'FLOW4_ADMIN_PASSWORD');
    await login(page, value('FLOW4_ADMIN_EMAIL'), value('FLOW4_ADMIN_PASSWORD'));
    await page.goto(`${UI}/admin/tenants/onboarding/operations/${encodeURIComponent(value('FLOW4_OPERATION_ID'))}`);
    await expect(page.getByText('Tenant created — payment pending')).toBeVisible();
    await expect(page.getByText('Awaiting Payment', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Account ready').locator('..')).not.toContainText('Confirmed');
  });

  test('E2E 2 — recipient opens secure payment status with no checkout', async ({ page }) => {
    requireValues('FLOW4_AWAITING_TOKEN');
    await openRecipient(page, 'FLOW4_AWAITING_TOKEN');
    await expect(page.getByText('Payment instructions')).toBeVisible();
    await expect(page.getByText('Invoice', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /pay online|checkout/i })).toHaveCount(0);
  });

  test('E2E 3 — recipient submits a valid manual payment', async ({ page }) => {
    requireValues('FLOW4_AWAITING_TOKEN', 'FLOW4_PROOF_FILE');
    await openRecipient(page, 'FLOW4_AWAITING_TOKEN');
    await page.getByLabel('Transaction/reference number').fill(`E2E-${Date.now()}`);
    const amount = await page.getByLabel('Submitted amount').inputValue();
    expect(Number(amount)).toBeGreaterThan(0);
    await page.getByLabel('Proof of payment').setInputFiles(value('FLOW4_PROOF_FILE'));
    await page.getByRole('button', { name: 'Submit Payment Details' }).click();
    await expect(page.getByText(/Payment details submitted|Submission received/)).toBeVisible();
  });

  test('E2E 4 — duplicate network retry remains one logical submission', async ({ page }) => {
    requireValues('FLOW4_SUBMITTED_TOKEN', 'FLOW4_SUBMITTED_PAYMENT_ID', 'FLOW4_DUPLICATE_ASSERTION_URL');
    await openRecipient(page, 'FLOW4_SUBMITTED_TOKEN');
    await expect(page.getByText('Submission received')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit Payment Details' })).toHaveCount(0);
    const result = await page.request.get(value('FLOW4_DUPLICATE_ASSERTION_URL'));
    expect(result.ok()).toBe(true);
    expect((await result.json()).logicalSubmissionCount).toBe(1);
  });

  test('E2E 5 — payment review queue searches, filters, and opens detail', async ({ page }) => {
    await loginAdmin(page); await page.goto(`${UI}/admin/billing/manual-payments`);
    await expect(page.getByRole('heading', { name: 'Manual payment review' })).toBeVisible();
    await page.getByLabel('Search').fill(value('FLOW4_QUEUE_SEARCH') || 'INV');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page.getByRole('link', { name: /View review/ }).first()).toBeVisible();
    await page.getByRole('link', { name: /View review/ }).first().click();
    await expect(page.getByText('Expected versus submitted')).toBeVisible();
  });

  test('E2E 6 — evidence is opened only through the private proof endpoint', async ({ page }) => {
    requireValues('FLOW4_SUBMITTED_PAYMENT_ID');
    await loginAdmin(page); await openAdminPayment(page, 'FLOW4_SUBMITTED_PAYMENT_ID');
    const proofRequest = page.waitForResponse((response) => response.url().includes('/proof/') && response.request().method() === 'GET');
    await page.getByRole('button', { name: 'Preview securely' }).first().click();
    const response = await proofRequest; expect(response.ok()).toBe(true);
    expect(response.headers()['cache-control']).toContain('no-store');
    await expect(page.getByText(/submission v/i)).toBeVisible();
  });

  test('E2E 7 — approving payment reaches Paid and Pending Activation only', async ({ page }) => {
    requireValues('FLOW4_APPROVABLE_PAYMENT_ID');
    await loginAdmin(page); await openAdminPayment(page, 'FLOW4_APPROVABLE_PAYMENT_ID');
    await page.getByRole('button', { name: 'Approve' }).click();
    await page.getByLabel(/I reviewed the expected amount/).check();
    await page.getByRole('button', { name: 'Confirm Approve' }).click();
    await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Pending Activation', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Active', { exact: true })).toHaveCount(0);
  });

  test('E2E 8 — authorized activation makes tenant active and queues invitation', async ({ page }) => {
    requireValues('FLOW4_PAID_PAYMENT_ID');
    await loginAdmin(page); await openAdminPayment(page, 'FLOW4_PAID_PAYMENT_ID');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Activate tenant' }).click();
    await expect(page.getByText('Active', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Pending|Queued|Sent/).last()).toBeVisible();
  });

  test('E2E 9 — reviewer rejects with reason and recipient sees safe outcome', async ({ page }) => {
    requireValues('FLOW4_REJECTABLE_PAYMENT_ID', 'FLOW4_REJECTED_TOKEN');
    await loginAdmin(page); await openAdminPayment(page, 'FLOW4_REJECTABLE_PAYMENT_ID');
    await page.getByRole('button', { name: 'Reject' }).click();
    await page.getByLabel('Actionable note').fill('The receipt could not be verified. Please submit a clear replacement.');
    await page.getByLabel(/I reviewed the expected amount/).check();
    await page.getByRole('button', { name: 'Confirm Reject' }).click();
    await openRecipient(page, 'FLOW4_REJECTED_TOKEN');
    await expect(page.getByText('Payment was not approved')).toBeVisible();
  });

  test('E2E 10 — request information supports correction and immutable history', async ({ page }) => {
    requireValues('FLOW4_INFO_PAYMENT_ID', 'FLOW4_ACTION_REQUIRED_TOKEN');
    await loginAdmin(page); await openAdminPayment(page, 'FLOW4_INFO_PAYMENT_ID');
    await page.getByRole('button', { name: 'Request information' }).click();
    await page.getByLabel('Actionable note').fill('Upload a clearer proof showing the complete transaction reference.');
    await page.getByLabel(/I reviewed the expected amount/).check();
    await page.getByRole('button', { name: 'Confirm Request Information' }).click();
    await openRecipient(page, 'FLOW4_ACTION_REQUIRED_TOKEN');
    await expect(page.getByRole('button', { name: 'Update Payment Details' })).toBeVisible();
    await expect(page.getByText('Status history')).toBeVisible();
  });

  test('E2E 11 — stale concurrent review reports conflict and reload', async ({ browser }) => {
    requireValues('FLOW4_CONFLICT_PAYMENT_ID', 'FLOW4_ADMIN_EMAIL', 'FLOW4_ADMIN_PASSWORD', 'FLOW4_SECOND_ADMIN_EMAIL', 'FLOW4_SECOND_ADMIN_PASSWORD');
    const first = await browser.newPage(); const second = await browser.newPage();
    await login(first, value('FLOW4_ADMIN_EMAIL'), value('FLOW4_ADMIN_PASSWORD'));
    await login(second, value('FLOW4_SECOND_ADMIN_EMAIL'), value('FLOW4_SECOND_ADMIN_PASSWORD'));
    await Promise.all([openAdminPayment(first, 'FLOW4_CONFLICT_PAYMENT_ID'), openAdminPayment(second, 'FLOW4_CONFLICT_PAYMENT_ID')]);
    await completeReview(first, 'Approve');
    await completeReview(second, 'Reject', 'Concurrent rejection attempt.');
    await expect(second.getByText(/updated by another reviewer/i)).toBeVisible();
    await expect(second.getByRole('button', { name: /Reload latest status/i })).toBeVisible();
  });

  test('E2E 12 — user without billing view is denied queue and API', async ({ page }) => {
    requireValues('FLOW4_NO_BILLING_EMAIL', 'FLOW4_NO_BILLING_PASSWORD');
    await login(page, value('FLOW4_NO_BILLING_EMAIL'), value('FLOW4_NO_BILLING_PASSWORD'));
    await page.goto(`${UI}/admin/billing/manual-payments`);
    await expect(page).toHaveURL(/permission-denied/);
    const response = await page.request.get(`${API}/platform-admin/billing/manual-payments`);
    expect([401, 403]).toContain(response.status());
  });

  test('E2E 13 — billing-view-only user cannot review', async ({ page }) => {
    requireValues('FLOW4_VIEW_EMAIL', 'FLOW4_VIEW_PASSWORD', 'FLOW4_SUBMITTED_PAYMENT_ID');
    await login(page, value('FLOW4_VIEW_EMAIL'), value('FLOW4_VIEW_PASSWORD'));
    await openAdminPayment(page, 'FLOW4_SUBMITTED_PAYMENT_ID');
    await expect(page.getByText(/Read only/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Approve|Reject|Request information/ })).toHaveCount(0);
  });

  test('E2E 14 — expired payment link exposes no invoice or payment data', async ({ page }) => {
    requireValues('FLOW4_EXPIRED_TOKEN');
    await openRecipient(page, 'FLOW4_EXPIRED_TOKEN');
    await expect(page.getByText('Payment link unavailable')).toBeVisible();
    await expect(page.getByText(/invalid or expired/i)).toBeVisible();
    await expect(page.getByText('Invoice number')).toHaveCount(0);
  });

  test('E2E 14b — revoked payment link exposes no invoice or payment data', async ({ page }) => {
    requireValues('FLOW4_REVOKED_TOKEN');
    await openRecipient(page, 'FLOW4_REVOKED_TOKEN');
    await expect(page.getByText('Payment link unavailable')).toBeVisible();
    await expect(page.getByText(/invalid or expired/i)).toBeVisible();
    await expect(page.getByText('Invoice number')).toHaveCount(0);
  });

  test('E2E 15 — invalid and unclean evidence is blocked', async ({ page }) => {
    requireValues('FLOW4_INVALID_EVIDENCE_TOKEN', 'FLOW4_UNCLEAN_PAYMENT_ID');
    await openRecipient(page, 'FLOW4_INVALID_EVIDENCE_TOKEN');
    await page.getByLabel('Proof of payment').setInputFiles({ name: 'proof.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('unsafe') });
    await expect(page.getByText(/Only PDF, JPEG, and PNG/)).toBeVisible();
    await loginAdmin(page); await openAdminPayment(page, 'FLOW4_UNCLEAN_PAYMENT_ID');
    await expect(page.getByRole('button', { name: 'Approve' })).toBeDisabled();
    await expect(page.getByText(/Approval blocked until evidence is clean/)).toBeVisible();
  });

  test('E2E 16 — notification failure has an intentional authorized resend', async ({ page }) => {
    requireValues('FLOW4_NOTIFICATION_FAILED_PAYMENT_ID');
    await loginAdmin(page); await openAdminPayment(page, 'FLOW4_NOTIFICATION_FAILED_PAYMENT_ID');
    page.once('dialog', (dialog) => dialog.accept());
    const responsePromise = page.waitForResponse((response) => response.url().endsWith('/notification/resend'));
    await page.getByRole('button', { name: 'Resend payment notification' }).click();
    expect((await responsePromise).ok()).toBe(true);
    await expect(page.getByText(/Payment notification .*queued/i)).toBeVisible();
  });

  test('E2E 17 — cross-tenant proof access is privacy-safe', async ({ page }) => {
    requireValues('FLOW4_CROSS_TENANT_PROOF_URL'); await loginAdmin(page);
    const authenticatedRequest = page.waitForRequest((request) =>
      request.url().includes('/api/v1/platform-admin/') && request.headers()['authorization']?.startsWith('Bearer '));
    await page.goto(`${UI}/admin/billing/manual-payments`);
    const authorization = (await authenticatedRequest).headers()['authorization'];
    const response = await page.request.get(value('FLOW4_CROSS_TENANT_PROOF_URL'), { headers: { authorization } });
    expect([403, 404]).toContain(response.status());
    expect(await response.text()).not.toMatch(/storageKey|sha256|blob|container/i);
  });

  test('E2E 18 — retryable activation work retries safely', async ({ page }) => {
    requireValues('FLOW4_RETRY_OPERATION_ID'); await loginAdmin(page);
    await page.goto(`${UI}/admin/tenants/onboarding/operations/${encodeURIComponent(value('FLOW4_RETRY_OPERATION_ID'))}`);
    await expect(page.getByRole('button', { name: 'Retry eligible operation' })).toBeVisible();
    await page.getByRole('button', { name: 'Retry eligible operation' }).click();
    await expect(page.getByText(/queued for retry/i)).toBeVisible();
  });

  test('E2E 19 — invitation resend exposes status but no raw token', async ({ page }) => {
    requireValues('FLOW4_ACTIVE_PAYMENT_ID');
    await loginAdmin(page); await openAdminPayment(page, 'FLOW4_ACTIVE_PAYMENT_ID');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Resend Tenant Admin invitation' }).click();
    await expect(page.getByText(/Tenant Admin invitation/)).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(/[A-Za-z0-9_-]{43,}/);
  });

  test('E2E 20 — complete happy-path fixture confirms every lifecycle boundary', async ({ page }) => {
    requireValues('FLOW4_HAPPY_OPERATION_ID', 'FLOW4_HAPPY_PAYMENT_ID', 'FLOW4_HAPPY_TOKEN'); await loginAdmin(page);
    await page.goto(`${UI}/admin/tenants/onboarding/operations/${encodeURIComponent(value('FLOW4_HAPPY_OPERATION_ID'))}`);
    await expect(page.getByText('Tenant created')).toBeVisible();
    await openRecipient(page, 'FLOW4_HAPPY_TOKEN'); await expect(page.getByText(/Payment approved|Submission received/)).toBeVisible();
    await loginAdmin(page); await openAdminPayment(page, 'FLOW4_HAPPY_PAYMENT_ID');
    await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Active', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Sent|Accepted/).last()).toBeVisible();
  });
});

function requireValues(...names) {
  const missing = names.filter((name) => !value(name));
  if (missing.length === 0) return;
  const reason = `Blocked by environment: missing ${missing.join(', ')}.`;
  if (releaseMode) throw new Error(reason);
  test.skip(true, reason);
}

async function login(page, email, password) {
  if (!email || !password) {
    const reason = 'Blocked by environment: login credentials are missing.';
    if (releaseMode) throw new Error(reason);
    test.skip(true, reason);
  }
  await page.goto(`${UI}/login`);
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/admin\//);
}

async function loginAdmin(page) {
  requireValues('FLOW4_ADMIN_EMAIL', 'FLOW4_ADMIN_PASSWORD');
  await login(page, value('FLOW4_ADMIN_EMAIL'), value('FLOW4_ADMIN_PASSWORD'));
}

async function openRecipient(page, tokenName) {
  requireValues(tokenName);
  await page.goto(`${UI}/payment/${encodeURIComponent(value(tokenName))}`);
}

async function openAdminPayment(page, idName) {
  requireValues(idName);
  await page.goto(`${UI}/admin/billing/manual-payments/${encodeURIComponent(value(idName))}`);
  await expect(page.getByRole('heading', { name: 'Manual payment review' })).toBeVisible();
}

async function completeReview(page, action, note = '') {
  await page.getByRole('button', { name: action }).click();
  if (note) await page.getByLabel('Actionable note').fill(note);
  await page.getByLabel(/I reviewed the expected amount/).check();
  await page.getByRole('button', { name: `Confirm ${action}` }).click();
}
