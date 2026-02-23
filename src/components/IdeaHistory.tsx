import type { HistoryEntry } from '../lib/history';
import styles from './IdeaHistory.module.css';

interface IdeaHistoryProps {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onRemove?: (id: string) => void;
  disabled?: boolean;
}

function formatRunAt(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function IdeaHistory({ entries, onSelect, onRemove, disabled }: IdeaHistoryProps) {
  if (entries.length === 0) return null;

  return (
    <section className={styles.section} aria-label="Past idea runs">
      <h3 className={styles.title}>Past runs</h3>
      <ul className={styles.list}>
        {entries.map((entry) => (
          <li key={entry.id} className={styles.item}>
            <button
              type="button"
              className={styles.entryButton}
              onClick={() => onSelect(entry)}
              disabled={disabled}
              title={entry.report.idea.ideaOneLiner}
            >
              <span className={styles.entryLabel}>{entry.report.idea.ideaOneLiner}</span>
              <span className={styles.entryMeta}>{formatRunAt(entry.runAt)}</span>
            </button>
            {onRemove && (
              <button
                type="button"
                className={styles.removeButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(entry.id);
                }}
                disabled={disabled}
                aria-label={`Remove "${entry.report.idea.ideaOneLiner.slice(0, 30)}…" from history`}
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
