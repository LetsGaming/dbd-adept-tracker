<template>
  <div class="max-w-[1200px] mx-auto px-4 pb-24 pt-4">
    <!-- Summary cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
      <StatCard
        v-for="card in summaryCards"
        :key="card.label"
        :value="card.value"
        :label="card.label"
        :color="card.color"
      />
    </div>

    <!-- Table -->
    <div class="rounded-xl border border-[var(--color-border-subtle)] overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th class="table-header-cell w-11"></th>
            <th
              v-for="col in COLUMNS"
              :key="col.key"
              class="table-header-cell cursor-pointer select-none whitespace-nowrap"
              @click="store.toggleSort(col.key)"
            >
              {{ col.label }}
              <span class="opacity-50 text-[10px]">{{ store.sortIcon(col.key) }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in sortedRows"
            :key="row.id"
            class="border-b border-[var(--color-border-subtle)] last:border-b-0 transition-colors hover:bg-[var(--color-bg-elevated)]"
            :class="{
              'bg-[var(--color-done-bg)]': row.done,
              'border-l-[3px] border-l-amber-400': row.priority,
            }"
          >
            <td class="px-3 py-2 w-11">
              <Portrait
                :img-file="row.img"
                :done="row.done"
                :is-killer="row.side === 'killer'"
                size="sm"
              />
            </td>
            <td class="px-3 py-2.5 min-w-[140px]">
              <div
                class="font-bold font-display text-[13px]"
                :class="row.done ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'"
              >
                {{ row.priority ? '⭐ ' : '' }}{{ row.name }}
              </div>
              <div class="text-[11px] text-[var(--color-text-muted)] mt-0.5">{{ row.role }}</div>
            </td>
            <td class="px-3 py-2.5 text-center">
              <span
                class="text-[13px] font-semibold"
                :style="{ color: row.side === 'survivor' ? 'var(--color-survivor)' : 'var(--color-killer)' }"
              >{{ row.side === 'survivor' ? '👤' : '💀' }}</span>
            </td>
            <td class="px-3 py-2.5 text-center">
              <span
                class="font-black font-display text-base"
                :class="
                  row.tries > 0
                    ? row.done ? 'text-[var(--color-accent)]' : 'text-orange-400'
                    : 'text-[var(--color-text-faint)]'"
              >{{ row.tries }}</span>
            </td>
            <td class="px-3 py-2.5 text-center text-xs text-[var(--color-text-muted)]">
              {{ row.done && row.doneAt ? fmtDate(row.doneAt) : '—' }}
            </td>
            <td class="px-3 py-2.5 text-center">
              <span
                v-if="row.done"
                class="rounded-md border px-2.5 py-1 text-xs font-bold"
                style="background: var(--color-accent, #22d3ee)18; border-color: var(--color-accent, #22d3ee)40; color: var(--color-accent, #22d3ee);"
              >✓</span>
              <button
                v-else-if="!store.readOnly"
                class="rounded-md border border-dashed border-[var(--color-border-medium)] text-[var(--color-text-muted)] text-xs px-2 py-1 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] min-h-[32px] min-w-[32px]"
                @click="store.toggleDone(row.id)"
              >+</button>
              <span v-else>—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useProgressStore } from '@/stores';
import type { StatsSortCol } from '@/types';
import Portrait from '@/components/shared/Portrait.vue';
import StatCard from '@/components/shared/StatCard.vue';

interface StatsRow {
  id: string;
  name: string;
  role: string;
  img: string;
  side: 'survivor' | 'killer';
  done: boolean;
  doneAt: number | null;
  tries: number;
  priority: boolean;
}

const COLUMNS: { key: StatsSortCol; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'side', label: 'Seite' },
  { key: 'tries', label: 'Tries' },
  { key: 'doneAt', label: 'Datum' },
  { key: 'status', label: 'Status' },
];

const store = useProgressStore();

const allRows = computed<StatsRow[]>(() => {
  const survivors =
    store.tab === 'killer'
      ? []
      : store.survivors.map((c) => ({
          ...c,
          ...store.getProgress(c.id),
          side: 'survivor' as const,
        }));
  const killers =
    store.tab === 'survivor'
      ? []
      : store.killers.map((c) => ({
          ...c,
          ...store.getProgress(c.id),
          side: 'killer' as const,
        }));
  return [...survivors, ...killers];
});

const sortedRows = computed<StatsRow[]>(() => {
  const dir = store.statsSortDir === 'asc' ? 1 : -1;
  const fns: Record<string, (a: StatsRow, b: StatsRow) => number> = {
    name: (a, b) => dir * a.name.localeCompare(b.name),
    side: (a, b) => dir * a.side.localeCompare(b.side),
    tries: (a, b) => dir * (a.tries - b.tries),
    doneAt: (a, b) => dir * ((a.doneAt ?? 0) - (b.doneAt ?? 0)),
    status: (a, b) => dir * ((a.done ? 1 : 0) - (b.done ? 1 : 0)),
  };
  return [...allRows.value].sort(fns[store.statsSort] ?? fns.name);
});

const summaryCards = computed(() => {
  const rows = allRows.value;
  const total = rows.length;
  const done = rows.filter((r) => r.done).length;
  const inProgress = rows.filter((r) => r.tries > 0 && !r.done).length;
  const totalTries = rows.reduce((s, r) => s + r.tries, 0);
  return [
    { value: done, label: 'Adepts', color: 'var(--color-accent)' },
    { value: inProgress, label: 'In Arbeit', color: '#fb923c' },
    { value: total - done, label: 'Offen', color: 'var(--color-text-primary)' },
    { value: totalTries, label: 'Versuche', color: 'var(--color-text-secondary)' },
  ];
});

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('de-DE');
}
</script>

<style scoped>
.table-header-cell {
  padding: 12px;
  text-align: center;
  font-size: 11px;
  font-family: 'Cinzel', serif;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  background: var(--color-bg-raised);
  border-bottom: 1px solid var(--color-border-subtle);
}
</style>
