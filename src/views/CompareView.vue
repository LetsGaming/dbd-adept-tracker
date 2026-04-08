<template>
  <div class="max-w-[1200px] mx-auto px-4 pb-24 pt-4">
    <div class="font-display text-xl tracking-wide mb-4">
      🔍 Fortschritt vergleichen
    </div>

    <!-- Input section -->
    <div v-if="!compareData" class="space-y-4">
      <p class="text-[var(--color-text-muted)] text-sm leading-relaxed">
        Füge einen geteilten Link ein um deinen Fortschritt mit einer anderen
        Person zu vergleichen.
      </p>
      <div class="flex gap-2.5">
        <input
          v-model="shareInput"
          class="flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] text-sm px-3 py-2.5 outline-none focus:border-[var(--color-accent)]"
          placeholder="Share-Link hier einfügen…"
          @keyup.enter="loadCompare"
        />
        <button
          class="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] px-4 py-2 text-xs font-semibold min-h-[42px]"
          @click="loadCompare"
        >
          Laden
        </button>
      </div>
    </div>

    <!-- Results -->
    <template v-else>
      <div class="grid grid-cols-3 gap-2.5 mb-4">
        <StatCard :value="counts.onlyMe" label="Nur Du" color="#4ade80" />
        <StatCard
          :value="counts.both"
          label="Beide"
          color="var(--color-accent)"
        />
        <StatCard :value="counts.onlyThem" label="Nur Andere" color="#fb923c" />
      </div>

      <button
        class="rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] px-4 py-2 text-xs font-semibold mb-3"
        @click="compareData = null"
      >
        ✕ Vergleich beenden
      </button>

      <div
        class="max-h-[60vh] overflow-y-auto rounded-xl border border-[var(--color-border-subtle)] px-3.5 py-2"
      >
        <div
          v-for="row in compareRows"
          :key="row.id"
          class="flex items-center gap-2.5 py-1.5 border-b border-[var(--color-border-subtle)] last:border-b-0 text-sm"
        >
          <div
            class="w-2.5 h-2.5 rounded-full shrink-0"
            :style="{ background: row.color }"
          />
          <span class="flex-1">{{ row.name }}</span>
          <span class="font-bold text-xs" :style="{ color: row.color }">{{
            row.icon
          }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useProgressStore } from "@/stores";
import { showToast } from "@/composables";
import type { ProgressMap } from "@/types";
import { DEFAULT_PROGRESS } from "@/data";
import StatCard from "@/components/shared/StatCard.vue";

export default defineComponent({
  name: "CompareView",
  components: { StatCard },
  data() {
    return {
      shareInput: "",
      compareData: null as ProgressMap | null,
    };
  },
  computed: {
    store() {
      return useProgressStore();
    },
    counts() {
      if (!this.compareData) return { onlyMe: 0, both: 0, onlyThem: 0 };
      let onlyMe = 0,
        both = 0,
        onlyThem = 0;
      for (const c of this.store.allCharacters) {
        const myDone = this.store.getProgress(c.id).done;
        const theirDone = this.compareData[c.id]?.done;
        if (myDone && theirDone) both++;
        else if (myDone) onlyMe++;
        else if (theirDone) onlyThem++;
      }
      return { onlyMe, both, onlyThem };
    },
    compareRows() {
      if (!this.compareData) return [];
      return this.store.allCharacters.map((c) => {
        const myDone = this.store.getProgress(c.id).done;
        const theirDone = this.compareData![c.id]?.done;
        const color =
          myDone && theirDone
            ? "var(--color-accent)"
            : myDone
              ? "#4ade80"
              : theirDone
                ? "#fb923c"
                : "var(--color-text-faint)";
        const icon =
          myDone && theirDone
            ? "✓✓"
            : myDone
              ? "✓ ·"
              : theirDone
                ? "· ✓"
                : "· ·";
        return { id: c.id, name: c.name, color, icon };
      });
    },
  },
  methods: {
    loadCompare(): void {
      if (!this.shareInput) return;
      try {
        const raw = this.shareInput.trim();
        const encoded = raw.includes("#share=") ? raw.split("#share=")[1] : raw;
        const data = JSON.parse(atob(encoded)) as {
          p: Record<string, { d: number; t: number }>;
        };
        if (!data.p) throw new Error("Ungültige Daten");
        const progress: ProgressMap = {};
        for (const [id, v] of Object.entries(data.p)) {
          progress[id] = { ...DEFAULT_PROGRESS, done: !!v.d, tries: v.t || 0 };
        }
        this.compareData = progress;
        showToast("✓ Vergleich geladen");
      } catch {
        showToast("✗ Ungültiger Link");
      }
    },
  },
});
</script>
