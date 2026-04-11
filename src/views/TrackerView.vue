<template>
  <div class="max-w-[1200px] mx-auto px-4 pb-24 pt-2">
    <SearchBar
      :search="store.search"
      :filter="store.filter"
      @update:search="store.setSearch($event)"
      @update:filter="store.setFilter($event)"
    />

    <div class="text-center text-xs tracking-wider text-[var(--color-text-muted)] uppercase mb-3.5">
      {{ store.filteredCharacters.length }}
      Charakter{{ store.filteredCharacters.length !== 1 ? 'e' : '' }}
    </div>

    <CharacterRow
      v-for="ch in store.filteredCharacters"
      :key="ch.id"
      :character="ch"
      :is-active="store.activeId === ch.id"
      :is-killer="store.isKiller(ch.id)"
      :read-only="store.readOnly"
      @toggle="onToggle"
      @toggle-done="onToggleDone"
      @add-try="(id, d) => store.addTry(id, d)"
      @open-perk="openPerkName = $event"
      @toggle-priority="store.togglePriority($event)"
      @toggle-owned="store.toggleOwned($event)"
      @update-note="(id, n) => store.setNote(id, n)"
      @set-difficulty="(id, d) => store.setDifficulty(id, d)"
      @save-build="(id, b) => store.saveBuild(id, b)"
    />

    <div
      v-if="!store.filteredCharacters.length"
      class="text-center py-12 text-[var(--color-text-muted)]"
    >
      Keine Charaktere gefunden.
    </div>

    <PerkModal :perk-name="openPerkName" @close="openPerkName = ''" />

    <!-- Difficulty prompt modal -->
    <AppModal
      :is-open="!!difficultyCharId"
      title="Schwierigkeit bewerten"
      @close="skipDifficulty"
    >
      <div v-if="difficultyChar" class="text-center py-2" style="color: var(--color-text-primary)">
        <div class="font-display font-bold text-lg mb-4">{{ difficultyChar.name }}</div>
        <p class="text-sm text-[var(--color-text-muted)] mb-5">Wie schwer war der Adept?</p>
        <div class="flex gap-2 justify-center flex-wrap">
          <button
            v-for="d in difficultyOptions"
            :key="d.value"
            class="rounded-xl border px-4 py-3 text-sm font-bold transition-all cursor-pointer min-w-[80px]"
            :style="{
              borderColor: d.color + '55',
              color: d.color,
              background: d.color + '15',
            }"
            @click="rateDifficulty(d.value)"
          >
            {{ d.label }}
          </button>
        </div>
        <button
          class="mt-4 text-xs text-[var(--color-text-muted)] underline cursor-pointer"
          @click="skipDifficulty"
        >Überspringen</button>
      </div>
    </AppModal>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useProgressStore } from '@/stores';
import { useKeyboard } from '@/composables/useKeyboard';
import { showToast } from '@/composables/useToast';
import { Difficulty } from '@/types';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '@/data';
import CharacterRow from '@/components/character/CharacterRow.vue';
import PerkModal from '@/components/modals/PerkModal.vue';
import SearchBar from '@/components/shared/SearchBar.vue';
import AppModal from '@/components/shared/AppModal.vue';

const UNDO_WINDOW_MS = 5000;

export default defineComponent({
  name: 'TrackerView',
  components: { CharacterRow, PerkModal, SearchBar, AppModal },

  setup() {
    useKeyboard();
  },

  data() {
    return {
      openPerkName: '',
      difficultyCharId: null as string | null,
      undoTimer: null as ReturnType<typeof setTimeout> | null,
    };
  },

  computed: {
    store() {
      return useProgressStore();
    },
    difficultyChar() {
      if (!this.difficultyCharId) return null;
      return this.store.allCharacters.find((c) => c.id === this.difficultyCharId) ?? null;
    },
    difficultyOptions() {
      return Object.values(Difficulty)
        .filter((v): v is number => typeof v === 'number')
        .map((v) => ({
          value: v as Difficulty,
          label: DIFFICULTY_LABELS[v],
          color: DIFFICULTY_COLORS[v],
        }));
    },
  },

  methods: {
    onToggle(id: string): void {
      const wasActive = this.store.activeId === id;
      this.store.activeId = wasActive ? null : id;
      if (!wasActive) {
        this.store.touchCharacter(id);
        requestAnimationFrame(() => {
          document
            .querySelector(`[data-char-id="${id}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
    },

    async onToggleDone(id: string): Promise<void> {
      const prev = this.store.getProgress(id);

      if (prev.done) {
        // Unmarking — show undo window toast instead of instant unmark
        const charName = this.store.allCharacters.find((c) => c.id === id)?.name ?? id;
        this.store.toggleDone(id);
        await showToast(`↩ "${charName}" nicht mehr erledigt — Rückgängig über ↩ Button`, UNDO_WINDOW_MS);
        return;
      }

      // Marking done
      const result = this.store.toggleDone(id);
      if (result === 'marked') {
        // Check for milestone
        const milestone = this.store.consumeMilestone();
        if (milestone) {
          await showToast(milestone, 4000);
        } else {
          await showToast('✓ Adept geschafft!');
        }

        // Prompt for difficulty rating
        const promptId = this.store.consumeDifficultyPrompt();
        if (promptId) {
          this.difficultyCharId = promptId;
        }
      }
    },

    rateDifficulty(d: Difficulty): void {
      if (this.difficultyCharId) {
        this.store.setDifficulty(this.difficultyCharId, d);
      }
      this.difficultyCharId = null;
    },

    skipDifficulty(): void {
      this.difficultyCharId = null;
    },
  },
});
</script>
