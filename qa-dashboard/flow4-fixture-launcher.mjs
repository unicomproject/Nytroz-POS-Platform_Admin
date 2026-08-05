import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { playwrightEnvironment, requireManifest } from './flow4-fixture-manifest.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const runId = process.env.FLOW4_TEST_RUN_ID || randomUUID();
const bootstrap = process.env.FLOW4_FIXTURE_BOOTSTRAP_CREDENTIAL;
if (!bootstrap || bootstrap.length < 43) throw new Error('FLOW4_FIXTURE_BOOTSTRAP_CREDENTIAL is required.');
const backendRoot = resolve(here, '..', '..', 'Nytroz Pos - Backend New', 'Unified-Commerce');
const cli = process.env.FLOW4_FIXTURE_CLI_DLL || resolve(backendRoot, 'tests', 'E_POS.Flow4FixtureCli', 'bin', 'Debug', 'net10.0', 'E_POS.Flow4FixtureCli.dll');
const scenarios = [
  'AWAITING_PAYMENT', 'PAYMENT_SUBMITTED', 'ACTION_REQUIRED', 'REJECTED', 'APPROVABLE_PAYMENT',
  'REJECTABLE_PAYMENT', 'REQUEST_INFORMATION_ELIGIBLE', 'CONCURRENT_REVIEW', 'UNCLEAN_EVIDENCE',
  'NOTIFICATION_FAILED', 'PAID_PENDING_ACTIVATION', 'ACTIVE_INVITATION_READY', 'RETRYABLE_OPERATION',
  'EXPIRED_PAYMENT_ACCESS', 'REVOKED_PAYMENT_ACCESS', 'CROSS_TENANT_PROOF', 'COMPLETE_HAPPY_PATH'
];

function runCli(command, input, extra = []) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('dotnet', [cli, command, '--run-id', runId, ...extra], {
      cwd: backendRoot, env: process.env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true
    });
    const stdout = []; const stderr = [];
    child.stdout.on('data', chunk => stdout.push(chunk));
    child.stderr.on('data', chunk => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) return reject(new Error(`Flow 4 fixture ${command} failed (${code}): ${Buffer.concat(stderr).toString('utf8').trim()}`));
      resolvePromise(Buffer.concat(stdout).toString('utf8'));
    });
    child.stdin.end(JSON.stringify(input));
  });
}

function runPlaywright(env) {
  const forwarded = process.argv.slice(2);
  const focused = 'recipient opens secure payment status|user without billing view|billing-view-only user|expired payment link|revoked payment link';
  const args = ['playwright', 'test', 'manual-payment.e2e.spec.mjs', '--config', 'playwright.config.mjs', '--grep', focused, ...forwarded];
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, { cwd: here, env, stdio: 'inherit', windowsHide: true });
    child.on('error', reject); child.on('close', code => code === 0 ? resolvePromise() : reject(new Error(`Focused Playwright exited with ${code}.`)));
  });
}

let manifest;
try {
  const flags = scenarios.flatMap(value => ['--scenario', value]);
  manifest = requireManifest(JSON.parse(await runCli('create', { bootstrapCredential: bootstrap }, flags)), runId);
  await runPlaywright(playwrightEnvironment(manifest, process.env, here));
} finally {
  if (manifest?.cleanup?.handle) {
    await runCli('cleanup', { bootstrapCredential: bootstrap, cleanupHandle: manifest.cleanup.handle });
  }
}
