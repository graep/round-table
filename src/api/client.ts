import type { PersonaWithId } from '@shared/types/persona';
import { loadPersonas as loadPersonasLocal } from '../lib/personas';
import { evaluate as evaluateLocal } from '../lib/evaluate';

const API_BASE = import.meta.env.VITE_API_URL;

export async function listPersonas(): Promise<PersonaWithId[]> {
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/personas`);
    if (!res.ok) throw new Error('Failed to load experts');
    return res.json();
  }
  return loadPersonasLocal();
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
