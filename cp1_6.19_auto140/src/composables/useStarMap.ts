import { ref, onUnmounted } from 'vue';
import type { Station, StationGoods, StarParticle } from '@/types/game';
import { SeededRandom } from '@/utils/seed';
import { FACTIONS } from '@/data/factions';
import { GOODS_LIST, STATION_NAMES } from '@/data/goods';

export function useStarMap(seed?: number) {
  const stations = ref<Station[]>([]);
  const particles = ref<StarParticle[]>([]);
  const mapSeed = ref<number>(seed ?? Date.now() % 1000000);
  let animationFrame: number | null = null;
  let priceUpdateInterval: number | null = null;

  function generateStations(): void {
    const rng = new SeededRandom(mapSeed.value);
    const stationCount = rng.nextInt(12, 15);
    const minDistance = 120;
    const generatedStations: Station[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < stationCount; i++) {
      let attempts = 0;
      let position = { x: 0, y: 0 };
      let valid = false;

      while (!valid && attempts < 100) {
        position = {
          x: rng.nextInt(100, 900),
          y: rng.nextInt(100, 650),
        };
        valid = generatedStations.every(s => {
          const dx = s.position.x - position.x;
          const dy = s.position.y - position.y;
          return Math.sqrt(dx * dx + dy * dy) > minDistance;
        });
        attempts++;
      }

      let name = rng.pick(STATION_NAMES);
      while (usedNames.has(name)) {
        name = rng.pick(STATION_NAMES);
      }
      usedNames.add(name);

      const faction = rng.pick(FACTIONS);
      const goodsCount = rng.nextInt(5, 8);
      const shuffledGoods = [...GOODS_LIST].sort(() => rng.next() - 0.5);
      const selectedGoods = shuffledGoods.slice(0, goodsCount);

      const stationGoods: StationGoods[] = selectedGoods.map(g => {
        const priceVariance = rng.nextFloat(0.7, 1.3);
        const buyPrice = Math.round(g.basePrice * priceVariance);
        const sellPrice = Math.round(buyPrice * 0.85);
        return {
          goodsId: g.id,
          buyPrice,
          sellPrice,
          stock: rng.nextInt(10, 100),
          priceTrend: 'stable' as const,
        };
      });

      generatedStations.push({
        id: `station_${i}`,
        name,
        factionId: faction.id,
        position,
        goods: stationGoods,
      });
    }

    stations.value = generatedStations;
  }

  function generateParticles(count: number = 150): void {
    const newParticles: StarParticle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        x: Math.random() * 1024,
        y: Math.random() * 768,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.3 + 0.1,
        opacity: Math.random() * 0.8 + 0.2,
        color: Math.random() > 0.7 ? '#00bbf9' : '#ffffff',
      });
    }
    particles.value = newParticles;
  }

  function updateParticles(): void {
    particles.value.forEach(p => {
      p.x += p.speed;
      p.y += p.speed * 0.3;
      if (p.x > 1024) p.x = 0;
      if (p.y > 768) p.y = 0;
    });
  }

  function animateParticles(): void {
    updateParticles();
    animationFrame = requestAnimationFrame(animateParticles);
  }

  function updatePrices(): void {
    stations.value.forEach(station => {
      station.goods.forEach(goods => {
        const variance = (Math.random() - 0.5) * 0.1;
        const goodsInfo = GOODS_LIST.find(g => g.id === goods.goodsId);
        if (!goodsInfo) return;

        const oldPrice = goods.buyPrice;
        const newPrice = Math.max(
          Math.round(goodsInfo.basePrice * 0.5),
          Math.min(
            Math.round(goodsInfo.basePrice * 1.5),
            Math.round(goods.buyPrice * (1 + variance))
          )
        );
        goods.buyPrice = newPrice;
        goods.sellPrice = Math.round(newPrice * 0.85);
        goods.priceTrend = newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : 'stable';
      });
    });
  }

  function getStationById(id: string): Station | undefined {
    return stations.value.find(s => s.id === id);
  }

  function init(): void {
    generateStations();
    generateParticles();
    animateParticles();
    priceUpdateInterval = window.setInterval(updatePrices, 10000);
  }

  function cleanup(): void {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    if (priceUpdateInterval) {
      clearInterval(priceUpdateInterval);
    }
  }

  onUnmounted(cleanup);

  return {
    stations,
    particles,
    mapSeed,
    init,
    cleanup,
    getStationById,
    generateStations,
    updatePrices,
  };
}
