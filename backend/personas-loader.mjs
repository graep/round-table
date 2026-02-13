import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PERSONAS_DIR = process.env.PERSONAS_DIR || path.join(__dirname, '..', 'personas');

/**
 * Load all persona JSON files and return PersonaWithId[].
 * @returns {Promise<Array<{ id: string, ...persona }>>}
 */
export async function loadPersonas() {
  const dir = PERSONAS_DIR;
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const out = [];
  for (const file of files) {
    const id = file.replace(/\.json$/, '');
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    try {
      const persona = JSON.parse(raw);
      out.push({ id, ...persona });
    } catch (_) {
      // skip invalid JSON
    }
  }
  return out;
}
