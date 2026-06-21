export interface Plot {
  id: string;
  name: string;
  area: number;
  orientation: string;
  soilType: 'sandy' | 'loam' | 'clay';
  createdAt: string;
  currentCrop?: string | null;
  currentFamily?: string | null;
  progress?: number;
  daysToHarvest?: number | null;
  needsRotationSoon?: boolean;
}

export interface PlantingRecord {
  id: string;
  plotId: string;
  cropName: string;
  family: string;
  plantingDate: string;
  expectedHarvestDate: string;
  actualHarvestDate?: string | null;
  yield?: number | null;
  notes?: string | null;
  cycleDays: number;
  idleDays: number;
}

export interface Crop {
  name: string;
  family: string;
  companions: string[];
  averageCycle: number;
}

export interface RotationValidation {
  valid: boolean;
  message: string;
  recommendations: string[];
}

export interface YieldPrediction {
  expectedMin: number;
  expectedMax: number;
  bestHarvestWindow: {
    start: string;
    end: string;
  };
  dailyTrend: {
    date: string;
    yield: number;
  }[];
  historicalData: {
    month: string;
    avgYield: number;
  }[];
}

export interface GanttRecord {
  id: string;
  cropName: string;
  family: string;
  plantingDate: string;
  expectedHarvestDate: string;
  actualHarvestDate: string | null;
  yield: number | null;
  cycleDays: number;
  isActive: boolean;
}

export interface GanttPlot {
  plotId: string;
  plotName: string;
  records: GanttRecord[];
}

export const SOIL_COLORS: Record<string, string> = {
  sandy: '#F5F5DC',
  loam: '#795548',
  clay: '#A0522D',
};

export const SOIL_NAMES: Record<string, string> = {
  sandy: '沙土',
  loam: '壤土',
  clay: '黏土',
};

export const FAMILY_COLORS: Record<string, string> = {
  solanaceae: '#9C27B0',
  brassicaceae: '#4CAF50',
  fabaceae: '#FFC107',
  cucurbitaceae: '#FF9800',
  apiaceae: '#00BCD4',
  chenopodiaceae: '#795548',
  asteraceae: '#E91E63',
};

export const FAMILY_NAMES: Record<string, string> = {
  solanaceae: '茄科',
  brassicaceae: '十字花科',
  fabaceae: '豆科',
  cucurbitaceae: '葫芦科',
  apiaceae: '伞形科',
  chenopodiaceae: '藜科',
  asteraceae: '菊科',
};
