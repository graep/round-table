import { useState } from 'react';
import type { IdeaUnderReview } from '../types/round-table';
import styles from './IdeaForm.module.css';

interface IdeaFormProps {
  onSubmit: (idea: IdeaUnderReview) => void | Promise<void>;
  disabled?: boolean;
  ideaOneLiner?: string;
  onIdeaOneLinerChange?: (value: string) => void;
}

const defaultContext = ['', '', ''];

export function IdeaForm({ onSubmit, disabled, ideaOneLiner: controlledOneLiner, onIdeaOneLinerChange }: IdeaFormProps) {
  const [internalOneLiner, setInternalOneLiner] = useState('');
  const ideaOneLiner = controlledOneLiner ?? internalOneLiner;
  const setIdeaOneLiner = (v: string) => {
    if (onIdeaOneLinerChange) onIdeaOneLinerChange(v);
    else setInternalOneLiner(v);
  };
  const [contextBullets, setContextBullets] = useState<string[]>(defaultContext);
  const [targetCustomer, setTargetCustomer] = useState('');
  const [jobToBeDone, setJobToBeDone] = useState('');
  const [constraints, setConstraints] = useState('');
  const [assumptions, setAssumptions] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = ideaOneLiner.trim();
    if (!trimmed) return;
    const bullets = contextBullets.map((b) => b.trim()).filter(Boolean);
    onSubmit({
      ideaOneLiner: trimmed,
      contextBullets: bullets.length ? bullets : [trimmed],
      targetCustomer: targetCustomer.trim(),
      jobToBeDone: jobToBeDone.trim(),
      constraints: constraints.trim(),
      assumptions: assumptions.trim(),
    });
  };

  const addContextBullet = () => setContextBullets((b) => [...b, '']);
  const setContextBullet = (i: number, v: string) =>
    setContextBullets((b) => {
      const next = [...b];
      next[i] = v;
      return next;
    });

  const valid = ideaOneLiner.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3 className={styles.sectionTitle}>Idea under review</h3>

      <label htmlFor="idea-one-liner" className={styles.label}>
        Idea (one sentence) *
      </label>
      <input
        id="idea-one-liner"
        type="text"
        value={ideaOneLiner}
        onChange={(e) => setIdeaOneLiner(e.target.value)}
        placeholder="e.g. A lightweight CRM for solo consultants that syncs with calendar and invoicing."
        disabled={disabled}
        className={styles.input}
      />

      <label className={styles.label}>Context (2–5 bullets)</label>
      {contextBullets.map((bullet, i) => (
        <input
          key={i}
          type="text"
          value={bullet}
          onChange={(e) => setContextBullet(i, e.target.value)}
          placeholder={`Bullet ${i + 1}`}
          disabled={disabled}
          className={styles.inputBullet}
        />
      ))}
      <button type="button" onClick={addContextBullet} className={styles.linkButton} disabled={disabled}>
        + Add bullet
      </button>

      <label htmlFor="target-customer" className={styles.label}>
        Target customer
      </label>
      <input
        id="target-customer"
        type="text"
        value={targetCustomer}
        onChange={(e) => setTargetCustomer(e.target.value)}
        placeholder="e.g. Solo B2B consultants and small agencies"
        disabled={disabled}
        className={styles.input}
      />

      <label htmlFor="jtbd" className={styles.label}>
        Primary job-to-be-done
      </label>
      <input
        id="jtbd"
        type="text"
        value={jobToBeDone}
        onChange={(e) => setJobToBeDone(e.target.value)}
        placeholder="e.g. Keep deals and follow-ups in one place without a heavy CRM"
        disabled={disabled}
        className={styles.input}
      />

      <label htmlFor="constraints" className={styles.label}>
        Constraints
      </label>
      <input
        id="constraints"
        type="text"
        value={constraints}
        onChange={(e) => setConstraints(e.target.value)}
        placeholder="Budget, time, skills, region, stack..."
        disabled={disabled}
        className={styles.input}
      />

      <label htmlFor="assumptions" className={styles.label}>
        Assumptions
      </label>
      <input
        id="assumptions"
        type="text"
        value={assumptions}
        onChange={(e) => setAssumptions(e.target.value)}
        placeholder="e.g. Consultants will pay for tools; they use calendar and invoicing today"
        disabled={disabled}
        className={styles.input}
      />

      <button type="submit" disabled={disabled || !valid} className={styles.button}>
        Run panel
      </button>
    </form>
  );
}
