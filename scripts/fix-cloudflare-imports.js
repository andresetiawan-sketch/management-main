import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..', 'src');
const extensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
let fixedCount = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!extensions.has(path.extname(fullPath))) continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    const replaced = content.split("from '@/api/cloudflareClient;").join("from '@/api/cloudflareClient';");
    if (replaced !== content) {
      fs.writeFileSync(fullPath, replaced, 'utf8');
      console.log('fixed', fullPath);
      fixedCount += 1;
    }
  }
}

walk(root);
console.log('total fixed:', fixedCount);
