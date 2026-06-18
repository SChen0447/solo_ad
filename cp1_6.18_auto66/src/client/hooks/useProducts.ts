import { useEffect, useCallback, useRef } from 'react';
import { useProductStore } from '../store/productStore';

export const useProducts = () => {
  const {
    products,
    myProducts,
    total,
    page,
    limit,
    totalPages,
    loading,
    searchKeyword,
    category,
    minPrice,
    maxPrice,
    searchProducts,
    loadMore,
    fetchMyProducts,
    setSearchKeyword,
    setFilters,
    resetSearch
  } = useProductStore();

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchProducts({ keyword, page: 1 });
    }, 500);
  }, [searchProducts, setSearchKeyword]);

  const handleFilterChange = useCallback((filters: {
    category?: string;
    minPrice?: number | null;
    maxPrice?: number | null;
  }) => {
    setFilters(filters);
    searchProducts({ ...filters, page: 1 });
  }, [searchProducts, setFilters]);

  const refresh = useCallback(() => {
    searchProducts({ page: 1 });
  }, [searchProducts]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    products,
    myProducts,
    total,
    page,
    limit,
    totalPages,
    loading,
    searchKeyword,
    category,
    minPrice,
    maxPrice,
    searchProducts,
    loadMore,
    fetchMyProducts,
    debouncedSearch,
    handleFilterChange,
    refresh,
    resetSearch
  };
};
