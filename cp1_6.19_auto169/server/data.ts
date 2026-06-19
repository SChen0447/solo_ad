import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface User {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  tags: string[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string;
  coverUrl: string;
  status: 'available' | 'borrowed' | 'offline';
  ownerId: string;
  tags: string[];
  createdAt: string;
}

export interface Circle {
  id: string;
  name: string;
  description: string;
  bookIds: string[];
  currentBookId: string | null;
  maxMembers: number;
  ownerId: string;
  members: string[];
  pendingMembers: string[];
  tags: string[];
  progress: Record<string, Record<string, boolean>>;
  totalChapters: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface Note {
  id: string;
  circleId: string;
  bookId: string;
  userId: string;
  content: string;
  rating: number;
  tags: string[];
  likes: string[];
  comments: Comment[];
  createdAt: string;
}

export interface Database {
  users: User[];
  books: Book[];
  circles: Circle[];
  notes: Note[];
}

const DB_PATH = path.join(__dirname, 'db.json');

const defaultData: Database = {
  users: [
    { id: 'u1', name: '张小明', avatar: 'https://i.pravatar.cc/80?img=1', online: true, tags: ['科幻', '技术'] },
    { id: 'u2', name: '李思琪', avatar: 'https://i.pravatar.cc/80?img=2', online: true, tags: ['文学', '历史'] },
    { id: 'u3', name: '王建国', avatar: 'https://i.pravatar.cc/80?img=3', online: false, tags: ['技术', '艺术'] },
    { id: 'u4', name: '陈美丽', avatar: 'https://i.pravatar.cc/80?img=4', online: true, tags: ['科幻', '文学'] },
    { id: 'u5', name: '赵文博', avatar: 'https://i.pravatar.cc/80?img=5', online: false, tags: ['历史', '艺术'] },
    { id: 'me', name: '我', avatar: 'https://i.pravatar.cc/80?img=12', online: true, tags: ['科幻', '技术', '文学'] }
  ],
  books: [
    { id: 'b1', title: '三体', author: '刘慈欣', category: '科幻', description: '地球文明与三体文明的史诗级对抗，展现宇宙社会学的黑暗森林法则。', coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop', status: 'available', ownerId: 'u1', tags: ['科幻', '硬科幻', '宇宙'], createdAt: '2026-01-10T08:00:00Z' },
    { id: 'b2', title: '百年孤独', author: '加西亚·马尔克斯', category: '文学', description: '布恩迪亚家族七代人的传奇故事，魔幻现实主义的巅峰之作。', coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&h=400&fit=crop', status: 'available', ownerId: 'u2', tags: ['文学', '魔幻现实主义', '拉美'], createdAt: '2026-01-12T09:30:00Z' },
    { id: 'b3', title: '代码大全', author: 'Steve McConnell', category: '技术', description: '软件构建的百科全书，涵盖从设计到调试的全方位最佳实践。', coverUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=300&h=400&fit=crop', status: 'borrowed', ownerId: 'u3', tags: ['技术', '编程', '软件工程'], createdAt: '2026-01-15T14:20:00Z' },
    { id: 'b4', title: '人类简史', author: '尤瓦尔·赫拉利', category: '历史', description: '从认知革命到科学革命，重新审视人类七万年的发展历程。', coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop', status: 'available', ownerId: 'u5', tags: ['历史', '人类学', '文明'], createdAt: '2026-01-18T11:00:00Z' },
    { id: 'b5', title: '艺术的故事', author: '贡布里希', category: '艺术', description: '从史前洞穴壁画到现代实验艺术，西方艺术史的经典入门读物。', coverUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=400&fit=crop', status: 'available', ownerId: 'u5', tags: ['艺术', '艺术史', '绘画'], createdAt: '2026-01-20T16:45:00Z' },
    { id: 'b6', title: '基地', author: '阿西莫夫', category: '科幻', description: '心理史学预言银河帝国衰亡，基地计划开启人类新纪元。', coverUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop', status: 'available', ownerId: 'u4', tags: ['科幻', '太空歌剧', '心理史学'], createdAt: '2026-01-22T10:15:00Z' },
    { id: 'b7', title: '活着', author: '余华', category: '文学', description: '福贵一生的苦难与坚韧，展现生命本身的力量。', coverUrl: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=300&h=400&fit=crop', status: 'available', ownerId: 'u2', tags: ['文学', '现实主义', '中国当代'], createdAt: '2026-01-25T08:30:00Z' },
    { id: 'b8', title: '算法导论', author: 'Cormen等', category: '技术', description: '计算机算法领域的权威教材，深入浅出讲解经典算法。', coverUrl: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=300&h=400&fit=crop', status: 'available', ownerId: 'me', tags: ['技术', '算法', '计算机科学'], createdAt: '2026-02-01T13:00:00Z' },
    { id: 'b9', title: '万历十五年', author: '黄仁宇', category: '历史', description: '以大历史观看1587年，揭示明朝衰落的深层原因。', coverUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12a74?w=300&h=400&fit=crop', status: 'available', ownerId: 'u5', tags: ['历史', '明朝', '大历史'], createdAt: '2026-02-05T09:20:00Z' },
    { id: 'b10', title: '梵高手稿', author: '梵高', category: '艺术', description: '梵高书信与手稿集，窥见天才画家的内心世界。', coverUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300&h=400&fit=crop', status: 'borrowed', ownerId: 'u5', tags: ['艺术', '绘画', '书信'], createdAt: '2026-02-08T15:10:00Z' },
    { id: 'b11', title: '沙丘', author: '弗兰克·赫伯特', category: '科幻', description: '厄拉科斯星球的香料争夺战，史诗级太空政治寓言。', coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&h=400&fit=crop', status: 'available', ownerId: 'u1', tags: ['科幻', '太空歌剧', '政治'], createdAt: '2026-02-10T12:00:00Z' },
    { id: 'b12', title: '红楼梦', author: '曹雪芹', category: '文学', description: '贾史王薛四大家族兴衰，古典文学的巅峰巨著。', coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop', status: 'available', ownerId: 'u2', tags: ['文学', '古典', '中国'], createdAt: '2026-02-12T14:30:00Z' }
  ],
  circles: [
    {
      id: 'c1',
      name: '三体深度阅读圈',
      description: '一起研读刘慈欣的三体三部曲，每周一章，深度讨论黑暗森林法则、降维打击等核心概念。',
      bookIds: ['b1'],
      currentBookId: 'b1',
      maxMembers: 6,
      ownerId: 'u1',
      members: ['u1', 'u4', 'me'],
      pendingMembers: ['u2'],
      tags: ['科幻', '硬科幻', '宇宙社会学'],
      progress: {
        'u1': { '1': true, '2': true, '3': true, '4': true, '5': false },
        'u4': { '1': true, '2': true, '3': false, '4': false, '5': false },
        'me': { '1': true, '2': true, '3': true, '4': false, '5': false }
      },
      totalChapters: 5,
      createdAt: '2026-01-15T08:00:00Z'
    },
    {
      id: 'c2',
      name: '拉美魔幻之夜',
      description: '共读马尔克斯、博尔赫斯等拉美文学大师的作品，体验魔幻现实主义的独特魅力。',
      bookIds: ['b2'],
      currentBookId: 'b2',
      maxMembers: 6,
      ownerId: 'u2',
      members: ['u2', 'u4', 'u5'],
      pendingMembers: [],
      tags: ['文学', '魔幻现实主义', '拉美文学'],
      progress: {
        'u2': { '1': true, '2': true, '3': true, '4': false, '5': false },
        'u4': { '1': true, '2': false, '3': false, '4': false, '5': false },
        'u5': { '1': true, '2': true, '3': false, '4': false, '5': false }
      },
      totalChapters: 5,
      createdAt: '2026-02-01T10:00:00Z'
    }
  ],
  notes: [
    {
      id: 'n1',
      circleId: 'c1',
      bookId: 'b1',
      userId: 'u1',
      content: '黑暗森林法则的推导过程太精彩了！宇宙就是一座黑暗森林，每个文明都是带枪的猎人，像幽灵般潜行于林间，轻轻拨开挡路的树枝，竭力不让脚步发出一点儿声音，连呼吸都必须小心翼翼。',
      rating: 5,
      tags: ['黑暗森林', '宇宙社会学', '哲思'],
      likes: ['u4', 'me'],
      comments: [
        { id: 'cm1', userId: 'me', content: '同感！这个设定真的让人不寒而栗。', createdAt: '2026-02-10T09:30:00Z' }
      ],
      createdAt: '2026-02-10T08:00:00Z'
    },
    {
      id: 'n2',
      circleId: 'c1',
      bookId: 'b1',
      userId: 'u4',
      content: '读到古筝计划那段，汪淼用纳米丝切割审判日号，太有画面感了。大史真的是全书中最接地气的角色。',
      rating: 4,
      tags: ['古筝计划', '大史', '名场面'],
      likes: ['u1'],
      comments: [],
      createdAt: '2026-02-12T14:20:00Z'
    },
    {
      id: 'n3',
      circleId: 'c2',
      bookId: 'b2',
      userId: 'u2',
      content: '多年以后，面对行刑队，奥雷里亚诺·布恩迪亚上校将会回想起父亲带他去见识冰块的那个遥远的下午。开篇第一句话就建立了整个小说的时间循环结构，神来之笔！',
      rating: 5,
      tags: ['开篇', '时间', '叙事技巧'],
      likes: ['u5', 'u4'],
      comments: [],
      createdAt: '2026-02-15T16:45:00Z'
    }
  ]
};

async function ensureDbExists(): Promise<void> {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

export async function readDb(): Promise<Database> {
  await ensureDbExists();
  const data = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(data) as Database;
}

export async function writeDb(data: Database): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export const data = {
  readDb,
  writeDb
};

export default data;
