<template>
  <ion-modal :is-open="isOpen" @did-dismiss="$emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title :style="titleStyle">{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">Schließen</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <slot />
    </ion-content>
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
} from '@ionic/vue';

export default defineComponent({
  name: 'AppModal',
  components: { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent },
  props: {
    isOpen: { type: Boolean, default: false },
    title: { type: String, default: '' },
    titleColor: { type: String, default: '' },
  },
  emits: ['close'],
  computed: {
    titleStyle(): Record<string, string> {
      return this.titleColor ? { color: this.titleColor } : {};
    },
  },
});
</script>
