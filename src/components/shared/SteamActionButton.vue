<template>
  <button
    class="rounded-md border border-[#2a475e] text-[#8f98a0] text-[11px] px-3 py-1.5 font-semibold min-h-[36px]"
    :class="hoverClass"
    :title="title"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'SteamActionButton',
  props: {
    title: { type: String, default: '' },
    danger: { type: Boolean, default: false },
  },
  emits: ['click'],
  computed: {
    hoverClass(): string {
      return this.danger
        ? 'hover:border-red-400 hover:text-red-400'
        : 'hover:border-[#66c0f4] hover:text-[#66c0f4]';
    },
  },
});
</script>
