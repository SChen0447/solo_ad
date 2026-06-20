export interface Event {
  id: string;
  date: string;
  city: string;
  venue: string;
  startTime: string;
  expectedAttendance: number;
  notes: string;
  color: string;
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

export interface Stats {
  totalShowsThisYear: number;
  totalEquipment: number;
  lowStockItems: InventoryItem[];
  showsByMonth: { month: string; count: number }[];
}
