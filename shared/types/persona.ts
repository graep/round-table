/**
 * Types for core persona JSON documents (expert roles and opinions).
 * Matches the structure under company-personas/core-personas.
 */

export interface PersonaAuthority {
  final_say_on: string[];
  defers_on: string[];
}

export interface Persona {
  name: string;
  role: string;
  summary: string;
  decision_focus: string;
  default_stance: string;
  guiding_questions: string[];
  principles: string[];
  non_responsibilities: string[];
  authority: PersonaAuthority;
  notes: string;
  /** Optional: e.g. Business Attorney */
  saas_specialties?: Record<string, string[]>;
  red_flags?: string[];
  preferred_output_format?: Record<string, string[]>;
}

/** Persona with a stable id (filename without .json) for selection and API */
export interface PersonaWithId extends Persona {
  id: string;
}
