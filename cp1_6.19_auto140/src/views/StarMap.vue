<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useStarMap } from '@/composables/useStarMap';
import { useGameState } from '@/composables/useGameState';
import { getFactionById } from '@/data/factions';
import { getGoodsById } from '@/data/goods';
import type { Station, Position, GameEvent } from '@/types/game';
import EventModal from '@/components/EventModal.vue';

const router = useRouter();
const { stations, init, mapSeed } = useStarMap();
const {
  player,
  displayCredits,
  isLowFuel,
  canFly,
  consumeFuel,
  updatePosition,
  setCurrentStation,
  setFlying,
  triggerEvent,
  currentEvent,
  isFlying,
} = useGameState();

const mapContainerRef = ref<HTMLElement | null>(null);
const hoveredStation = ref<Station | null>(null);
const tooltipPosition = reactive<Position>({ x: 0, y: 0 });
const shipRotation = ref(0);
const showEventModal = ref(false);
const eventResult = ref<string | null>(null);

const shipPosition = computed(() => ({
  left: `${player.position.x}px`,
  top: `${player.position.y}px`,
  transform: `translate(-50%, -50%) rotate(${shipRotation.value}deg)`,
}));

function generateRandomEvent(): GameEvent | null {
  const isPirate = Math.random() < 0.6;

  if (isPirate) {
    const ransom = Math.floor(Math.random() * 500) + 200;
    return {
      type: 'pirate',
      title: '⚠️ 星际海盗拦截！',
      description: `一艘海盗船拦住了你的航线，要求支付 ${ransom} 信用点作为过路费。`,
      data: { ransom },
    };
  }

  const goodsCount = Math.floor(Math.random() * 3) + 1;
  const goods = [];
  const availableGoods = ['water', 'food', 'metal', 'electronics', 'medicine'];
  for (let i = 0; i < goodsCount; i++) {
    goods.push({
      goodsId: availableGoods[Math.floor(Math.random() * availableGoods.length)],
      quantity: Math.floor(Math.random() * 3) + 1,
    });
  }

  const goodsDesc = goods.map(g => `${getGoodsById(g.goodsId).name} x${g.quantity}`).join('、');
  return {
    type: 'drift',
    title: '✨ 发现漂流货物！',
    description: `雷达探测到附近有漂流的货物舱，里面可能有：${goodsDesc}`,
    data: { goods },
  };
}

function flyToStation(station: Station): void {
  if (!canFly.value || isFlying.value) return;
  if (player.currentStationId === station.id) {
    router.push(`/trade/${station.id}`);
    return;
  }

  setFlying(true);
  const startPos = { ...player.position };
  const endPos = { ...station.position };

  const dx = endPos.x - startPos.x;
  const dy = endPos.y - startPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  shipRotation.value = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

  const baseDuration = 1000 + Math.random() * 2000;
  const duration = isLowFuel.value ? baseDuration * 2 : baseDuration;

  const startTime = performance.now();
  let eventTriggered = false;
  const eventTriggerPoint = 0.4 + Math.random() * 0.3;

  consumeFuel(10);

  function animate(currentTime: number): void {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentX = startPos.x + dx * easeProgress;
    const currentY = startPos.y + dy * easeProgress;

    updatePosition({ x: currentX, y: currentY });

    if (!eventTriggered && progress > eventTriggerPoint && Math.random() < 0.15) {
      eventTriggered = true;
      const event = generateRandomEvent();
      if (event) {
        triggerEvent(event);
        showEventModal.value = true;
        return;
      }
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      updatePosition(endPos);
      setCurrentStation(station.id);
      setFlying(false);
      router.push(`/trade/${station.id}`);
    }
  }

  requestAnimationFrame(animate);
}

function continueFlight(): void {
  if (!currentEvent.value) return;

  const targetStation = stations.value.find(
    s => s.id !== player.currentStationId
  );
  if (!targetStation) return;

  const startPos = { ...player.position };
  const endPos = { ...targetStation.position };
  const dx = endPos.x - startPos.x;
  const dy = endPos.y - startPos.y;

  const remainingProgress = 0.6;
  const remainingDuration = 1500;
  const startTime = performance.now();

  function animate(currentTime: number): void {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / remainingDuration, 1);
    const totalProgress = 0.4 + remainingProgress * progress;

    const currentX = startPos.x + dx * totalProgress;
    const currentY = startPos.y + dy * totalProgress;

    updatePosition({ x: currentX, y: currentY });

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      updatePosition(endPos);
      setCurrentStation(targetStation.id);
      setFlying(false);
      router.push(`/trade/${targetStation.id}`);
    }
  }

  requestAnimationFrame(animate);
}

function onStationHover(station: Station, event: MouseEvent): void {
  hoveredStation.value = station;
  if (mapContainerRef.value) {
    const rect = mapContainerRef.value.getBoundingClientRect();
    tooltipPosition.x = event.clientX - rect.left + 15;
    tooltipPosition.y = event.clientY - rect.top + 15;
  }
}

function onStationLeave(): void {
  hoveredStation.value = null;
}

function getStationColor(factionId: string): string {
  return getFactionById(factionId).color;
}

function handleEventResult(result: string): void {
  eventResult.value = result;
  setTimeout(() => {
    showEventModal.value = false;
    eventResult.value = null;
    if (isFlying.value) {
      continueFlight();
    }
  }, 1500);
}

onMounted(() => {
  init();
});
</script>

<template>
  <div class="star-map-container">
    <div class="top-status-bar glass-panel">
      <div class="status-item">
        <span class="status-label">💰 信用点</span>
        <span class="status-value credits">{{ displayCredits.toLocaleString() }}</span>
      </div>
      <div class="status-item fuel-item">
        <span class="status-label">⛽ 燃料</span>
        <div class="fuel-info">
          <div class="fuel-bar">
            <div
              class="fuel-fill"
              :class="{ low: isLowFuel }"
              :style="{ width: `${player.fuel}%` }"
            ></div>
          </div>
          <span class="fuel-text">{{ player.fuel }}%</span>
        </div>
      </div>
      <div class="status-item">
        <span class="status-label">📍 种子</span>
        <span class="status-value seed">{{ mapSeed }}</span>
      </div>
    </div>

    <div class="map-wrapper">
      <div ref="mapContainerRef" class="map-container">
        <svg class="flight-lines" v-if="hoveredStation && player.currentStationId">
          <line
            :x1="player.position.x"
            :y1="player.position.y"
            :x2="hoveredStation.position.x"
            :y2="hoveredStation.position.y"
            stroke="rgba(0, 245, 212, 0.3)"
            stroke-width="2"
            stroke-dasharray="8,4"
          />
        </svg>

        <div
          v-for="station in stations"
          :key="station.id"
          class="station-dot"
          :style="{
            left: `${station.position.x}px`,
            top: `${station.position.y}px`,
            backgroundColor: getStationColor(station.factionId),
            boxShadow: `0 0 15px ${getStationColor(station.factionId)}80`,
            animationDelay: `${Math.random() * 2}s`,
          }"
          @click="flyToStation(station)"
          @mouseenter="onStationHover(station, $event)"
          @mouseleave="onStationLeave"
        >
          <div
            v-if="player.currentStationId === station.id"
            class="current-indicator"
          ></div>
        </div>

        <div class="ship-icon" :style="shipPosition"></div>

        <div
          v-if="hoveredStation"
          class="tooltip"
          :style="{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
          }"
        >
          <div class="tooltip-header">
            <span
              class="faction-dot"
              :style="{ backgroundColor: getStationColor(hoveredStation.factionId) }"
            ></span>
            <span class="station-name">{{ hoveredStation.name }}</span>
          </div>
          <div class="tooltip-faction">
            {{ getFactionById(hoveredStation.factionId).name }}
          </div>
          <div class="tooltip-goods">
            <div class="goods-title">货物报价：</div>
            <div
              v-for="goods in hoveredStation.goods.slice(0, 4)"
              :key="goods.goodsId"
              class="goods-row"
            >
              <span>{{ getGoodsById(goods.goodsId).icon }} {{ getGoodsById(goods.goodsId).name }}</span>
              <span
                class="price"
                :class="{
                  'price-up': goods.priceTrend === 'up',
                  'price-down': goods.priceTrend === 'down',
                }"
              >
                {{ goods.buyPrice }}¢
              </span>
            </div>
          </div>
          <div v-if="player.currentStationId === hoveredStation.id" class="tooltip-hint">
            点击进入贸易站
          </div>
          <div v-else-if="!canFly" class="tooltip-hint disabled">
            燃料不足
          </div>
          <div v-else class="tooltip-hint">
            点击前往
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-hint">
      <span v-if="isFlying">🚀 正在航行中...</span>
      <span v-else>点击空间站开始贸易之旅</span>
    </div>

    <EventModal
      v-if="showEventModal && currentEvent"
      :event="currentEvent"
      :result="eventResult"
      @result="handleEventResult"
    />
  </div>
</template>

<style scoped>
.star-map-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  position: relative;
}

.top-status-bar {
  display: flex;
  gap: 32px;
  padding: 16px 24px;
  margin-bottom: 20px;
  align-items: center;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.status-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.status-value.credits {
  color: var(--color-neon-start);
  font-family: 'Press Start 2P', cursive;
  font-size: 16px;
}

.status-value.seed {
  font-size: 14px;
  color: var(--color-text-muted);
  font-family: monospace;
}

.fuel-item {
  flex: 1;
  max-width: 200px;
}

.fuel-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fuel-bar {
  flex: 1;
  height: 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  overflow: hidden;
}

.fuel-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-neon-start) 0%, var(--color-neon-end) 100%);
  transition: width 0.3s ease;
  border-radius: 6px;
}

.fuel-fill.low {
  background: linear-gradient(90deg, #e63946 0%, #ff6b6b 100%);
}

.fuel-text {
  font-size: 14px;
  font-weight: 700;
  min-width: 45px;
  text-align: right;
}

.map-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.map-container {
  position: relative;
  width: 1000px;
  height: 700px;
  background: radial-gradient(ellipse at center, rgba(0, 187, 249, 0.05) 0%, transparent 70%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
}

.flight-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.current-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 12px;
  height: 12px;
  background: var(--color-neon-start);
  border-radius: 50%;
  animation: pulse 1s ease-in-out infinite;
  box-shadow: 0 0 10px var(--color-neon-start);
}

.tooltip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.faction-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.station-name {
  font-weight: 700;
  font-size: 14px;
}

.tooltip-faction {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

.tooltip-goods {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 8px;
}

.goods-title {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 6px;
}

.goods-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 2px 0;
}

.price {
  font-weight: 700;
  font-family: 'Press Start 2P', cursive;
  font-size: 10px;
}

.tooltip-hint {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 12px;
  color: var(--color-neon-start);
  text-align: center;
}

.tooltip-hint.disabled {
  color: #e63946;
}

.bottom-hint {
  text-align: center;
  padding: 12px;
  color: var(--color-text-muted);
  font-size: 14px;
}
</style>
