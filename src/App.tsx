import { useState, useEffect, useCallback } from 'react';
import { loadPersonas } from './lib/personas';
import { listPersonas } from './api/client';
import type { PersonaWithId } from '@shared/types/persona';
import type { IdeaUnderReview } from './types/round-table';
import { buildRoundTableReport, fullIdeaText } from './lib/build-report';
import type { RoundTableReport } from './types/round-table';
import { evaluateIdea } from './api/client';
import { evaluate } from './lib/evaluate';
import { loadHistory, addToHistory, removeFromHistory, type HistoryEntry } from './lib/history';
import { PanelSelector } from './components/PanelSelector';
import { IdeaForm } from './components/IdeaForm';
import { RoundTableReportView } from './components/RoundTableReportView';
import { IdeaHistory } from './components/IdeaHistory';
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
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [currentReportHistoryId, setCurrentReportHistoryId] = useState<string | null>(null);

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
      const entry = addToHistory({ report: reportResult, panelPersonas: panelPersonasForRun });
      setHistory(loadHistory());
      setCurrentReportHistoryId(entry.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  const handleNewIdea = () => {
    setReport(null);
    setError(null);
    setCurrentReportHistoryId(null);
  };

  const handleSelectHistory = useCallback((entry: HistoryEntry) => {
    setReport(entry.report);
    setPanelPersonas(entry.panelPersonas);
    setCurrentReportHistoryId(entry.id);
    setError(null);
  }, []);

  const handleRemoveHistory = useCallback((id: string) => {
    removeFromHistory(id);
    setHistory(loadHistory());
    if (id === currentReportHistoryId) {
      setReport(null);
      setPanelPersonas([]);
      setCurrentReportHistoryId(null);
    }
  }, [currentReportHistoryId]);

  if (loading) {
    return (
      <div className={styles.layout}>
        <aside className={`${styles.sidebar} no-print`}>
          <div style={{ padding: '2rem' }}>
            <div className={`${styles.skeleton}`} style={{ height: '24px', width: '60%', marginBottom: '1rem' }} />
            {[...Array(6)].map((_, i) => (
              <div key={i} className={styles.skeleton} style={{ height: '40px', marginBottom: '0.75rem' }} />
            ))}
          </div>
        </aside>
        <div className={styles.contentWrapper}>
          <header className={styles.mainHeader}>
            <div className={styles.skeleton} style={{ height: '32px', width: '200px' }} />
          </header>
          <main className={styles.main}>
            <div className={styles.skeleton} style={{ height: '400px', width: '100%' }} />
          </main>
        </div>
      </div>
    );
  }

  if (error && !personas.length) {
    return (
      <div className={styles.layout}>
        <div className={styles.error}>
          <h2>Configuration Error</h2>
          <p>{error}</p>
          <div className={styles.errorHint}>
            Ensure <code>personas/*.json</code> are in <code>public/personas/</code> (run <code>npm run dev</code> once).
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} no-print`}>
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
          disabled={evaluating}
        />
        <IdeaHistory
          entries={history}
          onSelect={handleSelectHistory}
          onRemove={handleRemoveHistory}
          disabled={evaluating}
        />
      </aside>

      <div className={styles.contentWrapper}>
        <header className={styles.mainHeader}>
          <div>
            <h1 className={styles.mainTitle}>Round Table</h1>
            {!report && <p className={styles.mainSubtitle}>Multi-expert idea deliberation</p>}
          </div>
          {report && (
            <div className={`${styles.headerActions} no-print`}>
              <button type="button" onClick={() => window.print()} className={styles.printButton}>
                Print / Save as PDF
              </button>
              <button type="button" onClick={handleNewIdea} className={styles.backButton}>
                ← New idea
              </button>
            </div>
          )}
        </header>

        <main className={styles.main}>
          {report ? (
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
          ) : (
            <>
              <IdeaForm
                onSubmit={handleRunPanel}
                disabled={!personas.length || evaluating}
                ideaOneLiner={ideaOneLiner}
                onIdeaOneLinerChange={setIdeaOneLiner}
              />
              {evaluating && <p className={styles.loadingInline}>Evaluating with AI expertise…</p>}
              {error && <p className={styles.errorInline}>{error}</p>}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
