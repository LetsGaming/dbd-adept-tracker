import type { CharacterProgress, HotkeyMap, MetaData, AppSettings, Milestone } from '@/types';
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
  difficulty: null,
  lastPlayedAt: null,
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
  recentPicks: [],
};

export const DEFAULT_SETTINGS: AppSettings = {
  hotkeys: { ...DEFAULT_HOTKEYS },
  vimMode: false,
  autoTheme: false,
  autoThemeLight: '07:00',
  autoThemeDark: '20:00',
  useSystemTheme: false,
};

export const TIER_LABELS = [
  TierLabel.S, TierLabel.A, TierLabel.B, TierLabel.C, TierLabel.D,
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

/** Milestones trigger celebratory toasts when crossed. */
export const MILESTONES: Milestone[] = [
  { threshold: 0.10, message: '10% geschafft — weiter so!', icon: '🌱' },
  { threshold: 0.25, message: 'Ein Viertel erledigt!', icon: '🔥' },
  { threshold: 0.50, message: 'Halbzeit! Die Hälfte ist geschafft!', icon: '⚡' },
  { threshold: 0.75, message: 'Drei Viertel! Fast da!', icon: '🚀' },
  { threshold: 0.90, message: '90%! Die Ziellinie ist in Sicht!', icon: '🏁' },
  { threshold: 1.00, message: 'ALLE ADEPTS GESCHAFFT!', icon: '🏆' },
];

/** Streak milestones for consecutive completions. */
export const STREAK_MILESTONES: Record<number, string> = {
  3: '🔥 3er Streak!',
  5: '🔥🔥 5er Streak!',
  10: '💥 10er Streak! Unstoppable!',
  15: '⚡ 15er Streak! Legendär!',
  20: '👑 20er Streak! Unglaublich!',
};

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Trivial',
  2: 'Easy',
  3: 'Medium',
  4: 'Hard',
  5: 'Nightmare',
};

export const DIFFICULTY_COLORS: Record<number, string> = {
  1: '#4ade80',
  2: '#60a5fa',
  3: '#fbbf24',
  4: '#fb923c',
  5: '#ef4444',
};

/** Gap threshold (ms) for auto-detecting session boundaries. */
export const SESSION_GAP_MS = 2 * 60 * 60 * 1000; // 2 hours
