export interface EnemySpawn {
  type: 'grunt' | 'elite';
  x: number;
}

export interface WaveData {
  enemies: EnemySpawn[];
  delay: number;
}

export interface TerrainData {
  groundY: number;
  groundHeight: number;
  groundWidth: number;
}

export interface LevelData {
  id: number;
  name: string;
  terrain: TerrainData;
  waves: WaveData[];
  waveInterval: number;
}

export class LevelManager {
  private levels: LevelData[] = [
    {
      id: 1,
      name: 'Forest Entrance',
      terrain: {
        groundY: 320,
        groundHeight: 40,
        groundWidth: 640
      },
      waves: [
        {
          enemies: [
            { type: 'grunt', x: 500 },
            { type: 'grunt', x: 580 }
          ],
          delay: 0
        },
        {
          enemies: [
            { type: 'grunt', x: 500 },
            { type: 'grunt', x: 580 },
            { type: 'grunt', x: 420 }
          ],
          delay: 5000
        }
      ],
      waveInterval: 5000
    },
    {
      id: 2,
      name: 'Deep Woods',
      terrain: {
        groundY: 320,
        groundHeight: 40,
        groundWidth: 640
      },
      waves: [
        {
          enemies: [
            { type: 'grunt', x: 500 },
            { type: 'elite', x: 580 }
          ],
          delay: 0
        },
        {
          enemies: [
            { type: 'grunt', x: 420 },
            { type: 'grunt', x: 500 },
            { type: 'elite', x: 580 }
          ],
          delay: 5000
        },
        {
          enemies: [
            { type: 'elite', x: 500 },
            { type: 'elite', x: 580 }
          ],
          delay: 5000
        }
      ],
      waveInterval: 5000
    },
    {
      id: 3,
      name: 'Boss Lair',
      terrain: {
        groundY: 320,
        groundHeight: 40,
        groundWidth: 640
      },
      waves: [
        {
          enemies: [
            { type: 'grunt', x: 420 },
            { type: 'grunt', x: 500 },
            { type: 'grunt', x: 580 }
          ],
          delay: 0
        },
        {
          enemies: [
            { type: 'elite', x: 420 },
            { type: 'grunt', x: 500 },
            { type: 'elite', x: 580 }
          ],
          delay: 5000
        },
        {
          enemies: [
            { type: 'elite', x: 420 },
            { type: 'elite', x: 500 },
            { type: 'elite', x: 580 }
          ],
          delay: 5000
        }
      ],
      waveInterval: 5000
    }
  ];

  getLevel(levelId: number): LevelData | undefined {
    return this.levels.find(l => l.id === levelId);
  }

  getAllLevels(): LevelData[] {
    return this.levels;
  }

  getTotalLevels(): number {
    return this.levels.length;
  }
}
