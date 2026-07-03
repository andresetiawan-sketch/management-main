# 🚀 PRODUCTION DEPLOYMENT - STEP-BY-STEP EXECUTION

**Status**: ✅ Backend Ready | ✅ Code Pushed to GitHub | ⏳ Pages Setup in Progress

**Account**: `074076a2e5880aa07ba1e87d027c3b16`  
**Repository**: `https://github.com/andresetiawan-sketch/management-main`

---

## 📋 **PHASE 1: CLOUDFLARE PAGES SETUP** (15 menit)

### ✅ Prerequisites Checked
- ✅ Code pushed to GitHub (master branch)
- ✅ Account ID: `074076a2e5880aa07ba1e87d027c3b16`
- ✅ Production Worker: `app-pis-api-production` deployed
- ✅ Production Database: `app-pis-prod` initialized
- ✅ Frontend build: `dist/` ready (14.19 MB)

### 📱 **STEP 1: Open Cloudflare Dashboard**

```
1. Open browser
2. Go to: https://dash.cloudflare.com
3. Login with your Cloudflare account
4. Wait untuk dashboard load
```

### 📌 **STEP 2: Navigate to Pages**

```
Di Cloudflare Dashboard:
  1. Left sidebar → "Workers & Pages"
  2. Click tab "Pages" (bukan Workers)
  3. Click button "Create application" (orange/yellow button)
```

**Screenshot hint:**
```
Top navigation: Dashboard > Workers & Pages > Pages > [Create application] button
```

### 🔗 **STEP 3: Connect GitHub Repository**

```
Dialog akan muncul:

Choose: "Connect to Git" option

Jika diminta:
  - Authorize Cloudflare untuk GitHub
  - Select: "Only select repositories"
  - Choose: management-main repository
  - Click: "Install" atau "Authorize"
```

### 📁 **STEP 4: Select Repository & Branch**

```
Di Pages Setup:
  
Account/Organization: andresetiawan-sketch
Repository: management-main
Branch: master

Click: "Continue" atau "Begin setup"
```

### ⚙️ **STEP 5: Build Configuration (IMPORTANT!)**

```
Framework preset: None
Build command: npm run build
Build output directory: dist
Root directory: (leave empty)

Click: "Save and deploy"

(Wait 2-5 menit untuk initial build)
```

### 🔐 **STEP 6: Add Environment Variables (CRITICAL!)**

**Setelah Pages project created, akan ada notifikasi "Deployment successful" atau "Initializing build"**

Pergi ke:
```
Pages Project Settings:
  1. Click project name "management-main"
  2. Tab: "Settings"
  3. Section: "Environment variables"
  4. Click: "Add production variable"

Fill:
  Name:  VITE_API_URL
  Value: https://app-pis-api-production.andre-setiawanworkersdev.workers.dev

Click: "Add variable"

(Important: This variable digunakan saat npm run build, 
 tidak perlu untuk runtime redeployment)
```

### ✅ **STEP 7: Wait for Deployment**

```
Status di Pages Dashboard:

[Initial]  → "Building..."
             (5-10 menit)

[Complete] → "Ready"
             Domain: https://app-pis.pages.dev

Ketika "Ready", Pages sudah live!
```

---

## 📊 **PHASE 2: VERIFY PRODUCTION** (10 menit)

### 🔍 **STEP 1: Check Both Endpoints**

```bash
# 1. Worker Health Check
curl https://app-pis-api-production.andre-setiawanworkersdev.workers.dev/health

# Expected response:
# {"status":"ok","timestamp":"2026-07-03T..."}

# 2. Pages Status (open in browser)
# https://app-pis.pages.dev

# Should show: Login form (tidak ada errors)
```

### 🧪 **STEP 2: Test Login Flow**

**In Browser Console (F12):**

```javascript
// Copy & paste ini di browser console:

const payload = {
  name: 'employeeLogin',
  payload: { nik: '123456', password: '123456' }
};

const response = await fetch(
  'https://app-pis-api-production.andre-setiawanworkersdev.workers.dev/api/functions',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }
);

const data = await response.json();
console.log('Login response:', data);

// Expected:
// {
//   success: true,
//   token: "eyJhbGc...",
//   employee: { nik_karyawan: "123456", nama_lengkap: "John Doe", ... }
// }
```

### 🌐 **STEP 3: Test Manual Login via UI**

```
1. Open: https://app-pis.pages.dev
2. Enter credentials:
   - NIK: 123456
   - Password: 123456
3. Click: Login button

Expected:
  ✅ Redirect to Dashboard
  ✅ No CORS errors di console
  ✅ No red errors di Network tab
```

### 🔎 **STEP 4: Check Network & Console**

**Open DevTools (F12):**

```
Tab: Console
  ✅ No red errors
  ✅ No CORS blocked messages
  ⚠️  Warnings OK (yellow)

Tab: Network
  ✅ All requests returning 200/201
  ✅ API calls to app-pis-api-production
  ❌ No failed requests (status 4xx, 5xx)

Tab: Application/Storage
  ✅ JWT token stored (localStorage or sessionStorage)
  ✅ Look for key "token" atau "auth_token"
```

---

## 📈 **PHASE 3: PRODUCTION VALIDATION** (5 menit)

### ✅ **Final Checklist**

- [ ] Pages project created and deployed (status: "Ready")
- [ ] Frontend accessible at https://app-pis.pages.dev
- [ ] Worker health check returns 200 OK
- [ ] Environment variable VITE_API_URL set
- [ ] Login test successful via API
- [ ] Login test successful via UI
- [ ] No CORS errors in browser console
- [ ] No failed API requests in Network tab
- [ ] JWT token properly stored
- [ ] Database accessible (login returns employee data)
- [ ] File upload endpoint working

---

## 🎯 **SUCCESS INDICATORS**

### ✅ Everything Working When:

1. **Pages URL responds**: https://app-pis.pages.dev loads immediately
2. **Worker responds**: Health endpoint returns JSON in < 100ms
3. **Login succeeds**: Employee data returns with valid token
4. **CORS passes**: No "blocked by CORS" messages in console
5. **No errors**: All Network requests are 2xx status codes

### ❌ Troubleshooting If Issues:

**CORS Error: "Access to fetch blocked"**
```
Fix: Check CORS middleware in worker/src/middleware/index.js
Verify: https://app-pis.pages.dev is in allowedOrigins array
Redeploy: wrangler deploy --env production
```

**Build Failed in Pages**
```
Check: Pages build logs (dashboard > Deployments tab)
Common causes:
  - npm install failed
  - Missing dependencies
  - Build command syntax error

Solution: Fix locally, commit, push to GitHub (Pages auto-rebuilds)
```

**Database connection error**
```
Check: wrangler d1 shell app-pis-prod
       SELECT COUNT(*) FROM employees;

If fails: Database binding issue in wrangler.toml
Fix: Verify database_id is correct
```

**Token Error "NIK atau password salah"**
```
Check: Test credentials in database
$ wrangler d1 shell app-pis-prod
$ SELECT * FROM employees WHERE nik_karyawan = '123456';

If empty: Seed data not applied
Fix: wrangler d1 execute app-pis-prod --env production \
     --file migrations/002_seed_test_employee.sql
```

---

## 🔗 **IMPORTANT LINKS**

| Resource | URL |
|----------|-----|
| **Cloudflare Dashboard** | https://dash.cloudflare.com |
| **Pages Project** | https://dash.cloudflare.com/074076a2e5880aa07ba1e87d027c3b16/pages |
| **GitHub Repo** | https://github.com/andresetiawan-sketch/management-main |
| **Production Frontend** | https://app-pis.pages.dev |
| **Production Worker** | https://app-pis-api-production.andre-setiawanworkersdev.workers.dev |
| **Worker Health** | https://app-pis-api-production.andre-setiawanworkersdev.workers.dev/health |

---

## 📝 **NEXT ACTIONS**

### Immediate (Do Now):
1. ✅ Open Cloudflare Dashboard
2. ✅ Create Pages project (Steps 1-5 above)
3. ✅ Set environment variables (Step 6)
4. ✅ Wait for deployment to complete (Step 7)

### After Pages "Ready":
1. ✅ Test both endpoints
2. ✅ Verify login flow
3. ✅ Check console & network
4. ✅ Complete validation checklist

### If All Green:
🎉 **PRODUCTION DEPLOYMENT COMPLETE!**
- Share URL: https://app-pis.pages.dev
- Monitor Pages dashboard for performance
- Check worker logs: `wrangler tail --env production`

---

**Ready to proceed?**

✅ **Your next step**: Open Cloudflare dashboard and start PHASE 1 steps 1-7

**Then report back:**
- "Pages deployment complete"
- "Status shows Ready"

I'll help you verify all endpoints! 🚀
