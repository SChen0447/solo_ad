export interface QuakeProperties {
  mag: number | null;
  place: string;
  time: number;
  updated: number;
  tz: number | null;
  url: string;
  detail: string;
  felt: number | null;
  cdi: number | null;
  mmi: number | null;
  alert: string | null;
  status: string;
  tsunami: number;
  sig: number;
  net: string;
  code: string;
  ids: string;
  sources: string;
  types: string;
  nst: number | null;
  dmin: number | null;
  rms: number | null;
  gap: number | null;
  magType: string | null;
  type: string;
  title: string;
}

export interface QuakeGeometry {
  type: 'Point';
  coordinates: [number, number, number];
}

export interface QuakeFeature {
  type: 'Feature';
  properties: QuakeProperties;
  geometry: QuakeGeometry;
  id: string;
}

export interface QuakeGeoJSON {
  type: 'FeatureCollection';
  metadata: {
    generated: number;
    url: string;
    title: string;
    status: number;
    api: string;
    count: number;
  };
  features: QuakeFeature[];
}

export interface ProcessedQuake {
  id: string;
  magnitude: number;
  latitude: number;
  longitude: number;
  depth: number;
  place: string;
  time: number;
  title: string;
  url: string;
  radius: number;
  color: string;
}

export type DepthCategory = 'shallow' | 'moderate' | 'deep' | 'verydeep';

export interface MagnitudeStats {
  '1-3': number;
  '3-5': number;
  '5-7': number;
  '7-9': number;
}
