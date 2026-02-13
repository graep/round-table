import type { PersonaWithId } from '@shared/types/persona';
import styles from './ExpertSelector.module.css';

interface ExpertSelectorProps {
  personas: PersonaWithId[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  disabled?: boolean;
}

export function ExpertSelector({ personas, selectedIds, onToggle, disabled }: ExpertSelectorProps) {
  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Choose experts for this evaluation</h3>
      <p className={styles.hint}>Select one or more. Only selected experts will evaluate your idea.</p>
      <div className={styles.grid}>
        {personas.map((p) => (
          <label
            key={p.id}
            className={`${styles.card} ${selectedIds.has(p.id) ? styles.selected : ''}`}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(p.id)}
              onChange={() => onToggle(p.id)}
              disabled={disabled}
              className={styles.checkbox}
            />
            <span className={styles.role}>{p.role}</span>
            <span className={styles.summary}>{p.summary}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
