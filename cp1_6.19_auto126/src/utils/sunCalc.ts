import type { SeasonType } from '@/types';

const SEASON_DECLINATION: Record<SeasonType, number> = {
  spring: 0,
  summer: 23.45 * Math.PI / 180,
  autumn: 0,
  winter: -23.45 * Math.PI / 180,
};

const LATITUDE = 39.9 * Math.PI / 180;

export function calculateSunPosition(season: SeasonType, time: number): { azimuth: number; altitude: number } {
  const declination = SEASON_DECLINATION[season];
  const hourAngle = (time - 12) * 15 * Math.PI / 180;

  const sinAltitude = Math.sin(LATITUDE) * Math.sin(declination) +
    Math.cos(LATITUDE) * Math.cos(declination) * Math.cos(hourAngle);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude)));

  const cosAzimuth = (Math.sin(declination) - Math.sin(LATITUDE) * sinAltitude) /
    (Math.cos(LATITUDE) * Math.cos(altitude));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAzimuth)));

  if (hourAngle > 0) {
    azimuth = 2 * Math.PI - azimuth;
  }

  return { azimuth, altitude };
}

export function formatTime(time: number): string {
  const hours = Math.floor(time);
  const minutes = Math.round((time - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function getSeasonName(season: SeasonType): string {
  const names: Record<SeasonType, string> = {
    spring: '春分',
    summer: '夏至',
    autumn: '秋分',
    winter: '冬至',
  };
  return names[season];
}

export function calculateSunshineDuration(
  season: SeasonType,
  buildingX: number,
  buildingZ: number,
  buildingHeight: number,
  buildings: Array<{ x: number; z: number; width: number; depth: number; height: number }>
): number {
  let totalHours = 0;
  const step = 0.25;

  for (let time = 6; time <= 18; time += step) {
    const { altitude, azimuth } = calculateSunPosition(season, time);
    if (altitude <= 0) continue;

    let isShadowed = false;
    const shadowLength = buildingHeight / Math.tan(altitude);
    const shadowDirX = -Math.sin(azimuth);
    const shadowDirZ = -Math.cos(azimuth);

    for (const other of buildings) {
      if (other.x === buildingX && other.z === buildingZ) continue;

      const dx = buildingX - other.x;
      const dz = buildingZ - other.z;

      const projAlongShadow = dx * shadowDirX + dz * shadowDirZ;

      if (projAlongShadow > 0 && projAlongShadow < shadowLength) {
        const perpDist = Math.abs(dx * shadowDirZ - dz * shadowDirX);
        if (perpDist < other.width / 2 + buildingHeight * 0.1) {
          const shadowHeightAtPoint = other.height - (projAlongShadow / shadowLength) * other.height;
          if (shadowHeightAtPoint > 0) {
            isShadowed = true;
            break;
          }
        }
      }
    }

    if (!isShadowed) {
      totalHours += step;
    }
  }

  return totalHours;
}
