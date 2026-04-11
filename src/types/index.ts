// ═══ Enums ═══

export enum Side { Survivor = 'survivor', Killer = 'killer' }
export enum TabId { Survivor = 'survivor', Killer = 'killer', All = 'all' }
export enum PageId { Tracker = 'tracker', Stats = 'stats', TierList = 'tierlist', Compare = 'compare' }
export enum ThemeId { Dark = 'dark', Light = 'light', Oled = 'oled' }

export enum FilterId {
  All = 'all',
  Done = 'done',
  Todo = 'todo',
  /** Owned + not done + has adept — "what can I play next?" */
  Playable = 'playable',
}

export enum SyncPhase { Idle = 'idle', Setup = 'setup', Syncing = 'syncing', Done = 'done', Error = 'error' }
export enum TierLabel { S = 'S', A = 'A', B = 'B', C = 'C', D = 'D' }

export enum StatsSortCol {
  Name = 'name', Side = 'side', Tries = 'tries', DoneAt = 'doneAt',
  Status = 'status', Difficulty = 'difficulty', LastPlayed = 'lastPlayed',
}

export enum SortDir { Asc = 'asc', Desc = 'desc' }
export enum UndoType { ToggleDone = 'toggleDone', AddTry = 'addTry', TogglePriority = 'togglePriority' }
export enum PortraitSize { Small = 'sm', Medium = 'md', Large = 'lg' }
export enum SteamErrorType { Key = 'key', Private = 'private', Network = 'network', Unknown = 'unknown' }
export enum WizardStep { Intro = 0, ApiKey = 1, SteamId = 2, Test = 3 }
export enum OwnershipStep { Explain = 1, Paste = 2, Result = 3 }
export enum Difficulty { Trivial = 1, Easy = 2, Medium = 3, Hard = 4, Nightmare = 5 }

// ═══ Character & Perk Types ═══

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
  /** 1-5 difficulty rating, set after completion. */
  difficulty: Difficulty | null;
  /** Timestamp of last interaction (expand, try, done). */
  lastPlayedAt: number | null;
}

export interface ProgressMap {
  [characterId: string]: CharacterProgress;
}

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
  /** Use OS prefers-color-scheme instead of manual schedule. */
  useSystemTheme: boolean;
}

// ═══ Steam Types ═══

export interface SteamCreds { key: string; steamId: string; }
export interface SteamValidation { valid: boolean; msg: string; }
export interface SteamIdParse { valid: boolean; id: string; msg: string; }
export interface SteamRawAchievement { apiname: string; achieved: number; unlocktime?: number; }

export interface SteamAchievement {
  apiname: string; achieved: number; unlocktime?: number;
  name: string; displayName?: string;
}

export interface SteamPlayerStatsResponse {
  playerstats?: { error?: string; achievements?: SteamRawAchievement[]; };
}

export interface SteamSchemaResponse {
  game?: { availableGameStats?: { achievements?: Array<{ name: string; displayName?: string }>; }; };
}

export interface WikiParseResponse { parse?: { text?: { '*'?: string }; }; error?: unknown; }
export interface WikiSearchResponse { query?: { search?: Array<{ title: string }>; }; }
export interface WikiImageInfoPage { title?: string; imageinfo?: Array<{ thumburl?: string; url?: string }>; }
export interface WikiImageInfoResponse { query?: { pages?: Record<string, WikiImageInfoPage>; }; }

// ═══ Meta ═══

export interface MetaData {
  streak: number;
  bestStreak: number;
  lastFailAt: number;
  totalSessions: number;
  firstPlayAt: number;
  /** IDs of the last N random picks, to avoid repeats. */
  recentPicks: string[];
}

export interface LeaderboardEntry { name: string; done: number; total: number; pct: number; addedAt: number; }

/** Auto-detected play session derived from attempt timestamps. */
export interface PlaySession {
  startTs: number;
  endTs: number;
  attempts: Array<{ characterId: string; characterName: string; success: boolean; ts: number }>;
  completed: string[];
  failed: string[];
}

export interface Milestone { threshold: number; message: string; icon: string; }

// ═══ UI State ═══

export interface UndoEntry { type: UndoType; id: string; prev: CharacterProgress; ts: number; }

export interface UIState {
  tab: TabId; page: PageId; filter: FilterId; search: string;
  statsSort: StatsSortCol; statsSortDir: SortDir;
  groupByChapter: boolean; ownedOnly: boolean;
}

// ═══ Utility Types ═══

export interface CacheEntry<T> { value: T; age: number; }
export type TierMap = Record<string, TierLabel>;
export type CustomOrderMap = Record<string, number>;
export interface ShareCharData { d: number; t: number; }
export interface SharePayload { p: Record<string, ShareCharData>; }
