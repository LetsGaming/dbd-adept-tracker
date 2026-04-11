<template>
  <div class="search-select" :class="{ 'search-select-open': isOpen }">
    <!-- Trigger / display -->
    <button
      ref="trigger"
      class="search-select-trigger"
      :title="modelValue || placeholder"
      @click="toggle"
    >
      <span
        v-if="modelValue"
        class="search-select-value"
        :style="selectedStyle"
      >{{ modelValue }}</span>
      <span v-else class="search-select-placeholder">{{ placeholder }}</span>
      <span class="search-select-arrow">▾</span>
    </button>

    <!-- Dropdown -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="search-select-overlay"
        @click="close"
      />
    </Teleport>
    <div v-if="isOpen" ref="dropdown" class="search-select-dropdown">
      <!-- Search input -->
      <div class="search-select-search-wrap">
        <input
          ref="searchInput"
          v-model="query"
          class="search-select-search"
          placeholder="Suchen…"
          @keydown.escape="close"
          @keydown.enter.prevent="selectFirst"
          @keydown.down.prevent="highlightNext"
          @keydown.up.prevent="highlightPrev"
        />
      </div>

      <!-- Options list -->
      <div class="search-select-list">
        <!-- Clear option -->
        <button
          v-if="modelValue"
          class="search-select-option search-select-clear"
          @click="select('')"
        >✕ Auswahl aufheben</button>

        <!-- Grouped options -->
        <template v-if="groupedFiltered.length">
          <template v-for="group in groupedFiltered" :key="group.label">
            <div v-if="group.label" class="search-select-group-label">
              {{ group.label }}
            </div>
            <button
              v-for="(opt, i) in group.items"
              :key="opt.name"
              class="search-select-option"
              :class="{ 'search-select-option-active': opt.name === modelValue, 'search-select-option-highlighted': isHighlighted(group.label, i) }"
              @click="select(opt.name)"
            >
              <span
                class="search-select-rarity-dot"
                :style="{ background: rarityColor(opt.rarity) }"
              />
              <span class="search-select-option-text">{{ opt.name }}</span>
            </button>
          </template>
        </template>

        <!-- Loading / empty -->
        <div v-else-if="loading" class="search-select-empty">
          <span class="animate-spin inline-block">⟳</span> Lade…
        </div>
        <div v-else class="search-select-empty">
          Keine Treffer
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { BuildOption, Rarity } from '@/data/build-seed';
import { RARITY_COLORS } from '@/data/build-seed';

interface OptionGroup {
  label: string;
  items: BuildOption[];
}

export default defineComponent({
  name: 'SearchSelect',
  props: {
    modelValue: { type: String, default: '' },
    options: { type: Array as PropType<BuildOption[]>, default: () => [] },
    placeholder: { type: String, default: 'Auswählen…' },
    loading: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],

  data() {
    return {
      isOpen: false,
      query: '',
      highlightIdx: -1,
    };
  },

  computed: {
    filteredOptions(): BuildOption[] {
      if (!this.query) return this.options;
      const q = this.query.toLowerCase();
      return this.options.filter((o) =>
        o.name.toLowerCase().includes(q) ||
        (o.category ?? '').toLowerCase().includes(q),
      );
    },

    groupedFiltered(): OptionGroup[] {
      const map = new Map<string, BuildOption[]>();
      for (const opt of this.filteredOptions) {
        const key = opt.category ?? '';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(opt);
      }
      return [...map.entries()].map(([label, items]) => ({ label, items }));
    },

    flatFiltered(): BuildOption[] {
      return this.groupedFiltered.flatMap((g) => g.items);
    },

    selectedStyle(): Record<string, string> {
      const opt = this.options.find((o) => o.name === this.modelValue);
      if (!opt) return {};
      return { color: RARITY_COLORS[opt.rarity] };
    },
  },

  methods: {
    toggle(): void {
      this.isOpen ? this.close() : this.open();
    },

    open(): void {
      this.isOpen = true;
      this.query = '';
      this.highlightIdx = -1;
      this.$nextTick(() => {
        (this.$refs.searchInput as HTMLInputElement)?.focus();
      });
    },

    close(): void {
      this.isOpen = false;
    },

    select(name: string): void {
      this.$emit('update:modelValue', name);
      this.close();
    },

    selectFirst(): void {
      const flat = this.flatFiltered;
      if (this.highlightIdx >= 0 && this.highlightIdx < flat.length) {
        this.select(flat[this.highlightIdx].name);
      } else if (flat.length) {
        this.select(flat[0].name);
      }
    },

    highlightNext(): void {
      const max = this.flatFiltered.length - 1;
      this.highlightIdx = Math.min(this.highlightIdx + 1, max);
    },

    highlightPrev(): void {
      this.highlightIdx = Math.max(this.highlightIdx - 1, 0);
    },

    isHighlighted(groupLabel: string, itemIndex: number): boolean {
      let flatIdx = 0;
      for (const g of this.groupedFiltered) {
        if (g.label === groupLabel) return flatIdx + itemIndex === this.highlightIdx;
        flatIdx += g.items.length;
      }
      return false;
    },

    rarityColor(rarity: Rarity): string {
      return RARITY_COLORS[rarity] ?? '#888';
    },
  },
});
</script>

<style scoped>
.search-select {
  position: relative;
}
.search-select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--color-border-subtle);
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  min-height: 34px;
  transition: border-color 0.15s;
}
.search-select-trigger:hover {
  border-color: var(--color-border-medium);
}
.search-select-open .search-select-trigger {
  border-color: var(--color-accent);
}
.search-select-value {
  flex: 1;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.search-select-placeholder {
  flex: 1;
  color: var(--color-text-faint);
}
.search-select-arrow {
  color: var(--color-text-muted);
  font-size: 10px;
}
.search-select-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
}
.search-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 1000;
  border-radius: 10px;
  border: 1px solid var(--color-border-medium);
  background: var(--color-bg-elevated);
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  overflow: hidden;
  min-width: 220px;
}
.search-select-search-wrap {
  padding: 8px;
  border-bottom: 1px solid var(--color-border-subtle);
}
.search-select-search {
  width: 100%;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-border-subtle);
  background: var(--color-bg-base);
  color: var(--color-text-primary);
  font-size: 12px;
  outline: none;
}
.search-select-search:focus {
  border-color: var(--color-accent);
}
.search-select-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 0;
}
.search-select-group-label {
  padding: 6px 12px 3px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}
.search-select-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 12px;
  font-size: 12px;
  text-align: left;
  color: var(--color-text-secondary);
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.1s;
}
.search-select-option:hover,
.search-select-option-highlighted {
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  color: var(--color-text-primary);
}
.search-select-option-active {
  color: var(--color-accent);
  font-weight: 700;
}
.search-select-clear {
  color: var(--color-text-muted);
  font-style: italic;
  border-bottom: 1px solid var(--color-border-subtle);
  margin-bottom: 2px;
}
.search-select-rarity-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.search-select-option-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.search-select-empty {
  padding: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>
