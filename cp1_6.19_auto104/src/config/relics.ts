import type { Relic } from '../types';

export const RELICS: Relic[] = [
  {
    id: 'bronze-ding',
    name: '司母戊鼎',
    dynasty: '商代晚期',
    origin: '河南安阳殷墟',
    dimensions: { length: 110, width: 79, height: 133 },
    description: '司母戊鼎是中国现存最大最重的青铜器，重达832.84公斤。鼎身四周铸有精巧的盘龙纹和饕餮纹，增加了文物本身的威武凝重之感。',
    icon: '🏺',
    geometry: {
      type: 'box',
      params: { width: 2, height: 1.8, depth: 1.4 },
      material: { color: '#8B7355', metalness: 0.8, roughness: 0.3 }
    },
    annotations: [
      { id: 'ding-1', title: '鼎耳', content: '鼎耳外侧饰有虎纹，虎头相对，中衔人头，传说这种虎食人纹象征着威猛与权力。', position: { x: 0, y: 1.5, z: 0 } },
      { id: 'ding-2', title: '鼎腹', content: '鼎腹内壁铸有"司母戊"三字，是商王为祭祀其母戊所铸。字体笔势雄健，形体丰腴。', position: { x: 1.2, y: 0, z: 0 } },
      { id: 'ding-3', title: '鼎足', content: '四足中空，饰有蝉纹，寓意高洁与永生。足部的纹饰与鼎身呼应，整体和谐统一。', position: { x: -0.8, y: -1.2, z: 0.5 } }
    ],
    explosionParts: [
      { id: 'ding-body', name: '鼎身', offset: { x: 0, y: 0.5, z: 0 }, geometry: { type: 'box', params: { width: 2, height: 1.2, depth: 1.4 }, material: { color: '#8B7355', metalness: 0.8, roughness: 0.3 } } },
      { id: 'ding-ear-left', name: '左耳', offset: { x: -0.6, y: 1.8, z: 0 }, geometry: { type: 'box', params: { width: 0.3, height: 0.6, depth: 1.2 }, material: { color: '#8B7355', metalness: 0.8, roughness: 0.3 } } },
      { id: 'ding-ear-right', name: '右耳', offset: { x: 0.6, y: 1.8, z: 0 }, geometry: { type: 'box', params: { width: 0.3, height: 0.6, depth: 1.2 }, material: { color: '#8B7355', metalness: 0.8, roughness: 0.3 } } },
      { id: 'ding-foot-fl', name: '左前足', offset: { x: -0.7, y: -1.5, z: 0.4 }, geometry: { type: 'cylinder', params: { radiusTop: 0.15, radiusBottom: 0.2, height: 0.8, radialSegments: 8 }, material: { color: '#8B7355', metalness: 0.8, roughness: 0.3 } } },
      { id: 'ding-foot-fr', name: '右前足', offset: { x: 0.7, y: -1.5, z: 0.4 }, geometry: { type: 'cylinder', params: { radiusTop: 0.15, radiusBottom: 0.2, height: 0.8, radialSegments: 8 }, material: { color: '#8B7355', metalness: 0.8, roughness: 0.3 } } },
      { id: 'ding-foot-bl', name: '左后足', offset: { x: -0.7, y: -1.5, z: -0.4 }, geometry: { type: 'cylinder', params: { radiusTop: 0.15, radiusBottom: 0.2, height: 0.8, radialSegments: 8 }, material: { color: '#8B7355', metalness: 0.8, roughness: 0.3 } } },
      { id: 'ding-foot-br', name: '右后足', offset: { x: 0.7, y: -1.5, z: -0.4 }, geometry: { type: 'cylinder', params: { radiusTop: 0.15, radiusBottom: 0.2, height: 0.8, radialSegments: 8 }, material: { color: '#8B7355', metalness: 0.8, roughness: 0.3 } } }
    ]
  },
  {
    id: 'porcelain-vase',
    name: '青花瓷瓶',
    dynasty: '清代康熙',
    origin: '景德镇官窑',
    dimensions: { length: 22, width: 22, height: 58 },
    description: '这件青花瓷瓶是康熙年间的代表作，通体绘有缠枝莲纹，青花发色青翠明快，层次分明，展现了清代青花瓷的最高成就。',
    icon: '🫖',
    geometry: {
      type: 'cylinder',
      params: { radiusTop: 0.4, radiusBottom: 0.6, height: 2.5, radialSegments: 32 },
      material: { color: '#E8E4D9', metalness: 0.1, roughness: 0.4 }
    },
    annotations: [
      { id: 'vase-1', title: '瓶口', content: '撇口设计，线条优美流畅，口沿处描有青花双圈，是康熙青花瓷的典型特征。', position: { x: 0, y: 1.5, z: 0 } },
      { id: 'vase-2', title: '缠枝莲纹', content: '器身满绘缠枝莲花，枝蔓缠绕，花叶繁茂，寓意"清廉"与"生生不息"。', position: { x: 0.7, y: 0.3, z: 0 } },
      { id: 'vase-3', title: '圈足', content: '圈足规整，底足露胎处呈现"糯米白"胎质，底书"大清康熙年制"六字双行楷书款。', position: { x: 0, y: -1.4, z: 0.5 } }
    ],
    explosionParts: [
      { id: 'vase-mouth', name: '瓶口', offset: { x: 0, y: 1.8, z: 0 }, geometry: { type: 'cylinder', params: { radiusTop: 0.5, radiusBottom: 0.4, height: 0.4, radialSegments: 32 }, material: { color: '#E8E4D9', metalness: 0.1, roughness: 0.4 } } },
      { id: 'vase-neck', name: '瓶颈', offset: { x: 0, y: 1.2, z: 0 }, geometry: { type: 'cylinder', params: { radiusTop: 0.35, radiusBottom: 0.5, height: 0.5, radialSegments: 32 }, material: { color: '#E8E4D9', metalness: 0.1, roughness: 0.4 } } },
      { id: 'vase-body', name: '瓶身', offset: { x: 0, y: 0, z: 0 }, geometry: { type: 'cylinder', params: { radiusTop: 0.5, radiusBottom: 0.6, height: 1.8, radialSegments: 32 }, material: { color: '#E8E4D9', metalness: 0.1, roughness: 0.4 } } },
      { id: 'vase-foot', name: '圈足', offset: { x: 0, y: -1.5, z: 0 }, geometry: { type: 'cylinder', params: { radiusTop: 0.5, radiusBottom: 0.55, height: 0.3, radialSegments: 32 }, material: { color: '#E8E4D9', metalness: 0.1, roughness: 0.4 } } }
    ]
  },
  {
    id: 'jade-bi',
    name: '玉璧',
    dynasty: '西汉',
    origin: '河北满城中山靖王墓',
    dimensions: { length: 20, width: 20, height: 0.5 },
    description: '玉璧是中国古代重要的礼器之一，为"六瑞"之首。此件玉璧玉质温润，雕刻精美，璧面饰有谷纹，寓意五谷丰登。',
    icon: '💫',
    geometry: {
      type: 'torus',
      params: { radius: 1, tube: 0.25, radialSegments: 32, tubularSegments: 64 },
      material: { color: '#A8E6CF', metalness: 0.2, roughness: 0.15 }
    },
    annotations: [
      { id: 'bi-1', title: '玉质', content: '采用新疆和田青玉雕琢而成，玉质细腻温润，光泽内敛，是汉代玉器中的上乘之作。', position: { x: 0.8, y: 0, z: 0.3 } },
      { id: 'bi-2', title: '谷纹', content: '璧面满饰谷纹，排列整齐，每粒谷纹饱满凸起，摸之有扎手感，是汉代玉璧的典型纹饰。', position: { x: 0, y: 0.6, z: 0.3 } },
      { id: 'bi-3', title: '礼器功能', content: '玉璧在古代用于祭天，是身份等级的象征。《周礼》记载："以苍璧礼天"。', position: { x: -0.6, y: -0.4, z: 0.3 } }
    ],
    explosionParts: [
      { id: 'bi-outer', name: '外廓', offset: { x: 0, y: 0, z: 0 }, geometry: { type: 'torus', params: { radius: 1, tube: 0.15, radialSegments: 32, tubularSegments: 64 }, material: { color: '#A8E6CF', metalness: 0.2, roughness: 0.15 } } },
      { id: 'bi-inner', name: '内缘', offset: { x: 0, y: 0, z: 0.2 }, geometry: { type: 'torus', params: { radius: 0.6, tube: 0.1, radialSegments: 32, tubularSegments: 64 }, material: { color: '#88D8B0', metalness: 0.2, roughness: 0.15 } } },
      { id: 'bi-center', name: '中心孔', offset: { x: 0, y: 0, z: 0.4 }, geometry: { type: 'cylinder', params: { radiusTop: 0.4, radiusBottom: 0.4, height: 0.1, radialSegments: 32 }, material: { color: '#68C8A0', metalness: 0.2, roughness: 0.15 } } }
    ]
  },
  {
    id: 'bronze-sword',
    name: '越王勾践剑',
    dynasty: '春秋晚期',
    origin: '湖北江陵楚墓',
    dimensions: { length: 55, width: 5, height: 0.8 },
    description: '越王勾践剑被誉为"天下第一剑"，历经两千多年仍寒光逼人，锋利无比。剑身满饰菱形暗格纹，剑格正面镶蓝色琉璃，背面镶绿松石。',
    icon: '⚔️',
    geometry: {
      type: 'box',
      params: { width: 0.1, height: 2.8, depth: 0.05 },
      material: { color: '#C0C0C0', metalness: 0.95, roughness: 0.05 }
    },
    annotations: [
      { id: 'sword-1', title: '剑身铭文', content: '剑身近格处铸有鸟虫书铭文"越王勾践，自作用剑"八字，字体秀丽，是古代书法艺术的珍品。', position: { x: 0.3, y: 0.8, z: 0 } },
      { id: 'sword-2', title: '菱形暗格纹', content: '剑身满饰黑色菱形暗格纹，这种纹饰是通过硫化处理形成的，具有防锈功能，代表了当时最高的冶金工艺。', position: { x: 0.3, y: -0.3, z: 0 } },
      { id: 'sword-3', title: '剑格', content: '剑格正面镶蓝色琉璃，背面镶绿松石，色彩绚丽，是剑体装饰的精华所在。', position: { x: 0, y: 1.2, z: 0 } }
    ],
    explosionParts: [
      { id: 'sword-blade', name: '剑身', offset: { x: 0, y: -0.2, z: 0 }, geometry: { type: 'box', params: { width: 0.1, height: 2.2, depth: 0.05 }, material: { color: '#C0C0C0', metalness: 0.95, roughness: 0.05 } } },
      { id: 'sword-hilt', name: '剑柄', offset: { x: 0, y: 1.5, z: 0 }, geometry: { type: 'cylinder', params: { radiusTop: 0.08, radiusBottom: 0.08, height: 0.5, radialSegments: 16 }, material: { color: '#8B4513', metalness: 0.3, roughness: 0.6 } } },
      { id: 'sword-guard', name: '剑格', offset: { x: 0, y: 1, z: 0 }, geometry: { type: 'box', params: { width: 0.3, height: 0.1, depth: 0.08 }, material: { color: '#FFD700', metalness: 0.9, roughness: 0.2 } } },
      { id: 'sword-pommel', name: '剑首', offset: { x: 0, y: 1.8, z: 0 }, geometry: { type: 'sphere', params: { radius: 0.08, widthSegments: 16, heightSegments: 16 }, material: { color: '#FFD700', metalness: 0.9, roughness: 0.2 } } }
    ]
  },
  {
    id: 'gold-mask',
    name: '三星堆金面具',
    dynasty: '商代晚期',
    origin: '四川广汉三星堆',
    dimensions: { length: 37, width: 1, height: 52 },
    description: '三星堆金面具是目前中国发现的同时期最大的黄金面具，造型神秘独特，大耳、大眼、高鼻，展现了古蜀文明独特的审美和高超的工艺水平。',
    icon: '👑',
    geometry: {
      type: 'extrude',
      params: { width: 1.8, height: 2.2, depth: 0.1 },
      material: { color: '#FFD700', metalness: 0.98, roughness: 0.08 }
    },
    annotations: [
      { id: 'mask-1', title: '眼部造型', content: '双眼呈斜三角形，眼角上翘，眼球向外凸出，这种"纵目"造型是古蜀人对"千里眼"的崇拜体现。', position: { x: 0.4, y: 0.3, z: 0.3 } },
      { id: 'mask-2', title: '耳部造型', content: '耳朵硕大如兽耳，向两侧充分展开，耳垂穿孔，象征着"顺风耳"，表达了古蜀人对超自然能力的向往。', position: { x: 1.1, y: 0, z: 0 } },
      { id: 'mask-3', title: '金面工艺', content: '金面由金箔锤揲而成，厚度仅0.02厘米，工艺精湛，显示出古蜀人高超的黄金加工技术。', position: { x: 0, y: -0.8, z: 0.3 } }
    ],
    explosionParts: [
      { id: 'mask-face', name: '面部主体', offset: { x: 0, y: 0, z: 0 }, geometry: { type: 'extrude', params: { width: 1.4, height: 1.8, depth: 0.1 }, material: { color: '#FFD700', metalness: 0.98, roughness: 0.08 } } },
      { id: 'mask-ear-left', name: '左耳', offset: { x: -1.2, y: 0.2, z: 0 }, geometry: { type: 'box', params: { width: 0.4, height: 0.8, depth: 0.05 }, material: { color: '#FFD700', metalness: 0.98, roughness: 0.08 } } },
      { id: 'mask-ear-right', name: '右耳', offset: { x: 1.2, y: 0.2, z: 0 }, geometry: { type: 'box', params: { width: 0.4, height: 0.8, depth: 0.05 }, material: { color: '#FFD700', metalness: 0.98, roughness: 0.08 } } },
      { id: 'mask-eyes', name: '双眼', offset: { x: 0, y: 0.3, z: 0.15 }, geometry: { type: 'box', params: { width: 0.9, height: 0.25, depth: 0.1 }, material: { color: '#1a1a1a', metalness: 0.5, roughness: 0.3 } } },
      { id: 'mask-nose', name: '鼻梁', offset: { x: 0, y: -0.1, z: 0.1 }, geometry: { type: 'cone', params: { radius: 0.1, height: 0.4, radialSegments: 8 }, material: { color: '#FFD700', metalness: 0.98, roughness: 0.08 } } }
    ]
  },
  {
    id: 'clay-figurine',
    name: '兵马俑将军俑',
    dynasty: '秦代',
    origin: '陕西西安秦始皇陵',
    dimensions: { length: 60, width: 45, height: 196 },
    description: '将军俑是秦兵马俑中级别最高的陶俑，身材魁梧，身披双重铠甲，头戴鹖冠，神态庄重，展现了秦军将领的威严风范。',
    icon: '🗿',
    geometry: {
      type: 'cylinder',
      params: { radiusTop: 0.4, radiusBottom: 0.6, height: 3, radialSegments: 16 },
      material: { color: '#A0826D', metalness: 0.1, roughness: 0.8 }
    },
    annotations: [
      { id: 'figurine-1', title: '鹖冠', content: '头戴双尾鹖冠，是将军身份的标志。鹖鸟生性好斗，至死不却，以此为冠象征将军的勇武。', position: { x: 0, y: 1.7, z: 0.3 } },
      { id: 'figurine-2', title: '双重铠甲', content: '身穿彩色鱼鳞甲，前胸和后背饰有彩色花结，肩臂部披膊，胸前、背后各有三朵花结，表明其高级指挥官身份。', position: { x: 0.5, y: 0.5, z: 0 } },
      { id: 'figurine-3', title: '面部神态', content: '面部神态肃穆，胡须梳理整齐，目光炯炯有神，嘴唇紧闭，表现出指挥若定的大将风度。', position: { x: 0, y: 1.3, z: 0.4 } },
      { id: 'figurine-4', title: '陶俑工艺', content: '采用写实主义手法塑造，比例匀称，每一件俑的面部特征都各不相同，体现了秦代雕塑艺术的最高水平。', position: { x: -0.5, y: -0.5, z: 0.3 } }
    ],
    explosionParts: [
      { id: 'figurine-head', name: '头部', offset: { x: 0, y: 2, z: 0 }, geometry: { type: 'sphere', params: { radius: 0.35, widthSegments: 16, heightSegments: 16 }, material: { color: '#A0826D', metalness: 0.1, roughness: 0.8 } } },
      { id: 'figurine-helmet', name: '鹖冠', offset: { x: 0, y: 2.4, z: 0 }, geometry: { type: 'box', params: { width: 0.4, height: 0.25, depth: 0.5 }, material: { color: '#8B0000', metalness: 0.3, roughness: 0.6 } } },
      { id: 'figurine-torso', name: '躯干', offset: { x: 0, y: 0.5, z: 0 }, geometry: { type: 'box', params: { width: 0.8, height: 1.2, depth: 0.5 }, material: { color: '#A0826D', metalness: 0.1, roughness: 0.8 } } },
      { id: 'figurine-armor', name: '铠甲', offset: { x: 0, y: 0.5, z: 0.1 }, geometry: { type: 'box', params: { width: 0.85, height: 1.1, depth: 0.15 }, material: { color: '#696969', metalness: 0.7, roughness: 0.4 } } },
      { id: 'figurine-arm-left', name: '左臂', offset: { x: -0.6, y: 0.8, z: 0 }, geometry: { type: 'cylinder', params: { radiusTop: 0.12, radiusBottom: 0.1, height: 0.8, radialSegments: 8 }, material: { color: '#A0826D', metalness: 0.1, roughness: 0.8 } } },
      { id: 'figurine-arm-right', name: '右臂', offset: { x: 0.6, y: 0.8, z: 0 }, geometry: { type: 'cylinder', params: { radiusTop: 0.12, radiusBottom: 0.1, height: 0.8, radialSegments: 8 }, material: { color: '#A0826D', metalness: 0.1, roughness: 0.8 } } },
      { id: 'figurine-leg-left', name: '左腿', offset: { x: -0.25, y: -1, z: 0 }, geometry: { type: 'cylinder', params: { radiusTop: 0.15, radiusBottom: 0.13, height: 1, radialSegments: 8 }, material: { color: '#A0826D', metalness: 0.1, roughness: 0.8 } } },
      { id: 'figurine-leg-right', name: '右腿', offset: { x: 0.25, y: -1, z: 0 }, geometry: { type: 'cylinder', params: { radiusTop: 0.15, radiusBottom: 0.13, height: 1, radialSegments: 8 }, material: { color: '#A0826D', metalness: 0.1, roughness: 0.8 } } }
    ]
  }
];

export const getRelicById = (id: string): Relic | undefined => {
  return RELICS.find(relic => relic.id === id);
};

export const getRelicIndex = (id: string): number => {
  return RELICS.findIndex(relic => relic.id === id);
};
