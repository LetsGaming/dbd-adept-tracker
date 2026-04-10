<template>
  <div class="grid grid-cols-2 gap-1.5">
    <button class="export-btn" :style="btnStyle" @click="emit('export-json')">📦 JSON</button>
    <button class="export-btn" :style="btnStyle" @click="emit('import-json')">📂 Import</button>
    <button class="export-btn" :style="btnStyle" @click="emit('export-stat-card')">📊 Stat Card</button>
    <button class="export-btn" :style="btnStyle" @click="emit('share-link')">🔗 Teilen</button>
  </div>
</template>

<script setup lang="ts">
/** Extra inline padding/font overrides for the mobile variant. */
const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false });

const emit = defineEmits<{
  'export-json': [];
  'import-json': [];
  'export-stat-card': [];
  'share-link': [];
}>();

const btnStyle = props.compact ? 'padding: 14px 8px; font-size: 14px;' : undefined;
</script>
