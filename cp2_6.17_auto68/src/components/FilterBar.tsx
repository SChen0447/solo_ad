interface FilterBarProps {
  tags: string[];
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
}

function getTagColor(index: number, total: number): string {
  const t = total <= 1 ? 0 : index / (total - 1);
  const r1 = 108, g1 = 99, b1 = 255;
  const r2 = 224, g2 = 64, b2 = 251;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

export default function FilterBar({ tags, selectedTag, onTagSelect }: FilterBarProps) {
  if (tags.length === 0) return null;

  return (
    <div className="filter-bar">
      {tags.map((tag, i) => {
        const isSelected = selectedTag === tag;
        const color = getTagColor(i, tags.length);
        return (
          <button
            key={tag}
            className={`filter-tag ${isSelected ? 'filter-tag-active' : ''}`}
            style={{
              backgroundColor: color,
              opacity: isSelected ? 1 : 0.6,
              border: isSelected ? '1px solid white' : '1px solid transparent',
            }}
            onClick={() => onTagSelect(isSelected ? null : tag)}
          >
            {tag}
          </button>
        );
      })}
      {selectedTag && (
        <button
          className="filter-clear"
          onClick={() => onTagSelect(null)}
        >
          清除过滤
        </button>
      )}
    </div>
  );
}
