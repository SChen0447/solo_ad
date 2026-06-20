import { v4 as uuidv4 } from 'uuid';

export interface Event {
  id: string;
  date: string;
  city: string;
  venue: string;
  startTime: string;
  expectedAttendance: number;
  notes: string;
}

export interface Equipment {
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

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  initialStock: number;
  coverUrl: string;
}

class DataStore {
  private events: Map<string, Event> = new Map();
  private equipment: Map<string, Equipment> = new Map();
  private inventory: Map<string, InventoryItem> = new Map();

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const sampleEvents: Event[] = [
      { id: uuidv4(), date: '2026-06-15', city: '北京', venue: '工人体育场', startTime: '20:00', expectedAttendance: 5000, notes: '首场演出' },
      { id: uuidv4(), date: '2026-06-22', city: '上海', venue: '梅赛德斯奔驰文化中心', startTime: '19:30', expectedAttendance: 8000, notes: '' },
      { id: uuidv4(), date: '2026-07-05', city: '广州', venue: '天河体育馆', startTime: '20:00', expectedAttendance: 6000, notes: '广州站' },
      { id: uuidv4(), date: '2026-07-12', city: '成都', venue: '五粮液成都演艺中心', startTime: '19:00', expectedAttendance: 4000, notes: '' },
    ];
    sampleEvents.forEach(e => this.events.set(e.id, e));

    const sampleEquipment: Equipment[] = [
      { id: uuidv4(), name: '电吉他', brand: 'Fender', quantity: 2, purchaseYear: 2020, notes: '主音吉他', imageUrl: '', type: '吉他', usageFrequency: 85 },
      { id: uuidv4(), name: '贝斯', brand: 'Gibson', quantity: 1, purchaseYear: 2019, notes: '四弦贝斯', imageUrl: '', type: '贝斯', usageFrequency: 90 },
      { id: uuidv4(), name: '架子鼓', brand: 'Yamaha', quantity: 1, purchaseYear: 2021, notes: '五鼓三镲', imageUrl: '', type: '鼓', usageFrequency: 75 },
      { id: uuidv4(), name: '合成器', brand: 'Roland', quantity: 1, purchaseYear: 2022, notes: '舞台用', imageUrl: '', type: '键盘', usageFrequency: 60 },
      { id: uuidv4(), name: '音箱', brand: 'Marshall', quantity: 4, purchaseYear: 2020, notes: '吉他音箱', imageUrl: '', type: '音响', usageFrequency: 95 },
      { id: uuidv4(), name: '麦克风', brand: 'Shure', quantity: 6, purchaseYear: 2021, notes: 'SM58', imageUrl: '', type: '音响', usageFrequency: 100 },
    ];
    sampleEquipment.forEach(e => this.equipment.set(e.id, e));

    const sampleInventory: InventoryItem[] = [
      { id: uuidv4(), name: '巡演T恤（黑）', category: '服装', price: 129, stock: 150, initialStock: 200, coverUrl: '' },
      { id: uuidv4(), name: '巡演T恤（白）', category: '服装', price: 129, stock: 12, initialStock: 200, coverUrl: '' },
      { id: uuidv4(), name: '实体专辑CD', category: '音乐', price: 89, stock: 300, initialStock: 500, coverUrl: '' },
      { id: uuidv4(), name: '黑胶唱片', category: '音乐', price: 299, stock: 5, initialStock: 50, coverUrl: '' },
      { id: uuidv4(), name: '乐队徽章套装', category: '配饰', price: 49, stock: 180, initialStock: 200, coverUrl: '' },
      { id: uuidv4(), name: '帆布包', category: '配饰', price: 79, stock: 8, initialStock: 100, coverUrl: '' },
      { id: uuidv4(), name: '海报', category: '周边', price: 39, stock: 250, initialStock: 300, coverUrl: '' },
      { id: uuidv4(), name: '手环', category: '配饰', price: 19, stock: 450, initialStock: 500, coverUrl: '' },
    ];
    sampleInventory.forEach(i => this.inventory.set(i.id, i));
  }

  getEvents(): Event[] {
    return Array.from(this.events.values());
  }

  addEvent(event: Omit<Event, 'id'>): Event {
    const id = uuidv4();
    const newEvent = { ...event, id };
    this.events.set(id, newEvent);
    return newEvent;
  }

  getEquipment(): Equipment[] {
    return Array.from(this.equipment.values());
  }

  addEquipment(equipment: Omit<Equipment, 'id' | 'usageFrequency'>): Equipment {
    const id = uuidv4();
    const newEquipment = { ...equipment, id, usageFrequency: 0 };
    this.equipment.set(id, newEquipment);
    return newEquipment;
  }

  updateEquipment(id: string, updates: Partial<Equipment>): Equipment | null {
    const equipment = this.equipment.get(id);
    if (!equipment) return null;
    const updated = { ...equipment, ...updates };
    this.equipment.set(id, updated);
    return updated;
  }

  deleteEquipment(id: string): boolean {
    return this.equipment.delete(id);
  }

  getInventory(): InventoryItem[] {
    return Array.from(this.inventory.values());
  }

  updateInventory(id: string, updates: Partial<InventoryItem>): InventoryItem | null {
    const item = this.inventory.get(id);
    if (!item) return null;
    const updated = { ...item, ...updates };
    this.inventory.set(id, updated);
    return updated;
  }

  getStats() {
    const events = this.getEvents();
    const currentYear = new Date().getFullYear();
    const eventsThisYear = events.filter(e => e.date.startsWith(String(currentYear)));
    
    const equipment = this.getEquipment();
    const totalEquipment = equipment.reduce((sum, e) => sum + e.quantity, 0);

    const inventory = this.getInventory();
    const lowStockItems = [...inventory]
      .filter(i => i.initialStock > 0)
      .sort((a, b) => (a.stock / a.initialStock) - (b.stock / b.initialStock))
      .slice(0, 5)
      .map(i => ({
        id: i.id,
        name: i.name,
        stock: i.stock,
        initialStock: i.initialStock,
        percentage: i.initialStock > 0 ? Math.round((i.stock / i.initialStock) * 100) : 0
      }));

    return {
      eventsThisYear: eventsThisYear.length,
      totalEvents: events.length,
      totalEquipment,
      equipmentCount: equipment.length,
      lowStockItems
    };
  }
}

export const dataStore = new DataStore();
