import type { TravelPoint } from '../types/travel';

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface PathSegment {
  start: TravelPoint;
  end: TravelPoint;
  distance: number;
  startTime: number;
  endTime: number;
}

export function calculatePathSegments(
  travelData: TravelPoint[]
): PathSegment[] {
  const segments: PathSegment[] = [];
  
  for (let i = 0; i < travelData.length - 1; i++) {
    const start = travelData[i];
    const end = travelData[i + 1];
    const distance = haversineDistance(start.lat, start.lng, end.lat, end.lng);
    const startTime = new Date(start.date).getTime();
    const endTime = new Date(end.date).getTime();
    
    segments.push({
      start,
      end,
      distance,
      startTime,
      endTime,
    });
  }
  
  return segments;
}

export function getInterpolatedPosition(
  travelData: TravelPoint[],
  currentTime: number,
  segments?: PathSegment[]
): { lat: number; lng: number; nearestPointIndex: number } {
  if (travelData.length === 0) {
    return { lat: 0, lng: 0, nearestPointIndex: -1 };
  }

  if (travelData.length === 1) {
    return {
      lat: travelData[0].lat,
      lng: travelData[0].lng,
      nearestPointIndex: 0,
    };
  }

  const pathSegments = segments || calculatePathSegments(travelData);
  const earliestTime = new Date(travelData[0].date).getTime();
  const latestTime = new Date(travelData[travelData.length - 1].date).getTime();

  const clampedTime = Math.max(earliestTime, Math.min(latestTime, currentTime));

  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    if (clampedTime >= segment.startTime && clampedTime <= segment.endTime) {
      const segmentDuration = segment.endTime - segment.startTime;
      const progress =
        segmentDuration > 0
          ? (clampedTime - segment.startTime) / segmentDuration
          : 0;

      const lat = segment.start.lat + (segment.end.lat - segment.start.lat) * progress;
      const lng = segment.start.lng + (segment.end.lng - segment.start.lng) * progress;

      const distanceToStart = progress * segment.distance;
      const distanceToEnd = (1 - progress) * segment.distance;
      const nearestPointIndex =
        distanceToStart <= distanceToEnd ? i : i + 1;

      return { lat, lng, nearestPointIndex };
    }
  }

  if (clampedTime <= earliestTime) {
    return {
      lat: travelData[0].lat,
      lng: travelData[0].lng,
      nearestPointIndex: 0,
    };
  }

  return {
    lat: travelData[travelData.length - 1].lat,
    lng: travelData[travelData.length - 1].lng,
    nearestPointIndex: travelData.length - 1,
  };
}

export function findNearestPointIndex(
  travelData: TravelPoint[],
  currentTime: number
): number {
  if (travelData.length === 0) return -1;
  
  let nearestIndex = 0;
  let minDiff = Math.abs(
    new Date(travelData[0].date).getTime() - currentTime
  );

  for (let i = 1; i < travelData.length; i++) {
    const diff = Math.abs(new Date(travelData[i].date).getTime() - currentTime);
    if (diff < minDiff) {
      minDiff = diff;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}
