import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Artifact, ArtifactStoreState, Hotspot } from '../types';

const createHotspots = (type: Artifact['modelType']): Hotspot[] => {
  switch (type) {
    case 'bronze-ding':
      return [
        {
          id: uuidv4(),
          position: [0, 1.0, 0.9],
          title: '饕餮纹饰',
          description: '鼎身饰有饕餮纹，线条粗犷有力，象征古代祭祀中的神秘力量，为商周青铜器典型装饰纹样。'
        },
        {
          id: uuidv4(),
          position: [0, 1.4, 0],
          title: '铭文区域',
          description: '鼎腹内壁铸有铭文32字，记载周王赏赐事迹，是研究西周历史的重要实物文献资料。'
        },
        {
          id: uuidv4(),
          position: [-0.9, 0.2, 0],
          title: '鼎耳装饰',
          description: '双耳外侧饰以云雷纹地，线条流畅，铸造工艺精湛，反映当时高超的青铜冶炼技术。'
        }
      ];
    case 'blue-porcelain':
      return [
        {
          id: uuidv4(),
          position: [0, 1.2, 0.6],
          title: '青花缠枝纹',
          description: '瓶身通体绘青花缠枝莲纹，发色纯正典雅，层次分明，为明代永乐官窑典型精品之作。'
        },
        {
          id: uuidv4(),
          position: [0, 0.3, 0.55],
          title: '底款识',
          description: '圈足内书"大明宣德年制"六字双行楷书款，字体遒劲有力，为鉴定真伪之重要依据。'
        },
        {
          id: uuidv4(),
          position: [0, 1.85, 0],
          title: '瓶口描金',
          description: '口沿饰以金彩一圈，虽历经岁月仍保存完好，展现出当时匠人的卓越技艺与审美追求。'
        }
      ];
    case 'jade-disc':
      return [
        {
          id: uuidv4(),
          position: [0.75, 0, 0],
          title: '谷纹装饰',
          description: '璧面满饰谷纹，排列整齐有序，寓意五谷丰登，是战国时期玉璧最具代表性的纹饰之一。'
        },
        {
          id: uuidv4(),
          position: [0, 0, 0.05],
          title: '玉质沁色',
          description: '玉材为和田青白玉，受沁呈深浅不一的褐黄色，自然古朴，为二千余年地下埋藏所形成。'
        }
      ];
    case 'sancai-horse':
      return [
        {
          id: uuidv4(),
          position: [0.3, 1.3, 0.3],
          title: '马鞍装饰',
          description: '马鞍施以绿釉，上贴塑宝相花纹，色彩艳丽，造型逼真，为唐代贵族马具之典型样式。'
        },
        {
          id: uuidv4(),
          position: [0.7, 1.5, 0],
          title: '马头造型',
          description: '马首微扬，双目炯炯有神，口鼻部塑造细腻传神，体现盛唐"以胖为美"的审美风尚。'
        },
        {
          id: uuidv4(),
          position: [0, 0.4, 0.6],
          title: '釉色流淌',
          description: '通体施黄、绿、白三彩釉，色彩交融流淌，斑驳淋漓，形成唐三彩独有的艺术魅力。'
        }
      ];
    default:
      return [];
  }
};

const createMockArtifacts = (): Artifact[] => {
  return [
    {
      id: uuidv4(),
      name: '司母戊青铜鼎',
      dynasty: '商朝晚期',
      material: '青铜',
      description: '迄今出土最大最重的青铜器，鼎身饰饕餮纹，气势雄浑，为国之重器。',
      modelType: 'bronze-ding',
      hotspots: createHotspots('bronze-ding')
    },
    {
      id: uuidv4(),
      name: '青花缠枝莲纹梅瓶',
      dynasty: '明代宣德',
      material: '青花瓷',
      description: '器形端庄秀美，青花发色浓艳，绘缠枝莲纹，为明官窑青花瓷之典范。',
      modelType: 'blue-porcelain',
      hotspots: createHotspots('blue-porcelain')
    },
    {
      id: uuidv4(),
      name: '战国谷纹玉璧',
      dynasty: '战国',
      material: '和田青白玉',
      description: '玉质温润，满饰谷纹，雕琢精细，为古代礼天之器，等级尊贵。',
      modelType: 'jade-disc',
      hotspots: createHotspots('jade-disc')
    },
    {
      id: uuidv4(),
      name: '唐三彩骆驼载乐俑',
      dynasty: '唐代',
      material: '陶质三彩釉',
      description: '造型生动，色彩绚丽，骆驼背上载七人乐队，再现盛唐丝路繁华景象。',
      modelType: 'sancai-horse',
      hotspots: createHotspots('sancai-horse')
    }
  ];
};

export const useArtifactStore = create<ArtifactStoreState>((set, get) => ({
  artifacts: [],
  currentArtifactId: null,
  activeHotspotId: null,
  isLoading: false,

  loadArtifacts: () => {
    set({ isLoading: true });
    const artifacts = createMockArtifacts();
    set({
      artifacts,
      currentArtifactId: artifacts[0]?.id ?? null,
      activeHotspotId: null,
      isLoading: false
    });
  },

  selectArtifact: (id: string) => {
    const artifact = get().artifacts.find(a => a.id === id);
    if (artifact) {
      set({
        currentArtifactId: id,
        activeHotspotId: null
      });
    }
  },

  setActiveHotspot: (id: string | null) => {
    set({ activeHotspotId: id });
  }
}));
