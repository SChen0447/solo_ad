import { useState } from 'react'

interface Task {
  id: string
  title: string
  description: string
  area: string
  type: string
  requiredPeople: number
  currentPeople: number
  deadline: string
  status: 'pending' | 'in_progress' | 'completed'
  progress: 'pending' | 'en_route' | 'arrived' | 'completed'
  volunteers: string[]
}

interface ChatMessage {
  id: string
  taskId: string
  userId: string
  userName: string
  avatar: string
  content: string
  type: 'text' | 'emoji'
  timestamp: number
}

interface TaskBoardProps {
  tasks: Task[]
  currentUserId: string
  onClaimTask: (taskId: string) => void
  onUpdateProgress: (taskId: string, progress: Task['progress']) => void
  onOpenChat: (taskId: string) => void
  getTaskMessages: (taskId: string) => ChatMessage[]
}

type FilterType = 'all' | 'available' | 'mine'

function TaskBoard({
  tasks,
  currentUserId,
  onClaimTask,
  onUpdateProgress,
  onOpenChat,
  getTaskMessages,
}: TaskBoardProps) {
  const [filter, setFilter] = useState<FilterType>('all')

  const areas = Array.from(new Set(tasks.map((t) => t.area)))

  const filteredTasks = (areaTasks: Task[]) => {
    switch (filter) {
      case 'available':
        return areaTasks.filter((t) => t.currentPeople < t.requiredPeople && t.status !== 'completed')
      case 'mine':
        return areaTasks.filter((t) => t.volunteers.includes(currentUserId))
      default:
        return areaTasks
    }
  }

  const getTaskTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      packing: '📦 物资打包',
      transport: '🚚 运输配送',
      distribution: '🎁 现场分发',
      patrol: '👮 巡逻检查',
    }
    return types[type] || type
  }

  const getProgressLabel = (progress: string) => {
    const labels: Record<string, string> = {
      pending: '⏳ 待出发',
      en_route: '🚶 在路上',
      arrived: '📍 已到达',
      completed: '✅ 已完成',
    }
    return labels[progress] || progress
  }

  const isFull = (task: Task) => task.currentPeople >= task.requiredPeople
  const isMine = (task: Task) => task.volunteers.includes(currentUserId)

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📋 任务板</h2>
        <div style={styles.filterBar}>
          <button
            style={{ ...styles.filterBtn, ...(filter === 'all' ? styles.filterBtnActive : {}) }}
            onClick={() => setFilter('all')}
          >
            全部
          </button>
          <button
            style={{ ...styles.filterBtn, ...(filter === 'available' ? styles.filterBtnActive : {}) }}
            onClick={() => setFilter('available')}
          >
            可领取
          </button>
          <button
            style={{ ...styles.filterBtn, ...(filter === 'mine' ? styles.filterBtnActive : {}) }}
            onClick={() => setFilter('mine')}
          >
            我的任务
          </button>
        </div>
      </div>

      <div style={styles.areasContainer} className="board-container">
        {areas.map((area) => {
          const areaTasks = filteredTasks(tasks.filter((t) => t.area === area))
          if (areaTasks.length === 0) return null

          return (
            <div key={area} style={styles.areaColumn}>
              <div style={styles.areaHeader}>
                <h3 style={styles.areaTitle}>{area}</h3>
                <span style={styles.areaCount}>{areaTasks.length} 个任务</span>
              </div>
              <div style={styles.taskList}>
                {areaTasks.map((task) => {
                  const taskMessages = getTaskMessages(task.id)
                  const full = isFull(task)
                  const mine = isMine(task)

                  return (
                    <div
                      key={task.id}
                      style={{
                        ...styles.taskCard,
                        ...(full ? styles.taskCardFull : {}),
                        ...(task.status === 'completed' ? styles.taskCardCompleted : {}),
                      }}
                      className="fade-in"
                    >
                      <div style={styles.taskHeader}>
                        <span style={styles.taskType}>{getTaskTypeLabel(task.type)}</span>
                        {task.status === 'completed' && (
                          <span style={styles.completedBadge}>已完成</span>
                        )}
                      </div>

                      <h4 style={{ ...styles.taskTitle, ...(full ? styles.taskTitleGray : {}) }}>
                        {task.title}
                      </h4>
                      <p style={styles.taskDesc}>{task.description}</p>

                      <div style={styles.taskMeta}>
                        <div style={styles.peopleInfo}>
                          <span style={styles.peopleIcon}>👥</span>
                          <span style={styles.peopleCount}>
                            <span style={{
                              ...styles.peopleCurrent,
                              color: full ? '#9B9B9B' : '#FF8C42',
                            }}>
                              {task.currentPeople}
                            </span>
                            /{task.requiredPeople}
                          </span>
                          {full && <span style={styles.fullTag}>已满</span>}
                        </div>
                        <div style={styles.deadlineInfo}>
                          <span style={styles.deadlineIcon}>⏰</span>
                          <span style={styles.deadlineText}>{task.deadline}</span>
                        </div>
                      </div>

                      {mine && task.status !== 'completed' && (
                        <div style={styles.progressSection}>
                          <span style={styles.progressLabel}>当前进度：</span>
                          <select
                            value={task.progress}
                            onChange={(e) => onUpdateProgress(task.id, e.target.value as Task['progress'])}
                            style={styles.progressSelect}
                          >
                            <option value="pending">⏳ 待出发</option>
                            <option value="en_route">🚶 在路上</option>
                            <option value="arrived">📍 已到达</option>
                            <option value="completed">✅ 已完成</option>
                          </select>
                        </div>
                      )}

                      {!mine && !full && task.status !== 'completed' && (
                        <button
                          style={styles.claimButton}
                          onClick={() => onClaimTask(task.id)}
                        >
                          领取任务
                        </button>
                      )}

                      {mine && (
                        <div style={styles.myTaskBadge}>
                          🌟 我已报名
                        </div>
                      )}

                      {taskMessages.length > 0 && (
                        <div
                          style={styles.chatPreview}
                          onClick={() => onOpenChat(task.id)}
                        >
                          <span style={styles.chatIcon}>💬</span>
                          <div style={styles.chatPreviewMessages}>
                            {taskMessages.slice(0, 3).reverse().map((msg) => (
                              <div key={msg.id} style={styles.chatBubblePreview}>
                                <span style={styles.chatBubbleAvatar}>{msg.avatar}</span>
                                <span style={styles.chatBubbleText}>
                                  {msg.content.length > 15 ? msg.content.slice(0, 15) + '...' : msg.content}
                                </span>
                              </div>
                            ))}
                          </div>
                          <span style={styles.chatExpand}>展开</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#3D3D3D',
  },
  filterBar: {
    display: 'flex',
    gap: '8px',
    background: 'rgba(255,255,255,0.5)',
    padding: '4px',
    borderRadius: '12px',
  },
  filterBtn: {
    padding: '8px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 500,
    background: 'transparent',
    color: '#6B6B6B',
  },
  filterBtnActive: {
    background: 'linear-gradient(135deg, #FF8C42 0%, #FFB07C 100%)',
    color: '#fff',
    boxShadow: '0 2px 8px rgba(255,140,66,0.3)',
  },
  areasContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    alignItems: 'start',
  },
  areaColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  areaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 4px',
  },
  areaTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#3D3D3D',
  },
  areaCount: {
    fontSize: '12px',
    color: '#9B9B9B',
    background: 'rgba(255,255,255,0.6)',
    padding: '4px 10px',
    borderRadius: '12px',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  taskCard: {
    background: 'rgba(255,248,240,0.85)',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid rgba(255,140,66,0.2)',
    boxShadow: '0 2px 8px rgba(255,140,66,0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
  },
  taskCardFull: {
    opacity: 0.7,
    background: 'rgba(245,245,245,0.8)',
  },
  taskCardCompleted: {
    opacity: 0.6,
    background: 'rgba(200,230,200,0.5)',
  },
  taskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  taskType: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#FF8C42',
    background: 'rgba(255,140,66,0.1)',
    padding: '4px 10px',
    borderRadius: '8px',
  },
  completedBadge: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#4CAF50',
    background: 'rgba(76,175,80,0.1)',
    padding: '4px 10px',
    borderRadius: '8px',
  },
  taskTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#3D3D3D',
    marginBottom: '6px',
  },
  taskTitleGray: {
    color: '#9B9B9B',
  },
  taskDesc: {
    fontSize: '13px',
    color: '#6B6B6B',
    marginBottom: '12px',
    lineHeight: 1.5,
  },
  taskMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  peopleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  peopleIcon: {
    fontSize: '14px',
  },
  peopleCount: {
    fontSize: '13px',
    color: '#6B6B6B',
    fontWeight: 500,
  },
  peopleCurrent: {
    fontWeight: 600,
  },
  fullTag: {
    fontSize: '11px',
    color: '#9B9B9B',
    background: 'rgba(155,155,155,0.2)',
    padding: '2px 8px',
    borderRadius: '6px',
    marginLeft: '4px',
  },
  deadlineInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  deadlineIcon: {
    fontSize: '12px',
  },
  deadlineText: {
    fontSize: '12px',
    color: '#9B9B9B',
  },
  progressSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
    padding: '8px 12px',
    background: 'rgba(255,140,66,0.08)',
    borderRadius: '10px',
  },
  progressLabel: {
    fontSize: '12px',
    color: '#6B6B6B',
  },
  progressSelect: {
    flex: 1,
    padding: '6px 10px',
    border: '1px solid rgba(255,140,66,0.2)',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#3D3D3D',
    background: '#fff',
    cursor: 'pointer',
  },
  claimButton: {
    width: '100%',
    padding: '10px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #FF8C42 0%, #FFB07C 100%)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(255,140,66,0.3)',
  },
  myTaskBadge: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#FF8C42',
    fontWeight: 500,
    padding: '6px',
    background: 'rgba(255,140,66,0.1)',
    borderRadius: '8px',
    marginTop: '8px',
  },
  chatPreview: {
    marginTop: '12px',
    padding: '10px 12px',
    background: 'rgba(255,209,102,0.15)',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  chatIcon: {
    fontSize: '16px',
  },
  chatPreviewMessages: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  chatBubblePreview: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#6B6B6B',
  },
  chatBubbleAvatar: {
    fontSize: '14px',
  },
  chatBubbleText: {
    fontSize: '12px',
    color: '#6B6B6B',
  },
  chatExpand: {
    fontSize: '11px',
    color: '#FF8C42',
    fontWeight: 500,
  },
}

export default TaskBoard
