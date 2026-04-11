<template>
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
      <SectionLabel class="hidden lg:block mb-3">Fortschritt</SectionLabel>
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
      <button class="sidebar-btn" @click="$emit('random-pick')">
        🎲 Zufälliger Charakter
      </button>
      <button class="sidebar-btn" @click="$emit('undo')">
        ↩ Rückgängig{{
          store.undoStack.length ? ` (${store.undoStack.length})` : ''
        }}
      </button>
      <button
        class="sidebar-btn"
        :class="{ 'sidebar-btn-active': store.ownedOnly }"
        @click="store.setOwnedOnly(!store.ownedOnly)"
      >
        🎮 Nur besitzte{{ store.ownedOnly ? ' ✓' : '' }}
      </button>
    </div>

    <!-- Export (desktop only) -->
    <div v-if="!store.readOnly" class="hidden lg:block mb-3.5">
      <SectionLabel class="mb-2">Export / Tools</SectionLabel>
      <ExportActions
        @export-json="$emit('export-json')"
        @import-json="$emit('import-json')"
        @export-stat-card="$emit('export-stat-card')"
        @share-link="$emit('share-link')"
        @copy-clipboard="$emit('copy-clipboard')"
      />
    </div>

    <!-- Steam (desktop only) -->
    <div v-if="!store.readOnly" class="hidden lg:block">
      <SteamWidget @sync="$emit('steam-sync')" @force-sync="$emit('steam-force-sync')" />
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
        @click="$emit('exit-share')"
      >
        ✕ Zurück
      </button>
    </div>
  </aside>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useProgressStore } from '@/stores';
import SectionLabel from '@/components/shared/SectionLabel.vue';
import ExportActions from '@/components/shared/ExportActions.vue';
import SteamWidget from '@/components/steam/SteamWidget.vue';

interface SidebarStat {
  label: string;
  value: string;
  color: string;
}

export default defineComponent({
  name: 'AppSidebar',
  components: { SectionLabel, ExportActions, SteamWidget },
  emits: [
    'random-pick',
    'undo',
    'export-json',
    'import-json',
    'export-stat-card',
    'share-link',
    'copy-clipboard',
    'steam-sync',
    'steam-force-sync',
    'exit-share',
  ],

  computed: {
    store() {
      return useProgressStore();
    },

    sidebarStats(): SidebarStat[] {
      const s = this.store;
      return [
        {
          label: '👤 Survivors',
          value: `${s.survivorsDone}/${s.survivors.length}`,
          color: 'var(--color-survivor)',
        },
        {
          label: '💀 Killers',
          value: `${s.killersDone}/${s.killers.length}`,
          color: 'var(--color-killer)',
        },
        {
          label: 'Gesamt',
          value: `${s.totalDone}/${s.totalCount}`,
          color: 'var(--color-accent)',
        },
        {
          label: '🔥 Streak',
          value: String(s.meta.streak),
          color: '#fb923c',
        },
        {
          label: '🏆 Best',
          value: String(s.meta.bestStreak),
          color: '#fbbf24',
        },
        {
          label: '⏱ Est.',
          value: s.estimatedCompletion,
          color: '#c084fc',
        },
        {
          label: '📅 Sessions',
          value: String(s.sessions.length),
          color: '#94a3b8',
        },
      ];
    },
  },
});
</script>
