import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { TrophyOutlined, HistoryOutlined, UserOutlined, LoadingOutlined } from '@ant-design/icons'
import Wheel from '../components/Wheel'
import {
  activityApi,
  drawApi,
  participantApi,
  initSocket,
  disconnectSocket,
  getSocket,
  WinRecord,
  Prize
} from '../services/api'

const Draw = () => {
  const { code } = useParams<{ code: string }>()
  const [activity, setActivity] = useState<{
    id: string
    name: string
    code: string
    prizes: Prize[]
    maxDraws: number
    isActive: boolean
  } | null>(null)
  const [participantName, setParticipantName] = useState('')
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [participantDrawCount, setParticipantDrawCount] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [targetPrizeId, setTargetPrizeId] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [winRecord, setWinRecord] = useState<WinRecord | null>(null)
  const [myRecords, setMyRecords] = useState<WinRecord[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const sessionIdRef = useRef(0)

  const generateSessionId = useCallback(() => {
    sessionIdRef.current += 1
    return `${Date.now()}-${sessionIdRef.current}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  useEffect(() => {
    if (!code) return
    loadActivity()
    return () => disconnectSocket()
  }, [code])

  const loadActivity = async () => {
    try {
      const res = await activityApi.get(code!)
      setActivity(res.data)

      const savedPid = localStorage.getItem(`pid_${code}`)
      const savedName = localStorage.getItem(`pname_${code}`)
      if (savedPid && savedName) {
        setParticipantId(savedPid)
        setParticipantName(savedName)
        initSocketConnection(res.data.id, savedPid)
        loadMyRecords(res.data.id, savedPid)
      }
    } catch (err) {
      console.error(err)
      alert('活动不存在或已结束')
    } finally {
      setLoading(false)
    }
  }

  const initSocketConnection = (activityId: string, pid: string) => {
    const socket = initSocket(activityId, pid)

    socket.on('activity_status', (data: { isActive: boolean }) => {
      setActivity(prev => prev ? { ...prev, isActive: data.isActive } : null)
    })

    socket.on('new_win', (data: { record: WinRecord }) => {
      if (data.record.participantId === pid) {
        setMyRecords(prev => [data.record, ...prev])
        setParticipantDrawCount(prev => prev + 1)
      }
    })
  }

  const loadMyRecords = async (activityId: string, pid: string) => {
    try {
      const res = await drawApi.getMyRecords(activityId, pid)
      setMyRecords(res.data)
      setParticipantDrawCount(res.data.length)
    } catch (err) {
      console.error(err)
    }
  }

  const handleJoin = async () => {
    if (!participantName.trim()) {
      alert('请输入您的昵称')
      return
    }
    if (!activity) return

    setJoining(true)
    try {
      const res = await participantApi.join(activity.id, participantName.trim())
      setParticipantId(res.data.participantId)
      localStorage.setItem(`pid_${code}`, res.data.participantId)
      localStorage.setItem(`pname_${code}`, participantName.trim())
      initSocketConnection(activity.id, res.data.participantId)
    } catch (err) {
      console.error(err)
      alert('加入失败，请重试')
    } finally {
      setJoining(false)
    }
  }

  const handleSpin = async () => {
    if (!activity || !participantId || spinning) return
    if (!activity.isActive) {
      alert('抽奖已暂停，请等待管理员开启')
      return
    }
    if (participantDrawCount >= activity.maxDraws) {
      alert(`您已用完${activity.maxDraws}次抽奖机会`)
      return
    }

    const sessionId = generateSessionId()
    setSpinning(true)
    setTargetPrizeId(null)

    try {
      const res = await drawApi.spin(activity.id, participantId, sessionId)
      setWinRecord(res.data)
      setTargetPrizeId(res.data.prizeId)

      const socket = getSocket()
      if (socket) {
        socket.emit('participant_won', { record: res.data })
      }
    } catch (err: any) {
      console.error(err)
      setSpinning(false)
      const msg = err.response?.data?.error || '抽奖失败，请重试'
      alert(msg)
    }
  }

  const handleSpinEnd = (_prizeId: string) => {
    setSpinning(false)
    setShowResult(true)
    setParticipantDrawCount(prev => prev + 1)
    if (winRecord) {
      setMyRecords(prev => [winRecord, ...prev])
    }
  }

  const closeResult = () => {
    setShowResult(false)
    setWinRecord(null)
    setTargetPrizeId(null)
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
        <div style={styles.errorCard}>
          <p>活动不存在</p>
        </div>
      </div>
    )
  }

  if (!participantId) {
    return (
      <div style={styles.container}>
        <div style={styles.joinCard}>
          <div style={styles.joinHeader}>
            <TrophyOutlined style={{ fontSize: 48, color: '#ffd700' }} />
            <h2 style={styles.joinTitle}>{activity.name}</h2>
            <p style={styles.joinSubtitle}>输入昵称开始抽奖</p>
          </div>

          <div style={styles.joinForm}>
            <div style={styles.inputGroup}>
              <UserOutlined style={styles.inputIcon} />
              <input
                type="text"
                style={styles.nameInput}
                value={participantName}
                onChange={e => setParticipantName(e.target.value)}
                placeholder="请输入您的昵称"
                maxLength={20}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
            </div>
            <button
              style={{ ...styles.joinBtn, opacity: joining ? 0.7 : 1 }}
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? '加入中...' : '进入抽奖'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const canDraw = activity.isActive && !spinning && participantDrawCount < activity.maxDraws
  const remainingDraws = activity.maxDraws - participantDrawCount

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.activityTitle}>{activity.name}</h1>
        <div style={styles.userInfo}>
          <UserOutlined style={{ marginRight: 6 }} />
          <span>{participantName}</span>
          <span style={styles.remainingBadge}>剩余 {remainingDraws} 次</span>
        </div>
      </div>

      <div style={styles.wheelSection}>
        <Wheel
          prizes={activity.prizes}
          spinning={spinning}
          targetPrizeId={targetPrizeId}
          onSpinEnd={handleSpinEnd}
          disabled={!canDraw}
          size={280}
        />

        <button
          style={{
            ...styles.spinBtn,
            background: canDraw
              ? 'linear-gradient(135deg, #e94560, #533483)'
              : 'rgba(255, 255, 255, 0.15)',
            cursor: canDraw ? 'pointer' : 'not-allowed'
          }}
          onClick={handleSpin}
          disabled={!canDraw}
        >
          {!activity.isActive ? '抽奖已暂停' : remainingDraws <= 0 ? '次数已用完' : spinning ? '抽奖中...' : '开始抽奖'}
        </button>
      </div>

      <button style={styles.historyBtn} onClick={() => setShowHistory(!showHistory)}>
        <HistoryOutlined style={{ marginRight: 8 }} />
        {showHistory ? '隐藏' : '我的'}中奖记录
      </button>

      {showHistory && (
        <div style={styles.historyCard}>
          <h3 style={styles.historyTitle}>
            <TrophyOutlined style={{ marginRight: 8, color: '#ffd700' }} />
            中奖记录
          </h3>
          {myRecords.length === 0 ? (
            <p style={styles.emptyText}>暂无中奖记录</p>
          ) : (
            <div style={styles.recordList}>
              {myRecords.map(record => (
                <div key={record.id} style={styles.recordItem}>
                  <div
                    style={{ ...styles.recordDot, background: record.prizeColor }}
                  />
                  <div style={styles.recordContent}>
                    <span style={styles.recordPrize}>{record.prizeName}</span>
                    <span style={styles.recordTime}>
                      {new Date(record.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showResult && winRecord && (
        <div style={styles.modalOverlay} onClick={closeResult}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.resultContent}>
              <div style={styles.sparkleBg} />
              <div style={styles.trophyIcon}>
                <TrophyOutlined style={{ fontSize: 64, color: '#ffd700' }} />
              </div>
              <h2 style={styles.congratsText}>恭喜中奖！</h2>
              <div
                style={{
                  ...styles.prizeBadge,
                  background: winRecord.prizeColor
                }}
              >
                {winRecord.prizeName}
              </div>
              <button style={styles.closeBtn} onClick={closeResult}>
                太棒了！
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    padding: '16px',
    maxWidth: 480,
    margin: '0 auto'
  },
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  errorCard: {
    padding: 40,
    textAlign: 'center'
  },
  joinCard: {
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 32,
    marginTop: 60,
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  joinHeader: {
    textAlign: 'center',
    marginBottom: 32
  },
  joinTitle: {
    fontSize: 24,
    marginTop: 16,
    marginBottom: 8
  },
  joinSubtitle: {
    color: '#94a3b8',
    fontSize: 14
  },
  joinForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: '0 16px'
  },
  inputIcon: {
    color: '#94a3b8',
    marginRight: 10
  },
  nameInput: {
    flex: 1,
    padding: '14px 0',
    border: 'none',
    background: 'transparent',
    color: '#fff',
    fontSize: 16,
    outline: 'none'
  },
  joinBtn: {
    padding: '16px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #e94560, #533483)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 20
  },
  activityTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    color: '#cbd5e1',
    background: 'rgba(255, 255, 255, 0.08)',
    padding: '8px 16px',
    borderRadius: 20
  },
  remainingBadge: {
    marginLeft: 12,
    background: 'linear-gradient(135deg, #e94560, #ff6b9d)',
    color: '#fff',
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold'
  },
  wheelSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24
  },
  spinBtn: {
    width: 200,
    padding: '16px 0',
    borderRadius: 30,
    border: 'none',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    boxShadow: '0 4px 20px rgba(233, 69, 96, 0.4)'
  },
  historyBtn: {
    width: '100%',
    marginTop: 20,
    padding: '14px',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'transparent',
    color: '#fff',
    fontSize: 15,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  historyCard: {
    marginTop: 16,
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  historyTitle: {
    fontSize: 16,
    marginBottom: 12
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    padding: 20
  },
  recordList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxHeight: 300,
    overflowY: 'auto'
  },
  recordItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 10
  },
  recordDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    marginRight: 12,
    flexShrink: 0,
    boxShadow: '0 0 8px currentColor'
  },
  recordContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  recordPrize: {
    fontSize: 15,
    fontWeight: 500
  },
  recordTime: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
    animation: 'fadeIn 0.3s ease'
  },
  modal: {
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    borderRadius: 24,
    padding: 32,
    position: 'relative',
    overflow: 'hidden',
    animation: 'scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    maxWidth: 360,
    width: '100%'
  },
  resultContent: {
    textAlign: 'center',
    position: 'relative',
    zIndex: 1
  },
  sparkleBg: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 300,
    height: 300,
    background: 'radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%)',
    animation: 'pulse 2s infinite'
  },
  trophyIcon: {
    marginBottom: 16,
    animation: 'bounce 1s ease infinite'
  },
  congratsText: {
    fontSize: 28,
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, #ffd700, #ffb347)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: 16
  },
  prizeBadge: {
    display: 'inline-block',
    padding: '12px 32px',
    borderRadius: 30,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    marginBottom: 24
  },
  closeBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #ffd700, #ffb347)',
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer'
  }
}

export default Draw
