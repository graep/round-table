import type { PersonaWithId } from '@shared/types/persona';
import { loadPersonas as loadPersonasLocal } from '../lib/personas';
import { evaluate as evaluateLocal } from '../lib/evaluate';

const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? '/api' : undefined);

export async function listPersonas(): Promise<PersonaWithId[]> {
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/personas`);
    if (!res.ok) throw new Error('Failed to load experts');
    return res.json();
  }
  return loadPersonasLocal();
}

/**
 * Create or get a persona for the given role. If the expert exists in the project, returns it;
 * otherwise the API researches the profession and creates a new persona from the template.
 */
export async function createPersonaForRole(role: string): Promise<PersonaWithId> {
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/personas/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: role.trim() }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.detail || err?.error || 'Failed to create expert';
      throw new Error(msg);
    }
    return res.json();
  }
  throw new Error('API is required to create personas');
}

export interface EvaluateRequest {
  idea: string;
  personaIds: string[];
}

export interface ExpertOpinion {
  personaId: string;
  role: string;
  summary: string;
  verdict: 'strong' | 'neutral' | 'weak';
  opinion: string;
  guiding_questions_considered: string[];
  /** Top risks from this expert's perspective (e.g. "Execution risk: validate capacity"). */
  risks?: string[];
}

export interface EvaluateResponse {
  idea: string;
  overallVerdict: 'good' | 'mixed' | 'weak';
  expertOpinions: ExpertOpinion[];
}

export async function evaluateIdea(req: EvaluateRequest): Promise<EvaluateResponse> {
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.detail || err?.error || 'Evaluation failed';
      throw new Error(msg);
    }
    return res.json();
  }
  const personas = await loadPersonasLocal();
  const selected = personas.filter((p) => req.personaIds.includes(p.id));
  if (selected.length === 0) throw new Error('No matching experts selected');
  return evaluateLocal(req.idea, selected) as EvaluateResponse;
}

export interface DebateRequest {
  idea: string;
  phase1TakeText: string;
  targetRole: string;
  targetPersonaId: string;
  respondentPersonaIds: string[];
}

export interface DebateResponseItem {
  personaId: string;
  role: string;
  response: string;
}

export interface DebateResponse {
  responses: DebateResponseItem[];
  aiUsed?: boolean;
}

export async function runDebate(req: DebateRequest): Promise<DebateResponse> {
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/debate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.detail || err?.error || 'Debate failed';
      throw new Error(msg);
    }
    return res.json();
  }
  const personas = await loadPersonasLocal();
  const respondents = personas.filter((p) => req.respondentPersonaIds.includes(p.id));
  if (respondents.length === 0) throw new Error('No matching experts selected for debate');
  return {
    responses: respondents.map((p) => ({
      personaId: p.id,
      role: p.role,
      response: `As ${p.role}, I'd stress-test ${req.targetRole}'s points from my perspective.`,
    })),
    aiUsed: false,
  };
}

