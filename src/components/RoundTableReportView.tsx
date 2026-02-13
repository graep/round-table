import type { RoundTableReport } from '../types/round-table';
import styles from './RoundTableReportView.module.css';

interface RoundTableReportViewProps {
  report: RoundTableReport;
}

export function RoundTableReportView({ report }: RoundTableReportViewProps) {
  const { idea, phase0, phase1, phase2, phase3, aiUsed } = report;

  return (
    <article className={styles.article}>
      <h2 className={styles.mainTitle}>Round Table — Multi-Expert Deliberation</h2>
      <p className={styles.purpose}>Evaluate an idea with multiple expert perspectives, structured debate, and an actionable verdict.</p>
      {aiUsed === false && (
        <div className={styles.aiBanner} role="alert">
          <strong>Template mode:</strong> AI evaluation is unavailable. Add <code>OPENAI_API_KEY</code> to <code>backend/.env</code> and restart. Check the backend terminal for errors.
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
          <li><strong>Constraints:</strong> {idea.constraints || '—'}</li>
          <li><strong>Assumptions:</strong> {idea.assumptions || '—'}</li>
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
            <h4 className={styles.takeRole}>{take.role}</h4>
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

      {/* Phase 2 — Debate */}
      <section className={styles.section}>
        <h3 className={styles.phaseTitle}>Phase 2 — Debate (two rounds)</h3>
        <div className={styles.debate}>
          <h4>Round 1 — Core strategy tradeoffs</h4>
          <p className={styles.prompt}>{phase2.round1Prompt}</p>
          <ul className={styles.debateTakes}>
            {Object.entries(phase2.round1Takes).map(([role, text]) => (
              <li key={role}><strong>{role}:</strong> {text}</li>
            ))}
          </ul>
          <div className={styles.synthesis}>
            <p><strong>Synthesis</strong> — Agreements: {phase2.round1Synthesis.agreements.join(' ')} Disagreements: {phase2.round1Synthesis.disagreements.join(' ')} Leaning: {phase2.round1Synthesis.leaning}</p>
          </div>

          <h4>Round 2 — Wedge + GTM specifics</h4>
          <p className={styles.prompt}>{phase2.round2Prompt}</p>
          <ul className={styles.debateTakes}>
            {Object.entries(phase2.round2Takes).map(([role, text]) => (
              <li key={role}><strong>{role}:</strong> {text}</li>
            ))}
          </ul>
          <div className={styles.synthesis}>
            <p><strong>Synthesis</strong> — Chosen wedge: {phase2.round2Synthesis.chosenWedge}. ICP: {phase2.round2Synthesis.chosenIcp}. Differentiator: {phase2.round2Synthesis.differentiator}</p>
          </div>
        </div>
      </section>

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
