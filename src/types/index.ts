// ═══ Character & Perk Types ═══

export type Side = "survivor" | "killer";
export type TabId = "survivor" | "killer" | "all";
export type PageId = "tracker" | "stats" | "tierlist" | "compare";
export type ThemeId = "dark" | "light" | "oled";
export type FilterId = "all" | "done" | "todo";
export type SyncPhase = "idle" | "setup" | "syncing" | "done" | "error";
export type TierLabel = "S" | "A" | "B" | "C" | "D";
export type StatsSortCol = "name" | "side" | "tries" | "doneAt" | "status";
export type SortDir = "asc" | "desc";

export interface Character {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly img: string;
  readonly perks: readonly string[];
  readonly isNew?: boolean;
}

export interface Attempt {
  readonly ts: number;
  readonly success: boolean;
  readonly duration?: number;
}

export interface Build {
  item: string;
  addon1: string;
  addon2: string;
  offering: string;
}

export interface CharacterProgress {
  done: boolean;
  doneAt: number | null;
  tries: number;
  priority: boolean;
  owned: boolean;
  note: string;
  build: Build | null;
  attempts: Attempt[];
}

export interface ProgressMap {
  [characterId: string]: CharacterProgress;
}

// ═══ Perk Types ═══

export interface PerkData {
  desc: string;
  tunables: string[][];
  quote: string;
  fetchedAt?: number;
}

// ═══ Settings Types ═══

export interface HotkeyMap {
  markDone: string[];
  addTry: string[];
  removeTry: string[];
}

export interface AppSettings {
  hotkeys: HotkeyMap;
  vimMode: boolean;
  autoTheme: boolean;
  autoThemeLight: string;
  autoThemeDark: string;
}

// ═══ Steam Types ═══

export interface SteamCreds {
  key: string;
  steamId: string;
}

export interface SteamValidation {
  valid: boolean;
  msg: string;
}

export interface SteamIdParse {
  valid: boolean;
  id: string;
  msg: string;
}

// ═══ Meta & Leaderboard ═══

export interface MetaData {
  streak: number;
  bestStreak: number;
  lastFailAt: number;
  totalSessions: number;
  firstPlayAt: number;
}

export interface LeaderboardEntry {
  name: string;
  done: number;
  total: number;
  pct: number;
  addedAt: number;
}

// ═══ UI State ═══

export interface UndoEntry {
  type: string;
  id: string;
  prev: Partial<CharacterProgress>;
  ts: number;
}

export interface UIState {
  tab: TabId;
  page: PageId;
  filter: FilterId;
  search: string;
  statsSort: StatsSortCol;
  statsSortDir: SortDir;
  groupByChapter: boolean;
  ownedOnly: boolean;
}

// ═══ Utility Types ═══

export interface CacheEntry<T> {
  value: T;
  age: number;
}

export type TierMap = Record<string, TierLabel>;
export type CustomOrderMap = Record<string, number>;
