import { normalizeDifficultyMode, type GameSettings } from '@downpour/shared';
import { useEffect, useState } from 'react';

const SETTINGS_KEY = 'downpour.settings.v1';

const DEFAULT_SETTINGS: GameSettings = {
  reducedMotion: false,
  graphicsQuality: 'high',
  difficulty: 'medium',
  soundEnabled: true,
};

function loadStoredSettings(): GameSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      reducedMotion: Boolean(parsed.reducedMotion),
      graphicsQuality: parsed.graphicsQuality === 'low' ? 'low' : 'high',
      difficulty: normalizeDifficultyMode(parsed.difficulty) ?? DEFAULT_SETTINGS.difficulty,
      soundEnabled: parsed.soundEnabled !== false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export interface UseSettingsResult {
  settings: GameSettings;
  setSettings: (settings: GameSettings) => void;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<GameSettings>(() => loadStoredSettings());

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  return { settings, setSettings };
}
