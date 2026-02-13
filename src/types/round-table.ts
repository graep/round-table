/**
 * Types matching the Round Table template flow.
 */

export interface IdeaUnderReview {
  ideaOneLiner: string;
  contextBullets: string[];
  targetCustomer: string;
  jobToBeDone: string;
  constraints: string;
  assumptions: string;
}

/** Template panel: core 6 always, Security conditional */
export const CORE_PANEL_IDS = [
  'ceo',
  'marketing-expert',
  'product-manager',
  'cpa',
  'business-attorney',
  'critic',
] as const;

export const SECURITY_PERSONA_ID = 'security-compliance-officer';

/** Triggers for "Include Security & Compliance" */
export const SECURITY_TRIGGERS = [
  'sensitive data',
  'financial',
  'health',
  'minors',
  'soc2',
  'hipaa',
  'gdpr',
  'secure by design',
  'multi-tenant',
  'access control',
  'enterprise',
  'b2b',
  'compliance',
  'pii',
  'personal data',
];

export function suggestSecurity(ideaText: string): boolean {
  const lower = (ideaText || '').toLowerCase();
  return SECURITY_TRIGGERS.some((t) => lower.includes(t));
}

export interface Phase0Routing {
  runPanel: boolean;
  includeSecurity: boolean;
  routingReason: string;
  interpretation: string;
  outOfScope: string;
  criteria: string[];
}

export interface Phase1Take {
  role: string;
  personaId: string;
  thesis?: string;
  points: string[];
  risks?: string[];
}

export interface Phase2Debate {
  round1Prompt: string;
  round1Takes: Record<string, string>;
  round1Synthesis: { agreements: string[]; disagreements: string[]; leaning: string };
  round2Prompt: string;
  round2Takes: Record<string, string>;
  round2Synthesis: { chosenWedge: string; chosenIcp: string; differentiator: string };
}

export type VerdictType = 'GO' | 'GO-WITH-CONDITIONS' | 'PIVOT' | 'NO-GO';

export interface Phase3Verdict {
  verdict: VerdictType;
  rationale: string;
  conditionsForYes: string;
  mvpDeliverables: string[];
  nonGoals: string;
  suggestedStack: string;
  experiments: Array<{ name: string; method: string; metric: string; timebox: string }>;
  killCriteria: Array<{ condition: string; action: string }>;
}

export interface RoundTableReport {
  idea: IdeaUnderReview;
  phase0: Phase0Routing;
  phase1: Phase1Take[];
  phase2: Phase2Debate;
  phase3: Phase3Verdict;
  /** Whether AI (OpenAI) was used; false means placeholder/template responses */
  aiUsed?: boolean;
}
