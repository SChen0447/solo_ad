import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';
import StarMap from '@/views/StarMap.vue';
import TradePanel from '@/views/TradePanel.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'StarMap',
    component: StarMap,
  },
  {
    path: '/trade/:stationId',
    name: 'TradePanel',
    component: TradePanel,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
