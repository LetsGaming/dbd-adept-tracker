<template>
  <ion-app>
    <div
      class="min-h-screen flex flex-col"
      style="background: var(--color-bg-base); color: var(--color-text-primary)"
    >
      <AppHeader />

      <!-- ═══ BODY ═══ -->
      <div class="flex-1 overflow-y-auto">
        <div
          class="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-0 lg:gap-7 px-0 lg:px-6 pb-32 pt-4"
        >
          <AppSidebar
            @random-pick="onRandomPick"
            @undo="onUndo"
            @export-json="exp.exportJSON"
            @import-json="exp.importJSON"
            @export-stat-card="exp.exportStatCard"
            @share-link="exp.shareLink"
            @steam-sync="sync.doSync"
            @steam-force-sync="sync.doForceSync"
            @exit-share="exitShare"
          />

          <main class="min-w-0">
            <router-view />
          </main>
        </div>
      </div>

      <AppBottomNav
        @navigate="navigateTo"
        @open-settings="settingsOpen = true"
      />

      <SettingsModal
        :is-open="settingsOpen"
        @close="settingsOpen = false"
        @steam-sync="sync.doSync"
        @steam-force-sync="sync.doForceSync"
        @export-json="exp.exportJSON"
        @import-json="exp.importJSON"
        @export-stat-card="exp.exportStatCard"
        @share-link="exp.shareLink"
      />
    </div>
  </ion-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { IonApp } from '@ionic/vue';
import { useProgressStore, useSettingsStore } from '@/stores';
import { StorageService } from '@/services';
import { showToast, useSteamSync, useExport } from '@/composables';
import type { PageId } from '@/types';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppBottomNav from '@/components/layout/AppBottomNav.vue';
import SettingsModal from '@/components/layout/SettingsModal.vue';
import router from '@/router';

export default defineComponent({
  name: 'App',
  components: { IonApp, AppHeader, AppSidebar, AppBottomNav, SettingsModal },

  setup() {
    const sync = useSteamSync();
    const exp = useExport();
    return { sync, exp };
  },

  data() {
    return {
      settingsOpen: false,
    };
  },

  computed: {
    store() {
      return useProgressStore();
    },
    settings() {
      return useSettingsStore();
    },
  },

  mounted() {
    this.settings.initTheme();
    StorageService.cachePurge();

    this.store.loadRoster().catch((e) => console.warn('loadRoster failed:', e));

    // Handle share link
    const hash = location.hash;
    if (hash.startsWith('#share=')) {
      this.store.loadShareData(hash.slice(7));
    }

    // Auto steam sync
    this.sync.startAutoSync();

    // Sync route with persisted page
    if (router.currentRoute.value.name !== this.store.page) {
      router.replace({ name: this.store.page });
    }
  },

  methods: {
    navigateTo(page: PageId): void {
      this.store.setPage(page);
      router.push({ name: page });
    },

    async onRandomPick(): Promise<void> {
      const pick = this.store.randomPick();
      if (!pick) {
        await showToast('Alle Adepts in dieser Kategorie geschafft! 🏆');
        return;
      }
      await router.push({ name: 'tracker' });
      // QoL: scroll to the randomly picked character after navigation.
      this.$nextTick(() => {
        requestAnimationFrame(() => {
          document
            .querySelector(`[data-char-id="${pick.id}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });
      await showToast(`🎲 ${pick.name}`);
    },

    async onUndo(): Promise<void> {
      if (this.store.undo()) await showToast('↩ Rückgängig');
      else await showToast('Nichts rückgängig');
    },

    exitShare(): void {
      this.store.exitSharedView();
      history.replaceState(null, '', location.pathname);
      showToast('↩ Zurück zu deinem Fortschritt');
    },
  },
});
</script>

<style>
.sidebar-btn {
  width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--color-border-subtle);
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  transition: all 0.15s;
  cursor: pointer;
}
.sidebar-btn:hover {
  border-color: var(--color-border-medium);
  color: var(--color-text-primary);
}
.sidebar-btn-active {
  background: color-mix(in srgb, var(--color-accent) 10%, transparent) !important;
  border-color: color-mix(in srgb, var(--color-accent) 25%, transparent) !important;
  color: var(--color-accent) !important;
}
.export-btn {
  padding: 8px 6px;
  border-radius: 8px;
  border: 1px solid var(--color-border-subtle);
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  width: 100%;
  transition: all 0.15s;
  cursor: pointer;
}
.export-btn:hover {
  border-color: color-mix(in srgb, var(--color-accent) 25%, transparent);
  color: var(--color-accent);
}
.font-display {
  font-family: 'Cinzel', serif;
}
</style>
