/**
 * API ENDPOINT TEST REPORT
 * Generated: 2026-07-03
 */

import https from 'https';

const API_URL = 'https://app-pis-api-production.andre-setiawanworkersdev.workers.dev';

const test = async (method, path, body = null, token = null) => {
  return new Promise((resolve) => {
    const urlObj = new URL(`${API_URL}${path}`);
    const options = {
      method,
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://base44-app-5pg.pages.dev'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => resolve({ error: err.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

const main = async () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   API ENDPOINT TEST REPORT - APP-PIS Production');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Get token first
  console.log('Authenticating...');
  const loginResult = await test('POST', '/api/auth/login', { nik: '123456', password: '123456' }, null);
  const token = loginResult.data?.token;
  console.log(`✓ Authenticated as: ${loginResult.data?.employee?.nama_lengkap}\n`);

  const results = {
    implemented: [],
    notImplemented: [],
    errors: []
  };

  // Test implemented endpoints
  const implementedTests = [
    { method: 'GET', path: '/health', name: 'Health Check', auth: false },
    { method: 'POST', path: '/api/auth/login', name: 'Login', auth: false, body: { nik: '123456', password: '123456' } },
    { method: 'GET', path: '/api/auth/me', name: 'Get Current User', auth: true },
    { method: 'POST', path: '/api/auth/logout', name: 'Logout', auth: true },
    { method: 'GET', path: '/api/employees', name: 'List Employees', auth: true },
    { method: 'GET', path: '/api/employees/nik/123456', name: 'Get Employee by NIK', auth: true },
  ];

  const notImplementedTests = [
    { method: 'GET', path: '/api/attendance', name: 'List Attendance' },
    { method: 'GET', path: '/api/shifts', name: 'List Shifts' },
    { method: 'GET', path: '/api/leaves', name: 'List Leave Requests' },
    { method: 'GET', path: '/api/tickets', name: 'List Facility Tickets' },
    { method: 'GET', path: '/api/payslips', name: 'List Payslips' },
  ];

  console.log('IMPLEMENTED ENDPOINTS:');
  console.log('─────────────────────────────────────────────────────────');
  for (const testCase of implementedTests) {
    const result = await test(testCase.method, testCase.path, testCase.body, testCase.auth ? token : null);
    const status = result.status || '?';
    const pass = status >= 200 && status < 300;
    const icon = pass ? '✅' : '❌';
    console.log(`${icon} ${testCase.method.padEnd(6)} ${testCase.path.padEnd(30)} (${status})`);
    if (pass) {
      results.implemented.push({ ...testCase, status });
    } else {
      results.errors.push({ ...testCase, status });
    }
  }

  console.log('\nNOT YET IMPLEMENTED ENDPOINTS (Expected 404):');
  console.log('─────────────────────────────────────────────────────────');
  for (const testCase of notImplementedTests) {
    const result = await test(testCase.method, testCase.path, null, token);
    const status = result.status || '?';
    const icon = status === 404 ? '⏳' : '⚠️';
    console.log(`${icon} ${testCase.method.padEnd(6)} ${testCase.path.padEnd(30)} (${status})`);
    results.notImplemented.push({ ...testCase, status });
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('SUMMARY:');
  console.log(`  Implemented & Working: ${results.implemented.length}`);
  console.log(`  Not Yet Implemented: ${results.notImplemented.length}`);
  console.log(`  Errors: ${results.errors.length}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (results.errors.length === 0) {
    console.log('✅ All implemented endpoints are working correctly!\n');
  } else {
    console.log('⚠️  Some implemented endpoints have errors:\n');
    results.errors.forEach(e => {
      console.log(`  - ${e.method} ${e.path} (${e.status})`);
    });
  }
};

main().catch(console.error);
