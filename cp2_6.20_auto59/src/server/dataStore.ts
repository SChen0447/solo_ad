import { v4 as uuidv4 } from 'uuid';

export interface TourEvent {
  id: string;
  date: string;
  city: string;
  venue: string;
  startTime: string;
  expectedAudience: number;
  notes: string;
  colorIndex: number;
}

export interface Equipment {
  id: string;
  name: string;
  brand: string;
  quantity: number;
  purchaseYear: number;
  notes: string;
  imageUrl: string;
  category: 'guitar' | 'bass' | 'drums' | 'keyboard' | 'audio' | 'other';
  usageFrequency: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  stockQuantity: number;
  maxStock: number;
  coverUrl: string;
}

export interface StatsData {
  yearPerformances: {
    total: number;
    completed: number;
    byMonth: { month: string; count: number }[];
  };
  totalEquipment: number;
  lowStockItems: (InventoryItem & { stockPercent: number })[];
}

const TAG_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

class DataStore {
  private eventsMap = new Map<string, TourEvent>();
  private equipmentMap = new Map<string, Equipment>();
  private inventoryMap = new Map<string, InventoryItem>();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const today = new Date();
    const year = today.getFullYear();

    const events: TourEvent[] = [
      {
        id: uuidv4(),
        date: `${year}-06-15`,
        city: '北京',
        venue: '愚公移山 Livehouse',
        startTime: '20:00',
        expectedAudience: 300,
        notes: '准备新歌首演',
        colorIndex: 0,
      },
      {
        id: uuidv4(),
        date: `${year}-06-22`,
        city: '上海',
        venue: 'MAO Livehouse',
        startTime: '20:30',
        expectedAudience: 450,
        notes: '联系音响调试',
        colorIndex: 1,
      },
      {
        id: uuidv4(),
        date: `${year}-07-05`,
        city: '广州',
        venue: 'SD Livehouse',
        startTime: '20:00',
        expectedAudience: 350,
        notes: '提前一天到达',
        colorIndex: 2,
      },
      {
        id: uuidv4(),
        date: `${year}-06-28`,
        city: '成都',
        venue: '小酒馆',
        startTime: '19:30',
        expectedAudience: 280,
        notes: '检查鼓组',
        colorIndex: 3,
      },
    ];
    events.forEach((e) => this.eventsMap.set(e.id, e));

    const equipment: Equipment[] = [
      {
        id: uuidv4(),
        name: 'Stratocaster 电吉他',
        brand: 'Fender',
        quantity: 1,
        purchaseYear: 2019,
        notes: '主音吉他手专用',
        imageUrl: '',
        category: 'guitar',
        usageFrequency: 92,
      },
      {
        id: uuidv4(),
        name: 'StingRay 贝斯',
        brand: 'MusicMan',
        quantity: 1,
        purchaseYear: 2020,
        notes: '主动拾音器',
        imageUrl: '',
        category: 'bass',
        usageFrequency: 88,
      },
      {
        id: uuidv4(),
        name: 'Collector\'s 套鼓',
        brand: 'DW',
        quantity: 1,
        purchaseYear: 2018,
        notes: '7鼓配置',
        imageUrl: '',
        category: 'drums',
        usageFrequency: 95,
      },
      {
        id: uuidv4(),
        name: 'MOXF8 合成器',
        brand: 'Yamaha',
        quantity: 1,
        purchaseYear: 2021,
        notes: '88键配重',
        imageUrl: '',
        category: 'keyboard',
        usageFrequency: 75,
      },
      {
        id: uuidv4(),
        name: 'SM58 动圈麦克风',
        brand: 'Shure',
        quantity: 4,
        purchaseYear: 2020,
        notes: '主唱+和声',
        imageUrl: '',
        category: 'audio',
        usageFrequency: 100,
      },
      {
        id: uuidv4(),
        name: 'JCM800 音箱头',
        brand: 'Marshall',
        quantity: 1,
        purchaseYear: 2017,
        notes: '100W全电子管',
        imageUrl: '',
        category: 'audio',
        usageFrequency: 80,
      },
      {
        id: uuidv4(),
        name: '效果器板',
        brand: 'Pedaltrain',
        quantity: 1,
        purchaseYear: 2022,
        notes: '含多块效果器',
        imageUrl: '',
        category: 'other',
        usageFrequency: 90,
      },
    ];
    equipment.forEach((e) => this.equipmentMap.set(e.id, e));

    const inventory: InventoryItem[] = [
      {
        id: uuidv4(),
        name: '巡演T恤（黑色）',
        category: '服装',
        unitPrice: 128,
        stockQuantity: 150,
        maxStock: 200,
        coverUrl: '',
      },
      {
        id: uuidv4(),
        name: '巡演T恤（白色）',
        category: '服装',
        unitPrice: 128,
        stockQuantity: 8,
        maxStock: 200,
        coverUrl: '',
      },
      {
        id: uuidv4(),
        name: '实体专辑CD',
        category: '音乐',
        unitPrice: 68,
        stockQuantity: 200,
        maxStock: 300,
        coverUrl: '',
      },
      {
        id: uuidv4(),
        name: '乐队徽章套装',
        category: '周边',
        unitPrice: 25,
        stockQuantity: 500,
        maxStock: 500,
        coverUrl: '',
      },
      {
        id: uuidv4(),
        name: '限定款巡演海报',
        category: '周边',
        unitPrice: 88,
        stockQuantity: 3,
        maxStock: 100,
        coverUrl: '',
      },
      {
        id: uuidv4(),
        name: '黑胶唱片（限量）',
        category: '音乐',
        unitPrice: 288,
        stockQuantity: 45,
        maxStock: 500,
        coverUrl: '',
      },
      {
        id: uuidv4(),
        name: '棒球帽（深蓝）',
        category: '服装',
        unitPrice: 88,
        stockQuantity: 12,
        maxStock: 150,
        coverUrl: '',
      },
      {
        id: uuidv4(),
        name: '帆布托特包',
        category: '周边',
        unitPrice: 58,
        stockQuantity: 180,
        maxStock: 200,
        coverUrl: '',
      },
    ];
    inventory.forEach((i) => this.inventoryMap.set(i.id, i));
  }

  getAllEvents(): TourEvent[] {
    return Array.from(this.eventsMap.values());
  }

  addEvent(data: Omit<TourEvent, 'id' | 'colorIndex'>): TourEvent {
    const id = uuidv4();
    const colorIndex = Math.floor(Math.random() * TAG_COLORS.length);
    const event: TourEvent = { ...data, id, colorIndex };
    this.eventsMap.set(id, event);
    return event;
  }

  getAllEquipment(): Equipment[] {
    return Array.from(this.equipmentMap.values());
  }

  addEquipment(data: Omit<Equipment, 'id'>): Equipment {
    const id = uuidv4();
    const equipment: Equipment = { ...data, id };
    this.equipmentMap.set(id, equipment);
    return equipment;
  }

  updateEquipment(id: string, data: Partial<Equipment>): Equipment | null {
    const existing = this.equipmentMap.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data };
    this.equipmentMap.set(id, updated);
    return updated;
  }

  deleteEquipment(id: string): boolean {
    return this.equipmentMap.delete(id);
  }

  getAllInventory(): InventoryItem[] {
    return Array.from(this.inventoryMap.values());
  }

  updateInventory(id: string, data: Partial<InventoryItem>): InventoryItem | null {
    const existing = this.inventoryMap.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data };
    this.inventoryMap.set(id, updated);
    return updated;
  }

  addInventory(data: Omit<InventoryItem, 'id'>): InventoryItem {
    const id = uuidv4();
    const item: InventoryItem = { ...data, id };
    this.inventoryMap.set(id, item);
    return item;
  }

  getStats(): StatsData {
    const now = new Date();
    const currentYear = now.getFullYear();
    const todayStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const allEvents = this.getAllEvents();
    const yearEvents = allEvents.filter((e) => e.date.startsWith(String(currentYear)));
    const completedEvents = yearEvents.filter((e) => e.date < todayStr);

    const monthMap = new Map<string, number>();
    for (let m = 1; m <= 12; m++) {
      monthMap.set(String(m).padStart(2, '0'), 0);
    }
    yearEvents.forEach((e) => {
      const month = e.date.split('-')[1];
      monthMap.set(month, (monthMap.get(month) || 0) + 1);
    });
    const byMonth = Array.from(monthMap.entries()).map(([month, count]) => ({ month, count }));

    const allInventory = this.getAllInventory();
    const inventoryWithPercent = allInventory
      .map((item) => ({
        ...item,
        stockPercent: item.maxStock > 0 ? Math.round((item.stockQuantity / item.maxStock) * 100) : 0,
      }))
      .sort((a, b) => a.stockPercent - b.stockPercent)
      .slice(0, 5);

    return {
      yearPerformances: {
        total: yearEvents.length,
        completed: completedEvents.length,
        byMonth,
      },
      totalEquipment: this.getAllEquipment().reduce((sum, eq) => sum + eq.quantity, 0),
      lowStockItems: inventoryWithPercent,
    };
  }
}

export const dataStore = new DataStore();
