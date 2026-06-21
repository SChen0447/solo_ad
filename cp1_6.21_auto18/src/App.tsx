import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Problem, Stats } from './types'
import ProblemList from './components/ProblemList'
import PracticePage from './components/PracticePage'
import RecordsPage from './components/RecordsPage'

interface AppProps {
  username: string
}

type TabType = 'problems' | 'records'

const App: React.FC<AppProps> = ({ username }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<TabType>('problems')
  const [problems, setProblems] = useState<Problem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (location.pathname.startsWith('/practice')) {
      return
    }
    if (location.pathname === '/records') {
      setActiveTab('records')
    } else {
      setActiveTab('problems')
    }
  }, [location.pathname])

  useEffect(() => {
    fetchProblems()
    fetchStats()
  }, [refreshKey])

  const fetchProblems = async () => {
    try {
      const response = await fetch('/api/problems')
      const data = await response.json()
      setProblems(data)
    } catch (err) {
      console.error('获取题目列表失败:', err)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats')
      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('获取统计数据失败:', err)
    }
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    if (tab === 'problems') {
      navigate('/')
    } else {
      navigate('/records')
    }
  }

  const handleRunComplete = () => {
    setRefreshKey(prev => prev + 1)
  }

  const isPracticePage = location.pathname.startsWith('/practice')

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">💻 编程练习沙盒</div>
          {!isPracticePage && (
            <div className="nav-tabs">
              <button
                className={`nav-tab ${activeTab === 'problems' ? 'active' : ''}`}
                onClick={() => handleTabChange('problems')}
              >
                题目列表
              </button>
              <button
                className={`nav-tab ${activeTab === 'records' ? 'active' : ''}`}
                onClick={() => handleTabChange('records')}
              >
                练习记录
              </button>
            </div>
          )}
          <div className="navbar-user">👤 {username}</div>
        </div>
      </nav>

      <main className="container" style={{ paddingTop: '24px', paddingBottom: '40px' }}>
        <div className="page-transition" key={location.pathname}>
          <Routes>
            <Route
              path="/"
              element={
                <ProblemList
                  problems={problems}
                  stats={stats}
                  onSelectProblem={(id) => navigate(`/practice/${id}`)}
                />
              }
            />
            <Route
              path="/practice/:id"
              element={
                <PracticePage
                  problems={problems}
                  onBack={() => navigate('/')}
                  onRunComplete={handleRunComplete}
                />
              }
            />
            <Route
              path="/records"
              element={<RecordsPage problems={problems} />}
            />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App
