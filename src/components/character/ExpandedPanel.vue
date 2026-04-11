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
      <div class="flex gap-1.5">
        <button
          v-if="!readOnly"
          class="rounded-lg border px-2.5 py-1 text-base transition-all"
          :class="progress.owned
            ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/25 text-[var(--color-accent)]'
            : 'bg-[var(--color-bg-elevated)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)]'"
          title="Besitzt"
          @click="$emit('toggle-owned')"
        >{{ progress.owned ? '🎮' : '🚫' }}</button>
        <button
          v-if="!readOnly"
          class="rounded-lg border px-2.5 py-1 text-base transition-all"
          :class="progress.priority
            ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/25 text-[var(--color-accent)]'
            : 'bg-[var(--color-bg-elevated)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)]'"
          @click="$emit('toggle-priority')"
        >{{ progress.priority ? '⭐' : '☆' }}</button>
      </div>
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
        {{ fmtTime(elapsed) }}
      </span>
      <button
        class="rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-all min-h-[36px]"
        :class="running
          ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] text-[var(--color-accent)]'
          : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'"
        @click="running ? stop() : start()"
      >{{ running ? '⏸ Stop' : '▶ Start' }}</button>
      <button
        class="rounded-lg border border-[var(--color-border-subtle)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] min-h-[36px]"
        @click="reset()"
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

    <!-- Done date + difficulty -->
    <div v-if="progress.doneAt" class="flex items-center justify-between mt-2">
      <div v-if="progress.difficulty" class="flex items-center gap-1.5 text-xs">
        <span
          class="rounded-md border px-2 py-0.5 font-bold"
          :style="{ borderColor: diffColor + '55', color: diffColor, background: diffColor + '15' }"
        >{{ diffLabel }}</span>
      </div>
      <div class="text-[11px] text-[var(--color-text-muted)] text-right">
        ✓ {{ formatDateTime(progress.doneAt) }}
      </div>
    </div>

    <!-- Build planner -->
    <div v-if="!readOnly" class="mt-2.5">
      <BuildPlanner
        :character="character"
        :current-build="progress.build"
        :is-killer="isKiller"
        @save-build="(b) => $emit('save-build', b)"
      />
    </div>
    <div v-else-if="progress.build?.item || progress.build?.addon1 || progress.build?.offering" class="mt-2.5">
      <SectionLabel class="mb-2">Build</SectionLabel>
      <div class="text-xs text-[var(--color-text-secondary)]">
        {{ [progress.build.item, progress.build.addon1, progress.build.addon2, progress.build.offering].filter(Boolean).join(' · ') }}
      </div>
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
        <span>{{ formatDateTime(a.ts) }}</span>
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
import { WIN_CONDITIONS, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '@/data';
import { useTimer } from '@/composables/useTimer';
import { formatDateTime } from '@/utils/format';
import PerkButton from '@/components/shared/PerkButton.vue';
import SectionLabel from '@/components/shared/SectionLabel.vue';
import BuildPlanner from '@/components/character/BuildPlanner.vue';

const NOTE_DEBOUNCE_MS = 400;

export default defineComponent({
  name: 'ExpandedPanel',
  components: { PerkButton, SectionLabel, BuildPlanner },
  props: {
    character: { type: Object as PropType<Character>, required: true },
    progress: { type: Object as PropType<CharacterProgress>, required: true },
    isKiller: { type: Boolean, required: true },
    readOnly: { type: Boolean, required: true },
  },
  emits: ['toggle-done', 'add-try', 'open-perk', 'toggle-priority', 'toggle-owned', 'update-note', 'set-difficulty', 'save-build'],

  setup(props) {
    const { elapsed, running, start, stop, reset, fmtTime } = useTimer(props.character.id);
    return { elapsed, running, start, stop, reset, fmtTime };
  },

  data() {
    return {
      noteTimer: null as ReturnType<typeof setTimeout> | null,
    };
  },

  computed: {
    winCondition(): string {
      return this.isKiller ? WIN_CONDITIONS.killer : WIN_CONDITIONS.survivor;
    },
    recentAttempts() {
      return this.progress.attempts.slice(-5).reverse();
    },
    diffLabel(): string {
      return this.progress.difficulty ? DIFFICULTY_LABELS[this.progress.difficulty] ?? '' : '';
    },
    diffColor(): string {
      return this.progress.difficulty ? DIFFICULTY_COLORS[this.progress.difficulty] ?? '#888' : '#888';
    },
  },

  beforeUnmount() {
    this.stop();
    if (this.noteTimer) clearTimeout(this.noteTimer);
  },

  methods: {
    formatDateTime,

    onNote(e: Event): void {
      const val = (e.target as HTMLTextAreaElement).value;
      if (this.noteTimer) clearTimeout(this.noteTimer);
      this.noteTimer = setTimeout(() => this.$emit('update-note', val), NOTE_DEBOUNCE_MS);
    },
  },
});
</script>


