import { createRouter, createWebHistory } from "@ionic/vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/tracker" },
  {
    path: "/tracker",
    name: "tracker",
    component: () => import("@/views/TrackerView.vue"),
  },
  {
    path: "/stats",
    name: "stats",
    component: () => import("@/views/StatsView.vue"),
  },
  {
    path: "/tierlist",
    name: "tierlist",
    component: () => import("@/views/TierListView.vue"),
  },
  {
    path: "/compare",
    name: "compare",
    component: () => import("@/views/CompareView.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
