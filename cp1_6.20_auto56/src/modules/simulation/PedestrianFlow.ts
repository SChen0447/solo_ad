export type ZoneType = 'residential' | 'commercial' | 'office' | 'park' | 'mixed';

export class PedestrianFlow {
  private readonly GRID_SIZE = 16;
  private readonly MIN_PEOPLE = 10;
  private readonly MAX_PEOPLE = 200;
  private readonly PERTURBATION = 0.15;

  private zoneMap: ZoneType[][];
  private zoneCenters: { type: ZoneType; col: number; row: number; radius: number }[] = [];

  constructor() {
    this.zoneMap = this.generateZoneMap();
  }

  private generateZoneMap(): ZoneType[][] {
    const map: ZoneType[][] = [];

    const residentialAreas = [
      { col: 2, row: 2, radius: 3 },
      { col: 12, row: 2, radius: 3 },
      { col: 2, row: 12, radius: 3 },
      { col: 13, row: 13, radius: 2 }
    ];

    const commercialAreas = [
      { col: 8, row: 7, radius: 3 },
      { col: 7, row: 8, radius: 2 }
    ];

    const officeAreas = [
      { col: 11, row: 8, radius: 2 },
      { col: 5, row: 5, radius: 2 }
    ];

    const parkAreas = [
      { col: 8, row: 13, radius: 2 },
      { col: 3, row: 8, radius: 2 }
    ];

    this.zoneCenters = [
      ...residentialAreas.map(a => ({ ...a, type: 'residential' as ZoneType })),
      ...commercialAreas.map(a => ({ ...a, type: 'commercial' as ZoneType })),
      ...officeAreas.map(a => ({ ...a, type: 'office' as ZoneType })),
      ...parkAreas.map(a => ({ ...a, type: 'park' as ZoneType }))
    ];

    for (let row = 0; row < this.GRID_SIZE; row++) {
      map[row] = [];
      for (let col = 0; col < this.GRID_SIZE; col++) {
        map[row][col] = this.classifyZone(col, row);
      }
    }

    return map;
  }

  private classifyZone(col: number, row: number): ZoneType {
    let bestType: ZoneType = 'mixed';
    let bestDist = Infinity;

    for (const zc of this.zoneCenters) {
      const d = Math.sqrt((col - zc.col) ** 2 + (row - zc.row) ** 2);
      if (d <= zc.radius && d < bestDist) {
        bestDist = d;
        bestType = zc.type;
      }
    }

    return bestType;
  }

  public generate(simulatedHour: number): number[][] {
    const matrix: number[][] = [];
    const periodFactor = this.getPeriodFactor(simulatedHour);

    for (let row = 0; row < this.GRID_SIZE; row++) {
      matrix[row] = [];
      for (let col = 0; col < this.GRID_SIZE; col++) {
        const zoneType = this.zoneMap[row][col];
        const baseFlow = this.getBaseFlow(zoneType);

        let factor = 1;
        switch (zoneType) {
          case 'residential':
            factor = periodFactor.residential;
            break;
          case 'commercial':
            factor = periodFactor.commercial;
            break;
          case 'office':
            factor = periodFactor.office;
            break;
          case 'park':
            factor = periodFactor.park;
            break;
          case 'mixed':
            factor = periodFactor.mixed;
            break;
        }

        let flow = baseFlow * factor;
        const perturbation = 1 + (Math.random() * 2 - 1) * this.PERTURBATION;
        flow *= perturbation;

        flow = Math.max(this.MIN_PEOPLE, Math.min(this.MAX_PEOPLE, flow));
        matrix[row][col] = Math.round(flow);
      }
    }

    return matrix;
  }

  private getBaseFlow(zoneType: ZoneType): number {
    switch (zoneType) {
      case 'commercial':
        return 130;
      case 'office':
        return 110;
      case 'residential':
        return 60;
      case 'mixed':
        return 80;
      case 'park':
        return 40;
      default:
        return 60;
    }
  }

  private getPeriodFactor(hour: number): Record<ZoneType, number> {
    const isMorningRush = hour >= 8 && hour < 9;
    const isEveningRush = hour >= 17 && hour < 19;
    const isWorkHours = hour >= 9 && hour < 17;
    const isEvening = hour >= 19 && hour < 23;
    const isNight = hour >= 23 || hour < 7;

    if (isMorningRush) {
      return {
        residential: 2.5,
        commercial: 0.8,
        office: 2.0,
        park: 0.5,
        mixed: 1.5
      };
    }

    if (isEveningRush) {
      return {
        residential: 1.2,
        commercial: 3.0,
        office: 2.2,
        park: 1.0,
        mixed: 1.8
      };
    }

    if (isWorkHours) {
      return {
        residential: 0.5,
        commercial: 1.5,
        office: 2.5,
        park: 0.8,
        mixed: 1.0
      };
    }

    if (isEvening) {
      return {
        residential: 1.2,
        commercial: 2.0,
        office: 0.5,
        park: 1.2,
        mixed: 1.3
      };
    }

    if (isNight) {
      return {
        residential: 0.8,
        commercial: 0.3,
        office: 0.1,
        park: 0.2,
        mixed: 0.4
      };
    }

    return {
      residential: 1.0,
      commercial: 1.0,
      office: 1.0,
      park: 1.0,
      mixed: 1.0
    };
  }

  public getZoneMap(): ZoneType[][] {
    return this.zoneMap.map(row => [...row]);
  }
}
