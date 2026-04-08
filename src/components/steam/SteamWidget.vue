<template>
  <div>
    <!-- Setup wizard -->
    <div
      v-if="steam.phase === 'setup'"
      class="rounded-2xl border border-[#2a475e] overflow-hidden mb-3.5"
      style="background: linear-gradient(145deg, #111d2c, #0a1520)"
    >
      <div
        class="px-6 pt-5 pb-4 flex items-center gap-3.5 border-b border-[#2a475e]"
        style="background: linear-gradient(135deg, #1b2838, #2a475e44)"
      >
        <span class="text-3xl">🎮</span>
        <div>
          <div class="font-display text-base font-bold text-[#66c0f4]">STEAM</div>
          <div class="text-xs text-[#8f98a0] mt-0.5">2 Schritte</div>
        </div>
      </div>

      <div class="p-6 space-y-6">
        <!-- Step 1: API Key -->
        <div class="flex gap-4">
          <div class="w-[30px] h-[30px] rounded-full bg-[#66c0f4] text-[#1b2838] font-black text-sm font-display flex items-center justify-center shrink-0">1</div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-sm text-[#c7d5e0] mb-2">API Key</div>
            <a
              href="https://steamcommunity.com/dev/apikey"
              target="_blank"
              class="text-sm text-[#66c0f4] border-b border-dashed border-[#66c0f4]"
            >steamcommunity.com/dev/apikey</a>
            <input
              v-model="apiKey"
              class="mt-2.5 w-full px-3.5 py-2.5 rounded-lg border border-[#2a475e] bg-[#0a152099] text-[var(--color-text-primary)] text-sm font-mono outline-none focus:border-[#66c0f4]"
              :class="{ 'border-red-400': apiKey && !keyValid, 'border-green-400': keyValid }"
              placeholder="API Key (32 Zeichen)"
              autocomplete="off"
            />
            <div
              class="text-xs mt-1.5 min-h-[18px]"
              :class="keyValid ? 'text-green-400' : apiKey ? 'text-red-400' : 'text-[#8f98a0]'"
            >{{ keyMsg }}</div>
          </div>
        </div>

        <!-- Step 2: Steam ID -->
        <div class="flex gap-4">
          <div class="w-[30px] h-[30px] rounded-full bg-[#66c0f4] text-[#1b2838] font-black text-sm font-display flex items-center justify-center shrink-0">2</div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-sm text-[#c7d5e0] mb-2">Steam ID</div>
            <input
              v-model="steamIdInput"
              class="w-full px-3.5 py-2.5 rounded-lg border border-[#2a475e] bg-[#0a152099] text-[var(--color-text-primary)] text-sm font-mono outline-none focus:border-[#66c0f4]"
              :class="{ 'border-red-400': steamIdInput && !idValid, 'border-green-400': idValid }"
              placeholder="Steam ID64 oder URL"
              autocomplete="off"
            />
            <div
              class="text-xs mt-1.5 min-h-[18px]"
              :class="idValid ? 'text-green-400' : steamIdInput ? 'text-red-400' : 'text-[#8f98a0]'"
            >{{ idMsg }}</div>
          </div>
        </div>
      </div>

      <div class="flex gap-3 px-6 pb-5">
        <button
          class="flex-1 py-3 rounded-xl border border-[#2a475e] text-[#8f98a0] font-bold text-sm font-display"
          @click="steam.setPhase('idle')"
        >Abbrechen</button>
        <button
          class="flex-1 py-3 rounded-xl border border-[#3949ab] text-white font-bold text-sm font-display transition-opacity"
          :class="canConnect ? 'opacity-100' : 'opacity-40 pointer-events-none'"
          style="background: linear-gradient(135deg, #1a237e, #4527a0)"
          @click="connect"
        >⚡ Verbinden</button>
      </div>
    </div>

    <!-- Connected / idle -->
    <div
      v-else-if="steam.hasCreds && steam.phase === 'idle'"
      class="flex items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-raised)] px-4 py-3.5 mb-3"
    >
      <div class="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0 animate-pulse" />
      <span class="flex-1 text-sm text-[var(--color-text-muted)]">
        <strong class="text-[#66c0f4]">Steam</strong>
      </span>
      <button
        class="rounded-md border border-[#2a475e] text-[#8f98a0] text-[11px] px-3 py-1.5 font-semibold hover:border-[#66c0f4] hover:text-[#66c0f4] min-h-[36px]"
        title="Achievements synchronisieren"
        @click="$emit('sync')"
      >⟳</button>
      <button
        class="rounded-md border border-[#2a475e] text-[#8f98a0] text-[11px] px-3 py-1.5 font-semibold hover:border-[#66c0f4] hover:text-[#66c0f4] min-h-[36px]"
        title="Cache leeren und neu synchronisieren"
        @click="$emit('force-sync')"
      >↺</button>
      <button
        class="rounded-md border border-[#2a475e] text-[#8f98a0] text-[11px] px-3 py-1.5 font-semibold hover:border-red-400 hover:text-red-400 min-h-[36px]"
        title="Steam-Verbindung trennen"
        @click="steam.clearCreds()"
      >✕</button>
    </div>

    <!-- Syncing / done / error -->
    <div
      v-else-if="['syncing', 'done', 'error'].includes(steam.phase)"
      class="w-full py-4 rounded-xl border text-center text-sm font-semibold mb-3"
      :class="{
        'border-[var(--color-border-medium)] text-[var(--color-text-muted)]': steam.phase === 'syncing',
        'border-green-500/30 text-green-500 bg-green-500/10': steam.phase === 'done',
        'border-red-500/30 text-red-500 bg-red-500/10': steam.phase === 'error',
      }"
    >
      <span v-if="steam.phase === 'syncing'" class="animate-spin inline-block">⟳</span>
      {{ steam.phase === 'syncing' ? 'Sync…' : steam.message }}
    </div>

    <!-- Not connected -->
    <button
      v-else
      class="w-full py-4 rounded-xl border border-[#66c0f4]/25 text-[#66c0f4] font-semibold text-sm flex items-center justify-center gap-2.5 mb-3 hover:brightness-110"
      style="background: linear-gradient(135deg, #1b2838, #2a475e)"
      @click="steam.setPhase('setup')"
    >
      <span class="text-xl">🎮</span> Steam verbinden
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState, mapActions } from 'pinia';
import { useSteamStore } from '@/stores';

export default defineComponent({
  name: 'SteamWidget',
  emits: ['sync', 'force-sync'],
  data() {
    return {
      apiKey: '',
      steamIdInput: '',
    };
  },
  computed: {
    steam() {
      return useSteamStore();
    },
    keyValidation() {
      return this.steam.validateKey(this.apiKey);
    },
    idValidation() {
      return this.steam.parseSteamId(this.steamIdInput);
    },
    keyValid(): boolean { return this.keyValidation.valid; },
    keyMsg(): string { return this.keyValidation.msg; },
    idValid(): boolean { return this.idValidation.valid; },
    idMsg(): string { return this.idValidation.msg; },
    canConnect(): boolean { return this.keyValid && this.idValid; },
  },
  methods: {
    connect(): void {
      if (!this.canConnect) return;
      this.steam.saveCreds(this.apiKey.trim(), this.idValidation.id);
      this.steam.setPhase('idle');
    },
  },
});
</script>
