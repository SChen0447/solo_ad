export interface Position {
  x: number;
  y: number;
}

export interface Faction {
  id: string;
  name: string;
  color: string;
}

export interface CargoItem {
  goodsId: string;
  quantity: number;
}

export interface PlayerState {
  credits: number;
  fuel: number;
  position: Position;
  currentStationId: string | null;
  cargo: CargoItem[];
  maxCargoSlots: number;
  maxStackSize: number;
}

export interface StationGoods {
  goodsId: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  priceTrend: 'up' | 'down' | 'stable';
}

export interface Station {
  id: string;
  name: string;
  factionId: string;
  position: Position;
  goods: StationGoods[];
}

export interface Goods {
  id: string;
  name: string;
  basePrice: number;
  icon: string;
}

export interface StarParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  color: string;
}

export interface GameEvent {
  type: 'pirate' | 'drift';
  title: string;
  description: string;
  data?: {
    ransom?: number;
    goods?: { goodsId: string; quantity: number }[];
  };
}

export interface FlightState {
  isFlying: boolean;
  targetStationId: string | null;
  progress: number;
  startPosition: Position;
  endPosition: Position;
  duration: number;
  startTime: number;
}
