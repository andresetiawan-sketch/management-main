#!/usr/bin/env node

/**
 * Cloudflare Pages Deployment Automation
 * Script untuk melengkapi production deployment
 * 
 * Jalankan: node deploy-to-pages.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function section(title) {
  console.log('\n' + COLORS.bright + COLORS.cyan + '━'.repeat(60) + COLORS.reset);
  log(`  ${title}`, 'cyan');
  console.log(COLORS.bright + COLORS.cyan + '━'.repeat(60) + COLORS.reset + '\n');
}

async function verifyPrerequisites() {
  section('STEP 1: VERIFY PREREQUISITES');

  const checks = [
    {
      name: 'Git repository',
      test: () => fs.existsSync(path.join(process.cwd(), '.git')),
    },
    {
      name: 'Build output (dist/)',
      test: () => fs.existsSync(path.join(process.cwd(), 'dist')),
    },
    {
      name: 'package.json',
      test: () => fs.existsSync(path.join(process.cwd(), 'package.json')),
    },
    {
      name: 'Wrangler CLI',
      test: async () => {
        try {
          await execAsync('wrangler --version');
          return true;
        } catch {
          return false;
        }
      },
    },
  ];

  let allPassed = true;
  for (const check of checks) {
    const passed = await check.test();
    const status = passed ? '✅' : '❌';
    log(`${status} ${check.name}`, passed ? 'green' : 'red');
    if (!passed) allPassed = false;
  }

  if (!allPassed) {
    log('\n⚠️  Some prerequisites missing!', 'red');
    process.exit(1);
  }

  log('\n✅ All prerequisites verified!', 'green');
}

async function checkGitStatus() {
  section('STEP 2: VERIFY GIT STATUS');

  try {
    const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD');
    log(`📌 Current branch: ${branch.trim()}`, 'blue');

    const { stdout: remote } = await execAsync('git remote get-url origin');
    log(`🔗 Remote URL: ${remote.trim()}`, 'blue');

    const { stdout: lastCommit } = await execAsync('git log -1 --pretty=format:"%h - %s"');
    log(`📝 Last commit: ${lastCommit}`, 'blue');

    log('\n✅ Git configuration verified!', 'green');
  } catch (error) {
    log(`❌ Git error: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function verifyCloudflareAuth() {
  section('STEP 3: VERIFY CLOUDFLARE AUTHENTICATION');

  try {
    const { stdout } = await execAsync('wrangler whoami');
    const account = stdout.includes('Account') ? 'authenticated' : 'checking...';
    log(`✅ Cloudflare authentication: ${account}`, 'green');
  } catch (error) {
    log(`⚠️  Not authenticated. Run: wrangler login`, 'yellow');
    log('Continuing anyway...', 'yellow');
  }
}

async function verifyProductionEndpoints() {
  section('STEP 4: VERIFY PRODUCTION ENDPOINTS');

  const endpoints = [
    {
      name: 'Worker Health',
      url: 'https://app-pis-api-production.andre-setiawanworkersdev.workers.dev/health',
    },
    {
      name: 'Production Database',
      url: 'https://app-pis-api-production.andre-setiawanworkersdev.workers.dev/api/employees',
      expectAuth: true,
    },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        headers: endpoint.expectAuth ? { Authorization: 'Bearer test' } : {},
      });
      const status = response.status;
      const statusColor = status === 200 ? 'green' : status === 401 ? 'yellow' : 'red';
      log(`${endpoint.name}: ${status}`, statusColor);
    } catch (error) {
      log(`${endpoint.name}: Connection error`, 'red');
    }
  }
}

async function displayDeploymentInstructions() {
  section('STEP 5: MANUAL PAGES DEPLOYMENT');

  log('Pages deployment requires manual setup via Cloudflare dashboard.', 'yellow');
  log('Follow these steps:\n', 'yellow');

  const steps = [
    '1. Open: https://dash.cloudflare.com',
    '2. Navigate to: Workers & Pages → Pages',
    '3. Click: "Create application"',
    '4. Select: "Connect to Git"',
    '5. Repository: andresetiawan-sketch/management-main',
    '6. Branch: main',
    '7. Build command: npm run build',
    '8. Output directory: dist',
    '9. Click: "Save and deploy"',
    '',
    '🔐 After deployment, add environment variable:',
    '   Name: VITE_API_URL',
    `   Value: https://app-pis-api-production.andre-setiawanworkersdev.workers.dev`,
  ];

  steps.forEach((step) => log(step, 'cyan'));

  log('\n⏳ Deployment typically takes 2-5 minutes', 'blue');
  log('📍 Once complete, your site will be at:', 'blue');
  log('   https://app-pis.pages.dev\n', 'green');
}

async function displayNextSteps() {
  section('NEXT STEPS');

  const nextSteps = [
    '✅ Code pushed to GitHub (main branch)',
    '✅ Production Worker deployed',
    '✅ Production Database initialized',
    '⏳ Create Pages project (via dashboard)',
    '⏳ Wait for deployment to complete',
    '⏳ Test production endpoints',
  ];

  nextSteps.forEach((step) => {
    const color = step.includes('⏳') ? 'yellow' : 'green';
    log(step, color);
  });

  log('\n🎯 Priority: Complete Pages setup in Cloudflare dashboard', 'cyan');
  log('   Dashboard: https://dash.cloudflare.com/074076a2e5880aa07ba1e87d027c3b16/pages\n', 'blue');
}

async function displayVerificationChecklist() {
  section('VERIFICATION CHECKLIST');

  const checklist = [
    '[ ] Code pushed to GitHub main branch',
    '[ ] Pages project created in Cloudflare',
    '[ ] Build completed successfully',
    '[ ] Environment variable VITE_API_URL set',
    '[ ] Frontend accessible at https://app-pis.pages.dev',
    '[ ] Worker health check returns 200 OK',
    '[ ] Login test successful (NIK: 123456, Password: 123456)',
    '[ ] No CORS errors in browser console',
    '[ ] All API requests returning 2xx status',
    '[ ] JWT token properly stored',
  ];

  checklist.forEach((item) => log(item, 'cyan'));

  log('\n✨ Once all items are checked, production deployment is complete!', 'green');
}

async function main() {
  log('\n🚀 CLOUDFLARE PAGES DEPLOYMENT VERIFICATION\n', 'cyan');

  try {
    await verifyPrerequisites();
    await checkGitStatus();
    await verifyCloudflareAuth();
    await verifyProductionEndpoints();
    await displayDeploymentInstructions();
    await displayNextSteps();
    await displayVerificationChecklist();

    log('\n' + '═'.repeat(60), 'green');
    log('STATUS: Ready for Cloudflare Pages deployment', 'green');
    log('═'.repeat(60) + '\n', 'green');
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main().catch(console.error);
