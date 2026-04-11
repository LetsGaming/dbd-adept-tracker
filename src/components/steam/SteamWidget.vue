<template>
  <div>
    <!-- ═══ SETUP WIZARD ═══ -->
    <Transition name="wizard-fade" mode="out-in">
      <div
        v-if="steam.phase === 'setup'"
        key="wizard"
        class="rounded-2xl border border-[#2a475e] overflow-hidden mb-3.5"
        style="background: linear-gradient(145deg, #111d2c, #0a1520)"
      >
        <!-- Header with progress dots -->
        <div
          class="px-6 pt-5 pb-4 border-b border-[#2a475e]"
          style="background: linear-gradient(135deg, #1b2838, #2a475e44)"
        >
          <div class="flex items-center gap-3.5 mb-3.5">
            <span class="text-3xl">🎮</span>
            <div class="flex-1 min-w-0">
              <div class="font-display text-base font-bold text-[#66c0f4]">
                STEAM VERBINDEN
              </div>
              <div class="text-xs text-[#8f98a0] mt-0.5">{{ stepLabel }}</div>
            </div>
            <button
              class="text-[#8f98a0] hover:text-[#c7d5e0] text-lg leading-none p-1"
              title="Abbrechen"
              @click="steam.setPhase('idle')"
            >
              ✕
            </button>
          </div>
          <!-- Progress bar segments -->
          <div class="flex gap-1.5">
            <div
              v-for="i in TOTAL_STEPS"
              :key="i"
              class="h-1 flex-1 rounded-full transition-all duration-300"
              :class="i <= wizardStep ? 'bg-[#66c0f4]' : 'bg-[#2a475e]'"
            />
          </div>
        </div>

        <!-- ─── Step 0: Intro ─── -->
        <Transition name="step-slide" mode="out-in">
          <div v-if="wizardStep === 0" key="step0" class="p-6 space-y-4">
            <p class="text-sm text-[#c7d5e0] leading-relaxed">
              Steam Sync liest deine freigeschalteten
              <strong class="text-[#66c0f4]">Adept-Achievements</strong>
              aus und markiert die entsprechenden Charaktere automatisch als
              erledigt.
            </p>
            <div class="space-y-2.5">
              <div class="flex gap-3 items-start text-sm">
                <span class="text-[#66c0f4] mt-0.5 shrink-0">①</span>
                <span class="text-[#8f98a0]"
                  >Steam
                  <strong class="text-[#c7d5e0]">API Key</strong> generieren
                  (kostenlos, 1 Minute)</span
                >
              </div>
              <div class="flex gap-3 items-start text-sm">
                <span class="text-[#66c0f4] mt-0.5 shrink-0">②</span>
                <span class="text-[#8f98a0]"
                  >Deine
                  <strong class="text-[#c7d5e0]">Steam ID64</strong>
                  ermitteln</span
                >
              </div>
              <div class="flex gap-3 items-start text-sm">
                <span class="text-[#66c0f4] mt-0.5 shrink-0">③</span>
                <span class="text-[#8f98a0]"
                  >Verbindung live testen — fertig</span
                >
              </div>
            </div>
            <div
              class="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-xs text-amber-300"
            >
              <span class="shrink-0 mt-0.5">⚠</span>
              <span>
                Dein Steam-Profil und deine
                <strong>Spielstatistiken</strong> müssen auf
                <strong>Öffentlich</strong> gestellt sein, sonst schlägt der
                Sync fehl.
              </span>
            </div>
            <div class="flex gap-3 pt-1">
              <button
                class="flex-1 py-3 rounded-xl border border-[#2a475e] text-[#8f98a0] font-bold text-sm font-display"
                @click="steam.setPhase('idle')"
              >
                Abbrechen
              </button>
              <button
                class="flex-1 py-3 rounded-xl text-white font-bold text-sm font-display"
                style="
                  background: linear-gradient(135deg, #1a237e, #4527a0);
                  border: 1px solid #3949ab;
                "
                @click="goTo(1)"
              >
                Los geht's →
              </button>
            </div>
          </div>

          <!-- ─── Step 1: API Key ─── -->
          <div v-else-if="wizardStep === 1" key="step1" class="p-6 space-y-4">
            <div>
              <div class="font-bold text-sm text-[#c7d5e0] mb-1">
                Steam API Key generieren
              </div>
              <p class="text-xs text-[#8f98a0] leading-relaxed mb-3">
                Öffne den Link unten und melde dich an. Als
                <em>Domain</em> kannst du einfach
                <code class="bg-[#0a1520] text-[#66c0f4] px-1 rounded"
                  >localhost</code
                >
                eintragen — das reicht. Dann auf
                <strong class="text-[#c7d5e0]">„Registrieren"</strong> klicken
                und den Key kopieren.
              </p>
              <a
                href="https://steamcommunity.com/dev/apikey"
                target="_blank"
                class="inline-flex items-center gap-1.5 text-sm text-[#66c0f4] border-b border-dashed border-[#66c0f4]/60 hover:border-[#66c0f4]"
                >🔗 steamcommunity.com/dev/apikey</a
              >
            </div>
            <div>
              <label
                class="block text-xs text-[#8f98a0] mb-1.5 font-semibold tracking-wide uppercase"
              >
                API Key einfügen
              </label>
              <input
                v-model="apiKey"
                class="w-full px-3.5 py-2.5 rounded-lg border bg-[#0a152099] text-[var(--color-text-primary)] text-sm font-mono outline-none transition-colors"
                :class="{
                  'border-red-400 focus:border-red-400': apiKey && !keyValid,
                  'border-green-400 focus:border-green-400': keyValid,
                  'border-[#2a475e] focus:border-[#66c0f4]': !apiKey,
                }"
                placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                autocomplete="off"
                spellcheck="false"
                @paste="onApiKeyPaste"
              />
              <div
                class="text-xs mt-1.5 min-h-[18px] transition-colors"
                :class="
                  keyValid
                    ? 'text-green-400'
                    : apiKey
                      ? 'text-red-400'
                      : 'text-[#8f98a0]'
                "
              >
                {{ keyMsg }}
              </div>
            </div>
            <div class="flex gap-3 pt-1">
              <button
                class="px-4 py-3 rounded-xl border border-[#2a475e] text-[#8f98a0] font-bold text-sm font-display"
                @click="goTo(0)"
              >
                ← Zurück
              </button>
              <button
                class="flex-1 py-3 rounded-xl text-white font-bold text-sm font-display transition-opacity"
                :class="
                  keyValid ? 'opacity-100' : 'opacity-40 pointer-events-none'
                "
                style="
                  background: linear-gradient(135deg, #1a237e, #4527a0);
                  border: 1px solid #3949ab;
                "
                @click="goTo(2)"
              >
                Weiter →
              </button>
            </div>
          </div>

          <!-- ─── Step 2: Steam ID ─── -->
          <div v-else-if="wizardStep === 2" key="step2" class="p-6 space-y-4">
            <div>
              <div class="font-bold text-sm text-[#c7d5e0] mb-1">
                Steam ID64 ermitteln
              </div>
              <p class="text-xs text-[#8f98a0] leading-relaxed mb-3">
                Du kannst deinen
                <strong class="text-[#c7d5e0]">Profil-Link</strong> direkt
                einfügen — eine ID64 wird automatisch erkannt. Hast du eine
                Vanity-URL (z.&nbsp;B.
                <code class="bg-[#0a1520] text-[#66c0f4] px-1 rounded"
                  >steamcommunity.com/id/deinname</code
                >), nutze steamid.io, um die 17-stellige ID64 herauszufinden.
              </p>
              <a
                href="https://steamid.io/"
                target="_blank"
                class="inline-flex items-center gap-1.5 text-sm text-[#66c0f4] border-b border-dashed border-[#66c0f4]/60 hover:border-[#66c0f4]"
                >🔗 steamid.io — Vanity-URL → ID64 umwandeln</a
              >
            </div>
            <div>
              <label
                class="block text-xs text-[#8f98a0] mb-1.5 font-semibold tracking-wide uppercase"
              >
                Steam ID64 oder Profil-URL
              </label>
              <input
                v-model="steamIdInput"
                class="w-full px-3.5 py-2.5 rounded-lg border bg-[#0a152099] text-[var(--color-text-primary)] text-sm font-mono outline-none transition-colors"
                :class="{
                  'border-red-400 focus:border-red-400':
                    steamIdInput && !idValid && !isVanityUrl,
                  'border-amber-400 focus:border-amber-400': isVanityUrl,
                  'border-green-400 focus:border-green-400': idValid,
                  'border-[#2a475e] focus:border-[#66c0f4]': !steamIdInput,
                }"
                placeholder="76561198000000000  oder  steamcommunity.com/profiles/…"
                autocomplete="off"
                spellcheck="false"
              />
              <div
                class="text-xs mt-1.5 min-h-[18px] transition-colors"
                :class="
                  idValid
                    ? 'text-green-400'
                    : isVanityUrl
                      ? 'text-amber-400'
                      : steamIdInput
                        ? 'text-red-400'
                        : 'text-[#8f98a0]'
                "
              >
                {{ idMsg }}
              </div>
            </div>
            <!-- Extra callout when vanity URL is typed -->
            <div
              v-if="isVanityUrl"
              class="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-xs text-amber-300"
            >
              <span class="shrink-0 mt-0.5">ℹ</span>
              <span>
                Das ist eine Vanity-URL. Öffne
                <a href="https://steamid.io/" target="_blank" class="underline"
                  >steamid.io</a
                >, füge die URL dort ein und kopiere die angezeigte
                <strong>steamID64</strong>
                (17-stellige Zahl) in dieses Feld.
              </span>
            </div>
            <div class="flex gap-3 pt-1">
              <button
                class="px-4 py-3 rounded-xl border border-[#2a475e] text-[#8f98a0] font-bold text-sm font-display"
                @click="goTo(1)"
              >
                ← Zurück
              </button>
              <button
                class="flex-1 py-3 rounded-xl text-white font-bold text-sm font-display transition-opacity"
                :class="
                  idValid ? 'opacity-100' : 'opacity-40 pointer-events-none'
                "
                style="
                  background: linear-gradient(135deg, #1a237e, #4527a0);
                  border: 1px solid #3949ab;
                "
                @click="goTo(3)"
              >
                Verbindung testen →
              </button>
            </div>
          </div>

          <!-- ─── Step 3: Live connection test ─── -->
          <div v-else-if="wizardStep === 3" key="step3" class="p-6">
            <!-- Pending -->
            <div
              v-if="testState === 'pending'"
              class="py-6 flex flex-col items-center gap-3"
            >
              <span class="text-4xl animate-spin inline-block">⟳</span>
              <div class="text-sm text-[#8f98a0]">
                Verbindung wird getestet…
              </div>
              <div class="text-xs text-[#8f98a0]/60">
                Steam API wird kontaktiert
              </div>
            </div>

            <!-- Success -->
            <div v-else-if="testState === 'ok'" class="space-y-4">
              <div class="py-4 flex flex-col items-center gap-3">
                <span class="text-4xl">✅</span>
                <div class="text-center">
                  <div class="font-bold text-green-400 text-base">
                    Verbindung erfolgreich!
                  </div>
                  <div class="text-xs text-[#8f98a0] mt-1.5">
                    {{ testSuccessMsg }}
                  </div>
                </div>
              </div>
              <button
                class="w-full py-3 rounded-xl text-white font-bold text-sm font-display"
                style="
                  background: linear-gradient(135deg, #1b5e20, #2e7d32);
                  border: 1px solid #4caf50;
                "
                @click="saveAndFinish"
              >
                ⚡ Speichern &amp; loslegen
              </button>
            </div>

            <!-- Error -->
            <div v-else-if="testState === 'error'" class="space-y-4">
              <div
                class="flex gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3.5"
              >
                <span class="text-red-400 text-lg shrink-0">✕</span>
                <div class="min-w-0">
                  <div class="font-bold text-red-400 text-sm mb-1">
                    Verbindung fehlgeschlagen
                  </div>
                  <div class="text-xs text-red-300/80 leading-relaxed">
                    {{ testErrorMsg }}
                  </div>
                </div>
              </div>

              <!-- Fix: bad API key -->
              <div
                v-if="testErrorType === 'key'"
                class="rounded-lg border border-[#2a475e] bg-[#0a152099] px-4 py-3 text-xs text-[#8f98a0] space-y-1.5"
              >
                <div class="font-semibold text-[#c7d5e0]">
                  Mögliche Ursachen &amp; Lösungen
                </div>
                <div>
                  ① Prüfe ob du den Key vollständig kopiert hast (genau 32
                  Zeichen, nur A–F und 0–9).
                </div>
                <div>
                  ② Der Key muss auf
                  <a
                    href="https://steamcommunity.com/dev/apikey"
                    target="_blank"
                    class="text-[#66c0f4] underline"
                    >steamcommunity.com/dev/apikey</a
                  >
                  aktiv sein.
                </div>
                <div>
                  ③ Manchmal hilft es, den Key zu widerrufen und einen neuen zu
                  generieren.
                </div>
              </div>

              <!-- Fix: private profile -->
              <div
                v-else-if="testErrorType === 'private'"
                class="rounded-lg border border-[#2a475e] bg-[#0a152099] px-4 py-3 text-xs text-[#8f98a0] space-y-1.5"
              >
                <div class="font-semibold text-[#c7d5e0]">
                  Profil öffentlich schalten
                </div>
                <div>
                  ① Öffne
                  <a
                    href="https://steamcommunity.com/my/edit/settings"
                    target="_blank"
                    class="text-[#66c0f4] underline"
                    >Profil → Datenschutz-Einstellungen</a
                  >.
                </div>
                <div>
                  ②
                  <strong class="text-[#c7d5e0]">„Meine Profildetails"</strong>
                  → <strong class="text-[#c7d5e0]">Öffentlich</strong>.
                </div>
                <div>
                  ③ <strong class="text-[#c7d5e0]">„Spieldetails"</strong> →
                  <strong class="text-[#c7d5e0]">Öffentlich</strong>.
                </div>
                <div class="text-amber-300/80">
                  ⚠ Änderungen können einige Minuten brauchen.
                </div>
              </div>

              <!-- Fix: network / unknown -->
              <div
                v-else
                class="rounded-lg border border-[#2a475e] bg-[#0a152099] px-4 py-3 text-xs text-[#8f98a0] space-y-1.5"
              >
                <div class="font-semibold text-[#c7d5e0]">Was tun?</div>
                <div>
                  Prüfe deine Internetverbindung. Die Steam API ist gelegentlich
                  kurzzeitig nicht erreichbar — einfach erneut versuchen.
                </div>
              </div>

              <div class="flex gap-3">
                <button
                  class="px-4 py-3 rounded-xl border border-[#2a475e] text-[#8f98a0] font-bold text-sm font-display"
                  @click="goTo(testErrorType === 'key' ? 1 : 2)"
                >
                  {{
                    testErrorType === "key"
                      ? "← API Key korrigieren"
                      : "← Steam ID prüfen"
                  }}
                </button>
                <button
                  class="flex-1 py-3 rounded-xl text-white font-bold text-sm font-display"
                  style="
                    background: linear-gradient(135deg, #1a237e, #4527a0);
                    border: 1px solid #3949ab;
                  "
                  @click="runTest"
                >
                  Erneut testen
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- ═══ CONNECTED / IDLE ═══ -->
    <div
      v-if="steam.hasCreds && steam.phase === 'idle'"
      class="flex items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-raised)] px-4 py-3.5 mb-3"
    >
      <div
        class="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0 animate-pulse"
      />
      <span class="flex-1 text-sm text-[var(--color-text-muted)]">
        <strong class="text-[#66c0f4]">Steam</strong>
      </span>
      <button
        class="rounded-md border border-[#2a475e] text-[#8f98a0] text-[11px] px-3 py-1.5 font-semibold hover:border-[#66c0f4] hover:text-[#66c0f4] min-h-[36px]"
        title="DLC-Besitz importieren"
        @click="showOwnershipImport = !showOwnershipImport"
      >
        📦
      </button>
      <button
        class="rounded-md border border-[#2a475e] text-[#8f98a0] text-[11px] px-3 py-1.5 font-semibold hover:border-[#66c0f4] hover:text-[#66c0f4] min-h-[36px]"
        title="Achievements synchronisieren"
        @click="$emit('sync')"
      >
        ⟳
      </button>
      <button
        class="rounded-md border border-[#2a475e] text-[#8f98a0] text-[11px] px-3 py-1.5 font-semibold hover:border-[#66c0f4] hover:text-[#66c0f4] min-h-[36px]"
        title="Cache leeren und neu synchronisieren"
        @click="$emit('force-sync')"
      >
        ↺
      </button>
      <button
        class="rounded-md border border-[#2a475e] text-[#8f98a0] text-[11px] px-3 py-1.5 font-semibold hover:border-red-400 hover:text-red-400 min-h-[36px]"
        title="Steam-Verbindung trennen"
        @click="steam.clearCreds()"
      >
        ✕
      </button>
    </div>

    <!-- ═══ OWNERSHIP IMPORT WIZARD ═══ -->
    <OwnershipImport
      v-if="showOwnershipImport && steam.hasCreds"
      class="mb-3"
      @close="showOwnershipImport = false"
    />

    <!-- ═══ SYNCING / DONE / ERROR ═══ -->
    <div
      v-else-if="['syncing', 'done', 'error'].includes(steam.phase)"
      class="w-full py-4 rounded-xl border text-center text-sm font-semibold mb-3"
      :class="{
        'border-[var(--color-border-medium)] text-[var(--color-text-muted)]':
          steam.phase === 'syncing',
        'border-green-500/30 text-green-500 bg-green-500/10':
          steam.phase === 'done',
        'border-red-500/30 text-red-500 bg-red-500/10': steam.phase === 'error',
      }"
    >
      <span v-if="steam.phase === 'syncing'" class="animate-spin inline-block"
        >⟳</span
      >
      {{ steam.phase === "syncing" ? "Sync…" : steam.message }}
    </div>

    <!-- ═══ NOT CONNECTED ═══ -->
    <div v-else-if="!steam.hasCreds && steam.phase === 'idle'" class="space-y-2 mb-3">
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

    <!-- ═══ OWNERSHIP IMPORT (non-connected) ═══ -->
    <OwnershipImport
      v-if="showOwnershipImport && !steam.hasCreds"
      class="mb-3"
      @close="showOwnershipImport = false"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useSteamStore } from "@/stores";
import OwnershipImport from "@/components/steam/OwnershipImport.vue";

type TestState = "idle" | "pending" | "ok" | "error";
type ErrorType = "key" | "private" | "network" | "unknown";

const TOTAL_STEPS = 3;

const STEP_LABELS: Record<number, string> = {
  0: "Übersicht",
  1: "Schritt 1 von 3 — API Key",
  2: "Schritt 2 von 3 — Steam ID",
  3: "Schritt 3 von 3 — Verbindung testen",
};

export default defineComponent({
  name: "SteamWidget",
  components: { OwnershipImport },
  emits: ["sync", "force-sync"],

  data() {
    return {
      TOTAL_STEPS,
      wizardStep: 0 as number,
      apiKey: "",
      steamIdInput: "",
      testState: "idle" as TestState,
      testErrorMsg: "",
      testErrorType: "unknown" as ErrorType,
      testSuccessMsg: "",
      showOwnershipImport: false,
    };
  },

  computed: {
    steam() {
      return useSteamStore();
    },
    stepLabel(): string {
      return STEP_LABELS[this.wizardStep] ?? "";
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
  },

  methods: {
    openWizard() {
      this.wizardStep = 0;
      this.testState = "idle";
      this.testErrorMsg = "";
      this.steam.setPhase("setup");
    },

    goTo(step: number) {
      this.wizardStep = step;
      if (step === 3) {
        this.testState = "idle";
        this.$nextTick(() => this.runTest());
      }
    },

    /** Strip accidental whitespace from pasted API keys */
    onApiKeyPaste(e: ClipboardEvent) {
      const text = e.clipboardData?.getData("text") ?? "";
      if (text) {
        e.preventDefault();
        this.apiKey = text.trim();
      }
    },

    async runTest() {
      this.testState = "pending";
      this.testErrorMsg = "";
      this.testErrorType = "unknown";

      try {
        const count = await this.steam.testConnection(
          this.apiKey.trim(),
          this.idValidation.id,
        );
        this.testSuccessMsg = `${count} Adept-Achievement${count !== 1 ? "s" : ""} gefunden.`;
        this.testState = "ok";
      } catch (err) {
        const msg = (err as Error).message ?? "Unbekannter Fehler";
        this.testState = "error";
        this.testErrorMsg = msg;

        if (/api key|ungültig|invalid/i.test(msg)) {
          this.testErrorType = "key";
        } else if (/privat|private/i.test(msg)) {
          this.testErrorType = "private";
        } else if (/network|fetch|abort|timeout|proxy/i.test(msg)) {
          this.testErrorType = "network";
        } else {
          this.testErrorType = "unknown";
        }
      }
    },

    saveAndFinish() {
      this.steam.saveCreds(this.apiKey.trim(), this.idValidation.id);
      this.steam.setPhase("idle");
      this.$emit("sync");
    },
  },
});
</script>

<style scoped>
.wizard-fade-enter-active,
.wizard-fade-leave-active {
  transition: opacity 0.2s ease;
}
.wizard-fade-enter-from,
.wizard-fade-leave-to {
  opacity: 0;
}

.step-slide-enter-active,
.step-slide-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.step-slide-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.step-slide-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>
