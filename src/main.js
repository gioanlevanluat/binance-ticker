import { createApp } from 'vue';
import App from './App.vue';
import './assets/styles/tailwind.css';
import Vue3Toastify from "vue3-toastify";
import "vue3-toastify/dist/index.css";

const app = createApp(App);
app.config.productionTip = false;
app.use(Vue3Toastify);
app.mount('#app');