/**
 * Lambda handler for Round Table API.
 * Event from API Gateway HTTP API (v2 payload).
 * Routes: GET /api/personas, POST /api/evaluate
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { loadPersonasFromFs } from './personas-loader.mjs';
// In Lambda bundle, evaluate.mjs is copied to same dir; use ./evaluate.mjs (set by build)
import { evaluate } from '../evaluate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PERSONAS_DIR = path.join(__dirname, 'personas');
let cachedPersonas = null;

async function getPersonas() {
  if (cachedPersonas) return cachedPersonas;
  cachedPersonas = await loadPersonasFromFs(PERSONAS_DIR);
  return cachedPersonas;
}

export async function handler(event) {
  const path = event.rawPath || event.path || '';
  const method = (event.requestContext?.http?.method || event.httpMethod || '').toUpperCase();

  const isList = method === 'GET' && path.includes('personas');
  const isEvaluate = method === 'POST' && path.includes('evaluate');

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    if (isList) {
      const personas = await getPersonas();
      return { statusCode: 200, headers, body: JSON.stringify(personas) };
    }

    if (isEvaluate) {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
      const { idea, personaIds } = body;
      if (!idea || !Array.isArray(personaIds) || personaIds.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'idea and non-empty personaIds required' }),
        };
      }
      const all = await getPersonas();
      const selected = all.filter((p) => personaIds.includes(p.id));
      if (selected.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No matching personas found' }),
        };
      }
      const result = await evaluate(idea, selected);
      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (e) {
    console.error(e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
