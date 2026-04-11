<template>
  <div>
    <!-- ═══ SETUP WIZARD ═══ -->
    <Transition name="wizard-fade" mode="out-in">
      <SteamCard
        v-if="steam.phase === Phase.Setup"
        key="wizard"
        class="mb-3.5"
        title="STEAM VERBINDEN"
        :subtitle="stepLabel"
        :total-steps="TOTAL_STEPS"
        :current-step="wizardStep"
        close-label="Abbrechen"
        @close="steam.setPhase(Phase.Idle)"
      >
        <Transition name="step-slide" mode="out-in">
          <!-- Step 0: Intro -->
          <div v-if="wizardStep === WStep.Intro" key="s0" class="p-6 space-y-4">
            <p class="text-sm text-[#c7d5e0] leading-relaxed">
              Steam Sync liest deine freigeschalteten
              <strong class="text-[#66c0f4]">Adept-Achievements</strong>
              aus und markiert die entsprechenden Charaktere automatisch als erledigt.
            </p>
            <div class="space-y-2.5">
              <div v-for="(text, i) in introSteps" :key="i" class="flex gap-3 items-start text-sm">
                <span class="text-[#66c0f4] mt-0.5 shrink-0">{{ ['①','②','③'][i] }}</span>
                <span class="text-[#8f98a0]" v-html="text" />
              </div>
            </div>
            <div class="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-xs text-amber-300">
              <span class="shrink-0 mt-0.5">⚠</span>
              <span>Dein Steam-Profil und deine <strong>Spielstatistiken</strong> müssen auf <strong>Öffentlich</strong> gestellt sein.</span>
            </div>
            <div class="flex gap-3 pt-1">
              <button class="flex-1 py-3 rounded-xl border border-[#2a475e] text-[#8f98a0] font-bold text-sm font-display" @click="steam.setPhase(Phase.Idle)">Abbrechen</button>
              <button class="flex-1 py-3 rounded-xl text-white font-bold text-sm font-display steam-btn-primary" @click="goTo(WStep.ApiKey)">Los geht's →</button>
            </div>
          </div>

          <!-- Step 1: API Key -->
          <div v-else-if="wizardStep === WStep.ApiKey" key="s1" class="p-6 space-y-4">
            <div>
              <div class="font-bold text-sm text-[#c7d5e0] mb-1">Steam API Key generieren</div>
              <p class="text-xs text-[#8f98a0] leading-relaxed mb-3">
                Öffne den Link unten und melde dich an. Als <em>Domain</em> kannst du einfach
                <code class="bg-[#0a1520] text-[#66c0f4] px-1 rounded">localhost</code> eintragen.
                Dann auf <strong class="text-[#c7d5e0]">„Registrieren"</strong> klicken und den Key kopieren.
              </p>
              <a href="https://steamcommunity.com/dev/apikey" target="_blank" class="steam-link">🔗 steamcommunity.com/dev/apikey</a>
            </div>
            <div>
              <label class="block text-xs text-[#8f98a0] mb-1.5 font-semibold tracking-wide uppercase">API Key einfügen</label>
              <input
                v-model="apiKey"
                class="steam-input"
                :class="{ 'border-red-400': apiKey && !keyValid, 'border-green-400': keyValid, 'border-[#2a475e]': !apiKey }"
                placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                autocomplete="off"
                spellcheck="false"
                @paste="onApiKeyPaste"
              />
              <div class="text-xs mt-1.5 min-h-[18px]" :class="keyValid ? 'text-green-400' : apiKey ? 'text-red-400' : 'text-[#8f98a0]'">
                {{ keyMsg }}
              </div>
            </div>
            <div class="flex gap-3 pt-1">
              <button class="px-4 py-3 rounded-xl border border-[#2a475e] text-[#8f98a0] font-bold text-sm font-display" @click="goTo(WStep.Intro)">← Zurück</button>
              <button class="flex-1 py-3 rounded-xl text-white font-bold text-sm font-display steam-btn-primary transition-opacity" :class="keyValid ? 'opacity-100' : 'opacity-40 pointer-events-none'" @click="goTo(WStep.SteamId)">Weiter →</button>
            </div>
          </div>

          <!-- Step 2: Steam ID -->
          <div v-else-if="wizardStep === WStep.SteamId" key="s2" class="p-6 space-y-4">
            <div>
              <div class="font-bold text-sm text-[#c7d5e0] mb-1">Steam ID64 ermitteln</div>
              <p class="text-xs text-[#8f98a0] leading-relaxed mb-3">
                Du kannst deinen <strong class="text-[#c7d5e0]">Profil-Link</strong> direkt einfügen.
                Hast du eine Vanity-URL, nutze steamid.io für die 17-stellige ID64.
              </p>
              <a href="https://steamid.io/" target="_blank" class="steam-link">🔗 steamid.io — Vanity-URL → ID64</a>
            </div>
            <div>
              <label class="block text-xs text-[#8f98a0] mb-1.5 font-semibold tracking-wide uppercase">Steam ID64 oder Profil-URL</label>
              <input
                v-model="steamIdInput"
                class="steam-input"
                :class="{ 'border-red-400': steamIdInput && !idValid && !isVanityUrl, 'border-amber-400': isVanityUrl, 'border-green-400': idValid, 'border-[#2a475e]': !steamIdInput }"
                placeholder="76561198000000000  oder  steamcommunity.com/profiles/…"
                autocomplete="off"
                spellcheck="false"
              />
              <div class="text-xs mt-1.5 min-h-[18px]" :class="idValid ? 'text-green-400' : isVanityUrl ? 'text-amber-400' : steamIdInput ? 'text-red-400' : 'text-[#8f98a0]'">
                {{ idMsg }}
              </div>
            </div>
            <div v-if="isVanityUrl" class="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-xs text-amber-300">
              <span class="shrink-0 mt-0.5">ℹ</span>
              <span>Das ist eine Vanity-URL. Öffne <a href="https://steamid.io/" target="_blank" class="underline">steamid.io</a>, füge die URL dort ein und kopiere die angezeigte <strong>steamID64</strong>.</span>
            </div>
            <div class="flex gap-3 pt-1">
              <button class="px-4 py-3 rounded-xl border border-[#2a475e] text-[#8f98a0] font-bold text-sm font-display" @click="goTo(WStep.ApiKey)">← Zurück</button>
              <button class="flex-1 py-3 rounded-xl text-white font-bold text-sm font-display steam-btn-primary transition-opacity" :class="idValid ? 'opacity-100' : 'opacity-40 pointer-events-none'" @click="goTo(WStep.Test)">Verbindung testen →</button>
            </div>
          </div>

          <!-- Step 3: Test -->
          <div v-else-if="wizardStep === WStep.Test" key="s3" class="p-6">
            <!-- Pending -->
            <div v-if="testState === 'pending'" class="py-6 flex flex-col items-center gap-3">
              <span class="text-4xl animate-spin inline-block">⟳</span>
              <div class="text-sm text-[#8f98a0]">Verbindung wird getestet…</div>
            </div>
            <!-- Success -->
            <div v-else-if="testState === 'ok'" class="space-y-4">
              <div class="py-4 flex flex-col items-center gap-3">
                <span class="text-4xl">✅</span>
                <div class="text-center">
                  <div class="font-bold text-green-400 text-base">Verbindung erfolgreich!</div>
                  <div class="text-xs text-[#8f98a0] mt-1.5">{{ testSuccessMsg }}</div>
                </div>
              </div>
              <button class="w-full py-3 rounded-xl text-white font-bold text-sm font-display steam-btn-success" @click="saveAndFinish">⚡ Speichern &amp; loslegen</button>
            </div>
            <!-- Error -->
            <div v-else-if="testState === 'error'" class="space-y-4">
              <div class="flex gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3.5">
                <span class="text-red-400 text-lg shrink-0">✕</span>
                <div class="min-w-0">
                  <div class="font-bold text-red-400 text-sm mb-1">Verbindung fehlgeschlagen</div>
                  <div class="text-xs text-red-300/80 leading-relaxed">{{ testErrorMsg }}</div>
                </div>
              </div>
              <div class="flex gap-3">
                <button class="px-4 py-3 rounded-xl border border-[#2a475e] text-[#8f98a0] font-bold text-sm font-display" @click="goTo(testErrorType === ErrType.Key ? WStep.ApiKey : WStep.SteamId)">
                  {{ testErrorType === ErrType.Key ? '← API Key korrigieren' : '← Steam ID prüfen' }}
                </button>
                <button class="flex-1 py-3 rounded-xl text-white font-bold text-sm font-display steam-btn-primary" @click="runTest">Erneut testen</button>
              </div>
            </div>
          </div>
        </Transition>
      </SteamCard>
    </Transition>

    <!-- ═══ CONNECTED / IDLE ═══ -->
    <div
      v-if="steam.hasCreds && steam.phase === Phase.Idle"
      class="flex items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-raised)] px-4 py-3.5 mb-3"
    >
      <div class="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0 animate-pulse" />
      <span class="flex-1 text-sm text-[var(--color-text-muted)]"><strong class="text-[#66c0f4]">Steam</strong></span>
      <SteamActionButton title="DLC-Besitz importieren" @click="showOwnershipImport = !showOwnershipImport">📦</SteamActionButton>
      <SteamActionButton title="Achievements synchronisieren" @click="$emit('sync')">⟳</SteamActionButton>
      <SteamActionButton title="Cache leeren und neu synchronisieren" @click="$emit('force-sync')">↺</SteamActionButton>
      <SteamActionButton title="Steam-Verbindung trennen" :danger="true" @click="steam.clearCreds()">✕</SteamActionButton>
    </div>

    <OwnershipImport v-if="showOwnershipImport && steam.hasCreds" class="mb-3" @close="showOwnershipImport = false" />

    <!-- ═══ SYNCING / DONE / ERROR ═══ -->
    <div
      v-else-if="isSyncStatusVisible"
      class="w-full py-4 rounded-xl border text-center text-sm font-semibold mb-3"
      :class="syncStatusClass"
    >
      <span v-if="steam.phase === Phase.Syncing" class="animate-spin inline-block">⟳</span>
      {{ steam.phase === Phase.Syncing ? 'Sync…' : steam.message }}
    </div>

    <!-- ═══ NOT CONNECTED ═══ -->
    <div v-else-if="!steam.hasCreds && steam.phase === Phase.Idle" class="space-y-2 mb-3">
      <button
        class="w-full py-4 rounded-xl border border-[#66c0f4]/25 text-[#66c0f4] font-semibold text-sm flex items-center justify-center gap-2.5 hover:brightness-110"
        style="background: linear-gradient(135deg, #1b2838, #2a475e)"
        @click="openWizard"
      >
        <span class="text-xl">🎮</span> Steam verbinden
      </button>
      <button
        class="w-full py-3 rounded-xl border border-[#2a475e] text-[#8f98a0] font-semibold text-xs flex items-center justify-center gap-2 hover:border-[#66c0f4] hover:text-[#66c0f4]"
        style="background: #111d2c"
        @click="showOwnershipImport = !showOwnershipImport"
      >
        <span>📦</span> DLC-Besitz importieren
      </button>
    </div>

    <OwnershipImport v-if="showOwnershipImport && !steam.hasCreds" class="mb-3" @close="showOwnershipImport = false" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { SyncPhase, WizardStep, SteamErrorType } from '@/types';
import { useSteamStore } from '@/stores';
import SteamCard from '@/components/shared/SteamCard.vue';
import SteamActionButton from '@/components/shared/SteamActionButton.vue';
import OwnershipImport from '@/components/steam/OwnershipImport.vue';

type TestState = 'idle' | 'pending' | 'ok' | 'error';

const TOTAL_STEPS = 3;

const STEP_LABELS: Record<WizardStep, string> = {
  [WizardStep.Intro]: 'Übersicht',
  [WizardStep.ApiKey]: 'Schritt 1 von 3 — API Key',
  [WizardStep.SteamId]: 'Schritt 2 von 3 — Steam ID',
  [WizardStep.Test]: 'Schritt 3 von 3 — Verbindung testen',
};

export default defineComponent({
  name: 'SteamWidget',
  components: { SteamCard, SteamActionButton, OwnershipImport },
  emits: ['sync', 'force-sync'],

  data() {
    return {
      Phase: SyncPhase,
      WStep: WizardStep,
      ErrType: SteamErrorType,
      TOTAL_STEPS,
      wizardStep: WizardStep.Intro as WizardStep,
      apiKey: '',
      steamIdInput: '',
      testState: 'idle' as TestState,
      testErrorMsg: '',
      testErrorType: SteamErrorType.Unknown as SteamErrorType,
      testSuccessMsg: '',
      showOwnershipImport: false,
      introSteps: [
        'Steam <strong class="text-[#c7d5e0]">API Key</strong> generieren (kostenlos, 1 Minute)',
        'Deine <strong class="text-[#c7d5e0]">Steam ID64</strong> ermitteln',
        'Verbindung live testen — fertig',
      ],
    };
  },

  computed: {
    steam() {
      return useSteamStore();
    },
    stepLabel(): string {
      return STEP_LABELS[this.wizardStep] ?? '';
    },
    keyValidation() {
      return this.steam.validateKey(this.apiKey);
    },
    idValidation() {
      return this.steam.parseSteamId(this.steamIdInput);
    },
    keyValid(): boolean {
      return this.keyValidation.valid;
    },
    keyMsg(): string {
      return this.keyValidation.msg;
    },
    idValid(): boolean {
      return this.idValidation.valid;
    },
    idMsg(): string {
      return this.idValidation.msg;
    },
    isVanityUrl(): boolean {
      return /steamcommunity\.com\/id\//.test(this.steamIdInput);
    },
    isSyncStatusVisible(): boolean {
      const p = this.steam.phase;
      return p === SyncPhase.Syncing || p === SyncPhase.Done || p === SyncPhase.Error;
    },
    syncStatusClass(): Record<string, boolean> {
      return {
        'border-[var(--color-border-medium)] text-[var(--color-text-muted)]': this.steam.phase === SyncPhase.Syncing,
        'border-green-500/30 text-green-500 bg-green-500/10': this.steam.phase === SyncPhase.Done,
        'border-red-500/30 text-red-500 bg-red-500/10': this.steam.phase === SyncPhase.Error,
      };
    },
  },

  methods: {
    openWizard(): void {
      this.wizardStep = WizardStep.Intro;
      this.testState = 'idle';
      this.testErrorMsg = '';
      this.steam.setPhase(SyncPhase.Setup);
    },

    goTo(step: WizardStep): void {
      this.wizardStep = step;
      if (step === WizardStep.Test) {
        this.testState = 'idle';
        this.$nextTick(() => this.runTest());
      }
    },

    onApiKeyPaste(e: ClipboardEvent): void {
      const text = e.clipboardData?.getData('text') ?? '';
      if (text) {
        e.preventDefault();
        this.apiKey = text.trim();
      }
    },

    async runTest(): Promise<void> {
      this.testState = 'pending';
      this.testErrorMsg = '';
      this.testErrorType = SteamErrorType.Unknown;

      try {
        const count = await this.steam.testConnection(
          this.apiKey.trim(),
          this.idValidation.id,
        );
        this.testSuccessMsg = `${count} Adept-Achievement${count !== 1 ? 's' : ''} gefunden.`;
        this.testState = 'ok';
      } catch (err) {
        const msg = (err as Error).message ?? 'Unbekannter Fehler';
        this.testState = 'error';
        this.testErrorMsg = msg;

        if (/api key|ungültig|invalid/i.test(msg)) {
          this.testErrorType = SteamErrorType.Key;
        } else if (/privat|private/i.test(msg)) {
          this.testErrorType = SteamErrorType.Private;
        } else if (/network|fetch|abort|timeout|proxy/i.test(msg)) {
          this.testErrorType = SteamErrorType.Network;
        }
      }
    },

    saveAndFinish(): void {
      this.steam.saveCreds(this.apiKey.trim(), this.idValidation.id);
      this.steam.setPhase(SyncPhase.Idle);
      this.$emit('sync');
    },
  },
});
</script>

<style scoped>
.wizard-fade-enter-active, .wizard-fade-leave-active { transition: opacity 0.2s ease; }
.wizard-fade-enter-from, .wizard-fade-leave-to { opacity: 0; }
.step-slide-enter-active, .step-slide-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.step-slide-enter-from { opacity: 0; transform: translateX(12px); }
.step-slide-leave-to { opacity: 0; transform: translateX(-12px); }
.steam-btn-primary { background: linear-gradient(135deg, #1a237e, #4527a0); border: 1px solid #3949ab; }
.steam-btn-success { background: linear-gradient(135deg, #1b5e20, #2e7d32); border: 1px solid #4caf50; }
.steam-input { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid; background: #0a152099; color: var(--color-text-primary); font-size: 14px; font-family: monospace; outline: none; transition: border-color 0.15s; }
.steam-link { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: #66c0f4; border-bottom: 1px dashed #66c0f466; }
.steam-link:hover { border-color: #66c0f4; }
</style>
