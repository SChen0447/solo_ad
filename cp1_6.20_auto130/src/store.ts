import { create } from 'zustand';
import type { Book, CartItem, Order } from './types';

const INITIAL_BOOKS: Book[] = [
  {
    id: '1',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    isbn: '978-7-5442-4528-0',
    price: 55.0,
    stock: 12,
    coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20One%20Hundred%20Years%20of%20Solitude%20by%20Marquez%2C%20magical%20realism%20style%2C%20vintage%20literary%20cover%20design&image_size=portrait_4_3',
  },
  {
    id: '2',
    title: '活着',
    author: '余华',
    isbn: '978-7-5063-6749-2',
    price: 29.0,
    stock: 20,
    coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20To%20Live%20by%20Yu%20Hua%2C%20minimalist%20Chinese%20literary%20design&image_size=portrait_4_3',
  },
  {
    id: '3',
    title: '小王子',
    author: '安托万·德·圣-埃克苏佩里',
    isbn: '978-7-020-04249-6',
    price: 32.0,
    stock: 15,
    coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20The%20Little%20Prince%2C%20watercolor%20illustration%20style%2C%20stars%20and%20rose&image_size=portrait_4_3',
  },
  {
    id: '4',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    isbn: '978-7-5086-4489-3',
    price: 68.0,
    stock: 8,
    coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20Sapiens%20by%20Harari%2C%20modern%20non-fiction%20design&image_size=portrait_4_3',
  },
  {
    id: '5',
    title: '三体',
    author: '刘慈欣',
    isbn: '978-7-5366-9293-0',
    price: 23.0,
    stock: 25,
    coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20The%20Three-Body%20Problem%20by%20Liu%20Cixin%2C%20sci-fi%20cosmic%20design&image_size=portrait_4_3',
  },
  {
    id: '6',
    title: '挪威的森林',
    author: '村上春树',
    isbn: '978-7-5327-4748-0',
    price: 36.0,
    stock: 10,
    coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20Norwegian%20Wood%20by%20Murakami%2C%20forest%20green%20aesthetic&image_size=portrait_4_3',
  },
  {
    id: '7',
    title: '围城',
    author: '钱钟书',
    isbn: '978-7-020-02809-4',
    price: 39.0,
    stock: 14,
    coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20Fortress%20Besieged%20by%20Qian%20Zhongshu%2C%20classic%20Chinese%20literary%20design&image_size=portrait_4_3',
  },
  {
    id: '8',
    title: '解忧杂货店',
    author: '东野圭吾',
    isbn: '978-7-5442-7067-1',
    price: 39.5,
    stock: 18,
    coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20The%20Miracles%20of%20the%20Namiya%20General%20Store%2C%20warm%20Japanese%20aesthetic&image_size=portrait_4_3',
  },
  {
    id: '9',
    title: '追风筝的人',
    author: '卡勒德·胡赛尼',
    isbn: '978-7-2081-6164-3',
    price: 36.0,
    stock: 11,
    coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20The%20Kite%20Runner%2C%20kite%20flying%20over%20Kabul%20sky&image_size=portrait_4_3',
  },
  {
    id: '10',
    title: '月亮与六便士',
    author: '毛姆',
    isbn: '978-7-5321-5293-0',
    price: 25.0,
    stock: 16,
    coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20for%20The%20Moon%20and%20Sixpence%20by%20Maugham%2C%20artistic%20painterly%20design&image_size=portrait_4_3',
  },
];

interface BookStore {
  books: Book[];
  addBook: (book: Omit<Book, 'id'>) => void;
  updateBook: (id: string, data: Partial<Omit<Book, 'id'>>) => void;
  deleteBook: (id: string) => void;
}

interface CartStore {
  cartItems: CartItem[];
  isCartOpen: boolean;
  addToCart: (book: Book) => void;
  removeFromCart: (bookId: string) => void;
  updateQuantity: (bookId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getTotalPrice: () => number;
}

interface OrderStore {
  orders: Order[];
  addOrder: (items: CartItem[]) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
}

export const useBookStore = create<BookStore>((set) => ({
  books: INITIAL_BOOKS,
  addBook: (book) =>
    set((state) => ({
      books: [...state.books, { ...book, id: Date.now().toString() }],
    })),
  updateBook: (id, data) =>
    set((state) => ({
      books: state.books.map((b) => (b.id === id ? { ...b, ...data } : b)),
    })),
  deleteBook: (id) =>
    set((state) => ({
      books: state.books.filter((b) => b.id !== id),
    })),
}));

export const useCartStore = create<CartStore>((set, get) => ({
  cartItems: [],
  isCartOpen: false,
  addToCart: (book) =>
    set((state) => {
      const existing = state.cartItems.find((item) => item.bookId === book.id);
      if (existing) {
        return {
          cartItems: state.cartItems.map((item) =>
            item.bookId === book.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return {
        cartItems: [
          ...state.cartItems,
          {
            bookId: book.id,
            title: book.title,
            price: book.price,
            quantity: 1,
            coverUrl: book.coverUrl,
          },
        ],
      };
    }),
  removeFromCart: (bookId) =>
    set((state) => ({
      cartItems: state.cartItems.filter((item) => item.bookId !== bookId),
    })),
  updateQuantity: (bookId, quantity) =>
    set((state) => ({
      cartItems:
        quantity <= 0
          ? state.cartItems.filter((item) => item.bookId !== bookId)
          : state.cartItems.map((item) =>
              item.bookId === bookId ? { ...item, quantity } : item
            ),
    })),
  clearCart: () => set({ cartItems: [] }),
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
  getTotalPrice: () =>
    get().cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
}));

export const useOrderStore = create<OrderStore>((set) => ({
  orders: [],
  addOrder: (items) =>
    set((state) => ({
      orders: [
        ...state.orders,
        {
          id: Date.now().toString(),
          items: items.map((item) => ({
            bookId: item.bookId,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
          })),
          totalPrice: items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          ),
          status: '待处理',
          createdAt: new Date().toLocaleString('zh-CN'),
        },
      ],
    })),
  updateOrderStatus: (orderId, status) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, status } : o
      ),
    })),
}));
