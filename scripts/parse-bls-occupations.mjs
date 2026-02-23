/**
 * Parses BLS OOH A-Z index content (markdown-style with - [Title](url) or , see: [Canonical](url))
 * and writes a sorted, deduplicated JSON array of occupation titles.
 *
 * Usage: node scripts/parse-bls-occupations.mjs [path-to-bls-index.txt]
 * If no path given, reads from scripts/bls-a-z-index.txt (paste or save BLS page content there).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const navPattern = /^(OOH |A-Z INDEX|HOW TO|OCCUPATION|OOH HOME|OOH SITE MAP|OOH FAQ|PRINTER-FRIENDLY|Back to Top|Publications|Bureau of Labor)/i;
// Match "- [Title](url)" and optionally ", see: [Canonical](url)" on the same line
const lineRegex = /-\s*\[([^\]]+)\]\(https:\/\/www\.bls\.gov[^)]+\)(?:,\s*see:\s*\[([^\]]+)\]\(https:\/\/[^)]+\))?/;

function isNav(title) {
  if (!title || title.length > 80) return true;
  if (navPattern.test(title.trim())) return true;
  if (/^[A-Z\s|]+$/.test(title) && title.length < 50) return true;
  return false;
}

function extractTitles(line) {
  const titles = [];
  const m = line.match(lineRegex);
  if (!m) return titles;
  const first = m[1].trim();
  if (!isNav(first)) titles.push(first);
  if (m[2]) {
    const canonical = m[2].trim();
    if (!isNav(canonical)) titles.push(canonical);
  }
  return titles;
}

function main() {
  const inputPath = process.argv[2] || path.join(__dirname, 'bls-a-z-index.txt');
  if (!fs.existsSync(inputPath)) {
    console.error('Input file not found:', inputPath);
    console.error('Usage: node scripts/parse-bls-occupations.mjs [path-to-bls-index.txt]');
    process.exit(1);
  }
  const content = fs.readFileSync(inputPath, 'utf8');
  const seen = new Set();
  for (const line of content.split('\n')) {
    for (const title of extractTitles(line)) {
      if (title) seen.add(title);
    }
  }
  const sorted = [...seen].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  const outPath = path.join(root, 'src', 'data', 'bls-occupations.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(sorted, null, 0), 'utf8');
  console.log('Wrote', sorted.length, 'occupations to', outPath);
}

main();
