# 🚀 QUICK START: APP-PIS CLOUDFLARE MIGRATION

**Durasi**: 2-4 jam untuk setup lengkap + testing  
**Kompleksitas**: Intermediate  
**Status**: Ready to Implement

---

## FASE 1: PERSIAPAN & CLEANUP (30 menit)

### Step 1: Framework Verification

```bash
# Jalankan script deteksi
node detect-framework.js

# Output yang diharapkan:
# ✅ Detected Framework: VITE + REACT
# ✅ Vite: Found vite@6.1.0
# ✅ Total base44 references: 86
```

### Step 2: Backup Proyek Saat Ini

```bash
# Backup sebagai reference
cp -r d:\DASHBOARD\management-main d:\DASHBOARD\management-main.backup
```

### Step 3: Bersihkan Referensi Base44

**Search dan Replace di VS Code:**

1. **Cari semua @base44 imports:**
   - Buka Find: `Ctrl+Shift+F`
   - Pattern: `from '@/api/cloudflareClient`
   - Replace dengan: `from '@/api/cloudflareClient'`

2. **Ganti base44 client calls:**
   - Pattern: `base44\.`
   - Replace dengan: `apiClient.`

3. **Periksa hasil:**
   ```bash
   grep -r "@base44\|base44\.com\|base44\." src/ || echo "✓ Clean"
   ```

---

## FASE 2: SETUP CLOUDFLARE INFRASTRUCTURE (45 menit)

### Step 1: Create Cloudflare Account

```
1. Go to https://dash.cloudflare.com
2. Sign up atau login
3. Add domain Anda (atau gunakan workers.dev subdomain)
```

### Step 2: Setup Cloudflare Pages

```bash
# 1. Create Pages Project
# Dashboard > Pages > Connect to Git
# - Select GitHub repository
# - Build command: npm run build
# - Output directory: frontend/dist

# 2. Note your Pages URL:
# https://app-pis.pages.dev
```

### Step 3: Setup D1 Database

```bash
# 1. Install Wrangler CLI
npm install -g wrangler

# 2. Login ke Cloudflare
wrangler login

# 3. Create D1 database
wrangler d1 create app-pis-main
# Output: database_id = "xxxxx-xxxxx-xxxxx-xxxxx"

# 4. Update worker/wrangler.toml dengan database_id
```

### Step 4: Setup R2 Bucket

```bash
# Create bucket untuk file uploads
wrangler r2 bucket create app-pis-dev-uploads
wrangler r2 bucket create app-pis-staging-uploads
wrangler r2 bucket create app-pis-prod-uploads

# List buckets
wrangler r2 bucket list
```

### Step 5: Update wrangler.toml

```bash
# File: worker/wrangler.toml

1. Replace YOUR_CLOUDFLARE_ACCOUNT_ID
   - Get from: Settings > General > Account ID

2. Replace database_id values
   - From: wrangler d1 list

3. Update domain jika menggunakan custom domain
```

---

## FASE 3: MIGRATE DATABASE SCHEMA (20 menit)

### Step 1: Create & Run Migrations

```bash
cd worker

# 1. Create migration file
wrangler d1 migrations create app-pis-main init_schema

# 2. Copy schema dari migrations/001_init_schema.sql
cp migrations/001_init_schema.sql  wrangler migrations/

# 3. Apply migration
wrangler d1 execute app-pis-main --file migrations/001_init_schema.sql

# 4. Verify tables
wrangler d1 shell app-pis-main
# SQL: SELECT name FROM sqlite_master WHERE type='table';
# Should show: employees, shifts, attendance, etc.
```

### Step 2: Seed Sample Data (Optional)

```bash
# Create file: migrations/002_seed_sample_data.sql
# Run:
wrangler d1 execute app-pis-main --file migrations/002_seed_sample_data.sql
```

---

## FASE 4: TEST WORKER SECARA LOCAL (30 menit)

### Step 1: Start Local Development Server

```bash
cd worker
npm install
npm run dev

# Output:
# ⛅ wrangler 3.x.x
# ▲ [wrangler:inf] Ready on http://localhost:8787
```

### Step 2: Test Endpoints dengan curl

```bash
# 1. Health check
curl http://localhost:8787/health
# Response: { "status": "ok" }

# 2. Try login (without credentials - should fail)
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nik":"","password":""}'
# Response: 400 error

# 3. List employees (should fail - no auth)
curl http://localhost:8787/api/employees
# Response: 401 Unauthorized
```

### Step 3: Seed Test Data

```bash
# Seed lokal D1 menggunakan file migration
cd worker
npx wrangler d1 execute app-pis-dev --file migrations/002_seed_test_employee.sql
```

> Test employee tersedia dengan:
> - NIK: `123456`
> - Password: `test123`

### Step 4: Test Login Flow

```bash
# Try login endpoint with seeded employee
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nik":"123456","password":"test123"}'

# Should return 200 OK with a JWT token
```

---

## FASE 5: UPDATE FRONTEND (45 menit)

### Step 1: Verify cloudflareClient.js

```bash
# File sudah ada di: src/api/cloudflareClient.js
# Check imports di components
grep -r "cloudflareClient" src/ | head -5
```

### Step 2: Update Environment Variables

```bash
# frontend/.env.local (sudah ada)
VITE_API_URL=http://localhost:8787

# frontend/.env.staging
VITE_API_URL=https://app-pis-staging-api.example.com

# frontend/.env.production
VITE_API_URL=https://app-pis-api.example.com
```

### Step 3: Test Frontend dengan Local Worker

```bash
cd frontend
npm install
npm run dev

# Open http://localhost:5173
# Browser DevTools > Console
# Should see no errors about base44

# Try login dengan test credentials
# NIK: 123456
# Password: anypassword
```

### Step 4: Verify Vite Config

```javascript
// frontend/vite.config.js
// Pastikan TIDAK ada:
// - import base44 from "@base44/vite-plugin"
// - Cek: sudah di-update? Lihat: CLOUDFLARE_MIGRATION_GUIDE.md section 2.5
```

---

## FASE 6: DEPLOY KE STAGING (30 menit)

### Step 1: Deploy Worker ke Staging

```bash
cd worker

# Set secrets
wrangler secret put JWT_SECRET --env staging
# Enter: your-super-secret-key

# Deploy
wrangler deploy --env staging
# Output: Worker deployed to: https://app-pis-api-staging.your-account.workers.dev
```

### Step 2: Deploy Frontend ke Pages

```bash
cd frontend

# Build
npm run build

# Push ke GitHub
git add .
git commit -m "feat: migrate to cloudflare"
git push origin main

# Pages auto-deploys from GitHub
# Monitor di: https://dash.cloudflare.com/pages
```

### Step 3: Test Staging Deployment

```bash
# Health check
curl https://app-pis-api-staging.your-account.workers.dev/health

# Test login
curl -X POST https://app-pis-api-staging.your-account.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nik":"123456","password":"anypassword"}'
```

### Step 4: Run Staging Smoke Tests

```bash
# Visit Pages URL
# https://app-pis-staging.pages.dev

# Open DevTools Console
# Try login
# Check Network tab for API calls
# Verify: API responses are 200 OK
```

---

## FASE 7: FIX COMMON ERRORS

### Error: CORS Failed

**Symptom**: Browser console shows "Access to XMLHttpRequest blocked by CORS"

**Fix**:

```javascript
// worker/src/middleware/index.js
// Pastikan origin Anda di whitelist

const allowedOrigins = [
  "https://app-pis-staging.pages.dev", // Add this
  "http://localhost:5173", // Already there
];
```

### Error: Database Connection Failed

**Symptom**: "D1 database binding not found"

**Fix**:

```toml
# wrangler.toml - Check:
[[env.staging.d1_databases]]
binding = "DB"
database_name = "app-pis-staging"
database_id = "YOUR_ACTUAL_DB_ID"  # <-- Must match exact ID
```

### Error: 502 Bad Gateway

**Symptom**: Worker returns 502

**Fix**:

```bash
# 1. Check logs
wrangler tail --env staging

# 2. Verify DB connection
wrangler d1 shell app-pis-staging
SELECT COUNT(*) FROM employees;

# 3. Check JWT secret is set
wrangler secret list --env staging
# Should show JWT_SECRET
```

### Error: Token Expired

**Symptom**: Login works but subsequent requests return 401

**Fix**: Token lifetime in auth.js

```javascript
// src/lib/auth.js
// Change expiresIn parameter
generateJWT(payload, secret, "24h"); // Increase from default
```

---

## FASE 8: PRODUCTION DEPLOYMENT (15 menit)

### Step 1: Create Production Environment

```bash
cd worker

# Setup production D1
wrangler d1 create app-pis-prod

# Setup production R2
wrangler r2 bucket create app-pis-prod-uploads

# Update wrangler.toml dengan production IDs
```

### Step 2: Set Production Secrets

```bash
# Set JWT secret (use strong secret!)
wrangler secret put JWT_SECRET --env production

# Set other secrets jika ada
wrangler secret put SENDGRID_API_KEY --env production
```

### Step 3: Deploy Production Worker

```bash
cd worker
wrangler deploy --env production

# Output: https://app-pis-api.example.com/
```

### Step 4: Deploy Production Frontend

```bash
cd frontend

# Ensure .env.production is correct
# VITE_API_URL=https://app-pis-api.example.com

# Build
npm run build

# Push to GitHub main branch
git push origin main

# Pages auto-deploys
```

### Step 5: Verify Production

```bash
# Health check
curl https://app-pis-api.example.com/health

# Test login
curl -X POST https://app-pis-api.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nik":"USER_NIK","password":"USER_PASSWORD"}'

# If works, monitor for 24 hours
```

---

## 🎯 SUCCESS CHECKLIST

- [ ] Framework detected correctly (Vite + React)
- [ ] Cloudflare Pages project created
- [ ] D1 database created with schema
- [ ] R2 buckets created
- [ ] Worker running locally (`npm run dev`)
- [ ] Health endpoint responds
- [ ] Login endpoint works
- [ ] Employee list endpoint works
- [ ] Frontend connects to local worker
- [ ] Staging deployment successful
- [ ] Staging endpoints responding
- [ ] Production deployment successful
- [ ] Production endpoints responding
- [ ] No base44 references remaining
- [ ] No CORS errors
- [ ] Performance acceptable

---

## 📞 TROUBLESHOOTING

**Problem**: `wrangler command not found`

```bash
npm install -g @cloudflare/wrangler@latest
# Or: npm install -D wrangler (local)
```

**Problem**: `D1 database ID not found`

```bash
# Get list of databases
wrangler d1 list

# Copy database_id and update wrangler.toml
```

**Problem**: `Can't deploy to Pages - build fails`

```bash
# Check build locally
npm run build

# Check for errors
npm run lint

# Commit and push fixes
```

**Problem**: `Worker size exceeds 1MB`

```bash
# Minify & bundle
npm run build  # or use esbuild
wrangler publish  # Should auto-minify
```

---

## 📚 DOCUMENTATION FILES

All comprehensive docs are in:

1. **CLOUDFLARE_MIGRATION_GUIDE.md** (Complete guide - 5 poin krusial)
2. **DEPLOYMENT_CHECKLIST.md** (Pre/During/Post deployment checklist)
3. **detect-framework.js** (Framework detection script)
4. **src/api/cloudflareClient.js** (API client implementation)
5. **worker/src/index.js** (Worker entry point)
6. **worker/wrangler.toml** (Configuration)
7. **worker/migrations/001_init_schema.sql** (Database schema)

---

**Ready to start? Go to Fase 1: PERSIAPAN & CLEANUP** ✨
