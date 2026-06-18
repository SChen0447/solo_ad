import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'InspirationBoard',
    component: () => import('../views/InspirationBoard.vue')
  },
  {
    path: '/editor/:id',
    name: 'ColorPaletteEditor',
    component: () => import('../views/ColorPaletteEditor.vue'),
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
