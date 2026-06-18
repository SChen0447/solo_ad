export interface AQIDataPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
  z: number;
  aqi: number;
  color: string;
}

export interface CityDataset {
  name: string;
  displayName: string;
  points: AQIDataPoint[];
}

const aqiColorStops: Array<{ aqi: number; color: [number, number, number] }> = [
  { aqi: 0, color: [0, 228, 0] },
  { aqi: 50, color: [255, 255, 0] },
  { aqi: 100, color: [255, 126, 0] },
  { aqi: 150, color: [255, 0, 0] },
  { aqi: 200, color: [153, 0, 76] },
  { aqi: 300, color: [126, 0, 35] }
];

function interpolateColor(aqi: number): string {
  const clampedAqi = Math.max(0, Math.min(300, aqi));

  for (let i = 0; i < aqiColorStops.length - 1; i++) {
    const current = aqiColorStops[i];
    const next = aqiColorStops[i + 1];

    if (clampedAqi >= current.aqi && clampedAqi <= next.aqi) {
      const t = (clampedAqi - current.aqi) / (next.aqi - current.aqi);
      const r = Math.round(current.color[0] + t * (next.color[0] - current.color[0]));
      const g = Math.round(current.color[1] + t * (next.color[1] - current.color[1]));
      const b = Math.round(current.color[2] + t * (next.color[2] - current.color[2]));
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
  }

  return '#7e0023';
}

function latLngToXYZ(lat: number, lng: number, centerLat: number, centerLng: number): { x: number; y: number; z: number } {
  const scale = 0.08;
  const x = (lng - centerLng) * scale;
  const z = (centerLat - lat) * scale;
  const y = (Math.random() - 0.5) * 2;
  return { x, y, z };
}

const beijingCenter = { lat: 39.9042, lng: 116.4074 };
const shanghaiCenter = { lat: 31.2304, lng: 121.4737 };
const guangzhouCenter = { lat: 23.1291, lng: 113.2644 };

const beijingData: Omit<AQIDataPoint, 'x' | 'y' | 'z' | 'color'>[] = [
  { id: 'bj-01', name: '朝阳区', lat: 39.92, lng: 116.46, aqi: 85 },
  { id: 'bj-02', name: '海淀区', lat: 39.95, lng: 116.31, aqi: 72 },
  { id: 'bj-03', name: '东城区', lat: 39.92, lng: 116.41, aqi: 95 },
  { id: 'bj-04', name: '西城区', lat: 39.91, lng: 116.36, aqi: 88 },
  { id: 'bj-05', name: '丰台区', lat: 39.85, lng: 116.28, aqi: 105 },
  { id: 'bj-06', name: '石景山区', lat: 39.90, lng: 116.22, aqi: 118 },
  { id: 'bj-07', name: '通州区', lat: 39.91, lng: 116.65, aqi: 125 },
  { id: 'bj-08', name: '顺义区', lat: 40.13, lng: 116.65, aqi: 92 },
  { id: 'bj-09', name: '大兴区', lat: 39.72, lng: 116.33, aqi: 135 },
  { id: 'bj-10', name: '昌平区', lat: 40.22, lng: 116.23, aqi: 78 },
  { id: 'bj-11', name: '房山区', lat: 39.73, lng: 116.13, aqi: 142 },
  { id: 'bj-12', name: '门头沟区', lat: 39.94, lng: 116.10, aqi: 65 },
  { id: 'bj-13', name: '怀柔区', lat: 40.31, lng: 116.63, aqi: 45 },
  { id: 'bj-14', name: '平谷区', lat: 40.14, lng: 117.11, aqi: 52 },
  { id: 'bj-15', name: '密云区', lat: 40.37, lng: 116.84, aqi: 48 },
  { id: 'bj-16', name: '延庆区', lat: 40.46, lng: 115.97, aqi: 38 },
  { id: 'bj-17', name: '亦庄', lat: 39.78, lng: 116.50, aqi: 115 },
  { id: 'bj-18', name: '奥运村', lat: 40.00, lng: 116.39, aqi: 68 },
  { id: 'bj-19', name: 'CBD', lat: 39.91, lng: 116.46, aqi: 102 },
  { id: 'bj-20', name: '中关村', lat: 39.98, lng: 116.31, aqi: 82 }
];

const shanghaiData: Omit<AQIDataPoint, 'x' | 'y' | 'z' | 'color'>[] = [
  { id: 'sh-01', name: '黄浦区', lat: 31.23, lng: 121.48, aqi: 68 },
  { id: 'sh-02', name: '徐汇区', lat: 31.19, lng: 121.43, aqi: 75 },
  { id: 'sh-03', name: '长宁区', lat: 31.22, lng: 121.42, aqi: 62 },
  { id: 'sh-04', name: '静安区', lat: 31.23, lng: 121.45, aqi: 70 },
  { id: 'sh-05', name: '普陀区', lat: 31.25, lng: 121.40, aqi: 88 },
  { id: 'sh-06', name: '虹口区', lat: 31.27, lng: 121.49, aqi: 78 },
  { id: 'sh-07', name: '杨浦区', lat: 31.25, lng: 121.52, aqi: 82 },
  { id: 'sh-08', name: '闵行区', lat: 31.11, lng: 121.37, aqi: 95 },
  { id: 'sh-09', name: '宝山区', lat: 31.39, lng: 121.49, aqi: 105 },
  { id: 'sh-10', name: '嘉定区', lat: 31.38, lng: 121.23, aqi: 92 },
  { id: 'sh-11', name: '浦东新区', lat: 31.24, lng: 121.57, aqi: 72 },
  { id: 'sh-12', name: '金山区', lat: 30.75, lng: 121.33, aqi: 115 },
  { id: 'sh-13', name: '松江区', lat: 31.03, lng: 121.22, aqi: 85 },
  { id: 'sh-14', name: '青浦区', lat: 31.15, lng: 121.11, aqi: 76 },
  { id: 'sh-15', name: '奉贤区', lat: 30.91, lng: 121.46, aqi: 68 },
  { id: 'sh-16', name: '崇明区', lat: 31.63, lng: 121.53, aqi: 42 },
  { id: 'sh-17', name: '陆家嘴', lat: 31.23, lng: 121.50, aqi: 65 },
  { id: 'sh-18', name: '外滩', lat: 31.23, lng: 121.49, aqi: 73 },
  { id: 'sh-19', name: '迪士尼', lat: 31.14, lng: 121.65, aqi: 58 },
  { id: 'sh-20', name: '虹桥', lat: 31.20, lng: 121.34, aqi: 80 }
];

const guangzhouData: Omit<AQIDataPoint, 'x' | 'y' | 'z' | 'color'>[] = [
  { id: 'gz-01', name: '越秀区', lat: 23.12, lng: 113.26, aqi: 58 },
  { id: 'gz-02', name: '荔湾区', lat: 23.13, lng: 113.23, aqi: 65 },
  { id: 'gz-03', name: '海珠区', lat: 23.09, lng: 113.32, aqi: 72 },
  { id: 'gz-04', name: '天河区', lat: 23.13, lng: 113.36, aqi: 68 },
  { id: 'gz-05', name: '白云区', lat: 23.20, lng: 113.27, aqi: 85 },
  { id: 'gz-06', name: '黄埔区', lat: 23.18, lng: 113.45, aqi: 92 },
  { id: 'gz-07', name: '番禺区', lat: 22.93, lng: 113.38, aqi: 78 },
  { id: 'gz-08', name: '花都区', lat: 23.39, lng: 113.20, aqi: 95 },
  { id: 'gz-09', name: '南沙区', lat: 22.80, lng: 113.52, aqi: 55 },
  { id: 'gz-10', name: '从化区', lat: 23.55, lng: 113.58, aqi: 45 },
  { id: 'gz-11', name: '增城区', lat: 23.27, lng: 113.82, aqi: 52 },
  { id: 'gz-12', name: '珠江新城', lat: 23.12, lng: 113.32, aqi: 62 },
  { id: 'gz-13', name: '北京路', lat: 23.12, lng: 113.26, aqi: 70 },
  { id: 'gz-14', name: '广州塔', lat: 23.10, lng: 113.32, aqi: 65 },
  { id: 'gz-15', name: '白云山', lat: 23.18, lng: 113.29, aqi: 48 },
  { id: 'gz-16', name: '番禺长隆', lat: 22.99, lng: 113.33, aqi: 58 },
  { id: 'gz-17', name: '开发区', lat: 23.16, lng: 113.48, aqi: 88 },
  { id: 'gz-18', name: '大学城', lat: 23.05, lng: 113.39, aqi: 55 },
  { id: 'gz-19', name: '机场南', lat: 23.39, lng: 113.30, aqi: 102 },
  { id: 'gz-20', name: '佛山交界', lat: 23.10, lng: 113.15, aqi: 98 }
];

function processRawData(
  rawData: Omit<AQIDataPoint, 'x' | 'y' | 'z' | 'color'>[],
  center: { lat: number; lng: number }
): AQIDataPoint[] {
  return rawData.map(point => {
    const { x, y, z } = latLngToXYZ(point.lat, point.lng, center.lat, center.lng);
    return {
      ...point,
      x,
      y,
      z,
      color: interpolateColor(point.aqi)
    };
  });
}

const cityDatasets: Record<string, CityDataset> = {
  beijing: {
    name: 'beijing',
    displayName: '北京',
    points: processRawData(beijingData, beijingCenter)
  },
  shanghai: {
    name: 'shanghai',
    displayName: '上海',
    points: processRawData(shanghaiData, shanghaiCenter)
  },
  guangzhou: {
    name: 'guangzhou',
    displayName: '广州',
    points: processRawData(guangzhouData, guangzhouCenter)
  }
};

export async function loadCityData(cityName: string): Promise<AQIDataPoint[]> {
  await new Promise(resolve => setTimeout(resolve, 100));

  const dataset = cityDatasets[cityName];
  if (!dataset) {
    throw new Error(`City dataset not found: ${cityName}`);
  }

  return dataset.points;
}

export function getAvailableCities(): Array<{ name: string; displayName: string }> {
  return Object.values(cityDatasets).map(ds => ({
    name: ds.name,
    displayName: ds.displayName
  }));
}

export function getCityDisplayName(cityName: string): string {
  return cityDatasets[cityName]?.displayName || cityName;
}
