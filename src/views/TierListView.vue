<template>
  <div class="max-w-[1200px] mx-auto px-4 pb-24 pt-4">
    <SectionLabel class="mb-3">Tier List — Drag & Drop</SectionLabel>

    <div
      v-for="tier in tiers"
      :key="tier"
      class="rounded-xl border border-[var(--color-border-subtle)] overflow-hidden mb-3"
    >
      <div class="flex">
        <div
          class="flex items-center justify-center min-w-[50px] px-4 py-3 font-display text-base font-black"
          :style="{
            background: tierColors[tier] + '22',
            color: tierColors[tier],
          }"
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
            <Portrait
              :img-file="charImg(id)"
              :is-killer="store.isKiller(id)"
              size="lg"
            />
            <div
              v-if="store.getProgress(id).done"
              class="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-[var(--color-accent)] text-[7px] flex items-center justify-center text-black font-black"
            >
              ✓
            </div>
          </div>
          <span
            v-if="!tierMap[tier]?.length"
            class="text-[var(--color-text-faint)] text-xs"
          >
            Ziehe Charaktere hierher
          </span>
        </div>
      </div>
    </div>

    <!-- Unranked -->
    <div
      class="rounded-xl border border-dashed border-[var(--color-border-medium)] bg-[var(--color-bg-elevated)] p-3.5 mt-3"
    >
      <SectionLabel class="mb-2.5"
        >Nicht eingestuft ({{ unranked.length }})</SectionLabel
      >
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
          <Portrait
            :img-file="ch.img"
            :is-killer="store.isKiller(ch.id)"
            size="lg"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useProgressStore } from "@/stores";
import { StorageService } from "@/services";
import { TIER_LABELS, TIER_COLORS } from "@/data";
import type { TierLabel, TierMap } from "@/types";
import Portrait from "@/components/shared/Portrait.vue";
import SectionLabel from "@/components/shared/SectionLabel.vue";

const TIER_KEY = "dbd_tierlist";

export default defineComponent({
  name: "TierListView",
  components: { Portrait, SectionLabel },
  data() {
    return {
      tiers: TIER_LABELS,
      tierColors: TIER_COLORS,
      tierData: StorageService.get<TierMap>(TIER_KEY) ?? ({} as TierMap),
    };
  },
  computed: {
    store() {
      return useProgressStore();
    },
    visibleChars() {
      if (this.store.tab === "survivor") return [...this.store.survivors];
      if (this.store.tab === "killer") return [...this.store.killers];
      return this.store.allCharacters;
    },
    visibleIds(): Set<string> {
      return new Set(this.visibleChars.map((c) => c.id));
    },
    tierMap(): Record<string, string[]> {
      const m: Record<string, string[]> = {};
      for (const t of this.tiers) m[t] = [];
      for (const [id, t] of Object.entries(this.tierData)) {
        if (m[t] && this.visibleIds.has(id)) m[t].push(id);
      }
      return m;
    },
    ranked(): Set<string> {
      const s = new Set<string>();
      for (const [id, t] of Object.entries(this.tierData)) {
        if (this.visibleIds.has(id) && t) s.add(id);
      }
      return s;
    },
    unranked() {
      return this.visibleChars.filter((c) => !this.ranked.has(c.id));
    },
  },
  methods: {
    charName(id: string): string {
      return this.store.allCharacters.find((c) => c.id === id)?.name ?? id;
    },
    charImg(id: string): string {
      return this.store.allCharacters.find((c) => c.id === id)?.img ?? "";
    },
    onDragStart(e: DragEvent, id: string): void {
      e.dataTransfer?.setData("text/plain", id);
    },
    onDrop(e: DragEvent, tier: string): void {
      const id = e.dataTransfer?.getData("text/plain");
      if (!id) return;
      // Reassign entire object to trigger Vue reactivity
      const updated = { ...this.tierData };
      if (tier) {
        updated[id] = tier as TierLabel;
      } else {
        delete updated[id];
      }
      this.tierData = updated;
      StorageService.set(TIER_KEY, this.tierData);
    },
  },
});
</script>
