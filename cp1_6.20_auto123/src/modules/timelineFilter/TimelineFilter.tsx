import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Photo, FilterState } from '../../types';
import { getMonthColor } from '../../utils';

interface Props {
  photos: Photo[];
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function TimelineFilter({ photos, filter, onFilterChange }: Props) {
  const [tagInput, setTagInput] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);

  const monthCounts = useMemo(() => {
    const counts = new Map<number, number>();
    photos.forEach((p) => {
      const m = new Date(p.capturedAt).getMonth() + 1;
      counts.set(m, (counts.get(m) || 0) + 1);
    });
    return counts;
  }, [photos]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    photos.forEach((p) => p.tags.forEach((t) => s.add(t)));
    return Array.from(s);
  }, [photos]);

  const matchedTags = useMemo(() => {
    if (!tagInput.trim()) return [];
    const q = tagInput.toLowerCase();
    return allTags.filter((t) => t.toLowerCase().includes(q)).slice(0, 10);
  }, [tagInput, allTags]);

  const handleMonthClick = (month: number) => {
    onFilterChange({
      ...filter,
      month: filter.month === month ? null : month,
    });
  };

  return (
    <div className="timeline-filter">
      <div className="filter-tag-section">
        <input
          type="text"
          className="tag-input"
          placeholder="搜索标签..."
          value={tagInput}
          onChange={(e) => {
            setTagInput(e.target.value);
            onFilterChange({ ...filter, tag: e.target.value });
          }}
          onFocus={() => setShowAllTags(true)}
          onBlur={() => setTimeout(() => setShowAllTags(false), 200)}
        />
        {showAllTags && matchedTags.length > 0 && (
          <div className="tag-suggestions">
            {matchedTags.map((t) => (
              <div
                key={t}
                className="tag-suggestion"
                onMouseDown={() => {
                  setTagInput(t);
                  onFilterChange({ ...filter, tag: t });
                }}
              >
                {t}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="timeline">
        {MONTHS.map((m, i) => {
          const count = monthCounts.get(m) || 0;
          const hasPhotos = count > 0;
          const isSelected = filter.month === m;
          return (
            <motion.div
              key={m}
              className="timeline-item"
              onClick={() => handleMonthClick(m)}
              whileHover={{ scale: hasPhotos ? 1.15 : 1 }}
              title={`${MONTH_LABELS[i]} (${count}张)`}
            >
              <div
                className={`timeline-dot ${isSelected ? 'selected' : ''}`}
                style={{
                  background: hasPhotos
                    ? isSelected
                      ? '#1976d2'
                      : getMonthColor(m)
                    : '#cccccc',
                  borderColor: isSelected ? '#fff' : 'transparent',
                }}
              />
              <span className="timeline-label">{MONTH_LABELS[i]}</span>
              {hasPhotos && (
                <span className="timeline-count">{count}</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
