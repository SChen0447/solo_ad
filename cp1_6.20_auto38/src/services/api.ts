import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

export interface User {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  galleriesCount: number;
  favoritesCount: number;
}

export interface Gallery {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  artworksCount: number;
  authorGalleriesCount?: number;
  isPublic: boolean;
  createdAt: string;
}

export interface Artwork {
  id: string;
  galleryId: string;
  title: string;
  artist: string;
  imageUrl: string;
  startingPrice: number;
  currentPrice: number;
  highestBidder: string | null;
  highestBidderName: string | null;
  isAuctioning: boolean;
  auctionEndTime: string | null;
  createdAt: string;
}

export interface Bid {
  id: string;
  artworkId: string;
  artworkTitle: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: string;
  isWinning: boolean;
}

export interface GalleryDetail extends Gallery {
  artworks: Artwork[];
}

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (username: string, password: string, nickname?: string) =>
    api.post('/auth/register', { username, password, nickname }),
  
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
};

export const galleryAPI = {
  getGalleries: () =>
    api.get<Gallery[]>('/galleries'),
  
  getGallery: (id: string) =>
    api.get<GalleryDetail>(`/galleries/${id}`),
  
  createGallery: (data: {
    title: string;
    description: string;
    coverImage: string;
    isPublic: boolean;
    artworks: Array<{
      title: string;
      artist: string;
      imageUrl: string;
      startingPrice: number;
    }>;
  }) =>
    api.post<GalleryDetail>('/galleries', data),
  
  updateGallery: (id: string, data: Partial<Gallery>) =>
    api.put<Gallery>(`/galleries/${id}`, data),
  
  deleteGallery: (id: string) =>
    api.delete(`/galleries/${id}`),
};

export const artworkAPI = {
  getArtwork: (id: string) =>
    api.get<Artwork>(`/artworks/${id}`),
  
  createArtwork: (data: {
    galleryId: string;
    title: string;
    artist: string;
    imageUrl: string;
    startingPrice: number;
  }) =>
    api.post<Artwork>('/artworks', data),
  
  startAuction: (id: string) =>
    api.post(`/artworks/${id}/start_auction`),
};

export const userAPI = {
  getProfile: () =>
    api.get<User>('/user/profile'),
  
  updateProfile: (data: { nickname?: string; avatar?: string }) =>
    api.put<User>('/user/profile', data),
  
  getMyGalleries: () =>
    api.get<Gallery[]>('/user/galleries'),
  
  getMyBids: () =>
    api.get<Bid[]>('/user/bids'),
};

export const auctionAPI = {
  getAuctions: () =>
    api.get<Artwork[]>('/auctions'),
  
  getHealth: () =>
    api.get('/health'),
};

export default api;
