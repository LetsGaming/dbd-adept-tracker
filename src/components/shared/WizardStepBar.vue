<template>
  <div class="flex gap-1.5">
    <div
      v-for="i in totalSteps"
      :key="i"
      class="h-1 flex-1 rounded-full transition-all duration-300"
      :class="i <= currentStep ? 'bg-[#66c0f4]' : 'bg-[#2a475e]'"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'WizardStepBar',
  props: {
    totalSteps: { type: Number, required: true },
    currentStep: { type: Number, required: true },
  },
});
</script>
