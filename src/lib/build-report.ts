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
    idea.constraints,
    idea.assumptions,
  ].filter(Boolean);
  return parts.join(' ');
}

export function buildRoundTableReport(
  idea: IdeaUnderReview,
  personas: PersonaWithId[],
  includeSecurity: boolean,
  evalResult?: EvaluateResult,
): RoundTableReport {
  const coreIds = ['ceo', 'marketing-expert', 'product-manager', 'cpa', 'business-attorney', 'critic'];
  const panelPersonas = personas.filter(
    (p) => coreIds.includes(p.id) || (includeSecurity && p.id === 'security-compliance-officer'),
  );
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
    return {
      role: p.role,
      personaId: p.id,
      thesis,
      points: points.length > 0 ? points : [thesis],
      risks: ['Execution risk', 'Market timing', 'Resource constraint'].map((r) => `${r}: validate.`),
    };
  });

  const phase2: Phase2Debate = {
    round1Prompt: 'Core strategy tradeoffs: service-first vs product-first? SMB vs mid-market?',
    round1Takes: Object.fromEntries(panelPersonas.map((p) => [p.role, evalResultToUse.expertOpinions.find((o) => o.personaId === p.id)?.opinion ?? '—'])),
    round1Synthesis: {
      agreements: ['Idea is worth stress-testing.'],
      disagreements: ['Positioning and wedge need clarity.'],
      leaning: 'Go with conditions; narrow ICP and validate pricing.',
    },
    round2Prompt: "Wedge and GTM: what's the first offer and how do we get distribution?",
    round2Takes: Object.fromEntries(panelPersonas.map((p) => [p.role, 'Focus on one wedge; validate with 5–10 target customers.'])),
    round2Synthesis: {
      chosenWedge: idea.ideaOneLiner,
      chosenIcp: idea.targetCustomer || 'To be defined',
      differentiator: idea.jobToBeDone || 'To be defined',
    },
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
