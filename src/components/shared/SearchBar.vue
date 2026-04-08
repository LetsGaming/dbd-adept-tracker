<template>
  <div class="flex gap-2.5 mb-4">
    <div
      class="flex-1 flex items-center gap-2.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-raised)] px-3.5"
    >
      <span class="text-[var(--color-text-muted)] text-sm">🔍</span>
      <input
        :value="search"
        :placeholder="placeholder"
        class="flex-1 bg-transparent border-none text-[var(--color-text-primary)] text-sm outline-none py-2.5 placeholder:text-[var(--color-text-muted)]"
        @input="onInput"
      />
      <button
        v-if="search"
        class="text-[var(--color-text-muted)] text-base px-1 py-1 min-w-[32px] min-h-[32px]"
        @click="$emit('update:search', '')"
      >✕</button>
    </div>
    <select
      :value="filter"
      class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-raised)] text-[var(--color-text-secondary)] text-sm px-3 cursor-pointer outline-none"
      @change="onFilter"
    >
      <option value="all">Alle</option>
      <option value="todo">Ausstehend</option>
      <option value="done">Erledigt</option>
    </select>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { FilterId } from '@/types';

export default defineComponent({
  name: 'SearchBar',
  props: {
    search: { type: String, default: '' },
    filter: { type: String as () => FilterId, default: 'all' },
    placeholder: { type: String, default: 'Suchen…' },
  },
  emits: ['update:search', 'update:filter'],
  methods: {
    onInput(e: Event): void {
      this.$emit('update:search', (e.target as HTMLInputElement).value);
    },
    onFilter(e: Event): void {
      this.$emit('update:filter', (e.target as HTMLSelectElement).value as FilterId);
    },
  },
});
</script>
