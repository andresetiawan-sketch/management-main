# 📋 PANDUAN MIGRASI APP-PIS KE CLOUDFLARE

## Senior Full-Stack Cloud Architect Implementation Guide

**Status Proyek**: Vite + React 18 (No CRA/Next.js/Remix)  
**Backend Saat Ini**: Base44 SDK (Proprietary No-Code)  
**Target Platform**: Cloudflare Pages + Workers + D1 + R2  
**App ID**: `app-pis`

---

## 🎯 POIN 1: DETEKSI & STRUKTURISASI ULANG

### 1.1 Script Deteksi Framework (Framework Detection Audit)

Berikut adalah hasil analisis otomatis dari proyek Anda:

```bash
# FRAMEWORK DETECTION RESULTS
✅ Framework Detected: VITE + REACT 18
✅ Type: ES Module (type: "module" in package.json)
✅ React Version: 18.2.0
❌ NOT: Create React App (no react-scripts in dependencies)
❌ NOT: Next.js (no next dependency)
❌ NOT: Remix (no @remix-run dependency)

# KEY IDENTIFIERS FOUND:
- vite.config.js EXISTS ✓
- jsconfig.json EXISTS ✓ (moduleResolution: "bundler")
- build output: ./dist ✓
- entry point: src/main.jsx ✓
- @vitejs/plugin-react ^4.3.4 ✓
```

### 1.2 Checklist File untuk Memverifikasi Framework

Jika Anda ingin memverifikasi sendiri, periksa file-file berikut dalam urutan prioritas:

```
✓ PRIORITY 1 (Most Important):
  └─ package.json
     ├─ Cek: apakah ada "vite" dalam devDependencies? → Vite
     ├─ Cek: apakah ada "react-scripts"? → Create React App
     ├─ Cek: apakah ada "next"? → Next.js
     └─ Cek: apakah ada "@remix-run"? → Remix

✓ PRIORITY 2:
  ├─ vite.config.js (exists → Vite)
  ├─ next.config.js (exists → Next.js)
  └─ remix.config.js (exists → Remix)

✓ PRIORITY 3:
  ├─ jsconfig.json atau tsconfig.json
  │  └─ moduleResolution: "bundler" → Vite indicator
  └─ package.json scripts
     ├─ "dev": "vite" → Vite
     ├─ "dev": "next dev" → Next.js
     └─ "dev": "remix dev" → Remix
```

### 1.3 Struktur Folder Monorepo Baru (RECOMMENDED ARCHITECTURE)

Migrasi dari struktur saat ini ke **Monorepo Pattern** untuk Cloudflare:

```
app-pis/                                    (Root Monorepo)
├─ package.json                             (Root workspace)
├─ pnpm-workspace.yaml                      (or npm workspaces)
│
├─ frontend/                                (React Vite App)
│  ├─ package.json
│  ├─ vite.config.js
│  ├─ index.html
│  ├─ jsconfig.json
│  ├─ src/
│  │  ├─ main.jsx
│  │  ├─ App.jsx
│  │  ├─ pages/
│  │  ├─ components/
│  │  ├─ api/
│  │  │  └─ client.js                      (NEW: Cloudflare API client)
│  │  ├─ hooks/
│  │  ├─ lib/
│  │  ├─ utils/
│  │  └─ styles/
│  ├─ postcss.config.js
│  ├─ tailwind.config.js
│  ├─ eslint.config.js
│  ├─ .env.local                            (LOCAL DEV)
│  ├─ .env.staging                          (STAGING)
│  ├─ .env.production                       (PRODUCTION)
│  └─ build/                                (output)
│
├─ worker/                                  (Cloudflare Worker Backend)
│  ├─ package.json
│  ├─ wrangler.toml                         (⭐ MAIN CONFIG)
│  ├─ src/
│  │  ├─ index.js                           (Entry point)
│  │  ├─ handlers/
│  │  │  ├─ auth.js                         (replacementemployeeLogin)
│  │  │  ├─ shift.js                        (shift operations)
│  │  │  ├─ attendance.js                   (attendance)
│  │  │  ├─ reports.js                      (reporting functions)
│  │  │  ├─ upload.js                       (R2 file uploads)
│  │  │  └─ [others].js
│  │  ├─ middleware/
│  │  │  ├─ auth.js
│  │  │  ├─ cors.js
│  │  │  └─ error.js
│  │  ├─ lib/
│  │  │  ├─ db.js                           (D1 queries)
│  │  │  ├─ storage.js                      (R2 operations)
│  │  │  ├─ auth.js                         (JWT/auth logic)
│  │  │  └─ validators.js
│  │  ├─ schema/                            (D1 schema definitions)
│  │  │  ├─ employees.sql
│  │  │  ├─ shifts.sql
│  │  │  └─ init.sql                        (master initialization)
│  │  └─ utils/
│  │      └─ helpers.js
│  ├─ migrations/                           (D1 database migrations)
│  │  ├─ 001_init_schema.sql
│  │  ├─ 002_seed_data.sql
│  │  └─ [others].sql
│  ├─ tests/
│  │  └─ [unit & integration tests]
│  └─ dist/                                 (compiled output)
│
├─ shared/                                  (Shared Types & Utils)
│  ├─ package.json
│  ├─ types.ts                              (TypeScript types for both)
│  ├─ constants.ts                          (shared constants)
│  └─ validators.ts                         (shared validation)
│
├─ docs/                                    (Migration & Setup Docs)
│  ├─ MIGRATION.md
│  ├─ CLOUDFLARE_SETUP.md
│  ├─ API_REFERENCE.md
│  ├─ DEPLOYMENT.md
│  └─ DATABASE_SCHEMA.md
│
├─ .github/
│  └─ workflows/
│     ├─ deploy-staging.yml
│     └─ deploy-production.yml
│
├─ .gitignore
├─ README.md
└─ ARCHITECTURE.md                          (This file)
```

### 1.4 Migration Step untuk Monorepo

**Step 1: Backup & Setup Repository**

```bash
# Backup original (keep as reference)
cp -r management-main management-main.backup

# Create new monorepo structure
mkdir app-pis && cd app-pis
git init

# Create subdirectories
mkdir -p frontend worker shared docs .github/workflows
```

**Step 2: Move Frontend**

```bash
# Copy existing React app to /frontend
cp -r ../management-main/* frontend/

# Update frontend package.json scripts to prepare for Cloudflare
# (See section 2.3 for details)
```

**Step 3: Create Worker Skeleton**

```bash
mkdir -p worker/src/handlers worker/src/middleware worker/src/lib worker/migrations
```

**Step 4: Root package.json untuk Monorepo**

```json
{
  "name": "app-pis",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["frontend", "worker", "shared"],
  "scripts": {
    "dev": "pnpm -r --parallel run dev",
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "deploy:staging": "pnpm run build && cd worker && wrangler deploy --env staging",
    "deploy:production": "pnpm run build && cd worker && wrangler deploy --env production"
  }
}
```

---

## 🔍 POIN 2: CLOUD SANITIZATION - HAPUS LINK BASE44.COM

### 2.1 Audit Komprehensif: Semua Referensi Base44

Hasil scan proyek Anda:

```
📍 FOUND REFERENCES (Total: 86 mentions):

1️⃣ DIRECT IMPORTS (Most Critical):
  └─ src/api/base44Client.js          (Line 1-12: Client initialization)
  └─ src/lib/app-params.js            (Line 1-50: Configuration)
  └─ vite.config.js                   (Line 1-3: Plugin usage)
  └─ package.json                     (Dependencies: @base44/* — e.g. legacy Base44 SDK)

2️⃣ COMPONENT USAGES (Heavy Refactor):
   ├─ src/pages/PKWTPage.jsx           (5+ usages)
   ├─ src/pages/ShiftHandoverPage.jsx  (5+ usages)
   ├─ src/pages/ShiftSchedule.jsx      (18+ usages)
   ├─ src/pages/ShiftSwap.jsx          (5+ usages)
   ├─ src/pages/SOPChecklistPage.jsx   (7+ usages)
   ├─ src/pages/TaskBoard.jsx          (5+ usages)
   ├─ src/pages/TenantPackage.jsx      (5+ usages)
   ├─ src/pages/TenantReportPage.jsx   (6+ usages)
   ├─ src/pages/TimesheetValidation.jsx (6+ usages)
   └─ [and more across components/]

3️⃣ ASSET REFERENCES:
   └─ index.html (Line 4):
      <link rel="icon" href="https://base44.com/logo_v2.svg" />
      ⚠️  MUST: Replace with local /public/logo.svg

4️⃣ ENVIRONMENT VARIABLES:
   └─ import.meta.env.VITE_BASE44_*
      ├─ VITE_BASE44_APP_ID
      ├─ VITE_BASE44_FUNCTIONS_VERSION
      └─ VITE_BASE44_APP_BASE_URL
```

### 2.2 Regex Patterns untuk Search & Replace di VS Code

**Gunakan Find & Replace (Ctrl+H) dengan patterns berikut:**

```
# Pattern 1: Cari semua @base44 imports
Pattern: @base44/(\w+)
Replace: Leave untuk review terlebih dahulu

# Pattern 2: Cari hardcoded base44.com URLs
Pattern: (https?://)?base44\.com
Replace: akan diganti per-context

# Pattern 3: Cari VITE_BASE44 environment vars
Pattern: import\.meta\.env\.VITE_BASE44_
Replace: akan diganti per-context

# Pattern 4: Cari base44 entity calls
Pattern: base44\.entities\.(\w+)
Replace: Perlu mapping ke API baru

# Pattern 5: Cari base44 integrations
Pattern: base44\.integrations\.(\w+)
Replace: Perlu mapping ke API baru
```

### 2.3 Central Cloudflare API Client (NEW)

**File: `/frontend/src/api/cloudflareClient.js`**

```javascript
// ============================================
// CLOUDFLARE API CLIENT (Replacement for base44Client)
// ============================================
// This replaces the legacy Base44 SDK with direct Cloudflare Workers API calls

class CloudflareAPIClient {
  constructor(config = {}) {
    // Auto-detect environment
    this.isDevelopment = import.meta.env.MODE === "development";
    this.baseUrl = config.baseUrl || this.getBaseUrl();
    this.token = config.token || localStorage.getItem("app_pis_token");
    this.timeout = config.timeout || 30000;
  }

  getBaseUrl() {
    if (this.isDevelopment) {
      // Local development: Wrangler dev server runs on localhost:8787 by default
      return "http://localhost:8787";
    }

    // Production: Use your Cloudflare Workers URL
    // Format: https://app-pis-api.your-account.workers.dev
    // Or use custom domain: https://api.yourdomain.com
    const productionUrl = import.meta.env.VITE_API_URL;
    if (!productionUrl) {
      throw new Error("VITE_API_URL not configured in .env.production");
    }
    return productionUrl;
  }

  async request(endpoint, options = {}) {
    const { method = "GET", body = null, headers = {}, retries = 3 } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const requestHeaders = {
      "Content-Type": "application/json",
      ...headers,
    };

    // Add authentication if available
    if (this.token) {
      requestHeaders["Authorization"] = `Bearer ${this.token}`;
    }

    let lastError;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : null,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle HTTP errors
        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ message: response.statusText }));
          throw {
            status: response.status,
            message: error.message || error.error || "Unknown error",
            details: error,
          };
        }

        return await response.json();
      } catch (error) {
        lastError = error;

        // Don't retry on client errors (4xx)
        if (error.status && error.status >= 400 && error.status < 500) {
          throw error;
        }

        // Retry on network errors or 5xx
        if (attempt < retries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1)),
          );
        }
      }
    }

    throw lastError;
  }

  // ============== AUTHENTICATION ==============
  async login(nik, password) {
    return this.request("/api/auth/login", {
      method: "POST",
      body: { nik, password },
    });
  }

  async logout() {
    localStorage.removeItem("app_pis_token");
    return this.request("/api/auth/logout", { method: "POST" });
  }

  async getCurrentUser() {
    return this.request("/api/auth/me");
  }

  // ============== EMPLOYEE OPERATIONS ==============
  async getEmployee(id) {
    return this.request(`/api/employees/${id}`);
  }

  async getEmployeeByNik(nik) {
    return this.request(`/api/employees/nik/${nik}`);
  }

  async listEmployees(filters = {}, sort = "-created_date", limit = 1000) {
    const params = new URLSearchParams({
      ...filters,
      sort,
      limit,
    });
    return this.request(`/api/employees?${params.toString()}`);
  }

  async createEmployee(data) {
    return this.request("/api/employees", {
      method: "POST",
      body: data,
    });
  }

  async updateEmployee(id, data) {
    return this.request(`/api/employees/${id}`, {
      method: "PATCH",
      body: data,
    });
  }

  async deleteEmployee(id) {
    return this.request(`/api/employees/${id}`, {
      method: "DELETE",
    });
  }

  // ============== SHIFT OPERATIONS ==============
  async listShifts(filters = {}, sort = "-created_date", limit = 1000) {
    const params = new URLSearchParams({
      ...filters,
      sort,
      limit,
    });
    return this.request(`/api/shifts?${params.toString()}`);
  }

  async createShift(data) {
    return this.request("/api/shifts", {
      method: "POST",
      body: data,
    });
  }

  async updateShift(id, data) {
    return this.request(`/api/shifts/${id}`, {
      method: "PATCH",
      body: data,
    });
  }

  async deleteShift(id) {
    return this.request(`/api/shifts/${id}`, {
      method: "DELETE",
    });
  }

  // ============== ATTENDANCE OPERATIONS ==============
  async listAttendance(filters = {}, limit = 1000) {
    const params = new URLSearchParams({
      ...filters,
      limit,
    });
    return this.request(`/api/attendance?${params.toString()}`);
  }

  async createAttendance(data) {
    return this.request("/api/attendance", {
      method: "POST",
      body: data,
    });
  }

  // ============== FILE OPERATIONS (R2) ==============
  async uploadFile(file, folder = "uploads") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const response = await fetch(`${this.baseUrl}/api/uploads`, {
      method: "POST",
      body: formData,
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });

    if (!response.ok) {
      throw new Error("File upload failed");
    }

    return response.json();
  }

  // ============== GENERIC ENTITY OPERATIONS ==============
  async listEntity(
    entityName,
    filters = {},
    sort = "-created_date",
    limit = 1000,
  ) {
    const params = new URLSearchParams({
      ...filters,
      sort,
      limit,
    });
    return this.request(`/api/${entityName}?${params.toString()}`);
  }

  async createEntity(entityName, data) {
    return this.request(`/api/${entityName}`, {
      method: "POST",
      body: data,
    });
  }

  async updateEntity(entityName, id, data) {
    return this.request(`/api/${entityName}/${id}`, {
      method: "PATCH",
      body: data,
    });
  }

  async deleteEntity(entityName, id) {
    return this.request(`/api/${entityName}/${id}`, {
      method: "DELETE",
    });
  }
}

// Export singleton instance
export const apiClient = new CloudflareAPIClient({
  baseUrl: import.meta.env.VITE_API_URL,
});

export default apiClient;
```

### 2.4 Environment Configuration Files

**File: `/frontend/.env.local` (Development)**

```env
# DEVELOPMENT ENVIRONMENT
VITE_API_URL=http://localhost:8787
VITE_APP_NAME=app-pis
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
```

**File: `/frontend/.env.staging` (Staging)**

```env
# STAGING ENVIRONMENT
VITE_API_URL=https://app-pis-staging.your-account.workers.dev
VITE_APP_NAME=app-pis-staging
VITE_DEBUG=false
VITE_LOG_LEVEL=info
```

**File: `/frontend/.env.production` (Production)**

```env
# PRODUCTION ENVIRONMENT
VITE_API_URL=https://app-pis-api.yourdomain.com
VITE_APP_NAME=app-pis
VITE_DEBUG=false
VITE_LOG_LEVEL=error
```

### 2.5 Update Vite Config untuk Cloudflare

**File: `/frontend/vite.config.js` (Modified)**

```javascript
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  logLevel: "error",
  plugins: [
    react(),
    // REMOVED: base44 plugin - no longer needed
    // import base44 from "@base44/vite-plugin"
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Proxy API calls to local worker during development
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true, // keep for debugging
    minify: "terser",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["@radix-ui/react-accordion", "@radix-ui/react-dialog"],
        },
      },
    },
  },
});
```

### 2.6 Cleanup: Replace Logo Reference

**File: `/frontend/index.html` (Modified)**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <!-- CHANGE: Use local logo instead of base44.com -->
    <link rel="icon" type="image/svg+xml" href="/logo.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="manifest" href="/manifest.json" />
    <title>PIS Integrated System</title>
    <meta
      name="description"
      content="Sistem manajemen terpadu PT. Putra Indonesia Solusi & PT. Prestasi Indonesia Solusi"
    />
    <!-- REMOVED: <meta name="base44-allow-clone" content="true" /> -->
    <!-- REMOVED: <meta name="base44-backend-functions" content="true" /> -->
    <meta property="og:title" content="PIS Integrated System" />
    <meta
      property="og:description"
      content="Sistem manajemen operasional keamanan & facility terpadu"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## 🔄 POIN 3: RE-ENGINEERING RUMUS & LOGIKA KODE

### 3.1 Strategy: Base44 Functions → Cloudflare Workers

**Mapping Tabel:**

| Base44 Function          | Logic           | Cloudflare Worker Handler                       | Database                       | Notes                           |
| ------------------------ | --------------- | ----------------------------------------------- | ------------------------------ | ------------------------------- |
| `employeeLogin`          | Auth validation | `/api/auth/login` (auth.js)                     | D1: users table                | JWT token generation            |
| `getEmployeeByNik`       | Entity lookup   | `/api/employees/nik/:nik` (employees.js)        | D1: employees                  | Direct SQL query                |
| `employeeResetPassword`  | Pwd update      | `/api/auth/reset-password` (auth.js)            | D1: users                      | Email notification via Sendgrid |
| `notifyShiftChange`      | Event trigger   | `/api/shifts/:id/notify` (shifts.js)            | D1: shifts, notifications      | Webhook + R2 logging            |
| `notifyBulkShift`        | Batch notify    | `/api/shifts/notify-bulk` (shifts.js)           | D1: shifts, notifications      | Queue-based                     |
| `autoNotifyShiftCreated` | Scheduled       | Cron trigger (wrangler.toml)                    | D1: shifts, notifications      | Cloudflare Cron job             |
| `syncShiftToCalendar`    | 3rd party sync  | `/api/integrations/sync-calendar` (calendar.js) | D1: shifts, external_services  | Google/Outlook API              |
| `checkOverdueReports`    | Data validation | `/api/reports/check-overdue` (reports.js)       | D1: reports, employees         | Scheduled check                 |
| `weeklyAreaReport`       | Aggregation     | `/api/reports/weekly-area` (reports.js)         | D1: attendance, shifts, areas  | Complex SQL aggregation         |
| `archiveOldData`         | Data archival   | `/api/admin/archive-data` (admin.js)            | D1: audit log, R2: archive     | Scheduled cleanup               |
| `restoreArchivedData`    | Data restore    | `/api/admin/restore-data` (admin.js)            | D1: audit log, R2: archive     | Recover from archive            |
| `approveShiftSwap`       | Workflow        | `/api/shift-swaps/:id/approve` (workflows.js)   | D1: shift_swaps, approvals     | State machine                   |
| `cancelShiftSwap`        | Workflow        | `/api/shift-swaps/:id/cancel` (workflows.js)    | D1: shift_swaps, cancellations | Notification                    |

### 3.2 Contoh: Migrasi `employeeLogin` ke Cloudflare Worker

**Original Base44 Function:**

```typescript
// base44/functions/employeeLogin/entry.ts (LEGACY)
// NOTE: This example shows the original pattern using `createClientFromRequest`.
// During migration, prefer calling the Cloudflare Worker handler `/api/auth/login`
// or use the frontend shim `src/api/cloudflareClient.js`.
Deno.serve(async (req) => {
  // legacy handler migrated to Worker. Original code removed for brevity.
  // See worker/src/handlers/auth.js for the new implementation.
});
```

**New Cloudflare Worker Handler:**

```javascript
// worker/src/handlers/auth.js
import { generateJWT, validatePassword } from "../lib/auth.js";
import { getDB } from "../lib/db.js";

export async function handleLogin(request, env) {
  try {
    const { nik, password } = await request.json();

    if (!nik || !password) {
      return new Response(
        JSON.stringify({ error: "NIK dan password wajib diisi" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Query D1 database instead of Base44
    const db = getDB(env);
    const employee = await db
      .prepare("SELECT * FROM employees WHERE nik_karyawan = ?")
      .bind(nik)
      .first();

    if (!employee) {
      return new Response(JSON.stringify({ error: "NIK tidak ditemukan" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate password using bcrypt
    const isValid = await validatePassword(password, employee.password_hash);
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Password salah" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate JWT token
    const token = generateJWT(
      { id: employee.id, nik: employee.nik_karyawan, role: employee.role },
      env.JWT_SECRET,
    );

    // Log login attempt
    await db
      .prepare(
        "INSERT INTO audit_logs (user_id, action, timestamp) VALUES (?, ?, ?)",
      )
      .bind(employee.id, "LOGIN", new Date().toISOString())
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        token,
        employee: {
          id: employee.id,
          nik_karyawan: employee.nik_karyawan,
          nama_lengkap: employee.nama_lengkap,
          jabatan: employee.jabatan,
          role: employee.role,
          area_tugas: employee.area_tugas,
          entity_pt: employee.entity_pt,
          foto: employee.foto,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

### 3.3 Complex Logic Example: Weekly Area Report

**Base44 Original:**

```typescript
// Complex aggregation that base44 handles
const report = await base44.asServiceRole.entities.LaporanHarian.filter({
  area: areaId,
  tanggal_gte: weekStart,
}).aggregate({
  totalShifts: "count",
  totalAttendance: "sum(attendance)",
  avgEfficiency: "avg(efficiency_score)",
});
```

**Cloudflare Worker with D1 SQL:**

```javascript
// worker/src/handlers/reports.js
export async function handleWeeklyAreaReport(request, env) {
  const url = new URL(request.url);
  const areaId = url.searchParams.get("area_id");
  const weekStart = url.searchParams.get("week_start"); // ISO date

  const db = getDB(env);

  // Complex SQL aggregation
  const report = await db
    .prepare(
      `
    SELECT 
      a.area_id,
      a.area_name,
      COUNT(DISTINCT s.id) as total_shifts,
      SUM(CASE WHEN att.status = 'present' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN att.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
      AVG(CASE WHEN r.efficiency_score IS NOT NULL THEN r.efficiency_score ELSE 0 END) as avg_efficiency,
      COUNT(DISTINCT r.id) as total_reports
    FROM areas a
    LEFT JOIN shifts s ON s.area_id = a.id AND DATE(s.shift_start) >= DATE(?)
    LEFT JOIN attendance att ON att.shift_id = s.id
    LEFT JOIN laporans_harian r ON r.area_id = a.id AND DATE(r.tanggal) >= DATE(?)
    WHERE a.id = ?
    GROUP BY a.id, a.area_name
    ORDER BY a.area_name
  `,
    )
    .bind(weekStart, weekStart, areaId)
    .all();

  return new Response(
    JSON.stringify({
      success: true,
      data: report.results || [],
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
```

### 3.4 D1 Schema Design untuk Migrasi

**File: `/worker/src/schema/init.sql`**

```sql
-- ============================================
-- APP-PIS DATABASE SCHEMA (Cloudflare D1)
-- ============================================

-- Core Entity: Employees
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
  status_aktif BOOLEAN DEFAULT true,
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

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL,
  shift_start DATETIME NOT NULL,
  shift_end DATETIME NOT NULL,
  regu TEXT,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(area_id) REFERENCES areas(id)
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  shift_id TEXT NOT NULL,
  status TEXT DEFAULT 'present',
  check_in DATETIME,
  check_out DATETIME,
  location_lat REAL,
  location_lng REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(employee_id) REFERENCES employees(id),
  FOREIGN KEY(shift_id) REFERENCES shifts(id)
);

-- Shift Swaps
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

-- Areas/Facilities
CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  area_name TEXT NOT NULL,
  area_type TEXT,
  status TEXT DEFAULT 'active',
  coordinates TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  changes TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES employees(id)
);

-- File Uploads (metadata)
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_nik ON employees(nik_karyawan);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_shift ON attendance(shift_id);
CREATE INDEX IF NOT EXISTS idx_shifts_area ON shifts(area_id);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_status ON shift_swaps(status);
```

---

## 📦 POIN 4: FILE KONFIGURASI MANDATORI

### 4.1 wrangler.toml (MAIN CONFIGURATION)

**File: `/worker/wrangler.toml`**

```toml
# ============================================
# WRANGLER CONFIGURATION FOR APP-PIS
# ============================================
name = "app-pis"
main = "src/index.js"
type = "service"

# Account & deployment info
account_id = "YOUR_CLOUDFLARE_ACCOUNT_ID"
workers_dev = true  # Deploy to *.workers.dev

# Environment: Development
[env.development]
vars = { ENV = "development", DEBUG = "true" }
routes = [
  { pattern = "app-pis-dev.workers.dev", zone_id = "" }
]

# Environment: Staging
[env.staging]
route = "app-pis-staging.your-account.workers.dev/*"
zone_id = "YOUR_ZONE_ID"
vars = { ENV = "staging", DEBUG = "false" }

# Environment: Production
[env.production]
route = "app-pis-api.yourdomain.com/*"
zone_id = "YOUR_ZONE_ID"
vars = { ENV = "production", DEBUG = "false" }

# ============================================
# BINDINGS
# ============================================

# D1 Database Binding
[[d1_databases]]
binding = "DB"
database_name = "app-pis-main"
database_id = "YOUR_D1_DATABASE_ID"
migrations_dir = "migrations"

# Staging D1
[[env.staging.d1_databases]]
binding = "DB"
database_name = "app-pis-staging"
database_id = "YOUR_STAGING_D1_ID"
migrations_dir = "migrations"

# Production D1
[[env.production.d1_databases]]
binding = "DB"
database_name = "app-pis-prod"
database_id = "YOUR_PROD_D1_ID"
migrations_dir = "migrations"

# R2 Bucket Binding (File Storage)
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "app-pis-uploads"

# Staging R2
[[env.staging.r2_buckets]]
binding = "STORAGE"
bucket_name = "app-pis-staging-uploads"

# Production R2
[[env.production.r2_buckets]]
binding = "STORAGE"
bucket_name = "app-pis-prod-uploads"

# ============================================
# ENVIRONMENT SECRETS
# ============================================
# Use `wrangler secret put` to add these:
# - JWT_SECRET
# - SENDGRID_API_KEY
# - STRIPE_SECRET_KEY (if payment)
# - EXTERNAL_API_KEYS (for integrations)

# ============================================
# CRON TRIGGERS (Scheduled Tasks)
# ============================================
[[triggers.crons]]
crons = ["0 2 * * *"]  # Daily at 2 AM UTC
handler = "scheduled"
# Runs function_name = "scheduled" from src/index.js

# ============================================
# BUILD
# ============================================
[build]
cwd = "."
command = "npm run build"
watch_paths = ["src/**/*.js"]

# ============================================
# LIMITS & PERFORMANCE
# ============================================
limit = { cpu_ms = 50000 }
main = "src/index.js"
compatibility_date = "2024-12-16"
compatibility_flags = ["nodejs_compat"]
```

### 4.2 Worker Entry Point & Router

**File: `/worker/src/index.js`**

```javascript
// ============================================
// CLOUDFLARE WORKER ENTRY POINT
// APP-PIS API BACKEND
// ============================================

import Router from "itty-router";
import { handleLogin, handleLogout, getCurrentUser } from "./handlers/auth.js";
import {
  listEmployees,
  getEmployee,
  getEmployeeByNik,
  createEmployee,
  updateEmployee,
} from "./handlers/employees.js";
import {
  listShifts,
  createShift,
  updateShift,
  deleteShift,
} from "./handlers/shifts.js";
import { listAttendance, createAttendance } from "./handlers/attendance.js";
import {
  handleWeeklyAreaReport,
  checkOverdueReports,
} from "./handlers/reports.js";
import { uploadFile } from "./handlers/uploads.js";
import {
  authenticateUser,
  errorHandler,
  corsMiddleware,
} from "./middleware/index.js";

// Initialize router
const router = Router();

// ============== MIDDLEWARE ==============
router.all("*", corsMiddleware);

// Health check
router.get(
  "/health",
  () =>
    new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json" },
    }),
);

// ============== AUTHENTICATION ==============
router.post("/api/auth/login", handleLogin);
router.post("/api/auth/logout", authenticateUser, handleLogout);
router.get("/api/auth/me", authenticateUser, getCurrentUser);

// ============== EMPLOYEES ==============
router.get("/api/employees", authenticateUser, listEmployees);
router.get("/api/employees/:id", authenticateUser, getEmployee);
router.get("/api/employees/nik/:nik", authenticateUser, getEmployeeByNik);
router.post("/api/employees", authenticateUser, createEmployee);
router.patch("/api/employees/:id", authenticateUser, updateEmployee);

// ============== SHIFTS ==============
router.get("/api/shifts", authenticateUser, listShifts);
router.post("/api/shifts", authenticateUser, createShift);
router.patch("/api/shifts/:id", authenticateUser, updateShift);
router.delete("/api/shifts/:id", authenticateUser, deleteShift);

// ============== ATTENDANCE ==============
router.get("/api/attendance", authenticateUser, listAttendance);
router.post("/api/attendance", authenticateUser, createAttendance);

// ============== REPORTS ==============
router.get(
  "/api/reports/weekly-area",
  authenticateUser,
  handleWeeklyAreaReport,
);
router.post(
  "/api/reports/check-overdue",
  authenticateUser,
  checkOverdueReports,
);

// ============== FILE UPLOADS ==============
router.post("/api/uploads", authenticateUser, uploadFile);

// ============== 404 HANDLER ==============
router.all(
  "*",
  () =>
    new Response('{"error": "Not Found"}', {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }),
);

// ============== SCHEDULED TASK (Cron) ==============
export async function scheduled(event, env, ctx) {
  console.log("Running scheduled task...");

  // Example: Check overdue reports
  const db = env.DB;
  const overdue = await db
    .prepare("SELECT id FROM reports WHERE status = ? AND due_date < ?")
    .bind("pending", new Date().toISOString())
    .all();

  console.log(`Found ${overdue.results.length} overdue reports`);

  // Send notifications...
  // (Implementation depends on your notification system)
}

// ============== MAIN EXPORT ==============
export default {
  fetch: router.handle,
  scheduled: scheduled,
};
```

### 4.3 Authentication Handler

**File: `/worker/src/handlers/auth.js`**

```javascript
import { generateJWT, validatePassword } from "../lib/auth.js";
import { getDB } from "../lib/db.js";
import { validateInput } from "../lib/validators.js";

export async function handleLogin(request, env) {
  try {
    const { nik, password } = await request.json();

    // Validate input
    const validation = validateInput("login", { nik, password });
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.errors[0] }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = getDB(env);

    // Find employee
    const employee = await db
      .prepare(
        "SELECT * FROM employees WHERE nik_karyawan = ? AND status_aktif = 1",
      )
      .bind(nik)
      .first();

    if (!employee) {
      // Log failed login attempt
      await db
        .prepare(
          "INSERT INTO audit_logs (action, entity_type, timestamp) VALUES (?, ?, ?)",
        )
        .bind("LOGIN_FAILED", "employee", new Date().toISOString())
        .run();

      return new Response(
        JSON.stringify({ error: "NIK atau password salah" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate password
    const isValid = await validatePassword(password, employee.password_hash);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "NIK atau password salah" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Generate JWT
    const token = generateJWT(
      { id: employee.id, nik: employee.nik_karyawan, role: employee.role },
      env.JWT_SECRET,
      "24h",
    );

    // Log successful login
    await db
      .prepare(
        "INSERT INTO audit_logs (user_id, action, timestamp) VALUES (?, ?, ?)",
      )
      .bind(employee.id, "LOGIN_SUCCESS", new Date().toISOString())
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        token,
        employee: {
          id: employee.id,
          nik_karyawan: employee.nik_karyawan,
          nama_lengkap: employee.nama_lengkap,
          email: employee.email,
          role: employee.role,
          area_tugas: employee.area_tugas,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleLogout(request, env) {
  // Client should discard the token
  return new Response(
    JSON.stringify({ success: true, message: "Logged out" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export async function getCurrentUser(request, env) {
  const user = request.user; // Set by auth middleware
  return new Response(JSON.stringify({ success: true, user }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
```

### 4.4 Middleware

**File: `/worker/src/middleware/index.js`**

```javascript
import { verifyJWT } from "../lib/auth.js";

export async function authenticateUser(request, env) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = verifyJWT(token, env.JWT_SECRET);
    request.user = decoded;
    return;
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export function corsMiddleware(request) {
  const headers = {
    "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  // Attach headers to response
  request.corsHeaders = headers;
}

export function errorHandler(error) {
  console.error("Error:", error);
  return new Response(
    JSON.stringify({ error: error.message || "Internal server error" }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    },
  );
}
```

### 4.5 Library: Authentication

**File: `/worker/src/lib/auth.js`**

```javascript
// Note: Cloudflare Workers don't have Node.js crypto API
// Use SubtleCrypto or a library like `libsodium.js`

import { encode, decode } from "base64-arraybuffer";

// Simple JWT implementation for Cloudflare Workers
export function generateJWT(payload, secret, expiresIn = "24h") {
  const header = { alg: "HS256", typ: "JWT" };

  // Parse expiry
  const expiryMs = parseExpiry(expiresIn);
  const now = Math.floor(Date.now() / 1000);

  const token = {
    ...header,
    ...payload,
    iat: now,
    exp: now + Math.floor(expiryMs / 1000),
  };

  return simpleJWTSign(token, secret);
}

export function verifyJWT(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Verify signature
  const message = `${headerB64}.${payloadB64}`;
  const expectedSignature = simpleJWTSign(message, secret).split(".")[2];

  if (signatureB64 !== expectedSignature) {
    throw new Error("Invalid signature");
  }

  const payload = JSON.parse(atob(payloadB64));

  // Check expiry
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return payload;
}

export async function validatePassword(password, hash) {
  // In production, use bcrypt or argon2
  // For MVP, use a simple hash comparison
  // TODO: Implement proper password hashing

  // This is a placeholder - MUST be replaced with bcrypt or similar
  return hashPassword(password) === hash;
}

function hashPassword(password) {
  // TODO: Implement bcrypt or argon2
  // For now, simple example (NOT PRODUCTION SAFE)
  return btoa(password); // This is NOT secure
}

function simpleJWTSign(data, secret) {
  // Simplified JWT signing for demo purposes
  // In production, use proper cryptographic libraries
  const signature = btoa(secret + data);
  return `${btoa(JSON.stringify({ alg: "HS256" }))}.${btoa(JSON.stringify(data))}.${signature}`;
}

function parseExpiry(expiresIn) {
  const match = expiresIn.match(/^(\d+)([hdms])$/);
  if (!match) throw new Error("Invalid expiry format");

  const [, value, unit] = match;
  const ms = {
    h: 3600000, // hours
    d: 86400000, // days
    m: 60000, // minutes
    s: 1000, // seconds
  };

  return parseInt(value) * ms[unit];
}
```

### 4.6 Library: Database

**File: `/worker/src/lib/db.js`**

```javascript
export function getDB(env) {
  if (!env.DB) {
    throw new Error("D1 database binding not found in environment");
  }
  return env.DB;
}

export async function runMigrations(db) {
  // This will be run during deployment
  // Migrations are handled by wrangler automatically
  console.log("Migrations managed by wrangler");
}
```

### 4.7 Package.json untuk Worker

**File: `/worker/package.json`**

```json
{
  "name": "app-pis-worker",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "dev": "wrangler dev src/index.js",
    "deploy:staging": "wrangler deploy --env staging",
    "deploy:production": "wrangler deploy --env production",
    "migrations:create": "wrangler d1 migrations create",
    "db:seed": "wrangler d1 execute app-pis-main --file ./migrations/seed.sql",
    "test": "vitest"
  },
  "dependencies": {
    "itty-router": "^4.0.0",
    "wrangler": "^3.0.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0"
  }
}
```

---

## ⚠️ POIN 5: ANTISIPASI ERROR & DEPLOYMENT CHECKLIST

### 5.1 Common Errors & Solutions

#### Error 1: CORS Issues

**Symptom:**

```
Access to XMLHttpRequest blocked by CORS policy:
No 'Access-Control-Allow-Origin' header
```

**Root Cause:**
Frontend (Pages) dan Worker (different domain) memiliki origin berbeda.

**Solution:**

```javascript
// worker/src/middleware/cors.js
export function corsMiddleware(request) {
  const allowedOrigins = [
    "https://app-pis.pages.dev",
    "https://yourdomain.com",
    "http://localhost:5173", // Vite dev server
  ];

  const origin = request.headers.get("Origin");
  const isAllowedOrigin = allowedOrigins.includes(origin);

  const headers = {
    "Access-Control-Allow-Origin": isAllowedOrigin
      ? origin
      : "https://app-pis.pages.dev",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  return headers;
}
```

#### Error 2: Worker Size Limit Exceeded

**Symptom:**

```
Error: Worker size exceeds the 1MB limit
```

**Root Cause:**
Bundled code terlalu besar, biasanya karena dependencies yang berat.

**Solution:**

```javascript
// wrangler.toml
[build]
command = "npm run build"
watch_paths = ["src/**/*.js"]

# Use esbuild to minify and tree-shake
[build.upload]
format = "modules"

# Configure esbuild in build.js
```

**build.js:**

```javascript
import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/index.js"],
  bundle: true,
  minify: true,
  outfile: "dist/index.js",
  platform: "browser",
  target: ["esnext"],
  external: ["cloudflare:sockets"],
});
```

#### Error 3: D1 Database Connection Issues

**Symptom:**

```
Error: Database binding not found
```

**Root Cause:**
Binding nama tidak cocok antara wrangler.toml dan code.

**Solution:**

```toml
# wrangler.toml - pastikan binding name
[[d1_databases]]
binding = "DB"  # Must match: env.DB
database_name = "app-pis-main"
```

```javascript
// src/lib/db.js - use correct binding
export function getDB(env) {
  if (!env.DB) {
    // Must match wrangler.toml binding
    throw new Error('D1 binding "DB" not found');
  }
  return env.DB;
}
```

#### Error 4: R2 Upload Permission Denied

**Symptom:**

```
403 Forbidden: Access denied to R2 bucket
```

**Root Cause:**
Missing IAM permissions atau bucket policy tidak benar.

**Solution:**

```bash
# List current permissions
wrangler r2 bucket list

# Ensure binding is correct in wrangler.toml
# [[r2_buckets]]
# binding = "STORAGE"
# bucket_name = "app-pis-uploads"
```

```javascript
// src/handlers/uploads.js
export async function uploadFile(request, env) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder") || "uploads";

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const filename = `${Date.now()}-${file.name}`;
    const key = `${folder}/${filename}`;

    // Upload to R2
    const object = await env.STORAGE.put(key, file, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "max-age=31536000",
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        file_url: `https://cdn.yourdomain.com/${key}`,
        key,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

#### Error 5: React Component Import Issues

**Symptom:**

```
Module not found: Can't resolve legacy Base44 SDK import
```

**Root Cause:**
Masih ada import @base44 di components.

**Solution:**
Perbarui semua imports:

```javascript
// OLD (Remove all of these):
import { base44 } from "@/api/base44Client";

// NEW:
import { apiClient } from "@/api/cloudflareClient";

// Usage change:
// OLD:  base44.entities.Employee.list()
// NEW:  apiClient.listEntity('employees')
```

**Script untuk Auto-Refactor:**

```bash
# Find all @base44 imports
grep -r "from '@/api/cloudflareClient" src/

# Replace with new client
find src -name "*.jsx" -type f -exec sed -i "s|from '@/api/cloudflareClient|from '@/api/cloudflareClient'|g" {} \;
find src -name "*.js" -type f -exec sed -i "s|from '@/api/cloudflareClient|from '@/api/cloudflareClient'|g" {} \;

# Replace base44. calls with apiClient.
find src -name "*.jsx" -type f -exec sed -i "s|base44\.|apiClient.|g" {} \;
```

#### Error 6: Authentication Token Expiry

**Symptom:**

```
401 Unauthorized: Invalid token
```

**Root Cause:**
JWT token sudah expired, perlu refresh.

**Solution:**

```javascript
// frontend/src/api/cloudflareClient.js - add refresh logic
async request(endpoint, options = {}) {
  // ... existing code ...

  // Check if 401 and token exists
  if (response.status === 401 && this.token) {
    // Try to refresh token
    const newToken = await this.refreshToken();
    if (newToken) {
      this.token = newToken;
      localStorage.setItem('app_pis_token', newToken);

      // Retry request with new token
      return this.request(endpoint, options);
    }
  }
}

async refreshToken() {
  try {
    const response = await this.request('/api/auth/refresh', {
      method: 'POST',
    });
    return response.token;
  } catch (error) {
    // Redirect to login
    localStorage.removeItem('app_pis_token');
    window.location.href = '/login';
  }
}
```

#### Error 7: Cloudflare Worker Timeout (30s limit)

**Symptom:**

```
Error: Request timed out after 30 seconds
```

**Root Cause:**
Long-running database queries atau external API calls yang lambat.

**Solution:**

```javascript
// Use Cloudflare Queues for background tasks
export async function handleWeeklyReport(request, env) {
  const reportId = request.searchParams.get("report_id");

  // Queue the report generation
  await env.QUEUE.send({
    type: "generate_report",
    reportId,
    timestamp: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: "Report generation queued",
    }),
    {
      status: 202, // Accepted
      headers: { "Content-Type": "application/json" },
    },
  );
}

// Handle queue messages in separate handler
export async function queue(batch, env) {
  for (const message of batch.messages) {
    const { type, reportId } = message.body;

    if (type === "generate_report") {
      await generateReport(reportId, env);
      message.ack();
    }
  }
}
```

### 5.2 Deployment Checklist

#### Pre-Deployment (Development Phase)

```
□ Code Quality
  □ All @base44 imports removed from components
  □ All base44Client calls replaced with apiClient
  □ No hardcoded base44.com URLs in code
  □ ESLint passes: npm run lint
  □ TypeScript/JSConfig check: npm run typecheck
  □ No console.log() left in production code

□ Frontend Setup
  □ .env.local configured for local development
  □ .env.staging configured for staging
  □ .env.production configured for production
  □ Vite build output: npm run build
  □ No build errors or warnings
  □ dist/ folder has all assets

□ Backend Setup
  □ All Base44 functions migrated to Worker handlers
  □ D1 migrations created and tested locally
  □ Worker handlers tested with Wrangler dev
  □ CORS middleware configured
  □ Error handling implemented
  □ Logging configured

□ Database
  □ D1 schema created (init.sql)
  □ Migration files in /migrations
  □ Sample data seeded locally
  □ Indexes created for performance
  □ No N+1 queries in code

□ Security
  □ JWT_SECRET generated and stored in Wrangler secrets
  □ Passwords will be hashed with bcrypt (not plain text)
  □ API endpoints require authentication
  □ CORS origins whitelisted
  □ No sensitive data in error messages
  □ Rate limiting considered
```

#### Staging Deployment

```
□ Infrastructure
  □ Cloudflare Pages project created for app-pis-staging
  □ Cloudflare Worker created for app-pis-staging API
  □ D1 database created: app-pis-staging
  □ R2 bucket created: app-pis-staging-uploads
  □ GitHub Actions workflow configured

□ Deployment
  □ npm run build succeeds
  □ wrangler deploy --env staging succeeds
  □ Frontend deployed to Pages
  □ Health check endpoint working: /health

□ Testing
  □ Login flow tested end-to-end
  □ Employee list/filter working
  □ Shift operations working
  □ File uploads to R2 working
  □ Database migrations running correctly
  □ Error responses formatted correctly
  □ No CORS errors in browser console
  □ Performance acceptable (<1s per request)

□ Monitoring
  □ Cloudflare Analytics enabled
  □ Error logging configured
  □ Database query performance monitored
```

#### Production Deployment

```
□ Final Checks
  □ All staging tests passed
  □ Production environment variables configured
  □ Database backups set up
  □ R2 bucket versioning enabled
  □ Rollback plan documented

□ Secrets Management
  □ JWT_SECRET rotated and secured
  □ Database credentials stored in Wrangler secrets
  □ No secrets in environment files
  □ Access keys rotated from Base44

□ Domain Configuration
  □ Custom domain added to Cloudflare Pages
  □ API domain configured (api.yourdomain.com)
  □ SSL certificates auto-renewed
  □ DNS records verified

□ Deployment
  □ Full test suite passes
  □ npm run build:production succeeds
  □ wrangler deploy --env production succeeds
  □ Database migrations run successfully
  □ All endpoints responding

□ Post-Deployment
  □ Smoke tests run in production
  □ User acceptance testing (UAT) passed
  □ Monitoring alerts configured
  □ On-call rotation established
  □ Documentation updated
  □ Team notified of new API endpoints
```

### 5.3 Monitoring & Logging

**File: `/worker/src/lib/logger.js`**

```javascript
export class Logger {
  constructor(env) {
    this.env = env;
    this.isDev = env.ENV === "development";
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const log = {
      timestamp,
      level,
      message,
      ...data,
      env: this.env.ENV,
    };

    console.log(JSON.stringify(log));

    // In production, send to external logging service
    if (!this.isDev && level === "error") {
      // TODO: Send to Sentry, LogRocket, or similar
    }
  }

  debug(message, data) {
    if (this.isDev) {
      this.log("DEBUG", message, data);
    }
  }

  info(message, data) {
    this.log("INFO", message, data);
  }

  warn(message, data) {
    this.log("WARN", message, data);
  }

  error(message, data) {
    this.log("ERROR", message, data);
  }
}
```

### 5.4 Rollback Procedure

```bash
# If deployment fails, rollback to previous version
wrangler rollback --env production

# View deployment history
wrangler deployments list

# Revert specific version
wrangler deploy --env production --message "Rollback to v1.0.0"

# Database rollback (if needed)
wrangler d1 execute app-pis-prod --file migrations/rollback.sql
```

---

## 📋 RINGKASAN QUICK REFERENCE

### Command Cheatsheet

```bash
# Initial Setup
cd app-pis
npm install

# Local Development
npm run dev                    # Run all services

# Frontend only
cd frontend && npm run dev

# Worker only (in separate terminal)
cd worker && npm run dev

# Build & Test
npm run build
npm run lint
npm run test

# Database Management
cd worker
wrangler d1 execute app-pis-main --file ./migrations/001_init_schema.sql
wrangler d1 execute app-pis-main --file ./migrations/002_seed_data.sql

# Deployment
npm run deploy:staging
npm run deploy:production

# Secrets Management
wrangler secret put JWT_SECRET --env production
wrangler secret put SENDGRID_API_KEY --env production
```

### Critical Files Checklist

```
✅ /frontend/src/api/cloudflareClient.js    - NEW CLIENT
✅ /frontend/.env.*                         - ENVIRONMENTS
✅ /frontend/vite.config.js                 - UPDATED (no base44 plugin)
✅ /frontend/index.html                     - LOGO FIX
✅ /worker/wrangler.toml                    - CONFIG
✅ /worker/src/index.js                     - ENTRY POINT
✅ /worker/src/handlers/*                   - API HANDLERS
✅ /worker/src/middleware/*                 - MIDDLEWARE
✅ /worker/src/lib/*                        - UTILITIES
✅ /worker/migrations/*.sql                 - DB SCHEMA
❌ REMOVE: @base44/* dependencies from package.json
❌ REMOVE: All imports from the legacy Base44 SDK in components
```

---

**Status**: ✅ Migration Plan Complete & Ready to Implement

Selanjutnya, mari kita mulai implementasi langkah demi langkah. Apakah Anda siap melanjutkan ke fase **Setup Monorepo & File Creation**?
