interface FilterSortBarProps {
  sort: 'newest' | 'oldest' | 'likes'
  onSortChange: (sort: 'newest' | 'oldest' | 'likes') => void
}

function FilterSortBar({ sort, onSortChange }: FilterSortBarProps) {
  return (
    <div className="sort-bar">
      <select
        className="sort-select"
        value={sort}
        onChange={(e) => onSortChange(e.target.value as 'newest' | 'oldest' | 'likes')}
      >
        <option value="newest">最新发布</option>
        <option value="oldest">最早发布</option>
        <option value="likes">最多点赞</option>
      </select>
    </div>
  )
}

export default FilterSortBar
