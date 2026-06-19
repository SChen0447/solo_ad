export default function SkeletonCard() {
  return (
    <div className="recipe-card skeleton-card" aria-hidden="true">
      <div className="card-cover skeleton-cover">
        <div className="skeleton-shimmer" />
      </div>
      <div className="card-body">
        <div className="skeleton-line title-line skeleton-shimmer" />
        <div className="skeleton-line meta-line skeleton-shimmer" />
        <div className="skeleton-line meta-short skeleton-shimmer" />
      </div>
    </div>
  );
}
