export enum LightMode {
  WARM_STEADY = 'warm_steady',
  COLD_STROBE = 'cold_strobe',
  PARTY_RAINBOW = 'party_rainbow',
}

export enum SeatZone {
  VIP = 'vip',
  GENERAL = 'general',
  BALCONY = 'balcony',
}

export enum ViewPreset {
  FRONT = 'front',
  LEFT_45 = 'left_45',
  TOP_DOWN = 'top_down',
  SEAT_VIEW = 'seat_view',
}

export interface Seat {
  id: string;
  zone: SeatZone;
  row: number;
  col: number;
  position: { x: number; y: number; z: number };
  distanceToStage: number;
  obstructionPercent: number;
}

export interface PerformanceState {
  isActive: boolean;
  startTime: number;
}

export interface CameraPosition {
  x: number;
  y: number;
  z: number;
}

export interface ViewPresetConfig {
  position: CameraPosition;
  target: CameraPosition;
}

export const SEAT_COLORS: Record<SeatZone, string> = {
  [SeatZone.VIP]: '#7c3aed',
  [SeatZone.GENERAL]: '#2563eb',
  [SeatZone.BALCONY]: '#dc2626',
};

export const SEAT_BORDER_COLORS: Record<SeatZone, string> = {
  [SeatZone.VIP]: '#fbbf24',
  [SeatZone.GENERAL]: '#1e40af',
  [SeatZone.BALCONY]: '#991b1b',
};

export const SEAT_ZONE_NAMES: Record<SeatZone, string> = {
  [SeatZone.VIP]: 'VIP区',
  [SeatZone.GENERAL]: '普通区',
  [SeatZone.BALCONY]: '二楼看台',
};

export const LIGHT_MODE_NAMES: Record<LightMode, string> = {
  [LightMode.WARM_STEADY]: '暖色常亮',
  [LightMode.COLD_STROBE]: '冷色频闪',
  [LightMode.PARTY_RAINBOW]: '派对彩虹渐变',
};

export const VIEW_PRESET_NAMES: Record<ViewPreset, string> = {
  [ViewPreset.FRONT]: '舞台正面',
  [ViewPreset.LEFT_45]: '左侧45度',
  [ViewPreset.TOP_DOWN]: '俯视全景',
  [ViewPreset.SEAT_VIEW]: '座位视野模拟',
};

export const STAGE_CENTER = { x: 0, y: 0, z: 0 };
