import { SETTINGS } from './balance';

/**
 * F44: choices the player makes in the UI and expects to find again after a reload.
 * Every field is optional in storage: a missing or invalid field simply falls back to the app's own default.
 */
export interface Settings {
  voiceOn: boolean;
  coachOn: boolean;
  /** Only stored once the player toggles the pad, so the default keeps following the device until then. */
  gamepad: boolean;
  twoPlayer: boolean;
  fighterId: string;
  /** False = Theater View (sidebar hidden). */
  sidebarOpen: boolean;
  musicVolume: number;
  musicMuted: boolean;
}

export type SettingsKey = keyof Settings;

/** The small slice of the Storage API we need (also what the tests fake). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const BOOL_KEYS: SettingsKey[] = ['voiceOn', 'coachOn', 'gamepad', 'twoPlayer', 'sidebarOpen', 'musicMuted'];

/**
 * Read a stored JSON string into valid settings. Anything unreadable, of the wrong type or out of range is
 * dropped field by field (never throws), so a corrupt or hand-edited save can't break the game.
 */
export function parseStoredSettings(raw: string | null | undefined, validFighterIds: readonly string[]): Partial<Settings> {
  if (!raw) return {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const src = data as Record<string, unknown>;
  const out: Partial<Settings> = {};
  for (const key of BOOL_KEYS) {
    if (typeof src[key] === 'boolean') (out as Record<string, unknown>)[key] = src[key];
  }
  const vol = src.musicVolume;
  if (typeof vol === 'number' && Number.isFinite(vol) && vol >= 0 && vol <= 1) out.musicVolume = vol;
  const id = src.fighterId;
  if (typeof id === 'string' && validFighterIds.includes(id)) out.fighterId = id;
  return out;
}

/** Merge a change into what is already stored (other fields are kept) and return the JSON to store. */
export function mergeStoredSettings(raw: string | null | undefined, patch: Partial<Settings>): string {
  let base: Record<string, unknown> = {};
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) base = parsed as Record<string, unknown>;
  } catch {
    base = {};
  }
  return JSON.stringify({ ...base, ...patch });
}

/** localStorage, or null where it doesn't exist or the browser refuses access (private mode, blocked cookies). */
export function getDefaultStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null;
    const s = window.localStorage;
    return s ?? null;
  } catch {
    return null;
  }
}

export function loadSettings(validFighterIds: readonly string[], storage: StorageLike | null = getDefaultStorage()): Partial<Settings> {
  if (!storage) return {};
  try {
    return parseStoredSettings(storage.getItem(SETTINGS.storageKey), validFighterIds);
  } catch {
    return {};
  }
}

/** Returns true when the change was stored. Never throws (quota, private mode, blocked storage). */
export function saveSettings(patch: Partial<Settings>, storage: StorageLike | null = getDefaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SETTINGS.storageKey, mergeStoredSettings(storage.getItem(SETTINGS.storageKey), patch));
    return true;
  } catch {
    return false;
  }
}
