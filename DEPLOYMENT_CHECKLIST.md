# 📋 APP-PIS DEPLOYMENT CHECKLIST

## PRE-DEPLOYMENT (Development Phase)

### Code Quality ✓

- [ ] All `@base44` imports removed from components
- [ ] All `base44Client` calls replaced with `apiClient` (cloudflareClient.js)
- [ ] No hardcoded `base44.com` URLs in code
- [ ] ESLint passes: `npm run lint`
- [ ] No console.log() left in production code
- [ ] Error messages don't leak sensitive information

### Frontend Setup ✓

- [ ] `frontend/.env.local` configured for local development
  - `VITE_API_URL=http://localhost:8787`
- [ ] `frontend/.env.staging` configured
  - `VITE_API_URL=https://app-pis-staging-api.example.com`
- [ ] `frontend/.env.production` configured
  - `VITE_API_URL=https://app-pis-api.example.com`
- [ ] Vite build output: `npm run build`
- [ ] No build errors or warnings
- [ ] `dist/` folder has all assets and index.html
- [ ] Logo updated from base44.com to local `/public/logo.svg`
- [ ] No import errors from @base44/\* packages

### Backend Setup ✓

- [ ] All Base44 functions migrated to Worker handlers:
  - [ ] `employeeLogin` → `/api/auth/login` (auth.js)
  - [ ] `getEmployeeByNik` → `/api/employees/nik/:nik` (employees.js)
  - [ ] `employeeResetPassword` → `/api/auth/reset-password` (auth.js)
  - [ ] Other functions → appropriate handlers
- [ ] D1 migrations created and tested locally
- [ ] Worker handlers tested with Wrangler dev: `cd worker && npm run dev`
- [ ] CORS middleware configured for all environments
- [ ] Error handling implemented (try-catch in all handlers)
- [ ] Logging configured for debugging

### Database ✓

- [ ] D1 schema created (`migrations/001_init_schema.sql`)
- [ ] All tables created with proper indexes
- [ ] Sample/seed data prepared (if needed)
- [ ] No N+1 queries in code
- [ ] Foreign keys configured
- [ ] Timestamps (created_at, updated_at) added to all tables

### Security ✓

- [ ] JWT_SECRET generated and secure
- [ ] Passwords will be hashed with bcrypt (not plain text)
- [ ] API endpoints require authentication (except /api/auth/login)
- [ ] CORS origins whitelisted (not `*`)
- [ ] No secrets in environment files
- [ ] No sensitive data in error messages
- [ ] Rate limiting considered for endpoints
- [ ] Base44 API keys/tokens removed

### Testing ✓

- [ ] Login flow works locally
- [ ] Employee list/filter works
- [ ] Shift operations work
- [ ] Attendance check-in/out works
- [ ] Database migrations run without errors
- [ ] Error responses formatted correctly
- [ ] No CORS errors in browser console
- [ ] Request timeout handling works

---

## STAGING DEPLOYMENT

### Infrastructure Setup ✓

- [ ] Cloudflare account created
- [ ] Cloudflare Pages project created: `app-pis-staging`
  - [ ] GitHub repository connected
  - [ ] Build command: `npm run build`
  - [ ] Output directory: `dist`
- [ ] Cloudflare Worker created for API: `app-pis-api-staging`
- [ ] D1 database created: `app-pis-staging`
  - [ ] Database ID noted in wrangler.toml
- [ ] R2 bucket created: `app-pis-staging-uploads`
  - [ ] Bucket name noted in wrangler.toml
- [ ] Domain or workers.dev URL configured
- [ ] GitHub Actions workflow created (optional)

### Configuration ✓

- [ ] `wrangler.toml` has staging environment section
- [ ] All staging environment variables set
- [ ] D1 binding: `DB` configured
- [ ] R2 binding: `STORAGE` configured
- [ ] Secrets set via `wrangler secret put`:
  - [ ] `wrangler secret put JWT_SECRET --env staging`
  - [ ] (Other secrets as needed)

### Deployment ✓

- [ ] `npm run build` succeeds without errors
- [ ] `wrangler deploy --env staging` succeeds
- [ ] Frontend deployed to Pages
- [ ] `/health` endpoint returns `{ status: 'ok' }`
- [ ] No 502 Bad Gateway errors

### Testing ✓

- [ ] Login with valid credentials: ✓ Returns token
- [ ] Login with invalid credentials: ✓ Returns 401
- [ ] GET `/api/employees`: ✓ Returns list
- [ ] POST `/api/employees`: ✓ Creates employee
- [ ] File upload to R2: ✓ Works
- [ ] Database queries: ✓ No SQL errors
- [ ] Error responses: ✓ Proper JSON format
- [ ] No CORS errors in browser DevTools

### Monitoring ✓

- [ ] Cloudflare Analytics enabled
- [ ] Error logging configured
- [ ] Database query performance checked
- [ ] Response times acceptable (<1s per request)

---

## PRODUCTION DEPLOYMENT

### Final Verification ✓

- [ ] All staging tests passed
- [ ] Code reviewed by team
- [ ] No `console.log()` in production code
- [ ] All @base44 references completely removed
- [ ] Base44 dependencies removed from package.json
- [ ] No hardcoded URLs or API keys

### Environment Configuration ✓

- [ ] Production environment variables configured
- [ ] All secrets set via `wrangler secret put --env production`
- [ ] Database credentials stored securely
- [ ] API URL points to correct domain
- [ ] No secrets in version control

### Infrastructure ✓

- [ ] Cloudflare Pages project for production: `app-pis`
- [ ] Cloudflare Worker for production API
- [ ] D1 database for production: `app-pis-prod`
- [ ] R2 bucket for production: `app-pis-prod-uploads`
- [ ] Custom domain configured
- [ ] SSL certificates auto-renewed by Cloudflare

### Database ✓

- [ ] Production D1 database created
- [ ] Schema migrations applied
- [ ] Backups configured (if available)
- [ ] Database performance tested
- [ ] Indexes present and optimized

### Deployment Process ✓

- [ ] Full build succeeds: `npm run build`
- [ ] All tests pass
- [ ] `wrangler deploy --env production` succeeds
- [ ] Frontend deployed to Pages
- [ ] Worker endpoints responding
- [ ] Database migrations completed

### Post-Deployment Verification ✓

- [ ] Health check passes: `GET /health` → 200
- [ ] Login works end-to-end
- [ ] User can perform core operations
- [ ] No errors in Cloudflare dashboard
- [ ] No 5xx errors in logs

### Smoke Tests (Run manually) ✓

```bash
# 1. Test health endpoint
curl https://app-pis-api.example.com/health

# 2. Test login
curl -X POST https://app-pis-api.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nik":"123456","password":"testpass"}'

# 3. Test employee list (with token)
curl https://app-pis-api.example.com/api/employees \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Check response times
time curl https://app-pis-api.example.com/api/employees
```

### Monitoring & Alerting ✓

- [ ] Cloudflare Analytics Dashboard reviewed
- [ ] Error tracking configured (Sentry, LogRocket, etc.)
- [ ] Performance monitoring set up
- [ ] On-call rotation established
- [ ] Incident response plan documented
- [ ] Rollback procedure tested

### Communication ✓

- [ ] Team notified of new API endpoints
- [ ] Documentation updated
- [ ] API reference shared with frontend team
- [ ] Database schema documented
- [ ] Deployment notes saved

### Rollback Plan ✓

- [ ] Previous version backed up
- [ ] Rollback script prepared
- [ ] Database rollback procedure documented
- [ ] Team trained on rollback process

---

## POST-DEPLOYMENT

### Monitoring (First 24 hours)

- [ ] Error rate normal (< 1%)
- [ ] Response times acceptable
- [ ] No database connection issues
- [ ] R2 uploads working
- [ ] Authentication working smoothly
- [ ] No suspicious activity

### Issues Found & Fixed

- [ ] Bug 1: ****\_\_**** - Fixed ✓
- [ ] Bug 2: ****\_\_**** - Fixed ✓
- [ ] ...

### Documentation

- [ ] API documentation updated
- [ ] Database schema documented
- [ ] Deployment notes saved
- [ ] Known issues listed
- [ ] Future improvements noted

---

## CRITICAL CHECKLIST (DO NOT SKIP!)

```
🔴 BEFORE DEPLOYING TO PRODUCTION:

1. NO BASE44 REFERENCES
   grep -r "@base44\|base44\.com\|VITE_BASE44" . || echo "✓ Clean"

2. NO HARDCODED URLS
   grep -r "https://base44\|http://base44" . || echo "✓ Clean"

3. NO .env FILES IN GIT
   git check-ignore .env* || echo "✓ No env files tracked"

4. SECRETS SET IN CLOUDFLARE
   wrangler secret list --env production | grep -E "JWT_SECRET|"

5. DATABASE MIGRATIONS RUN
   wrangler d1 execute app-pis-prod --file migrations/001_init_schema.sql

6. HEALTH CHECK WORKS
   curl https://app-pis-api.example.com/health

7. LOGIN WORKS
   # Test with valid credentials

8. PERFORMANCE ACCEPTABLE
   # First request < 500ms, subsequent < 100ms
```

---

## USEFUL COMMANDS

```bash
# Setup
npm install (root)
cd frontend && npm install
cd worker && npm install

# Development
npm run dev                          # All services
cd frontend && npm run dev           # Just frontend
cd worker && npm run dev             # Just worker

# Build & Test
npm run build
npm run lint
npm run test

# Database
cd worker
wrangler d1 execute app-pis-main --file migrations/001_init_schema.sql
wrangler d1 shell app-pis-main      # Interactive SQL shell

# Secrets
wrangler secret put JWT_SECRET --env production
wrangler secret put SENDGRID_API_KEY --env production

# Deployment
npm run deploy:staging
npm run deploy:production

# Monitoring
wrangler tail --env production       # Live logs
wrangler d1 info app-pis-prod       # Database info
wrangler r2 ls app-pis-prod-uploads # List R2 files

# Rollback
wrangler rollback --env production
```

---

**Status**: Ready for Deployment  
**Last Updated**: 2024-12-16  
**Deployed By**: (Your Name)  
**Date Deployed**: ****\_\_\_****
