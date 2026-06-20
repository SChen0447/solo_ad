export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  stock: number;
  coverUrl: string;
  borrowHistory: BorrowRecord[];
}

export interface BorrowRecord {
  id: string;
  userId: string;
  bookId: string;
  borrowDate: string;
  returnDate?: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'reader';
  avatar?: string;
}

export interface BookClub {
  id: string;
  name: string;
  bookTitle: string;
  coverUrl: string;
  startTime: string;
  endTime: string;
  description: string;
  maxMembers: number;
  creatorId: string;
  status: 'recruiting' | 'ongoing' | 'ended';
  members: string[];
  pendingMembers: string[];
}

export interface Note {
  id: string;
  clubId: string;
  userId: string;
  title: string;
  content: string;
  progress: number;
  createdAt: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
}

export interface UserAchievement {
  achievementId: string;
  unlockedAt: string;
}

let books: Book[] = [];
let users: User[] = [];
let bookClubs: BookClub[] = [];
let notes: Note[] = [];
let achievements: Achievement[] = [];
let userAchievements: Map<string, UserAchievement[]> = new Map();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function initData() {
  books = [
    {
      id: 'b1',
      title: '百年孤独',
      author: '加西亚·马尔克斯',
      isbn: '9787544253994',
      category: '文学',
      stock: 12,
      coverUrl: 'https://picsum.photos/seed/book1/220/300',
      borrowHistory: [
        { id: 'br1', userId: 'u2', bookId: 'b1', borrowDate: '2024-01-15', returnDate: '2024-02-15' }
      ]
    },
    {
      id: 'b2',
      title: '活着',
      author: '余华',
      isbn: '9787506365437',
      category: '文学',
      stock: 8,
      coverUrl: 'https://picsum.photos/seed/book2/220/300',
      borrowHistory: []
    },
    {
      id: 'b3',
      title: '人类简史',
      author: '尤瓦尔·赫拉利',
      isbn: '9787508647357',
      category: '历史',
      stock: 15,
      coverUrl: 'https://picsum.photos/seed/book3/220/300',
      borrowHistory: [
        { id: 'br2', userId: 'u3', bookId: 'b3', borrowDate: '2024-02-01' }
      ]
    },
    {
      id: 'b4',
      title: '三体',
      author: '刘慈欣',
      isbn: '9787536692930',
      category: '科幻',
      stock: 20,
      coverUrl: 'https://picsum.photos/seed/book4/220/300',
      borrowHistory: []
    },
    {
      id: 'b5',
      title: '深度工作',
      author: '卡尔·纽波特',
      isbn: '9787210093329',
      category: '科技',
      stock: 6,
      coverUrl: 'https://picsum.photos/seed/book5/220/300',
      borrowHistory: []
    },
    {
      id: 'b6',
      title: '小王子',
      author: '圣埃克苏佩里',
      isbn: '9787544733082',
      category: '文学',
      stock: 25,
      coverUrl: 'https://picsum.photos/seed/book6/220/300',
      borrowHistory: []
    },
    {
      id: 'b7',
      title: '艺术的故事',
      author: '贡布里希',
      isbn: '9787807463726',
      category: '艺术',
      stock: 5,
      coverUrl: 'https://picsum.photos/seed/book7/220/300',
      borrowHistory: []
    },
    {
      id: 'b8',
      title: '原则',
      author: '瑞·达利欧',
      isbn: '9787508686288',
      category: '商业',
      stock: 10,
      coverUrl: 'https://picsum.photos/seed/book8/220/300',
      borrowHistory: []
    },
    {
      id: 'b9',
      title: '明朝那些事儿',
      author: '当年明月',
      isbn: '9787213046432',
      category: '历史',
      stock: 18,
      coverUrl: 'https://picsum.photos/seed/book9/220/300',
      borrowHistory: []
    },
    {
      id: 'b10',
      title: '思考，快与慢',
      author: '丹尼尔·卡尼曼',
      isbn: '9787508633558',
      category: '心理',
      stock: 7,
      coverUrl: 'https://picsum.photos/seed/book10/220/300',
      borrowHistory: []
    },
    {
      id: 'b11',
      title: '挪威的森林',
      author: '村上春树',
      isbn: '9787532732128',
      category: '文学',
      stock: 14,
      coverUrl: 'https://picsum.photos/seed/book11/220/300',
      borrowHistory: []
    },
    {
      id: 'b12',
      title: '时间简史',
      author: '史蒂芬·霍金',
      isbn: '9787535732309',
      category: '科技',
      stock: 9,
      coverUrl: 'https://picsum.photos/seed/book12/220/300',
      borrowHistory: []
    }
  ];

  users = [
    { id: 'u1', username: 'admin', password: 'admin123', role: 'admin', avatar: 'https://picsum.photos/seed/admin/100/100' },
    { id: 'u2', username: 'bookworm', password: '123456', role: 'reader', avatar: 'https://picsum.photos/seed/user2/100/100' },
    { id: 'u3', username: 'reader_lily', password: '123456', role: 'reader', avatar: 'https://picsum.photos/seed/user3/100/100' },
    { id: 'u4', username: 'literature_fan', password: '123456', role: 'reader', avatar: 'https://picsum.photos/seed/user4/100/100' }
  ];

  bookClubs = [
    {
      id: 'c1',
      name: '百年孤独共读会',
      bookTitle: '百年孤独',
      coverUrl: 'https://picsum.photos/seed/club1/200/200',
      startTime: '2024-06-01',
      endTime: '2024-07-01',
      description: '一起走进马尔克斯笔下的魔幻现实世界，探索布恩迪亚家族七代人的传奇故事。',
      maxMembers: 20,
      creatorId: 'u2',
      status: 'ongoing',
      members: ['u2', 'u3'],
      pendingMembers: ['u4']
    },
    {
      id: 'c2',
      name: '三体科幻读书会',
      bookTitle: '三体',
      coverUrl: 'https://picsum.photos/seed/club2/200/200',
      startTime: '2024-05-15',
      endTime: '2024-06-15',
      description: '探讨三体宇宙中的黑暗森林法则，品味中国科幻的巅峰之作。',
      maxMembers: 30,
      creatorId: 'u3',
      status: 'recruiting',
      members: ['u3'],
      pendingMembers: []
    },
    {
      id: 'c3',
      name: '历史爱好者俱乐部',
      bookTitle: '人类简史',
      coverUrl: 'https://picsum.photos/seed/club3/200/200',
      startTime: '2024-04-01',
      endTime: '2024-05-01',
      description: '从认知革命到科学革命，重新理解人类的发展历程。',
      maxMembers: 25,
      creatorId: 'u2',
      status: 'ended',
      members: ['u2', 'u3', 'u4'],
      pendingMembers: []
    },
    {
      id: 'c4',
      name: '深度工作实践营',
      bookTitle: '深度工作',
      coverUrl: 'https://picsum.photos/seed/club4/200/200',
      startTime: '2024-07-01',
      endTime: '2024-08-01',
      description: '学习深度工作的方法，提升专注力和工作效率。',
      maxMembers: 15,
      creatorId: 'u4',
      status: 'recruiting',
      members: ['u4'],
      pendingMembers: []
    }
  ];

  notes = [
    {
      id: 'n1',
      clubId: 'c1',
      userId: 'u2',
      title: '第一章的魔幻现实感',
      content: '马尔克斯的开篇就给人强烈的魔幻现实感，吉普赛人带来的磁铁、放大镜等新奇事物，让我们看到了一个与现实世界完全不同的马孔多。',
      progress: 15,
      createdAt: '2024-06-05T10:30:00Z'
    },
    {
      id: 'n2',
      clubId: 'c1',
      userId: 'u3',
      title: '关于孤独的思考',
      content: '布恩迪亚家族每个人都有自己的孤独，有的人在孤独中创造，有的人在孤独中沉沦。孤独似乎是这个家族逃不开的宿命。',
      progress: 35,
      createdAt: '2024-06-10T14:20:00Z'
    },
    {
      id: 'n3',
      clubId: 'c2',
      userId: 'u3',
      title: '黑暗森林法则的震撼',
      content: '读到黑暗森林法则那段真的被震撼到了！宇宙就是一座黑暗森林，每个文明都是带枪的猎人，这个比喻太精妙了。',
      progress: 50,
      createdAt: '2024-05-20T09:15:00Z'
    },
    {
      id: 'n4',
      clubId: 'c3',
      userId: 'u2',
      title: '认知革命改变了一切',
      content: '7万年前的认知革命让人类能够想象不存在的事物，这是人类能够大规模合作的基础。这个观点真的很有启发性。',
      progress: 25,
      createdAt: '2024-04-10T16:45:00Z'
    },
    {
      id: 'n5',
      clubId: 'c3',
      userId: 'u4',
      title: '农业革命是骗局吗？',
      content: '赫拉利说农业革命是史上最大的骗局，确实很有道理。人类以为自己驯化了小麦，其实是小麦驯化了人类。',
      progress: 45,
      createdAt: '2024-04-20T11:00:00Z'
    }
  ];

  achievements = [
    { id: 'a1', name: '初次阅读', description: '读完第一本书', icon: '📖', condition: 'read_1_book' },
    { id: 'a2', name: '书虫', description: '读完10本书', icon: '🐛', condition: 'read_10_books' },
    { id: 'a3', name: '读书会新手', description: '第一个参加读书会', icon: '🌟', condition: 'first_club' },
    { id: 'a4', name: '社交蝴蝶', description: '参加5个读书会', icon: '🦋', condition: 'join_5_clubs' },
    { id: 'a5', name: '笔记达人', description: '发布10篇笔记', icon: '✍️', condition: 'write_10_notes' },
    { id: 'a6', name: '读书会创建者', description: '创建第一个读书会', icon: '🎯', condition: 'create_club' },
    { id: 'a7', name: '深度阅读者', description: '单本书进度达到100%', icon: '🎓', condition: 'finish_book' },
    { id: 'a8', name: '月度冠军', description: '一个月内读完5本书', icon: '🏆', condition: 'monthly_5_books' }
  ];

  userAchievements.set('u2', [
    { achievementId: 'a1', unlockedAt: '2024-01-20T10:00:00Z' },
    { achievementId: 'a3', unlockedAt: '2024-02-15T14:30:00Z' },
    { achievementId: 'a6', unlockedAt: '2024-03-01T09:00:00Z' },
    { achievementId: 'a5', unlockedAt: '2024-04-10T16:00:00Z' }
  ]);

  userAchievements.set('u3', [
    { achievementId: 'a1', unlockedAt: '2024-02-10T11:00:00Z' },
    { achievementId: 'a3', unlockedAt: '2024-03-05T13:00:00Z' },
    { achievementId: 'a7', unlockedAt: '2024-05-20T15:00:00Z' }
  ]);

  userAchievements.set('u4', [
    { achievementId: 'a1', unlockedAt: '2024-03-15T10:00:00Z' },
    { achievementId: 'a6', unlockedAt: '2024-06-01T12:00:00Z' }
  ]);
}

initData();

export function getBooks(): Book[] {
  return books;
}

export function getBookById(id: string): Book | undefined {
  return books.find(b => b.id === id);
}

export function addBook(book: Omit<Book, 'id' | 'borrowHistory'>): Book {
  const newBook: Book = {
    ...book,
    id: generateId(),
    borrowHistory: []
  };
  books.push(newBook);
  return newBook;
}

export function updateBook(id: string, updates: Partial<Book>): Book | undefined {
  const index = books.findIndex(b => b.id === id);
  if (index === -1) return undefined;
  books[index] = { ...books[index], ...updates };
  return books[index];
}

export function deleteBook(id: string): boolean {
  const index = books.findIndex(b => b.id === id);
  if (index === -1) return false;
  books.splice(index, 1);
  return true;
}

export function getUsers(): User[] {
  return users.map(u => ({ ...u, password: '' }));
}

export function getUserById(id: string): User | undefined {
  const user = users.find(u => u.id === id);
  if (user) return { ...user, password: '' };
  return undefined;
}

export function login(username: string, password: string): { user: User; token: string } | null {
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return null;
  return {
    user: { ...user, password: '' },
    token: 'mock-token-' + user.id
  };
}

export function register(username: string, password: string): { user: User; token: string } | null {
  if (users.find(u => u.username === username)) return null;
  const newUser: User = {
    id: generateId(),
    username,
    password,
    role: 'reader',
    avatar: `https://picsum.photos/seed/${username}/100/100`
  };
  users.push(newUser);
  
  const firstAchievement = achievements.find(a => a.condition === 'first_club');
  if (firstAchievement) {
    userAchievements.set(newUser.id, [
      { achievementId: firstAchievement.id, unlockedAt: new Date().toISOString() }
    ]);
  }
  
  return {
    user: { ...newUser, password: '' },
    token: 'mock-token-' + newUser.id
  };
}

export function getBookClubs(): BookClub[] {
  return bookClubs;
}

export function getBookClubById(id: string): BookClub | undefined {
  return bookClubs.find(c => c.id === id);
}

export function addBookClub(club: Omit<BookClub, 'id' | 'members' | 'pendingMembers' | 'status'>): BookClub {
  const newClub: BookClub = {
    ...club,
    id: generateId(),
    members: [club.creatorId],
    pendingMembers: [],
    status: 'recruiting'
  };
  bookClubs.push(newClub);
  return newClub;
}

export function joinBookClub(clubId: string, userId: string): boolean {
  const club = bookClubs.find(c => c.id === clubId);
  if (!club) return false;
  if (club.members.includes(userId) || club.pendingMembers.includes(userId)) return false;
  club.pendingMembers.push(userId);
  return true;
}

export function approveMember(clubId: string, userId: string): boolean {
  const club = bookClubs.find(c => c.id === clubId);
  if (!club) return false;
  const pendingIndex = club.pendingMembers.indexOf(userId);
  if (pendingIndex === -1) return false;
  club.pendingMembers.splice(pendingIndex, 1);
  club.members.push(userId);
  if (club.members.length >= 3) {
    club.status = 'ongoing';
  }
  return true;
}

export function getNotesByClubId(clubId: string): Note[] {
  return notes.filter(n => n.clubId === clubId).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function addNote(note: Omit<Note, 'id' | 'createdAt'>): Note {
  const newNote: Note = {
    ...note,
    id: generateId(),
    createdAt: new Date().toISOString()
  };
  notes.push(newNote);
  return newNote;
}

export function getAchievements(): Achievement[] {
  return achievements;
}

export function getUserAchievements(userId: string): UserAchievement[] {
  return userAchievements.get(userId) || [];
}

export function getReadingProgress(userId: string): { bookId: string; progress: number; lastRead: string }[] {
  const userNotes = notes.filter(n => n.userId === userId);
  const bookProgressMap = new Map<string, { progress: number; lastRead: string; clubId: string }>();
  
  for (const note of userNotes) {
    const club = bookClubs.find(c => c.id === note.clubId);
    if (!club) continue;
    const book = books.find(b => b.title === club.bookTitle);
    if (!book) continue;
    
    const existing = bookProgressMap.get(book.id);
    if (!existing || note.progress > existing.progress) {
      bookProgressMap.set(book.id, { 
        progress: note.progress, 
        lastRead: note.createdAt,
        clubId: note.clubId
      });
    }
  }
  
  const result = Array.from(bookProgressMap.entries()).map(([bookId, data]) => ({
    bookId,
    progress: data.progress,
    lastRead: data.lastRead
  }));
  
  return result.sort((a, b) => new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime());
}

export function getBooksByCategory(category: string): Book[] {
  if (category === 'all') return books;
  return books.filter(b => b.category === category);
}

export function getCategories(): string[] {
  const categories = new Set(books.map(b => b.category));
  return Array.from(categories);
}
