export default function SkeletonCard() {
  return (
    <div className="recipe-card skeleton-card">
      <div className="card-cover">
        <div className="skeleton-shimmer" />
      </div>
      <div className="card-body">
        <div className="skeleton-line title-line" />
        <div className="skeleton-line meta-line" />
        <div className="skeleton-line meta-short" />
      </div>
    </div>
  );
}
