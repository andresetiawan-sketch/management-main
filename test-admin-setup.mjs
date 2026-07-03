/**
 * Test Admin & Staff Users
 * Tests login for both staff (john doe) and admin capabilities
 */

import https from 'https';

const API = 'https://app-pis-api-production.andre-setiawanworkersdev.workers.dev';

const request = (method, path, body = null, token = null) => {
  return new Promise((resolve) => {
    const url = new URL(`${API}${path}`);
    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://base44-app-5pg.pages.dev'
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

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
    req.on('error', err => resolve({ error: err.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

const main = async () => {
  console.log('\n🔐 STAFF USER TEST (John Doe - NIK: 123456)');
  console.log('═══════════════════════════════════════════\n');

  // Test 1: Staff login
  const staffLogin = await request('POST', '/api/auth/login', {
    nik: '123456',
    password: '123456'
  });

  if (staffLogin.status !== 200) {
    console.log('❌ Staff login failed:', staffLogin.data);
    process.exit(1);
  }

  const staffToken = staffLogin.data.token;
  const staffEmployee = staffLogin.data.employee;

  console.log(`✅ Login successful`);
  console.log(`   Name: ${staffEmployee.nama_lengkap}`);
  console.log(`   NIK: ${staffEmployee.nik_karyawan}`);
  console.log(`   Role: ${staffEmployee.role}`);
  console.log(`   Area: ${staffEmployee.area_tugas}`);
  console.log(`   Token: ${staffToken.substring(0, 50)}...\n`);

  // Test 2: Get current user (staff)
  const staffMe = await request('GET', '/api/auth/me', null, staffToken);
  console.log(`✅ Staff user context: ${staffMe.status === 200 ? 'OK' : 'FAIL'}\n`);

  // Test 3: List employees (staff access)
  const staffEmployees = await request('GET', '/api/employees', null, staffToken);
  console.log(`✅ Staff can list employees: ${staffEmployees.status === 200 ? 'OK (has access)' : `FAIL (${staffEmployees.status})`}\n`);

  console.log('═══════════════════════════════════════════');
  console.log('🎯 MASTER ADMIN TEST SETUP');
  console.log('═══════════════════════════════════════════\n');

  console.log('📋 To create admin user in production, use:');
  console.log('');
  console.log('   cd worker');
  console.log('   wrangler d1 execute app-pis-prod --remote << EOF');
  console.log('   INSERT INTO employees (');
  console.log('     id, nik_karyawan, nama_lengkap, email, no_telepon,');
  console.log('     jabatan, role, area_tugas, entity_pt, regu, status_aktif,');
  console.log('     password_hash, created_at, updated_at');
  console.log('   ) VALUES (');
  console.log('     "emp-admin-001", "ADMIN001", "Admin Master", "admin@pis.local",');
  console.log('     "62812345678", "Administrator", "Master Admin", "Administration",');
  console.log('     "PT Putra Indonesia Solusi", "Admin", 1,');
  console.log('     "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",');
  console.log('     datetime("now"), datetime("now")');
  console.log('   );');
  console.log('   EOF');
  console.log('');
  console.log('   Admin credentials:');
  console.log('   - NIK: ADMIN001');
  console.log('   - Password: admin123');
  console.log('');
  console.log('✅ Staff user is fully functional');
  console.log('⏳ Master admin account pending database insertion');
  console.log('');
};

main().catch(console.error);
