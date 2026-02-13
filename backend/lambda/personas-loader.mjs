import fs from 'fs';
import path from 'path';

/**
 * Load personas from a directory (for Lambda: bundle contains ./personas/*.json).
 * @param {string} dir
 * @returns {Promise<Array<{ id: string, ...persona }>>}
 */
export async function loadPersonasFromFs(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const out = [];
  for (const file of files) {
    const id = file.replace(/\.json$/, '');
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    try {
      const persona = JSON.parse(raw);
      out.push({ id, ...persona });
    } catch (_) {}
  }
  return out;
}
