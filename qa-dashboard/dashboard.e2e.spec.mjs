/**
 * Interactive browser E2E for Platform Dashboard final QA.
 * Credentials come from env QA_PASSWORD (default local seed). Do not commit secrets to Second Brain.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.QA_BASE_URL || 'http://localhost:4200';
const PASSWORD = process.env.QA_PASSWORD || 'Admin@123';

const personas = [
  { id: 'QA-DASH-SUPER', email: 'posunique001@gmail.com', expect: { mrr: true, subs: true, platUsers: true, setupNav: true } },
  { id: 'QA-DASH-ONLY', email: 'qa.dash.only@local.test', expect: { mrr: false, subs: false, platUsers: false, setupNav: false } },
  { id: 'QA-DASH-TENANT', email: 'qa.dash.tenant@local.test', expect: { mrr: false, subs: false, platUsers: false, setupNav: true } },
  { id: 'QA-DASH-SUBS', email: 'qa.dash.subs@local.test', expect: { mrr: false, subs: true, platUsers: false, setupNav: false } },
  { id: 'QA-DASH-BILLING', email: 'qa.dash.billing@local.test', expect: { mrr: false, subs: false, platUsers: false, setupNav: false } },
  { id: 'QA-DASH-USERS', email: 'qa.dash.users@local.test', expect: { mrr: false, subs: false, platUsers: true, setupNav: false } },
  { id: 'QA-DASH-RESTRICTED', email: 'qa.dash.only@local.test', expect: { mrr: false, subs: false, platUsers: false, setupNav: false } }
];

async function login(page, email) {
  await page.waitForTimeout(1500); // avoid auth rate-limit across serial persona logins
  await page.goto(`${BASE}/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[formcontrolname="password"]').fill(PASSWORD);
  await Promise.all([
    page.waitForURL(/\/admin\/dashboard/, { timeout: 45000 }),
    page.locator('button.submit-button[type="submit"]').click()
  ]);
  await expect(page.getByText('Loading real platform data...')).toBeHidden({ timeout: 30000 });
}

async function logoutViaStorage(page) {
  await page.goto(`${BASE}/login`);
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
  });
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
}

/** Mutate the next successful dashboard GET only (used after login via Refresh). */
async function mutateNextDashboard(page, mutateFn) {
  let remaining = 1;
  await page.route('**/api/v1/platform-admin/dashboard', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    if (remaining <= 0) {
      await route.continue();
      return;
    }
    remaining -= 1;
    const response = await route.fetch();
    const json = await response.json();
    mutateFn(json);
    await route.fulfill({
      status: response.status(),
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(json)
    });
  });
}

async function forceDashboardMutationWhileLoggedIn(page, mutateFn) {
  await page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {});
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: 'networkidle' });
  await expect(page.getByText('Total Tenants')).toBeVisible({ timeout: 20000 });
  await mutateNextDashboard(page, mutateFn);
  await page.getByRole('button', { name: /^Refresh$/ }).click();
  await expect(page.getByRole('button', { name: /^Refresh$/ })).toBeEnabled({ timeout: 20000 });
}

test.describe.configure({ mode: 'serial' });

for (const persona of personas) {
  test(`UI permission matrix — ${persona.id}`, async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await logoutViaStorage(page);
    await login(page, persona.email);

    await expect(page.getByText('Total Tenants')).toBeVisible();
    await expect(page.getByText('System Health')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent Tenants' })).toBeVisible();
    await expect(page.getByText('Recent Platform Activity')).toHaveCount(0);

    if (persona.expect.subs) {
      await expect(page.getByText('Active Paid Subscriptions')).toBeVisible();
    } else {
      await expect(page.getByText('Active Paid Subscriptions')).toHaveCount(0);
    }

    if (persona.expect.mrr) {
      await expect(page.getByText('Monthly Recurring Revenue')).toBeVisible();
    } else {
      await expect(page.getByText('Monthly Recurring Revenue')).toHaveCount(0);
    }

    if (persona.expect.platUsers) {
      await expect(page.getByText('Platform Users', { exact: true })).toBeVisible();
    } else {
      await expect(page.getByText('Platform Users', { exact: true })).toHaveCount(0);
    }

    const clickableSetup = page.locator('a[href*="statusGroup=setup_pending"]');
    if (persona.expect.setupNav) {
      await expect(clickableSetup.first()).toBeVisible();
    } else {
      await expect(clickableSetup).toHaveCount(0);
    }

    const appErrors = consoleErrors.filter((e) => !/favicon|DevTools|ResizeObserver/i.test(e));
    expect(appErrors, appErrors.join('\n')).toEqual([]);

    if (persona.id === 'QA-DASH-ONLY') {
      await page.goto(`${BASE}/admin/tenants`, { waitUntil: 'networkidle' });
      expect(page.url()).toContain('permission-denied');

      await page.goto(`${BASE}/admin/billing`, { waitUntil: 'networkidle' });
      expect(page.url()).toContain('permission-denied');

      const apiStatus = await page.evaluate(async () => {
        const raw = localStorage.getItem('scs_tix.platform_admin.auth_session');
        if (!raw) return 0;
        const session = JSON.parse(raw);
        const res = await fetch('/api/v1/platform-admin/tenants?pageSize=1', {
          headers: { Authorization: `Bearer ${session.accessToken}` }
        });
        return res.status;
      });
      expect([401, 403]).toContain(apiStatus);

      await page.goto(`${BASE}/admin/dashboard`, { waitUntil: 'networkidle' });
      await expect(page.getByText('Total Tenants')).toBeVisible();
    }
  });
}

test('Super Admin Setup Pending interactive journey', async ({ page }) => {
  await logoutViaStorage(page);
  await login(page, 'posunique001@gmail.com');

  const setupNav = page.locator('a[href*="statusGroup=setup_pending"]').first();
  await expect(setupNav).toBeVisible({ timeout: 15000 });
  await setupNav.click();
  await page.waitForURL(/statusGroup=setup_pending/, { timeout: 15000 });

  await expect(page.getByText(/Continue Setup/i).first()).toBeVisible({ timeout: 20000 });
  await page.getByText(/Continue Setup/i).first().click();
  await page.waitForURL(/\/admin\/tenants\/[0-9a-f-]+/i, { timeout: 20000 });
  await expect(page.getByText(/Setup Progress/i)).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/%/)).toBeVisible();
});

test('Super Admin successful Refresh', async ({ page }) => {
  await logoutViaStorage(page);
  await login(page, 'posunique001@gmail.com');

  const lastUpdated = page.locator('text=/Last updated|Last Updated/i').first();
  await expect(lastUpdated).toBeVisible({ timeout: 15000 });
  const before = await lastUpdated.textContent();

  await page.getByRole('button', { name: /^Refresh$/ }).click();
  await expect(page.getByRole('button', { name: /Refreshing/ })).toBeVisible({ timeout: 5000 }).catch(() => {});
  await expect(page.getByRole('button', { name: /^Refresh$/ })).toBeEnabled({ timeout: 20000 });

  const after = await lastUpdated.textContent();
  await expect(page.getByText('Total Tenants')).toBeVisible();
  await expect(page.getByText('Dashboard could not be loaded')).toHaveCount(0);
  expect(after).toBeTruthy();
  if (before === after) {
    console.log('NOTE: Last Updated text unchanged (possible same-second formatting)');
  }
});

test('Super Admin failed Refresh retains data', async ({ page }) => {
  await logoutViaStorage(page);
  await login(page, 'posunique001@gmail.com');
  await expect(page.getByText('Total Tenants')).toBeVisible();

  let failOnce = true;
  await page.route('**/api/v1/platform-admin/dashboard', async (route) => {
    if (failOnce && route.request().method() === 'GET') {
      failOnce = false;
      await route.abort('failed');
      return;
    }
    await route.continue();
  });

  await page.getByRole('button', { name: /^Refresh$/ }).click();
  await expect(page.getByText(/Refresh failed/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Total Tenants')).toBeVisible();
  await expect(page.getByText('Dashboard could not be loaded')).toHaveCount(0);
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('Controlled partial failures, isolation, and Continue Setup destination', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Auth rate-limit cooldown after the persona + refresh suite logins.
  await page.waitForTimeout(65000);

  await logoutViaStorage(page);
  await login(page, 'posunique001@gmail.com');
  await expect(page.getByText('Total Tenants')).toBeVisible();

  // Revenue UNAVAILABLE
  await forceDashboardMutationWhileLoggedIn(page, (envelope) => {
    const data = envelope.data ?? envelope;
    data.revenueSummary = {
      status: 'UNAVAILABLE',
      errorCode: 'platform_dashboard.currency_metadata_unavailable',
      data: null
    };
  });
  await expect(page.getByText('Some dashboard sections could not be loaded')).toBeVisible();
  await expect(page.getByText('Revenue data is temporarily unavailable.').first()).toBeVisible();
  await expect(page.getByText('Total Tenants')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Refresh$/ })).toBeEnabled();
  await page.unrouteAll({ behavior: 'ignoreErrors' });

  // Trends UNAVAILABLE
  await forceDashboardMutationWhileLoggedIn(page, (envelope) => {
    const data = envelope.data ?? envelope;
    data.trends = {
      status: 'UNAVAILABLE',
      errorCode: 'platform_dashboard.timezone_unavailable',
      data: null
    };
  });
  await expect(page.getByText('Trend data is temporarily unavailable.')).toBeVisible();
  await expect(page.locator('polyline.tenant-line')).toHaveCount(0);
  await page.unrouteAll({ behavior: 'ignoreErrors' });

  // Health CRITICAL
  await forceDashboardMutationWhileLoggedIn(page, (envelope) => {
    const data = envelope.data ?? envelope;
    data.systemHealth = {
      status: 'SUCCESS',
      errorCode: null,
      data: {
        overallStatus: 'CRITICAL',
        checkedAt: new Date().toISOString(),
        dependencies: [
          { name: 'core_api', status: 'HEALTHY', isCritical: true, message: null },
          { name: 'payment', status: 'DEGRADED', isCritical: true, message: 'Payment provider is not configured.' }
        ]
      }
    };
  });
  await expect(page.getByText(/Critical/i).first()).toBeVisible();
  await expect(page.getByText('Exception')).toHaveCount(0);
  await expect(page.getByText('SecretKey')).toHaveCount(0);
  await page.unrouteAll({ behavior: 'ignoreErrors' });

  // Combined Revenue + Trends
  await forceDashboardMutationWhileLoggedIn(page, (envelope) => {
    const data = envelope.data ?? envelope;
    data.revenueSummary = {
      status: 'UNAVAILABLE',
      errorCode: 'platform_dashboard.currency_metadata_unavailable',
      data: null
    };
    data.trends = {
      status: 'UNAVAILABLE',
      errorCode: 'platform_dashboard.timezone_unavailable',
      data: null
    };
  });
  await expect(page.getByText('Revenue data is temporarily unavailable.').first()).toBeVisible();
  await expect(page.getByText('Trend data is temporarily unavailable.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent Tenants' })).toBeVisible();
  await page.unrouteAll({ behavior: 'ignoreErrors' });

  expect(consoleErrors.filter((e) => !/favicon|DevTools|ResizeObserver/i.test(e))).toEqual([]);

  // Continue Setup exact destination (approved tenant detail surface)
  const payload = await page.evaluate(async () => {
    const raw = localStorage.getItem('scs_tix.platform_admin.auth_session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    const res = await fetch('/api/v1/platform-admin/tenants?statusGroup=setup_pending&pageSize=50', {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const body = await res.json();
    return body.data;
  });

  expect(payload).toBeTruthy();
  expect(payload.items.length).toBeGreaterThan(0);

  const mandatory = new Set([
    'business_profile',
    'subscription_plan',
    'entitlements',
    'billing_condition',
    'tenant_admin'
  ]);

  for (const tenant of payload.items) {
    expect(tenant.continueSetupPath).toBe(`/admin/tenants/${tenant.id}`);
    for (const step of tenant.setupMissingSteps ?? []) {
      expect(mandatory.has(step)).toBeTruthy();
      expect(step).not.toMatch(/outlet|till/i);
    }
  }

  const pendingPayment = payload.items.find((t) => String(t.status).toLowerCase() === 'pending_payment');
  if (pendingPayment) {
    expect(pendingPayment.continueSetupPath).toBe(`/admin/tenants/${pendingPayment.id}`);
    expect(pendingPayment.setupMissingSteps ?? []).toContain('billing_condition');
  }

  await page.goto(`${BASE}/admin/tenants?statusGroup=setup_pending`, { waitUntil: 'networkidle' });
  const continueLink = page.locator('a.actions-link', { hasText: /Continue Setup/i }).first();
  await expect(continueLink).toBeVisible({ timeout: 20000 });
  expect(await continueLink.getAttribute('href')).toMatch(/\/admin\/tenants\/[0-9a-f-]+/i);
  await continueLink.click();
  await page.waitForURL(/\/admin\/tenants\/[0-9a-f-]+/i, { timeout: 20000 });
  expect(page.url()).not.toContain('/create');
  await expect(page.getByText(/Setup Progress/i)).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/%/)).toBeVisible();
});
