<template>
  <ion-app>
    <div
      class="min-h-screen flex flex-col"
      style="background: var(--color-bg-base); color: var(--color-text-primary)"
    >
      <!-- ═══ HEADER ═══ -->
      <header
        class="sticky top-0 z-[100] border-b"
        style="
          background: var(--color-bg-header);
          border-color: var(--color-border-subtle);
          padding-top: env(safe-area-inset-top, 0px);
        "
      >
        <div class="max-w-[1200px] mx-auto px-5">
          <!-- Title row -->
          <div class="flex items-center gap-4 pt-4 pb-1">
            <div class="flex-1">
              <div
                class="font-display text-xl font-black tracking-[2px] bg-gradient-to-r from-[var(--color-killer)] to-purple-400 bg-clip-text text-transparent"
              >
                DEAD BY DAYLIGHT
              </div>
              <div
                style="color: var(--color-text-muted)"
                class="text-[11px] tracking-[3px] uppercase mt-0.5"
              >
                Adept Tracker
              </div>
            </div>
            <div class="flex items-center gap-3">
              <button
                class="rounded-lg border px-3 py-2 text-base cursor-pointer"
                style="
                  border-color: var(--color-border-subtle);
                  background: var(--color-bg-elevated);
                  color: var(--color-text-secondary);
                "
                @click="settings.cycleTheme()"
              >
                {{ themeIcon }}
              </button>
              <div class="text-right">
                <div
                  class="font-display text-2xl font-black leading-none"
                  style="color: var(--color-accent)"
                >
                  {{ store.totalDone
                  }}<span style="color: var(--color-text-muted)" class="text-sm"
                    >/{{ store.totalCount }}</span
                  >
                </div>
                <div
                  style="color: var(--color-text-muted)"
                  class="text-[11px] mt-0.5"
                >
                  {{ store.totalPercent }}%
                </div>
              </div>
            </div>
          </div>

          <!-- Progress bar -->
          <div
            class="h-[3px] rounded-full overflow-hidden mt-2"
            style="background: var(--color-border-subtle)"
          >
            <div
              class="h-full transition-all duration-500"
              style="background: var(--color-accent)"
              :style="{ width: store.totalPercent + '%' }"
            />
          </div>

          <!-- Tabs -->
          <div class="flex gap-1 pt-2 pb-0" style="height: 65px">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="flex-1 py-4 px-3 text-sm font-semibold tracking-wide border-b-[3px] transition-colors cursor-pointer"
              :style="{
                color:
                  store.tab === tab.id
                    ? 'var(--color-accent)'
                    : 'var(--color-text-muted)',
                borderBottomColor:
                  store.tab === tab.id ? 'var(--color-accent)' : 'transparent',
              }"
              @click="store.switchTab(tab.id)"
            >
              {{ tab.icon }}
              <span class="opacity-70 text-xs">{{ tab.count }}</span>
            </button>
          </div>
        </div>
      </header>

      <!-- ═══ BODY ═══ -->
      <div class="flex-1 overflow-y-auto">
        <div
          class="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-0 lg:gap-7 px-0 lg:px-6 pb-32 pt-4"
        >
          <!-- Sidebar -->
          <aside
            class="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto p-4 lg:p-0"
          >
            <!-- Stats block -->
            <div
              class="lg:rounded-xl lg:border lg:p-5 lg:mb-3.5 flex lg:flex-col gap-2.5 flex-wrap"
              :style="{
                borderColor: 'var(--color-border-subtle)',
                background: 'var(--color-bg-card)',
              }"
            >
              <SectionLabel class="hidden lg:block mb-3"
                >Fortschritt</SectionLabel
              >
              <div
                v-for="stat in sidebarStats"
                :key="stat.label"
                class="flex-1 min-w-[100px] lg:flex lg:justify-between lg:items-center lg:py-2 lg:border-b lg:last:border-b-0 max-lg:rounded-xl max-lg:border max-lg:p-3 max-lg:flex max-lg:flex-col max-lg:gap-0.5"
                :style="{
                  borderColor: 'var(--color-border-subtle)',
                  background: 'var(--color-bg-card)',
                }"
              >
                <span
                  class="text-sm lg:text-[13px] max-lg:text-[11px]"
                  style="color: var(--color-text-secondary)"
                  >{{ stat.label }}</span
                >
                <span
                  class="font-bold font-display lg:text-[15px] max-lg:text-lg max-lg:font-black"
                  :style="{ color: stat.color }"
                  >{{ stat.value }}</span
                >
              </div>
            </div>

            <!-- Actions (desktop only) -->
            <div
              v-if="!store.readOnly"
              class="hidden lg:flex flex-col gap-1.5 mb-3.5"
            >
              <button class="sidebar-btn" @click="onRandomPick">
                🎲 Zufälliger Charakter
              </button>
              <button class="sidebar-btn" @click="onUndo">
                ↩ Rückgängig{{
                  store.undoStack.length ? ` (${store.undoStack.length})` : ""
                }}
              </button>
              <button
                class="sidebar-btn"
                :class="{ 'sidebar-btn-active': store.ownedOnly }"
                @click="store.setOwnedOnly(!store.ownedOnly)"
              >
                🎮 Nur besitzte{{ store.ownedOnly ? " ✓" : "" }}
              </button>
            </div>

            <!-- Export (desktop only) -->
            <div v-if="!store.readOnly" class="hidden lg:block mb-3.5">
              <SectionLabel class="mb-2">Export / Tools</SectionLabel>
              <div class="grid grid-cols-2 gap-1.5">
                <button class="export-btn" @click="exportJSON">📦 JSON</button>
                <button class="export-btn" @click="importJSON">
                  📂 Import
                </button>
                <button class="export-btn" @click="exportStatCard">
                  📊 Stat Card
                </button>
                <button class="export-btn" @click="shareLink">🔗 Teilen</button>
              </div>
            </div>

            <!-- Steam (desktop only) -->
            <div v-if="!store.readOnly" class="hidden lg:block">
              <SteamWidget @sync="doSteamSync" @force-sync="doSteamForceSync" />
            </div>

            <!-- Read-only banner -->
            <div
              v-if="store.readOnly"
              class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between gap-3 flex-wrap mb-3"
            >
              <div
                class="flex items-center gap-2.5 text-sm font-bold text-amber-500"
              >
                <span class="text-xl">👁</span>
                <div>
                  Geteilter Fortschritt
                  <div
                    class="text-xs font-normal mt-0.5"
                    style="color: var(--color-text-muted)"
                  >
                    Nur-Ansicht
                  </div>
                </div>
              </div>
              <button
                class="rounded-xl bg-amber-500 text-black px-4 py-2 text-sm font-bold font-display cursor-pointer"
                @click="exitShare"
              >
                ✕ Zurück
              </button>
            </div>
          </aside>

          <!-- Main content -->
          <main class="min-w-0">
            <router-view />
          </main>
        </div>
      </div>

      <!-- ═══ BOTTOM NAV ═══ -->
      <nav
        class="fixed bottom-0 left-0 right-0 z-[200]"
        style="padding-bottom: env(safe-area-inset-bottom, 0px)"
      >
        <div
          class="max-w-[1200px] mx-auto border-t flex gap-1.5 px-4 py-3 lg:rounded-t-xl backdrop-blur-xl"
          style="
            background: var(--color-bg-header);
            border-color: var(--color-border-subtle);
            height: 60px;
          "
        >
          <button
            v-for="nav in navItems"
            :key="nav.page"
            class="flex-1 py-3 rounded-xl text-xs font-bold tracking-wide text-center border transition-all cursor-pointer"
            :style="{
              borderColor:
                store.page === nav.page
                  ? 'color-mix(in srgb, var(--color-accent) 25%, transparent)'
                  : 'var(--color-border-subtle)',
              color:
                store.page === nav.page
                  ? 'var(--color-accent)'
                  : 'var(--color-text-muted)',
            }"
            @click="navigateTo(nav.page)"
          >
            {{ nav.icon }} {{ nav.label }}
          </button>
          <button
            class="flex-1 py-3 rounded-xl text-xs font-bold tracking-wide text-center border cursor-pointer"
            style="
              border-color: var(--color-border-subtle);
              color: var(--color-text-muted);
            "
            @click="settingsOpen = true"
          >
            ⚙
          </button>
        </div>
      </nav>
    </div>

    <!-- ═══ SETTINGS MODAL ═══ -->
    <AppModal
      :is-open="settingsOpen"
      title="⚙ Einstellungen"
      @close="settingsOpen = false"
    >
      <div style="color: var(--color-text-primary)">
        <!-- Theme -->
        <div class="mb-8">
          <SectionLabel class="mb-4">Theme</SectionLabel>
          <div class="flex gap-3">
            <button
              v-for="t in themeOptions"
              :key="t.id"
              class="flex-1 min-w-[80px] py-4 rounded-xl border text-base font-semibold cursor-pointer transition-all"
              :style="{
                borderColor:
                  settings.theme === t.id
                    ? 'var(--color-accent)'
                    : 'var(--color-border-subtle)',
                background:
                  settings.theme === t.id
                    ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                    : 'var(--color-bg-elevated)',
                color:
                  settings.theme === t.id
                    ? 'var(--color-accent)'
                    : 'var(--color-text-secondary)',
              }"
              @click="settings.setTheme(t.id)"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- Vim mode -->
        <div class="mb-8">
          <SectionLabel class="mb-4">Navigation</SectionLabel>
          <label
            class="flex items-center gap-3 text-base cursor-pointer rounded-xl border p-4"
            style="
              border-color: var(--color-border-subtle);
              background: var(--color-bg-elevated);
              color: var(--color-text-secondary);
            "
          >
            <input
              type="checkbox"
              :checked="settings.settings.vimMode"
              class="w-5 h-5 accent-[var(--color-accent)]"
              @change="settings.toggleVim()"
            />
            <div>
              <div>Vim-Modus</div>
              <div
                class="text-sm mt-0.5"
                style="color: var(--color-text-muted)"
              >
                j/k navigieren, x erledigt, t +try
              </div>
            </div>
          </label>
        </div>

        <!-- Steam (mobile) -->
        <div class="lg:hidden mb-8">
          <SectionLabel class="mb-4">Steam</SectionLabel>
          <SteamWidget @sync="doSteamSync" @force-sync="doSteamForceSync" />
        </div>

        <!-- Export (mobile) -->
        <div class="lg:hidden mb-8">
          <SectionLabel class="mb-4">Export / Tools</SectionLabel>
          <div class="grid grid-cols-2 gap-2">
            <button
              class="export-btn"
              style="padding: 14px 8px; font-size: 14px"
              @click="exportJSON"
            >
              📦 JSON
            </button>
            <button
              class="export-btn"
              style="padding: 14px 8px; font-size: 14px"
              @click="importJSON"
            >
              📂 Import
            </button>
            <button class="export-btn" @click="exportStatCard">
              📊 Stat Card
            </button>
            <button
              class="export-btn"
              style="padding: 14px 8px; font-size: 14px"
              @click="shareLink"
            >
              🔗 Teilen
            </button>
          </div>
        </div>
      </div>
    </AppModal>
  </ion-app>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { IonApp } from "@ionic/vue";
import { useProgressStore, useSettingsStore, useSteamStore } from "@/stores";
import { StorageService, WikiApi } from "@/services";
import { showToast } from "@/composables";
import type { TabId, PageId, ThemeId } from "@/types";
import SteamWidget from "@/components/steam/SteamWidget.vue";
import AppModal from "@/components/shared/AppModal.vue";
import SectionLabel from "@/components/shared/SectionLabel.vue";
import router from "@/router";

export default defineComponent({
  name: "App",
  components: { IonApp, SteamWidget, AppModal, SectionLabel },

  data() {
    return {
      settingsOpen: false,
      navItems: [
        { page: "tracker" as PageId, icon: "📋", label: "Liste" },
        { page: "stats" as PageId, icon: "📊", label: "Stats" },
        { page: "tierlist" as PageId, icon: "🏆", label: "Tiers" },
        { page: "compare" as PageId, icon: "🔍", label: "Vergl." },
      ] as const,
      themeOptions: [
        { id: "dark" as ThemeId, label: "🌙 Dark" },
        { id: "light" as ThemeId, label: "☀️ Light" },
        { id: "oled" as ThemeId, label: "⚫ OLED" },
      ] as const,
    };
  },

  computed: {
    store() {
      return useProgressStore();
    },
    settings() {
      return useSettingsStore();
    },
    steam() {
      return useSteamStore();
    },

    themeIcon(): string {
      const icons: Record<ThemeId, string> = {
        dark: "🌙",
        light: "☀️",
        oled: "⚫",
      };
      return icons[this.settings.theme] ?? "🌙";
    },

    tabs() {
      return [
        {
          id: "survivor" as TabId,
          icon: "👤",
          count: `${this.store.survivorsDone}/${this.store.survivors.length}`,
        },
        {
          id: "killer" as TabId,
          icon: "💀",
          count: `${this.store.killersDone}/${this.store.killers.length}`,
        },
        {
          id: "all" as TabId,
          icon: "🌐",
          count: `${this.store.totalDone}/${this.store.totalCount}`,
        },
      ];
    },

    sidebarStats() {
      return [
        {
          label: "👤 Survivors",
          value: `${this.store.survivorsDone}/${this.store.survivors.length}`,
          color: "var(--color-survivor)",
        },
        {
          label: "💀 Killers",
          value: `${this.store.killersDone}/${this.store.killers.length}`,
          color: "var(--color-killer)",
        },
        {
          label: "Gesamt",
          value: `${this.store.totalDone}/${this.store.totalCount}`,
          color: "var(--color-accent)",
        },
        {
          label: "🔥 Streak",
          value: String(this.store.meta.streak),
          color: "#fb923c",
        },
        {
          label: "🏆 Best",
          value: String(this.store.meta.bestStreak),
          color: "#fbbf24",
        },
        {
          label: "⏱ Est.",
          value: this.store.estimatedCompletion,
          color: "#c084fc",
        },
      ];
    },
  },

  mounted(): void {
    this.settings.initTheme();
    StorageService.cachePurge();

    // Prefetch all portraits in batches
    const allImgs = this.store.allCharacters.map((c) => c.img).filter(Boolean);
    WikiApi.prefetchAll(allImgs);

    // Handle share link
    const hash = location.hash;
    if (hash.startsWith("#share=")) {
      this.store.loadShareData(hash.slice(7));
    }

    // Auto steam sync
    if (this.steam.hasCreds) {
      setTimeout(() => this.doSteamSync(), 1500);
      setInterval(() => this.doSteamSync(), 5 * 60_000);
    }

    // Sync route with persisted page
    if (router.currentRoute.value.name !== this.store.page) {
      router.replace({ name: this.store.page });
    }
  },

  methods: {
    navigateTo(page: PageId): void {
      this.store.setPage(page);
      router.push({ name: page });
    },

    async onRandomPick(): Promise<void> {
      const pick = this.store.randomPick();
      if (!pick) {
        await showToast("Alle Adepts in dieser Kategorie geschafft! 🏆");
        return;
      }
      await router.push({ name: "tracker" });
      await showToast(`🎲 ${pick.name}`);
    },

    async onUndo(): Promise<void> {
      if (this.store.undo()) await showToast("↩ Rückgängig");
      else await showToast("Nichts rückgängig");
    },

    exitShare(): void {
      this.store.exitSharedView();
      history.replaceState(null, "", location.pathname);
      showToast("↩ Zurück zu deinem Fortschritt");
    },

    // ─── Steam ────────────────────────────────────────────────────

    async doSteamSync(): Promise<void> {
      if (!this.steam.hasCreds) {
        this.steam.setPhase("setup");
        return;
      }
      this.steam.setPhase("syncing");
      try {
        const adepts = await this.steam.fetchAdepts();
        const changed: Array<{ id: string; ts: number }> = [];

        for (const adept of adepts) {
          const dm = adept.displayName?.match(/^Adept\s+(.+)$/i);
          if (!dm) continue;

          const search = dm[1].trim().toLowerCase();
          const ch = this.store.allCharacters.find((c) => {
            const name = c.name.toLowerCase();
            const nameWithoutThe = name.replace(/^the\s+/, "");
            return (
              name === search ||
              nameWithoutThe === search ||
              name.startsWith(search + " ") ||
              nameWithoutThe.startsWith(search + " ")
            );
          });
          if (ch && !this.store.getProgress(ch.id).done) {
            changed.push({
              id: ch.id,
              ts: adept.unlocktime ? adept.unlocktime * 1000 : Date.now(),
            });
          }
        }

        if (changed.length) this.store.markDoneFromSteam(changed);
        this.steam.setPhase("done", `✅ ${changed.length} Adepts`);
      } catch (e) {
        this.steam.setPhase("error", `✗ ${(e as Error).message}`);
      }
      setTimeout(() => this.steam.setPhase("idle"), 5000);
    },

    doSteamForceSync(): void {
      StorageService.cacheRemove("adept_schema_v3");
      this.doSteamSync();
    },

    // ─── Export / Import ──────────────────────────────────────────

    exportJSON(): void {
      const data = {
        progress: this.store.progress,
        meta: this.store.meta,
        version: 2,
        exportedAt: new Date().toISOString(),
      };
      this._download(
        JSON.stringify(data, null, 2),
        "application/json",
        `dbd-adept-${new Date().toISOString().slice(0, 10)}.json`,
      );
      showToast("📦 Export gespeichert");
    },

    importJSON(): void {
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = ".json";
      inp.onchange = async () => {
        try {
          const data = JSON.parse(await inp.files![0].text()) as {
            progress?: Record<string, unknown>;
          };
          if (!data.progress) throw new Error("Ungültig");
          if (!confirm("Importieren?")) return;
          this.store.progress = data.progress as typeof this.store.progress;
          this.store._saveProgress();
          await showToast("✅ Import erfolgreich");
        } catch (e) {
          await showToast(`✗ ${(e as Error).message}`);
        }
      };
      inp.click();
    },

    exportStatCard(): void {
      const canvas = document.createElement("canvas");
      const W = 800,
        H = 480;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      const s = this.store;
      const survivorPct = Math.round(
        (s.survivorsDone / s.survivors.length) * 100,
      );
      const killerPct = Math.round((s.killersDone / s.killers.length) * 100);
      const totalPct = Number(s.totalPercent);

      // ── background
      ctx.fillStyle = "#0d0d0f";
      ctx.fillRect(0, 0, W, H);

      // ── top accent bar
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, "#7c3aed");
      grad.addColorStop(1, "#c026d3");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, 4);

      // ── title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px monospace";
      ctx.letterSpacing = "4px";
      ctx.fillText("DEAD BY DAYLIGHT", 40, 44);
      ctx.letterSpacing = "0px";
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px monospace";
      ctx.fillText("ADEPT TRACKER", 40, 62);

      // ── big percent
      ctx.textAlign = "right";
      ctx.font = "bold 72px monospace";
      ctx.fillStyle = "#a855f7";
      ctx.fillText(`${totalPct}%`, W - 40, 72);
      ctx.font = "12px monospace";
      ctx.fillStyle = "#6b7280";
      ctx.fillText(`${s.totalDone} / ${s.totalCount} adepts`, W - 40, 90);
      ctx.textAlign = "left";

      // ── divider
      ctx.strokeStyle = "#1f2937";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 108);
      ctx.lineTo(W - 40, 108);
      ctx.stroke();

      // ── helper: stat row
      const drawStat = (
        label: string,
        value: string,
        color: string,
        x: number,
        y: number,
      ) => {
        ctx.fillStyle = "#6b7280";
        ctx.font = "11px monospace";
        ctx.fillText(label, x, y);
        ctx.fillStyle = color;
        ctx.font = "bold 22px monospace";
        ctx.fillText(value, x, y + 26);
      };

      // ── helper: progress bar
      const drawBar = (
        x: number,
        y: number,
        w: number,
        pct: number,
        color: string,
      ) => {
        ctx.fillStyle = "#1f2937";
        ctx.roundRect(x, y, w, 8, 4);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, Math.max(4, (w * pct) / 100), 8, 4);
        ctx.fill();
      };

      // ── survivor block
      drawStat(
        "SURVIVORS",
        `${s.survivorsDone}/${s.survivors.length}`,
        "#60a5fa",
        40,
        148,
      );
      drawBar(40, 184, 220, survivorPct, "#3b82f6");
      ctx.fillStyle = "#374151";
      ctx.font = "11px monospace";
      ctx.fillText(`${survivorPct}%`, 268, 191);

      // ── killer block
      drawStat(
        "KILLERS",
        `${s.killersDone}/${s.killers.length}`,
        "#f87171",
        40,
        228,
      );
      drawBar(40, 264, 220, killerPct, "#ef4444");
      ctx.fillStyle = "#374151";
      ctx.font = "11px monospace";
      ctx.fillText(`${killerPct}%`, 268, 271);

      // ── right-side stat grid
      const stats = [
        { label: "STREAK", value: String(s.meta.streak), color: "#fb923c" },
        {
          label: "BEST STREAK",
          value: String(s.meta.bestStreak),
          color: "#fbbf24",
        },
        { label: "EST. DONE", value: s.estimatedCompletion, color: "#c084fc" },
        {
          label: "REMAINING",
          value: String(s.totalCount - s.totalDone),
          color: "#94a3b8",
        },
      ];
      stats.forEach((st, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        drawStat(st.label, st.value, st.color, 420 + col * 185, 148 + row * 80);
      });

      // ── full-width total bar
      drawBar(40, 320, W - 80, totalPct, "#9333ea");
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px monospace";
      ctx.fillText(`overall completion  ${totalPct}%`, 40, 350);

      // ── recently completed (last 5)
      const recent = s.allCharacters
        .filter((c) => s.getProgress(c.id).done && s.getProgress(c.id).doneAt)
        .sort(
          (a, b) =>
            (s.getProgress(b.id).doneAt ?? 0) -
            (s.getProgress(a.id).doneAt ?? 0),
        )
        .slice(0, 5);

      if (recent.length) {
        ctx.fillStyle = "#374151";
        ctx.font = "11px monospace";
        ctx.fillText("RECENT", 40, 390);
        recent.forEach((c, i) => {
          const isSurvivor = s.survivors.some((sv) => sv.id === c.id);
          ctx.fillStyle = isSurvivor ? "#3b82f6" : "#ef4444";
          ctx.font = "bold 12px monospace";
          ctx.fillText(c.name, 40 + i * 148, 410);
        });
      }

      // ── footer
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(0, H - 36, W, 36);
      ctx.fillStyle = "#4b5563";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        `generated ${new Date().toLocaleDateString("de-DE")}  ·  dbd-adept-tracker`,
        W / 2,
        H - 14,
      );
      ctx.textAlign = "left";

      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `dbd-adept-${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
      showToast("📊 Stat Card gespeichert");
    },

    async shareLink(): Promise<void> {
      try {
        const encoded = this.store.generateShareData();
        const url = location.href.split("#")[0] + "#share=" + encoded;
        await navigator.clipboard?.writeText(url);
        await showToast("🔗 Link kopiert");
      } catch {
        await showToast("✗ Fehler");
      }
    },

    /** Shared download helper — creates and revokes an object URL. */
    _download(content: string, mimeType: string, filename: string): void {
      const blob = new Blob([content], { type: mimeType });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    },
  },
});
</script>

<style>
.sidebar-btn {
  width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--color-border-subtle);
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  transition: all 0.15s;
  cursor: pointer;
}
.sidebar-btn:hover {
  border-color: var(--color-border-medium);
  color: var(--color-text-primary);
}
.sidebar-btn-active {
  background: color-mix(
    in srgb,
    var(--color-accent) 10%,
    transparent
  ) !important;
  border-color: color-mix(
    in srgb,
    var(--color-accent) 25%,
    transparent
  ) !important;
  color: var(--color-accent) !important;
}
.export-btn {
  padding: 8px 6px;
  border-radius: 8px;
  border: 1px solid var(--color-border-subtle);
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  width: 100%;
  transition: all 0.15s;
  cursor: pointer;
}
.export-btn:hover {
  border-color: color-mix(in srgb, var(--color-accent) 25%, transparent);
  color: var(--color-accent);
}
.font-display {
  font-family: "Cinzel", serif;
}
</style>
