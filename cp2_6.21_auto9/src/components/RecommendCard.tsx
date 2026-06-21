import type { Recommendation } from '../types';

interface RecommendCardProps {
  recommendations: Recommendation[];
  onAdd: (rec: Recommendation) => void;
}

function RecommendCard({ recommendations, onAdd }: RecommendCardProps) {
  return (
    <div className="recommend-card">
      <div className="recommend-header">
        <span className="recommend-icon">✨</span>
        <span className="recommend-title">为你推荐</span>
      </div>
      <div className="recommend-list">
        {recommendations.map(rec => (
          <div
            key={rec.drinkId}
            className="recommend-item"
            onClick={() => onAdd(rec)}
          >
            <div className="recommend-icon-large">{rec.icon}</div>
            <div className="recommend-info">
              <div className="recommend-name">{rec.drinkName}</div>
              <div className="recommend-reason">{rec.reason}</div>
            </div>
            <div className="recommend-price">¥{rec.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecommendCard;
