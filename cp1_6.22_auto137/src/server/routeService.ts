import { dataStore, Waypoint, POI, Route } from './dataStore';

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function calculateRouteDistance(waypoints: Waypoint[]): number {
  if (waypoints.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += calculateDistance(
      waypoints[i].lat,
      waypoints[i].lng,
      waypoints[i + 1].lat,
      waypoints[i + 1].lng
    );
  }
  return total;
}

export function estimateDuration(distanceKm: number): number {
  const averageSpeedKmh = 60;
  return (distanceKm / averageSpeedKmh) * 60;
}

function distanceToSegment(
  lat: number,
  lng: number,
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const d1 = calculateDistance(lat, lng, lat1, lng1);
  const d2 = calculateDistance(lat, lng, lat2, lng2);
  const d3 = calculateDistance(lat1, lng1, lat2, lng2);
  if (d3 === 0) return d1;
  const s = (d1 + d2 + d3) / 2;
  const area = Math.sqrt(s * (s - d1) * (s - d2) * (s - d3));
  const height = (2 * area) / d3;
  if (d1 * d1 > d2 * d2 + d3 * d3) return d2;
  if (d2 * d2 > d1 * d1 + d3 * d3) return d1;
  return height;
}

function distanceToRoute(lat: number, lng: number, waypoints: Waypoint[]): number {
  if (waypoints.length === 0) return Infinity;
  if (waypoints.length === 1) {
    return calculateDistance(lat, lng, waypoints[0].lat, waypoints[0].lng);
  }
  let minDist = Infinity;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dist = distanceToSegment(
      lat,
      lng,
      waypoints[i].lat,
      waypoints[i].lng,
      waypoints[i + 1].lat,
      waypoints[i + 1].lng
    );
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

export function getPOIsNearRoute(
  routeId: string,
  maxDistanceKm: number = 20
): (POI & { distance: number })[] {
  const route = dataStore.getRoute(routeId);
  if (!route || route.waypoints.length === 0) return [];
  const allPOIs = dataStore.getAllPOIs();
  const result: (POI & { distance: number })[] = [];
  for (const poi of allPOIs) {
    const dist = distanceToRoute(poi.lat, poi.lng, route.waypoints);
    if (dist <= maxDistanceKm) {
      result.push({ ...poi, distance: dist });
    }
  }
  result.sort((a, b) => a.distance - b.distance);
  return result;
}

export function getRouteStats(routeId: string): {
  distance: number;
  duration: number;
  waypointCount: number;
} | null {
  const route = dataStore.getRoute(routeId);
  if (!route) return null;
  const distance = calculateRouteDistance(route.waypoints);
  const duration = estimateDuration(distance);
  return {
    distance: Math.round(distance * 10) / 10,
    duration: Math.round(duration),
    waypointCount: route.waypoints.length,
  };
}

export function addPOIToRoute(routeId: string, poiId: string): Route | undefined {
  const route = dataStore.getRoute(routeId);
  const poi = dataStore.getPOI(poiId);
  if (!route || !poi) return undefined;
  const waypoint: Omit<Waypoint, 'id'> = {
    name: poi.name,
    lat: poi.lat,
    lng: poi.lng,
    order: route.waypoints.length,
  };
  return dataStore.addWaypoint(routeId, waypoint);
}
