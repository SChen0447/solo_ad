import { GeologyData, GeologyLayer, GeologyFault, StrikePoint } from './GeologyInterfaces';

const RAW_GEOLOGY_DATA = {
  groundSize: 12,
  layers: [
    {
      id: 'layer-1',
      name: '表土层',
      color: '#8B5E3C',
      topDepth: 0,
      bottomDepth: 6,
      density: 1500,
      era: '第四纪全新世'
    },
    {
      id: 'layer-2',
      name: '砂岩层',
      color: '#E8D5B7',
      topDepth: 7,
      bottomDepth: 15,
      density: 2300,
      era: '白垩纪晚期'
    },
    {
      id: 'layer-3',
      name: '页岩层',
      color: '#C4A882',
      topDepth: 16,
      bottomDepth: 26,
      density: 2600,
      era: '侏罗纪中期'
    },
    {
      id: 'layer-4',
      name: '石灰岩层',
      color: '#D3D3D3',
      topDepth: 27,
      bottomDepth: 38,
      density: 2700,
      era: '二叠纪早期'
    },
    {
      id: 'layer-5',
      name: '花岗岩层',
      color: '#B5651D',
      topDepth: 39,
      bottomDepth: 52,
      density: 2750,
      era: '前寒武纪'
    }
  ],
  faults: [
    {
      id: 'fault-1',
      name: '正断层 F1',
      strikePoints: [
        { x: -5, z: -5 },
        { x: 0, z: 0 },
        { x: 5, z: 5 }
      ] as StrikePoint[],
      dip: 60,
      slip: 3,
      topDepth: 6,
      bottomDepth: 39
    },
    {
      id: 'fault-2',
      name: '正断层 F2',
      strikePoints: [
        { x: -5, z: 5 },
        { x: 0, z: 0 },
        { x: 5, z: -5 }
      ] as StrikePoint[],
      dip: 55,
      slip: 2.5,
      topDepth: 6,
      bottomDepth: 39
    }
  ]
};

export class GeologyLoader {
  private data: GeologyData | null = null;

  loadSync(): GeologyData {
    const layers: GeologyLayer[] = RAW_GEOLOGY_DATA.layers.map(l => ({
      id: l.id,
      name: l.name,
      color: l.color,
      topDepth: l.topDepth,
      bottomDepth: l.bottomDepth,
      density: l.density,
      era: l.era
    }));

    const faults: GeologyFault[] = RAW_GEOLOGY_DATA.faults.map(f => ({
      id: f.id,
      name: f.name,
      strikePoints: f.strikePoints.map(sp => ({ x: sp.x, z: sp.z })),
      dip: f.dip,
      slip: f.slip,
      topDepth: f.topDepth,
      bottomDepth: f.bottomDepth
    }));

    const totalDepth = layers.reduce(
      (max, l) => Math.max(max, l.bottomDepth),
      0
    );

    this.data = {
      layers,
      faults,
      totalDepth,
      groundSize: RAW_GEOLOGY_DATA.groundSize
    };

    return this.data;
  }

  async loadFromJson(url: string): Promise<GeologyData> {
    const response = await fetch(url);
    const raw = await response.json();
    const layers: GeologyLayer[] = raw.layers.map((l: any) => ({
      id: l.id,
      name: l.name,
      color: l.color,
      topDepth: l.topDepth,
      bottomDepth: l.bottomDepth,
      density: l.density,
      era: l.era
    }));
    const faults: GeologyFault[] = raw.faults.map((f: any) => ({
      id: f.id,
      name: f.name,
      strikePoints: f.strikePoints,
      dip: f.dip,
      slip: f.slip,
      topDepth: f.topDepth,
      bottomDepth: f.bottomDepth
    }));
    const totalDepth = layers.reduce(
      (max: number, l: GeologyLayer) => Math.max(max, l.bottomDepth),
      0
    );
    this.data = {
      layers,
      faults,
      totalDepth,
      groundSize: raw.groundSize
    };
    return this.data;
  }

  getData(): GeologyData {
    if (!this.data) {
      throw new Error('GeologyLoader: 数据尚未加载');
    }
    return this.data;
  }
}
