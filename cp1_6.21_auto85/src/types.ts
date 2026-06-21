export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Exhibit {
  id: string;
  name: string;
  era: string;
  audioText: string;
  position: Vector3;
  zoneId: string;
  color: string;
  size: number;
  relatedExhibitIds: string[];
}

export interface Zone {
  id: string;
  name: string;
  floorColor: string;
  accentColor: string;
  colorPalette: string[];
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
}

export interface PathPoint {
  x: number;
  z: number;
}

export interface TourStats {
  totalDistance: number;
  walkingTime: number;
  exhibitStayTime: number;
  totalTime: number;
  exhibitCount: number;
}

export interface TourRoute {
  id: string;
  name: string;
  startZoneId: string;
  endZoneId: string;
  exhibitIds: string[];
  pathPoints: PathPoint[];
  controlPoints: PathPoint[];
}
