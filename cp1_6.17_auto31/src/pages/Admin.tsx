import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  TrophyOutlined,
  UserOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
  DashboardOutlined,
  GiftOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import {
  adminApi,
  activityApi,
  initSocket,
  disconnectSocket,
  WinRecord,
  Prize,
  Participant
} from '../services/api'

const Admin = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activity, setActivity] = useState<{
    id: string
    name: string
    code: string
    prizes: Prize[]
    maxDraws: number
    duration: number
    isActive: boolean
    shareUrl: string
  } | null>(null)
  const [records, setRecords] = useState<WinRecord[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [prizeFilter, setPrizeFilter] = useState('')
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    if (!id) return
    loadData()
    initAdminSocket()
    return () => disconnectSocket()
  }, [id])

  const initAdminSocket = () => {
    if (!id) return
    const socket = initSocket(id, 'admin')
    socket.emit('admin_connect', { activityId: id })

    socket.on('new_win', (data: { record: WinRecord }) => {
      setRecords(prev => [data.record, ...prev])
    })

    socket.on('participant_joined', () => {
      loadParticipants()
    })
  }

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [activityRes, recordsRes, participantsRes] = await Promise.all([
        activityApi.getByAdmin(id),
        adminApi.getRecords(id),
        adminApi.getParticipants(id)
      ])
      setActivity(activityRes.data)
      setRecords(recordsRes.data)
      setParticipants(participantsRes.data)
    } catch (err) {
      console.error(err)
      alert('加载失败，请刷新重试')
    } finally {
      setLoading(false)
    }
  }

  const loadParticipants = async () => {
    if (!id) return
    try {
      const res = await adminApi.getParticipants(id)
      setParticipants(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadRecords = useCallback(async () => {
    if (!id) return
    try {
      const res = await adminApi.getRecords(id, prizeFilter, searchText)
      setRecords(res.data)
    } catch (err) {
      console.error(err)
    }
  }, [id, prizeFilter, searchText])

  useEffect(() => {
    loadRecords()
  }, [prizeFilter, searchText, loadRecords])

  const toggleStatus = async () => {
    if (!activity || toggling) return
    setToggling(true)
    try {
      const res = await activityApi.toggleStatus(activity.id, !activity.isActive)
      setActivity(res.data)
    } catch (err) {
      console.error(err)
      alert('操作失败')
    } finally {
      setToggling(false)
    }
  }

  const copyShareUrl = async () => {
    if (!activity) return
    try {
      const url = window.location.origin + activity.shareUrl
      await navigator.clipboard.writeText(url)
      alert('分享链接已复制')
    } catch {
      alert('复制失败')
    }
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <LoadingOutlined style={{ fontSize: 40, color: '#e94560' }} />
        <p style={{ marginTop: 16, color: '#94a3b8' }}>加载中...</p>
      </div>
    )
  }

  if (!activity) {
    return (
      <div style={styles.container}>
        <p>活动不存在</p>
      </div>
    )
  }

  const totalWins = records.length
  const totalParticipants = participants.length

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>
          <ArrowLeftOutlined />
        </button>
        <h1 style={styles.title}>
          <DashboardOutlined style={{ marginRight: 10 }} />
          管理后台
        </h1>
        <div style={{ width: 40 }} />
      </div>

      <div style={styles.activityInfo}>
        <h2 style={styles.activityName}>{activity.name}</h2>
        <p style={styles.activityCode}>活动码: {activity.code}</p>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <UserOutlined style={styles.statIcon} />
          <div style={styles.statContent}>
            <span style={styles.statValue}>{totalParticipants}</span>
            <span style={styles.statLabel}>参与人数</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <GiftOutlined style={{ ...styles.statIcon, color: '#ffd700' }} />
          <div style={styles.statContent}>
            <span style={styles.statValue}>{totalWins}</span>
            <span style={styles.statLabel}>中奖次数</span>
          </div>
        </div>
      </div>

      <div style={styles.controlCard}>
        <div style={styles.controlRow}>
          <div>
            <span style={styles.controlLabel}>抽奖状态</span>
            <span style={{
              ...styles.statusBadge,
              background: activity.isActive ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)',
              color: activity.isActive ? '#4ade80' : '#f87171'
            }}>
              {activity.isActive ? '进行中' : '已暂停'}
            </span>
          </div>
          <button
            style={{
              ...styles.controlBtn,
              background: activity.isActive
                ? 'linear-gradient(135deg, #f87171, #ef4444)'
                : 'linear-gradient(135deg, #4ade80, #22c55e)',
              opacity: toggling ? 0.7 : 1
            }}
            onClick={toggleStatus}
            disabled={toggling}
          >
            {activity.isActive ? <PauseCircleOutlined style={{ marginRight: 6 }} /> : <PlayCircleOutlined style={{ marginRight: 6 }} />}
            {activity.isActive ? '暂停抽奖' : '开启抽奖'}
          </button>
        </div>

        <div style={styles.shareRow}>
          <span style={styles.controlLabel}>分享链接</span>
          <button style={styles.copyBtn} onClick={copyShareUrl}>
            复制链接
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <TrophyOutlined style={{ marginRight: 8, color: '#ffd700' }} />
          中奖记录
        </h3>

        <div style={styles.filterRow}>
          <div style={styles.searchBox}>
            <SearchOutlined style={styles.searchIcon} />
            <input
              type="text"
              style={styles.searchInput}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="搜索参与者"
            />
          </div>
          <select
            style={styles.filterSelect}
            value={prizeFilter}
            onChange={e => setPrizeFilter(e.target.value)}
          >
            <option value="">全部奖项</option>
            {activity.prizes.map(prize => (
              <option key={prize.id} value={prize.id}>
                {prize.name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.recordList}>
          {records.length === 0 ? (
            <p style={styles.emptyText}>暂无中奖记录</p>
          ) : (
            records.map(record => (
              <div key={record.id} style={styles.recordItem}>
                <div style={{ ...styles.recordDot, background: record.prizeColor }} />
                <div style={styles.recordContent}>
                  <div style={styles.recordTop}>
                    <span style={styles.recordName}>{record.participantName}</span>
                    <span style={{ ...styles.recordPrize, background: record.prizeColor }}>
                      {record.prizeName}
                    </span>
                  </div>
                  <span style={styles.recordTime}>
                    {new Date(record.timestamp).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <UserOutlined style={{ marginRight: 8, color: '#60a5fa' }} />
          奖项库存
        </h3>
        <div style={styles.prizeList}>
          {activity.prizes.map(prize => (
            <div key={prize.id} style={styles.prizeItem}>
              <div style={{ ...styles.prizeColor, background: prize.color }} />
              <div style={styles.prizeInfo}>
                <span style={styles.prizeName}>{prize.name}</span>
                <span style={styles.prizeCount}>剩余 {prize.count} 份</span>
              </div>
              <div style={styles.prizeProb}>
                {prize.probability}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    padding: '16px',
    maxWidth: 640,
    margin: '0 auto'
  },
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    border: 'none',
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 18
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  activityInfo: {
    textAlign: 'center',
    marginBottom: 20
  },
  activityName: {
    fontSize: 22,
    marginBottom: 6
  },
  activityCode: {
    color: '#ffd700',
    fontSize: 16,
    fontWeight: 500,
    letterSpacing: 2
  },
  statsRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 16
  },
  statCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    padding: 16,
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)'
  },
  statIcon: {
    fontSize: 32,
    color: '#60a5fa',
    marginRight: 12
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  statLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2
  },
  controlCard: {
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  controlRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  controlLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginRight: 10
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600
  },
  controlBtn: {
    padding: '10px 20px',
    borderRadius: 12,
    border: 'none',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  shareRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },
  copyBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #e94560, #533483)',
    color: '#fff',
    fontSize: 13,
    cursor: 'pointer'
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12
  },
  filterRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 12
  },
  searchBox: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: '0 12px'
  },
  searchIcon: {
    color: '#64748b',
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    padding: '10px 0',
    border: 'none',
    background: 'transparent',
    color: '#fff',
    fontSize: 14,
    outline: 'none'
  },
  filterSelect: {
    padding: '10px 12px',
    borderRadius: 10,
    border: 'none',
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    cursor: 'pointer'
  },
  recordList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 400,
    overflowY: 'auto'
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    padding: 30
  },
  recordItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 14px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12
  },
  recordDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    marginRight: 12,
    flexShrink: 0,
    boxShadow: '0 0 6px currentColor'
  },
  recordContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  recordTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  recordName: {
    fontSize: 14,
    fontWeight: 500
  },
  recordPrize: {
    padding: '3px 10px',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 600,
    color: '#fff'
  },
  recordTime: {
    fontSize: 12,
    color: '#64748b'
  },
  prizeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  prizeItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 14px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12
  },
  prizeColor: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    marginRight: 12,
    flexShrink: 0
  },
  prizeInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  prizeName: {
    fontSize: 14,
    fontWeight: 500
  },
  prizeCount: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  prizeProb: {
    fontSize: 14,
    fontWeight: 600,
    color: '#ffd700'
  }
}

export default Admin
