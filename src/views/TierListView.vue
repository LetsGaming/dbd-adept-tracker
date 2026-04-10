<template>
  <div class="max-w-[1200px] mx-auto px-4 pb-24 pt-4">
    <SectionLabel class="mb-3">Tier List — Drag & Drop</SectionLabel>

    <div
      v-for="tier in TIER_LABELS"
      :key="tier"
      class="rounded-xl border border-[var(--color-border-subtle)] overflow-hidden mb-3"
    >
      <div class="flex">
        <div
          class="flex items-center justify-center min-w-[50px] px-4 py-3 font-display text-base font-black"
          :style="{ background: TIER_COLORS[tier] + '22', color: TIER_COLORS[tier] }"
        >
          {{ tier }}
        </div>
        <div
          class="flex flex-wrap gap-1.5 p-2.5 min-h-[60px] flex-1 bg-[var(--color-bg-card)] items-center"
          @dragover.prevent
          @drop="onDrop($event, tier)"
        >
          <div
            v-for="id in tierMap[tier] ?? []"
            :key="id"
            class="w-[50px] h-[50px] rounded-lg border-2 border-[var(--color-border-medium)] overflow-hidden cursor-grab relative bg-[var(--color-bg-elevated)] flex items-center justify-center text-sm hover:scale-110 transition-transform"
            draggable="true"
            :title="charName(id)"
            @dragstart="onDragStart($event, id)"
          >
            <Portrait :img-file="charImg(id)" :is-killer="store.isKiller(id)" size="lg" />
            <div
              v-if="store.getProgress(id).done"
              class="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-[var(--color-accent)] text-[7px] flex items-center justify-center text-black font-black"
            >✓</div>
          </div>
          <span v-if="!tierMap[tier]?.length" class="text-[var(--color-text-faint)] text-xs">
            Ziehe Charaktere hierher
          </span>
        </div>
      </div>
    </div>

    <!-- Unranked -->
    <div class="rounded-xl border border-dashed border-[var(--color-border-medium)] bg-[var(--color-bg-elevated)] p-3.5 mt-3">
      <SectionLabel class="mb-2.5">Nicht eingestuft ({{ unranked.length }})</SectionLabel>
      <div
        class="flex flex-wrap gap-1.5 min-h-[40px]"
        @dragover.prevent
        @drop="onDrop($event, '')"
      >
        <div
          v-for="ch in unranked"
          :key="ch.id"
          class="w-[50px] h-[50px] rounded-lg border-2 border-[var(--color-border-medium)] overflow-hidden cursor-grab relative bg-[var(--color-bg-elevated)] flex items-center justify-center text-sm hover:scale-110 transition-transform"
          draggable="true"
          :title="ch.name"
          @dragstart="onDragStart($event, ch.id)"
        >
          <Portrait :img-file="ch.img" :is-killer="store.isKiller(ch.id)" size="lg" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useProgressStore } from '@/stores';
import { StorageService } from '@/services';
import { TIER_LABELS, TIER_COLORS } from '@/data';
import type { TierLabel, TierMap } from '@/types';
import Portrait from '@/components/shared/Portrait.vue';
import SectionLabel from '@/components/shared/SectionLabel.vue';

const TIER_KEY = 'dbd_tierlist';

const store = useProgressStore();
const tierData = ref<TierMap>(StorageService.get<TierMap>(TIER_KEY) ?? ({} as TierMap));

const visibleChars = computed(() => {
  if (store.tab === 'survivor') return [...store.survivors];
  if (store.tab === 'killer') return [...store.killers];
  return store.allCharacters;
});

const visibleIds = computed(() => new Set(visibleChars.value.map((c) => c.id)));

const tierMap = computed<Record<string, string[]>>(() => {
  const m: Record<string, string[]> = {};
  for (const t of TIER_LABELS) m[t] = [];
  for (const [id, t] of Object.entries(tierData.value)) {
    if (m[t] && visibleIds.value.has(id)) m[t].push(id);
  }
  return m;
});

const ranked = computed<Set<string>>(() => {
  const s = new Set<string>();
  for (const [id, t] of Object.entries(tierData.value)) {
    if (visibleIds.value.has(id) && t) s.add(id);
  }
  return s;
});

const unranked = computed(() =>
  visibleChars.value.filter((c) => !ranked.value.has(c.id)),
);

function charName(id: string): string {
  return store.allCharacters.find((c) => c.id === id)?.name ?? id;
}

function charImg(id: string): string {
  return store.allCharacters.find((c) => c.id === id)?.img ?? '';
}

function onDragStart(e: DragEvent, id: string): void {
  e.dataTransfer?.setData('text/plain', id);
}

function onDrop(e: DragEvent, tier: string): void {
  const id = e.dataTransfer?.getData('text/plain');
  if (!id) return;
  // Reassign entire object to trigger Vue reactivity.
  const updated = { ...tierData.value };
  if (tier) {
    updated[id] = tier as TierLabel;
  } else {
    delete updated[id];
  }
  tierData.value = updated;
  StorageService.set(TIER_KEY, tierData.value);
}
</script>
