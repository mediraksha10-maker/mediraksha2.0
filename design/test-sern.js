#!/usr/bin/env node
/**
 * SERN Smoke Test Suite — Week 1 · Week 2 · Week 3
 *
 * USAGE
 *   Step 1  node design/test-sern.js            ← registers test user, patches .env
 *            → restart your backend (Ctrl+C then node src/server.js in backend/)
 *   Step 2  node design/test-sern.js --run      ← runs all 25+ tests
 *
 *   Or, if the backend already has ADMIN_USER_IDS set for the saved user:
 *           node design/test-sern.js --run
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname }  from 'node:path';
import { fileURLToPath }  from 'node:url';

const __dirname   = dirname(fileURLToPath(import.meta.url));
const ROOT        = join(__dirname, '..');
const ENV_FILE    = join(ROOT, 'backend', '.env');
const STATE_FILE  = join(__dirname, '.test-state.json');
const BASE_URL    = 'http://localhost:3000/api';
const RUN_MODE    = process.argv.includes('--run');

// ── ANSI ──────────────────────────────────────────────────────────────────────
const G = '\x1b[32m', R = '\x1b[31m', C = '\x1b[36m',
      D = '\x1b[2m',  B = '\x1b[1m',  Z = '\x1b[0m';

// ── HTTP (manual cookie jar) ──────────────────────────────────────────────────
let cookie = '';

async function api(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const sc  = res.headers.get('set-cookie');
  if (sc) { const m = sc.match(/token=([^;]+)/); if (m) cookie = `token=${m[1]}`; }
  let json = {};
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}

// ── Test runner ───────────────────────────────────────────────────────────────
const results = [];
const t0 = Date.now();

async function test(label, fn) {
  let r;
  try        { r = await fn(); }
  catch (e)  { r = nok(e.message); }
  const icon = r.ok ? `${G}✓ PASS${Z}` : `${R}✗ FAIL${Z}`;
  console.log(`  ${icon}  ${label}`);
  if (r.note)  console.log(`         ${D}${r.note}${Z}`);
  if (!r.ok)   console.log(`         ${R}${r.reason}${Z}`);
  results.push({ label, passed: r.ok, reason: r.reason });
}

const ok  = (note)   => ({ ok: true,  note });
const nok = (reason) => ({ ok: false, reason });

function section(title) {
  const pad = Math.max(0, 48 - title.length);
  console.log(`\n${B}${C}── ${title} ${'─'.repeat(pad)}${Z}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function patchEnv(userId) {
  let env = readFileSync(ENV_FILE, 'utf8');
  if (/^ADMIN_USER_IDS=/m.test(env)) {
    env = env.replace(/^ADMIN_USER_IDS=.*/m, `ADMIN_USER_IDS=${userId}`);
  } else {
    env = env.trimEnd() + `\nADMIN_USER_IDS=${userId}\n`;
  }
  writeFileSync(ENV_FILE, env);
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadState() {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  }
  return null;
}

async function checkServerUp() {
  try {
    const r = await fetch(BASE_URL.replace('/api', '/api'));
    return r.ok;
  } catch { return false; }
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 1 — SETUP  (run without --run flag)
// ══════════════════════════════════════════════════════════════════════════════
if (!RUN_MODE) {
  console.log(`\n${B}SERN Smoke Test — Setup Phase${Z}\n`);

  const up = await checkServerUp();
  if (!up) {
    console.error(`${R}✗ Backend is not running on ${BASE_URL}${Z}`);
    console.error(`  Start it first:  cd backend && node src/server.js\n`);
    process.exit(1);
  }

  // If state already exists, just re-patch and remind
  const existing = loadState();
  if (existing) {
    console.log(`${D}Found existing test state: user ID ${existing.userId}${Z}`);
    patchEnv(existing.userId);
    console.log(`${G}✓ .env patched → ADMIN_USER_IDS=${existing.userId}${Z}`);
    console.log(`\n${B}Restart the backend, then run:${Z}`);
    console.log(`  node design/test-sern.js --run\n`);
    process.exit(0);
  }

  // Register fresh test user
  const EMAIL = `sern-test-${Date.now()}@smoke.local`;
  const PASS  = 'SernSmoke@123';

  console.log(`${D}Registering test user…${Z}`);
  const r = await api('POST', '/auth/signup', {
    name: 'SERN Smoke', email: EMAIL, password: PASS,
    age: 28, gender: 'male', number: '9000000001',
  });

  if (!r.body?.success) {
    console.error(`${R}✗ Signup failed: ${r.body?.message}${Z}`);
    process.exit(1);
  }

  const userId = r.body.user.id;
  console.log(`${G}✓ User created — ID: ${userId}  email: ${EMAIL}${Z}`);

  patchEnv(userId);
  console.log(`${G}✓ backend/.env → ADMIN_USER_IDS=${userId}${Z}`);

  saveState({ userId, email: EMAIL, password: PASS });
  console.log(`${G}✓ Credentials saved to design/.test-state.json${Z}`);

  console.log(`\n${'─'.repeat(52)}`);
  console.log(`${B}Next steps:${Z}`);
  console.log(`  1.  Restart the backend:`);
  console.log(`        Ctrl+C  (stop current server)`);
  console.log(`        cd "C:/SASHU/Engg/mediraksha abhi/mediraksha2.0/backend"`);
  console.log(`        node src/server.js`);
  console.log(`  2.  Run the tests:`);
  console.log(`        node design/test-sern.js --run`);
  console.log(`${'─'.repeat(52)}\n`);
  process.exit(0);
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — RUN TESTS  (node test-sern.js --run)
// ══════════════════════════════════════════════════════════════════════════════
console.log(`\n${B}SERN Smoke Test Suite${Z}  ${D}Week 1 · Week 2 · Week 3${Z}`);
console.log(`${D}Target: ${BASE_URL}${Z}`);

// Check backend is up
const up = await checkServerUp();
if (!up) {
  console.error(`\n${R}✗ Backend not reachable at ${BASE_URL}${Z}`);
  console.error(`  Run:  cd backend && node src/server.js\n`);
  process.exit(1);
}

// Load credentials
const state = loadState();
if (!state) {
  console.error(`\n${R}✗ No test state found. Run setup first:${Z}`);
  console.error(`  node design/test-sern.js\n`);
  process.exit(1);
}

// Login
const loginR = await api('POST', '/auth/login', { email: state.email, password: state.password });
if (!loginR.body?.success) {
  console.error(`\n${R}✗ Login failed: ${loginR.body?.message}${Z}`);
  console.error(`  Try re-running setup: node design/test-sern.js\n`);
  process.exit(1);
}
console.log(`\n${G}[auth] Logged in as user ID: ${state.userId}${Z}`);

// Verify admin access early (fail fast with a clear message)
const adminCheck = await api('GET', `/hospitals/nearby?latitude=12.9716&longitude=77.5946&radius=1`);
if (adminCheck.status === 403) {
  console.error(`\n${R}✗ No admin access (HTTP 403).${Z}`);
  console.error(`  Make sure backend was restarted AFTER running setup.`);
  console.error(`  backend/.env should contain: ADMIN_USER_IDS=${state.userId}\n`);
  process.exit(1);
}
console.log(`${G}[auth] Admin access confirmed (SUPER_ADMIN via whitelist).${Z}`);

// ── Shared IDs across tests ───────────────────────────────────────────────────
let contactId              = null;
let emergencyId            = null;
let emergencyToken         = null;
let hospitalId             = null;
let ambulanceId            = null;
let ambulanceAssignmentId  = null;

// ══════════════════════════════════════════════════════════════════════════════
// WEEK 1 — Emergency Core
// ══════════════════════════════════════════════════════════════════════════════
section('Week 1 — Emergency Core');

await test('POST /emergency/contacts — add contact', async () => {
  const r = await api('POST', '/emergency/contacts', {
    contact_name: 'Smoke Contact', contact_phone: '9876543210', relationship: 'Friend',
  });
  if (r.status !== 201 && r.status !== 200)
    return nok(`HTTP ${r.status}: ${r.body?.message}`);
  contactId = r.body?.data?.id ?? null;
  return ok(`contact_id: ${contactId}`);
});

await test('GET /emergency/contacts — list contacts', async () => {
  const r = await api('GET', '/emergency/contacts');
  if (r.status !== 200) return nok(`HTTP ${r.status}`);
  const list = r.body?.data ?? r.body?.contacts ?? [];
  if (!Array.isArray(list)) return nok('data is not an array');
  return ok(`${list.length} contact(s)`);
});

await test('POST /emergency/create — trigger SOS', async () => {
  const r = await api('POST', '/emergency/create', {
    latitude: 12.9716, longitude: 77.5946, location_accuracy: 12,
  });
  if (r.status !== 201) return nok(`HTTP ${r.status}: ${r.body?.message}`);
  const d = r.body?.data ?? r.body;
  if (!d?.emergency_id) return nok('no emergency_id in response');
  emergencyId    = d.emergency_id;
  emergencyToken = d.emergency_token;
  return ok(`id: ${emergencyId}`);
});

await test('GET /emergency/:id — fetch details', async () => {
  if (!emergencyId) return nok('skipped — no emergencyId');
  const r = await api('GET', `/emergency/${emergencyId}`);
  if (r.status !== 200) return nok(`HTTP ${r.status}: ${r.body?.message}`);
  const status = r.body?.data?.status ?? r.body?.emergency?.status;
  return ok(`status: ${status}`);
});

await test('GET /emergency/:id/timeline — fetch events', async () => {
  if (!emergencyId) return nok('skipped — no emergencyId');
  const r = await api('GET', `/emergency/${emergencyId}/timeline`);
  if (r.status !== 200) return nok(`HTTP ${r.status}`);
  const ev = r.body?.data ?? r.body?.timeline ?? r.body?.events ?? [];
  return ok(`${Array.isArray(ev) ? ev.length : '?'} event(s)`);
});

await test('GET /emergency/token/:token — validate token (public)', async () => {
  if (!emergencyToken) return nok('skipped — no emergencyToken');
  const r = await api('GET', `/emergency/token/${emergencyToken}`);
  if (r.status !== 200) return nok(`HTTP ${r.status}: ${r.body?.message}`);
  return ok();
});

// ══════════════════════════════════════════════════════════════════════════════
// WEEK 2 — Hospital Intelligence
// ══════════════════════════════════════════════════════════════════════════════
section('Week 2 — Hospital Intelligence');

await test('POST /hospitals — create hospital (admin)', async () => {
  const r = await api('POST', '/hospitals', {
    hospital_name:  `Smoke Hospital ${Date.now()}`,
    hospital_type:  'PRIVATE',
    address:        '1 Test Lane',
    city:           'Bangalore',
    state:          'Karnataka',
    pincode:        '560001',
    country:        'India',
    latitude:       12.9716,
    longitude:      77.5946,
    phone:          '08011112222',
    email:          `smoke-${Date.now()}@hospital.test`,
    is_active:      true,
  });
  if (r.status !== 201) return nok(`HTTP ${r.status}: ${r.body?.message}`);
  hospitalId = r.body?.data?.id ?? r.body?.hospital?.id;
  if (!hospitalId) return nok('no hospital id in response');
  return ok(`id: ${hospitalId}`);
});

await test('GET /hospitals/:id — fetch hospital', async () => {
  if (!hospitalId) return nok('skipped — no hospitalId');
  const r = await api('GET', `/hospitals/${hospitalId}`);
  if (r.status !== 200) return nok(`HTTP ${r.status}`);
  return ok(r.body?.data?.name ?? r.body?.hospital?.name);
});

await test('GET /hospitals/nearby — geospatial search', async () => {
  const r = await api('GET', '/hospitals/nearby?latitude=12.9716&longitude=77.5946&radius=50');
  if (r.status !== 200) return nok(`HTTP ${r.status}: ${r.body?.message}`);
  const list = r.body?.data ?? r.body?.hospitals ?? [];
  return ok(`${Array.isArray(list) ? list.length : '?'} result(s)`);
});

await test('GET /hospitals/search — text search', async () => {
  const r = await api('GET', '/hospitals/search?q=Smoke');
  if (r.status !== 200) return nok(`HTTP ${r.status}: ${r.body?.message}`);
  return ok();
});

await test('POST /hospitals/:id/facilities — add facility (admin)', async () => {
  if (!hospitalId) return nok('skipped — no hospitalId');
  const r = await api('POST', `/hospitals/${hospitalId}/facilities`, {
    facility_code: 'MRI-01',
    facility_name: 'MRI Scanner',
    facility_type: 'MRI',
    is_available:  true,
  });
  if (r.status !== 201 && r.status !== 200)
    return nok(`HTTP ${r.status}: ${r.body?.message}`);
  return ok();
});

await test('GET /hospitals/:id/facilities — list facilities', async () => {
  if (!hospitalId) return nok('skipped — no hospitalId');
  const r = await api('GET', `/hospitals/${hospitalId}/facilities`);
  if (r.status !== 200) return nok(`HTTP ${r.status}`);
  return ok();
});

await test('POST /emergency/:id/match-hospital — auto-match nearest', async () => {
  if (!emergencyId) return nok('skipped — no emergencyId');
  const r = await api('POST', `/emergency/${emergencyId}/match-hospital`, {
    latitude: 12.9716, longitude: 77.5946, radius_km: 50,
  });
  if (![200, 404, 409].includes(r.status))
    return nok(`HTTP ${r.status}: ${r.body?.message}`);
  const note = r.status === 200
    ? `matched: ${r.body?.data?.hospital?.name ?? r.body?.data?.name ?? '?'}`
    : `no match or already matched (${r.status})`;
  return ok(note);
});

// ══════════════════════════════════════════════════════════════════════════════
// WEEK 3 — Ambulance Infrastructure
// ══════════════════════════════════════════════════════════════════════════════
section('Week 3 — Ambulance Infrastructure');

await test('POST /ambulances — create ambulance (admin)', async () => {
  const r = await api('POST', '/ambulances', {
    registration_number: `KA01SM${Date.now().toString().slice(-5)}`,
    ambulance_type:      'ALS',
    ownership_type:      'GOVERNMENT',
  });
  if (r.status !== 201) return nok(`HTTP ${r.status}: ${r.body?.message}`);
  ambulanceId = r.body?.data?.id;
  if (!ambulanceId) return nok('no ambulance id in response');
  return ok(`id: ${ambulanceId}  code: ${r.body?.data?.ambulance_code}`);
});

await test('GET /ambulances/:id — fetch ambulance', async () => {
  if (!ambulanceId) return nok('skipped — no ambulanceId');
  const r = await api('GET', `/ambulances/${ambulanceId}`);
  if (r.status !== 200) return nok(`HTTP ${r.status}`);
  return ok(r.body?.data?.ambulance_code ?? r.body?.data?.registration_number);
});

await test('POST /ambulances/:id/drivers — link test user as driver (admin)', async () => {
  if (!ambulanceId) return nok('skipped — no ambulanceId');
  const r = await api('POST', `/ambulances/${ambulanceId}/drivers`, {
    driver_name:    'Smoke Driver',
    phone:          '9111111111',
    license_number: `DL-SMOKE-${Date.now()}`,
    user_id:        state.userId,
  });
  if (r.status !== 201) return nok(`HTTP ${r.status}: ${r.body?.message}`);
  return ok(`driver_id: ${r.body?.data?.id}`);
});

await test('GET /ambulances/:id/drivers — list drivers (admin)', async () => {
  if (!ambulanceId) return nok('skipped — no ambulanceId');
  const r = await api('GET', `/ambulances/${ambulanceId}/drivers`);
  if (r.status !== 200) return nok(`HTTP ${r.status}`);
  return ok(`${r.body?.data?.length ?? r.body?.count ?? 0} driver(s)`);
});

await test('PATCH /ambulances/:id/status — AVAILABLE → OFFLINE', async () => {
  if (!ambulanceId) return nok('skipped — no ambulanceId');
  const r = await api('PATCH', `/ambulances/${ambulanceId}/status`, { status: 'OFFLINE' });
  if (r.status !== 200) return nok(`HTTP ${r.status}: ${r.body?.message}`);
  return ok(`→ ${r.body?.data?.current_status}`);
});

await test('PATCH /ambulances/:id/status — OFFLINE → AVAILABLE', async () => {
  if (!ambulanceId) return nok('skipped — no ambulanceId');
  const r = await api('PATCH', `/ambulances/${ambulanceId}/status`, { status: 'AVAILABLE' });
  if (r.status !== 200) return nok(`HTTP ${r.status}: ${r.body?.message}`);
  return ok(`→ ${r.body?.data?.current_status}`);
});

await test('POST /ambulances/:id/location — push GPS (driver route)', async () => {
  if (!ambulanceId) return nok('skipped — no ambulanceId');
  const r = await api('POST', `/ambulances/${ambulanceId}/location`, {
    latitude: 12.9716, longitude: 77.5946, accuracy: 8, speed: 25, heading: 180,
  });
  if (r.status !== 200) return nok(`HTTP ${r.status}: ${r.body?.message}`);
  return ok('coordinates stored');
});

await test('GET /ambulances/:id/location — get current location (public)', async () => {
  if (!ambulanceId) return nok('skipped — no ambulanceId');
  const r = await api('GET', `/ambulances/${ambulanceId}/location`);
  if (r.status !== 200) return nok(`HTTP ${r.status}`);
  const loc = r.body?.data?.current ?? r.body?.data;
  return ok(`${loc?.current_latitude}, ${loc?.current_longitude}`);
});

await test('GET /ambulances/nearby — geospatial search (public)', async () => {
  const r = await api('GET', '/ambulances/nearby?latitude=12.9716&longitude=77.5946&radius=50');
  if (r.status !== 200) return nok(`HTTP ${r.status}: ${r.body?.message}`);
  const count = r.body?.data?.length ?? r.body?.count ?? 0;
  return ok(`${count} ambulance(s) found`);
});

await test('GET /ambulances/:id/location/history — replay track (admin)', async () => {
  if (!ambulanceId) return nok('skipped — no ambulanceId');
  const r = await api('GET', `/ambulances/${ambulanceId}/location/history`);
  if (r.status !== 200) return nok(`HTTP ${r.status}`);
  return ok(`${r.body?.data?.length ?? r.body?.count ?? 0} point(s)`);
});

await test('POST /emergency/:id/match-ambulance — auto-dispatch', async () => {
  if (!emergencyId) return nok('skipped — no emergencyId');
  const r = await api('POST', `/emergency/${emergencyId}/match-ambulance`);
  if (r.status === 200) {
    ambulanceAssignmentId =
      r.body?.data?.assignment?.id   ??
      r.body?.data?.assignment_id     ??
      r.body?.data?.id                ?? null;
    return ok(`assignment_id: ${ambulanceAssignmentId}`);
  }
  if (r.status === 404) return ok('no AVAILABLE ambulance in range (routing OK, 0 results)');
  if (r.status === 409) return ok('already has active assignment (idempotency OK)');
  return nok(`HTTP ${r.status}: ${r.body?.message}`);
});

await test('GET /ambulances/assignments/:id — fetch assignment (admin)', async () => {
  if (!ambulanceAssignmentId) return nok('skipped — match returned 404/409');
  const r = await api('GET', `/ambulances/assignments/${ambulanceAssignmentId}`);
  if (r.status !== 200) return nok(`HTTP ${r.status}: ${r.body?.message}`);
  return ok(`status: ${r.body?.data?.assignment_status}`);
});

await test('POST /ambulances/assignments/:id/status — driver ACCEPTS', async () => {
  if (!ambulanceAssignmentId) return nok('skipped — no assignment');
  const r = await api('POST', `/ambulances/assignments/${ambulanceAssignmentId}/status`, {
    status: 'ACCEPTED',
  });
  if (r.status !== 200) return nok(`HTTP ${r.status}: ${r.body?.message}`);
  return ok(`→ ${r.body?.data?.assignment_status}`);
});

// ── Cleanup ───────────────────────────────────────────────────────────────────
section('Cleanup');

await test('POST /emergency/:id/cancel — terminate emergency', async () => {
  if (!emergencyId) return nok('skipped — no emergencyId');
  const r = await api('POST', `/emergency/${emergencyId}/cancel`);
  if (r.status !== 200 && r.status !== 409)
    return nok(`HTTP ${r.status}: ${r.body?.message}`);
  return ok(r.status === 409 ? 'blocked (assignment active — expected)' : 'cancelled');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════════════════════════════════════
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
const passed  = results.filter(r => r.passed).length;
const failed  = results.filter(r => !r.passed).length;

console.log(`\n${B}${'═'.repeat(52)}${Z}`);
console.log(`${B}  ${passed + failed} tests   ${G}${passed} passed${Z}   ${failed > 0 ? R : D}${failed} failed${Z}   ${D}${elapsed}s${Z}`);
console.log(`${B}${'═'.repeat(52)}${Z}`);

if (failed > 0) {
  console.log(`\n${R}${B}Failed tests:${Z}`);
  results.filter(r => !r.passed).forEach(r =>
    console.log(`  ${R}✗${Z}  ${r.label}${r.reason ? `\n       ${D}${r.reason}${Z}` : ''}`)
  );
}

console.log();
process.exit(failed > 0 ? 1 : 0);
