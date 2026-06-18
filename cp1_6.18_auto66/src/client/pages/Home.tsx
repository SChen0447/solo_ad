import { useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/ProductCard';
import { SkeletonList } from '../components/Skeleton';

const categories = [
  { value: 'all', label: '全部', icon: '📦' },
  { value: 'ebook', label: '电子书', icon: '📚' },
  { value: 'course', label: '课程码', icon: '🎓' },
  { value: 'software', label: '软件激活码', icon: '💻' },
  { value: 'other', label: '其他', icon: '🔮' }
];

export const Home = () => {
  const {
    products,
    loading,
    category,
    minPrice,
    maxPrice,
    total,
    page,
    totalPages,
    searchKeyword,
    searchProducts,
    loadMore,
    handleFilterChange
  } = useProducts();

  useEffect(() => {
    searchProducts({ page: 1 });
  }, [searchProducts]);

  const handleCategoryClick = useCallback((cat: string) => {
    handleFilterChange({ category: cat });
  }, [handleFilterChange]);

  const handlePriceFilter = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const min = formData.get('minPrice') as string;
    const max = formData.get('maxPrice') as string;
    handleFilterChange({
      minPrice: min ? parseFloat(min) : null,
      maxPrice: max ? parseFloat(max) : null
    });
  }, [handleFilterChange]);

  const handleLoadMore = useCallback(() => {
    loadMore();
  }, [loadMore]);

  return (
    <>
      <Helmet>
        <title>首页 - 虚拟商品二手交易平台</title>
      </Helmet>

      <div className="home-page">
        <div className="hero-section">
          <h1>发现优质虚拟商品</h1>
          <p>电子书、课程码、软件激活码，安全交易，放心购买</p>
        </div>

        <div className="filter-section">
          <div className="category-tabs">
            {categories.map((cat) => (
              <button
                key={cat.value}
                className={`category-tab ${category === cat.value ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.value)}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          <form className="price-filter" onSubmit={handlePriceFilter}>
            <div className="price-inputs">
              <input
                type="number"
                name="minPrice"
                placeholder="最低价"
                defaultValue={minPrice || ''}
                min="0"
              />
              <span className="price-separator">-</span>
              <input
                type="number"
                name="maxPrice"
                placeholder="最高价"
                defaultValue={maxPrice || ''}
                min="0"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">筛选</button>
          </form>
        </div>

        {searchKeyword && (
          <div className="search-result-info">
            搜索 "<span className="search-keyword">{searchKeyword}</span>" 共找到 {total} 个结果
          </div>
        )}

        {loading && products.length === 0 ? (
          <SkeletonList count={8} />
        ) : (
          <>
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {products.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>没有找到相关商品</h3>
                <p>试试其他关键词或筛选条件</p>
              </div>
            )}

            {loading && products.length > 0 && <SkeletonList count={4} />}

            {page < totalPages && !loading && (
              <div className="load-more-container">
                <button className="btn btn-outline" onClick={handleLoadMore}>
                  加载更多
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
