<template>
  <div
    class="relative flex items-center justify-center overflow-hidden rounded-lg shrink-0"
    :style="{
      width: sizeConfig.w,
      height: sizeConfig.h,
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: done ? 'var(--color-accent)' : 'var(--color-border-medium)',
      background: 'var(--color-bg-elevated)',
    }"
  >
    <span v-if="!loaded" class="text-2xl">{{ isKiller ? '💀' : '🧑' }}</span>
    <img
      v-if="currentUrl"
      :src="currentUrl"
      alt=""
      class="absolute inset-0 w-full h-full object-cover object-top"
      :style="{ opacity: loaded ? 1 : 0, transition: 'opacity 0.2s' }"
      @load="onLoad"
      @error="onError"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

const WIKI_CDN = 'https://deadbydaylight.wiki.gg/images/';

const SIZE_MAP = {
  sm: { w: '40px', h: '40px' },
  md: { w: '58px', h: '58px' },
  lg: { w: '50px', h: '50px' },
} as const;

/**
 * Module-level cache of imgFile → the URL that successfully loaded.
 * Shared across all Portrait instances so switching tabs does not re-fetch.
 */
const resolvedCache = new Map<string, string>();

export default defineComponent({
  name: 'PortraitImage',
  props: {
    imgFile: { type: String, default: '' },
    done: { type: Boolean, default: false },
    isKiller: { type: Boolean, default: false },
    size: {
      type: String as () => 'sm' | 'md' | 'lg',
      default: 'md',
    },
  },

  data() {
    return {
      currentUrl: null as string | null,
      fallbackUrl: null as string | null,
      loaded: false,
    };
  },

  computed: {
    sizeConfig(): { w: string; h: string } {
      return SIZE_MAP[this.size];
    },
  },

  watch: {
    imgFile() {
      this.resolve();
    },
  },

  mounted() {
    this.resolve();
  },

  methods: {
    charSelectFallback(imgFile: string): string | null {
      const prefix = imgFile.match(/^([KS]\d{2,3})/)?.[1];
      return prefix ? `${WIKI_CDN}${prefix}_charSelect_portrait.png` : null;
    },

    resolve(): void {
      if (!this.imgFile) {
        this.currentUrl = null;
        this.fallbackUrl = null;
        this.loaded = false;
        return;
      }

      const cached = resolvedCache.get(this.imgFile);
      if (cached) {
        this.currentUrl = cached;
        this.loaded = true;
        return;
      }

      this.loaded = false;

      if (this.imgFile.startsWith('http')) {
        this.currentUrl = this.imgFile;
        this.fallbackUrl = null;
        return;
      }

      this.currentUrl = `${WIKI_CDN}${this.imgFile}`;
      this.fallbackUrl = this.charSelectFallback(this.imgFile);
    },

    onLoad(): void {
      if (this.imgFile && this.currentUrl) {
        resolvedCache.set(this.imgFile, this.currentUrl);
      }
      this.loaded = true;
    },

    onError(): void {
      if (this.fallbackUrl) {
        this.currentUrl = this.fallbackUrl;
        this.fallbackUrl = null;
      } else {
        this.currentUrl = null;
        this.loaded = false;
      }
    },
  },
});
</script>
