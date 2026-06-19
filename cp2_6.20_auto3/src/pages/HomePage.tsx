import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../App'
import ActivityList from '../components/ActivityList'

const HomePage = () => {
  const { state } = useAppContext()
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🎉 发现有趣的活动</h1>
        <div className="header-actions">
          <div className="search-box">
            <input
              type="text"
              className="input"
              placeholder="🔍 搜索活动标题、描述、地点..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Link to="/create" className="btn btn-primary">
            <span>＋</span>
            创建活动
          </Link>
        </div>
      </div>

      {state.loading ? (
        <div className="loading">
          <div className="spinner" />
        </div>
      ) : (
        <ActivityList
          activities={state.activities}
          searchQuery={searchQuery}
        />
      )}
    </div>
  )
}

export default HomePage
