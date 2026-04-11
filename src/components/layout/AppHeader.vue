<template>
  <header
    class="sticky top-0 z-[100] border-b"
    style="
      background: var(--color-bg-header);
      border-color: var(--color-border-subtle);
      padding-top: env(safe-area-inset-top, 0px);
    "
  >
    <div class="max-w-[1200px] mx-auto px-4">
      <!-- Compact info row: title left, progress center, theme right -->
      <div class="flex items-center gap-3 h-[38px]">
        <div
          class="font-display text-[13px] font-black tracking-[1.5px] bg-gradient-to-r from-[var(--color-killer)] to-purple-400 bg-clip-text text-transparent leading-none shrink-0"
        >DBD<span class="text-[10px] tracking-[2px] opacity-60 ml-1">ADEPT</span></div>

        <!-- Progress bar fills center -->
        <div class="flex-1 flex items-center gap-2.5 min-w-0">
          <div
            class="flex-1 h-[3px] rounded-full overflow-hidden"
            style="background: var(--color-border-subtle)"
          >
            <div
              class="h-full transition-all duration-500 rounded-full"
              style="background: var(--color-accent)"
              :style="{ width: store.totalPercent + '%' }"
            />
          </div>
          <span
            class="text-[11px] font-bold font-display tabular-nums shrink-0"
            style="color: var(--color-accent)"
          >{{ store.totalDone }}<span class="opacity-50">/{{ store.totalCount }}</span></span>
        </div>

        <button
          class="w-[30px] h-[30px] flex items-center justify-center rounded-md border text-sm cursor-pointer shrink-0"
          style="
            border-color: var(--color-border-subtle);
            background: var(--color-bg-elevated);
            color: var(--color-text-secondary);
          "
          @click="settings.cycleTheme()"
        >{{ themeIcon }}</button>
      </div>

      <!-- Tabs — main focus -->
      <div class="flex gap-1.5 pb-1.5 pt-0.5">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ 'tab-btn-active': store.tab === tab.id }"
          @click="store.switchTab(tab.id)"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
          <span class="tab-count">{{ tab.count }}</span>
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
          label: 'Survivors',
          count: `${this.store.survivorsDone}/${this.store.survivors.length}`,
        },
        {
          id: TabId.Killer,
          icon: '💀',
          label: 'Killers',
          count: `${this.store.killersDone}/${this.store.killers.length}`,
        },
        {
          id: TabId.All,
          icon: '🌐',
          label: 'Alle',
          count: `${this.store.totalDone}/${this.store.totalCount}`,
        },
      ];
    },
  },
});
</script>

<style scoped>
.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 6px;
  border-radius: 10px;
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--color-text-muted);
  background: transparent;
}

.tab-btn:hover:not(.tab-btn-active) {
  background: color-mix(in srgb, var(--color-text-muted) 6%, transparent);
}

.tab-btn-active {
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  border-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
  color: var(--color-accent);
  box-shadow: 0 0 12px color-mix(in srgb, var(--color-accent) 10%, transparent);
}

.tab-icon {
  font-size: 16px;
  line-height: 1;
}

.tab-label {
  font-family: 'Cinzel', serif;
  letter-spacing: 0.05em;
  font-size: 12px;
}

.tab-count {
  font-size: 10px;
  opacity: 0.6;
  font-family: 'Cinzel', serif;
  font-weight: 800;
}

.tab-btn-active .tab-count {
  opacity: 0.85;
}

@media (max-width: 380px) {
  .tab-label {
    display: none;
  }
}
</style>
