import type { PersonaWithId } from '@shared/types/persona';

export interface ExpertOpinion {
  personaId: string;
  role: string;
  summary: string;
  verdict: 'strong' | 'neutral' | 'weak';
  opinion: string;
  guiding_questions_considered: string[];
  /** Top risks from this expert's perspective; each item is a short phrase (e.g. "Execution risk: validate capacity"). */
  risks?: string[];
}

export interface EvaluateResult {
  idea: string;
  overallVerdict: 'good' | 'mixed' | 'weak';
  expertOpinions: ExpertOpinion[];
  /** Set by backend when OpenAI was used; undefined/false for local placeholder */
  aiUsed?: boolean;
}

export function evaluate(idea: string, personas: PersonaWithId[]): EvaluateResult {
  const expertOpinions: ExpertOpinion[] = personas.map((p) => {
    const questions = p.guiding_questions ?? [];
    const considered = questions.slice(0, 3);
    const verdict = deriveVerdict(idea, p);
    const opinion = buildOpinion(p, verdict);
    return {
      personaId: p.id,
      role: p.role,
      summary: p.summary,
      verdict,
      opinion,
      guiding_questions_considered: considered,
      risks: [
        `Execution risk: validate scope and capacity from ${p.role} perspective`,
        `Market timing: validate demand and readiness`,
        `Resource constraint: validate feasibility given your domain`,
      ],
    };
  });

  const verdicts = expertOpinions.map((o) => o.verdict);
  const strong = verdicts.filter((v) => v === 'strong').length;
  const weak = verdicts.filter((v) => v === 'weak').length;
  const total = verdicts.length;
  let overallVerdict: 'good' | 'mixed' | 'weak' = 'mixed';
  if (total > 0) {
    if (weak === 0 && strong >= total / 2) overallVerdict = 'good';
    else if (strong === 0 || weak >= total / 2) overallVerdict = 'weak';
  }

  return {
    idea,
    overallVerdict,
    expertOpinions,
  };
}

function deriveVerdict(idea: string, persona: PersonaWithId): 'strong' | 'neutral' | 'weak' {
  const text = (idea || '').toLowerCase();
  const principles = (persona.principles ?? []).join(' ').toLowerCase();
  const focus = (persona.decision_focus ?? '').toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < 10) return 'weak';
  if (wordCount >= 40 && (text + ' ' + principles + ' ' + focus).length > 200) return 'strong';
  return 'neutral';
}

function buildOpinion(
  persona: PersonaWithId,
  verdict: 'strong' | 'neutral' | 'weak',
): string {
  const focus = persona.decision_focus ?? 'this idea';
  const stance = persona.default_stance ?? '';
  const templates = {
    strong: `From a ${persona.role} perspective, the idea aligns well with ${focus}. ${stance} This direction shows promise; validate with real feedback.`,
    neutral: `As ${persona.role}: ${focus}. ${stance} The idea touches relevant areas; more clarity on scope and validation would help.`,
    weak: `From a ${persona.role} lens, ${focus} is not clearly addressed. ${stance} Consider strengthening this before moving forward.`,
  };
  return templates[verdict] ?? templates.neutral;
}
