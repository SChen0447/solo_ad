import {
  Commodity,
  CommodityPriceState,
  KlineCandle,
  COMMODITIES,
  calculateSinePrice,
  clampPrice,
  applyBuyImpact,
  applySellImpact,
  getCommodityById,
} from './commodityData';

export type PriceUpdateCallback = (states: CommodityPriceState[]) => void;
export type ThresholdCallback = (commodityId: string, type: 'up' | 'down') => void;

export interface TradeResult {
  success: boolean;
  message: string;
  commodityId: string;
}

const MAX_HISTORY_POINTS = 30;
const SINCE_UPDATE_INTERVAL_MS = 2000;
const HISTORY_SAMPLE_INTERVAL_MS = 10000;
const THRESHOLD_PERCENTAGE = 0.2;

export class MarketManager {
  private priceStates: Map<string, CommodityPriceState> = new Map();
  private priceUpdateCallbacks: PriceUpdateCallback[] = [];
  private thresholdCallbacks: ThresholdCallback[] = [];
  private lastSineUpdate: number = 0;
  private lastHistorySample: number = 0;
  private paused: boolean = false;
  private startTime: number = 0;

  constructor() {
    this.startTime = performance.now();
    this.initializePriceStates();
  }

  private initializePriceStates(): void {
    for (const commodity of COMMODITIES) {
      const initialPrice = commodity.basePrice;
      this.priceStates.set(commodity.id, {
        commodityId: commodity.id,
        currentPrice: initialPrice,
        previousPrice: initialPrice,
        trend: 'flat',
        history: [],
        currentCandle: {
          open: initialPrice,
          close: initialPrice,
          high: initialPrice,
          low: initialPrice,
        },
      });
    }
  }

  public onPriceUpdate(callback: PriceUpdateCallback): void {
    this.priceUpdateCallbacks.push(callback);
  }

  public onThresholdBreach(callback: ThresholdCallback): void {
    this.thresholdCallbacks.push(callback);
  }

  public getPriceStates(): CommodityPriceState[] {
    return Array.from(this.priceStates.values());
  }

  public getPriceState(commodityId: string): CommodityPriceState | undefined {
    return this.priceStates.get(commodityId);
  }

  public getCommodities(): Commodity[] {
    return COMMODITIES;
  }

  public buy(commodityId: string, playerGold: number): TradeResult {
    const state = this.priceStates.get(commodityId);
    const commodity = getCommodityById(commodityId);

    if (!state || !commodity) {
      return { success: false, message: '未知商品', commodityId };
    }

    if (playerGold < state.currentPrice) {
      return { success: false, message: '金币不足', commodityId };
    }

    const previousPrice = state.currentPrice;
    const newPrice = clampPrice(commodity, applyBuyImpact(state.currentPrice));

    this.updatePriceState(commodity, state, previousPrice, newPrice);
    this.checkThreshold(commodity, previousPrice, newPrice);
    this.notifyCallbacks();

    return { success: true, message: `购买成功！价格上涨至 ${Math.round(newPrice)} 金币`, commodityId };
  }

  public sell(commodityId: string, playerQuantity: number): TradeResult {
    const state = this.priceStates.get(commodityId);
    const commodity = getCommodityById(commodityId);

    if (!state || !commodity) {
      return { success: false, message: '未知商品', commodityId };
    }

    if (playerQuantity <= 0) {
      return { success: false, message: '背包中无此商品', commodityId };
    }

    const previousPrice = state.currentPrice;
    const newPrice = clampPrice(commodity, applySellImpact(state.currentPrice));

    this.updatePriceState(commodity, state, previousPrice, newPrice);
    this.checkThreshold(commodity, previousPrice, newPrice);
    this.notifyCallbacks();

    return { success: true, message: `出售成功！价格下跌至 ${Math.round(newPrice)} 金币`, commodityId };
  }

  private updatePriceState(
    commodity: Commodity,
    state: CommodityPriceState,
    previousPrice: number,
    newPrice: number
  ): void {
    state.previousPrice = previousPrice;
    state.currentPrice = clampPrice(commodity, newPrice);

    if (state.currentCandle) {
      state.currentCandle.close = state.currentPrice;
      state.currentCandle.high = Math.max(state.currentCandle.high, state.currentPrice);
      state.currentCandle.low = Math.min(state.currentCandle.low, state.currentPrice);
    }

    if (newPrice > previousPrice + 0.01) {
      state.trend = 'up';
    } else if (newPrice < previousPrice - 0.01) {
      state.trend = 'down';
    } else {
      state.trend = 'flat';
    }
  }

  private checkThreshold(commodity: Commodity, oldPrice: number, newPrice: number): void {
    const changePercent = (newPrice - oldPrice) / oldPrice;
    if (changePercent >= THRESHOLD_PERCENTAGE) {
      for (const cb of this.thresholdCallbacks) {
        cb(commodity.id, 'up');
      }
    } else if (changePercent <= -THRESHOLD_PERCENTAGE) {
      for (const cb of this.thresholdCallbacks) {
        cb(commodity.id, 'down');
      }
    }
  }

  private notifyCallbacks(): void {
    const states = this.getPriceStates();
    for (const cb of this.priceUpdateCallbacks) {
      cb(states);
    }
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
  }

  public update(timeMs: number): void {
    if (this.paused) {
      return;
    }

    const elapsed = timeMs - this.startTime;

    if (timeMs - this.lastSineUpdate >= SINCE_UPDATE_INTERVAL_MS) {
      this.lastSineUpdate = timeMs;
      this.applySineOscillation(elapsed);
      this.notifyCallbacks();
    }

    if (timeMs - this.lastHistorySample >= HISTORY_SAMPLE_INTERVAL_MS) {
      this.lastHistorySample = timeMs;
      this.sampleHistory();
    }
  }

  private applySineOscillation(elapsedMs: number): void {
    for (const commodity of COMMODITIES) {
      const state = this.priceStates.get(commodity.id);
      if (!state) continue;

      const priceDelta = calculateSinePrice(commodity, elapsedMs) - commodity.basePrice;
      const previousPrice = state.currentPrice;
      const newPrice = clampPrice(commodity, commodity.basePrice + priceDelta);

      this.updatePriceState(commodity, state, previousPrice, newPrice);
    }
  }

  private sampleHistory(): void {
    for (const commodity of COMMODITIES) {
      const state = this.priceStates.get(commodity.id);
      if (!state) continue;

      if (state.currentCandle) {
        const completedCandle: KlineCandle = { ...state.currentCandle };
        state.history.push(completedCandle);
        if (state.history.length > MAX_HISTORY_POINTS) {
          state.history.shift();
        }
      }

      state.currentCandle = {
        open: state.currentPrice,
        close: state.currentPrice,
        high: state.currentPrice,
        low: state.currentPrice,
      };
    }
  }
}
