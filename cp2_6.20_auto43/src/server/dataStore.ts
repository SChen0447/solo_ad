import { v4 as uuidv4 } from 'uuid';

export interface ServerEvent {
  id: string;
  date: string;
  city: string;
  venue: string;
  startTime: string;
  expectedAttendance: number;
  notes: string;
  color: string;
}

export interface ServerEquipment {
  id: string;
  name: string;
  brand: string;
  quantity: number;
  purchaseYear: number;
  notes: string;
  imageUrl: string;
  type: string;
  usageFrequency: number;
}

export interface ServerInventoryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  initialStock: number;
  coverUrl: string;
}

const PRESET_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

class DataStore {
  private events: Map<string, ServerEvent>;
  private equipment: Map<string, ServerEquipment>;
  private inventory: Map<string, ServerInventoryItem>;

  constructor() {
    this.events = new Map();
    this.equipment = new Map();
    this.inventory = new Map();
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    const sampleEvents: Omit<ServerEvent, 'id'>[] = [
      { date: '2026-06-25', city: '北京', venue: '工人体育馆', startTime: '19:30', expectedAttendance: 5000, notes: '准备音响设备', color: this.getRandomColor() },
      { date: '2026-07-12', city: '上海', venue: '梅赛德斯奔驰文化中心', startTime: '20:00', expectedAttendance: 8000, notes: '嘉宾演出', color: this.getRandomColor() },
      { date: '2026-07-28', city: '广州', venue: '天河体育馆', startTime: '19:00', expectedAttendance: 6000, notes: '', color: this.getRandomColor() },
      { date: '2026-08-15', city: '成都', venue: '五粮液成都金融城演艺中心', startTime: '19:30', expectedAttendance: 4000, notes: '户外场地', color: this.getRandomColor() },
    ];

    sampleEvents.forEach(event => {
      const id = uuidv4();
      this.events.set(id, { ...event, id });
    });

    const sampleEquipment: Omit<ServerEquipment, 'id'>[] = [
      { name: '电吉他', brand: 'Fender', quantity: 2, purchaseYear: 2020, notes: '主音吉他', imageUrl: '', type: '吉他', usageFrequency: 85 },
      { name: '电贝斯', brand: 'Music Man', quantity: 1, purchaseYear: 2019, notes: '5弦贝斯', imageUrl: '', type: '贝斯', usageFrequency: 90 },
      { name: '架子鼓', brand: 'Pearl', quantity: 1, purchaseYear: 2018, notes: '全套7鼓', imageUrl: '', type: '鼓', usageFrequency: 95 },
      { name: '合成器', brand: 'Roland', quantity: 2, purchaseYear: 2021, notes: '舞台用', imageUrl: '', type: '键盘', usageFrequency: 75 },
      { name: '主音响', brand: 'JBL', quantity: 4, purchaseYear: 2022, notes: '双15寸', imageUrl: '', type: '音响', usageFrequency: 100 },
      { name: '监听音响', brand: 'Yamaha', quantity: 6, purchaseYear: 2021, notes: '舞台返听', imageUrl: '', type: '音响', usageFrequency: 88 },
      { name: '麦克风', brand: 'Shure', quantity: 8, purchaseYear: 2020, notes: 'SM58', imageUrl: '', type: '音响', usageFrequency: 92 },
    ];

    sampleEquipment.forEach(item => {
      const id = uuidv4();
      this.equipment.set(id, { ...item, id });
    });

    const sampleInventory: Omit<ServerInventoryItem, 'id'>[] = [
      { name: '巡演T恤-黑色', category: '服装', price: 128, stock: 150, initialStock: 200, coverUrl: '' },
      { name: '巡演T恤-白色', category: '服装', price: 128, stock: 180, initialStock: 200, coverUrl: '' },
      { name: '专辑CD', category: '音乐', price: 68, stock: 300, initialStock: 500, coverUrl: '' },
      { name: '黑胶唱片', category: '音乐', price: 288, stock: 5, initialStock: 100, coverUrl: '' },
      { name: '帆布包', category: '周边', price: 58, stock: 8, initialStock: 150, coverUrl: '' },
      { name: '贴纸套装', category: '周边', price: 28, stock: 450, initialStock: 500, coverUrl: '' },
      { name: '海报', category: '周边', price: 38, stock: 3, initialStock: 200, coverUrl: '' },
      { name: '帽子', category: '服装', price: 88, stock: 120, initialStock: 150, coverUrl: '' },
    ];

    sampleInventory.forEach(item => {
      const id = uuidv4();
      this.inventory.set(id, { ...item, id });
    });
  }

  private getRandomColor(): string {
    return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
  }

  getEvents(): ServerEvent[] {
    return Array.from(this.events.values());
  }

  addEvent(event: Omit<ServerEvent, 'id' | 'color'>): ServerEvent {
    const id = uuidv4();
    const color = this.getRandomColor();
    const newEvent: ServerEvent = { ...event, id, color };
    this.events.set(id, newEvent);
    return newEvent;
  }

  getEquipment(): ServerEquipment[] {
    return Array.from(this.equipment.values());
  }

  addEquipment(equipment: Omit<ServerEquipment, 'id'>): ServerEquipment {
    const id = uuidv4();
    const newEquipment: ServerEquipment = { ...equipment, id };
    this.equipment.set(id, newEquipment);
    return newEquipment;
  }

  updateEquipment(id: string, data: Partial<ServerEquipment>): ServerEquipment | null {
    const existing = this.equipment.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data };
    this.equipment.set(id, updated);
    return updated;
  }

  deleteEquipment(id: string): boolean {
    return this.equipment.delete(id);
  }

  getInventory(): ServerInventoryItem[] {
    return Array.from(this.inventory.values());
  }

  addInventory(item: Omit<ServerInventoryItem, 'id'>): ServerInventoryItem {
    const id = uuidv4();
    const newItem: ServerInventoryItem = { ...item, id };
    this.inventory.set(id, newItem);
    return newItem;
  }

  updateInventory(id: string, data: Partial<ServerInventoryItem>): ServerInventoryItem | null {
    const existing = this.inventory.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data };
    if (data.initialStock === undefined && existing.initialStock === undefined) {
      updated.initialStock = existing.stock;
    }
    this.inventory.set(id, updated);
    return updated;
  }

  getStats(): {
    totalShowsThisYear: number;
    totalEquipment: number;
    lowStockItems: ServerInventoryItem[];
    showsByMonth: { month: string; count: number }[];
  } {
    const currentYear = new Date().getFullYear();
    const eventsThisYear = this.getEvents().filter(e => {
      const eventYear = new Date(e.date).getFullYear();
      return eventYear === currentYear;
    });

    const showsByMonth: { [key: string]: number } = {};
    eventsThisYear.forEach(event => {
      const month = new Date(event.date).getMonth() + 1;
      const monthKey = `${month}月`;
      showsByMonth[monthKey] = (showsByMonth[monthKey] || 0) + 1;
    });

    const showsByMonthArray = Object.entries(showsByMonth)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => parseInt(a.month) - parseInt(b.month));

    const lowStockItems = this.getInventory()
      .filter(item => item.initialStock > 0 && (item.stock / item.initialStock) < 0.1)
      .sort((a, b) => (a.stock / a.initialStock) - (b.stock / b.initialStock))
      .slice(0, 5);

    return {
      totalShowsThisYear: eventsThisYear.length,
      totalEquipment: this.equipment.size,
      lowStockItems,
      showsByMonth: showsByMonthArray
    };
  }
}

export const dataStore = new DataStore();
