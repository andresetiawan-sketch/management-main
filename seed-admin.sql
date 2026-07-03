/**
 * Seed Master Admin User to D1
 * Execute via: wrangler d1 execute app-pis-prod < seed-admin.sql
 */

-- First check if admin exists
SELECT COUNT(*) as admin_count FROM employees WHERE role = 'Master Admin';

-- If not exists, create master admin
INSERT OR IGNORE INTO employees (
  id, nik_karyawan, nama_lengkap, email, no_telepon, alamat,
  jabatan, role, area_tugas, entity_pt, regu, status_aktif,
  password_hash, created_at, updated_at
) VALUES (
  'emp-admin-001',
  'ADMIN001',
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
  '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', -- password: admin123
  datetime('now'),
  datetime('now')
);

-- Verify admin was created
SELECT id, nik_karyawan, nama_lengkap, role, email FROM employees WHERE role = 'Master Admin';
