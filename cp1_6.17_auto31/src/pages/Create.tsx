import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { PlusOutlined, DeleteOutlined, CopyOutlined, CheckOutlined, SettingOutlined, GiftOutlined } from '@ant-design/icons'
import { activityApi, Prize } from '../services/api'

interface PrizeForm {
  name: string
  count: number
  color: string
  probability: number
}

const DEFAULT_COLORS = ['#e94560', '#0f3460', '#533483', '#f39c12', '#27ae60', '#9b59b6']

const Create = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [maxDraws, setMaxDraws] = useState(1)
  const [duration, setDuration] = useState(60)
  const [prizes, setPrizes] = useState<PrizeForm[]>([
    { name: '一等奖', count: 1, color: '#e94560', probability: 5 },
    { name: '二等奖', count: 3, color: '#0f3460', probability: 15 },
    { name: '三等奖', count: 10, color: '#533483', probability: 30 },
    { name: '参与奖', count: 50, color: '#f39c12', probability: 50 }
  ])
  const [activity, setActivity] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const addPrize = () => {
    const newPrize: PrizeForm = {
      name: `奖项${prizes.length + 1}`,
      count: 5,
      color: DEFAULT_COLORS[prizes.length % DEFAULT_COLORS.length],
      probability: 10
    }
    setPrizes([...prizes, newPrize])
  }

  const removePrize = (index: number) => {
    if (prizes.length <= 1) return
    setPrizes(prizes.filter((_, i) => i !== index))
  }

  const updatePrize = (index: number, field: keyof PrizeForm, value: string | number) => {
    const updated = [...prizes]
    updated[index] = { ...updated[index], [field]: value }
    setPrizes(updated)
  }

  const totalProb = prizes.reduce((sum, p) => sum + (typeof p.probability === 'number' ? p.probability : 0), 0)

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('请输入活动名称')
      return
    }
    if (prizes.length === 0) {
      alert('请至少添加一个奖项')
      return
    }
    if (totalProb !== 100) {
      alert(`概率总和必须为100%，当前为${totalProb}%`)
      return
    }

    setLoading(true)
    try {
      const res = await activityApi.create({
        name,
        prizes: prizes.map(p => ({
          name: p.name,
          count: p.count,
          color: p.color,
          probability: p.probability
        })),
        maxDraws,
        duration
      })
      setActivity(res.data)
    } catch (err) {
      console.error(err)
      alert('创建失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const copyLink = async () => {
    if (!activity) return
    try {
      await navigator.clipboard.writeText(activity.shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('复制失败，请手动复制')
    }
  }

  const goToAdmin = () => {
    if (activity) {
      navigate(`/admin/${activity.id}`)
    }
  }

  if (activity) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <GiftOutlined style={styles.headerIcon} />
          <h1 style={styles.title}>活动创建成功</h1>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>{activity.name}</h2>
          <p style={styles.activityCode}>活动码: {activity.code}</p>

          <div style={styles.qrSection}>
            <div style={styles.qrWrapper}>
              <QRCodeSVG
                value={activity.shareUrl}
                size={180}
                bgColor={'#ffffff'}
                fgColor={'#16213e'}
                level={'H'}
                includeMargin={true}
              />
            </div>
            <p style={styles.qrLabel}>扫码参与抽奖</p>
          </div>

          <div style={styles.linkSection}>
            <div style={styles.linkBox}>
              <span style={styles.linkText}>{activity.shareUrl}</span>
              <button style={styles.copyBtn} onClick={copyLink}>
                {copied ? <CheckOutlined /> : <CopyOutlined />}
              </button>
            </div>
          </div>

          <div style={styles.btnRow}>
            <button style={styles.secondaryBtn} onClick={() => navigate('/')}>
              返回首页
            </button>
            <button style={styles.primaryBtn} onClick={goToAdmin}>
              进入管理后台
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <SettingOutlined style={styles.headerIcon} />
        <h1 style={styles.title}>创建抽奖活动</h1>
      </div>

      <div style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>活动名称</label>
          <input
            type="text"
            style={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="请输入活动名称"
          />
        </div>

        <div style={styles.formRow}>
          <div style={{ ...styles.formGroup, flex: 1 }}>
            <label style={styles.label}>每人抽奖次数</label>
            <input
              type="number"
              style={styles.input}
              value={maxDraws}
              onChange={e => setMaxDraws(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
            />
          </div>
          <div style={{ ...styles.formGroup, flex: 1, marginLeft: 16 }}>
            <label style={styles.label}>活动时长(分钟)</label>
            <input
              type="number"
              style={styles.input}
              value={duration}
              onChange={e => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
            />
          </div>
        </div>

        <div style={styles.prizesSection}>
          <div style={styles.sectionHeader}>
            <label style={styles.label}>奖项设置</label>
            <span style={{ color: totalProb === 100 ? '#4ade80' : '#f87171', fontSize: 14 }}>
              概率: {totalProb}%
            </span>
          </div>

          <div style={styles.prizeList}>
            {prizes.map((prize, index) => (
              <div key={index} style={styles.prizeItem}>
                <div style={styles.colorPickerWrapper}>
                  <input
                    type="color"
                    style={styles.colorPicker}
                    value={prize.color}
                    onChange={e => updatePrize(index, 'color', e.target.value)}
                  />
                </div>
                <input
                  type="text"
                  style={{ ...styles.prizeInput, flex: 1.5 }}
                  value={prize.name}
                  onChange={e => updatePrize(index, 'name', e.target.value)}
                  placeholder="奖项名称"
                />
                <div style={{ ...styles.prizeInput, flex: 1, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8', marginRight: 4 }}>数量</span>
                  <input
                    type="number"
                    style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', outline: 'none' }}
                    value={prize.count}
                    onChange={e => updatePrize(index, 'count', parseInt(e.target.value) || 0)}
                    min={0}
                  />
                </div>
                <div style={{ ...styles.prizeInput, flex: 1, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8', marginRight: 4 }}>概率</span>
                  <input
                    type="number"
                    style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', outline: 'none' }}
                    value={prize.probability}
                    onChange={e => updatePrize(index, 'probability', parseFloat(e.target.value) || 0)}
                    min={0}
                    max={100}
                  />
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>%</span>
                </div>
                <button style={styles.deleteBtn} onClick={() => removePrize(index)}>
                  <DeleteOutlined />
                </button>
              </div>
            ))}
          </div>

          <button style={styles.addBtn} onClick={addPrize}>
            <PlusOutlined /> 添加奖项
          </button>
        </div>

        <button
          style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? '创建中...' : '创建活动'}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    padding: '20px 16px',
    maxWidth: 600,
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  headerIcon: {
    fontSize: 28,
    color: '#e94560',
    marginRight: 12
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, #e94560, #ff6b9d)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  card: {
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 24,
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  cardTitle: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8
  },
  activityCode: {
    textAlign: 'center',
    color: '#ffd700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    letterSpacing: 2
  },
  qrSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 20
  },
  qrWrapper: {
    background: '#fff',
    padding: 12,
    borderRadius: 12,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
  },
  qrLabel: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14
  },
  linkSection: {
    marginBottom: 20
  },
  linkBox: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: '10px 12px'
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    color: '#cbd5e1',
    wordBreak: 'break-all'
  },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #e94560, #533483)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnRow: {
    display: 'flex',
    gap: 12
  },
  primaryBtn: {
    flex: 1,
    padding: '14px 20px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #e94560, #533483)',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    cursor: 'pointer'
  },
  secondaryBtn: {
    flex: 1,
    padding: '14px 20px',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'transparent',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    cursor: 'pointer'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  formRow: {
    display: 'flex'
  },
  label: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 8,
    fontWeight: 500
  },
  input: {
    padding: '12px 16px',
    borderRadius: 10,
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#fff',
    fontSize: 15,
    outline: 'none'
  },
  prizesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  prizeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  prizeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10
  },
  colorPickerWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    flexShrink: 0
  },
  colorPicker: {
    width: '100%',
    height: '100%',
    border: 'none',
    cursor: 'pointer'
  },
  prizeInput: {
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(0, 0, 0, 0.2)',
    color: '#fff',
    fontSize: 13,
    outline: 'none'
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: 'none',
    background: 'rgba(233, 69, 96, 0.2)',
    color: '#e94560',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  addBtn: {
    padding: '12px',
    borderRadius: 10,
    border: '1px dashed rgba(255, 255, 255, 0.3)',
    background: 'transparent',
    color: '#cbd5e1',
    fontSize: 14,
    cursor: 'pointer'
  },
  submitBtn: {
    padding: '16px 20px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #e94560, #533483)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(233, 69, 96, 0.4)'
  }
}

export default Create
