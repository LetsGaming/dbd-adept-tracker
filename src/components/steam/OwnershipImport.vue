<template>
  <div
    class="rounded-2xl border border-[#2a475e] overflow-hidden"
    style="background: linear-gradient(145deg, #111d2c, #0a1520)"
  >
    <!-- Header -->
    <div
      class="px-6 pt-5 pb-4 border-b border-[#2a475e]"
      style="background: linear-gradient(135deg, #1b2838, #2a475e44)"
    >
      <div class="flex items-center gap-3.5 mb-3.5">
        <span class="text-3xl">📦</span>
        <div class="flex-1 min-w-0">
          <div class="font-display text-base font-bold text-[#66c0f4]">
            DLC-BESITZ IMPORTIEREN
          </div>
          <div class="text-xs text-[#8f98a0] mt-0.5">{{ stepLabel }}</div>
        </div>
        <button
          class="text-[#8f98a0] hover:text-[#c7d5e0] text-lg leading-none p-1"
          title="Schließen"
          @click="$emit('close')"
        >✕</button>
      </div>
      <div class="flex gap-1.5">
        <div
          v-for="i in 3"
          :key="i"
          class="h-1 flex-1 rounded-full transition-all duration-300"
          :class="i <= step ? 'bg-[#66c0f4]' : 'bg-[#2a475e]'"
        />
      </div>
    </div>

    <!-- Step 1: Erklärung -->
    <div v-if="step === 1" class="p-6 space-y-4">
      <p class="text-sm text-[#c7d5e0] leading-relaxed">
        Steam zeigt deine besessenen DLCs nicht über die API — aber wir
        können sie über eine <strong class="text-[#66c0f4]">spezielle Steam-Seite</strong> auslesen.
        Das dauert ca. <strong class="text-[#66c0f4]">30 Sekunden</strong>.
      </p>

      <div class="space-y-3">
        <div class="flex gap-3 items-start text-sm">
          <span class="text-[#66c0f4] mt-0.5 shrink-0 font-bold">①</span>
          <span class="text-[#8f98a0]">
            Klicke den Button unten — eine Steam-Seite öffnet sich mit deinen Daten
          </span>
        </div>
        <div class="flex gap-3 items-start text-sm">
          <span class="text-[#66c0f4] mt-0.5 shrink-0 font-bold">②</span>
          <span class="text-[#8f98a0]">
            Drücke <kbd class="bg-[#0a1520] text-[#66c0f4] px-1.5 py-0.5 rounded text-xs font-mono">Strg+A</kbd> und dann <kbd class="bg-[#0a1520] text-[#66c0f4] px-1.5 py-0.5 rounded text-xs font-mono">Strg+C</kbd>
          </span>
        </div>
        <div class="flex gap-3 items-start text-sm">
          <span class="text-[#66c0f4] mt-0.5 shrink-0 font-bold">③</span>
          <span class="text-[#8f98a0]">
            Komm zurück und füge die Daten ein — fertig
          </span>
        </div>
      </div>

      <div class="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-xs text-amber-300">
        <span class="shrink-0 mt-0.5">⚠</span>
        <span>
          Du musst im Browser bei <strong>Steam eingeloggt</strong> sein, damit die Seite funktioniert.
        </span>
      </div>

      <div class="flex gap-3 pt-1">
        <button
          class="flex-1 py-3 rounded-xl border border-[#2a475e] text-[#8f98a0] font-bold text-sm font-display"
          @click="$emit('close')"
        >Abbrechen</button>
        <button
          class="flex-1 py-3 rounded-xl text-white font-bold text-sm font-display"
          style="background: linear-gradient(135deg, #1a237e, #4527a0); border: 1px solid #3949ab;"
          @click="openAndNext"
        >Steam-Daten öffnen →</button>
      </div>
    </div>

    <!-- Step 2: Einfügen -->
    <div v-else-if="step === 2" class="p-6 space-y-4">
      <div class="font-bold text-sm text-[#c7d5e0] mb-1">
        Daten einfügen
      </div>
      <p class="text-xs text-[#8f98a0] leading-relaxed">
        Wechsle zum Tab mit den Steam-Daten, drücke
        <kbd class="bg-[#0a1520] text-[#66c0f4] px-1.5 py-0.5 rounded font-mono">Strg+A</kbd>
        (alles markieren) und dann
        <kbd class="bg-[#0a1520] text-[#66c0f4] px-1.5 py-0.5 rounded font-mono">Strg+C</kbd>
        (kopieren). Dann hier einfügen:
      </p>

      <textarea
        ref="pasteArea"
        v-model="pastedData"
        class="w-full h-32 px-3.5 py-2.5 rounded-lg border bg-[#0a152099] text-[var(--color-text-primary)] text-xs font-mono outline-none transition-colors resize-y"
        :class="{
          'border-red-400': parseError,
          'border-green-400': parsedCount !== null && !parseError,
          'border-[#2a475e] focus:border-[#66c0f4]': parsedCount === null && !parseError
        }"
        placeholder="Hier einfügen (Strg+V)…"
        spellcheck="false"
        @paste="onPaste"
      />

      <div v-if="parseError" class="text-xs text-red-400">
        ✕ {{ parseError }}
      </div>
      <div v-else-if="parsedCount !== null" class="text-xs text-green-400">
        ✓ {{ parsedCount }} App-IDs erkannt, davon {{ matchedDlcCount }} DbD-DLCs
      </div>

      <!-- Tipp wenn noch nichts eingefügt -->
      <div
        v-if="!pastedData"
        class="flex gap-2.5 rounded-lg border border-[#2a475e] bg-[#0a152099] px-3.5 py-3 text-xs text-[#8f98a0]"
      >
        <span class="shrink-0 mt-0.5">💡</span>
        <span>
          Falls der Tab nicht geöffnet wurde:
          <a
            href="https://store.steampowered.com/dynamicstore/userdata"
            target="_blank"
            class="text-[#66c0f4] underline"
          >hier klicken</a>
          und dann den Inhalt kopieren.
        </span>
      </div>

      <div class="flex gap-3 pt-1">
        <button
          class="px-4 py-3 rounded-xl border border-[#2a475e] text-[#8f98a0] font-bold text-sm font-display"
          @click="step = 1"
        >← Zurück</button>
        <button
          class="flex-1 py-3 rounded-xl text-white font-bold text-sm font-display transition-opacity"
          :class="canImport ? 'opacity-100' : 'opacity-40 pointer-events-none'"
          style="background: linear-gradient(135deg, #1a237e, #4527a0); border: 1px solid #3949ab;"
          @click="doImport"
        >Importieren →</button>
      </div>
    </div>

    <!-- Step 3: Ergebnis -->
    <div v-else-if="step === 3" class="p-6">
      <div class="py-4 flex flex-col items-center gap-3">
        <span class="text-4xl">{{ importResult > 0 ? '✅' : 'ℹ️' }}</span>
        <div class="text-center">
          <div class="font-bold text-base" :class="importResult > 0 ? 'text-green-400' : 'text-[#c7d5e0]'">
            {{ importResult > 0 ? `${importResult} Charaktere aktualisiert!` : 'Keine Änderungen' }}
          </div>
          <div class="text-xs text-[#8f98a0] mt-1.5 leading-relaxed">
            <template v-if="importResult > 0">
              {{ importResult }} Charakter{{ importResult !== 1 ? 'e' : '' }} wurde{{ importResult !== 1 ? 'n' : '' }}
              als besessen markiert.
              <br>Bereits besessene Charaktere wurden nicht verändert.
            </template>
            <template v-else>
              Alle erkannten DLC-Charaktere waren bereits als besessen markiert.
            </template>
          </div>
          <div v-if="unmatchedRoles.length" class="mt-3 text-xs text-amber-300/80">
            {{ unmatchedRoles.length }} DLC{{ unmatchedRoles.length !== 1 ? 's' : '' }} nicht zugeordnet
            (kein passender Character im Tracker)
          </div>
        </div>
      </div>
      <button
        class="w-full py-3 rounded-xl text-white font-bold text-sm font-display"
        style="background: linear-gradient(135deg, #1b5e20, #2e7d32); border: 1px solid #4caf50;"
        @click="$emit('close')"
      >Fertig</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useProgressStore } from '@/stores';
import { DLC_APPID_TO_ROLE, ALL_DLC_APPIDS } from '@/data/dlc-map';

const USERDATA_URL = 'https://store.steampowered.com/dynamicstore/userdata';

const STEP_LABELS: Record<number, string> = {
  1: 'Schritt 1 von 3 — Steam-Daten öffnen',
  2: 'Schritt 2 von 3 — Einfügen',
  3: 'Fertig',
};

export default defineComponent({
  name: 'OwnershipImport',
  emits: ['close'],

  data() {
    return {
      step: 1,
      pastedData: '',
      parseError: '',
      parsedAppIds: null as Set<number> | null,
      parsedCount: null as number | null,
      matchedDlcCount: 0,
      importResult: 0,
      unmatchedRoles: [] as string[],
    };
  },

  computed: {
    stepLabel(): string {
      return STEP_LABELS[this.step] ?? '';
    },
    canImport(): boolean {
      return this.parsedAppIds !== null && !this.parseError && this.matchedDlcCount > 0;
    },
  },

  watch: {
    pastedData() {
      this.tryParse();
    },
  },

  methods: {
    openAndNext() {
      window.open(USERDATA_URL, '_blank');
      this.step = 2;
      this.$nextTick(() => {
        (this.$refs.pasteArea as HTMLTextAreaElement)?.focus();
      });
    },

    onPaste(e: ClipboardEvent) {
      const text = e.clipboardData?.getData('text') ?? '';
      if (text) {
        e.preventDefault();
        this.pastedData = text.trim();
      }
    },

    tryParse() {
      this.parseError = '';
      this.parsedAppIds = null;
      this.parsedCount = null;
      this.matchedDlcCount = 0;

      if (!this.pastedData.trim()) return;

      try {
        const data = JSON.parse(this.pastedData);

        // Accept either the full userdata JSON or just rgOwnedApps array
        let appIds: number[];
        if (Array.isArray(data)) {
          appIds = data.filter((n: unknown) => typeof n === 'number');
        } else if (data?.rgOwnedApps && Array.isArray(data.rgOwnedApps)) {
          appIds = data.rgOwnedApps;
        } else if (typeof data === 'object' && data !== null) {
          // Maybe they pasted a subset — look for rgOwnedApps anywhere
          const keys = Object.keys(data);
          if (keys.includes('rgOwnedApps')) {
            appIds = data.rgOwnedApps;
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
        this.matchedDlcCount = ALL_DLC_APPIDS.filter(id => set.has(id)).length;
      } catch {
        this.parseError = 'Kein gültiges JSON. Bitte den gesamten Seiteninhalt kopieren (Strg+A → Strg+C).';
      }
    },

    doImport() {
      if (!this.parsedAppIds) return;

      const store = useProgressStore();
      this.importResult = store.importOwnershipFromAppIds(this.parsedAppIds);

      // Check for DLC appids that were owned but didn't match any character
      const dlcRoleSet = new Set<string>();
      for (const appId of ALL_DLC_APPIDS) {
        if (this.parsedAppIds.has(appId)) {
          dlcRoleSet.add(DLC_APPID_TO_ROLE[appId]);
        }
      }
      this.unmatchedRoles = [...dlcRoleSet].filter(
        role => !store.allCharacters.some(c => c.role === role)
      );

      this.step = 3;
    },
  },
});
</script>
