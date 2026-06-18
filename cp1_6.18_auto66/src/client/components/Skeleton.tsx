export const ProductSkeleton = () => {
  return (
    <div className="product-card skeleton">
      <div className="skeleton-image"></div>
      <div className="product-card-content">
        <div className="skeleton-line skeleton-title"></div>
        <div className="skeleton-line skeleton-short"></div>
        <div className="skeleton-line skeleton-short"></div>
        <div className="product-card-footer">
          <div className="skeleton-line skeleton-price"></div>
          <div className="skeleton-line skeleton-btn"></div>
        </div>
      </div>
    </div>
  );
};

export const SkeletonList = ({ count = 8 }: { count?: number }) => {
  return (
    <div className="products-grid">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
};
