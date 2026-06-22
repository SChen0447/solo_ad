import { dataStore, TripReport, Checkin } from './dataStore';
import { calculateRouteDistance, estimateDuration } from './routeService';

function estimateCityCount(latMin: number, latMax: number, lngMin: number, lngMax: number): number {
  const latRange = latMax - latMin;
  const lngRange = lngMax - lngMin;
  const area = latRange * lngRange;
  const cities = Math.max(1, Math.floor(Math.sqrt(area) * 50) + 1);
  return Math.min(cities, 10);
}

export function generateReport(routeId: string): TripReport | null {
  const route = dataStore.getRoute(routeId);
  if (!route) return null;

  const checkins = dataStore.getCheckinsByRoute(routeId);
  const distance = calculateRouteDistance(route.waypoints);
  const duration = estimateDuration(distance);

  let cityCount = 1;
  if (route.waypoints.length > 0) {
    const lats = route.waypoints.map((w) => w.lat);
    const lngs = route.waypoints.map((w) => w.lng);
    cityCount = estimateCityCount(
      Math.min(...lats),
      Math.max(...lats),
      Math.min(...lngs),
      Math.max(...lngs)
    );
  }

  const existingReport = dataStore.getReportByRoute(routeId);
  const reportData: Omit<TripReport, 'id' | 'createdAt'> = {
    routeId,
    totalDistance: Math.round(distance * 10) / 10,
    totalDuration: Math.round(duration),
    cityCount,
    checkins,
    route,
  };

  if (existingReport) {
    return dataStore.updateReport(existingReport.id, reportData) || null;
  } else {
    return dataStore.createReport(reportData);
  }
}

export function getReportTimeline(routeId: string): Checkin[] {
  const checkins = dataStore.getCheckinsByRoute(routeId);
  return checkins.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
