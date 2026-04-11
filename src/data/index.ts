import type { CharacterProgress, HotkeyMap, MetaData, AppSettings } from '@/types';
import { TierLabel } from '@/types';

export { SEED_SURVIVORS, SEED_KILLERS } from './seed';

export const DEFAULT_PROGRESS: CharacterProgress = {
  done: false,
  doneAt: null,
  tries: 0,
  priority: false,
  owned: true,
  note: '',
  build: null,
  attempts: [],
};

export const DEFAULT_HOTKEYS: Readonly<HotkeyMap> = {
  markDone: ['d'],
  addTry: ['t'],
  removeTry: ['r'],
};

export const DEFAULT_META: MetaData = {
  streak: 0,
  bestStreak: 0,
  lastFailAt: 0,
  totalSessions: 0,
  firstPlayAt: 0,
};

export const DEFAULT_SETTINGS: AppSettings = {
  hotkeys: { ...DEFAULT_HOTKEYS },
  vimMode: false,
  autoTheme: false,
  autoThemeLight: '07:00',
  autoThemeDark: '20:00',
};

export const TIER_LABELS = [
  TierLabel.S,
  TierLabel.A,
  TierLabel.B,
  TierLabel.C,
  TierLabel.D,
] as const;

export const TIER_COLORS: Record<TierLabel, string> = {
  [TierLabel.S]: '#ff4444',
  [TierLabel.A]: '#ff8c00',
  [TierLabel.B]: '#ffd700',
  [TierLabel.C]: '#4ade80',
  [TierLabel.D]: '#60a5fa',
};

export const WIN_CONDITIONS = {
  survivor:
    '<strong>Adept Survivor:</strong> Escape the trial using only the 3 unique perks of this character. No other perks. Items/Add-ons/Offerings are allowed.',
  killer:
    '<strong>Adept Killer:</strong> Achieve a <strong>Merciless Killer</strong> result (4 Kills) using only the 3 unique perks. No other perks. Add-ons and offerings are allowed.',
} as const;
