<template>
  <div class="text-[11px] tracking-[2px] uppercase text-[var(--color-text-muted)] font-display">
    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'SectionLabel',
});
</script>
