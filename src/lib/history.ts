/**
 * Idea run history: persistence and types.
 * Stored in localStorage so past runs are visible across sessions.
 */

import type { RoundTableReport } from '../types/round-table';
import type { PersonaWithId } from '@shared/types/persona';

const STORAGE_KEY = 'round-table-idea-history';
const MAX_ENTRIES = 50;

export interface HistoryEntry {
  id: string;
  runAt: number;
  report: RoundTableReport;
  panelPersonas: PersonaWithId[];
}

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadHistory(): HistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed = safeJsonParse<HistoryEntry[]>(raw, []);
  return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : [];
}

export function saveHistory(entries: HistoryEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  const toStore = entries.slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
}

export function addToHistory(entry: Omit<HistoryEntry, 'id' | 'runAt'>): HistoryEntry {
  const full: HistoryEntry = {
    ...entry,
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    runAt: Date.now(),
  };
  const list = loadHistory();
  list.unshift(full);
  saveHistory(list);
  return full;
}

export function removeFromHistory(id: string): void {
  const list = loadHistory().filter((e) => e.id !== id);
  saveHistory(list);
}

export function clearHistory(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
