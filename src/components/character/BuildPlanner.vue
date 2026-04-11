<template>
  <div>
    <SectionLabel class="mb-2">Build</SectionLabel>

    <!-- Item (survivors only) -->
    <div v-if="!isKiller" class="mb-1.5">
      <div class="build-field-label">Item</div>
      <SearchSelect
        :model-value="build.item"
        :options="itemOptions"
        placeholder="Item wählen…"
        @update:model-value="onItemChange"
      />
    </div>

    <!-- Add-ons -->
    <div class="grid grid-cols-2 gap-1.5 mb-1.5">
      <div>
        <div class="build-field-label">Add-on 1</div>
        <SearchSelect
          :model-value="build.addon1"
          :options="addonOptions"
          :loading="addonsLoading"
          placeholder="Add-on…"
          @update:model-value="onChange('addon1', $event)"
        />
      </div>
      <div>
        <div class="build-field-label">Add-on 2</div>
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
      <div class="build-field-label">Offering</div>
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
        if (this.isKiller) this.loadKillerAddons();
      },
    },
  },

  mounted() {
    // Load survivor item addons if an item is already selected
    if (!this.isKiller && this.build.item) {
      this.loadItemAddons(this.build.item);
    }
  },

  methods: {
    onChange(field: keyof Build, value: string): void {
      this.$emit('save-build', { ...this.build, [field]: value });
    },

    /** When the item changes for a survivor, reload item-specific addons and clear old ones. */
    onItemChange(itemName: string): void {
      const updated: Build = { ...this.build, item: itemName, addon1: '', addon2: '' };
      this.$emit('save-build', updated);
      if (itemName) {
        this.loadItemAddons(itemName);
      } else {
        this.addonOptions = [];
      }
    },

    async loadKillerAddons(): Promise<void> {
      this.addonsLoading = true;
      try {
        this.addonOptions = await BuildDataService.getKillerAddons(this.character.name);
      } catch {
        this.addonOptions = [];
      }
      this.addonsLoading = false;
    },

    async loadItemAddons(itemName: string): Promise<void> {
      this.addonsLoading = true;
      try {
        this.addonOptions = await BuildDataService.getItemAddons(itemName);
      } catch {
        this.addonOptions = [];
      }
      this.addonsLoading = false;
    },
  },
});
</script>

<style scoped>
.build-field-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  margin-bottom: 3px;
}
</style>
