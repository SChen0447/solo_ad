import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', '..', 'library.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT NOT NULL,
    cover_color TEXT NOT NULL,
    cover_gradient TEXT NOT NULL,
    recommend_reason TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    avg_rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    borrow_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    return_date TEXT,
    status TEXT NOT NULL DEFAULT 'borrowed',
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_color TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get('user-001');
if (!currentUser) {
  db.prepare('INSERT INTO users (id, name, avatar_color) VALUES (?, ?, ?)').run(
    'user-001',
    '张小明',
    '#4f46e5'
  );
}

const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get() as { count: number };
if (bookCount.count === 0) {
  const insertBook = db.prepare(`
    INSERT INTO books (id, title, author, description, cover_color, cover_gradient, recommend_reason, likes, avg_rating, review_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const books = [
    {
      id: 'book-001',
      title: '百年孤独',
      author: '加西亚·马尔克斯',
      description: '《百年孤独》是魔幻现实主义文学的代表作，描写了布恩迪亚家族七代人的传奇故事，以及加勒比海沿岸小镇马孔多的百年兴衰。作品融合了神话传说、民间故事与现实历史，展现了拉丁美洲的历史与文化。',
      cover_color: '#6366f1',
      cover_gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
      recommend_reason: '魔幻现实主义巅峰之作，带你领略拉丁美洲的奇幻世界',
      likes: 256,
      avg_rating: 4.8,
      review_count: 89,
    },
    {
      id: 'book-002',
      title: '人类简史',
      author: '尤瓦尔·赫拉利',
      description: '从十万年前有生命迹象开始到21世纪资本、科技交织的人类发展史。作者用独特的视角审视人类历史，探讨我们是如何成为地球的主宰者，以及未来将走向何方。',
      cover_color: '#0ea5e9',
      cover_gradient: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #14b8a6 100%)',
      recommend_reason: '刷新认知的历史巨著，重新理解人类的过去与未来',
      likes: 342,
      avg_rating: 4.6,
      review_count: 156,
    },
    {
      id: 'book-003',
      title: '三体',
      author: '刘慈欣',
      description: '中国科幻文学的里程碑之作。文化大革命如火如荼进行的同时，军方探寻外星文明的绝秘计划"红岸工程"取得了突破性进展。在按下发射键的那一刻，历经劫难的叶文洁没有意识到，她彻底改变了人类的命运。',
      cover_color: '#f59e0b',
      cover_gradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)',
      recommend_reason: '中国科幻巅峰，雨果奖获奖作品，展现宇宙级别的史诗博弈',
      likes: 512,
      avg_rating: 4.9,
      review_count: 234,
    },
    {
      id: 'book-004',
      title: '活着',
      author: '余华',
      description: '讲述了农村人福贵悲惨的人生遭遇。福贵本是个阔少爷，可他嗜赌如命，终于赌光了家业。他的父亲被他活活气死，母亲则在穷困中患了重病。经过一次次的人生打击，福贵的亲人相继离去，最后只剩下他和一头老牛相依为命。',
      cover_color: '#ef4444',
      cover_gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
      recommend_reason: '余华代表作，用苦难诠释生命的坚韧与尊严',
      likes: 289,
      avg_rating: 4.7,
      review_count: 178,
    },
    {
      id: 'book-005',
      title: '小王子',
      author: '安托万·德·圣-埃克苏佩里',
      description: '这是一本足以让人永葆童心的不朽经典。小王子来自一颗很小的星球，他与一朵美丽的玫瑰相依为命。后来他告别了自己的星球，开始了宇宙旅行，在地球上他与一只狐狸成为了朋友，也领悟了爱的真谛。',
      cover_color: '#fbbf24',
      cover_gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
      recommend_reason: '献给所有大人的童话，关于爱与责任的永恒寓言',
      likes: 445,
      avg_rating: 4.8,
      review_count: 312,
    },
    {
      id: 'book-006',
      title: '围城',
      author: '钱钟书',
      description: '钱钟书先生唯一的长篇小说，被誉为"新儒林外史"。小说以抗战初期为背景，讲述了主人公方鸿渐从欧洲留学回国后，在上海、内地等地的经历与遭遇，展现了那个时代知识分子的众生相。',
      cover_color: '#10b981',
      cover_gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
      recommend_reason: '语言艺术的巅峰之作，辛辣幽默中见人生智慧',
      likes: 198,
      avg_rating: 4.5,
      review_count: 145,
    },
    {
      id: 'book-007',
      title: '挪威的森林',
      author: '村上春树',
      description: '这是一部动人心弦的、平缓舒雅的、略带感伤的恋爱小说。主人公渡边以第一人称展开他同两个女孩间的爱情纠葛，展现了青春期的迷茫、孤独与对爱的渴望。',
      cover_color: '#22c55e',
      cover_gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
      recommend_reason: '村上春树最受欢迎的作品，青春与爱情的永恒咏叹',
      likes: 367,
      avg_rating: 4.4,
      review_count: 267,
    },
    {
      id: 'book-008',
      title: '红楼梦',
      author: '曹雪芹',
      description: '中国古典小说的巅峰之作。以贾宝玉、林黛玉、薛宝钗的爱情婚姻悲剧为主线，描绘了贾、史、王、薛四大家族的兴衰沉浮，展现了封建社会末期的社会百态。',
      cover_color: '#e11d48',
      cover_gradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 50%, #9f1239 100%)',
      recommend_reason: '中国古典文学巅峰，封建社会的百科全书',
      likes: 234,
      avg_rating: 4.9,
      review_count: 189,
    },
    {
      id: 'book-009',
      title: '思考，快与慢',
      author: '丹尼尔·卡尼曼',
      description: '诺贝尔经济学奖得主的代表作。书中揭示了驱动我们思考方式的两个系统：快思考和慢思考，以及它们如何影响我们的决策。通过丰富的实验和案例，作者展示了我们思维中的各种偏差和误区。',
      cover_color: '#3b82f6',
      cover_gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
      recommend_reason: '诺贝尔经济学奖杰作，重新认识你的思维方式',
      likes: 178,
      avg_rating: 4.3,
      review_count: 98,
    },
    {
      id: 'book-010',
      title: '解忧杂货店',
      author: '东野圭吾',
      description: '这是一个关于穿越时空的温情故事。僻静的街道旁有一家杂货店，只要写下烦恼投进店前门卷帘门的投信口，第二天就会在店后的牛奶箱里得到回答。他们将困惑写成信投进杂货店，奇妙的事情随即不断发生。',
      cover_color: '#f97316',
      cover_gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)',
      recommend_reason: '东野圭吾最治愈的作品，温暖每一个迷茫的灵魂',
      likes: 423,
      avg_rating: 4.7,
      review_count: 245,
    },
  ];

  const insertMany = db.transaction(() => {
    for (const book of books) {
      insertBook.run(
        book.id,
        book.title,
        book.author,
        book.description,
        book.cover_color,
        book.cover_gradient,
        book.recommend_reason,
        book.likes,
        book.avg_rating,
        book.review_count
      );
    }
  });
  insertMany();

  const insertReview = db.prepare(`
    INSERT INTO reviews (id, book_id, user_name, rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `);

  const sampleReviews = [
    { id: 'rev-001', bookId: 'book-001', userName: '李小红', rating: 5, comment: '太震撼了！马尔克斯的想象力简直无与伦比，每一页都充满惊喜。' },
    { id: 'rev-002', bookId: 'book-001', userName: '王大明', rating: 4, comment: '刚开始读有点难进入，但越读越着迷，布恩迪亚家族的故事让人唏嘘。' },
    { id: 'rev-003', bookId: 'book-001', userName: '陈小华', rating: 5, comment: '重读第三遍了，每次都有新的感悟，经典就是经典。' },
    { id: 'rev-004', bookId: 'book-002', userName: '张小明', rating: 5, comment: '完全改变了我对人类历史的认知，作者的视角太独特了。' },
    { id: 'rev-005', bookId: 'book-002', userName: '刘小美', rating: 4, comment: '内容很有启发性，不过有些观点值得商榷。' },
    { id: 'rev-006', bookId: 'book-003', userName: '张小强', rating: 5, comment: '中国科幻的骄傲！三体问题、黑暗森林法则，每个概念都让人拍案叫绝。' },
    { id: 'rev-007', bookId: 'book-003', userName: '李小雨', rating: 5, comment: '读完久久不能平静，人类在宇宙面前太渺小了。' },
    { id: 'rev-008', bookId: 'book-004', userName: '王小丽', rating: 5, comment: '余华的笔力太深厚了，福贵的故事让人流泪，但又感受到生命的力量。' },
    { id: 'rev-009', bookId: 'book-005', userName: '赵小明', rating: 5, comment: '每次读都有不同的感受，"真正重要的东西，用眼睛是看不见的。"' },
    { id: 'rev-010', bookId: 'book-006', userName: '钱小美', rating: 4, comment: '钱钟书的文笔真是绝了，讽刺中带着深意。' },
    { id: 'rev-011', bookId: 'book-007', userName: '孙大伟', rating: 4, comment: '村上春树的文字总是那么温柔，直抵人心。' },
    { id: 'rev-012', bookId: 'book-010', userName: '周小花', rating: 5, comment: '东野圭吾不只会写推理，这个温情故事同样精彩。' },
  ];

  const insertReviewsTx = db.transaction(() => {
    for (const review of sampleReviews) {
      insertReview.run(review.id, review.bookId, review.userName, review.rating, review.comment);
    }
  });
  insertReviewsTx();

  const insertLoan = db.prepare(`
    INSERT INTO loans (id, book_id, user_id, user_name, borrow_date, due_date, return_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  const daysAgo = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return formatDate(d);
  };
  
  const daysLater = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return formatDate(d);
  };

  const sampleLoans = [
    { id: 'loan-001', bookId: 'book-003', userId: 'user-001', userName: '张小明', borrowDate: daysAgo(5), dueDate: daysLater(25), returnDate: null, status: 'borrowed' },
    { id: 'loan-002', bookId: 'book-005', userId: 'user-001', userName: '张小明', borrowDate: daysAgo(20), dueDate: daysAgo(10), returnDate: daysAgo(8), status: 'returned' },
    { id: 'loan-003', bookId: 'book-001', userId: 'user-001', userName: '张小明', borrowDate: daysAgo(40), dueDate: daysAgo(10), returnDate: null, status: 'overdue' },
  ];

  const insertLoansTx = db.transaction(() => {
    for (const loan of sampleLoans) {
      insertLoan.run(loan.id, loan.bookId, loan.userId, loan.userName, loan.borrowDate, loan.dueDate, loan.returnDate, loan.status);
    }
  });
  insertLoansTx();
}

export default db;
