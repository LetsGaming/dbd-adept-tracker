// ═══ Enums ═══

export enum Side {
  Survivor = 'survivor',
  Killer = 'killer',
}

export enum TabId {
  Survivor = 'survivor',
  Killer = 'killer',
  All = 'all',
}

export enum PageId {
  Tracker = 'tracker',
  Stats = 'stats',
  TierList = 'tierlist',
  Compare = 'compare',
}

export enum ThemeId {
  Dark = 'dark',
  Light = 'light',
  Oled = 'oled',
}

export enum FilterId {
  All = 'all',
  Done = 'done',
  Todo = 'todo',
}

export enum SyncPhase {
  Idle = 'idle',
  Setup = 'setup',
  Syncing = 'syncing',
  Done = 'done',
  Error = 'error',
}

export enum TierLabel {
  S = 'S',
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export enum StatsSortCol {
  Name = 'name',
  Side = 'side',
  Tries = 'tries',
  DoneAt = 'doneAt',
  Status = 'status',
}

export enum SortDir {
  Asc = 'asc',
  Desc = 'desc',
}

export enum UndoType {
  ToggleDone = 'toggleDone',
  AddTry = 'addTry',
  TogglePriority = 'togglePriority',
}

export enum PortraitSize {
  Small = 'sm',
  Medium = 'md',
  Large = 'lg',
}

export enum SteamErrorType {
  Key = 'key',
  Private = 'private',
  Network = 'network',
  Unknown = 'unknown',
}

export enum WizardStep {
  Intro = 0,
  ApiKey = 1,
  SteamId = 2,
  Test = 3,
}

export enum OwnershipStep {
  Explain = 1,
  Paste = 2,
  Result = 3,
}

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

/** Raw achievement from Steam GetPlayerAchievements API. */
export interface SteamRawAchievement {
  apiname: string;
  achieved: number;
  unlocktime?: number;
}

/** Achievement enriched with display name from schema. */
export interface SteamAchievement {
  apiname: string;
  achieved: number;
  unlocktime?: number;
  name: string;
  displayName?: string;
}

/** Steam GetPlayerAchievements response shape. */
export interface SteamPlayerStatsResponse {
  playerstats?: {
    error?: string;
    achievements?: SteamRawAchievement[];
  };
}

/** Steam GetSchemaForGame response shape. */
export interface SteamSchemaResponse {
  game?: {
    availableGameStats?: {
      achievements?: Array<{ name: string; displayName?: string }>;
    };
  };
}

/** Wiki parse API response shape. */
export interface WikiParseResponse {
  parse?: {
    text?: { '*'?: string };
  };
  error?: unknown;
}

/** Wiki search API response shape. */
export interface WikiSearchResponse {
  query?: {
    search?: Array<{ title: string }>;
  };
}

/** Wiki imageinfo API response shape. */
export interface WikiImageInfoPage {
  title?: string;
  imageinfo?: Array<{ thumburl?: string; url?: string }>;
}

export interface WikiImageInfoResponse {
  query?: {
    pages?: Record<string, WikiImageInfoPage>;
  };
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
  type: UndoType;
  id: string;
  prev: CharacterProgress;
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

/** Compact share-data encoding per character. */
export interface ShareCharData {
  d: number;
  t: number;
}

export interface SharePayload {
  p: Record<string, ShareCharData>;
}
