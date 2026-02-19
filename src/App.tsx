import { useState, useEffect } from 'react';
import { loadPersonas } from './lib/personas';
import { listPersonas } from './api/client';
import type { PersonaWithId } from '@shared/types/persona';
import type { IdeaUnderReview } from './types/round-table';
import { buildRoundTableReport, fullIdeaText } from './lib/build-report';
import type { RoundTableReport } from './types/round-table';
import { evaluateIdea } from './api/client';
import { evaluate } from './lib/evaluate';
import { PanelSelector } from './components/PanelSelector';
import { IdeaForm } from './components/IdeaForm';
import { RoundTableReportView } from './components/RoundTableReportView';
import { CORE_PANEL_IDS, SECURITY_PERSONA_ID } from './types/round-table';
import styles from './App.module.css';

const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '/api' : undefined);

export default function App() {
  const [personas, setPersonas] = useState<PersonaWithId[]>([]);
  const [customPersonas, setCustomPersonas] = useState<PersonaWithId[]>([]);
  const [ideaOneLiner, setIdeaOneLiner] = useState('');
  const [additionalPanelIds, setAdditionalPanelIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<RoundTableReport | null>(null);
  const [panelPersonas, setPanelPersonas] = useState<PersonaWithId[]>([]);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    const load = API_BASE ? listPersonas : loadPersonas;
    load()
      .then(setPersonas)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load experts'))
      .finally(() => setLoading(false));
  }, []);

  const handleRunPanel = async (idea: IdeaUnderReview) => {
    setError(null);
    setEvaluating(true);
    try {
      const allPersonas = [...personas, ...customPersonas];
      const panelPersonaIds = [
        ...CORE_PANEL_IDS,
        SECURITY_PERSONA_ID,
        ...additionalPanelIds,
      ];
      const panelPersonasForRun = allPersonas.filter((p) => panelPersonaIds.includes(p.id));
      const ideaText = fullIdeaText(idea);
      const hasCustomInPanel = panelPersonasForRun.some((p) => !personas.some((b) => b.id === p.id));
      const evalResult =
        API_BASE && !hasCustomInPanel
          ? await evaluateIdea({ idea: ideaText, personaIds: panelPersonaIds })
          : evaluate(ideaText, panelPersonasForRun);
      const reportResult = buildRoundTableReport(idea, allPersonas, panelPersonaIds, true, evalResult);
      setPanelPersonas(panelPersonasForRun);
      setReport(reportResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  const handleNewIdea = () => {
    setReport(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className={styles.layout}>
        <div className={styles.loading}>Loading panel…</div>
      </div>
    );
  }

  if (error && !personas.length) {
    return (
      <div className={styles.layout}>
        <div className={styles.error}>
          {error}
          <p className={styles.errorHint}>
            Ensure <code>personas/*.json</code> are in <code>public/personas/</code> (run <code>npm run dev</code> or <code>npm run build</code> once).
          </p>
        </div>
      </div>
    );
  }

  if (report) {
    return (
      <div className={styles.layout}>
        <header className={styles.header}>
          <h1 className={styles.title}>Round Table</h1>
          <p className={styles.subtitle}>Multi-expert deliberation</p>
          <button type="button" onClick={handleNewIdea} className={styles.backButton}>
            ← New idea
          </button>
        </header>
        <RoundTableReportView
          report={report}
          panelPersonas={panelPersonas}
          ideaText={fullIdeaText(report.idea)}
          onDebateComplete={(session) => {
            setReport({
              ...report,
              phase2: {
                debateSessions: [...report.phase2.debateSessions, session],
              },
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.title}>Round Table</h1>
        <p className={styles.subtitle}>Evaluate your idea with multiple expert perspectives and a structured verdict.</p>
      </header>

      <main className={styles.main}>
        <IdeaForm
          onSubmit={handleRunPanel}
          disabled={!personas.length || evaluating}
          ideaOneLiner={ideaOneLiner}
          onIdeaOneLinerChange={setIdeaOneLiner}
        />
        <PanelSelector
          personas={personas}
          customPersonas={customPersonas}
          additionalPanelIds={additionalPanelIds}
          onAddExpert={(id) => setAdditionalPanelIds((prev) => (prev.includes(id) ? prev : [...prev, id]))}
          onRemoveExpert={(id) => setAdditionalPanelIds((prev) => prev.filter((x) => x !== id))}
          onAddCustomExpert={(persona) => {
            setCustomPersonas((prev) => (prev.some((p) => p.id === persona.id) ? prev : [...prev, persona]));
            setAdditionalPanelIds((prev) => (prev.includes(persona.id) ? prev : [...prev, persona.id]));
          }}
          onPersonaCreated={API_BASE ? async () => { const next = await listPersonas(); setPersonas(next); } : undefined}
        />
        {evaluating && <p className={styles.loadingInline}>Evaluating with AI…</p>}
        {error && <p className={styles.errorInline}>{error}</p>}
      </main>
    </div>
  );
}
