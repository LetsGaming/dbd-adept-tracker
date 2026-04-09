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
      @error="loaded = false"
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
      if (!this.imgFile) return;
      // Full URL already (e.g. from wiki fetch) — use as-is
      if (this.imgFile.startsWith("http")) {
        this.url = this.imgFile;
        return;
      }
      // Filename — construct the wiki.gg CDN URL directly
      this.url = `${WIKI_CDN}${this.imgFile}`;
    },
  },
});
</script>
