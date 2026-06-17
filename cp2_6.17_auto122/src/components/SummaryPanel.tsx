import { useMemo } from 'react';
import type { Review, ReviewRating } from '../types';

interface SummaryPanelProps {
  reviews: Review[];
}

const RATING_LABEL: Record<ReviewRating, string> = {
  pass: '通过',
  fail: '不通过',
  needs_review: '需修改',
};

const RATING_COLOR: Record<ReviewRating, string> = {
  pass: '#28a745',
  fail: '#dc3545',
  needs_review: '#ffc107',
};

type StatKey = ReviewRating;
const STAT_KEYS: StatKey[] = ['pass', 'fail', 'needs_review'];

function SummaryPanel({ reviews }: SummaryPanelProps) {
  const stats = useMemo(() => {
    const result: Record<StatKey, number> = { pass: 0, fail: 0, needs_review: 0 };
    for (const r of reviews) {
      result[r.rating] = (result[r.rating] || 0) + 1;
    }
    return result;
  }, [reviews]);

  const maxCount = useMemo(
    () => Math.max(...STAT_KEYS.map(k => stats[k]), 1),
    [stats]
  );

  const sortedReviews = useMemo(
    () => [...reviews].sort((a, b) => a.lineNumber - b.lineNumber),
    [reviews]
  );

  return (
    <div className="summary-panel">
      <h3 className="summary-title">评审汇总</h3>

      <div className="review-list">
        {sortedReviews.length === 0 && (
          <div className="review-empty">暂无评审记录</div>
        )}
        {sortedReviews.map(review => (
          <div key={review.id} className="review-item">
            <span
              className="review-item-dot"
              style={{ backgroundColor: RATING_COLOR[review.rating] }}
            />
            <span className="review-item-line">行号{review.lineNumber}：</span>
            <span className="review-item-comment">
              {review.comment || RATING_LABEL[review.rating]}
            </span>
          </div>
        ))}
      </div>

      <div className="chart-section">
        <h4 className="chart-title">评审统计</h4>
        <div className="bar-chart">
          {STAT_KEYS.map(key => (
            <div key={key} className="bar-row">
              <span className="bar-label">{RATING_LABEL[key]}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${(stats[key] / maxCount) * 100}%`,
                    backgroundColor: RATING_COLOR[key],
                  }}
                />
              </div>
              <span className="bar-value">{stats[key]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SummaryPanel;
