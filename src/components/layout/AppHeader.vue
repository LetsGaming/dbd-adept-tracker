<template>
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
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { TabId, ThemeId } from '@/types';
import { useProgressStore, useSettingsStore } from '@/stores';

const THEME_ICONS: Record<ThemeId, string> = {
  [ThemeId.Dark]: '🌙',
  [ThemeId.Light]: '☀️',
  [ThemeId.Oled]: '⚫',
};

export default defineComponent({
  name: 'AppHeader',

  computed: {
    store() {
      return useProgressStore();
    },
    settings() {
      return useSettingsStore();
    },
    themeIcon(): string {
      return THEME_ICONS[this.settings.theme] ?? '🌙';
    },
    tabs() {
      return [
        {
          id: TabId.Survivor,
          icon: '👤',
          count: `${this.store.survivorsDone}/${this.store.survivors.length}`,
        },
        {
          id: TabId.Killer,
          icon: '💀',
          count: `${this.store.killersDone}/${this.store.killers.length}`,
        },
        {
          id: TabId.All,
          icon: '🌐',
          count: `${this.store.totalDone}/${this.store.totalCount}`,
        },
      ];
    },
  },
});
</script>
