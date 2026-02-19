import { useState, useRef, useEffect } from 'react';
import type { PersonaWithId } from '@shared/types/persona';
import { CORE_PANEL_IDS, SECURITY_PERSONA_ID } from '../types/round-table';
import { EXPERT_ROLE_SUGGESTIONS } from '../lib/expert-role-suggestions';
import { createPersonaForRole } from '../api/client';
import styles from './PanelSelector.module.css';

const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '/api' : undefined);

type SuggestionItem =
  | { type: 'existing'; persona: PersonaWithId }
  | { type: 'role'; role: string };

function roleToId(role: string): string {
  return role
    .toLowerCase()
    .replace(/\s*\/\s*/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'custom-expert';
}

interface PanelSelectorProps {
  personas: PersonaWithId[];
  customPersonas: PersonaWithId[];
  additionalPanelIds: string[];
  onAddExpert: (personaId: string) => void;
  onRemoveExpert: (personaId: string) => void;
  onAddCustomExpert: (persona: PersonaWithId) => void;
  /** Called after API creates a new persona so the app can refetch the persona list */
  onPersonaCreated?: () => void;
  disabled?: boolean;
}

export function PanelSelector({
  personas,
  customPersonas,
  additionalPanelIds,
  onAddExpert,
  onRemoveExpert,
  onAddCustomExpert,
  onPersonaCreated,
  disabled,
}: PanelSelectorProps) {
  const [addExpertOpen, setAddExpertOpen] = useState(false);
  const [roleInput, setRoleInput] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [generating, setGenerating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allPersonas = [...personas, ...customPersonas];
  const core = personas.filter((p) => (CORE_PANEL_IDS as readonly string[]).includes(p.id));
  const securityPersona = personas.find((p) => p.id === SECURITY_PERSONA_ID);
  const optionalPersonas = personas.filter(
    (p) => !(CORE_PANEL_IDS as readonly string[]).includes(p.id) && p.id !== SECURITY_PERSONA_ID,
  );
  const addedExperts = allPersonas.filter((p) => additionalPanelIds.includes(p.id));

  const allRoleSuggestions: SuggestionItem[] = [
    ...optionalPersonas.map((p) => ({ type: 'existing' as const, persona: p })),
    ...EXPERT_ROLE_SUGGESTIONS.filter(
      (role) => !optionalPersonas.some((p) => p.role.toLowerCase() === role.toLowerCase()),
    ).map((role) => ({ type: 'role' as const, role })),
  ];

  const q = roleInput.trim().toLowerCase();
  const filteredSuggestions = q
    ? allRoleSuggestions.filter((item) => {
        const role = item.type === 'existing' ? item.persona.role : item.role;
        return role.toLowerCase().includes(q);
      })
    : allRoleSuggestions;
  const showSuggestions = suggestionsOpen && filteredSuggestions.length > 0;

  useEffect(() => {
    if (!showSuggestions) setHighlightIndex(-1);
  }, [showSuggestions, roleInput]);

  useEffect(() => {
    const el = dropdownRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      if (el.contains(e.target as Node)) return;
      setSuggestionsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getSuggestionRole = (item: SuggestionItem) =>
    item.type === 'existing' ? item.persona.role : item.role;

  const handleSelectSuggestion = async (item: SuggestionItem) => {
    const role = getSuggestionRole(item);
    if (item.type === 'existing') {
      onAddExpert(item.persona.id);
      setRoleInput('');
      setSuggestionsOpen(false);
      setHighlightIndex(-1);
      return;
    }
    if (API_BASE) {
      setSuggestionsOpen(false);
      setHighlightIndex(-1);
      setGenerating(true);
      try {
        const persona = await createPersonaForRole(role);
        onAddExpert(persona.id);
        onPersonaCreated?.();
        setRoleInput('');
      } catch (e) {
        console.error(e);
      } finally {
        setGenerating(false);
      }
      return;
    }
    setRoleInput(role);
    setSuggestionsOpen(false);
    setHighlightIndex(-1);
  };

  const handleGenerateFromTemplate = async () => {
    const role = roleInput.trim();
    if (!role) return;
    setGenerating(true);
    try {
      if (API_BASE) {
        const persona = await createPersonaForRole(role);
        onAddExpert(persona.id);
        onPersonaCreated?.();
        setRoleInput('');
        return;
      }
      const res = await fetch('/personas/persona-template.json');
      if (!res.ok) throw new Error('Failed to load template');
      const template = (await res.json()) as Record<string, unknown>;
      const id = roleToId(role);
      const base = {
        ...template,
        role,
        name: '',
        summary: template.summary ?? '',
        decision_focus: template.decision_focus ?? '',
        default_stance: template.default_stance ?? '',
        guiding_questions: Array.isArray(template.guiding_questions) ? template.guiding_questions : [''],
        principles: Array.isArray(template.principles) ? template.principles : [''],
        non_responsibilities: Array.isArray(template.non_responsibilities) ? template.non_responsibilities : [''],
        authority:
          template.authority && typeof template.authority === 'object'
            ? (template.authority as { final_say_on?: string[]; defers_on?: string[] })
            : { final_say_on: [''], defers_on: [''] },
        notes: template.notes ?? '',
      };
      const persona: PersonaWithId = { ...base, id } as PersonaWithId;
      onAddCustomExpert(persona);
      setRoleInput('');
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      if (e.key === 'Enter') handleGenerateFromTemplate();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => (i < filteredSuggestions.length - 1 ? i + 1 : i));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => (i > 0 ? i - 1 : -1));
      return;
    }
    if (e.key === 'Enter' && highlightIndex >= 0 && filteredSuggestions[highlightIndex]) {
      e.preventDefault();
      handleSelectSuggestion(filteredSuggestions[highlightIndex]);
      return;
    }
    if (e.key === 'Escape') {
      setSuggestionsOpen(false);
      setHighlightIndex(-1);
    }
  };

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Panel roles</h3>
      <p className={styles.hint}>Always included: CEO, Marketing, Product Manager, CPA, Business Attorney, Critic, Security & Compliance Officer.</p>
      <ul className={styles.coreList}>
        {core.map((p) => (
          <li key={p.id} className={styles.coreItem}>
            {p.role}
          </li>
        ))}
        {securityPersona && (
          <li key={securityPersona.id} className={styles.coreItem}>
            {securityPersona.role}
          </li>
        )}
      </ul>

      {addedExperts.length > 0 && (
        <div className={styles.additionalSection}>
          <span className={styles.additionalLabel}>Additional experts:</span>
          <ul className={styles.additionalList}>
            {addedExperts.map((p) => (
              <li key={p.id} className={styles.additionalItem}>
                <span>{p.role}</span>
                <button
                  type="button"
                  className={styles.removeExpert}
                  onClick={() => onRemoveExpert(p.id)}
                  disabled={disabled}
                  title="Remove expert"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.addExpertSection}>
        <button
          type="button"
          className={styles.addExpertButton}
          onClick={() => setAddExpertOpen((open) => !open)}
          disabled={disabled}
        >
          {addExpertOpen ? '− Hide' : '+ Add expert'}
        </button>
        {addExpertOpen && (
          <div className={styles.addExpertDropdown}>
            <p className={styles.addExpertHint}>Type an expert role; pick a suggestion to add an existing expert or use the button to create one from the template.</p>
            <div className={styles.autocompleteWrap} ref={dropdownRef}>
              <input
                ref={inputRef}
                type="text"
                className={styles.searchInput}
                placeholder="e.g. Horticulturist, CTO, Regulatory Affairs…"
                value={roleInput}
                onChange={(e) => {
                  setRoleInput(e.target.value);
                  setSuggestionsOpen(true);
                }}
                onFocus={() => setSuggestionsOpen(true)}
                onKeyDown={handleKeyDown}
              />
              {showSuggestions && (
                <ul className={styles.suggestionsList}>
                  {filteredSuggestions.slice(0, 8).map((item, i) => (
                    <li
                      key={item.type === 'existing' ? item.persona.id : item.role}
                      className={`${styles.suggestionItem} ${i === highlightIndex ? styles.suggestionHighlight : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectSuggestion(item);
                      }}
                    >
                      {getSuggestionRole(item)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              className={styles.searchButton}
              onClick={handleGenerateFromTemplate}
              disabled={!roleInput.trim() || generating}
            >
              {generating ? 'Generating…' : 'Generate & add expert'}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
