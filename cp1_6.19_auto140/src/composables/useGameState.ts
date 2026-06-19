import { ref, reactive, computed, watch } from 'vue';
import type { PlayerState, Position, GameEvent, CargoItem } from '@/types/game';
import { GOODS_LIST } from '@/data/goods';
import { loadGame, saveGame, clearGame } from '@/utils/storage';

const STORAGE_KEY = 'stellar_trader_save';

const player = reactive<PlayerState>({
  credits: 5000,
  fuel: 100,
  position: { x: 500, y: 375 },
  currentStationId: null,
  cargo: [],
  maxCargoSlots: 8,
  maxStackSize: 99,
});

const isFlying = ref(false);
const currentEvent = ref<GameEvent | null>(null);
const displayCredits = ref(5000);
const isAnimatingCredits = ref(false);

export function useGameState() {
  const cargoSlots = computed(() => {
    const slots: (CargoItem | null)[] = [];
    for (let i = 0; i < player.maxCargoSlots; i++) {
      slots.push(player.cargo[i] ?? null);
    }
    return slots;
  });

  const cargoCount = computed(() => player.cargo.filter(c => c.quantity > 0).length);
  const isLowFuel = computed(() => player.fuel < 20);
  const canFly = computed(() => !isFlying.value && player.fuel >= 10);

  function animateCredits(target: number): void {
    if (isAnimatingCredits.value) return;
    isAnimatingCredits.value = true;

    const start = displayCredits.value;
    const diff = target - start;
    const duration = 500;
    const startTime = performance.now();

    function update(currentTime: number): void {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      displayCredits.value = Math.round(start + diff * easeProgress);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        displayCredits.value = target;
        isAnimatingCredits.value = false;
      }
    }

    requestAnimationFrame(update);
  }

  function addCredits(amount: number): void {
    player.credits += amount;
    animateCredits(player.credits);
    persistGame();
  }

  function subtractCredits(amount: number): boolean {
    if (player.credits < amount) return false;
    player.credits -= amount;
    animateCredits(player.credits);
    persistGame();
    return true;
  }

  function consumeFuel(amount: number = 10): boolean {
    if (player.fuel < amount) return false;
    player.fuel = Math.max(0, player.fuel - amount);
    persistGame();
    return true;
  }

  function refuel(amount: number): boolean {
    const cost = amount * 5;
    if (player.credits < cost) return false;
    player.credits -= cost;
    animateCredits(player.credits);
    player.fuel = Math.min(100, player.fuel + amount);
    persistGame();
    return true;
  }

  function updatePosition(pos: Position): void {
    player.position = { ...pos };
  }

  function setCurrentStation(stationId: string | null): void {
    player.currentStationId = stationId;
    persistGame();
  }

  function findCargoSlot(goodsId: string): number {
    return player.cargo.findIndex(c => c.goodsId === goodsId);
  }

  function findEmptySlot(): number {
    for (let i = 0; i < player.maxCargoSlots; i++) {
      if (!player.cargo[i] || player.cargo[i].quantity === 0) {
        return i;
      }
    }
    return -1;
  }

  function addToCargo(goodsId: string, quantity: number): boolean {
    const existingIndex = findCargoSlot(goodsId);
    if (existingIndex >= 0) {
      const newQuantity = player.cargo[existingIndex].quantity + quantity;
      if (newQuantity > player.maxStackSize) return false;
      player.cargo[existingIndex].quantity = newQuantity;
      persistGame();
      return true;
    }

    const emptyIndex = findEmptySlot();
    if (emptyIndex < 0) return false;
    if (quantity > player.maxStackSize) return false;

    if (player.cargo[emptyIndex]) {
      player.cargo[emptyIndex] = { goodsId, quantity };
    } else {
      player.cargo.push({ goodsId, quantity });
    }
    persistGame();
    return true;
  }

  function removeFromCargo(goodsId: string, quantity: number): boolean {
    const existingIndex = findCargoSlot(goodsId);
    if (existingIndex < 0) return false;
    if (player.cargo[existingIndex].quantity < quantity) return false;

    player.cargo[existingIndex].quantity -= quantity;
    if (player.cargo[existingIndex].quantity === 0) {
      player.cargo.splice(existingIndex, 1);
    }
    persistGame();
    return true;
  }

  function getCargoQuantity(goodsId: string): number {
    const item = player.cargo.find(c => c.goodsId === goodsId);
    return item?.quantity ?? 0;
  }

  function setFlying(flying: boolean): void {
    isFlying.value = flying;
  }

  function triggerEvent(event: GameEvent): void {
    currentEvent.value = event;
  }

  function clearEvent(): void {
    currentEvent.value = null;
  }

  function handlePirateEvent(choice: 'pay' | 'fight'): { success: boolean; message: string } {
    const event = currentEvent.value;
    if (!event || event.type !== 'pirate') {
      return { success: false, message: '无效事件' };
    }

    if (choice === 'pay') {
      const ransom = event.data?.ransom ?? 500;
      if (subtractCredits(ransom)) {
        clearEvent();
        return { success: true, message: `支付了 ${ransom} 信用点，海盗放过了你。` };
      }
      return { success: false, message: '信用点不足，海盗发起攻击！' };
    }

    const success = Math.random() < 0.4;
    if (success) {
      clearEvent();
      return { success: true, message: '战斗胜利！海盗仓皇逃窜。' };
    }

    const loss = Math.floor(player.credits * 0.5);
    subtractCredits(loss);
    clearEvent();
    return { success: false, message: `战斗失败！损失了 ${loss} 信用点。` };
  }

  function handleDriftEvent(): { success: boolean; message: string; goods?: { name: string; quantity: number }[] } {
    const event = currentEvent.value;
    if (!event || event.type !== 'drift') {
      return { success: false, message: '无效事件' };
    }

    const goodsData = event.data?.goods ?? [];
    const collected: { name: string; quantity: number }[] = [];

    goodsData.forEach(item => {
      const goodsInfo = GOODS_LIST.find(g => g.id === item.goodsId);
      if (goodsInfo && addToCargo(item.goodsId, item.quantity)) {
        collected.push({ name: goodsInfo.name, quantity: item.quantity });
      }
    });

    clearEvent();

    if (collected.length > 0) {
      const desc = collected.map(c => `${c.name} x${c.quantity}`).join('、');
      return { success: true, message: `成功收集：${desc}`, goods: collected };
    }
    return { success: false, message: '货仓已满，无法收集漂流货物。' };
  }

  function persistGame(): void {
    saveGame({
      playerState: player,
      stations: null,
      seed: Date.now() % 1000000,
      lastSave: Date.now(),
    });
  }

  function loadFromStorage(): boolean {
    const data = loadGame();
    if (data?.playerState) {
      const saved = data.playerState as PlayerState;
      Object.assign(player, saved);
      displayCredits.value = player.credits;
      return true;
    }
    return false;
  }

  function resetGame(): void {
    clearGame();
    player.credits = 5000;
    player.fuel = 100;
    player.position = { x: 500, y: 375 };
    player.currentStationId = null;
    player.cargo = [];
    displayCredits.value = 5000;
    isFlying.value = false;
    currentEvent.value = null;
  }

  watch(
    () => ({ ...player }),
    () => persistGame(),
    { deep: true }
  );

  return {
    player,
    displayCredits,
    isAnimatingCredits,
    isFlying,
    currentEvent,
    cargoSlots,
    cargoCount,
    isLowFuel,
    canFly,
    addCredits,
    subtractCredits,
    consumeFuel,
    refuel,
    updatePosition,
    setCurrentStation,
    addToCargo,
    removeFromCargo,
    getCargoQuantity,
    setFlying,
    triggerEvent,
    clearEvent,
    handlePirateEvent,
    handleDriftEvent,
    loadFromStorage,
    resetGame,
    persistGame,
  };
}
