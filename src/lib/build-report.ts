import type { PersonaWithId } from '@shared/types/persona';
import type {
  IdeaUnderReview,
  RoundTableReport,
  Phase0Routing,
  Phase1Take,
  Phase2Debate,
  Phase3Verdict,
  VerdictType,
} from '../types/round-table';
import { suggestSecurity } from '../types/round-table';
import { evaluate } from './evaluate';
import type { EvaluateResult } from './evaluate';

export function fullIdeaText(idea: IdeaUnderReview): string {
  const parts = [
    idea.ideaOneLiner,
    ...(idea.contextBullets ?? []),
    idea.targetCustomer,
    idea.jobToBeDone,
    ...(idea.constraints ?? []),
    ...(idea.assumptions ?? []),
  ].filter(Boolean);
  return parts.join(' ');
}

export function buildRoundTableReport(
  idea: IdeaUnderReview,
  personas: PersonaWithId[],
  panelPersonaIds: string[],
  includeSecurity: boolean,
  evalResult?: EvaluateResult,
): RoundTableReport {
  const panelPersonas = personas.filter((p) => panelPersonaIds.includes(p.id));
  const text = fullIdeaText(idea);
  const securitySuggested = suggestSecurity(text);

  const runPanel = true;
  const phase0: Phase0Routing = {
    runPanel,
    includeSecurity,
    routingReason: securitySuggested && includeSecurity
      ? 'Idea touches sensitive data, compliance, or security; Security & Compliance Officer included.'
      : includeSecurity
        ? 'Security & Compliance included by user choice.'
        : 'Core panel only; no security/compliance triggers.',
    interpretation: idea.ideaOneLiner + (idea.jobToBeDone ? ` Focus: ${idea.jobToBeDone}.` : ''),
    outOfScope: 'Implementation details, final pricing, and legal advice are for follow-up.',
    criteria: [
      'Market pull and demand',
      'Differentiation and wedge',
      'Feasibility and scope',
      'Distribution and GTM',
      'Unit economics',
      'Risk and compliance',
    ],
  };

  const evalResultToUse = evalResult ?? evaluate(text, panelPersonas);
  const aiUsed = evalResult?.aiUsed ?? false;
  const phase1: Phase1Take[] = panelPersonas.map((p) => {
    const opinion = evalResultToUse.expertOpinions.find((o) => o.personaId === p.id);
    const thesis = opinion?.opinion ?? p.default_stance ?? 'See perspective.';
    const points = (p.guiding_questions ?? []).slice(0, 3);
    const risks =
      opinion?.risks && opinion.risks.length > 0
        ? opinion.risks
        : ['Execution risk', 'Market timing', 'Resource constraint'];
    return {
      role: p.role,
      personaId: p.id,
      thesis,
      points: points.length > 0 ? points : [thesis],
      risks,
    };
  });

  const phase2: Phase2Debate = {
    debateSessions: [],
  };

  const verdictFromEval = (): VerdictType => {
    const v = evalResultToUse.overallVerdict;
    if (v === 'good') return 'GO-WITH-CONDITIONS';
    if (v === 'weak') return 'PIVOT';
    return 'GO-WITH-CONDITIONS';
  };

  const phase3: Phase3Verdict = {
    verdict: verdictFromEval(),
    rationale: evalResultToUse.expertOpinions.length
      ? `Panel view: ${evalResultToUse.overallVerdict}. ${evalResultToUse.expertOpinions[0]?.opinion ?? ''}`
      : 'Run experiments before full commit.',
    conditionsForYes: 'Clear ICP, validated pricing, and MVP scope agreed.',
    mvpDeliverables: ['Core user flow', 'Single pricing tier', 'Onboarding + support playbook'],
    nonGoals: 'Custom contracts, full compliance certification, multi-region at launch.',
    suggestedStack: 'Start with existing tools; add stack once wedge is proven.',
    experiments: [
      { name: 'Customer interviews', method: '5–10 calls with target customer', metric: 'Willingness to pay signal', timebox: '7 days' },
      { name: 'Landing + waitlist', method: 'Simple page + email signup', metric: 'Signup rate and open rate', timebox: '14 days' },
      { name: 'Pricing test', method: 'Offer 2–3 options and measure preference', metric: 'Selection and feedback', timebox: '7 days' },
    ],
    killCriteria: [
      { condition: 'No willingness to pay after 10 conversations', action: 'Pivot or narrow ICP' },
      { condition: 'Scope creeps beyond 6-week MVP', action: 'Cut scope or defer' },
      { condition: 'Legal or compliance blocker', action: 'Resolve before launch or stop' },
    ],
  };

  return {
    idea,
    phase0,
    phase1,
    phase2,
    phase3,
    aiUsed,
  };
}
