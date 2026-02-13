import type { PersonaWithId } from '@shared/types/persona';
import { CORE_PANEL_IDS, SECURITY_PERSONA_ID } from '../types/round-table';
import styles from './PanelSelector.module.css';

interface PanelSelectorProps {
  personas: PersonaWithId[];
  includeSecurity: boolean;
  securitySuggested: boolean; // from suggestSecurity(ideaText)
  onIncludeSecurityChange: (value: boolean) => void;
  disabled?: boolean;
}

export function PanelSelector({
  personas,
  includeSecurity,
  securitySuggested,
  onIncludeSecurityChange,
  disabled,
}: PanelSelectorProps) {
  const core = personas.filter((p) => (CORE_PANEL_IDS as readonly string[]).includes(p.id));
  const securityPersona = personas.find((p) => p.id === SECURITY_PERSONA_ID);

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Panel roles</h3>
      <p className={styles.hint}>Always included: CEO, Marketing, Product Manager, CPA, Business Attorney, Critic.</p>
      <ul className={styles.coreList}>
        {core.map((p) => (
          <li key={p.id} className={styles.coreItem}>
            {p.role}
          </li>
        ))}
      </ul>

      <div className={styles.securityRow}>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={includeSecurity}
            onChange={(e) => onIncludeSecurityChange(e.target.checked)}
            disabled={disabled}
          />
          <span>Include Security & Compliance Officer</span>
        </label>
        {securitySuggested && (
          <span className={styles.suggested}>Suggested (idea mentions sensitive data, compliance, or security)</span>
        )}
      </div>
      {securityPersona && (
        <p className={styles.securityHint}>
          Include only if: sensitive data (financial/health/minors), security/compliance claims (SOC2, HIPAA), multi-tenant risk, or enterprise B2B.
        </p>
      )}
    </div>
  );
}
