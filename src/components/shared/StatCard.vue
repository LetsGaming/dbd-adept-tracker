<template>
  <div
    class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] p-4 text-center"
    style="box-shadow: 0 2px 12px rgba(0,0,0,0.4)"
  >
    <div
      class="text-3xl font-black font-display leading-none"
      :style="{ color }"
    >{{ value }}</div>
    <div class="text-[11px] text-[var(--color-text-muted)] mt-1.5 uppercase tracking-wider">
      {{ label }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'StatCard',
  props: {
    value: { type: [String, Number], required: true },
    label: { type: String, required: true },
    color: { type: String, default: 'var(--color-accent)' },
  },
});
</script>
