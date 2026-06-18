import type { BuildingData, SunlightResult } from '../types';
import { getBuildings } from '../scene/BuildingFactory';
import { isBuildingInShadow, calculateShadowArea } from './ShadowMapper';

export function analyzeSunlight(
  buildingId: string,
  month: number,
  day: number
): SunlightResult | null {
  const buildings = getBuildings();
  const building = buildings.find((b) => b.id === buildingId);
  
  if (!building) return null;
  
  const timeline: { hour: number; isSunlit: boolean }[] = [];
  let totalMinutes = 0;
  let maxShadowArea = 0;
  
  const otherBuildings = buildings.filter((b) => b.id !== buildingId);
  
  for (let hour = 6; hour <= 20; hour += 0.25) {
    const inShadow = isBuildingInShadow(building, otherBuildings, hour, month, day);
    const isSunlit = !inShadow;
    
    timeline.push({ hour, isSunlit });
    
    if (isSunlit) {
      totalMinutes += 15;
    }
    
    const shadowArea = calculateShadowArea(building, hour, month, day);
    if (shadowArea > maxShadowArea) {
      maxShadowArea = shadowArea;
    }
  }
  
  return {
    totalMinutes,
    longestShadowArea: Math.round(maxShadowArea * 100) / 100,
    timeline,
  };
}

export function getLongestContinuousShadow(
  timeline: { hour: number; isSunlit: boolean }[]
): { startHour: number; endHour: number; durationMinutes: number } {
  let maxStart = 0;
  let maxEnd = 0;
  let maxDuration = 0;
  let currentStart: number | null = null;
  
  for (let i = 0; i < timeline.length; i++) {
    const { hour, isSunlit } = timeline[i];
    
    if (!isSunlit && currentStart === null) {
      currentStart = hour;
    } else if (isSunlit && currentStart !== null) {
      const duration = (hour - currentStart) * 60;
      if (duration > maxDuration) {
        maxDuration = duration;
        maxStart = currentStart;
        maxEnd = hour;
      }
      currentStart = null;
    }
  }
  
  if (currentStart !== null) {
    const duration = (20 - currentStart) * 60;
    if (duration > maxDuration) {
      maxDuration = duration;
      maxStart = currentStart;
      maxEnd = 20;
    }
  }
  
  return {
    startHour: maxStart,
    endHour: maxEnd,
    durationMinutes: Math.round(maxDuration),
  };
}

export function formatTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}小时${minutes}分`;
}
