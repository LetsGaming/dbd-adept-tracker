<template>
  <div
    :data-char-id="character.id"
    class="rounded-xl border mb-2.5 overflow-hidden transition-all"
    :class="[
      retired ? 'opacity-50' : '',
      progress.done
        ? 'bg-[var(--color-done-bg)] border-[var(--color-accent)]/25'
        : 'bg-[var(--color-bg-card)] border-[var(--color-border-subtle)]',
      isActive ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/25' : '',
      progress.priority ? 'border-l-[3px] border-l-amber-400' : '',
    ]"
    style="box-shadow: 0 2px 12px rgba(0,0,0,0.4)"
  >
    <!-- Header row -->
    <div
      class="flex items-center gap-3.5 px-4 py-3.5 cursor-pointer select-none"
      @click="$emit('toggle', character.id)"
    >
      <Portrait
        :img-file="character.img"
        :done="progress.done"
        :is-killer="isKiller"
      />
      <div class="flex-1 min-w-0">
        <div
          class="font-bold text-[15px] font-display tracking-wide truncate"
          :class="progress.done ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'"
        >
          {{ character.name }}
          <span v-if="progress.priority" class="text-xs">⭐</span>
        </div>
        <div class="text-xs text-[var(--color-text-muted)] mt-0.5 truncate flex items-center gap-1">
          <span class="truncate">{{ character.role }}</span>
          <button
            v-if="!readOnly"
            class="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            :title="progress.owned ? 'Besitzt — klicken zum Entfernen' : 'Nicht besitzt — klicken zum Hinzufügen'"
            @click.stop="$emit('toggle-owned', character.id)"
          >{{ progress.owned ? '🎮' : '🚫' }}</button>
          <span v-else-if="!progress.owned" class="shrink-0 opacity-60">🚫</span>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0 flex-wrap">
        <span
          v-if="progress.tries > 0"
          class="rounded-md border px-2 py-0.5 text-[11px] font-bold font-display"
          :style="{ background: 'var(--color-accent)18', borderColor: 'var(--color-accent)40', color: 'var(--color-accent)' }"
        >{{ progress.tries }}×</span>
        <span
          v-if="progress.done"
          class="rounded-md px-2 py-0.5 text-[10px] font-black tracking-wide text-black bg-[var(--color-accent)]"
        >✓ DONE</span>
        <span
          v-if="retired"
          class="rounded-md px-2 py-0.5 text-[10px] font-black tracking-wide text-white/80 bg-red-900/80 border border-red-500/30"
          title="Adept-Achievement wurde entfernt — nicht mehr erzielbar"
        >RETIRED</span>
        <span
          v-if="character.isNew"
          class="rounded-md px-2 py-0.5 text-[10px] font-black text-black bg-orange-400"
        >NEU</span>
        <span
          class="text-[var(--color-text-muted)] text-xs ml-1 transition-transform"
          :class="{ 'rotate-180 text-[var(--color-accent)]': isActive }"
        >▼</span>
      </div>
    </div>

    <!-- Expanded panel -->
    <ExpandedPanel
      v-if="isActive"
      :character="character"
      :progress="progress"
      :is-killer="isKiller"
      :read-only="readOnly"
      @toggle-done="$emit('toggle-done', character.id)"
      @add-try="(d: number) => $emit('add-try', character.id, d)"
      @open-perk="(n: string) => $emit('open-perk', n)"
      @toggle-priority="$emit('toggle-priority', character.id)"
      @toggle-owned="$emit('toggle-owned', character.id)"
      @update-note="(n: string) => $emit('update-note', character.id, n)"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { Character } from '@/types';
import { useProgressStore } from '@/stores';
import Portrait from '@/components/shared/Portrait.vue';
import ExpandedPanel from '@/components/character/ExpandedPanel.vue';

export default defineComponent({
  name: 'CharacterRow',
  components: { Portrait, ExpandedPanel },
  props: {
    character: { type: Object as PropType<Character>, required: true },
    isActive: { type: Boolean, required: true },
    isKiller: { type: Boolean, required: true },
    readOnly: { type: Boolean, required: true },
  },
  emits: [
    'toggle',
    'toggle-done',
    'add-try',
    'open-perk',
    'toggle-priority',
    'toggle-owned',
    'update-note',
  ],

  computed: {
    store() {
      return useProgressStore();
    },
    progress() {
      return this.store.getProgress(this.character.id);
    },
    retired(): boolean {
      return this.store.isRetired(this.character.name);
    },
  },
});
</script>
