<template>
  <AppModal
    :is-open="isOpen"
    title="⚙ Einstellungen"
    @close="$emit('close')"
  >
    <div style="color: var(--color-text-primary)">
      <!-- Theme -->
      <div class="mb-8">
        <SectionLabel class="mb-4">Theme</SectionLabel>
        <div class="flex gap-3">
          <button
            v-for="t in themeOptions"
            :key="t.id"
            class="flex-1 min-w-[80px] py-4 rounded-xl border text-base font-semibold cursor-pointer transition-all"
            :style="{
              borderColor:
                settings.theme === t.id
                  ? 'var(--color-accent)'
                  : 'var(--color-border-subtle)',
              background:
                settings.theme === t.id
                  ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                  : 'var(--color-bg-elevated)',
              color:
                settings.theme === t.id
                  ? 'var(--color-accent)'
                  : 'var(--color-text-secondary)',
            }"
            @click="settings.setTheme(t.id)"
          >
            {{ t.label }}
          </button>
        </div>
      </div>

      <!-- Vim mode -->
      <div class="mb-8">
        <SectionLabel class="mb-4">Navigation</SectionLabel>
        <label
          class="flex items-center gap-3 text-base cursor-pointer rounded-xl border p-4"
          style="
            border-color: var(--color-border-subtle);
            background: var(--color-bg-elevated);
            color: var(--color-text-secondary);
          "
        >
          <input
            type="checkbox"
            :checked="settings.settings.vimMode"
            class="w-5 h-5 accent-[var(--color-accent)]"
            @change="settings.toggleVim()"
          />
          <div>
            <div>Vim-Modus</div>
            <div
              class="text-sm mt-0.5"
              style="color: var(--color-text-muted)"
            >
              j/k navigieren, x erledigt, t +try, p priorität, Esc schließen
            </div>
          </div>
        </label>
      </div>

      <!-- System theme -->
      <div class="mb-8">
        <SectionLabel class="mb-4">Darstellung</SectionLabel>
        <label
          class="flex items-center gap-3 text-base cursor-pointer rounded-xl border p-4"
          style="
            border-color: var(--color-border-subtle);
            background: var(--color-bg-elevated);
            color: var(--color-text-secondary);
          "
        >
          <input
            type="checkbox"
            :checked="settings.settings.useSystemTheme"
            class="w-5 h-5 accent-[var(--color-accent)]"
            @change="settings.toggleSystemTheme()"
          />
          <div>
            <div>System-Theme</div>
            <div
              class="text-sm mt-0.5"
              style="color: var(--color-text-muted)"
            >
              Dark/Light automatisch nach Betriebssystem
            </div>
          </div>
        </label>
      </div>

      <!-- Steam (mobile) -->
      <div class="lg:hidden mb-8">
        <SectionLabel class="mb-4">Steam</SectionLabel>
        <SteamWidget @sync="$emit('steam-sync')" @force-sync="$emit('steam-force-sync')" />
      </div>

      <!-- Export (mobile) -->
      <div class="lg:hidden mb-8">
        <SectionLabel class="mb-4">Export / Tools</SectionLabel>
        <ExportActions
          :compact="true"
          @export-json="$emit('export-json')"
          @import-json="$emit('import-json')"
          @export-stat-card="$emit('export-stat-card')"
          @share-link="$emit('share-link')"
          @copy-clipboard="$emit('copy-clipboard')"
        />
      </div>
    </div>
  </AppModal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { ThemeId } from '@/types';
import { useSettingsStore } from '@/stores';
import AppModal from '@/components/shared/AppModal.vue';
import SectionLabel from '@/components/shared/SectionLabel.vue';
import ExportActions from '@/components/shared/ExportActions.vue';
import SteamWidget from '@/components/steam/SteamWidget.vue';

export default defineComponent({
  name: 'SettingsModal',
  components: { AppModal, SectionLabel, ExportActions, SteamWidget },
  props: {
    isOpen: { type: Boolean, default: false },
  },
  emits: [
    'close',
    'steam-sync',
    'steam-force-sync',
    'export-json',
    'import-json',
    'export-stat-card',
    'share-link',
    'copy-clipboard',
  ],

  data() {
    return {
      themeOptions: [
        { id: ThemeId.Dark, label: '🌙 Dark' },
        { id: ThemeId.Light, label: '☀️ Light' },
        { id: ThemeId.Oled, label: '⚫ OLED' },
      ] as const,
    };
  },

  computed: {
    settings() {
      return useSettingsStore();
    },
  },
});
</script>
