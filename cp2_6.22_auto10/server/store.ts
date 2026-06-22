import { Gift, ExchangeRecord, LogisticsRecord } from './types';

class MemoryStore {
  private gifts: Map<string, Gift> = new Map();
  private exchanges: Map<string, ExchangeRecord> = new Map();
  private logistics: Map<string, LogisticsRecord[]> = new Map();

  addGift(gift: Gift): Gift {
    this.gifts.set(gift.id, gift);
    this.logistics.set(gift.id, []);
    return gift;
  }

  getGift(id: string): Gift | undefined {
    return this.gifts.get(id);
  }

  getAllGifts(): Gift[] {
    return Array.from(this.gifts.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getAvailableGifts(): Gift[] {
    return this.getAllGifts().filter((g) => g.status === 'available');
  }

  updateGiftStatus(id: string, status: Gift['status']): Gift | undefined {
    const gift = this.gifts.get(id);
    if (gift) {
      gift.status = status;
      return gift;
    }
    return undefined;
  }

  addExchangeRecord(record: ExchangeRecord): void {
    this.exchanges.set(record.id, record);
    const gift = this.gifts.get(record.giftId);
    if (gift) {
      gift.exchangeHistory.push(record);
    }
    const partnerGift = this.gifts.get(record.partnerGiftId);
    if (partnerGift && gift) {
      const reverseRecord: ExchangeRecord = {
        ...record,
        id: record.id + '_reverse',
        giftId: record.partnerGiftId,
        partnerGiftId: record.giftId,
        partnerCity: gift.city,
        partnerOwner: gift.owner,
      };
      partnerGift.exchangeHistory.push(reverseRecord);
    }
  }

  addLogisticsRecord(giftId: string, record: LogisticsRecord): LogisticsRecord | undefined {
    const gift = this.gifts.get(giftId);
    if (!gift) return undefined;

    const records = this.logistics.get(giftId) || [];
    records.push(record);
    records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    this.logistics.set(giftId, records);

    gift.logistics = records;
    return record;
  }

  getLogisticsByGiftId(giftId: string): LogisticsRecord[] {
    return this.logistics.get(giftId) || [];
  }

  getStats(): { totalGifts: number; exchangedGifts: number; inTransitGifts: number } {
    const gifts = this.getAllGifts();
    return {
      totalGifts: gifts.length,
      exchangedGifts: gifts.filter((g) => g.status === 'exchanged').length,
      inTransitGifts: gifts.filter((g) => g.status === 'in_transit').length,
    };
  }
}

export const store = new MemoryStore();
