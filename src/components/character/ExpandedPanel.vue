<template>
  <div class="px-4 pb-4 pt-0 border-t border-[var(--color-border-subtle)]">
    <!-- Win condition -->
    <div
      class="rounded-lg p-3 mt-3 mb-3 text-xs leading-relaxed text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]"
      style="background: var(--color-bg-elevated)"
      v-html="winCondition"
    />

    <!-- Perks header -->
    <div class="flex items-center justify-between mt-3 mb-2.5">
      <SectionLabel>Perks</SectionLabel>
      <button
        v-if="!readOnly"
        class="rounded-lg border px-2.5 py-1 text-base transition-all"
        :class="progress.priority
          ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/25 text-[var(--color-accent)]'
          : 'bg-[var(--color-bg-elevated)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)]'"
        @click="$emit('toggle-priority')"
      >{{ progress.priority ? '⭐' : '☆' }}</button>
    </div>

    <!-- Perk buttons -->
    <div class="flex gap-2 mb-4">
      <PerkButton
        v-for="perk in character.perks"
        :key="perk"
        :name="perk"
        @open="(n: string) => $emit('open-perk', n)"
      />
    </div>

    <!-- Timer -->
    <div
      v-if="!readOnly"
      class="flex items-center gap-2.5 mb-3 px-3.5 py-2 rounded-xl border border-[var(--color-border-subtle)]"
      style="background: var(--color-bg-elevated)"
    >
      <span class="text-xs text-[var(--color-text-muted)]">⏱</span>
      <span class="font-display text-xl font-black text-[var(--color-accent)] min-w-[80px] text-center tracking-wide">
        {{ fmtTime(timerElapsed) }}
      </span>
      <button
        class="rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-all min-h-[36px]"
        :class="timerRunning
          ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] text-[var(--color-accent)]'
          : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'"
        @click="timerRunning ? stopTimer() : startTimer()"
      >{{ timerRunning ? '⏸ Stop' : '▶ Start' }}</button>
      <button
        class="rounded-lg border border-[var(--color-border-subtle)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] min-h-[36px]"
        @click="resetTimer()"
      >↺</button>
    </div>

    <!-- Try counter + mark done -->
    <div v-if="!readOnly" class="flex gap-2.5">
      <div
        class="flex items-center flex-1 rounded-xl border border-[var(--color-border-subtle)] overflow-hidden"
        style="background: var(--color-bg-elevated)"
      >
        <button
          class="w-12 h-[50px] flex items-center justify-center text-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          @click="$emit('add-try', -1)"
        >−</button>
        <div
          class="flex-1 text-center font-black text-lg font-display"
          :class="progress.tries > 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-faint)]'"
        >{{ progress.tries }}</div>
        <button
          class="w-12 h-[50px] flex items-center justify-center text-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          @click="$emit('add-try', 1)"
        >+</button>
      </div>
      <button
        class="flex-[2] h-[50px] rounded-xl border text-xs font-bold tracking-wider font-display transition-all"
        :class="progress.done
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
          : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'"
        @click="$emit('toggle-done')"
      >{{ progress.done ? '✓ ERLEDIGT' : 'MARKIEREN' }}</button>
    </div>

    <!-- Read-only status -->
    <div
      v-else
      class="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-border-subtle)]"
      style="background: var(--color-bg-elevated)"
    >
      <span v-if="progress.done" class="text-[var(--color-accent)] font-bold text-sm">✓ Geschafft</span>
      <span v-else class="text-[var(--color-text-muted)] text-sm">Ausstehend</span>
      <span v-if="progress.tries > 0" class="text-sm">
        · <strong>{{ progress.tries }}</strong> Versuch{{ progress.tries !== 1 ? 'e' : '' }}
      </span>
    </div>

    <!-- Done date -->
    <div v-if="progress.doneAt" class="text-[11px] text-[var(--color-text-muted)] mt-2 text-right">
      ✓ {{ formatDate(progress.doneAt) }}
    </div>

    <!-- Note -->
    <div v-if="!readOnly" class="mt-2.5">
      <textarea
        class="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] text-sm p-3 resize-y outline-none focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-faint)]"
        :value="progress.note"
        placeholder="Notizen…"
        rows="2"
        @input="onNote"
      />
    </div>

    <!-- Recent attempts -->
    <div v-if="progress.attempts.length" class="mt-2.5">
      <SectionLabel class="mb-2">Letzte Versuche</SectionLabel>
      <div
        v-for="(a, i) in recentAttempts"
        :key="i"
        class="flex items-center gap-2.5 py-1.5 border-b border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] last:border-b-0"
      >
        <div class="w-1.5 h-1.5 rounded-full shrink-0" :class="a.success ? 'bg-[var(--color-accent)]' : 'bg-orange-400'" />
        <span>{{ formatDate(a.ts) }}</span>
        <span class="ml-auto font-bold" :class="a.success ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'">
          {{ a.success ? '✓' : '✗' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { Character, CharacterProgress } from '@/types';
import { WIN_CONDITIONS } from '@/data';
import PerkButton from '@/components/shared/PerkButton.vue';
import SectionLabel from '@/components/shared/SectionLabel.vue';

export default defineComponent({
  name: 'ExpandedPanel',
  components: { PerkButton, SectionLabel },
  props: {
    character: { type: Object as PropType<Character>, required: true },
    progress: { type: Object as PropType<CharacterProgress>, required: true },
    isKiller: { type: Boolean, default: false },
    readOnly: { type: Boolean, default: false },
  },
  emits: ['toggle-done', 'add-try', 'open-perk', 'toggle-priority', 'update-note'],
  data() {
    return {
      timerElapsed: 0,
      timerRunning: false,
      _timerInterval: null as ReturnType<typeof setInterval> | null,
      _timerStartedAt: 0,
      _noteTimer: null as ReturnType<typeof setTimeout> | null,
    };
  },
  computed: {
    winCondition(): string {
      return this.isKiller ? WIN_CONDITIONS.killer : WIN_CONDITIONS.survivor;
    },
    recentAttempts() {
      return this.progress.attempts.slice(-5).reverse();
    },
  },
  beforeUnmount(): void {
    this.stopTimer();
    if (this._noteTimer) clearTimeout(this._noteTimer);
  },
  methods: {
    startTimer(): void {
      if (this.timerRunning) return;
      this._timerStartedAt = Date.now();
      this._timerInterval = setInterval(() => {
        this.timerElapsed = Math.floor((Date.now() - this._timerStartedAt) / 1000);
      }, 1000);
      this.timerRunning = true;
    },
    stopTimer(): void {
      if (this._timerInterval) clearInterval(this._timerInterval);
      this._timerInterval = null;
      this.timerRunning = false;
    },
    resetTimer(): void {
      this.stopTimer();
      this.timerElapsed = 0;
    },
    fmtTime(s: number): string {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m}:${String(sec).padStart(2, '0')}`;
    },
    formatDate(ts: number): string {
      const d = new Date(ts);
      return `${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
    },
    onNote(e: Event): void {
      const val = (e.target as HTMLTextAreaElement).value;
      if (this._noteTimer) clearTimeout(this._noteTimer);
      // Debounce note saves to avoid flooding the store on every keystroke
      this._noteTimer = setTimeout(() => this.$emit('update-note', val), 400);
    },
  },
});
</script>
