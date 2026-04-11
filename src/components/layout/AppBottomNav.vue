<template>
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
        @click="$emit('navigate', nav.page)"
      >
        {{ nav.icon }} {{ nav.label }}
      </button>
      <button
        class="flex-1 py-3 rounded-xl text-xs font-bold tracking-wide text-center border cursor-pointer"
        style="
          border-color: var(--color-border-subtle);
          color: var(--color-text-muted);
        "
        @click="$emit('open-settings')"
      >
        ⚙
      </button>
    </div>
  </nav>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { PageId } from '@/types';
import { useProgressStore } from '@/stores';

export default defineComponent({
  name: 'AppBottomNav',
  emits: ['navigate', 'open-settings'],

  data() {
    return {
      navItems: [
        { page: PageId.Tracker, icon: '📋', label: 'Liste' },
        { page: PageId.Stats, icon: '📊', label: 'Stats' },
        { page: PageId.TierList, icon: '🏆', label: 'Tiers' },
        { page: PageId.Compare, icon: '🔍', label: 'Vergl.' },
      ] as const,
    };
  },

  computed: {
    store() {
      return useProgressStore();
    },
  },
});
</script>
