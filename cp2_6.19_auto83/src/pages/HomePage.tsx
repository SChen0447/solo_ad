import { useState, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, PlusCircle } from 'lucide-react'
import { useAppContext } from '@/App'
import ActivityCard from '@/components/ActivityCard'

export default function HomePage() {
  const { state } = useAppContext()
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isFiltering, setIsFiltering] = useState(false)

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchText(value)
    setIsFiltering(true)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value)
      setTimeout(() => setIsFiltering(false), 200)
    }, 300)
  }, [])

  const filteredActivities = useMemo(() => {
    if (!debouncedSearch.trim()) return state.activities
    const keyword = debouncedSearch.toLowerCase().trim()
    return state.activities.filter(
      a =>
        a.title.toLowerCase().includes(keyword) ||
        a.description.toLowerCase().includes(keyword)
    )
  }, [state.activities, debouncedSearch])

  return (
    <div className="container">
      <div className="home-header">
        <div className="home-header-left">
          <div className="search-bar">
            <span className="search-icon"><Search size={18} /></span>
            <input
              type="text"
              placeholder="搜索活动..."
              value={searchText}
              onChange={handleSearchChange}
            />
          </div>
        </div>
        <Link to="/create" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <PlusCircle size={18} />
          创建活动
        </Link>
      </div>
      <div className={`activity-grid ${isFiltering ? 'filter-fade' : ''}`}>
        {filteredActivities.map((activity, index) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            isNew={index === 0 && state.activities[0]?.id === activity.id && state.activities.length > 5}
          />
        ))}
      </div>
      {filteredActivities.length === 0 && !state.loading && (
        <div className="profile-empty" style={{ marginTop: '40px' }}>
          {debouncedSearch ? '没有找到匹配的活动' : '暂无活动，快去创建一个吧！'}
        </div>
      )}
    </div>
  )
}
