import { useMemo, useState, useEffect, useCallback } from 'react'
import type { Activity } from '../types'
import ActivityCard from './ActivityCard'
import { debounce } from '../utils'

interface ActivityListProps {
  activities: Activity[]
  searchQuery?: string
  newActivityId?: string | null
}

const ActivityList = ({ activities, searchQuery = '', newActivityId = null }: ActivityListProps) => {
  const [filter, setFilter] = useState(searchQuery)
  const [visibleActivities, setVisibleActivities] = useState<Activity[]>(activities)
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set())

  const debouncedFilter = useCallback(
    debounce((value: string) => {
      setFilter(value)
    }, 300),
    []
  )

  useEffect(() => {
    debouncedFilter(searchQuery)
    return () => {
      debouncedFilter.cancel()
    }
  }, [searchQuery, debouncedFilter])

  const filteredActivities = useMemo(() => {
    if (!filter.trim()) return activities
    const query = filter.toLowerCase()
    return activities.filter(
      a =>
        a.title.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query) ||
        a.location.toLowerCase().includes(query) ||
        a.type.toLowerCase().includes(query)
    )
  }, [activities, filter])

  useEffect(() => {
    const currentIds = new Set(filteredActivities.map(a => a.id))
    const previousIds = new Set(visibleActivities.map(a => a.id))
    
    const enteringIds = new Set([...currentIds].filter(id => !previousIds.has(id)))
    if (enteringIds.size > 0) {
      setAnimatingIds(enteringIds)
      setTimeout(() => setAnimatingIds(new Set()), 200)
    }
    
    setVisibleActivities(filteredActivities)
  }, [filteredActivities])

  if (activities.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🎉</div>
        <p>还没有活动，快来创建第一个吧！</p>
      </div>
    )
  }

  if (filteredActivities.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <p>没有找到匹配的活动，试试其他关键词吧</p>
      </div>
    )
  }

  return (
    <div className="activity-grid">
      {filteredActivities.map((activity) => (
        <div
          key={activity.id}
          className={animatingIds.has(activity.id) ? 'card-fade-enter card-fade-enter-active' : ''}
        >
          <ActivityCard
            activity={activity}
            isNew={newActivityId === activity.id}
          />
        </div>
      ))}
    </div>
  )
}

export default ActivityList
