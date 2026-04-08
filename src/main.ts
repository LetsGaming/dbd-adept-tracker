import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { IonicVue } from '@ionic/vue';
import App from './App.vue';
import router from './router';

/* Ionic core CSS */
import '@ionic/vue/css/ionic.bundle.css';

/* App styles (Tailwind + theme tokens) */
import './assets/main.css';

const app = createApp(App);

app.use(createPinia());
app.use(IonicVue, {
  mode: 'md',
  animated: true,
});
app.use(router);

router.isReady().then(() => app.mount('#app'));
