<template>
  <SteamCard
    icon="📦"
    title="DLC-BESITZ IMPORTIEREN"
    :subtitle="stepLabel"
    :total-steps="3"
    :current-step="step"
    @close="$emit('close')"
  >
    <!-- Step 1: Explain -->
    <div v-if="step === Step.Explain" class="p-6 space-y-4">
      <p class="text-sm text-[#c7d5e0] leading-relaxed">
        Steam zeigt deine besessenen DLCs nicht über die API — aber wir
        können sie über eine <strong class="text-[#66c0f4]">spezielle Steam-Seite</strong> auslesen.
        Das dauert ca. <strong class="text-[#66c0f4]">30 Sekunden</strong>.
      </p>
      <div class="space-y-3">
        <div v-for="(text, i) in explainSteps" :key="i" class="flex gap-3 items-start text-sm">
          <span class="text-[#66c0f4] mt-0.5 shrink-0 font-bold">{{ ['①','②','③'][i] }}</span>
          <span class="text-[#8f98a0]">{{ text }}</span>
        </div>
      </div>
      <div class="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-xs text-amber-300">
        <span class="shrink-0 mt-0.5">⚠</span>
        <span>Du musst im Browser bei <strong>Steam eingeloggt</strong> sein, damit die Seite funktioniert.</span>
      </div>
      <div class="flex gap-3 pt-1">
        <button class="flex-1 py-3 rounded-xl border border-[#2a475e] text-[#8f98a0] font-bold text-sm font-display" @click="$emit('close')">Abbrechen</button>
        <button class="flex-1 py-3 rounded-xl text-white font-bold text-sm font-display steam-btn-primary" @click="openAndNext">Steam-Daten öffnen →</button>
      </div>
    </div>

    <!-- Step 2: Paste -->
    <div v-else-if="step === Step.Paste" class="p-6 space-y-4">
      <div class="font-bold text-sm text-[#c7d5e0] mb-1">Daten einfügen</div>
      <p class="text-xs text-[#8f98a0] leading-relaxed">
        Wechsle zum Tab mit den Steam-Daten, drücke
        <kbd class="steam-kbd">Strg+A</kbd> und dann <kbd class="steam-kbd">Strg+C</kbd>.
        Dann hier einfügen:
      </p>
      <textarea
        ref="pasteArea"
        v-model="pastedData"
        class="w-full h-32 px-3.5 py-2.5 rounded-lg border bg-[#0a152099] text-[var(--color-text-primary)] text-xs font-mono outline-none transition-colors resize-y"
        :class="borderClass"
        placeholder="Hier einfügen (Strg+V)…"
        spellcheck="false"
        @paste="onPaste"
      />
      <div v-if="parseError" class="text-xs text-red-400">✕ {{ parseError }}</div>
      <div v-else-if="parsedCount !== null" class="text-xs text-green-400">
        ✓ {{ parsedCount }} App-IDs erkannt, davon {{ matchedDlcCount }} DbD-DLCs
      </div>
      <div v-if="!pastedData" class="flex gap-2.5 rounded-lg border border-[#2a475e] bg-[#0a152099] px-3.5 py-3 text-xs text-[#8f98a0]">
        <span class="shrink-0 mt-0.5">💡</span>
        <span>Falls der Tab nicht geöffnet wurde:
          <a :href="USERDATA_URL" target="_blank" class="text-[#66c0f4] underline">hier klicken</a>
          und dann den Inhalt kopieren.</span>
      </div>
      <div class="flex gap-3 pt-1">
        <button class="px-4 py-3 rounded-xl border border-[#2a475e] text-[#8f98a0] font-bold text-sm font-display" @click="step = Step.Explain">← Zurück</button>
        <button class="flex-1 py-3 rounded-xl text-white font-bold text-sm font-display transition-opacity steam-btn-primary" :class="canImport ? 'opacity-100' : 'opacity-40 pointer-events-none'" @click="doImport">Importieren →</button>
      </div>
    </div>

    <!-- Step 3: Result -->
    <div v-else-if="step === Step.Result" class="p-6">
      <div class="py-4 flex flex-col items-center gap-3">
        <span class="text-4xl">{{ importResult > 0 ? '✅' : 'ℹ️' }}</span>
        <div class="text-center">
          <div class="font-bold text-base" :class="importResult > 0 ? 'text-green-400' : 'text-[#c7d5e0]'">
            {{ importResult > 0 ? `${importResult} Charaktere aktualisiert!` : 'Keine Änderungen' }}
          </div>
          <div class="text-xs text-[#8f98a0] mt-1.5 leading-relaxed">
            <template v-if="importResult > 0">
              {{ importResult }} Charakter{{ importResult !== 1 ? 'e' : '' }} wurde{{ importResult !== 1 ? 'n' : '' }}
              als besessen markiert. Bereits besessene Charaktere wurden nicht verändert.
            </template>
            <template v-else>Alle erkannten DLC-Charaktere waren bereits als besessen markiert.</template>
          </div>
          <div v-if="unmatchedRoles.length" class="mt-3 text-xs text-amber-300/80">
            {{ unmatchedRoles.length }} DLC{{ unmatchedRoles.length !== 1 ? 's' : '' }} nicht zugeordnet
          </div>
        </div>
      </div>
      <button class="w-full py-3 rounded-xl text-white font-bold text-sm font-display steam-btn-success" @click="$emit('close')">Fertig</button>
    </div>
  </SteamCard>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { OwnershipStep } from '@/types';
import { useProgressStore } from '@/stores';
import { DLC_APPID_TO_ROLE, ALL_DLC_APPIDS } from '@/data/dlc-map';
import SteamCard from '@/components/shared/SteamCard.vue';

const USERDATA_URL = 'https://store.steampowered.com/dynamicstore/userdata';

const STEP_LABELS: Record<OwnershipStep, string> = {
  [OwnershipStep.Explain]: 'Schritt 1 von 3 — Steam-Daten öffnen',
  [OwnershipStep.Paste]: 'Schritt 2 von 3 — Einfügen',
  [OwnershipStep.Result]: 'Fertig',
};

interface UserData {
  rgOwnedApps?: number[];
  [key: string]: unknown;
}

export default defineComponent({
  name: 'OwnershipImport',
  components: { SteamCard },
  emits: ['close'],

  data() {
    return {
      Step: OwnershipStep,
      USERDATA_URL,
      step: OwnershipStep.Explain as OwnershipStep,
      pastedData: '',
      parseError: '',
      parsedAppIds: null as Set<number> | null,
      parsedCount: null as number | null,
      matchedDlcCount: 0,
      importResult: 0,
      unmatchedRoles: [] as string[],
      explainSteps: [
        'Klicke den Button unten — eine Steam-Seite öffnet sich mit deinen Daten',
        'Drücke Strg+A und dann Strg+C',
        'Komm zurück und füge die Daten ein — fertig',
      ],
    };
  },

  computed: {
    stepLabel(): string {
      return STEP_LABELS[this.step] ?? '';
    },
    canImport(): boolean {
      return this.parsedAppIds !== null && !this.parseError && this.matchedDlcCount > 0;
    },
    borderClass(): string {
      if (this.parseError) return 'border-red-400';
      if (this.parsedCount !== null) return 'border-green-400';
      return 'border-[#2a475e] focus:border-[#66c0f4]';
    },
  },

  watch: {
    pastedData() {
      this.tryParse();
    },
  },

  methods: {
    openAndNext(): void {
      window.open(USERDATA_URL, '_blank');
      this.step = OwnershipStep.Paste;
      this.$nextTick(() => {
        (this.$refs.pasteArea as HTMLTextAreaElement)?.focus();
      });
    },

    onPaste(e: ClipboardEvent): void {
      const text = e.clipboardData?.getData('text') ?? '';
      if (text) {
        e.preventDefault();
        this.pastedData = text.trim();
      }
    },

    tryParse(): void {
      this.parseError = '';
      this.parsedAppIds = null;
      this.parsedCount = null;
      this.matchedDlcCount = 0;

      if (!this.pastedData.trim()) return;

      try {
        const data: unknown = JSON.parse(this.pastedData);

        let appIds: number[];
        if (Array.isArray(data)) {
          appIds = data.filter((n): n is number => typeof n === 'number');
        } else if (typeof data === 'object' && data !== null) {
          const obj = data as UserData;
          if (Array.isArray(obj.rgOwnedApps)) {
            appIds = obj.rgOwnedApps;
          } else {
            this.parseError = 'Kein "rgOwnedApps" Array gefunden. Hast du den gesamten Inhalt kopiert?';
            return;
          }
        } else {
          this.parseError = 'Ungültiges Format. Kopiere den gesamten Inhalt der Steam-Seite.';
          return;
        }

        if (!appIds.length) {
          this.parseError = 'Leere App-Liste. Bist du bei Steam eingeloggt?';
          return;
        }

        const set = new Set(appIds);
        this.parsedAppIds = set;
        this.parsedCount = appIds.length;
        this.matchedDlcCount = ALL_DLC_APPIDS.filter((id) => set.has(id)).length;
      } catch {
        this.parseError = 'Kein gültiges JSON. Bitte den gesamten Seiteninhalt kopieren (Strg+A → Strg+C).';
      }
    },

    doImport(): void {
      if (!this.parsedAppIds) return;
      const store = useProgressStore();
      this.importResult = store.importOwnershipFromAppIds(this.parsedAppIds);

      const dlcRoleSet = new Set<string>();
      for (const appId of ALL_DLC_APPIDS) {
        if (this.parsedAppIds.has(appId)) {
          dlcRoleSet.add(DLC_APPID_TO_ROLE[appId]);
        }
      }
      this.unmatchedRoles = [...dlcRoleSet].filter(
        (role) => !store.allCharacters.some((c) => c.role === role),
      );
      this.step = OwnershipStep.Result;
    },
  },
});
</script>

<style scoped>
.steam-btn-primary {
  background: linear-gradient(135deg, #1a237e, #4527a0);
  border: 1px solid #3949ab;
}
.steam-btn-success {
  background: linear-gradient(135deg, #1b5e20, #2e7d32);
  border: 1px solid #4caf50;
}
.steam-kbd {
  background: #0a1520;
  color: #66c0f4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}
</style>
