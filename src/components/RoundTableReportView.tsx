import { useState } from 'react';
import type { RoundTableReport, Phase1Take, DebateOnTake } from '../types/round-table';
import type { PersonaWithId } from '@shared/types/persona';
import { runDebate } from '../api/client';
import styles from './RoundTableReportView.module.css';

interface RoundTableReportViewProps {
  report: RoundTableReport;
  panelPersonas: PersonaWithId[];
  ideaText: string;
  onDebateComplete: (session: DebateOnTake) => void;
}

function phase1TakeToText(take: Phase1Take): string {
  const parts = [
    take.thesis,
    ...(take.points ?? []),
  ].filter(Boolean);
  return parts.join('\n');
}

export function RoundTableReportView({ report, panelPersonas, ideaText, onDebateComplete }: RoundTableReportViewProps) {
  const { idea, phase0, phase1, phase2, phase3, aiUsed } = report;
  const [debateTarget, setDebateTarget] = useState<Phase1Take | null>(null);
  const [respondentIds, setRespondentIds] = useState<Set<string>>(new Set());
  const [debateLoading, setDebateLoading] = useState(false);
  const [debateError, setDebateError] = useState<string | null>(null);

  const openDebateModal = (take: Phase1Take) => {
    setDebateTarget(take);
    setRespondentIds(new Set());
    setDebateError(null);
  };

  const closeDebateModal = () => {
    setDebateTarget(null);
    setDebateLoading(false);
    setDebateError(null);
  };

  const toggleRespondent = (id: string) => {
    if (!debateTarget || id === debateTarget.personaId) return;
    setRespondentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runDebateForTake = async () => {
    if (!debateTarget || respondentIds.size === 0) return;
    setDebateLoading(true);
    setDebateError(null);
    try {
      const phase1TakeText = phase1TakeToText(debateTarget);
      const result = await runDebate({
        idea: ideaText,
        phase1TakeText,
        targetRole: debateTarget.role,
        targetPersonaId: debateTarget.personaId,
        respondentPersonaIds: Array.from(respondentIds),
      });
      const session: DebateOnTake = {
        targetPersonaId: debateTarget.personaId,
        targetRole: debateTarget.role,
        initialTakeSummary: phase1TakeText.slice(0, 200) + (phase1TakeText.length > 200 ? '…' : ''),
        respondentResponses: result.responses,
      };
      onDebateComplete(session);
      closeDebateModal();
    } catch (e) {
      setDebateError(e instanceof Error ? e.message : 'Debate failed');
    } finally {
      setDebateLoading(false);
    }
  };

  return (
    <article className={styles.article}>
      <h2 className={styles.mainTitle}>Round Table — Multi-Expert Deliberation</h2>
      <p className={styles.purpose}>Evaluate an idea with multiple expert perspectives, structured debate, and an actionable verdict.</p>
      {aiUsed === false && (
        <div className={styles.aiBanner} role="alert">
          <strong>Local mode:</strong> Expert opinions are placeholders. For AI-generated takes, set <code>OPENAI_API_KEY</code> in <code>backend/.env</code> and restart the backend.
        </div>
      )}

      {/* Idea Under Review */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Idea under review</h3>
        <ul className={styles.ideaList}>
          <li><strong>Idea (one sentence):</strong> {idea.ideaOneLiner}</li>
          <li>
            <strong>Context (2–5 bullets):</strong>
            <ul>
              {idea.contextBullets.map((b, i) => (
                <li key={i}>{b || '—'}</li>
              ))}
            </ul>
          </li>
          <li><strong>Target customer:</strong> {idea.targetCustomer || '—'}</li>
          <li><strong>Primary job-to-be-done:</strong> {idea.jobToBeDone || '—'}</li>
          <li><strong>Constraints:</strong> {idea.constraints?.filter(Boolean).length ? idea.constraints.filter(Boolean).join('; ') : '—'}</li>
          <li><strong>Assumptions:</strong> {idea.assumptions?.filter(Boolean).length ? idea.assumptions.filter(Boolean).join('; ') : '—'}</li>
        </ul>
      </section>

      {/* Phase 0 — Routing */}
      <section className={styles.section}>
        <h3 className={styles.phaseTitle}>Phase 0 — Routing (Setup & scoping)</h3>
        <div className={styles.phase0}>
          <p><strong>Run panel:</strong> {phase0.runPanel ? 'YES' : 'NO'}</p>
          <p><strong>Include Security/Compliance:</strong> {phase0.includeSecurity ? 'YES' : 'NO'}</p>
          <p><strong>Reason:</strong> {phase0.routingReason}</p>
          <p><strong>Best interpretation:</strong> {phase0.interpretation}</p>
          <p><strong>Out of scope:</strong> {phase0.outOfScope}</p>
          <p><strong>Evaluation criteria:</strong></p>
          <ul>
            {phase0.criteria.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Phase 1 — Individual takes */}
      <section className={styles.section}>
        <h3 className={styles.phaseTitle}>Phase 1 — Individual takes (no debate)</h3>
        <p className={styles.sectionHint}>Each role gives an independent view. Risks + opportunities + what would make it succeed.</p>
        {phase1.map((take) => (
          <div key={take.personaId} className={styles.takeCard}>
            <div className={styles.takeCardHeader}>
              <h4 className={styles.takeRole}>{take.role}</h4>
              <button
                type="button"
                className={`${styles.debateButton} no-print`}
                onClick={() => openDebateModal(take)}
                aria-label={`Get expert opinions on ${take.role}'s take`}
              >
                Debate
              </button>
            </div>
            {take.thesis && <p className={styles.thesis}>{take.thesis}</p>}
            {take.points?.length > 0 && (
              <ul className={styles.takePoints}>
                {take.points.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            )}
            {(take.risks?.length ?? 0) > 0 && (
              <>
                <strong>Top risks:</strong>
                <ul>
                  {(take.risks ?? []).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ))}
      </section>

      {/* Phase 2 — Debate (opinions on Phase 1 takes) */}
      <section className={styles.section}>
        <h3 className={styles.phaseTitle}>Phase 2 — Debate</h3>
        <p className={styles.sectionHint}>Expert opinions on specific Phase 1 takes. Use the Debate button next to a take to choose which experts respond.</p>
        {phase2.debateSessions.length === 0 ? (
          <p className={styles.debateEmpty}>No debate sessions yet. Click <strong>Debate</strong> next to any Phase 1 take to select experts and get their opinions on that take.</p>
        ) : (
          phase2.debateSessions.map((session, idx) => (
            <div key={`${session.targetPersonaId}-${idx}`} className={styles.debateSession}>
              <h4 className={styles.debateSessionTitle}>Responses to {session.targetRole}&apos;s take</h4>
              <ul className={styles.debateTakes}>
                {session.respondentResponses.map((r) => (
                  <li key={r.personaId}><strong>{r.role}:</strong> {r.response}</li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {/* Debate modal */}
      {debateTarget && (
        <div className={`${styles.modalBackdrop} no-print`} role="dialog" aria-modal="true" aria-labelledby="debate-modal-title">
          <div className={styles.modal}>
            <h3 id="debate-modal-title" className={styles.modalTitle}>Get opinions on {debateTarget.role}&apos;s take</h3>
            <p className={styles.modalHint}>Select which experts should respond to this initial take.</p>
            <div className={styles.modalExperts}>
              {panelPersonas
                .filter((p) => p.id !== debateTarget.personaId)
                .map((p) => (
                  <label key={p.id} className={styles.modalExpertLabel}>
                    <input
                      type="checkbox"
                      checked={respondentIds.has(p.id)}
                      onChange={() => toggleRespondent(p.id)}
                      disabled={debateLoading}
                    />
                    <span className={styles.modalExpertRole}>{p.role}</span>
                  </label>
                ))}
            </div>
            {debateError && <p className={styles.debateError} role="alert">{debateError}</p>}
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancel} onClick={closeDebateModal} disabled={debateLoading}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalSubmit}
                onClick={runDebateForTake}
                disabled={respondentIds.size === 0 || debateLoading}
              >
                {debateLoading ? 'Running…' : 'Run debate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 3 — Verdict & action plan */}
      <section className={styles.section}>
        <h3 className={styles.phaseTitle}>Phase 3 — Verdict & action plan</h3>
        <div className={styles.verdictBlock}>
          <p><strong>Verdict:</strong> <span className={styles.verdictValue}>{phase3.verdict}</span></p>
          <p><strong>Rationale:</strong> {phase3.rationale}</p>
          <p><strong>What would make this a “yes”:</strong> {phase3.conditionsForYes}</p>
        </div>
        <div className={styles.mvp}>
          <h4>MVP scope (2–6 weeks)</h4>
          <ul>
            {phase3.mvpDeliverables.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
          <p><strong>Non-goals:</strong> {phase3.nonGoals}</p>
          <p><strong>Suggested stack/tools:</strong> {phase3.suggestedStack}</p>
        </div>
        <div className={styles.experiments}>
          <h4>Experiments (validation)</h4>
          {phase3.experiments.map((e, i) => (
            <div key={i} className={styles.experimentCard}>
              <strong>{e.name}</strong> — Method: {e.method}. Success metric: {e.metric}. Timebox: {e.timebox}
            </div>
          ))}
        </div>
        <div className={styles.killCriteria}>
          <h4>Kill criteria</h4>
          <ul>
            {phase3.killCriteria.map((k, i) => (
              <li key={i}>If {k.condition}, then {k.action}</li>
            ))}
          </ul>
        </div>
        <div className={styles.checklists}>
          <h4>Minimum checklists</h4>
          <p><strong>Sales & positioning:</strong> ICP defined, offer in 1–3 tiers, ROI claim + measurement, lead magnet, proof assets.</p>
          <p><strong>Delivery & ops:</strong> Playbook, onboarding form, implementation SOP, training, support loop.</p>
          <p><strong>Finance:</strong> Pricing aligned, delivery hours capped, recurring plan, margin target.</p>
          <p><strong>Legal & compliance:</strong> Contract terms, data handling language, subprocessor list, human review where needed.</p>
          {phase0.includeSecurity && (
            <p><strong>Security:</strong> Access control, approved tools, data retention, audit logging.</p>
          )}
        </div>
      </section>
    </article>
  );
}
