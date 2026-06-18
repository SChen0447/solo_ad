import { create } from 'zustand';
import { Photo, Category } from './types';
import { v4 as uuidv4 } from 'uuid';

const MOCK_PHOTOS: Photo[] = [
  {
    id: uuidv4(),
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=stunning%20mountain%20landscape%20with%20lake%20reflection%20at%20sunset%2C%20dramatic%20lighting%2C%20ultra%20detailed&image_size=landscape_16_9',
    title: '湖光山色',
    category: '风景',
    description: '夕阳下的高山湖泊，倒映着绚烂的天空和雄伟的山峰。',
  },
  {
    id: uuidv4(),
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=peaceful%20forest%20stream%20with%20morning%20mist%2C%20sunbeams%20through%20trees%2C%20nature%20photography&image_size=landscape_16_9',
    title: '晨雾溪流',
    category: '风景',
    description: '清晨的森林中，薄雾缭绕在溪流上方，阳光穿透树冠。',
  },
  {
    id: uuidv4(),
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=portrait%20of%20elegant%20woman%20with%20soft%20natural%20lighting%2C%20bokeh%20background%2C%20professional%20photography&image_size=portrait_4_3',
    title: '柔光肖像',
    category: '人像',
    description: '自然光下的人像摄影，柔和的光线勾勒出优雅的轮廓。',
  },
  {
    id: uuidv4(),
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20glass%20skyscraper%20against%20blue%20sky%2C%20architectural%20photography%2C%20geometric%20patterns&image_size=portrait_4_3',
    title: '玻璃之塔',
    category: '建筑',
    description: '现代摩天大楼的玻璃幕墙映射着蓝天白云，展现建筑的几何之美。',
  },
  {
    id: uuidv4(),
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=majestic%20lion%20in%20golden%20african%20savanna%20sunset%2C%20wildlife%20photography%2C%20dramatic&image_size=landscape_16_9',
    title: '草原之王',
    category: '动物',
    description: '金色非洲草原上雄狮的壮丽身影，夕阳为其镀上金色的光芒。',
  },
  {
    id: uuidv4(),
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cherry%20blossom%20tree%20in%20spring%2C%20pink%20petals%20falling%2C%20peaceful%20garden%20scene&image_size=landscape_16_9',
    title: '春日樱花',
    category: '自然',
    description: '春日里盛开的樱花树，粉色花瓣随风飘落，如梦似幻。',
  },
  {
    id: uuidv4(),
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ocean%20waves%20crashing%20on%20rocky%20shore%2C%20long%20exposure%2C%20moody%20seascape&image_size=landscape_16_9',
    title: '惊涛拍岸',
    category: '风景',
    description: '海浪拍击礁石，长曝光下呈现出丝绸般的动态效果。',
  },
  {
    id: uuidv4(),
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=street%20portrait%20of%20musician%20playing%20guitar%2C%20urban%20night%20scene%2C%20warm%20lighting&image_size=portrait_4_3',
    title: '街头乐手',
    category: '人像',
    description: '城市夜晚街头的吉他手，温暖的灯光照亮专注的面庞。',
  },
  {
    id: uuidv4(),
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ancient%20Chinese%20temple%20with%20curved%20roof%2C%20traditional%20architecture%2C%20misty%20morning&image_size=landscape_16_9',
    title: '古寺晨钟',
    category: '建筑',
    description: '晨雾中若隐若现的中式古寺，飞檐翘角承载千年文化。',
  },
  {
    id: uuidv4(),
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=colorful%20parrot%20in%20tropical%20rainforest%2C%20vivid%20colors%2C%20wildlife%20close-up&image_size=portrait_4_3',
    title: '雨林鹦鹉',
    category: '动物',
    description: '热带雨林中色彩斑斓的鹦鹉，翠绿的羽毛闪耀着宝石般的光泽。',
  },
  {
    id: uuidv4(),
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=autumn%20forest%20with%20golden%20and%20red%20leaves%2C%20winding%20path%2C%20warm%20atmosphere&image_size=landscape_16_9',
    title: '金秋密林',
    category: '自然',
    description: '秋日的森林，金黄与火红交织，蜿蜒的小径通向远方。',
  },
  {
    id: uuidv4(),
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=starry%20night%20sky%20over%20desert%20dunes%2C%20milky%20way%2C%20astrophotography&image_size=landscape_16_9',
    title: '沙漠星河',
    category: '风景',
    description: '沙漠上空的璀璨银河，沙丘的曲线与星光交相辉映。',
  },
  {
    id: uuidv4(),
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dancer%20in%20motion%2C%20dynamic%20portrait%2C%20flowing%20fabric%2C%20dramatic%20lighting&image_size=portrait_4_3',
    title: '舞者之姿',
    category: '人像',
    description: '舞者翩然起舞的瞬间，流动的裙摆与光影交织。',
  },
  {
    id: uuidv4(),
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=futuristic%20bridge%20architecture%20at%20night%2C%20LED%20lights%2C%20modern%20city%2C%20reflection&image_size=landscape_16_9',
    title: '未来之桥',
    category: '建筑',
    description: '夜晚LED灯光装饰的未来主义桥梁，映射在平静的水面上。',
  },
  {
    id: uuidv4(),
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20red%20panda%20on%20tree%20branch%2C%20adorable%20wildlife%2C%20soft%20focus%20background&image_size=portrait_4_3',
    title: '树梢小熊猫',
    category: '动物',
    description: '树枝上憨态可掬的小熊猫，毛茸茸的尾巴垂在枝头。',
  },
  {
    id: uuidv4(),
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=waterfall%20in%20lush%20green%20canyon%2C%20long%20exposure%2C%20tropical%20paradise&image_size=landscape_16_9',
    title: '峡谷飞瀑',
    category: '自然',
    description: '翠绿峡谷中的瀑布，长曝光下水流如丝绸般柔滑。',
  },
];

interface GalleryState {
  photos: Photo[];
  filteredPhotos: Photo[];
  selectedCategory: Category | '全部';
  searchKeyword: string;
  slideshowIndex: number | null;

  setCategory: (category: Category | '全部') => void;
  setSearchKeyword: (keyword: string) => void;
  openSlideshow: (index: number) => void;
  closeSlideshow: () => void;
  nextSlide: () => void;
  prevSlide: () => void;
}

const filterPhotos = (photos: Photo[], category: Category | '全部', keyword: string): Photo[] => {
  return photos.filter((photo) => {
    const matchCategory = category === '全部' || photo.category === category;
    const matchKeyword =
      keyword.trim() === '' ||
      photo.title.toLowerCase().includes(keyword.toLowerCase()) ||
      photo.description.toLowerCase().includes(keyword.toLowerCase()) ||
      photo.category.toLowerCase().includes(keyword.toLowerCase());
    return matchCategory && matchKeyword;
  });
};

export const useGalleryStore = create<GalleryState>((set, get) => ({
  photos: MOCK_PHOTOS,
  filteredPhotos: MOCK_PHOTOS,
  selectedCategory: '全部',
  searchKeyword: '',
  slideshowIndex: null,

  setCategory: (category) => {
    const { photos, searchKeyword } = get();
    const filteredPhotos = filterPhotos(photos, category, searchKeyword);
    set({ selectedCategory: category, filteredPhotos });
  },

  setSearchKeyword: (keyword) => {
    const { photos, selectedCategory } = get();
    const filteredPhotos = filterPhotos(photos, selectedCategory, keyword);
    set({ searchKeyword: keyword, filteredPhotos });
  },

  openSlideshow: (index) => set({ slideshowIndex: index }),

  closeSlideshow: () => set({ slideshowIndex: null }),

  nextSlide: () => {
    const { slideshowIndex, filteredPhotos } = get();
    if (slideshowIndex !== null && slideshowIndex < filteredPhotos.length - 1) {
      set({ slideshowIndex: slideshowIndex + 1 });
    }
  },

  prevSlide: () => {
    const { slideshowIndex } = get();
    if (slideshowIndex !== null && slideshowIndex > 0) {
      set({ slideshowIndex: slideshowIndex - 1 });
    }
  },
}));
