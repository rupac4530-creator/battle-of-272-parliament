import { useEffect, useRef } from 'react';
import { saveSettings, type Settings, type SettingsKey } from '../game/settings';

/**
 * F44: store `value` under `key` whenever it changes from what it was on first render.
 * The first render's value is the loaded (or default) one, so nothing is written until the player changes it.
 * That keeps defaults that depend on the device (the on-screen pad) from being frozen by an unrelated save.
 */
export function usePersistedSetting<K extends SettingsKey>(key: K, value: Settings[K]): void {
  const last = useRef<Settings[K]>(value);
  useEffect(() => {
    if (Object.is(last.current, value)) return;
    last.current = value;
    saveSettings({ [key]: value } as Partial<Settings>);
  }, [key, value]);
}
