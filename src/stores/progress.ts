import { defineStore } from 'pinia';
import type {
  ProgressMap, CharacterProgress, Character, MetaData,
  UndoEntry, SharePayload, PlaySession,
} from '@/types';
import {
  TabId, PageId, FilterId, StatsSortCol, SortDir,
  UndoType, Side, Difficulty,
} from '@/types';
import {
  SEED_SURVIVORS, SEED_KILLERS, DEFAULT_PROGRESS, DEFAULT_META,
  MILESTONES, STREAK_MILESTONES, SESSION_GAP_MS,
} from '@/data';
import { DLC_APPID_TO_ROLE, FREE_ROLES } from '@/data/dlc-map';
import { StorageService, RosterService } from '@/services';
import { useSteamStore } from './steam';

const STORAGE_KEYS = {
  progress: 'dbd_progress',
  meta: 'dbd_meta',
  undo: 'dbd_undo',
  uiState: 'dbd_ui_state',
  customOrder: 'dbd_custom_order',
} as const;

const MAX_UNDO = 20;
const MAX_RECENT_PICKS = 8;

function resolveProgress(map: ProgressMap, id: string): CharacterProgress {
  return { ...DEFAULT_PROGRESS, ...map[id] };
}

function finalizeSession(session: PlaySession): void {
  const seen = new Set<string>();
  for (const a of session.attempts) {
    if (a.success && !seen.has(a.characterName)) {
      session.completed.push(a.characterName);
    } else if (!a.success) {
      session.failed.push(a.characterName);
    }
    seen.add(a.characterName);
  }
}

interface ProgressState {
  progress: ProgressMap;
  meta: MetaData;
  undoStack: UndoEntry[];
  survivors: Character[];
  killers: Character[];
  tab: TabId;
  page: PageId;
  filter: FilterId;
  search: string;
  activeId: string | null;
  selectMode: boolean;
  selectedIds: Set<string>;
  statsSort: StatsSortCol;
  statsSortDir: SortDir;
  groupByChapter: boolean;
  ownedOnly: boolean;
  readOnly: boolean;
  ownProgress: ProgressMap | null;
  customOrder: Record<string, number>;
  /** Pending milestone message to show (set by toggleDone, consumed by UI). */
  pendingMilestone: string | null;
  /** Pending difficulty prompt character ID (set by toggleDone when marking done). */
  pendingDifficultyId: string | null;
}

export const useProgressStore = defineStore('progress', {
  state: (): ProgressState => {
    const ui =
      StorageService.get<Record<string, string | boolean>>(STORAGE_KEYS.uiState) ?? {};
    return {
      progress: StorageService.get<ProgressMap>(STORAGE_KEYS.progress) ?? {},
      meta: {
        ...DEFAULT_META,
        ...(StorageService.get<MetaData>(STORAGE_KEYS.meta) ?? {}),
      },
      undoStack: StorageService.get<UndoEntry[]>(STORAGE_KEYS.undo) ?? [],
      survivors: [...SEED_SURVIVORS],
      killers: [...SEED_KILLERS],
      tab: (ui.tab as TabId) ?? TabId.Survivor,
      page: (ui.page as PageId) ?? PageId.Tracker,
      filter: (ui.filter as FilterId) ?? FilterId.All,
      search: (ui.search as string) ?? '',
      activeId: null,
      selectMode: false,
      selectedIds: new Set<string>(),
      statsSort: (ui.statsSort as StatsSortCol) ?? StatsSortCol.Name,
      statsSortDir: (ui.statsSortDir as SortDir) ?? SortDir.Asc,
      groupByChapter: (ui.groupByChapter as boolean) ?? false,
      ownedOnly: (ui.ownedOnly as boolean) ?? false,
      readOnly: false,
      ownProgress: null,
      customOrder:
        StorageService.get<Record<string, number>>(STORAGE_KEYS.customOrder) ?? {},
      pendingMilestone: null,
      pendingDifficultyId: null,
    };
  },

  getters: {
    allCharacters(): Character[] {
      return [...this.survivors, ...this.killers];
    },

    currentCharacters(): Character[] {
      const base =
        this.tab === TabId.All
          ? this.allCharacters
          : this.tab === TabId.Killer
            ? this.killers
            : this.survivors;

      let list = base;
      if (this.ownedOnly) {
        list = list.filter((c) => resolveProgress(this.progress, c.id).owned);
      }

      if (Object.keys(this.customOrder).length) {
        return [...list].sort(
          (a, b) =>
            (this.customOrder[a.id] ?? 9999) - (this.customOrder[b.id] ?? 9999),
        );
      }
      return list;
    },

    filteredCharacters(): Character[] {
      let list = this.currentCharacters;

      if (this.search) {
        const q = this.search.toLowerCase();
        list = list.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.role.toLowerCase().includes(q),
        );
      }

      const steam = useSteamStore();
      if (this.filter === FilterId.Done) {
        list = list.filter((c) => resolveProgress(this.progress, c.id).done);
      } else if (this.filter === FilterId.Todo) {
        list = list.filter(
          (c) => !resolveProgress(this.progress, c.id).done && steam.hasAdept(c.name),
        );
      } else if (this.filter === FilterId.Playable) {
        list = list.filter((c) => {
          const p = resolveProgress(this.progress, c.id);
          return !p.done && p.owned && steam.hasAdept(c.name);
        });
      }

      return list;
    },

    survivorsDone(): number {
      const steam = useSteamStore();
      return this.survivors.filter(
        (c) => this.progress[c.id]?.done && steam.hasAdept(c.name),
      ).length;
    },

    killersDone(): number {
      const steam = useSteamStore();
      return this.killers.filter(
        (c) => this.progress[c.id]?.done && steam.hasAdept(c.name),
      ).length;
    },

    totalDone(): number {
      return this.survivorsDone + this.killersDone;
    },

    totalCount(): number {
      const steam = useSteamStore();
      return this.allCharacters.filter((c) => steam.hasAdept(c.name)).length;
    },

    totalPercent(): number {
      return this.totalCount
        ? Math.round((this.totalDone / this.totalCount) * 100)
        : 0;
    },

    remaining(): number {
      return this.totalCount - this.totalDone;
    },

    avgTries(): number {
      const done = this.allCharacters.filter((c) => this.progress[c.id]?.done);
      if (!done.length) return 0;
      const total = done.reduce(
        (sum, c) => sum + (this.progress[c.id]?.tries ?? 1), 0,
      );
      return Math.round((total / done.length) * 10) / 10;
    },

    avgDifficulty(): number {
      const rated = this.allCharacters.filter(
        (c) => this.progress[c.id]?.difficulty,
      );
      if (!rated.length) return 0;
      const total = rated.reduce(
        (sum, c) => sum + (this.progress[c.id]!.difficulty ?? 0), 0,
      );
      return Math.round((total / rated.length) * 10) / 10;
    },

    isKiller(): (id: string) => boolean {
      return (id: string) => this.killers.some((k) => k.id === id);
    },

    isRetired(): (name: string) => boolean {
      const steam = useSteamStore();
      return (name: string) => !steam.hasAdept(name);
    },

    estimatedCompletion(): string {
      const steam = useSteamStore();
      const eligible = this.allCharacters.filter((c) => steam.hasAdept(c.name));
      const doneWithTs = eligible
        .filter((c) => this.progress[c.id]?.done && this.progress[c.id]?.doneAt)
        .map((c) => this.progress[c.id]!.doneAt!)
        .sort();

      if (doneWithTs.length < 2) return '—';

      const span = doneWithTs[doneWithTs.length - 1] - doneWithTs[0];
      const rate = doneWithTs.length / (span / (24 * 3600_000));
      const rem = eligible.length - doneWithTs.length;

      if (rate <= 0 || rem <= 0) return rem <= 0 ? 'Fertig! 🎉' : '—';

      const daysLeft = Math.ceil(rem / rate);
      if (daysLeft > 365) return `~${Math.round(daysLeft / 30)} Mon.`;
      if (daysLeft > 30) return `~${Math.round(daysLeft / 7)} Wo.`;
      return `~${daysLeft} Tage`;
    },

    /**
     * Auto-detected play sessions from attempt timestamps.
     * Groups attempts that are within SESSION_GAP_MS of each other.
     */
    sessions(): PlaySession[] {
      const allAttempts: Array<{
        characterId: string; characterName: string;
        success: boolean; ts: number;
      }> = [];

      for (const c of this.allCharacters) {
        const p = this.progress[c.id];
        if (!p?.attempts?.length) continue;
        for (const a of p.attempts) {
          allAttempts.push({
            characterId: c.id,
            characterName: c.name,
            success: a.success,
            ts: a.ts,
          });
        }
      }

      allAttempts.sort((a, b) => a.ts - b.ts);
      if (!allAttempts.length) return [];

      const sessions: PlaySession[] = [];
      let current: PlaySession = {
        startTs: allAttempts[0].ts,
        endTs: allAttempts[0].ts,
        attempts: [allAttempts[0]],
        completed: [],
        failed: [],
      };

      for (let i = 1; i < allAttempts.length; i++) {
        const a = allAttempts[i];
        if (a.ts - current.endTs > SESSION_GAP_MS) {
          finalizeSession(current);
          sessions.push(current);
          current = { startTs: a.ts, endTs: a.ts, attempts: [a], completed: [], failed: [] };
        } else {
          current.endTs = a.ts;
          current.attempts.push(a);
        }
      }
      finalizeSession(current);
      sessions.push(current);

      return sessions.reverse();
    },

    /** Text summary for clipboard export. */
    clipboardSummary(): string {
      const s = this;
      const lines = [
        `DBD Adept Progress: ${s.totalDone}/${s.totalCount} (${s.totalPercent}%)`,
        `Survivors: ${s.survivorsDone}/${s.survivors.length} | Killers: ${s.killersDone}/${s.killers.length}`,
        `Streak: ${s.meta.streak} 🔥 | Best: ${s.meta.bestStreak}`,
        `Ø Tries: ${s.avgTries} | Remaining: ${s.remaining}`,
      ];
      if (s.estimatedCompletion !== '—') {
        lines.push(`Est. completion: ${s.estimatedCompletion}`);
      }
      return lines.join('\n');
    },
  },

  actions: {
    async loadRoster(): Promise<void> {
      const [survivors, killers] = await Promise.all([
        RosterService.load(Side.Survivor, SEED_SURVIVORS),
        RosterService.load(Side.Killer, SEED_KILLERS),
      ]);
      this.survivors = survivors;
      this.killers = killers;
    },

    invalidateRoster(): void {
      RosterService.invalidate();
    },

    getProgress(id: string): CharacterProgress {
      return resolveProgress(this.progress, id);
    },

    _saveProgress(): void {
      StorageService.set(STORAGE_KEYS.progress, this.progress);
    },

    _saveMeta(): void {
      StorageService.set(STORAGE_KEYS.meta, this.meta);
    },

    _saveUI(): void {
      StorageService.set(STORAGE_KEYS.uiState, {
        tab: this.tab, page: this.page, filter: this.filter,
        search: this.search, statsSort: this.statsSort,
        statsSortDir: this.statsSortDir, groupByChapter: this.groupByChapter,
        ownedOnly: this.ownedOnly,
      });
    },

    _pushUndo(type: UndoType, id: string): void {
      const prev = { ...resolveProgress(this.progress, id) };
      this.undoStack.push({ type, id, prev, ts: Date.now() });
      if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
      StorageService.set(STORAGE_KEYS.undo, this.undoStack);
    },

    _touchLastPlayed(id: string): void {
      const prev = resolveProgress(this.progress, id);
      this.progress[id] = { ...prev, lastPlayedAt: Date.now() };
    },

    /**
     * Check if completing this adept crosses a milestone.
     * Sets pendingMilestone if so (consumed by UI to show toast).
     */
    _checkMilestones(): void {
      const pct = this.totalPercent / 100;
      const prevDone = this.totalDone - 1;
      const prevPct = this.totalCount ? prevDone / this.totalCount : 0;

      for (const m of MILESTONES) {
        if (prevPct < m.threshold && pct >= m.threshold) {
          this.pendingMilestone = `${m.icon} ${m.message}`;
          return;
        }
      }

      // Check streak milestones
      const streakMsg = STREAK_MILESTONES[this.meta.streak];
      if (streakMsg) {
        this.pendingMilestone = streakMsg;
      }
    },

    consumeMilestone(): string | null {
      const msg = this.pendingMilestone;
      this.pendingMilestone = null;
      return msg;
    },

    consumeDifficultyPrompt(): string | null {
      const id = this.pendingDifficultyId;
      this.pendingDifficultyId = null;
      return id;
    },

    // ─── UI mutations ─────────────────────────────────────────────

    setSearch(q: string): void { this.search = q; this._saveUI(); },
    setFilter(f: FilterId): void { this.filter = f; this._saveUI(); },
    setOwnedOnly(v: boolean): void { this.ownedOnly = v; this._saveUI(); },

    toggleSort(col: StatsSortCol): void {
      if (this.statsSort === col) {
        this.statsSortDir = this.statsSortDir === SortDir.Asc ? SortDir.Desc : SortDir.Asc;
      } else {
        this.statsSort = col;
        this.statsSortDir = SortDir.Asc;
      }
      this._saveUI();
    },

    sortIcon(col: StatsSortCol): string {
      return this.statsSort === col ? (this.statsSortDir === SortDir.Asc ? '↑' : '↓') : '';
    },

    // ─── Progress mutations ───────────────────────────────────────

    /**
     * Toggle done state. Returns 'marked' | 'unmarked' | null for undo-window handling.
     * When marking done: triggers milestone check, difficulty prompt, lastPlayedAt.
     * When unmarking: the caller should show an undo-window toast instead of instant unmark.
     */
    toggleDone(id: string): 'marked' | 'unmarked' | null {
      if (this.readOnly) return null;
      this._pushUndo(UndoType.ToggleDone, id);
      const prev = resolveProgress(this.progress, id);

      if (!prev.done) {
        this.meta.streak++;
        this.meta.bestStreak = Math.max(this.meta.bestStreak, this.meta.streak);
        if (!this.meta.firstPlayAt) this.meta.firstPlayAt = Date.now();
        const tries = Math.max(prev.tries, 1);
        this.progress[id] = {
          ...prev,
          done: true,
          doneAt: Date.now(),
          tries,
          lastPlayedAt: Date.now(),
          attempts: [...prev.attempts, { ts: Date.now(), success: true }],
        };
        this._saveProgress();
        this._saveMeta();
        this._checkMilestones();
        this.pendingDifficultyId = id;
        return 'marked';
      } else {
        this.meta.streak = 0;
        const attempts = [...prev.attempts];
        for (let i = attempts.length - 1; i >= 0; i--) {
          if (attempts[i].success) { attempts.splice(i, 1); break; }
        }
        this.progress[id] = { ...prev, done: false, doneAt: null, attempts };
        this._saveProgress();
        this._saveMeta();
        return 'unmarked';
      }
    },

    setDifficulty(id: string, difficulty: Difficulty): void {
      if (this.readOnly) return;
      const prev = resolveProgress(this.progress, id);
      this.progress[id] = { ...prev, difficulty };
      this._saveProgress();
    },

    addTry(id: string, delta: number): void {
      if (this.readOnly) return;
      this._pushUndo(UndoType.AddTry, id);
      const prev = resolveProgress(this.progress, id);

      if (delta > 0 && !prev.done) {
        if (this.meta.streak > 0) {
          this.meta.streak = 0;
          this.meta.lastFailAt = Date.now();
          this._saveMeta();
        }
        this.progress[id] = {
          ...prev,
          tries: Math.max(0, prev.tries + delta),
          lastPlayedAt: Date.now(),
          attempts: [...prev.attempts, { ts: Date.now(), success: false }],
        };
      } else {
        const newTries = Math.max(0, prev.tries + delta);
        const attempts = [...prev.attempts];
        if (delta < 0 && newTries < prev.tries) {
          for (let i = attempts.length - 1; i >= 0; i--) {
            if (!attempts[i].success) { attempts.splice(i, 1); break; }
          }
        }
        this.progress[id] = { ...prev, tries: newTries, attempts };
      }
      this._saveProgress();
    },

    togglePriority(id: string): void {
      if (this.readOnly) return;
      this._pushUndo(UndoType.TogglePriority, id);
      const prev = resolveProgress(this.progress, id);
      this.progress[id] = { ...prev, priority: !prev.priority };
      this._saveProgress();
    },

    toggleOwned(id: string): void {
      if (this.readOnly) return;
      const prev = resolveProgress(this.progress, id);
      this.progress[id] = { ...prev, owned: !prev.owned };
      this._saveProgress();
    },

    importOwnershipFromAppIds(ownedAppIds: Set<number>): number {
      if (this.readOnly) return 0;
      const ownedRoles = new Set<string>(FREE_ROLES);
      for (const [appId, role] of Object.entries(DLC_APPID_TO_ROLE)) {
        if (ownedAppIds.has(Number(appId))) ownedRoles.add(role);
      }
      let count = 0;
      for (const c of this.allCharacters) {
        if (ownedRoles.has(c.role)) {
          const prev = resolveProgress(this.progress, c.id);
          if (!prev.owned) { this.progress[c.id] = { ...prev, owned: true }; count++; }
        }
      }
      if (count) this._saveProgress();
      return count;
    },

    setNote(id: string, note: string): void {
      if (this.readOnly) return;
      const prev = resolveProgress(this.progress, id);
      this.progress[id] = { ...prev, note };
      this._saveProgress();
    },

    saveBuild(id: string, build: CharacterProgress['build']): void {
      if (this.readOnly) return;
      const prev = resolveProgress(this.progress, id);
      this.progress[id] = { ...prev, build };
      this._saveProgress();
    },

    undo(): boolean {
      if (this.readOnly || !this.undoStack.length) return false;
      const entry = this.undoStack.pop()!;
      this.progress[entry.id] = entry.prev;
      StorageService.set(STORAGE_KEYS.undo, this.undoStack);
      this._saveProgress();
      return true;
    },

    markDoneFromSteam(entries: Array<{ id: string; ts: number }>): void {
      for (const { id, ts } of entries) {
        if (!this.progress[id]?.done) {
          const prev = resolveProgress(this.progress, id);
          const tries = Math.max(prev.tries, 1);
          this.progress[id] = {
            ...prev, done: true, doneAt: ts || Date.now(), tries,
            lastPlayedAt: ts || Date.now(),
            attempts: [...prev.attempts, { ts: ts || Date.now(), success: true }],
          };
        }
      }
      this._saveProgress();
    },

    switchTab(tab: TabId): void {
      this.tab = tab;
      this.activeId = null;
      this.search = '';
      this.selectedIds = new Set();
      this.selectMode = false;
      this._saveUI();
    },

    setPage(page: PageId): void { this.page = page; this._saveUI(); },

    /**
     * Smart random pick: avoids recent picks, weights priority chars,
     * and slightly deprioritizes characters with many failed attempts.
     */
    randomPick(): Character | null {
      const base =
        this.tab === TabId.Killer ? this.killers
        : this.tab === TabId.Survivor ? this.survivors
        : this.allCharacters;

      const pool = base.filter(
        (c) => !resolveProgress(this.progress, c.id).done,
      );
      if (!pool.length) return null;

      const recentSet = new Set(this.meta.recentPicks ?? []);

      // Build weighted pool
      const weighted: Character[] = [];
      for (const c of pool) {
        const p = resolveProgress(this.progress, c.id);
        // Skip recently picked (unless pool is too small)
        if (recentSet.has(c.id) && pool.length > MAX_RECENT_PICKS) continue;

        let weight = 1;
        if (p.priority) weight = 5;
        // Slightly deprioritize high-failure chars (but never to 0)
        if (p.tries > 10) weight = Math.max(1, weight - 1);

        for (let i = 0; i < weight; i++) weighted.push(c);
      }

      // Fallback if all were filtered
      const finalPool = weighted.length ? weighted : pool;
      const pick = finalPool[Math.floor(Math.random() * finalPool.length)];

      // Track recent picks
      const recentPicks = [...(this.meta.recentPicks ?? []), pick.id]
        .slice(-MAX_RECENT_PICKS);
      this.meta.recentPicks = recentPicks;
      this._saveMeta();

      this.activeId = pick.id;
      this.page = PageId.Tracker;
      this._saveUI();
      return pick;
    },

    /** Touch lastPlayedAt when expanding a character panel. */
    touchCharacter(id: string): void {
      this._touchLastPlayed(id);
      this._saveProgress();
    },

    bulkMarkDone(): number {
      if (this.readOnly) return 0;
      let count = 0;
      for (const id of this.selectedIds) {
        const prev = resolveProgress(this.progress, id);
        if (!prev.done) {
          this.progress[id] = {
            ...prev, done: true, doneAt: Date.now(),
            tries: Math.max(prev.tries, 1), lastPlayedAt: Date.now(),
          };
          count++;
        }
      }
      this.selectedIds = new Set();
      this.selectMode = false;
      this._saveProgress();
      return count;
    },

    bulkReset(): number {
      if (this.readOnly) return 0;
      const count = this.selectedIds.size;
      for (const id of this.selectedIds) {
        const prev = resolveProgress(this.progress, id);
        this.progress[id] = { ...prev, done: false, doneAt: null, tries: 0, difficulty: null };
      }
      this.selectedIds = new Set();
      this.selectMode = false;
      this._saveProgress();
      return count;
    },

    reorderChars(fromId: string, toId: string): void {
      const fl = this.filteredCharacters;
      const fromIdx = fl.findIndex((c) => c.id === fromId);
      const toIdx = fl.findIndex((c) => c.id === toId);
      if (fromIdx === -1 || toIdx === -1) return;
      const ordered = [...fl];
      const [moved] = ordered.splice(fromIdx, 1);
      ordered.splice(toIdx, 0, moved);
      const order: Record<string, number> = {};
      ordered.forEach((c, i) => { order[c.id] = i; });
      this.customOrder = order;
      StorageService.set(STORAGE_KEYS.customOrder, order);
    },

    generateShareData(): string {
      const p: SharePayload['p'] = {};
      for (const [id, v] of Object.entries(this.progress)) {
        if (v?.done || v?.tries) {
          p[id] = { d: v.done ? 1 : 0, t: v.tries || 0 };
        }
      }
      return btoa(JSON.stringify({ p }));
    },

    loadShareData(encoded: string): boolean {
      try {
        const data = JSON.parse(atob(encoded)) as SharePayload;
        if (!data.p) return false;
        this.ownProgress = { ...this.progress };
        this.readOnly = true;
        this.progress = {};
        for (const [id, v] of Object.entries(data.p)) {
          this.progress[id] = { ...DEFAULT_PROGRESS, done: !!v.d, tries: v.t || 0 };
        }
        return true;
      } catch { return false; }
    },

    exitSharedView(): void {
      if (!this.readOnly) return;
      this.progress = this.ownProgress ?? StorageService.get<ProgressMap>(STORAGE_KEYS.progress) ?? {};
      this.ownProgress = null;
      this.readOnly = false;
    },
  },
});
