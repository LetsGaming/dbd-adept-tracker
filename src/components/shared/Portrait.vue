<template>
  <div
    class="relative flex items-center justify-center overflow-hidden rounded-lg shrink-0"
    :style="{
      width: sizeMap[size].w,
      height: sizeMap[size].h,
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: done ? 'var(--color-accent)' : 'var(--color-border-medium)',
      background: 'var(--color-bg-elevated)',
    }"
  >
    <span v-if="!loaded" class="text-2xl">{{ isKiller ? '💀' : '🧑' }}</span>
    <img
      v-if="url"
      :src="url"
      alt=""
      class="absolute inset-0 w-full h-full object-cover object-top"
      :style="{ opacity: loaded ? 1 : 0, transition: 'opacity 0.2s' }"
      @load="onLoad"
      @error="onError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const WIKI_CDN = 'https://deadbydaylight.wiki.gg/images/';

const SIZE_MAP = {
  sm: { w: '40px', h: '40px' },
  md: { w: '58px', h: '58px' },
  lg: { w: '50px', h: '50px' },
} as const;

/**
 * Module-level cache of imgFile → the URL that successfully loaded.
 * Shared across all Portrait instances so switching tabs does not re-fetch
 * images that were already resolved in a previous render.
 */
const resolvedCache = new Map<string, string>();

const props = withDefaults(
  defineProps<{
    imgFile?: string;
    done?: boolean;
    isKiller?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  { imgFile: '', done: false, isKiller: false, size: 'md' },
);

const sizeMap = SIZE_MAP;
const url = ref<string | null>(null);
const fallbackUrl = ref<string | null>(null);
const loaded = ref(false);

/**
 * Builds the legacy charSelect fallback URL.
 * e.g. K25_TheCenobite_Portrait.png → K25_charSelect_portrait.png
 * Confirmed present on wiki.gg for older characters when the new format 404s.
 */
function charSelectFallback(imgFile: string): string | null {
  const prefix = imgFile.match(/^([KS]\d{2,3})/)?.[1];
  return prefix ? `${WIKI_CDN}${prefix}_charSelect_portrait.png` : null;
}

function resolve(): void {
  if (!props.imgFile) {
    url.value = null;
    fallbackUrl.value = null;
    loaded.value = false;
    return;
  }

  // Already resolved by a previous Portrait instance — skip the network round-trip.
  const cached = resolvedCache.get(props.imgFile);
  if (cached) {
    url.value = cached;
    loaded.value = true;
    return;
  }

  loaded.value = false;

  if (props.imgFile.startsWith('http')) {
    url.value = props.imgFile;
    fallbackUrl.value = null;
    return;
  }

  url.value = `${WIKI_CDN}${props.imgFile}`;
  fallbackUrl.value = charSelectFallback(props.imgFile);
}

function onLoad(): void {
  if (props.imgFile && url.value) {
    resolvedCache.set(props.imgFile, url.value);
  }
  loaded.value = true;
}

function onError(): void {
  if (fallbackUrl.value) {
    // Primary URL failed — try the legacy charSelect format.
    url.value = fallbackUrl.value;
    fallbackUrl.value = null;
  } else {
    // Both URLs exhausted — keep emoji placeholder visible.
    url.value = null;
    loaded.value = false;
  }
}

onMounted(resolve);
watch(() => props.imgFile, resolve);
</script>
