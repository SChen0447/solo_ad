import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import type { User, Book, ExchangeRecord, Message, BookCategory, BookCondition } from '../shared/types';

const generatePlaceholderCover = (category: BookCategory, index: number): string => {
  const colors: Record<BookCategory, string[]> = {
    '文学': ['#f59e0b', '#fbbf24', '#fcd34d'],
    '科技': ['#3b82f6', '#60a5fa', '#93c5fd'],
    '生活': ['#10b981', '#34d399', '#6ee7b7'],
    '教育': ['#8b5cf6', '#a78bfa', '#c4b5fd'],
    '艺术': ['#ec4899', '#f472b6', '#f9a8d4'],
  };
  const [c1, c2, c3] = colors[category];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">
    <defs>
      <linearGradient id="g${index}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${c1}"/>
        <stop offset="50%" style="stop-color:${c2}"/>
        <stop offset="100%" style="stop-color:${c3}"/>
      </linearGradient>
    </defs>
    <rect width="200" height="280" fill="url(#g${index})"/>
    <text x="100" y="140" font-family="serif" font-size="16" fill="white" text-anchor="middle" opacity="0.9">📚</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

const bookData: Array<{
  title: string;
  author: string;
  category: BookCategory;
  condition: BookCondition;
  tags: string[];
}> = [
  { title: '活着', author: '余华', category: '文学', condition: '九成新', tags: ['经典', '小说', '当代文学'] },
  { title: '三体', author: '刘慈欣', category: '文学', condition: '全新', tags: ['科幻', '经典', '硬科幻'] },
  { title: '百年孤独', author: '加西亚·马尔克斯', category: '文学', condition: '有笔记', tags: ['魔幻现实主义', '经典', '诺贝尔文学奖'] },
  { title: '平凡的世界', author: '路遥', category: '文学', condition: '九成新', tags: ['现实主义', '经典', '中国文学'] },
  { title: '围城', author: '钱钟书', category: '文学', condition: '全新', tags: ['讽刺', '经典', '中国文学'] },
  { title: '红楼梦', author: '曹雪芹', category: '文学', condition: '有笔记', tags: ['古典名著', '经典', '中国古典'] },
  { title: '小王子', author: '安托万·德·圣-埃克苏佩里', category: '文学', condition: '全新', tags: ['童话', '哲学', '经典'] },
  { title: '人类简史', author: '尤瓦尔·赫拉利', category: '科技', condition: '九成新', tags: ['历史', '人类学', '科普'] },
  { title: '未来简史', author: '尤瓦尔·赫拉利', category: '科技', condition: '全新', tags: ['未来学', '科技', '人工智能'] },
  { title: '深度学习', author: 'Ian Goodfellow', category: '科技', condition: '有笔记', tags: ['AI', '机器学习', '神经网络'] },
  { title: '代码大全', author: 'Steve McConnell', category: '科技', condition: '九成新', tags: ['编程', '软件工程', '经典'] },
  { title: '算法导论', author: 'Thomas H. Cormen', category: '科技', condition: '有笔记', tags: ['算法', '数据结构', '计算机科学'] },
  { title: '设计模式', author: 'Erich Gamma', category: '科技', condition: '全新', tags: ['软件设计', '架构', '经典'] },
  { title: 'Python编程', author: 'Eric Matthes', category: '科技', condition: '九成新', tags: ['Python', '编程入门', '编程语言'] },
  { title: '深入浅出Node.js', author: '朴灵', category: '科技', condition: '有笔记', tags: ['Node.js', 'JavaScript', '后端开发'] },
  { title: '你当像鸟飞往你的山', author: '塔拉·韦斯特弗', category: '生活', condition: '全新', tags: ['自传', '成长', '教育'] },
  { title: '原子习惯', author: 'James Clear', category: '生活', condition: '九成新', tags: ['自我提升', '习惯养成', '效率'] },
  { title: '人类群星闪耀时', author: '斯蒂芬·茨威格', category: '生活', condition: '有笔记', tags: ['历史人物', '传记', '经典'] },
  { title: '解忧杂货店', author: '东野圭吾', category: '生活', condition: '全新', tags: ['治愈', '温暖', '日本文学'] },
  { title: '挪威的森林', author: '村上春树', category: '文学', condition: '九成新', tags: ['青春', '爱情', '日本文学'] },
  { title: '嫌疑人X的献身', author: '东野圭吾', category: '文学', condition: '有笔记', tags: ['推理', '悬疑', '日本文学'] },
  { title: '白夜行', author: '东野圭吾', category: '文学', condition: '全新', tags: ['推理', '悬疑', '日本文学'] },
  { title: '明朝那些事儿', author: '当年明月', category: '文学', condition: '九成新', tags: ['中国历史', '通俗历史', '明朝'] },
  { title: '万历十五年', author: '黄仁宇', category: '文学', condition: '有笔记', tags: ['中国历史', '明朝', '大历史观'] },
  { title: '经济学原理', author: '曼昆', category: '教育', condition: '全新', tags: ['经济学', '教材', '经典'] },
  { title: '心理学与生活', author: '理查德·格里格', category: '教育', condition: '九成新', tags: ['心理学', '教材', '入门'] },
  { title: '社会契约论', author: '卢梭', category: '教育', condition: '有笔记', tags: ['政治哲学', '经典', '政治学'] },
  { title: '苏菲的世界', author: '乔斯坦·贾德', category: '教育', condition: '全新', tags: ['哲学', '入门', '哲学史'] },
  { title: '蒙娜丽莎的微笑', author: '丹·布朗', category: '艺术', condition: '全新', tags: ['悬疑', '艺术', '小说'] },
  { title: '艺术的故事', author: '贡布里希', category: '艺术', condition: '九成新', tags: ['艺术史', '经典', '美术史'] },
  { title: '美的历程', author: '李泽厚', category: '艺术', condition: '有笔记', tags: ['美学', '中国美学', '哲学'] },
  { title: '梵高传', author: '欧文·斯通', category: '艺术', condition: '全新', tags: ['传记', '艺术家', '经典'] },
  { title: '西方哲学史', author: '罗素', category: '教育', condition: '九成新', tags: ['哲学', '历史', '西方哲学'] },
  { title: '不能承受的生命之轻', author: '米兰·昆德拉', category: '文学', condition: '有笔记', tags: ['存在主义', '经典', '小说'] },
  { title: '追风筝的人', author: '卡勒德·胡赛尼', category: '文学', condition: '全新', tags: ['阿富汗', '成长', '友情'] },
  { title: '灿烂千阳', author: '卡勒德·胡赛尼', category: '文学', condition: '九成新', tags: ['阿富汗', '女性', '战争'] },
  { title: '群山回唱', author: '卡勒德·胡赛尼', category: '文学', condition: '有笔记', tags: ['阿富汗', '家庭', '亲情'] },
  { title: '傲慢与偏见', author: '简·奥斯汀', category: '文学', condition: '全新', tags: ['经典', '爱情', '英国文学'] },
  { title: '简爱', author: '夏洛蒂·勃朗特', category: '文学', condition: '九成新', tags: ['经典', '女性主义', '英国文学'] },
  { title: '呼啸山庄', author: '艾米莉·勃朗特', category: '文学', condition: '有笔记', tags: ['经典', '爱情', '英国文学'] },
  { title: '了不起的盖茨比', author: '菲茨杰拉德', category: '文学', condition: '全新', tags: ['经典', '美国文学', '爵士时代'] },
  { title: '老人与海', author: '海明威', category: '文学', condition: '九成新', tags: ['经典', '中篇小说', '美国文学'] },
  { title: '太阳照常升起', author: '海明威', category: '文学', condition: '有笔记', tags: ['经典', '迷惘的一代', '美国文学'] },
  { title: '1984', author: '乔治·奥威尔', category: '文学', condition: '全新', tags: ['反乌托邦', '经典', '政治小说'] },
  { title: '动物农场', author: '乔治·奥威尔', category: '文学', condition: '九成新', tags: ['反乌托邦', '寓言', '经典'] },
  { title: '美丽新世界', author: '阿道司·赫胥黎', category: '文学', condition: '有笔记', tags: ['反乌托邦', '经典', '科幻'] },
  { title: '海底两万里', author: '儒勒·凡尔纳', category: '文学', condition: '全新', tags: ['科幻', '经典', '探险'] },
  { title: '八十天环游地球', author: '儒勒·凡尔纳', category: '文学', condition: '九成新', tags: ['科幻', '探险', '经典'] },
  { title: '格兰特船长的儿女', author: '儒勒·凡尔纳', category: '文学', condition: '有笔记', tags: ['科幻', '探险', '经典'] },
  { title: '神秘岛', author: '儒勒·凡尔纳', category: '文学', condition: '全新', tags: ['科幻', '探险', '经典'] },
  { title: '地心游记', author: '儒勒·凡尔纳', category: '文学', condition: '九成新', tags: ['科幻', '探险', '经典'] },
  { title: '从一到无穷大', author: '乔治·伽莫夫', category: '科技', condition: '有笔记', tags: ['科普', '数学', '物理'] },
  { title: '时间简史', author: '史蒂芬·霍金', category: '科技', condition: '全新', tags: ['物理', '科普', '宇宙'] },
  { title: '果壳中的宇宙', author: '史蒂芬·霍金', category: '科技', condition: '九成新', tags: ['物理', '科普', '宇宙'] },
  { title: '大设计', author: '史蒂芬·霍金', category: '科技', condition: '有笔记', tags: ['物理', '科普', '宇宙'] },
  { title: '黑洞与时间弯曲', author: '基普·索恩', category: '科技', condition: '全新', tags: ['物理', '黑洞', '相对论'] },
  { title: '宇宙的琴弦', author: '布莱恩·格林', category: '科技', condition: '九成新', tags: ['物理', '弦理论', '科普'] },
  { title: '上帝掷骰子吗', author: '曹天元', category: '科技', condition: '有笔记', tags: ['量子物理', '科普', '量子力学'] },
  { title: '见微知著', author: '卢昌海', category: '科技', condition: '全新', tags: ['物理', '科普', '量子'] },
  { title: '数学之美', author: '吴军', category: '科技', condition: '九成新', tags: ['数学', '信息论', '科普'] },
  { title: '浪潮之巅', author: '吴军', category: '科技', condition: '有笔记', tags: ['科技史', '互联网', '商业'] },
  { title: '文明之光', author: '吴军', category: '科技', condition: '全新', tags: ['文明史', '科技', '人类文明'] },
  { title: '智能时代', author: '吴军', category: '科技', condition: '九成新', tags: ['人工智能', '科技', '未来'] },
  { title: '奇点临近', author: '雷·库兹韦尔', category: '科技', condition: '有笔记', tags: ['人工智能', '未来学', '科技'] },
  { title: '生命是什么', author: '埃尔温·薛定谔', category: '科技', condition: '全新', tags: ['生物学', '物理学', '科普'] },
  { title: '自私的基因', author: '理查德·道金斯', category: '科技', condition: '九成新', tags: ['生物学', '进化论', '科普'] },
  { title: '盲眼钟表匠', author: '理查德·道金斯', category: '科技', condition: '有笔记', tags: ['生物学', '进化论', '科普'] },
  { title: '枪炮、病菌与钢铁', author: '贾雷德·戴蒙德', category: '生活', condition: '九成新', tags: ['历史', '人类学', '文明'] },
  { title: '崩溃', author: '贾雷德·戴蒙德', category: '生活', condition: '有笔记', tags: ['历史', '环境', '文明'] },
  { title: '第三种黑猩猩', author: '贾雷德·戴蒙德', category: '生活', condition: '全新', tags: ['人类学', '人类进化', '历史'] },
  { title: '昨日之前的世界', author: '贾雷德·戴蒙德', category: '生活', condition: '九成新', tags: ['人类学', '传统社会', '历史'] },
  { title: '剧变', author: '贾雷德·戴蒙德', category: '生活', condition: '有笔记', tags: ['历史', '危机', '国家'] },
  { title: '国家为什么会失败', author: '德隆·阿西莫格鲁', category: '生活', condition: '全新', tags: ['政治经济学', '制度', '历史'] },
  { title: '为什么有的国家富裕有的国家贫穷', author: '德隆·阿西莫格鲁', category: '生活', condition: '九成新', tags: ['经济学', '制度', '发展'] },
  { title: '21世纪资本论', author: '托马斯·皮凯蒂', category: '生活', condition: '有笔记', tags: ['经济学', '资本', '不平等'] },
  { title: '美国增长的起落', author: '罗伯特·戈登', category: '生活', condition: '全新', tags: ['经济史', '美国经济', '创新'] },
  { title: '创新者的窘境', author: '克莱顿·克里斯坦森', category: '生活', condition: '九成新', tags: ['商业', '创新', '管理'] },
  { title: '创新者的解答', author: '克莱顿·克里斯坦森', category: '生活', condition: '有笔记', tags: ['商业', '创新', '管理'] },
  { title: '与运气竞争', author: '克莱顿·克里斯坦森', category: '生活', condition: '全新', tags: ['创新', '管理', '商业'] },
  { title: '蓝海战略', author: 'W·钱·金', category: '生活', condition: '九成新', tags: ['商业', '战略', '创新'] },
  { title: '竞争战略', author: '迈克尔·波特', category: '生活', condition: '有笔记', tags: ['商业', '战略', '经典'] },
  { title: '竞争优势', author: '迈克尔·波特', category: '生活', condition: '全新', tags: ['商业', '战略', '经典'] },
  { title: '国家竞争优势', author: '迈克尔·波特', category: '生活', condition: '九成新', tags: ['经济学', '战略', '国家'] },
  { title: '卓有成效的管理者', author: '彼得·德鲁克', category: '生活', condition: '有笔记', tags: ['管理', '经典', '效率'] },
  { title: '管理的实践', author: '彼得·德鲁克', category: '生活', condition: '全新', tags: ['管理', '经典', '实践'] },
  { title: '21世纪的管理挑战', author: '彼得·德鲁克', category: '生活', condition: '九成新', tags: ['管理', '挑战', '21世纪'] },
  { title: '彼得·林奇的成功投资', author: '彼得·林奇', category: '生活', condition: '有笔记', tags: ['投资', '理财', '经典'] },
  { title: '战胜华尔街', author: '彼得·林奇', category: '生活', condition: '全新', tags: ['投资', '理财', '股票'] },
  { title: '聪明的投资者', author: '本杰明·格雷厄姆', category: '生活', condition: '九成新', tags: ['投资', '价值投资', '经典'] },
  { title: '证券分析', author: '本杰明·格雷厄姆', category: '生活', condition: '有笔记', tags: ['投资', '证券', '经典'] },
  { title: '穷查理宝典', author: '彼得·考夫曼', category: '生活', condition: '全新', tags: ['投资', '查理·芒格', '智慧'] },
  { title: '滚雪球', author: '爱丽丝·施罗德', category: '生活', condition: '九成新', tags: ['传记', '巴菲特', '投资'] },
  { title: '巴菲特致股东的信', author: '沃伦·巴菲特', category: '生活', condition: '有笔记', tags: ['投资', '巴菲特', '商业'] },
  { title: '黑天鹅', author: '纳西姆·尼古拉斯·塔勒布', category: '生活', condition: '全新', tags: ['不确定性', '风险', '哲学'] },
  { title: '反脆弱', author: '纳西姆·尼古拉斯·塔勒布', category: '生活', condition: '九成新', tags: ['不确定性', '风险', '哲学'] },
  { title: '随机漫步的傻瓜', author: '纳西姆·尼古拉斯·塔勒布', category: '生活', condition: '有笔记', tags: ['随机性', '概率', '投资'] },
  { title: '思考，快与慢', author: '丹尼尔·卡尼曼', category: '生活', condition: '全新', tags: ['心理学', '行为经济学', '决策'] },
  { title: '影响力', author: '罗伯特·西奥迪尼', category: '生活', condition: '九成新', tags: ['心理学', '影响力', '经典'] },
  { title: '先发影响力', author: '罗伯特·西奥迪尼', category: '生活', condition: '有笔记', tags: ['心理学', '影响力', '说服'] },
  { title: '细节', author: '罗伯特·西奥迪尼', category: '生活', condition: '全新', tags: ['心理学', '细节', '说服'] },
  { title: '刻意练习', author: '安德斯·艾利克森', category: '生活', condition: '九成新', tags: ['学习方法', '刻意练习', '成长'] },
  { title: '练习的心态', author: '安德斯·艾利克森', category: '生活', condition: '有笔记', tags: ['学习', '心态', '成长'] },
  { title: '学习之道', author: '芭芭拉·奥克利', category: '生活', condition: '全新', tags: ['学习方法', '学习', '大脑'] },
];

class Database {
  private users: Map<string, User> = new Map();
  private books: Map<string, Book> = new Map();
  private messages: Map<string, Message> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const hashedPassword = bcrypt.hashSync('123456', 8);

    const defaultUser: User = {
      id: uuidv4(),
      username: 'booklover',
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      preferences: ['文学', '艺术'],
      browseHistory: [],
      exchangeHistory: [],
    };
    this.users.set(defaultUser.id, defaultUser);

    const mockUsernames = ['reader123', 'bookworm', 'literature_fan', 'tech_geek', 'art_lover', 'history_buff', 'life_explorer', 'edu_seeker'];
    const userIds: string[] = [defaultUser.id];

    for (let i = 0; i < 7; i++) {
      const user: User = {
        id: uuidv4(),
        username: mockUsernames[i + 1] || `user${i}`,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        preferences: ['文学', '科技'],
        browseHistory: [],
        exchangeHistory: [],
      };
      this.users.set(user.id, user);
      userIds.push(user.id);
    }

    const conditions: BookCondition[] = ['全新', '九成新', '有笔记'];
    const categories: BookCategory[] = ['文学', '科技', '生活', '教育', '艺术'];

    bookData.forEach((data, index) => {
      const ownerIndex = index % userIds.length;
      const book: Book = {
        id: uuidv4(),
        ownerId: userIds[ownerIndex],
        ownerName: this.users.get(userIds[ownerIndex])!.username,
        title: data.title,
        author: data.author,
        category: data.category,
        condition: data.condition,
        coverImage: generatePlaceholderCover(data.category, index),
        exchangePreference: categories.sort(() => Math.random() - 0.5).slice(0, 2),
        status: 'available',
        exchangeCount: Math.floor(Math.random() * 10),
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        tags: data.tags,
      };
      this.books.set(book.id, book);
    });
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByUsername(username: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  createUser(username: string, password: string): User {
    const user: User = {
      id: uuidv4(),
      username,
      password: bcrypt.hashSync(password, 8),
      createdAt: new Date().toISOString(),
      preferences: [],
      browseHistory: [],
      exchangeHistory: [],
    };
    this.users.set(user.id, user);
    return user;
  }

  getAllBooks(): Book[] {
    return Array.from(this.books.values());
  }

  getBookById(id: string): Book | undefined {
    return this.books.get(id);
  }

  getBooksByOwner(ownerId: string): Book[] {
    return Array.from(this.books.values()).filter(b => b.ownerId === ownerId);
  }

  createBook(bookData: Omit<Book, 'id' | 'exchangeCount' | 'status' | 'createdAt'>): Book {
    const book: Book = {
      ...bookData,
      id: uuidv4(),
      status: 'available',
      exchangeCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.books.set(book.id, book);
    return book;
  }

  updateBookStatus(bookId: string, updates: Partial<Book>): Book | undefined {
    const book = this.books.get(bookId);
    if (!book) return undefined;
    const updated = { ...book, ...updates };
    this.books.set(bookId, updated);
    return updated;
  }

  searchBooks(keyword?: string, category?: BookCategory, condition?: BookCondition): Book[] {
    let books = Array.from(this.books.values()).filter(b => b.status === 'available');
    
    if (keyword) {
      const kw = keyword.toLowerCase();
      books = books.filter(b =>
        b.title.toLowerCase().includes(kw) ||
        b.author.toLowerCase().includes(kw) ||
        b.tags.some(t => t.toLowerCase().includes(kw))
      ;
    }
    
    if (category) {
      books = books.filter(b => b.category === category);
    }
    
    if (condition) {
      books = books.filter(b => b.condition === condition);
    }
    
    return books;
  }

  addExchangeRecord(userId: string, record: Omit<ExchangeRecord, 'id'>): void {
    const user = this.users.get(userId);
    if (user) {
      user.exchangeHistory.unshift(record);
    }
  }

  addBrowseHistory(userId: string, bookId: string): void {
    const user = this.users.get(userId);
    if (user) {
      if (!user.browseHistory.includes(bookId)) {
        user.browseHistory.unshift(bookId);
        if (user.browseHistory.length > 20) {
          user.browseHistory.pop();
        }
      }
    }
  }

  getMessages(userId1: string, userId2: string): Message[] {
    return Array.from(this.messages.values())
      .filter(m =>
        (m.senderId === userId1 && m.receiverId === userId2) ||
        (m.senderId === userId2 && m.receiverId === userId1)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  createMessage(message: Omit<Message, 'id' | 'createdAt'>): Message {
    const msg: Message = {
      ...message,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    this.messages.set(msg.id, msg);
    return msg;
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }
}

export const db = new Database();
