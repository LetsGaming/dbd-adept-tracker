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
      @load="loaded = true"
      @error="loaded = false"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { WikiApi } from '@/services';

const SIZE_MAP = {
  sm: { w: '40px', h: '40px' },
  md: { w: '58px', h: '58px' },
  lg: { w: '50px', h: '50px' },
} as const;

const RETRY_DELAYS = [800, 3000, 8000]; // ms — three attempts then give up

export default defineComponent({
  name: 'Portrait',
  props: {
    imgFile: { type: String, default: '' },
    done: { type: Boolean, default: false },
    isKiller: { type: Boolean, default: false },
    size: { type: String as () => 'sm' | 'md' | 'lg', default: 'md' },
  },
  data() {
    return {
      url: null as string | null,
      loaded: false,
      sizeMap: SIZE_MAP,
      _retryTimers: [] as ReturnType<typeof setTimeout>[],
    };
  },
  watch: {
    imgFile(): void {
      this.loaded = false;
      this.cancelRetries();
      this.tryResolve();
    },
  },
  mounted(): void {
    this.tryResolve();
  },
  beforeUnmount(): void {
    this.cancelRetries();
  },
  methods: {
    tryResolve(): void {
      if (!this.imgFile) return;
      const cached = WikiApi.getPortraitUrl(this.imgFile);
      if (cached) {
        this.url = cached;
        return;
      }
      // Schedule limited retries — far cheaper than a continuous setInterval per component
      this.cancelRetries();
      RETRY_DELAYS.forEach((delay) => {
        const id = setTimeout(() => {
          if (!this.url) {
            const resolved = WikiApi.getPortraitUrl(this.imgFile);
            if (resolved) this.url = resolved;
          }
        }, delay);
        this._retryTimers.push(id);
      });
    },
    cancelRetries(): void {
      this._retryTimers.forEach(clearTimeout);
      this._retryTimers = [];
    },
  },
});
</script>
