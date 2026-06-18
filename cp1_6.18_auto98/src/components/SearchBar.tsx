import React, { useMemo } from 'react'
import { useStore } from '../store'

export const SearchBar: React.FC = () => {
  const searchKeyword = useStore((state) => state.searchKeyword)
  const filterTags = useStore((state) => state.filterTags)
  const setSearch = useStore((state) => state.setSearch)
  const toggleFilterTag = useStore((state) => state.toggleFilterTag)
  const clearFilters = useStore((state) => state.clearFilters)
  const getAllTags = useStore((state) => state.getAllTags)

  const allTags = useMemo(() => getAllTags(), [getAllTags])

  const hasActiveFilters = searchKeyword.trim() !== '' || filterTags.length > 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <style>{`
        @keyframes tagPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

      <div
        style={{
          position: 'relative',
        }}
      >
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索灵感..."
          style={{
            width: '100%',
            padding: '12px 16px 12px 42px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: '#fff',
            fontSize: '14px',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.target.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)'
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}
        />
        <span
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '16px',
            opacity: 0.4,
          }}
        >
          🔍
        </span>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#555',
              margin: 0,
            }}
          >
            标签云
          </h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                fontSize: '12px',
                color: '#999',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#666'
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#999'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              清除筛选
            </button>
          )}
        </div>

        {allTags.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {allTags.map(({ tag, color, count }) => {
              const isActive = filterTags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleFilterTag(tag)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: isActive ? '2px solid #555' : '2px solid transparent',
                    backgroundColor: isActive ? color : color,
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    color: '#555',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    opacity: filterTags.length > 0 && !isActive ? 0.5 : 1,
                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = isActive
                      ? 'scale(1.05)'
                      : 'scale(1.08)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = isActive
                      ? 'scale(1.05)'
                      : 'scale(1)'
                  }}
                >
                  {tag}
                  <span
                    style={{
                      marginLeft: '6px',
                      fontSize: '11px',
                      opacity: 0.7,
                    }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div
            style={{
              fontSize: '13px',
              color: '#bbb',
              textAlign: 'center',
              padding: '20px 0',
            }}
          >
            暂无标签
          </div>
        )}
      </div>

      {hasActiveFilters && (
        <div
          style={{
            fontSize: '12px',
            color: '#999',
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderRadius: '8px',
          }}
        >
          已筛选 {useStore.getState().getFilteredCards().length} 张卡片
        </div>
      )}
    </div>
  )
}
