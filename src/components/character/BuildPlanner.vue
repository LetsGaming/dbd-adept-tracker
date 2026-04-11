<template>
  <div>
    <SectionLabel class="mb-2">Build</SectionLabel>

    <!-- Item (survivors only) -->
    <div v-if="!isKiller" class="mb-1.5">
      <div class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Item</div>
      <SearchSelect
        :model-value="build.item"
        :options="itemOptions"
        placeholder="Item wählen…"
        @update:model-value="onChange('item', $event)"
      />
    </div>

    <!-- Add-ons -->
    <div class="grid grid-cols-2 gap-1.5 mb-1.5">
      <div>
        <div class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Add-on 1</div>
        <SearchSelect
          :model-value="build.addon1"
          :options="addonOptions"
          :loading="addonsLoading"
          placeholder="Add-on…"
          @update:model-value="onChange('addon1', $event)"
        />
      </div>
      <div>
        <div class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Add-on 2</div>
        <SearchSelect
          :model-value="build.addon2"
          :options="addonOptions"
          :loading="addonsLoading"
          placeholder="Add-on…"
          @update:model-value="onChange('addon2', $event)"
        />
      </div>
    </div>

    <!-- Offering -->
    <div>
      <div class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Offering</div>
      <SearchSelect
        :model-value="build.offering"
        :options="offeringOptions"
        placeholder="Offering wählen…"
        @update:model-value="onChange('offering', $event)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { Build, Character } from '@/types';
import type { BuildOption } from '@/data/build-seed';
import { SURVIVOR_ITEMS, OFFERINGS } from '@/data/build-seed';
import { BuildDataService } from '@/services/buildData';
import SearchSelect from '@/components/shared/SearchSelect.vue';
import SectionLabel from '@/components/shared/SectionLabel.vue';

const EMPTY_BUILD: Build = { item: '', addon1: '', addon2: '', offering: '' };

export default defineComponent({
  name: 'BuildPlanner',
  components: { SearchSelect, SectionLabel },
  props: {
    character: { type: Object as PropType<Character>, required: true },
    currentBuild: { type: Object as PropType<Build | null>, default: null },
    isKiller: { type: Boolean, required: true },
  },
  emits: ['save-build'],

  data() {
    return {
      addonOptions: [] as BuildOption[],
      addonsLoading: false,
    };
  },

  computed: {
    build(): Build {
      return this.currentBuild ?? { ...EMPTY_BUILD };
    },
    itemOptions(): BuildOption[] {
      return SURVIVOR_ITEMS;
    },
    offeringOptions(): BuildOption[] {
      return OFFERINGS;
    },
  },

  watch: {
    'character.name': {
      immediate: true,
      handler() {
        this.loadAddons();
      },
    },
  },

  methods: {
    onChange(field: keyof Build, value: string): void {
      const updated: Build = { ...this.build, [field]: value };
      this.$emit('save-build', updated);
    },

    async loadAddons(): Promise<void> {
      this.addonsLoading = true;
      try {
        this.addonOptions = await BuildDataService.getAddons(this.character.name);
      } catch {
        this.addonOptions = [];
      }
      this.addonsLoading = false;
    },
  },
});
</script>
