<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStarMap } from '@/composables/useStarMap';
import { useGameState } from '@/composables/useGameState';
import { getFactionById } from '@/data/factions';
import { getGoodsById } from '@/data/goods';
import type { StationGoods, CargoItem } from '@/types/game';

const route = useRoute();
const router = useRouter();
const stationId = computed(() => route.params.stationId as string);

const { stations, init } = useStarMap();
const {
  player,
  displayCredits,
  isLowFuel,
  cargoSlots,
  subtractCredits,
  addCredits,
  addToCargo,
  removeFromCargo,
  getCargoQuantity,
  refuel,
  persistGame,
} = useGameState();

const station = computed(() => stations.value.find(s => s.id === stationId.value));
const stationFaction = computed(() => station.value ? getFactionById(station.value.factionId) : null);

const tradeQuantity = ref<Record<string, number>>({});
const message = ref<string | null>(null);
const messageType = ref<'success' | 'error'>('success');
const isRefueling = ref(false);

function getTradeQuantity(goodsId: string): number {
  return tradeQuantity.value[goodsId] ?? 1;
}

function setTradeQuantity(goodsId: string, value: number): void {
  tradeQuantity.value[goodsId] = Math.max(1, value);
}

function showMessage(msg: string, type: 'success' | 'error'): void {
  message.value = msg;
  messageType.value = type;
  setTimeout(() => {
    message.value = null;
  }, 2000);
}

function buyGoods(goods: StationGoods): void {
  const quantity = getTradeQuantity(goods.goodsId);
  const totalCost = goods.buyPrice * quantity;

  if (player.credits < totalCost) {
    showMessage('信用点不足！', 'error');
    return;
  }

  if (goods.stock < quantity) {
    showMessage('空间站库存不足！', 'error');
    return;
  }

  if (!addToCargo(goods.goodsId, quantity)) {
    showMessage('货仓已满或堆叠超限！', 'error');
    return;
  }

  subtractCredits(totalCost);
  goods.stock -= quantity;
  showMessage(`成功购买 ${getGoodsById(goods.goodsId).name} x${quantity}`, 'success');
}

function sellGoods(cargoItem: CargoItem): void {
  if (!station.value) return;

  const quantity = getTradeQuantity(cargoItem.goodsId);
  const stationGoods = station.value.goods.find(g => g.goodsId === cargoItem.goodsId);

  if (!stationGoods) {
    showMessage('该空间站不收购此货物！', 'error');
    return;
  }

  if (cargoItem.quantity < quantity) {
    showMessage('货物数量不足！', 'error');
    return;
  }

  const totalEarning = stationGoods.sellPrice * quantity;
  removeFromCargo(cargoItem.goodsId, quantity);
  addCredits(totalEarning);
  stationGoods.stock += quantity;
  showMessage(`成功出售 ${getGoodsById(cargoItem.goodsId).name} x${quantity}，获得 ${totalEarning} 信用点`, 'success');
}

function handleRefuel(amount: number): void {
  const actualAmount = Math.min(amount, 100 - player.fuel);
  if (actualAmount <= 0) {
    showMessage('燃料已满！', 'error');
    return;
  }

  const cost = actualAmount * 5;
  if (player.credits < cost) {
    showMessage('信用点不足！', 'error');
    return;
  }

  isRefueling.value = true;
  setTimeout(() => {
    refuel(actualAmount);
    isRefueling.value = false;
    showMessage(`补充了 ${actualAmount}% 燃料`, 'success');
  }, 500);
}

function backToMap(): void {
  persistGame();
  router.push('/');
}

function getPriceClass(trend: 'up' | 'down' | 'stable'): string {
  if (trend === 'up') return 'price-up';
  if (trend === 'down') return 'price-down';
  return '';
}

function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  if (trend === 'up') return '↑';
  if (trend === 'down') return '↓';
  return '→';
}

onMounted(() => {
  if (stations.value.length === 0) {
    init();
  }
});
</script>

<template>
  <div class="trade-panel-container">
    <div class="top-status-bar glass-panel">
      <div class="status-section">
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
      </div>

      <div v-if="station" class="station-info">
        <span
          class="faction-dot"
          :style="{ backgroundColor: stationFaction?.color }"
        ></span>
        <span class="station-name">{{ station.name }}</span>
        <span class="faction-name">{{ stationFaction?.name }}</span>
      </div>

      <button class="neon-btn back-btn" @click="backToMap">
        🚀 返回星图
      </button>
    </div>

    <div class="trade-content">
      <div class="trade-column left-column">
        <div class="column-header glass-panel">
          <h2>📦 空间站货物</h2>
        </div>
        <div class="goods-list">
          <div
            v-for="goods in station?.goods"
            :key="goods.goodsId"
            class="goods-card"
          >
            <div class="goods-info">
              <span class="goods-icon">{{ getGoodsById(goods.goodsId).icon }}</span>
              <div class="goods-details">
                <span class="goods-name">{{ getGoodsById(goods.goodsId).name }}</span>
                <span class="goods-stock">库存: {{ goods.stock }}</span>
              </div>
            </div>
            <div class="goods-price">
              <span class="price-label">买入</span>
              <span
                class="price-value"
                :class="getPriceClass(goods.priceTrend)"
              >
                {{ goods.buyPrice }}¢
                <span class="trend-icon">{{ getTrendIcon(goods.priceTrend) }}</span>
              </span>
            </div>
            <div class="goods-actions">
              <div class="quantity-control">
                <button
                  class="qty-btn"
                  @click="setTradeQuantity(goods.goodsId, getTradeQuantity(goods.goodsId) - 1)"
                >
                  -
                </button>
                <span class="qty-value">{{ getTradeQuantity(goods.goodsId) }}</span>
                <button
                  class="qty-btn"
                  @click="setTradeQuantity(goods.goodsId, getTradeQuantity(goods.goodsId) + 1)"
                >
                  +
                </button>
              </div>
              <button
                class="neon-btn buy-btn"
                :disabled="player.credits < goods.buyPrice * getTradeQuantity(goods.goodsId)"
                @click="buyGoods(goods)"
              >
                买入
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="trade-column right-column">
        <div class="column-header glass-panel">
          <h2>🚀 飞船货仓</h2>
          <span class="cargo-count">{{ cargoSlots.filter(s => s && s.quantity > 0).length }}/8</span>
        </div>

        <div class="cargo-grid">
          <div
            v-for="(slot, index) in cargoSlots"
            :key="index"
            class="cargo-slot"
            :class="{ filled: slot && slot.quantity > 0 }"
          >
            <template v-if="slot && slot.quantity > 0">
              <span class="cargo-icon">{{ getGoodsById(slot.goodsId).icon }}</span>
              <span class="cargo-name">{{ getGoodsById(slot.goodsId).name }}</span>
              <span class="cargo-qty">x{{ slot.quantity }}</span>
              <div class="cargo-actions">
                <button
                  class="neon-btn sell-btn"
                  :disabled="!station?.goods.find(g => g.goodsId === slot.goodsId)"
                  @click="sellGoods(slot)"
                >
                  卖出
                </button>
              </div>
            </template>
            <template v-else>
              <span class="empty-slot">空</span>
            </template>
          </div>
        </div>

        <div class="refuel-section glass-panel">
          <h3>⛽ 燃料补充</h3>
          <p class="refuel-cost">每1%燃料需要 5 信用点</p>
          <div class="refuel-buttons">
            <button
              class="neon-btn refuel-btn"
              :disabled="player.fuel >= 100 || player.credits < 50 || isRefueling"
              @click="handleRefuel(10)"
            >
              +10%
            </button>
            <button
              class="neon-btn refuel-btn"
              :disabled="player.fuel >= 100 || player.credits < 250 || isRefueling"
              @click="handleRefuel(50)"
            >
              +50%
            </button>
            <button
              class="neon-btn refuel-btn"
              :disabled="player.fuel >= 100 || isRefueling"
              @click="handleRefuel(100)"
            >
              加满
            </button>
          </div>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="message" class="toast" :class="messageType">
        {{ message }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.trade-panel-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  position: relative;
  animation: fadeIn 0.3s ease;
}

.top-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  margin-bottom: 20px;
}

.status-section {
  display: flex;
  gap: 32px;
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

.fuel-item {
  min-width: 200px;
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

.station-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.faction-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

.station-name {
  font-size: 18px;
  font-weight: 700;
}

.faction-name {
  font-size: 14px;
  color: var(--color-text-muted);
}

.back-btn {
  padding: 10px 20px;
  font-size: 14px;
}

.trade-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  min-height: 0;
}

.trade-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.column-header h2 {
  font-size: 16px;
  font-weight: 700;
}

.cargo-count {
  font-size: 14px;
  color: var(--color-neon-start);
  font-family: 'Press Start 2P', cursive;
  font-size: 12px;
}

.goods-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.goods-list::-webkit-scrollbar {
  width: 6px;
}

.goods-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.goods-list::-webkit-scrollbar-thumb {
  background: var(--color-neon-start);
  border-radius: 3px;
}

.goods-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-glass-border);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.goods-card:hover {
  background: rgba(0, 245, 212, 0.08);
  border-color: var(--color-neon-start);
  transform: translateX(4px);
}

.goods-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.goods-icon {
  font-size: 28px;
}

.goods-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.goods-name {
  font-weight: 600;
  font-size: 14px;
}

.goods-stock {
  font-size: 12px;
  color: var(--color-text-muted);
}

.goods-price {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 100px;
}

.price-label {
  font-size: 11px;
  color: var(--color-text-muted);
}

.price-value {
  font-family: 'Press Start 2P', cursive;
  font-size: 14px;
  font-weight: 700;
}

.trend-icon {
  font-size: 12px;
  margin-left: 4px;
}

.goods-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  overflow: hidden;
}

.qty-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: white;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.qty-btn:hover {
  background: var(--color-neon-start);
  color: #0d1b2a;
}

.qty-value {
  min-width: 32px;
  text-align: center;
  font-weight: 700;
  font-size: 14px;
}

.buy-btn {
  padding: 8px 16px;
  font-size: 13px;
}

.cargo-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.cargo-slot {
  aspect-ratio: 1;
  border: 2px dashed var(--color-glass-border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.cargo-slot.filled {
  border-style: solid;
  border-color: var(--color-neon-start);
  background: rgba(0, 245, 212, 0.08);
}

.cargo-slot:hover {
  transform: scale(1.03);
  border-color: var(--color-neon-end);
}

.cargo-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.cargo-name {
  font-size: 11px;
  text-align: center;
  line-height: 1.2;
  margin-bottom: 2px;
}

.cargo-qty {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-neon-start);
  font-family: 'Press Start 2P', cursive;
}

.cargo-actions {
  margin-top: 6px;
}

.sell-btn {
  padding: 4px 10px;
  font-size: 11px;
}

.empty-slot {
  font-size: 14px;
  color: var(--color-text-muted);
}

.refuel-section {
  padding: 20px;
}

.refuel-section h3 {
  font-size: 15px;
  margin-bottom: 8px;
}

.refuel-cost {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 16px;
}

.refuel-buttons {
  display: flex;
  gap: 12px;
}

.refuel-btn {
  flex: 1;
  padding: 12px;
  font-size: 13px;
}

.toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  padding: 16px 32px;
  border-radius: 10px;
  font-weight: 600;
  z-index: 100;
  animation: slideUp 0.3s ease;
}

.toast.success {
  background: rgba(6, 214, 160, 0.9);
  color: #0d1b2a;
  box-shadow: 0 0 20px rgba(6, 214, 160, 0.5);
}

.toast.error {
  background: rgba(230, 57, 70, 0.9);
  color: white;
  box-shadow: 0 0 20px rgba(230, 57, 70, 0.5);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
