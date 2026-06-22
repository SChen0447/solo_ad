<script setup lang="ts">import { computed, inject, ref } from 'vue';
import NarrativeScene from './NarrativeScene.vue';
import { progressKey, type ScrollEngine } from './scroll-engine';
const engine = inject<ScrollEngine>(progressKey);
interface SceneConfig {
 id: string;
 index: number;
 title: string;
 subtitle: string;
 description: string;
 colorStart: string;
 colorEnd: string;
 particles: Array<{
 left: string;
 top: string;
 size: number;
 color: string;
 }>;
}
const scenes: SceneConfig[] = [
 {
 id: 'scene-1',
 index: 0,
 title: '第一章 · 启程',
 subtitle: '探索未知的边界',
 description: '在数字世界的深处，每一次滚动都是一次新的发现。让我们跟随光的指引，穿越代码构筑的梦境，探寻隐藏在像素背后的故事。每一个元素都有它出场的时机，每一次动画都承载着情感的流动。',
 colorStart: '#0f0f1a',
 colorEnd: '#1a1a3e',
 particles: [
 { left: '10%', top: '20%', size: 80, color: '#3498db' },
 { left: '75%', top: '60%', size: 100, color: '#2980b9' },
 { left: '45%', top: '80%', size: 60, color: '#1abc9c' }
 ]
 },
 {
 id: 'scene-2',
 index: 1,
 title: '第二章 · 幻境',
 subtitle: '色彩与光影的交织',
 description: '紫色的迷雾在虚空中蔓延，如同思绪在深夜中游走。每一个像素都在诉说着独特的语言，每一次滚动都揭开新的篇章。在这里，时间不再是线性的，而是随着你的指尖缓缓流动。',
 colorStart: '#2d1b4e',
 colorEnd: '#4a2c6e',
 particles: [
 { left: '20%', top: '30%', size: 90, color: '#9b59b6' },
 { left: '80%', top: '25%', size: 70, color: '#8e44ad' },
 { left: '55%', top: '70%', size: 85, color: '#e74c3c' }
 ]
 },
 {
 id: 'scene-3',
 index: 2,
 title: '第三章 · 生机',
 subtitle: '自然力量的觉醒',
 description: '翠绿从地平线涌起，生命的旋律在空气中回荡。这是万物复苏的季节，每一个动画元素都如同新芽破土而出，带着对世界的好奇与渴望。滚动吧，让生命的力量在屏幕上绽放。',
 colorStart: '#1a3e2d',
 colorEnd: '#2e6e4a',
 particles: [
 { left: '15%', top: '70%', size: 95, color: '#27ae60' },
 { left: '70%', top: '40%', size: 75, color: '#2ecc71' },
 { left: '40%', top: '15%', size: 65, color: '#16a085' }
 ]
 },
 {
 id: 'scene-4',
 index: 3,
 title: '第四章 · 温暖',
 subtitle: '夕阳下的沉思',
 description: '暖橙色的光芒洒满整个世界，如同黄昏时分的余晖。这是一段温柔的旅程，每一个元素都带着温度，每一次过渡都如同拥抱。让我们在这温暖的色调中，回顾来时的路。',
 colorStart: '#4e2d1b',
 colorEnd: '#6e4a2e',
 particles: [
 { left: '25%', top: '50%', size: 85, color: '#e67e22' },
 { left: '85%', top: '75%', size: 80, color: '#d35400' },
 { left: '60%', top: '20%', size: 70, color: '#f39c12' }
 ]
 },
 {
 id: 'scene-5',
 index: 4,
 title: '第五章 · 终章',
 subtitle: '永恒的回响',
 description: '金色与红色交织，故事走向高潮。每一个动画元素都在诉说着最终的篇章，每一次滚动都向着终点迈进。但结束也是新的开始，当你回望这段旅程，会发现最美的风景其实在路上。',
 colorStart: '#3e1a1a',
 colorEnd: '#6e2e2e',
 particles: [
 { left: '30%', top: '40%', size: 100, color: '#e74c3c' },
 { left: '75%', top: '65%', size: 90, color: '#c0392b' },
 { left: '50%', top: '25%', size: 75, color: '#f1c40f' }
 ]
 }
];
const activeIndex = computed(() => engine?.activeSceneIndex.value ?? 0);
const isScrolling = computed(() => engine?.isScrolling.value ?? false);
const currentSceneTitle = computed(() => {
 const scene = scenes[activeIndex.value];
 return scene?.title ?? '';
});
const titleVisible = computed(() => {
 return !isScrolling.value || activeIndex.value >= 0;
});
const scrollToScene = (index: number) => {
 engine?.scrollToScene(index);
};
const navIndicatorStyle = computed(() => ({
 opacity: isScrolling.value ? 0.3 : 1,
 transition: 'opacity 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)'
}));
const titleStyle = computed(() => ({
 opacity: titleVisible.value ? 1 : 0,
 transform: titleVisible.value ? 'translateY(0)' : 'translateY(20px)',
 transition: 'all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)'
}));
</script>

<template>
  <div class="app-container">
    <header class="page-header" :style="titleStyle">
      <div class="header-content">
        <span class="current-title">{{ currentSceneTitle }}</span>
      </div>
    </header>

    <nav class="nav-indicator" :style="navIndicatorStyle">
      <div class="nav-dots">
        <button
          v-for="scene in scenes"
          :key="scene.id"
          class="nav-dot"
          :class="{ active: activeIndex === scene.index }"
          :aria-label="`跳转到${scene.title}`"
          @click="scrollToScene(scene.index)"
        >
          <span class="dot-inner"></span>
        </button>
      </div>
    </nav>

    <main class="scenes-container">
      <NarrativeScene
        v-for="scene in scenes"
        :key="scene.id"
        :scene-id="scene.id"
        :scene-index="scene.index"
        :title="scene.title"
        :subtitle="scene.subtitle"
        :description="scene.description"
        :color-start="scene.colorStart"
        :color-end="scene.colorEnd"
