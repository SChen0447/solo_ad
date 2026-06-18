import { create } from 'zustand';
import { User, Item, Bid } from '../services/api';

interface Store {
  user: User | null;
  items: Item[];
  totalItems: number;
  currentItem: Item | null;
  bids: Bid[];
  loginModalOpen: boolean;
  redirectAfterLogin: string | null;
  lastToastBidId: string | null;

  setUser: (user: User | null) => void;
  setItems: (items: Item[]) => void;
  addItem: (item: Item) => void;
  setTotalItems: (total: number) => void;
  setCurrentItem: (item: Item | null) => void;
  updateItem: (item: Item) => void;
  setBids: (bids: Bid[]) => void;
  addBid: (bid: Bid) => void;
  setLoginModalOpen: (open: boolean) => void;
  setRedirectAfterLogin: (path: string | null) => void;
  setLastToastBidId: (id: string | null) => void;
  logout: () => void;
}

const loadUser = (): User | null => {
  try {
    const stored = localStorage.getItem('auction_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const useStore = create<Store>((set) => ({
  user: loadUser(),
  items: [],
  totalItems: 0,
  currentItem: null,
  bids: [],
  loginModalOpen: false,
  redirectAfterLogin: null,
  lastToastBidId: null,

  setUser: (user) => {
    if (user) {
      localStorage.setItem('auction_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('auction_user');
    }
    set({ user });
  },

  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({ items: [item, ...state.items] })),
  setTotalItems: (total) => set({ totalItems: total }),
  setCurrentItem: (item) => set({ currentItem: item }),
  updateItem: (item) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === item.id ? item : i)),
      currentItem: state.currentItem?.id === item.id ? item : state.currentItem,
    })),
  setBids: (bids) => set({ bids }),
  addBid: (bid) =>
    set((state) => ({
      bids: [bid, ...state.bids.filter((b) => b.id !== bid.id)],
      lastToastBidId: bid.id,
    })),
  setLoginModalOpen: (open) => set({ loginModalOpen: open }),
  setRedirectAfterLogin: (path) => set({ redirectAfterLogin: path }),
  setLastToastBidId: (id) => set({ lastToastBidId: id }),
  logout: () => {
    localStorage.removeItem('auction_user');
    set({ user: null });
  },
}));
