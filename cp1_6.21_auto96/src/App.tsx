import { useState, useEffect, useCallback } from 'react'
import PlantManager from './modules/plantManager'
import TaskManager from './modules/taskManager'
import { setLastSyncTime, shouldRefresh } from './utils/localStorage'
import { getSpeciesEmoji } from './constants'
import type { Plant, Task, TasksResponse, SortOrder } from './types'

type ViewType = 'home' | 'tasks' | 'detail'

export default function App() {
  const [plants, setPlants] = useState<Plant[]>([])
  const [tasks, setTasks] = useState<TasksResponse>({ today: [], future: [], history: [] })
  const [currentView, setCurrentView] = useState<ViewType>('home')
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const [plantTasks, setPlantTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [isLoading, setIsLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const fetchPlants = useCallback(async () => {
    try {
      const response = await fetch('/api/plants')
      const data = await response.json()
      setPlants(data)
    } catch (error) {
      console.error('Failed to fetch plants:', error)
    }
  }, [])

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks')
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    }
  }, [])

  const fetchPlantTasks = useCallback(async (plantId: string) => {
    try {
      const response = await fetch(`/api/plants/${plantId}/tasks`)
      const data = await response.json()
      setPlantTasks(data)
    } catch (error) {
      console.error('Failed to fetch plant tasks:', error)
    }
  }, [])

  const refreshData = useCallback(async () => {
    setIsLoading(true)
    if (shouldRefresh() || refreshTrigger > 0) {
      await Promise.all([fetchPlants(), fetchTasks()])
      setLastSyncTime()
    } else {
      await fetchPlants()
      await fetchTasks()
    }
    setIsLoading(false)
  }, [fetchPlants, fetchTasks, refreshTrigger])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  useEffect(() => {
    if (selectedPlant) {
      fetchPlantTasks(selectedPlant.id)
    }
  }, [selectedPlant, fetchPlantTasks, refreshTrigger])

  const handlePlantClick = (plant: Plant) => {
    setSelectedPlant(plant)
    setCurrentView('detail')
  }

  const handleBack = () => {
    setSelectedPlant(null)
    setCurrentView('home')
  }

  const handleDataChange = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const getSpeciesList = () => {
    const speciesSet = new Set(plants.map(p => p.species))
    return Array.from(speciesSet)
  }

  const filteredAndSortedPlants = () => {
    let result = [...plants]
    
    if (filter !== 'all') {
      result = result.filter(p => p.species === filter)
    }
    
    result.sort((a, b) => {
      const daysA = a.nextCareDays ?? Infinity
      const daysB = b.nextCareDays ?? Infinity
      return sortOrder === 'asc' ? daysA - daysB : daysB - daysA
    })
    
    return result
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🌱 家庭植物养护助手</h1>
        <nav className="app-nav">
          <button
            className={`nav-btn ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentView('home')}
          >
            我的植物
          </button>
          <button
            className={`nav-btn ${currentView === 'tasks' ? 'active' : ''}`}
            onClick={() => setCurrentView('tasks')}
          >
            护理任务
          </button>
        </nav>
      </header>

      <main className="app-main">
        {isLoading ? (
          <div className="loading">加载中...</div>
        ) : currentView === 'home' ? (
          <div className="plants-view">
            <PlantManager
              plants={filteredAndSortedPlants()}
              onPlantClick={handlePlantClick}
              onDataChange={handleDataChange}
              filter={filter}
              sortOrder={sortOrder}
              onFilterChange={setFilter}
              onSortOrderChange={setSortOrder}
              speciesList={getSpeciesList()}
            />
          </div>
        ) : currentView === 'tasks' ? (
          <TaskManager
            tasks={tasks}
            plants={plants}
            onDataChange={handleDataChange}
          />
        ) : currentView === 'detail' && selectedPlant ? (
          <div className="detail-view">
            <button className="back-btn" onClick={handleBack}>
              ← 返回列表
            </button>
            <div className="plant-detail">
              <div className="plant-detail-header">
                <span className="plant-emoji-large">
                  {getSpeciesEmoji(selectedPlant.species)}
                </span>
                <div>
                  <h2>{selectedPlant.name}</h2>
                  <p className="plant-species">{selectedPlant.species}</p>
                </div>
              </div>
              
              <div className="plant-info-grid">
                <div className="info-card">
                  <span className="info-label">浇水频率</span>
                  <span className="info-value">每 {selectedPlant.waterFrequency} 天</span>
                </div>
                <div className="info-card">
                  <span className="info-label">施肥频率</span>
                  <span className="info-value">每 {selectedPlant.fertilizeFrequency} 天</span>
                </div>
                {selectedPlant.repotDate && (
                  <div className="info-card">
                    <span className="info-label">下次换盆</span>
                    <span className="info-value">{selectedPlant.repotDate}</span>
                  </div>
                )}
              </div>

              <h3 className="timeline-title">护理历史记录</h3>
              <div className="timeline">
                {plantTasks.length === 0 ? (
                  <p className="empty-message">暂无护理记录</p>
                ) : (
                  plantTasks.map((task, index) => (
                    <div key={task.id} className="timeline-item" style={{ animationDelay: `${index * 100}ms` }}>
                      <div className={`timeline-marker ${task.completed ? 'completed' : 'pending'}`} />
                      <div className="timeline-content">
                        <div className="timeline-date">{task.date}</div>
                        <div className="timeline-type">
                          {task.typeLabel}
                          {task.completed ? (
                            <span className="status-badge completed">已完成</span>
                          ) : (
                            <span className="status-badge pending">待完成</span>
                          )}
                        </div>
                        {task.note && <div className="timeline-note">备注：{task.note}</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
