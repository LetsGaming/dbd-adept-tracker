<template>
  <AppModal :is-open="!!perkName" :title="perkName" :title-color="color" @close="$emit('close')">
    <div v-if="loading" class="text-center py-8 text-[var(--color-text-muted)]">
      <span class="animate-spin inline-block text-xl">⟳</span> Lade…
    </div>
    <template v-else-if="data">
      <!-- Tier legend -->
      <div class="flex gap-2 mb-4 flex-wrap">
        <span
          v-for="(label, i) in tierLabels"
          :key="i"
          class="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-bold font-display"
          :style="{ background: TIER_BG[i], borderColor: TIER_COLORS[i] + '55', color: TIER_COLORS[i] }"
        >
          <span class="w-2 h-2 rounded-full" :style="{ background: TIER_COLORS[i] }"></span>
          {{ label }}
        </span>
      </div>

      <!-- Description -->
      <div
        class="rounded-xl p-4 mb-4 text-[15px] leading-[1.9]"
        :style="{ background: color + '0c', border: '1px solid ' + color + '33' }"
        v-html="renderedDesc"
      />

      <!-- Quote -->
      <div v-if="data.quote" class="border-l-2 pl-4 mb-4" :style="{ borderColor: color + '55' }">
        <p class="text-[var(--color-text-secondary)] text-sm italic leading-relaxed">"{{ data.quote }}"</p>
      </div>
    </template>
  </AppModal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PerkData } from '@/types';
import { PerkService } from '@/services';
import { perkColor } from '@/composables';
import { escapeHtml } from '@/utils/format';
import AppModal from '@/components/shared/AppModal.vue';

const TIER_COLORS = ['var(--tier-1, #94a3b8)', 'var(--tier-2, #4ade80)', 'var(--tier-3, #d8b4fe)'];
const TIER_BG = ['#94a3b818', '#4ade8018', '#d8b4fe18'];

export default defineComponent({
  name: 'PerkModal',
  components: { AppModal },
  props: {
    perkName: { type: String, default: '' },
  },
  emits: ['close'],
  data() {
    return {
      data: null as PerkData | null,
      loading: false,
      TIER_COLORS,
      TIER_BG,
      tierLabels: ['Tier I', 'Tier II', 'Tier III'],
    };
  },
  computed: {
    color(): string {
      return this.perkName ? perkColor(this.perkName) : '#fff';
    },
    renderedDesc(): string {
      if (!this.data) return '';
      const desc = this.data.desc;
      const tunables = this.data.tunables;
      let html = '';
      let cur = 0;
      const re = /\{(\d+)\}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(desc)) !== null) {
        html += escapeHtml(desc.slice(cur, m.index));
        const vals = tunables[parseInt(m[1], 10)] ?? [];
        html += vals.map((x, i) =>
          `<span style="display:inline-flex;align-items:center;border-radius:5px;padding:2px 7px;font-size:12px;font-weight:700;white-space:nowrap;margin:0 2px;border:1px solid ${TIER_COLORS[i]}55;background:${TIER_BG[i]};color:${TIER_COLORS[i]}">${escapeHtml(x)}</span>`,
        ).join('');
        cur = m.index + m[0].length;
      }
      html += escapeHtml(desc.slice(cur));
      return html;
    },
  },
  watch: {
    async perkName(name: string): Promise<void> {
      if (!name) { this.data = null; return; }
      this.loading = true;
      this.data = await PerkService.get(name);
      this.loading = false;
    },
  },
});
</script>
