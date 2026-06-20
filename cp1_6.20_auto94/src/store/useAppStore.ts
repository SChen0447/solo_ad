import { create } from 'zustand';
import type {
  User,
  Book,
  Bid,
  Auction,
  Reservation,
  OperationLog,
  ToastMessage,
  BookStatus
} from '@/types';

interface AppState {
  currentUser: User | null;
  books: Book[];
  auctions: Auction[];
  bidsByBook: Record<string, Bid[]>;
  reservations: Reservation[];
  operationLogs: OperationLog[];
  toasts: ToastMessage[];
  hasUnreadNotification: boolean;

  setCurrentUser: (user: User | null) => void;
  setBooks: (books: Book[]) => void;
  addBook: (book: Book) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;

  setAuctions: (auctions: Auction[]) => void;
  addAuction: (auction: Auction) => void;
  setBidsForBook: (bookId: string, bids: Bid[]) => void;
  addBid: (bookId: string, bid: Bid) => void;

  setReservations: (reservations: Reservation[]) => void;
  addReservation: (reservation: Reservation) => void;
  updateReservation: (id: string, updates: Partial<Reservation>) => void;

  setOperationLogs: (logs: OperationLog[]) => void;
  addOperationLog: (log: OperationLog) => void;

  addToast: (type: ToastMessage['type'], message: string) => void;
  removeToast: (id: string) => void;

  setHasUnreadNotification: (value: boolean) => void;

  getBookStatusCounts: () => Record<BookStatus, number>;
  getHighestBidForBook: (bookId: string) => Bid | null;
}

const MOCK_USER: User = {
  id: 'user-1',
  username: 'admin',
  role: 'admin',
  name: '系统管理员',
  avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin&backgroundColor=4a90d9'
};

const MOCK_RECYCLER: User = {
  id: 'recycler-1',
  username: 'recycler',
  role: 'recycler',
  name: '张回收商',
  avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Recycler&backgroundColor=27ae60'
};

const MOCK_READER: User = {
  id: 'reader-1',
  username: 'reader',
  role: 'reader',
  name: '李读者',
  avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Reader&backgroundColor=9b59b6'
};

const generateMockBooks = (): Book[] => {
  const now = new Date();
  const books: Book[] = [];
  const titles = [
    '百年孤独', '三体', '活着', '红楼梦', '围城',
    '平凡的世界', '白夜行', '人类简史', '明朝那些事儿', '追风筝的人',
    '解忧杂货店', '小王子', '瓦尔登湖', '霍乱时期的爱情', '1984'
  ];
  const authors = [
    '加西亚·马尔克斯', '刘慈欣', '余华', '曹雪芹', '钱钟书',
    '路遥', '东野圭吾', '尤瓦尔·赫拉利', '当年明月', '卡勒德·胡赛尼',
    '东野圭吾', '圣埃克苏佩里', '梭罗', '马尔克斯', '乔治·奥威尔'
  ];
  const statuses: BookStatus[] = [
    '待估值', '竞标中', '竞标中', '已分配', '已入库',
    '已入库', '借阅中', '已归还', '已入库', '竞标中',
    '已入库', '已入库', '借阅中', '竞标中', '待估值'
  ];
  const years = [1967, 2008, 1993, 1791, 1947, 1986, 1999, 2011, 2006, 2003, 2012, 1943, 1854, 1985, 1949];

  for (let i = 0; i < 15; i++) {
    const cond = ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5;
    const basePrice = 20 + cond * 15 + (i % 3) * 25;
    const status = statuses[i];
    const book: Book = {
      id: `book-${i + 1}`,
      title: titles[i],
      author: authors[i],
      isbn: `9787${String(1000000000 + i * 12345).slice(0, 9)}`,
      publishYear: years[i],
      condition: cond,
      coverImage: `https://picsum.photos/seed/book${i + 1}/300/400`,
      status,
      valuationMin: status !== '待估值' ? Math.round(basePrice * 0.8) : undefined,
      valuationMax: status !== '待估值' ? Math.round(basePrice * 1.2) : undefined,
      finalPrice: status === '已分配' || status === '已入库' || status === '借阅中' || status === '已归还'
        ? Math.round(basePrice * 1.05) : undefined,
      createdAt: new Date(now.getTime() - i * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - i * 3600000).toISOString(),
      rarity: ((i % 5) + 1),
      recyclerName: (status === '已分配' || status === '已入库' || status === '借阅中' || status === '已归还') ? '张回收商' : undefined
    };
    books.push(book);
  }
  return books;
};

const generateMockBids = (books: Book[]): Record<string, Bid[]> => {
  const bidsByBook: Record<string, Bid[]> = {};
  const recyclers = ['张回收商', '李旧书店', '王回收王', '赵爱书屋'];

  books.forEach(book => {
    if (book.status === '竞标中' || book.status === '已分配') {
      const numBids = 3 + Math.floor(Math.random() * 5);
      const bids: Bid[] = [];
      let lastAmount = (book.valuationMin || 30) * 0.9;
      for (let i = 0; i < numBids; i++) {
        lastAmount = lastAmount * (1.05 + Math.random() * 0.1);
        bids.push({
          id: `bid-${book.id}-${i}`,
          bookId: book.id,
          recyclerId: `recycler-${(i % 4) + 1}`,
          recyclerName: recyclers[i % 4],
          amount: Math.round(lastAmount * 100) / 100,
          timestamp: new Date(Date.now() - i * 3600000 * (1 + Math.random())).toISOString()
        });
      }
      bids.sort((a, b) => b.amount - a.amount);
      if (bids.length > 0) bids[0].isWinning = true;
      bidsByBook[book.id] = bids;
    }
  });
  return bidsByBook;
};

const generateMockAuctions = (books: Book[]): Auction[] => {
  const auctions: Auction[] = [];
  books.forEach(book => {
    if (book.status === '竞标中' || book.status === '已分配') {
      auctions.push({
        id: `auction-${book.id}`,
        bookId: book.id,
        startTime: new Date(Date.now() - 86400000 * 0.5).toISOString(),
        endTime: new Date(Date.now() + 86400000 * 0.5).toISOString(),
        status: book.status === '竞标中' ? 'open' : 'closed',
        currentHighestBid: book.finalPrice
      });
    }
  });
  return auctions;
};

const generateMockReservations = (books: Book[]): Reservation[] => {
  const reservations: Reservation[] = [];
  const borrowedBooks = books.filter(b => b.status === '借阅中');
  borrowedBooks.forEach((book, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    reservations.push({
      id: `res-${book.id}`,
      bookId: book.id,
      bookTitle: book.title,
      userId: 'reader-1',
      userName: '李读者',
      reserveDate: d.toISOString().split('T')[0],
      status: 'confirmed',
      qrCode: `QR-${book.id}-${Date.now()}`,
      createdAt: new Date(Date.now() - 86400000).toISOString()
    });
  });
  return reservations;
};

const generateMockLogs = (books: Book[]): OperationLog[] => {
  const logs: OperationLog[] = [];
  const actions = [
    { action: '上传了书籍', type: 'book' },
    { action: '完成了书籍估值', type: 'book' },
    { action: '提交了出价', type: 'auction' },
    { action: '分配了回收商', type: 'book' },
    { action: '完成了入库', type: 'book' },
    { action: '创建了借阅预约', type: 'reservation' },
    { action: '归还了书籍', type: 'reservation' },
    { action: '关闭了竞标', type: 'auction' }
  ];
  const operators = ['系统管理员', '张回收商', '李读者'];

  for (let i = 0; i < 12; i++) {
    const book = books[i % books.length];
    const a = actions[i % actions.length];
    logs.push({
      id: `log-${i + 1}`,
      action: a.action,
      targetType: a.type,
      targetId: book.id,
      targetName: book.title,
      operatorName: operators[i % operators.length],
      timestamp: new Date(Date.now() - i * 600000).toISOString()
    });
  }
  return logs;
};

const initialBooks = generateMockBooks();

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: MOCK_USER,
  books: initialBooks,
  auctions: generateMockAuctions(initialBooks),
  bidsByBook: generateMockBids(initialBooks),
  reservations: generateMockReservations(initialBooks),
  operationLogs: generateMockLogs(initialBooks),
  toasts: [],
  hasUnreadNotification: true,

  setCurrentUser: (user) => set({ currentUser: user }),

  setBooks: (books) => set({ books }),
  addBook: (book) => set((state) => ({ books: [book, ...state.books] })),
  updateBook: (id, updates) => set((state) => ({
    books: state.books.map(b => b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b)
  })),

  setAuctions: (auctions) => set({ auctions }),
  addAuction: (auction) => set((state) => ({ auctions: [...state.auctions, auction] })),
  setBidsForBook: (bookId, bids) => set((state) => ({
    bidsByBook: { ...state.bidsByBook, [bookId]: bids }
  })),
  addBid: (bookId, bid) => set((state) => {
    const existing = state.bidsByBook[bookId] || [];
    const updated = [...existing, bid]
      .sort((a, b) => b.amount - a.amount)
      .map((b, idx) => ({ ...b, isWinning: idx === 0 }));
    return {
      bidsByBook: { ...state.bidsByBook, [bookId]: updated },
      auctions: state.auctions.map(a =>
        a.bookId === bookId ? { ...a, currentHighestBid: updated[0]?.amount } : a
      )
    };
  }),

  setReservations: (reservations) => set({ reservations }),
  addReservation: (reservation) => set((state) => ({
    reservations: [reservation, ...state.reservations]
  })),
  updateReservation: (id, updates) => set((state) => ({
    reservations: state.reservations.map(r =>
      r.id === id ? { ...r, ...updates } : r
    )
  })),

  setOperationLogs: (logs) => set({ operationLogs: logs }),
  addOperationLog: (log) => set((state) => ({
    operationLogs: [log, ...state.operationLogs].slice(0, 100)
  })),

  addToast: (type, message) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }]
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, 3500);
  },
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),

  setHasUnreadNotification: (value) => set({ hasUnreadNotification: value }),

  getBookStatusCounts: () => {
    const counts: Record<BookStatus, number> = {
      '待估值': 0, '竞标中': 0, '已分配': 0,
      '已入库': 0, '借阅中': 0, '已归还': 0
    };
    get().books.forEach(book => {
      counts[book.status]++;
    });
    return counts;
  },

  getHighestBidForBook: (bookId) => {
    const bids = get().bidsByBook[bookId];
    if (!bids || bids.length === 0) return null;
    return bids[0];
  }
}));

export { MOCK_USER, MOCK_RECYCLER, MOCK_READER };
