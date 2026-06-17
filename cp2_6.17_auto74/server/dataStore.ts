import { v4 as uuidv4 } from 'uuid';

export interface Comment {
  id: string;
  stallId: string;
  nickname: string;
  content: string;
  createdAt: number;
}

export interface Stall {
  id: string;
  name: string;
  ownerNickname: string;
  description: string;
  images: string[];
  likes: string[];
  comments: Comment[];
  createdAt: number;
}

class DataStore {
  private stalls: Stall[] = [];
  private likeDebounceMap: Map<string, number> = new Map();

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    const now = Date.now();
    const sampleStalls: Stall[] = [
      {
        id: uuidv4(),
        name: '星空手作坊',
        ownerNickname: '小星星',
        description: '专注手工皮具制作，每一件作品都注入匠心，承载独一无二的故事。',
        images: [
          'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400',
          'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400'
        ],
        likes: ['192.168.1.1', '192.168.1.2', '10.0.0.1'],
        comments: [
          { id: uuidv4(), stallId: '', nickname: '游客A', content: '皮具做工真精细！', createdAt: now - 3600000 },
          { id: uuidv4(), stallId: '', nickname: '手作爱好者', content: '钱包质感很棒，下次还要来！', createdAt: now - 1800000 }
        ],
        createdAt: now - 86400000 * 3
      },
      {
        id: uuidv4(),
        name: '糖霜烘焙屋',
        ownerNickname: '糖糖',
        description: '手工创意甜品店，主打马卡龙和翻糖蛋糕，用甜蜜点亮你的一天~',
        images: [
          'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400',
          'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
          'https://images.unsplash.com/photo-1562440499-64c9a111f713?w=400'
        ],
        likes: ['192.168.1.3', '10.0.0.2', '10.0.0.3', '172.16.0.1'],
        comments: [
          { id: uuidv4(), stallId: '', nickname: '甜品控', content: '马卡龙颜色太好看了！', createdAt: now - 7200000 }
        ],
        createdAt: now - 86400000 * 2
      },
      {
        id: uuidv4(),
        name: '墨香书画苑',
        ownerNickname: '墨客',
        description: '传统书画艺术作品展示与定制，写意山水、工笔花鸟，亦可题字留念。',
        images: [
          'https://images.unsplash.com/photo-1582561833407-b95380302ec9?w=400',
          'https://images.unsplash.com/photo-1609902726285-00668009f004?w=400'
        ],
        likes: ['192.168.1.4', '192.168.1.5'],
        comments: [],
        createdAt: now - 86400000 * 5
      },
      {
        id: uuidv4(),
        name: '植物语花园',
        ownerNickname: '小花匠',
        description: '迷你多肉植物与创意花艺，把自然带回家，每一盆都是精心培育的小生命。',
        images: [
          'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400',
          'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400',
          'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400'
        ],
        likes: ['10.0.0.4', '10.0.0.5', '172.16.0.2', '172.16.0.3', '192.168.1.6'],
        comments: [
          { id: uuidv4(), stallId: '', nickname: '绿手指', content: '小肉肉太可爱了！', createdAt: now - 5400000 },
          { id: uuidv4(), stallId: '', nickname: '植物杀手', content: '老板教了我怎么养，太贴心了', createdAt: now - 3200000 },
          { id: uuidv4(), stallId: '', nickname: '路人甲', content: '下次一定带一盆走', createdAt: now - 900000 }
        ],
        createdAt: now - 86400000
      },
      {
        id: uuidv4(),
        name: '复古胶片馆',
        ownerNickname: '老法师',
        description: '胶片摄影作品展示，现场提供拍立得拍照服务，定格你的集市回忆。',
        images: [
          'https://images.unsplash.com/photo-1495707902641-75cac588d2e9?w=400',
          'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?w=400'
        ],
        likes: ['192.168.1.7', '10.0.0.6'],
        comments: [
          { id: uuidv4(), stallId: '', nickname: '摄影小白', content: '拍立得效果很复古！', createdAt: now - 2700000 }
        ],
        createdAt: now - 86400000 * 4
      },
      {
        id: uuidv4(),
        name: '布艺小筑',
        ownerNickname: '织女',
        description: '原创手工布艺玩偶和小挂件，软萌治愈系，每一针一线都很用心。',
        images: [
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
          'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400'
        ],
        likes: ['172.16.0.4', '172.16.0.5', '192.168.1.8'],
        comments: [],
        createdAt: now - 86400000 * 6
      }
    ];

    sampleStalls.forEach(stall => {
      stall.comments.forEach(c => c.stallId = stall.id);
      this.stalls.push(stall);
    });
  }

  getAllStalls(): Stall[] {
    return this.stalls.map(s => ({ ...s, likes: [...s.likes], comments: [...s.comments] }));
  }

  getStallById(id: string): Stall | undefined {
    const stall = this.stalls.find(s => s.id === id);
    return stall ? { ...stall, likes: [...stall.likes], comments: [...stall.comments] } : undefined;
  }

  createStall(data: {
    name: string;
    ownerNickname: string;
    description: string;
    images: string[];
  }): Stall {
    const newStall: Stall = {
      id: uuidv4(),
      name: data.name.trim(),
      ownerNickname: data.ownerNickname.trim(),
      description: data.description.trim(),
      images: data.images.filter(img => img.trim().length > 0),
      likes: [],
      comments: [],
      createdAt: Date.now()
    };
    this.stalls.push(newStall);
    return { ...newStall, likes: [], comments: [] };
  }

  updateStall(
    id: string,
    data: Partial<Pick<Stall, 'name' | 'ownerNickname' | 'description' | 'images'>>
  ): Stall | undefined {
    const idx = this.stalls.findIndex(s => s.id === id);
    if (idx === -1) return undefined;

    if (data.name !== undefined) this.stalls[idx].name = data.name.trim();
    if (data.ownerNickname !== undefined) this.stalls[idx].ownerNickname = data.ownerNickname.trim();
    if (data.description !== undefined) this.stalls[idx].description = data.description.trim();
    if (data.images !== undefined) {
      this.stalls[idx].images = data.images.filter(img => img.trim().length > 0);
    }

    return { ...this.stalls[idx], likes: [...this.stalls[idx].likes], comments: [...this.stalls[idx].comments] };
  }

  deleteStall(id: string): boolean {
    const idx = this.stalls.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.stalls.splice(idx, 1);
    return true;
  }

  likeStall(stallId: string, ip: string): { success: boolean; liked: boolean; likesCount: number } {
    const stall = this.stalls.find(s => s.id === stallId);
    if (!stall) return { success: false, liked: false, likesCount: 0 };

    const debounceKey = `${stallId}:${ip}`;
    const now = Date.now();
    const lastLike = this.likeDebounceMap.get(debounceKey);
    if (lastLike && now - lastLike < 500) {
      return { success: false, liked: false, likesCount: stall.likes.length };
    }
    this.likeDebounceMap.set(debounceKey, now);

    const likeIdx = stall.likes.indexOf(ip);
    if (likeIdx === -1) {
      stall.likes.push(ip);
      return { success: true, liked: true, likesCount: stall.likes.length };
    } else {
      stall.likes.splice(likeIdx, 1);
      return { success: true, liked: false, likesCount: stall.likes.length };
    }
  }

  addComment(stallId: string, data: { nickname: string; content: string }): Comment | undefined {
    const stall = this.stalls.find(s => s.id === stallId);
    if (!stall) return undefined;

    const comment: Comment = {
      id: uuidv4(),
      stallId,
      nickname: data.nickname.trim(),
      content: data.content.trim(),
      createdAt: Date.now()
    };
    stall.comments.unshift(comment);
    return { ...comment };
  }

  checkLiked(stallId: string, ip: string): boolean {
    const stall = this.stalls.find(s => s.id === stallId);
    return stall ? stall.likes.includes(ip) : false;
  }
}

export const dataStore = new DataStore();
