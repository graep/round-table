/**
 * Research a profession and create a new persona from the template using OpenAI.
 * Writes the new persona to the personas directory and returns it.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import OpenAI from 'openai';
import { loadPersonas, roleToId, savePersona } from './personas-loader.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PERSONAS_DIR = process.env.PERSONAS_DIR || path.join(__dirname, '..', 'personas');
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const TEMPLATE_PATH = path.join(PERSONAS_DIR, 'persona-template.json');

function loadTemplate() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error('persona-template.json not found in personas directory');
  }
  const raw = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  return JSON.parse(raw);
}

const RESEARCH_SYSTEM = `You are helping define an expert persona for a business-idea evaluation panel. Given a profession/role, you produce realistic, specific content so this expert can evaluate ideas from their domain. Be concrete and professional.`;

const RESEARCH_USER = (role) => `The role is: ${role}.

Return a single JSON object with exactly these keys (all strings or arrays of strings; no extra keys):
- summary: 2-3 sentences describing what this expert cares about and their lens on business ideas
- decision_focus: short phrase for what decisions they focus on
- default_stance: one sentence on their typical stance when evaluating ideas
- guiding_questions: array of 3-5 questions this expert would ask when evaluating an idea
- principles: array of 3-5 short principles they follow
- non_responsibilities: array of 2-4 things they explicitly do not decide
- authority_final_say_on: array of 2-4 topics where they have final say
- authority_defers_on: array of 2-4 topics where they defer to others

Respond with valid JSON only, no markdown or extra text.`;

/**
 * Call OpenAI to fill persona fields for the given role.
 * @param {string} role
 * @returns {Promise<object>} Parsed object with summary, decision_focus, etc. (keys match template)
 */
async function researchRoleWithOpenAI(role) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OPENAI_API_KEY is required to research and create personas');
  }

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: RESEARCH_SYSTEM },
      { role: 'user', content: RESEARCH_USER(role) },
    ],
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Invalid JSON from research response');
  }

  const authority = {
    final_say_on: Array.isArray(parsed.authority_final_say_on) ? parsed.authority_final_say_on : [parsed.authority_final_say_on].filter(Boolean),
    defers_on: Array.isArray(parsed.authority_defers_on) ? parsed.authority_defers_on : [parsed.authority_defers_on].filter(Boolean),
  };
  if (authority.final_say_on.length === 0) authority.final_say_on = [''];
  if (authority.defers_on.length === 0) authority.defers_on = [''];

  return {
    name: '',
    role,
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    decision_focus: typeof parsed.decision_focus === 'string' ? parsed.decision_focus : '',
    default_stance: typeof parsed.default_stance === 'string' ? parsed.default_stance : '',
    guiding_questions: Array.isArray(parsed.guiding_questions) ? parsed.guiding_questions : [''],
    principles: Array.isArray(parsed.principles) ? parsed.principles : [''],
    non_responsibilities: Array.isArray(parsed.non_responsibilities) ? parsed.non_responsibilities : [''],
    authority,
    notes: '',
  };
}

/**
 * Create a persona for the given role: use existing if one matches, otherwise research and save.
 * @param {string} role - Profession/role name (e.g. "Horticulturist")
 * @returns {Promise<{ id: string, ...persona }>} Persona with id
 */
export async function createPersonaForRole(role) {
  const trimmed = typeof role === 'string' ? role.trim() : '';
  if (!trimmed) {
    throw new Error('role is required');
  }

  const id = roleToId(trimmed);
  const existing = await loadPersonas();
  const match = existing.find((p) => p.id === id || (p.role && p.role.toLowerCase() === trimmed.toLowerCase()));
  if (match) {
    return match;
  }

  const template = loadTemplate();
  const researched = await researchRoleWithOpenAI(trimmed);

  const persona = {
    id,
    name: template.name ?? '',
    role: trimmed,
    summary: researched.summary || (template.summary ?? ''),
    decision_focus: researched.decision_focus || (template.decision_focus ?? ''),
    default_stance: researched.default_stance || (template.default_stance ?? ''),
    guiding_questions: Array.isArray(researched.guiding_questions) && researched.guiding_questions.length
      ? researched.guiding_questions
      : (Array.isArray(template.guiding_questions) ? template.guiding_questions : ['']),
    principles: Array.isArray(researched.principles) && researched.principles.length
      ? researched.principles
      : (Array.isArray(template.principles) ? template.principles : ['']),
    non_responsibilities: Array.isArray(researched.non_responsibilities) && researched.non_responsibilities.length
      ? researched.non_responsibilities
      : (Array.isArray(template.non_responsibilities) ? template.non_responsibilities : ['']),
    authority: researched.authority?.final_say_on
      ? researched.authority
      : (template.authority && typeof template.authority === 'object'
          ? template.authority
          : { final_say_on: [''], defers_on: [''] }),
    notes: template.notes ?? '',
  };

  savePersona(id, persona);
  return persona;
}
