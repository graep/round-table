/**
 * Evaluate a business idea against selected personas.
 * Uses OpenAI when OPENAI_API_KEY is set; otherwise falls back to placeholder logic.
 */

import OpenAI from 'openai';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function buildPersonaPrompt(persona) {
  const parts = [
    `You are a ${persona.role} in a panel evaluating business ideas.`,
    persona.summary && `\n${persona.summary}`,
    persona.decision_focus && `\nYour decision focus: ${persona.decision_focus}`,
    persona.default_stance && `\nDefault stance: ${persona.default_stance}`,
    persona.principles?.length && `\nPrinciples:\n${persona.principles.map((p) => `- ${p}`).join('\n')}`,
    persona.guiding_questions?.length &&
      `\nGuiding questions to consider:\n${persona.guiding_questions.map((q) => `- ${q}`).join('\n')}`,
  ].filter(Boolean);
  return parts.join('');
}

function buildEvaluationPrompt(idea) {
  return `Evaluate this business idea from your expert perspective. Provide specific, substantive feedback based on your role—not generic statements. Address the idea's strengths, weaknesses, and what would strengthen it from your lens.

Business idea to evaluate:
---
${idea}
---

Respond with valid JSON only, no markdown or extra text:
{
  "verdict": "strong"|"neutral"|"weak",
  "opinion": "2-4 sentences of concrete analysis",
  "topRisks": ["risk or concern 1: what to validate or do", "risk 2: ...", "risk 3: ..."]
}
Give 2-4 top risks from your expert lens; each item should be a short phrase (e.g. "Execution risk: validate team capacity and timeline" or "Market timing: test demand before scaling").`;
}

async function evaluateWithOpenAI(idea, personas) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }

  try {
    const client = new OpenAI({ apiKey });
    const opinions = await Promise.all(
    personas.map(async (p) => {
      const systemPrompt = buildPersonaPrompt(p);
      const userPrompt = buildEvaluationPrompt(idea);

      const completion = await client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content || '{}';
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = { verdict: 'neutral', opinion: content };
      }

      const verdict = ['strong', 'neutral', 'weak'].includes(parsed.verdict?.toLowerCase())
        ? parsed.verdict.toLowerCase()
        : 'neutral';
      const opinion = typeof parsed.opinion === 'string' ? parsed.opinion : String(parsed.opinion || content);
      const rawRisks = parsed.topRisks;
      const risks = Array.isArray(rawRisks)
        ? rawRisks.slice(0, 5).map((r) => (typeof r === 'string' && r.trim() ? r.trim() : null)).filter(Boolean)
        : [];

      return {
        personaId: p.id,
        role: p.role,
        summary: p.summary,
        verdict,
        opinion,
        guiding_questions_considered: (p.guiding_questions || []).slice(0, 3),
        risks: risks.length > 0 ? risks : undefined,
      };
    })
  );

  const verdicts = opinions.map((o) => o.verdict);
  const strong = verdicts.filter((v) => v === 'strong').length;
  const weak = verdicts.filter((v) => v === 'weak').length;
  const total = verdicts.length;
  let overallVerdict = 'mixed';
  if (total > 0) {
    if (weak === 0 && strong >= total / 2) overallVerdict = 'good';
    else if (strong === 0 || weak >= total / 2) overallVerdict = 'weak';
  }

  return {
    idea,
    overallVerdict,
    expertOpinions: opinions,
    aiUsed: true,
  };
  } catch (err) {
    const status = err?.status ?? err?.response?.status;
    const msg = err?.message || String(err);
    if (status === 401) {
      console.error('OpenAI: Invalid API key (401). Check OPENAI_API_KEY in backend/.env');
    } else if (status === 429 || /rate limit|quota|insufficient_quota/i.test(msg)) {
      console.error('OpenAI: Rate limit or quota exceeded. Check usage and billing at https://platform.openai.com/usage');
    } else {
      console.error('OpenAI evaluation failed, using placeholder:', msg);
    }
    return null;
  }
}

function evaluatePlaceholder(idea, personas) {
  const expertOpinions = personas.map((p) => {
    const questions = p.guiding_questions || [];
    const considered = questions.slice(0, 3);
    const verdict = deriveVerdict(idea, p);
    const opinion = buildOpinion(p, verdict);
    const risks = [
      `Execution risk: validate scope and capacity from ${p.role} perspective`,
      `Market timing: validate demand and readiness`,
      `Resource constraint: validate feasibility given your domain`,
    ];
    return {
      personaId: p.id,
      role: p.role,
      summary: p.summary,
      verdict,
      opinion,
      guiding_questions_considered: considered,
      risks,
    };
  });

  const verdicts = expertOpinions.map((o) => o.verdict);
  const strong = verdicts.filter((v) => v === 'strong').length;
  const weak = verdicts.filter((v) => v === 'weak').length;
  const total = verdicts.length;
  let overallVerdict = 'mixed';
  if (total > 0) {
    if (weak === 0 && strong >= total / 2) overallVerdict = 'good';
    else if (strong === 0 || weak >= total / 2) overallVerdict = 'weak';
  }

  return {
    idea,
    overallVerdict,
    expertOpinions,
    aiUsed: false,
  };
}

function deriveVerdict(idea, persona) {
  const text = (idea || '').toLowerCase();
  const principles = (persona.principles || []).join(' ').toLowerCase();
  const focus = (persona.decision_focus || '').toLowerCase();
  const combined = text + ' ' + principles + ' ' + focus;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < 10) return 'weak';
  if (wordCount >= 40 && combined.length > 200) return 'strong';
  return 'neutral';
}

function buildOpinion(persona, verdict) {
  const focus = persona.decision_focus || 'this idea';
  const stance = persona.default_stance || '';
  const templates = {
    strong: `From a ${persona.role} perspective, the idea aligns well with ${focus}. ${stance} This direction shows promise; validate with real feedback.`,
    neutral: `As ${persona.role}: ${focus}. ${stance} The idea touches relevant areas; more clarity on scope and validation would help.`,
    weak: `From a ${persona.role} lens, ${focus} is not clearly addressed. ${stance} Consider strengthening this before moving forward.`,
  };
  return templates[verdict] || templates.neutral;
}

export async function evaluate(idea, personas) {
  const result = await evaluateWithOpenAI(idea, personas);
  if (result) return result;
  return evaluatePlaceholder(idea, personas);
}
