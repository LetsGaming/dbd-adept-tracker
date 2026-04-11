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
      @toggle-done="store.toggleDone($event)"
      @add-try="(id: string, d: number) => store.addTry(id, d)"
      @open-perk="openPerkName = $event"
      @toggle-priority="store.togglePriority($event)"
      @toggle-owned="store.toggleOwned($event)"
      @update-note="(id: string, n: string) => store.setNote(id, n)"
    />

    <div
      v-if="!store.filteredCharacters.length"
      class="text-center py-12 text-[var(--color-text-muted)]"
    >
      Keine Charaktere gefunden.
    </div>

    <PerkModal :perk-name="openPerkName" @close="openPerkName = ''" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useProgressStore } from '@/stores';
import CharacterRow from '@/components/character/CharacterRow.vue';
import PerkModal from '@/components/modals/PerkModal.vue';
import SearchBar from '@/components/shared/SearchBar.vue';

const store = useProgressStore();
const openPerkName = ref('');

function onToggle(id: string): void {
  store.activeId = store.activeId === id ? null : id;
  if (store.activeId) {
    // Wait for the expanded panel to render before scrolling.
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-char-id="${id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
}
</script>
