export interface Painting {
  id: string;
  title: string;
  author: string;
  imageUrl: string;
  likes: number;
  commentCount: number;
}

export interface Comment {
  id: string;
  paintingId: string;
  username: string;
  avatar: string;
  content: string;
  timestamp: string;
}

const STORAGE_KEY = 'gallery-collections';

export const paintings: Painting[] = [
  {
    id: 'p1',
    title: '星空下的村庄',
    author: '林墨白',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=starry%20night%20village%20oil%20painting%20van%20gogh%20style%20dreamy%20swirling%20sky%20cozy%20cottages&image_size=landscape_16_9',
    likes: 342,
    commentCount: 28,
  },
  {
    id: 'p2',
    title: '潮汐之间',
    author: '陈若水',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ocean%20tides%20between%20abstract%20painting%20turquoise%20deep%20blue%20waves%20flowing%20movement&image_size=landscape_16_9',
    likes: 218,
    commentCount: 15,
  },
  {
    id: 'p3',
    title: '寂静花园',
    author: '赵清荷',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=silent%20garden%20watercolor%20painting%20misty%20flowers%20soft%20pastel%20morning%20dew&image_size=landscape_16_9',
    likes: 189,
    commentCount: 22,
  },
  {
    id: 'p4',
    title: '城市脉搏',
    author: '王天翼',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=city%20pulse%20neon%20cyberpunk%20painting%20urban%20night%20lights%20rain%20reflection&image_size=landscape_16_9',
    likes: 456,
    commentCount: 35,
  },
  {
    id: 'p5',
    title: '赤色山脊',
    author: '孙岳峰',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=red%20mountain%20ridge%20landscape%20oil%20painting%20dramatic%20sunset%20warm%20tones%20rugged%20peaks&image_size=landscape_16_9',
    likes: 275,
    commentCount: 19,
  },
  {
    id: 'p6',
    title: '流动的光',
    author: '李明澈',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=flowing%20light%20abstract%20expressionism%20golden%20rays%20ethereal%20glow%20luminous&image_size=landscape_16_9',
    likes: 312,
    commentCount: 24,
  },
  {
    id: 'p7',
    title: '深海之眼',
    author: '周海澜',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=deep%20sea%20eye%20surrealist%20painting%20bioluminescent%20ocean%20creature%20dark%20mysterious&image_size=landscape_16_9',
    likes: 389,
    commentCount: 31,
  },
  {
    id: 'p8',
    title: '秋日私语',
    author: '吴霜叶',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=autumn%20whispers%20impressionist%20painting%20golden%20leaves%20path%20warm%20light%20peaceful&image_size=landscape_16_9',
    likes: 198,
    commentCount: 12,
  },
  {
    id: 'p9',
    title: '量子花园',
    author: '郑维',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=quantum%20garden%20digital%20art%20fractal%20flowers%20geometric%20patterns%20futuristic%20neon&image_size=landscape_16_9',
    likes: 423,
    commentCount: 40,
  },
];

export const initialComments: Comment[] = [
  {
    id: 'c1',
    paintingId: 'p1',
    username: '艺术旅人',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=abstract%20avatar%20portrait%20colorful%20artistic%20face%20digital%20art&image_size=square_hd',
    content: '这幅画让我感受到了星空的浩瀚与村庄的温暖，冷暖色调的对比太妙了！',
    timestamp: '2026-06-18 14:30',
  },
  {
    id: 'c2',
    paintingId: 'p1',
    username: '画境漫步',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=minimalist%20avatar%20portrait%20geometric%20face%20modern%20art&image_size=square_hd',
    content: '笔触大胆而自由，星空的漩涡感让人仿佛置身其中。',
    timestamp: '2026-06-18 15:22',
  },
  {
    id: 'c3',
    paintingId: 'p4',
    username: '夜行者',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dark%20moody%20avatar%20portrait%20noir%20style%20mysterious&image_size=square_hd',
    content: '赛博朋克的感觉太强了，霓虹灯和雨水的交织让人窒息。',
    timestamp: '2026-06-18 20:10',
  },
  {
    id: 'c4',
    paintingId: 'p4',
    username: '光影猎手',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=warm%20avatar%20portrait%20sunset%20tones%20friendly%20face&image_size=square_hd',
    content: '城市的光影处理得非常到位，每一处反光都恰到好处。',
    timestamp: '2026-06-18 21:05',
  },
  {
    id: 'c5',
    paintingId: 'p7',
    username: '深蓝潜客',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ocean%20blue%20avatar%20portrait%20watery%20ethereal&image_size=square_hd',
    content: '深海总是充满未知，这幅画把那种神秘感表现得很透彻。',
    timestamp: '2026-06-19 08:45',
  },
  {
    id: 'c6',
    paintingId: 'p9',
    username: '数据诗人',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tech%20avatar%20portrait%20circuit%20board%20digital%20face&image_size=square_hd',
    content: '当科学遇上艺术，就是这个样子吧！分形花朵太美了。',
    timestamp: '2026-06-19 10:15',
  },
  {
    id: 'c7',
    paintingId: 'p2',
    username: '浪花听者',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sea%20foam%20avatar%20portrait%20aqua%20fresh&image_size=square_hd',
    content: '蓝色调的渐变如潮汐般律动，让人听到海浪的声音。',
    timestamp: '2026-06-19 09:30',
  },
  {
    id: 'c8',
    paintingId: 'p5',
    username: '山间行者',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mountain%20avatar%20portrait%20earth%20tones%20rugged&image_size=square_hd',
    content: '赤色的山脊在夕阳下显得格外壮丽，力量感十足！',
    timestamp: '2026-06-19 11:20',
  },
];

export function loadCollections(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCollections(collections: Record<string, boolean>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
}
