import axios from 'axios';
import type {
  QuakeGeoJSON,
  QuakeFeature,
  ProcessedQuake,
  MagnitudeStats,
} from '@/types';
import {
  CACHE_INTERVAL,
  magnitudeToRadius,
  getDepthColor,
  TIME_WINDOW_HOURS,
} from '@/utils/constants';

const USGS_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson';
const BACKUP_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

let cachedData: ProcessedQuake[] | null = null;
let cacheTimestamp = 0;
let fetchPromise: Promise<ProcessedQuake[]> | null = null;

function generateMockData(): ProcessedQuake[] {
  const now = Date.now();
  const quakes: ProcessedQuake[] = [];
  const count = 80 + Math.floor(Math.random() * 40);

  const hotspots = [
    { lat: 35.68, lon: 139.69, spread: 10 },
    { lat: 37.77, lon: -122.42, spread: 8 },
    { lat: -33.87, lon: 151.21, spread: 6 },
    { lat: 51.51, lon: -0.13, spread: 4 },
    { lat: 1.35, lon: 103.82, spread: 7 },
    { lat: -34.6, lon: -58.38, spread: 5 },
    { lat: 35.67, lon: 51.42, spread: 8 },
    { lat: 19.43, lon: -99.13, spread: 7 },
    { lat: 0, lon: 0, spread: 30 },
    { lat: -20, lon: -175, spread: 15 },
  ];

  for (let i = 0; i < count; i++) {
    const hotspot = hotspots[Math.floor(Math.random() * hotspots.length)];
    const lat = hotspot.lat + (Math.random() - 0.5) * hotspot.spread * 2;
    const lon = hotspot.lon + (Math.random() - 0.5) * hotspot.spread * 2;
    const magnitude = 1.5 + Math.random() * 6;
    const depth = Math.random() * 500;
    const timeAgo = Math.random() * TIME_WINDOW_HOURS * 60 * 60 * 1000;

    quakes.push({
      id: `mock-${i}-${now}`,
      magnitude: parseFloat(magnitude.toFixed(2)),
      latitude: parseFloat(lat.toFixed(4)),
      longitude: parseFloat(((lon + 540) % 360) - 180).toFixed(4) as unknown as number,
      depth: parseFloat(depth.toFixed(1)),
      place: `Region near ${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`,
      time: now - timeAgo,
      title: `M${magnitude.toFixed(1)} - Region`,
      url: '#',
      radius: magnitudeToRadius(magnitude),
      color: getDepthColor(depth),
    });
  }

  return quakes.sort((a, b) => b.time - a.time);
}

function processQuake(feature: QuakeFeature): ProcessedQuake | null {
  const { properties, geometry, id } = feature;
  const mag = properties.mag;
  if (mag === null || mag < 0) return null;

  const [longitude, latitude, depth] = geometry.coordinates;
  const validLat = latitude as number;
  const validLon = longitude as number;
  const validDepth = (depth as number) || 0;

  return {
    id,
    magnitude: mag,
    latitude: validLat,
    longitude: validLon,
    depth: validDepth,
    place: properties.place || 'Unknown location',
    time: properties.time,
    title: properties.title || `M${mag}`,
    url: properties.url || '#',
    radius: magnitudeToRadius(mag),
    color: getDepthColor(validDepth),
  };
}

export async function fetchQuakes(force: boolean = false): Promise<ProcessedQuake[]> {
  const now = Date.now();

  if (!force && cachedData && now - cacheTimestamp < CACHE_INTERVAL) {
    return cachedData;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      let data: QuakeGeoJSON;
      try {
        const response = await axios.get(USGS_URL, { timeout: 8000 });
        data = response.data;
      } catch {
        const backup = await axios.get(BACKUP_URL, { timeout: 8000 });
        data = backup.data;
      }

      const processed: ProcessedQuake[] = [];
      const cutoff = now - TIME_WINDOW_HOURS * 60 * 60 * 1000;
      for (const feature of data.features) {
        if (feature.properties.time < cutoff) continue;
        const q = processQuake(feature);
        if (q) processed.push(q);
      }
      processed.sort((a, b) => b.time - a.time);

      cachedData = processed.length > 0 ? processed : generateMockData();
      cacheTimestamp = now;
      return cachedData;
    } catch (error) {
      console.warn('Using mock earthquake data:', error);
      cachedData = generateMockData();
      cacheTimestamp = now;
      return cachedData;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function filterQuakesByTime(
  quakes: ProcessedQuake[],
  beforeTimeMs: number
): ProcessedQuake[] {
  return quakes.filter((q) => q.time <= beforeTimeMs);
}

export function getTimeRange(quakes: ProcessedQuake[]): { start: number; end: number } {
  if (quakes.length === 0) {
    const now = Date.now();
    return { start: now - TIME_WINDOW_HOURS * 60 * 60 * 1000, end: now };
  }
  const times = quakes.map((q) => q.time);
  const dataMin = Math.min(...times);
  const dataMax = Math.max(...times);
  const fallbackStart = dataMax - TIME_WINDOW_HOURS * 60 * 60 * 1000;
  return { start: Math.min(dataMin, fallbackStart), end: dataMax };
}

export function computeMagnitudeStats(quakes: ProcessedQuake[]): MagnitudeStats {
  const stats: MagnitudeStats = { '1-3': 0, '3-5': 0, '5-7': 0, '7-9': 0 };
  for (const q of quakes) {
    if (q.magnitude < 3) stats['1-3']++;
    else if (q.magnitude < 5) stats['3-5']++;
    else if (q.magnitude < 7) stats['5-7']++;
    else stats['7-9']++;
  }
  return stats;
}

export function clearCache() {
  cachedData = null;
  cacheTimestamp = 0;
}
