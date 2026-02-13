import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'personas');
const dest = path.join(root, 'public', 'personas');

if (!fs.existsSync(src)) {
  console.warn('personas/ not found, skipping copy');
  process.exit(0);
}
fs.mkdirSync(dest, { recursive: true });
for (const f of fs.readdirSync(src)) {
  if (f.endsWith('.json')) fs.copyFileSync(path.join(src, f), path.join(dest, f));
}
console.log('Copied personas to public/personas');
