import https from 'https';

const API_URL = 'https://app-pis-api-production.andre-setiawanworkersdev.workers.dev';
const TEST_NIK = '123456';
const TEST_PASSWORD = '123456';

let testToken = '';

const test = async (method, path, body = null, shouldUseToken = true) => {
  return new Promise((resolve) => {
    const urlObj = new URL(`${API_URL}${path}`);
    const options = {
      method,
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://base44-app-5pg.pages.dev'
      }
    };

    if (shouldUseToken && testToken) {
      options.headers['Authorization'] = `Bearer ${testToken}`;
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ error: err.message });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('\n🧪 API ENDPOINT TESTS\n');
  console.log(`API URL: ${API_URL}\n`);

  // Test 1: Health endpoint
  console.log('1️⃣  Testing /health endpoint...');
  let result = await test('GET', '/health', null, false);
  console.log(`   Status: ${result.status}`);
  console.log(`   Data:`, result.data);
  console.log(`   ✓ ${result.status === 200 ? 'PASS' : 'FAIL'}\n`);

  // Test 2: Login with invalid credentials
  console.log('2️⃣  Testing POST /api/auth/login with invalid credentials...');
  result = await test('POST', '/api/auth/login', { nik: '999999', password: 'wrong' }, false);
  console.log(`   Status: ${result.status}`);
  console.log(`   Response:`, result.data?.message || result.data);
  console.log(`   ✓ ${result.status === 401 ? 'PASS (401 Unauthorized)' : 'FAIL'}\n`);

  // Test 3: Login with valid credentials
  console.log('3️⃣  Testing POST /api/auth/login with valid credentials...');
  result = await test('POST', '/api/auth/login', { nik: TEST_NIK, password: TEST_PASSWORD }, false);
  console.log(`   Status: ${result.status}`);
  console.log(`   Response: ${result.data?.success ? 'SUCCESS' : 'FAILED'}`);
  if (result.data?.token) {
    testToken = result.data.token;
    console.log(`   Token: ${testToken.substring(0, 50)}...`);
  }
  console.log(`   Employee:`, result.data?.employee?.nama_lengkap || 'N/A');
  console.log(`   ✓ ${result.status === 200 && result.data?.success ? 'PASS' : 'FAIL'}\n`);

  if (!testToken) {
    console.log('❌ Login failed! Cannot proceed with authenticated tests.\n');
    return;
  }

  // Test 4: Get current user
  console.log('4️⃣  Testing GET /api/auth/me (authenticated)...');
  result = await test('GET', '/api/auth/me');
  console.log(`   Status: ${result.status}`);
  console.log(`   User: ${result.data?.nik || result.data?.id || 'N/A'}`);
  console.log(`   ✓ ${result.status === 200 ? 'PASS' : 'FAIL'}\n`);

  // Test 5: List employees
  console.log('5️⃣  Testing GET /api/employees...');
  result = await test('GET', '/api/employees');
  console.log(`   Status: ${result.status}`);
  if (result.data?.employees) {
    console.log(`   Found ${result.data.employees.length} employees`);
    if (result.data.employees.length > 0) {
      console.log(`   First: ${result.data.employees[0].nama_lengkap}`);
    }
  }
  console.log(`   ✓ ${result.status === 200 ? 'PASS' : 'FAIL'}\n`);

  // Test 6: Get specific employee by NIK
  console.log('6️⃣  Testing GET /api/employees/nik/123456...');
  result = await test('GET', '/api/employees/nik/123456');
  console.log(`   Status: ${result.status}`);
  console.log(`   Employee: ${result.data?.nama_lengkap || result.data?.message || 'N/A'}`);
  console.log(`   ✓ ${result.status === 200 ? 'PASS' : 'FAIL'}\n`);

  // Test 7: Get attendance
  console.log('7️⃣  Testing GET /api/attendance...');
  result = await test('GET', '/api/attendance?limit=5');
  console.log(`   Status: ${result.status}`);
  if (result.data?.attendance) {
    console.log(`   Found ${result.data.attendance.length} records`);
  } else if (result.data?.data) {
    console.log(`   Found ${Array.isArray(result.data.data) ? result.data.data.length : 'N/A'} records`);
  }
  console.log(`   ✓ ${result.status === 200 ? 'PASS' : 'FAIL'}\n`);

  // Test 8: List shifts
  console.log('8️⃣  Testing GET /api/shifts...');
  result = await test('GET', '/api/shifts?limit=5');
  console.log(`   Status: ${result.status}`);
  if (result.data?.shifts) {
    console.log(`   Found ${result.data.shifts.length} shifts`);
  } else if (result.data?.data) {
    console.log(`   Found ${Array.isArray(result.data.data) ? result.data.data.length : 'N/A'} shifts`);
  }
  console.log(`   ✓ ${result.status === 200 ? 'PASS' : 'FAIL'}\n`);

  // Test 9: Logout
  console.log('9️⃣  Testing POST /api/auth/logout...');
  result = await test('POST', '/api/auth/logout');
  console.log(`   Status: ${result.status}`);
  console.log(`   Response:`, result.data?.message || result.data);
  console.log(`   ✓ ${result.status === 200 ? 'PASS' : 'FAIL'}\n`);

  // Test 10: Try to use old token (should fail)
  console.log('🔟 Testing POST /api/auth/logout with old token (should fail)...');
  const oldToken = testToken;
  testToken = ''; // Clear token
  result = await test('GET', '/api/auth/me', null, false);
  result.headers['Authorization'] = `Bearer ${oldToken}`;
  const testUrl = new URL(`${API_URL}/api/auth/me`);
  const options = {
    method: 'GET',
    hostname: testUrl.hostname,
    port: 443,
    path: testUrl.pathname,
    headers: {
      'Authorization': `Bearer ${oldToken}`,
      'Origin': 'https://base44-app-5pg.pages.dev'
    }
  };
  const req = https.request(options, (res) => {
    console.log(`   Status: ${res.statusCode}`);
    console.log(`   ✓ ${res.statusCode === 401 ? 'PASS (Auth required without token)' : 'FAIL'}\n`);
  });
  req.on('error', (err) => console.log(`   Error: ${err.message}\n`));
  req.end();

  console.log('✅ API Tests Complete!\n');
};

runTests().catch(err => console.error('Test error:', err));
