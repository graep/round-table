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

/**
 * Derive a stable file id from a role string (must match frontend roleToId).
 * @param {string} role
 * @returns {string}
 */
export function roleToId(role) {
  return (
    role
      .toLowerCase()
      .replace(/\s*\/\s*/g, '-')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'custom-expert'
  );
}

/**
 * Write a persona to disk as personas/{id}.json. Does not include id in the JSON body.
 * @param {string} id - Filename without .json
 * @param {object} persona - Persona fields (role, summary, etc.); id is omitted when writing
 */
export function savePersona(id, persona) {
  const dir = PERSONAS_DIR;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const { id: _dropped, ...body } = persona;
  const filePath = path.join(dir, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf-8');
}
