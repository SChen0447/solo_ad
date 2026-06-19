import { create } from 'zustand';
import {
  paintings,
  initialComments,
  loadCollections,
  saveCollections,
  type Painting,
  type Comment,
} from '@/data/mockData';

interface GalleryState {
  paintings: Painting[];
  comments: Comment[];
  collections: Record<string, boolean>;
  selectedPaintingId: string | null;

  selectPainting: (id: string | null) => void;
  toggleCollection: (paintingId: string) => void;
  addComment: (paintingId: string, content: string) => void;
  getPaintingComments: (paintingId: string) => Comment[];
  isCollected: (paintingId: string) => boolean;
  getCollectedPaintings: () => Painting[];
}

export const useGalleryStore = create<GalleryState>((set, get) => ({
  paintings,
  comments: initialComments,
  collections: loadCollections(),
  selectedPaintingId: null,

  selectPainting: (id) => set({ selectedPaintingId: id }),

  toggleCollection: (paintingId) => {
    const current = get().collections;
    const next = { ...current, [paintingId]: !current[paintingId] };
    saveCollections(next);
    set({ collections: next });
  },

  addComment: (paintingId, content) => {
    const newComment: Comment = {
      id: `c-${Date.now()}`,
      paintingId,
      username: '访客用户',
      avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=guest%20user%20avatar%20portrait%20simple%20elegant%20minimal&image_size=square_hd',
      content,
      timestamp: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).replace(/\//g, '-'),
    };
    set((state) => ({
      comments: [newComment, ...state.comments],
      paintings: state.paintings.map((p) =>
        p.id === paintingId ? { ...p, commentCount: p.commentCount + 1 } : p
      ),
    }));
  },

  getPaintingComments: (paintingId) =>
    get().comments.filter((c) => c.paintingId === paintingId),

  isCollected: (paintingId) => !!get().collections[paintingId],

  getCollectedPaintings: () => {
    const { paintings, collections } = get();
    return paintings.filter((p) => collections[p.id]);
  },
}));
