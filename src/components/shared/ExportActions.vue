<template>
  <div class="grid grid-cols-2 gap-1.5">
    <button class="export-btn" :style="btnStyle" @click="$emit('export-json')">📦 JSON</button>
    <button class="export-btn" :style="btnStyle" @click="$emit('import-json')">📂 Import</button>
    <button class="export-btn" :style="btnStyle" @click="$emit('export-stat-card')">📊 Stat Card</button>
    <button class="export-btn" :style="btnStyle" @click="$emit('share-link')">🔗 Teilen</button>
    <button class="export-btn col-span-2" :style="btnStyle" @click="$emit('copy-clipboard')">📋 Text kopieren</button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ExportActions',
  props: {
    compact: { type: Boolean, default: false },
  },
  emits: ['export-json', 'import-json', 'export-stat-card', 'share-link', 'copy-clipboard'],
  computed: {
    btnStyle(): string | undefined {
      return this.compact ? 'padding: 14px 8px; font-size: 14px;' : undefined;
    },
  },
});
</script>
