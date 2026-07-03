/**
 * Seed Master Admin Test User
 * Creates a master admin account in production D1
 */

import https from 'https';
import crypto from 'crypto';

const ACCOUNT_ID = '074076a2e5880aa07ba1e87d027c3b16';
const DATABASE_ID = '1fd3f361-1d5a-4338-9bc2-b7e09a123d46';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

// Hash password like in the app
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const executeDbQuery = (query, bindings = []) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ sql: query, params: bindings });

    const options = {
      hostname: 'api.cloudflare.com',
      port: 443,
      path: `/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (res.statusCode === 200) {
            resolve(result);
          } else {
            reject(new Error(`API Error: ${result.errors?.[0]?.message || body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

const main = async () => {
  console.log('🔑 Creating Master Admin Test User...\n');

  if (!API_TOKEN) {
    console.error('❌ Error: CLOUDFLARE_API_TOKEN environment variable not set');
    console.error('   Set it with: $env:CLOUDFLARE_API_TOKEN = "your_token"');
    process.exit(1);
  }

  try {
    // Check if admin user already exists
    console.log('Checking for existing admin user...');
    const checkResult = await executeDbQuery(
      'SELECT id, nik_karyawan, nama_lengkap, role FROM employees WHERE role = ? LIMIT 1',
      ['Master Admin']
    );

    if (checkResult.result?.results?.length > 0) {
      console.log(`✓ Master Admin already exists: ${checkResult.result.results[0].nama_lengkap}\n`);
      const admin = checkResult.result.results[0];
      console.log('Admin Details:');
      console.log(`  ID: ${admin.id}`);
      console.log(`  NIK: ${admin.nik_karyawan}`);
      console.log(`  Name: ${admin.nama_lengkap}`);
      console.log(`  Role: ${admin.role}`);
      return;
    }

    // Create new master admin user
    console.log('Creating new master admin user...\n');
    
    const adminNIK = 'ADMIN001';
    const adminPassword = 'admin@12345';
    const adminPasswordHash = hashPassword(adminPassword);
    
    const insertResult = await executeDbQuery(
      `INSERT INTO employees (
        id, nik_karyawan, nama_lengkap, email, telepon, alamat, 
        jabatan, role, area_tugas, entity_pt, regu, status_aktif, 
        password_hash, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'emp-admin-001',
        adminNIK,
        'Admin Master',
        'admin@pis.local',
        '62812345678',
        'Jakarta, Indonesia',
        'Administrator',
        'Master Admin',
        'Administration',
        'PT Putra Indonesia Solusi',
        'Admin',
        1,
        adminPasswordHash,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    console.log('✅ Master Admin user created successfully!\n');
    console.log('═══════════════════════════════════════════');
    console.log('MASTER ADMIN TEST CREDENTIALS');
    console.log('═══════════════════════════════════════════');
    console.log(`NIK (Username): ${adminNIK}`);
    console.log(`Password:       ${adminPassword}`);
    console.log(`Name:           Admin Master`);
    console.log(`Role:           Master Admin`);
    console.log(`Area:           Administration`);
    console.log('═══════════════════════════════════════════\n');

    console.log('🔗 Test Login:');
    console.log(`curl -X POST https://base44-app-5pg.pages.dev/api/auth/login \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"nik":"${adminNIK}","password":"${adminPassword}"}'`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

main();
