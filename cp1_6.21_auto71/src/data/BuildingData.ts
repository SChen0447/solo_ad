export type BuildingType = 'residential' | 'commercial' | 'public';

export interface Building {
  id: string;
  name: string;
  x: number;
  z: number;
  type: BuildingType;
  buildYear: number;
  heights: {
    1990: number;
    2000: number;
    2010: number;
    2020: number;
  };
}

export const ERAS = [1990, 2000, 2010, 2020];

function generateBuildingData(): Building[] {
  const buildings: Building[] = [];
  const gridSize = 12;
  const spacing = 12;
  const offset = -((gridSize - 1) * spacing) / 2;

  let index = 0;

  const buildingNames = {
    residential: [
      '阳光花园小区', '翠湖家园', '锦绣家园', '和谐社区', '幸福里',
      '春天花园', '金色家园', '丽景小区', '滨江花园', '绿洲小区',
      '星海家园', '碧水湾', '都市花园', '阳光半岛', '翡翠城',
      '金色港湾', '紫荆花园', '桂花苑', '玉兰小区', '海棠花园'
    ],
    commercial: [
      '国贸大厦', '金融中心', '时代广场', '财富中心', '环球大厦',
      '中央商务区', '摩天大楼', '世贸中心', '金融港', '科技大厦',
      '商务中心', '企业总部', '创新大厦', '智慧城', '数字大厦',
      '云顶大厦', '星河中心', '万象城', '银泰中心', '恒隆广场'
    ],
    public: [
      '市民中心', '文化广场', '图书馆', '博物馆', '科技馆',
      '体育中心', '会展中心', '艺术中心', '大剧院', '少年宫',
      '规划馆', '档案馆', '青少年活动中心', '老年活动中心', '社区医院',
      '公交枢纽', '地铁站', '公园管理处', '消防站', '派出所'
    ]
  };

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = offset + col * spacing + (Math.random() - 0.5) * 4;
      const z = offset + row * spacing + (Math.random() - 0.5) * 4;

      const rand = Math.random();
      let type: BuildingType;
      if (rand < 0.5) {
        type = 'residential';
      } else if (rand < 0.8) {
        type = 'commercial';
      } else {
        type = 'public';
      }

      const nameList = buildingNames[type];
      const nameIndex = index % nameList.length;
      const suffix = Math.floor(index / nameList.length);
      const buildingName = suffix > 0
        ? `${nameList[nameIndex]}${suffix + 1}号楼`
        : nameList[nameIndex];

      const baseHeight = type === 'commercial'
        ? 25 + Math.random() * 45
        : type === 'residential'
          ? 10 + Math.random() * 25
          : 8 + Math.random() * 18;

      const buildYear = type === 'public'
        ? 1980 + Math.floor(Math.random() * 10)
        : type === 'commercial'
          ? 1985 + Math.floor(Math.random() * 15)
          : 1982 + Math.floor(Math.random() * 18);

      buildings.push({
        id: `building-${index}`,
        name: buildingName,
        x,
        z,
        type,
        buildYear,
        heights: {
          1990: baseHeight * (0.3 + Math.random() * 0.2),
          2000: baseHeight * (0.5 + Math.random() * 0.3),
          2010: baseHeight * (0.75 + Math.random() * 0.25),
          2020: baseHeight * (1 + Math.random() * 0.3)
        }
      });

      index++;
    }
  }

  return buildings;
}

export const BUILDINGS_DATA: Building[] = generateBuildingData();

export function getBuildingsByEra(era: number): Building[] {
  return BUILDINGS_DATA.filter(b => b.buildYear <= era);
}

export function getBuildingHeight(building: Building, era: number): number {
  if (building.buildYear > era) return 0;
  switch (era) {
    case 1990: return building.heights['1990'];
    case 2000: return building.heights['2000'];
    case 2010: return building.heights['2010'];
    case 2020: return building.heights['2020'];
    default: return building.heights['1990'];
  }
}
