export interface GameEvent {
  title: string;
  description: string;
  goldChange: number;
  emoji: string;
}

const EVENT_POOL: GameEvent[] = [
  { title: '捡到钱包', description: '路上捡到一个钱包，获得200金币！', goldChange: 200, emoji: '💰' },
  { title: '交通罚款', description: '超速行驶被罚款，支付100金币！', goldChange: -100, emoji: '🚔' },
  { title: '股票分红', description: '持有的股票大涨，获得150金币！', goldChange: 150, emoji: '📈' },
  { title: '房屋维修', description: '房屋需要紧急维修，支付120金币！', goldChange: -120, emoji: '🏠' },
  { title: '彩票中奖', description: '彩票中了小奖，获得300金币！', goldChange: 300, emoji: '🎰' },
  { title: '看病就医', description: '身体不适去医院，支付80金币！', goldChange: -80, emoji: '🏥' },
  { title: '节日红包', description: '收到节日红包，获得100金币！', goldChange: 100, emoji: '🧧' },
  { title: '税务审计', description: '被税务部门审计，支付150金币！', goldChange: -150, emoji: '📋' },
  { title: '创业成功', description: '副业创业成功，获得250金币！', goldChange: 250, emoji: '🚀' },
  { title: '意外事故', description: '遇到意外事故，支付200金币！', goldChange: -200, emoji: '⚠️' },
  { title: '银行利息', description: '存款到期获得利息，获得50金币！', goldChange: 50, emoji: '🏦' },
  { title: '朋友借款', description: '朋友还了借款，获得80金币！', goldChange: 80, emoji: '🤝' },
];

export class EventEngine {
  private usedIndices: Set<number> = new Set();

  triggerEvent(): GameEvent {
    if (this.usedIndices.size >= EVENT_POOL.length) {
      this.usedIndices.clear();
    }

    let idx: number;
    do {
      idx = Math.floor(Math.random() * EVENT_POOL.length);
    } while (this.usedIndices.has(idx));

    this.usedIndices.add(idx);
    return EVENT_POOL[idx];
  }

  executeEvent(event: GameEvent, addGold: (amount: number) => void) {
    addGold(event.goldChange);
  }
}
