#!/usr/bin/env node

/**
 * ============================================
 * FRAMEWORK DETECTION & AUDIT SCRIPT
 * ============================================
 * Usage: node detect-framework.js
 * Detects whether React app uses Vite, CRA, Next.js, or Remix
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\n🔍 FRAMEWORK DETECTION & PROJECT AUDIT\n');
console.log('=' .repeat(60));

// 1. Read package.json
const packageJsonPath = path.join(__dirname, 'package.json');
let packageJson = {};

try {
  const content = fs.readFileSync(packageJsonPath, 'utf-8');
  packageJson = JSON.parse(content);
} catch (error) {
  console.error('❌ Error reading package.json:', error.message);
  process.exit(1);
}

console.log('\n📦 PACKAGE.JSON ANALYSIS\n');
console.log(`Project Name: ${packageJson.name}`);
console.log(`Version: ${packageJson.version}`);
console.log(`Type: ${packageJson.type || 'commonjs'}`);
console.log(`React Version: ${packageJson.dependencies?.react || 'NOT FOUND'}`);

// 2. Framework Detection
let detectedFramework = 'UNKNOWN';
const indicators = {
  vite: [],
  cra: [],
  nextjs: [],
  remix: [],
};

// Check devDependencies
const devDeps = packageJson.devDependencies || {};
const deps = packageJson.dependencies || {};

if (devDeps.vite) {
  indicators.vite.push(`✓ vite@${devDeps.vite} in devDependencies`);
}
if (devDeps['@vitejs/plugin-react']) {
  indicators.vite.push(`✓ @vitejs/plugin-react@${devDeps['@vitejs/plugin-react']}`);
}

if (devDeps['react-scripts']) {
  indicators.cra.push(`✓ react-scripts@${devDeps['react-scripts']} in devDependencies`);
}

if (deps.next || devDeps.next) {
  indicators.nextjs.push(`✓ next@${deps.next || devDeps.next}`);
}

if (devDeps['@remix-run/dev'] || deps['@remix-run/react']) {
  indicators.remix.push(`✓ Remix dependencies found`);
}

// Check scripts
const scripts = packageJson.scripts || {};
if (scripts.dev?.includes('vite')) {
  indicators.vite.push(`✓ Script "dev" uses vite: "${scripts.dev}"`);
}
if (scripts.dev?.includes('react-scripts')) {
  indicators.cra.push(`✓ Script "dev" uses react-scripts: "${scripts.dev}"`);
}
if (scripts.dev?.includes('next dev')) {
  indicators.nextjs.push(`✓ Script "dev" uses next dev: "${scripts.dev}"`);
}
if (scripts.dev?.includes('remix dev')) {
  indicators.remix.push(`✓ Script "dev" uses remix dev: "${scripts.dev}"`);
}

// Determine framework
if (indicators.vite.length > 0) {
  detectedFramework = 'VITE + REACT';
} else if (indicators.cra.length > 0) {
  detectedFramework = 'CREATE REACT APP (CRA)';
} else if (indicators.nextjs.length > 0) {
  detectedFramework = 'NEXT.JS';
} else if (indicators.remix.length > 0) {
  detectedFramework = 'REMIX';
}

console.log('\n\n🎯 FRAMEWORK DETECTION RESULTS\n');
console.log(`Detected Framework: ${detectedFramework}\n`);

// Show indicators
Object.entries(indicators).forEach(([framework, found]) => {
  if (found.length > 0) {
    console.log(`\n✅ ${framework.toUpperCase()}:`);
    found.forEach(indicator => console.log(`   ${indicator}`));
  }
});

// 3. Check config files
console.log('\n\n📄 CONFIG FILES\n');

const configFiles = [
  { name: 'vite.config.js', framework: 'Vite' },
  { name: 'vite.config.ts', framework: 'Vite' },
  { name: 'next.config.js', framework: 'Next.js' },
  { name: 'remix.config.js', framework: 'Remix' },
  { name: 'craco.config.js', framework: 'CRA (with CRACO)' },
  { name: 'jsconfig.json', framework: 'TypeScript/Module Config' },
  { name: 'tsconfig.json', framework: 'TypeScript Config' },
];

configFiles.forEach(({ name, framework }) => {
  const filePath = path.join(__dirname, name);
  if (fs.existsSync(filePath)) {
    console.log(`✓ ${name.padEnd(20)} (${framework})`);
  }
});

// 4. Base44 References Check
console.log('\n\n🔗 BASE44 REFERENCES CHECK\n');

const filesToCheck = [
  'package.json',
  'vite.config.js',
  'src/api/base44Client.js',
  'src/lib/app-params.js',
  'index.html',
];

let base44References = 0;

filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const matches = (content.match(/@base44|base44\.com|VITE_BASE44/g) || []).length;
    if (matches > 0) {
      console.log(`⚠️  ${file}: ${matches} reference(s) to base44`);
      base44References += matches;
    }
  }
});

console.log(`\nTotal base44 references found: ${base44References}`);

// 5. Structure analysis
console.log('\n\n📁 PROJECT STRUCTURE\n');

const dirs = [
  'src',
  'src/components',
  'src/pages',
  'src/api',
  'src/lib',
  'src/hooks',
  'public',
  'dist',
  'node_modules',
];

dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    const stat = fs.statSync(dirPath);
    if (stat.isDirectory()) {
      const files = fs.readdirSync(dirPath).length;
      console.log(`✓ ${dir.padEnd(25)} (${files} items)`);
    }
  }
});

// 6. Recommendations
console.log('\n\n💡 RECOMMENDATIONS\n');
console.log('=' .repeat(60));

if (detectedFramework === 'VITE + REACT') {
  console.log(`
✅ Framework: VITE + REACT
   Your project uses Vite as the build tool.

📋 Migration Path for Cloudflare:
   1. No major build changes needed
   2. Vite output (dist/) deploys directly to Cloudflare Pages
   3. Create Workers for API backend
   4. No CRA eject needed
   5. No Next.js export issues
   6. No Remix precompilation needed

⚡ Performance Benefits:
   - Native ES modules
   - Fast HMR (Hot Module Reload)
   - Efficient code splitting
   - Tree-shaking ready

🚀 Next Steps:
   1. Create /worker directory for backend
   2. Set up wrangler.toml
  3. Migrate Base44 functions to Cloudflare Workers
  4. Replace legacy Base44 SDK imports with cloudflareClient.js
   5. Set up D1 database migrations
   6. Configure R2 for file uploads
  `);
} else if (detectedFramework === 'CREATE REACT APP (CRA)') {
  console.log(`
⚠️  Framework: CREATE REACT APP (CRA)
   Your project uses CRA with react-scripts.

📋 Migration Path for Cloudflare:
   OPTION A (Recommended): Migrate to Vite
     - npm install -D vite @vitejs/plugin-react
     - Create vite.config.js
     - Update package.json scripts
     - Move index.html to root
     - npm run build with Vite
     - Deploy to Cloudflare Pages
     
   OPTION B: Keep CRA
     - npm run build generates dist/
     - Deploy dist/ to Cloudflare Pages
     - Still works, but not optimized

🚀 Next Steps (after Vite migration):
   1. Create /worker directory for backend
   2. Set up wrangler.toml
  3. Migrate Base44 functions to Workers
  4. Replace legacy Base44 SDK imports with cloudflareClient.js
  `);
} else if (detectedFramework === 'NEXT.JS') {
  console.log(`
⚠️  Framework: NEXT.JS
   Your project uses Next.js.

📋 Migration Path for Cloudflare:
   Your Next.js API routes can be migrated to Cloudflare Workers.
   Next.js Pages can be deployed to Cloudflare Pages with:
   - npm run build (generate static files)
   - Deploy /out or /.next/standalone
   
   OR use Next.js with Cloudflare:
   https://developers.cloudflare.com/pages/framework-guides/nextjs/

🚀 Next Steps:
   1. Add @cloudflare/next-on-pages
   2. Update next.config.js
   3. Configure Cloudflare Pages
  `);
} else if (detectedFramework === 'REMIX') {
  console.log(`
⚠️  Framework: REMIX
   Your project uses Remix.

📋 Migration Path for Cloudflare:
   Remix has native Cloudflare Workers support!
   Use the Remix Cloudflare template:
   
   npm install -D @remix-run/cloudflare-pages @remix-run/cloudflare

🚀 Next Steps:
   1. Configure Remix for Cloudflare
   2. Use Cloudflare D1 as database
   3. Use Cloudflare KV for caching
  `);
}

console.log('\n' + '=' .repeat(60));
console.log('\n✅ Audit Complete!\n');
