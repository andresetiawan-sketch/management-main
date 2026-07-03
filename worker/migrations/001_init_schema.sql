-- ============================================
-- D1 DATABASE SCHEMA INITIALIZATION
-- APP-PIS CLOUDFLARE D1
-- ============================================
-- This is the master schema file that creates all tables
-- Run with: wrangler d1 execute app-pis-main --file migrations/001_init_schema.sql

-- ============================================
-- CORE: EMPLOYEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  nik_karyawan TEXT UNIQUE NOT NULL,
  nama_lengkap TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  jabatan TEXT,
  role TEXT DEFAULT 'Staff',
  area_tugas TEXT,
  entity_pt TEXT,
  foto TEXT,
  regu TEXT,
  branch TEXT,
  status_aktif INTEGER DEFAULT 1,
  no_telepon TEXT,
  alamat TEXT,
  tanggal_lahir DATE,
  tanggal_masuk DATE,
  bank TEXT,
  no_rekening TEXT,
  ukuran_baju TEXT,
  ukuran_sepatu TEXT,
  nik_ektp TEXT,
  no_kk TEXT,
  no_npwp TEXT,
  sim_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_nik ON employees(nik_karyawan);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status_aktif);

-- ============================================
-- SHIFTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL,
  shift_start DATETIME NOT NULL,
  shift_end DATETIME NOT NULL,
  regu TEXT,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shifts_area ON shifts(area_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_start);

-- ============================================
-- ATTENDANCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  shift_id TEXT NOT NULL,
  status TEXT DEFAULT 'present',
  check_in DATETIME,
  check_out DATETIME,
  location_lat REAL,
  location_lng REAL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(employee_id) REFERENCES employees(id),
  FOREIGN KEY(shift_id) REFERENCES shifts(id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_shift ON attendance(shift_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(DATE(check_in));

-- ============================================
-- SHIFT SWAPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shift_swaps (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  approver_id TEXT,
  shift_from_id TEXT NOT NULL,
  shift_to_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reason TEXT,
  response_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(requester_id) REFERENCES employees(id),
  FOREIGN KEY(approver_id) REFERENCES employees(id),
  FOREIGN KEY(shift_from_id) REFERENCES shifts(id),
  FOREIGN KEY(shift_to_id) REFERENCES shifts(id)
);

CREATE INDEX IF NOT EXISTS idx_shift_swaps_status ON shift_swaps(status);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_requester ON shift_swaps(requester_id);

-- ============================================
-- AREAS/FACILITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  area_name TEXT NOT NULL,
  area_type TEXT,
  status TEXT DEFAULT 'active',
  coordinates TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_areas_status ON areas(status);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  changes TEXT,
  ip_address TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES employees(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- ============================================
-- FILE UPLOADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS file_uploads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES employees(id)
);

CREATE INDEX IF NOT EXISTS idx_file_uploads_user ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_r2_key ON file_uploads(r2_key);

-- ============================================
-- REPORTS TABLE (Laporan Harian)
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL,
  tanggal DATE NOT NULL,
  submitted_by TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  efficiency_score REAL,
  notes TEXT,
  due_date DATE,
  submitted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(area_id) REFERENCES areas(id),
  FOREIGN KEY(submitted_by) REFERENCES employees(id)
);

CREATE INDEX IF NOT EXISTS idx_reports_area ON reports(area_id);
CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(tanggal);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ============================================
-- TASK BOARD TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_board (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(assigned_to) REFERENCES employees(id),
  FOREIGN KEY(created_by) REFERENCES employees(id)
);

CREATE INDEX IF NOT EXISTS idx_task_board_status ON task_board(status);
CREATE INDEX IF NOT EXISTS idx_task_board_assigned ON task_board(assigned_to);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read INTEGER DEFAULT 0,
  related_entity_type TEXT,
  related_entity_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES employees(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ============================================
-- ALL DONE
-- ============================================
-- Schema initialized successfully!
