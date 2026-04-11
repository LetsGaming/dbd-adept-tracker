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
        <span class="text-3xl">{{ icon }}</span>
        <div class="flex-1 min-w-0">
          <div class="font-display text-base font-bold text-[#66c0f4]">
            {{ title }}
          </div>
          <div class="text-xs text-[#8f98a0] mt-0.5">{{ subtitle }}</div>
        </div>
        <button
          class="text-[#8f98a0] hover:text-[#c7d5e0] text-lg leading-none p-1"
          :title="closeLabel"
          @click="$emit('close')"
        >✕</button>
      </div>
      <WizardStepBar :total-steps="totalSteps" :current-step="currentStep" />
    </div>

    <!-- Body slot -->
    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import WizardStepBar from '@/components/shared/WizardStepBar.vue';

export default defineComponent({
  name: 'SteamCard',
  components: { WizardStepBar },
  props: {
    icon: { type: String, default: '🎮' },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    totalSteps: { type: Number, required: true },
    currentStep: { type: Number, required: true },
    closeLabel: { type: String, default: 'Schließen' },
  },
  emits: ['close'],
});
</script>
