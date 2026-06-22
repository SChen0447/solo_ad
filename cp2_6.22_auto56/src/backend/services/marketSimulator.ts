export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

const STOCKS: { symbol: string; name: string; basePrice: number }[] = [
  { symbol: 'AAPL', name: '苹果', basePrice: 178.5 },
  { symbol: 'GOOGL', name: '谷歌', basePrice: 141.2 },
  { symbol: 'MSFT', name: '微软', basePrice: 378.9 },
  { symbol: 'AMZN', name: '亚马逊', basePrice: 178.3 },
  { symbol: 'TSLA', name: '特斯拉', basePrice: 248.7 },
  { symbol: 'META', name: 'Meta', basePrice: 355.6 },
  { symbol: 'NVDA', name: '英伟达', basePrice: 495.2 },
  { symbol: 'JPM', name: '摩根大通', basePrice: 172.4 },
  { symbol: 'V', name: 'Visa', basePrice: 278.9 },
  { symbol: 'JNJ', name: '强生', basePrice: 156.3 },
  { symbol: 'WMT', name: '沃尔玛', basePrice: 165.2 },
  { symbol: 'PG', name: '宝洁', basePrice: 152.8 },
  { symbol: 'MA', name: '万事达', basePrice: 425.6 },
  { symbol: 'HD', name: '家得宝', basePrice: 345.7 },
  { symbol: 'DIS', name: '迪士尼', basePrice: 92.4 },
  { symbol: 'NFLX', name: '奈飞', basePrice: 485.3 },
  { symbol: 'BABA', name: '阿里巴巴', basePrice: 78.6 },
  { symbol: 'NIO', name: '蔚来', basePrice: 8.45 },
  { symbol: 'PDD', name: '拼多多', basePrice: 132.5 },
  { symbol: 'BIDU', name: '百度', basePrice: 105.3 },
];

class MarketSimulator {
  private quotes: Map<string, StockQuote> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: Array<(quotes: StockQuote[]) => void> = [];

  constructor() {
    this.initialize();
  }

  private initialize() {
    for (const stock of STOCKS) {
      const price = stock.basePrice;
      this.quotes.set(stock.symbol, {
        symbol: stock.symbol,
        name: stock.name,
        price,
        previousClose: price,
        change: 0,
        changePercent: 0,
        volume: Math.floor(Math.random() * 10000000) + 1000000,
        timestamp: Date.now(),
      });
    }
  }

  start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.updatePrices();
    }, 2000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private updatePrices() {
    for (const [symbol, quote] of this.quotes) {
      const factor = 1 + (Math.random() * 0.04 - 0.02);
      const newPrice = parseFloat((quote.price * factor).toFixed(2));
      const change = parseFloat((newPrice - quote.previousClose).toFixed(2));
      const changePercent = parseFloat(((change / quote.previousClose) * 100).toFixed(2));
      const volumeDelta = Math.floor(Math.random() * 500000);

      this.quotes.set(symbol, {
        ...quote,
        price: newPrice,
        change,
        changePercent,
        volume: quote.volume + volumeDelta,
        timestamp: Date.now(),
      });
    }
    this.notifyListeners();
  }

  onUpdate(listener: (quotes: StockQuote[]) => void) {
    this.listeners.push(listener);
  }

  private notifyListeners() {
    const allQuotes = this.getAllQuotes();
    for (const listener of this.listeners) {
      listener(allQuotes);
    }
  }

  getAllQuotes(): StockQuote[] {
    return Array.from(this.quotes.values());
  }

  getQuote(symbol: string): StockQuote | undefined {
    return this.quotes.get(symbol);
  }
}

export const marketSimulator = new MarketSimulator();
