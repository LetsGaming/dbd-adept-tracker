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
    <span v-if="!loaded" class="text-2xl">{{ isKiller ? "💀" : "🧑" }}</span>
    <img
      v-if="url"
      :src="url"
      alt=""
      class="absolute inset-0 w-full h-full object-cover object-top"
      :style="{ opacity: loaded ? 1 : 0, transition: 'opacity 0.2s' }"
      @load="loaded = true"
      @error="onError"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

const WIKI_CDN = "https://deadbydaylight.wiki.gg/images/";

const SIZE_MAP = {
  sm: { w: "40px", h: "40px" },
  md: { w: "58px", h: "58px" },
  lg: { w: "50px", h: "50px" },
} as const;

/**
 * Builds the fallback portrait URL using the legacy charSelect naming convention.
 * e.g. K25_TheCenobite_Portrait.png → K25_charSelect_portrait.png
 *
 * This format is confirmed present on wiki.gg for the older characters.
 * It serves as a safety net when the new _Portrait.png file hasn't been
 * uploaded to wiki.gg yet.
 */
function charSelectFallback(imgFile: string): string | null {
  const prefix = imgFile.match(/^([KS]\d{2,3})/)?.[1];
  return prefix ? `${WIKI_CDN}${prefix}_charSelect_portrait.png` : null;
}

export default defineComponent({
  name: "Portrait",
  props: {
    imgFile: { type: String, default: "" },
    done: { type: Boolean, default: false },
    isKiller: { type: Boolean, default: false },
    size: { type: String as () => "sm" | "md" | "lg", default: "md" },
  },
  data() {
    return {
      url: null as string | null,
      fallbackUrl: null as string | null,
      loaded: false,
      sizeMap: SIZE_MAP,
    };
  },
  watch: {
    imgFile(): void {
      this.loaded = false;
      this.resolve();
    },
  },
  mounted(): void {
    this.resolve();
  },
  methods: {
    resolve(): void {
      if (!this.imgFile) {
        this.url = null;
        this.fallbackUrl = null;
        return;
      }

      if (this.imgFile.startsWith("http")) {
        // Already a full URL — use directly, no fallback needed
        this.url = this.imgFile;
        this.fallbackUrl = null;
        return;
      }

      // Primary: new _Portrait.png format
      // e.g. K29_TheMastermind_Portrait.png
      this.url = `${WIKI_CDN}${this.imgFile}`;
      // Fallback: old charSelect format that wiki.gg still hosts for older characters
      // e.g. K29_charSelect_portrait.png
      this.fallbackUrl = charSelectFallback(this.imgFile);
    },

    onError(): void {
      if (this.fallbackUrl) {
        // New-format URL failed (ORB / 404) — try the legacy charSelect URL
        this.url = this.fallbackUrl;
        this.fallbackUrl = null; // only one fallback attempt
      } else {
        // Both URLs exhausted — stay hidden, emoji placeholder remains visible
        this.url = null;
        this.loaded = false;
      }
    },
  },
});
</script>
