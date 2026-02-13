import type { EvaluateResponse } from '../api/client';
import styles from './EvaluationResults.module.css';

interface EvaluationResultsProps {
  result: EvaluateResponse;
}

export function EvaluationResults({ result }: EvaluationResultsProps) {
  const verdictLabel = {
    good: 'Good / marketable',
    mixed: 'Mixed',
    weak: 'Weak / needs work',
  };
  const verdictClass = {
    good: styles.verdictGood,
    mixed: styles.verdictMixed,
    weak: styles.verdictWeak,
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Evaluation result</h2>
      <div className={`${styles.overall} ${verdictClass[result.overallVerdict]}`}>
        {verdictLabel[result.overallVerdict]}
      </div>
      <p className={styles.ideaSummary}>Idea: “{result.idea}”</p>

      <ul className={styles.opinions}>
        {result.expertOpinions.map((o) => (
          <li key={o.personaId} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.role}>{o.role}</span>
              <span className={`${styles.verdictBadge} ${styles[`verdict_${o.verdict}`]}`}>
                {o.verdict}
              </span>
            </div>
            <p className={styles.opinion}>{o.opinion}</p>
            {o.guiding_questions_considered?.length > 0 && (
              <details className={styles.details}>
                <summary>Questions considered</summary>
                <ul>
                  {o.guiding_questions_considered.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
