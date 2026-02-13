import type { PersonaWithId } from '@shared/types/persona';

const PERSONA_IDS = [
  'business-attorney',
  'ceo',
  'cpa',
  'critic',
  'cto',
  'customer-advocate',
  'finance-ops-manager',
  'lead-software-engineer',
  'marketing-expert',
  'product-manager',
  'sales-growth-lead',
  'security-compliance-officer',
  'ux-design-lead',
];

let cached: PersonaWithId[] | null = null;

export async function loadPersonas(): Promise<PersonaWithId[]> {
  if (cached) return cached;
  const out: PersonaWithId[] = [];
  for (const id of PERSONA_IDS) {
    try {
      const res = await fetch(`/personas/${id}.json`);
      if (!res.ok) continue;
      const data = await res.json();
      out.push({ ...data, id });
    } catch {
      // skip
    }
  }
  cached = out;
  return cached;
}
