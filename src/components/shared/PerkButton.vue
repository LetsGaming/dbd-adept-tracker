<template>
  <button
    class="flex-1 rounded-xl border px-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wide text-center min-h-[48px] leading-tight transition-all active:scale-[0.97]"
    :style="{
      borderColor: color + '44',
      color: color,
      background: color + '12',
    }"
    @click="$emit('open', name)"
  >
    {{ shortName }}
  </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { perkColor, perkShortName } from '@/composables';

export default defineComponent({
  name: 'PerkButton',
  props: {
    name: { type: String, required: true },
  },
  emits: ['open'],
  computed: {
    color(): string {
      return perkColor(this.name);
    },
    shortName(): string {
      return perkShortName(this.name);
    },
  },
});
</script>
