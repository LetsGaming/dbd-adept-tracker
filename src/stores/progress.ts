import { defineStore } from "pinia";
import type {
  ProgressMap,
  CharacterProgress,
  Character,
  TabId,
  PageId,
  FilterId,
  MetaData,
  UndoEntry,
  StatsSortCol,
  SortDir,
} from "@/types";
import {
  SEED_SURVIVORS,
  SEED_KILLERS,
  DEFAULT_PROGRESS,
  DEFAULT_META,
} from "@/data";
import { StorageService, WikiApi, RosterService } from "@/services";

const STORAGE_KEYS = {
  progress: "dbd_progress",
  meta: "dbd_meta",
  undo: "dbd_undo",
  uiState: "dbd_ui_state",
  customOrder: "dbd_custom_order",
} as const;

const MAX_UNDO = 20;

function resolveProgress(map: ProgressMap, id: string): CharacterProgress {
  return { ...DEFAULT_PROGRESS, ...map[id] };
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
}

export const useProgressStore = defineStore("progress", {
  state: (): ProgressState => {
    const ui =
      StorageService.get<Record<string, unknown>>(STORAGE_KEYS.uiState) ?? {};
    return {
      progress: StorageService.get<ProgressMap>(STORAGE_KEYS.progress) ?? {},
      meta: {
        ...DEFAULT_META,
        ...(StorageService.get<MetaData>(STORAGE_KEYS.meta) ?? {}),
      },
      undoStack: StorageService.get<UndoEntry[]>(STORAGE_KEYS.undo) ?? [],
      survivors: [...SEED_SURVIVORS],
      killers: [...SEED_KILLERS],
      tab: (ui.tab as TabId) ?? "survivor",
      page: (ui.page as PageId) ?? "tracker",
      filter: (ui.filter as FilterId) ?? "all",
      search: (ui.search as string) ?? "",
      activeId: null,
      selectMode: false,
      selectedIds: new Set<string>(),
      statsSort: (ui.statsSort as StatsSortCol) ?? "name",
      statsSortDir: (ui.statsSortDir as SortDir) ?? "asc",
      groupByChapter: (ui.groupByChapter as boolean) ?? false,
      ownedOnly: (ui.ownedOnly as boolean) ?? false,
      readOnly: false,
      ownProgress: null,
      // Load custom order into reactive state so getters stay pure
      customOrder:
        StorageService.get<Record<string, number>>(STORAGE_KEYS.customOrder) ??
        {},
    };
  },

  getters: {
    allCharacters(): Character[] {
      return [...this.survivors, ...this.killers];
    },

    currentCharacters(): Character[] {
      const base =
        this.tab === "all"
          ? this.allCharacters
          : this.tab === "killer"
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

      if (this.filter === "done") {
        list = list.filter((c) => resolveProgress(this.progress, c.id).done);
      } else if (this.filter === "todo") {
        list = list.filter((c) => !resolveProgress(this.progress, c.id).done);
      }

      return list;
    },

    survivorsDone(): number {
      return this.survivors.filter((c) => this.progress[c.id]?.done).length;
    },

    killersDone(): number {
      return this.killers.filter((c) => this.progress[c.id]?.done).length;
    },

    totalDone(): number {
      return this.survivorsDone + this.killersDone;
    },

    totalCount(): number {
      return this.survivors.length + this.killers.length;
    },

    totalPercent(): number {
      return this.totalCount
        ? Math.round((this.totalDone / this.totalCount) * 100)
        : 0;
    },

    remaining(): number {
      return this.totalCount - this.totalDone;
    },

    isKiller(): (id: string) => boolean {
      return (id: string) => this.killers.some((k) => k.id === id);
    },

    estimatedCompletion(): string {
      const doneWithTs = this.allCharacters
        .filter((c) => this.progress[c.id]?.done && this.progress[c.id]?.doneAt)
        .map((c) => this.progress[c.id]!.doneAt!)
        .sort();

      if (doneWithTs.length < 2) return "—";

      const span = doneWithTs[doneWithTs.length - 1] - doneWithTs[0];
      const rate = doneWithTs.length / (span / (24 * 3600_000));
      const rem = this.allCharacters.length - doneWithTs.length;

      if (rate <= 0 || rem <= 0) return rem <= 0 ? "Fertig! 🎉" : "—";

      const daysLeft = Math.ceil(rem / rate);
      if (daysLeft > 365) return `~${Math.round(daysLeft / 30)} Mon.`;
      if (daysLeft > 30) return `~${Math.round(daysLeft / 7)} Wo.`;
      return `~${daysLeft} Tage`;
    },
  },

  actions: {
    /**
     * Fetches the live character roster from the DBD wiki (with 24 h cache).
     * The store is pre-populated with seed data synchronously at init time, so
     * the app is fully usable before this resolves. When it does, Vue's
     * reactivity propagates any changes (new characters, updated perks) to all
     * consumers automatically.
     *
     * Called once on app mount. Safe to call multiple times — the service
     * returns cached data immediately if the TTL hasn't expired.
     */
    async loadRoster(): Promise<void> {
      const [survivors, killers] = await Promise.all([
        RosterService.load("survivor", SEED_SURVIVORS),
        RosterService.load("killer", SEED_KILLERS),
      ]);
      this.survivors = survivors;
      this.killers = killers;

      // Portrait URLs for any new characters won't be in the existing cache
      const allImgs = [...survivors, ...killers]
        .map((c) => c.img)
        .filter(Boolean);
      WikiApi.prefetchAll(allImgs);
    },

    /** Force-refresh roster from wiki on next load (e.g. manual refresh button). */
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
        tab: this.tab,
        page: this.page,
        filter: this.filter,
        search: this.search,
        statsSort: this.statsSort,
        statsSortDir: this.statsSortDir,
        groupByChapter: this.groupByChapter,
        ownedOnly: this.ownedOnly,
      });
    },

    _pushUndo(type: string, id: string): void {
      const prev = { ...resolveProgress(this.progress, id) };
      this.undoStack.push({ type, id, prev, ts: Date.now() });
      if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
      StorageService.set(STORAGE_KEYS.undo, this.undoStack);
    },

    // ─── UI mutations ─────────────────────────────────────────────

    setSearch(q: string): void {
      this.search = q;
      this._saveUI();
    },

    setFilter(f: FilterId): void {
      this.filter = f;
      this._saveUI();
    },

    setOwnedOnly(v: boolean): void {
      this.ownedOnly = v;
      this._saveUI();
    },

    /** Toggle sort column or flip direction if already active. */
    toggleSort(col: StatsSortCol): void {
      if (this.statsSort === col) {
        this.statsSortDir = this.statsSortDir === "asc" ? "desc" : "asc";
      } else {
        this.statsSort = col;
        this.statsSortDir = "asc";
      }
      this._saveUI();
    },

    sortIcon(col: string): string {
      return this.statsSort === col
        ? this.statsSortDir === "asc"
          ? "↑"
          : "↓"
        : "";
    },

    // ─── Progress mutations ───────────────────────────────────────

    toggleDone(id: string): void {
      if (this.readOnly) return;
      this._pushUndo("toggleDone", id);
      const prev = resolveProgress(this.progress, id);

      if (!prev.done) {
        this.meta.streak++;
        this.meta.bestStreak = Math.max(this.meta.bestStreak, this.meta.streak);
        if (!this.meta.firstPlayAt) this.meta.firstPlayAt = Date.now();
        this.progress[id] = {
          ...prev,
          done: true,
          doneAt: Date.now(),
          attempts: [...prev.attempts, { ts: Date.now(), success: true }],
        };
      } else {
        this.meta.streak = 0;
        const attempts = [...prev.attempts];
        for (let i = attempts.length - 1; i >= 0; i--) {
          if (attempts[i].success) {
            attempts.splice(i, 1);
            break;
          }
        }
        this.progress[id] = { ...prev, done: false, doneAt: null, attempts };
      }

      this._saveProgress();
      this._saveMeta();
    },

    addTry(id: string, delta: number): void {
      if (this.readOnly) return;
      this._pushUndo("addTry", id);
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
          attempts: [...prev.attempts, { ts: Date.now(), success: false }],
        };
      } else {
        const newTries = Math.max(0, prev.tries + delta);
        const attempts = [...prev.attempts];
        if (delta < 0 && newTries < prev.tries) {
          for (let i = attempts.length - 1; i >= 0; i--) {
            if (!attempts[i].success) {
              attempts.splice(i, 1);
              break;
            }
          }
        }
        this.progress[id] = { ...prev, tries: newTries, attempts };
      }

      this._saveProgress();
    },

    togglePriority(id: string): void {
      if (this.readOnly) return;
      this._pushUndo("togglePriority", id);
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

    setNote(id: string, note: string): void {
      if (this.readOnly) return;
      const prev = resolveProgress(this.progress, id);
      this.progress[id] = { ...prev, note };
      this._saveProgress();
    },

    saveBuild(id: string, build: CharacterProgress["build"]): void {
      if (this.readOnly) return;
      const prev = resolveProgress(this.progress, id);
      this.progress[id] = { ...prev, build };
      this._saveProgress();
    },

    undo(): boolean {
      if (this.readOnly || !this.undoStack.length) return false;
      const entry = this.undoStack.pop()!;
      this.progress[entry.id] = entry.prev as CharacterProgress;
      StorageService.set(STORAGE_KEYS.undo, this.undoStack);
      this._saveProgress();
      return true;
    },

    markDoneFromSteam(entries: Array<{ id: string; ts: number }>): void {
      for (const { id, ts } of entries) {
        if (!this.progress[id]?.done) {
          const prev = resolveProgress(this.progress, id);
          this.progress[id] = {
            ...prev,
            done: true,
            doneAt: ts || Date.now(),
            attempts: [
              ...prev.attempts,
              { ts: ts || Date.now(), success: true },
            ],
          };
        }
      }
      this._saveProgress();
    },

    switchTab(tab: TabId): void {
      this.tab = tab;
      this.activeId = null;
      this.search = "";
      this.selectedIds = new Set();
      this.selectMode = false;
      this._saveUI();
    },

    setPage(page: PageId): void {
      this.page = page;
      this._saveUI();
    },

    randomPick(): Character | null {
      const base =
        this.tab === "killer"
          ? this.killers
          : this.tab === "survivor"
            ? this.survivors
            : this.allCharacters;

      const pool = base.filter(
        (c) => !resolveProgress(this.progress, c.id).done,
      );
      if (!pool.length) return null;

      const weighted = pool.flatMap((c) =>
        resolveProgress(this.progress, c.id).priority ? [c, c, c, c, c] : [c],
      );

      const pick = weighted[Math.floor(Math.random() * weighted.length)];
      this.activeId = pick.id;
      this.page = "tracker";
      this._saveUI();
      return pick;
    },

    bulkMarkDone(): number {
      if (this.readOnly) return 0;
      let count = 0;
      for (const id of this.selectedIds) {
        const prev = resolveProgress(this.progress, id);
        if (!prev.done) {
          this.progress[id] = { ...prev, done: true, doneAt: Date.now() };
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
        this.progress[id] = { ...prev, done: false, doneAt: null, tries: 0 };
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
      ordered.forEach((c, i) => {
        order[c.id] = i;
      });
      this.customOrder = order;
      StorageService.set(STORAGE_KEYS.customOrder, order);
    },

    generateShareData(): string {
      const p: Record<string, { d: number; t: number }> = {};
      for (const [id, v] of Object.entries(this.progress)) {
        if (v?.done || v?.tries) {
          p[id] = { d: v.done ? 1 : 0, t: v.tries || 0 };
        }
      }
      return btoa(JSON.stringify({ p }));
    },

    loadShareData(encoded: string): boolean {
      try {
        const data = JSON.parse(atob(encoded)) as {
          p: Record<string, { d: number; t: number }>;
        };
        if (!data.p) return false;

        this.ownProgress = { ...this.progress };
        this.readOnly = true;
        this.progress = {};

        for (const [id, v] of Object.entries(data.p)) {
          this.progress[id] = {
            ...DEFAULT_PROGRESS,
            done: !!v.d,
            tries: v.t || 0,
          };
        }
        return true;
      } catch {
        return false;
      }
    },

    exitSharedView(): void {
      if (!this.readOnly) return;
      this.progress =
        this.ownProgress ??
        StorageService.get<ProgressMap>(STORAGE_KEYS.progress) ??
        {};
      this.ownProgress = null;
      this.readOnly = false;
    },
  },
});
