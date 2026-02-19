/**
 * Get expert opinions on another expert's Phase 1 take.
 * Uses OpenAI when OPENAI_API_KEY is set; otherwise placeholder responses.
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

function buildDebatePrompt(idea, targetRole, phase1TakeText) {
  return `A colleague (${targetRole}) gave this initial take on the idea below. Your job is to think adversarially: ${targetRole} is strong in their domain but cannot see everything. From YOUR field of expertise, find concrete problems, risks, or gaps they likely missed because it isn't their specialty. Challenge their take where your expertise reveals blind spots. Do not simply agree; surface what they couldn't see. Be specific and substantive.

Business idea:
---
${idea}
---

${targetRole}'s initial take:
---
${phase1TakeText}
---

Respond with valid JSON only, no markdown or extra text:
{"response": "2-4 sentences: problems or risks you see that ${targetRole} likely missed, from your expert lens"}`;
}

async function debateWithOpenAI(idea, phase1TakeText, targetRole, respondentPersonas) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }

  try {
    const client = new OpenAI({ apiKey });
    const responses = await Promise.all(
      respondentPersonas.map(async (p) => {
        const systemPrompt = buildPersonaPrompt(p);
        const userPrompt = buildDebatePrompt(idea, targetRole, phase1TakeText);

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
          parsed = { response: content };
        }
        const response = typeof parsed.response === 'string' ? parsed.response : String(parsed.response || content);

        return {
          personaId: p.id,
          role: p.role,
          response,
        };
      })
    );

    return { responses, aiUsed: true };
  } catch (err) {
    console.warn('OpenAI debate failed, using placeholder:', err?.message || err);
    return null;
  }
}

function debatePlaceholder(idea, targetRole, phase1TakeText, respondentPersonas) {
  const responses = respondentPersonas.map((p) => ({
    personaId: p.id,
    role: p.role,
    response: `As ${p.role}, ${targetRole} likely missed issues in ${p.decision_focus || 'my domain'}: I'd flag compliance, execution, or scope risks they wouldn't see.`,
  }));
  return { responses, aiUsed: false };
}

/**
 * @param {string} idea - Full idea text
 * @param {string} phase1TakeText - The initial take text (thesis + points) to respond to
 * @param {string} targetRole - Role name of the expert who gave the take
 * @param {object[]} respondentPersonas - Persona objects for experts who should respond
 */
export async function runDebate(idea, phase1TakeText, targetRole, respondentPersonas) {
  if (!respondentPersonas || respondentPersonas.length === 0) {
    return { responses: [], aiUsed: false };
  }
  const result = await debateWithOpenAI(idea, phase1TakeText, targetRole, respondentPersonas);
  if (result) return result;
  return debatePlaceholder(idea, targetRole, phase1TakeText, respondentPersonas);
}
