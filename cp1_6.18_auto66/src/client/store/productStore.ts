import { create } from 'zustand';
import { Product, ProductListResponse } from '../types';
import { ProductService } from '../modules/product/ProductService';

interface ProductState {
  products: Product[];
  myProducts: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  loading: boolean;
  searchKeyword: string;
  category: string;
  minPrice: number | null;
  maxPrice: number | null;
  searchProducts: (params?: {
    keyword?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
  }) => Promise<void>;
  loadMore: () => Promise<void>;
  fetchMyProducts: () => Promise<void>;
  setSearchKeyword: (keyword: string) => void;
  setFilters: (filters: {
    category?: string;
    minPrice?: number | null;
    maxPrice?: number | null;
  }) => void;
  resetSearch: () => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  myProducts: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  loading: false,
  searchKeyword: '',
  category: 'all',
  minPrice: null,
  maxPrice: null,

  searchProducts: async (params) => {
    set({ loading: true });
    try {
      const currentState = get();
      const response: ProductListResponse = await ProductService.searchProducts({
        keyword: params?.keyword !== undefined ? params.keyword : currentState.searchKeyword,
        category: params?.category !== undefined ? params.category : currentState.category,
        minPrice: params?.minPrice !== undefined ? params.minPrice : currentState.minPrice ?? undefined,
        maxPrice: params?.maxPrice !== undefined ? params.maxPrice : currentState.maxPrice ?? undefined,
        page: params?.page || 1,
        limit: currentState.limit
      });

      set({
        products: response.products,
        total: response.total,
        page: response.page,
        totalPages: response.totalPages,
        searchKeyword: params?.keyword !== undefined ? params.keyword : currentState.searchKeyword,
        category: params?.category !== undefined ? params.category : currentState.category,
        minPrice: params?.minPrice !== undefined ? params.minPrice : currentState.minPrice,
        maxPrice: params?.maxPrice !== undefined ? params.maxPrice : currentState.maxPrice,
        loading: false
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  loadMore: async () => {
    const state = get();
    if (state.page >= state.totalPages || state.loading) return;

    set({ loading: true });
    try {
      const nextPage = state.page + 1;
      const response = await ProductService.searchProducts({
        keyword: state.searchKeyword,
        category: state.category,
        minPrice: state.minPrice ?? undefined,
        maxPrice: state.maxPrice ?? undefined,
        page: nextPage,
        limit: state.limit
      });

      set({
        products: [...state.products, ...response.products],
        page: nextPage,
        loading: false
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  fetchMyProducts: async () => {
    set({ loading: true });
    try {
      const products = await ProductService.getMyProducts();
      set({
        myProducts: products,
        loading: false
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  setSearchKeyword: (keyword: string) => {
    set({ searchKeyword: keyword });
  },

  setFilters: (filters) => {
    set((state) => ({
      ...state,
      ...filters
    }));
  },

  resetSearch: () => {
    set({
      searchKeyword: '',
      category: 'all',
      minPrice: null,
      maxPrice: null,
      page: 1,
      products: []
    });
  }
}));
