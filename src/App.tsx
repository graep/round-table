import { useState, useEffect } from 'react';
import { loadPersonas } from './lib/personas';
import type { PersonaWithId } from '@shared/types/persona';
import type { IdeaUnderReview } from './types/round-table';
import { suggestSecurity } from './types/round-table';
import { buildRoundTableReport, fullIdeaText } from './lib/build-report';
import type { RoundTableReport } from './types/round-table';
import { evaluateIdea } from './api/client';
import { PanelSelector } from './components/PanelSelector';
import { IdeaForm } from './components/IdeaForm';
import { RoundTableReportView } from './components/RoundTableReportView';
import { CORE_PANEL_IDS, SECURITY_PERSONA_ID } from './types/round-table';
import styles from './App.module.css';

const API_BASE = import.meta.env.VITE_API_URL;

export default function App() {
  const [personas, setPersonas] = useState<PersonaWithId[]>([]);
  const [ideaOneLiner, setIdeaOneLiner] = useState('');
  const [includeSecurity, setIncludeSecurity] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<RoundTableReport | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    loadPersonas()
      .then(setPersonas)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load experts'))
      .finally(() => setLoading(false));
  }, []);

  const handleRunPanel = async (idea: IdeaUnderReview) => {
    setError(null);
    setEvaluating(true);
    try {
      const panelPersonas = personas.filter(
        (p) =>
          CORE_PANEL_IDS.includes(p.id as (typeof CORE_PANEL_IDS)[number]) ||
          (includeSecurity && p.id === SECURITY_PERSONA_ID),
      );
      const personaIds = panelPersonas.map((p) => p.id);
      const ideaText = fullIdeaText(idea);
      const evalResult = API_BASE
        ? await evaluateIdea({ idea: ideaText, personaIds })
        : undefined;
      const reportResult = buildRoundTableReport(idea, personas, includeSecurity, evalResult);
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
        <RoundTableReportView report={report} />
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
          includeSecurity={includeSecurity}
          securitySuggested={suggestSecurity(ideaOneLiner)}
          onIncludeSecurityChange={setIncludeSecurity}
        />
        {evaluating && <p className={styles.loadingInline}>Evaluating with AI…</p>}
        {error && <p className={styles.errorInline}>{error}</p>}
      </main>
    </div>
  );
}
