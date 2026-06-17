import React, { useState } from 'react'
import { Account, platformIconMap } from '../api'

interface Props {
  accounts: Account[]
  selectedAccountId: string | null
  onSelectAccount: (id: string | null) => void
  onCreateAccount: (acc: Omit<Account, 'id'>) => void
}

const PRESET_COLORS = [
  '#ff6b6b', '#ff922b', '#fcc419', '#51cf66', '#20c997',
  '#339af0', '#7950f2', '#e64980', '#ff6b9d', '#82c91e'
]

const platformLabels: Record<Account['platform'], string> = {
  weibo: '微博',
  wechat: '微信公众号',
  xiaohongshu: '小红书'
}

const AccountPanel: React.FC<Props> = ({ accounts, selectedAccountId, onSelectAccount, onCreateAccount }) => {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState<Account['platform']>('weibo')
  const [color, setColor] = useState(PRESET_COLORS[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onCreateAccount({
      name: name.trim(),
      platform,
      color,
      icon: platformIconMap[platform]
    })
    setName('')
    setPlatform('weibo')
    setColor(PRESET_COLORS[0])
    setShowForm(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>账号管理</h2>
        <button onClick={() => setShowForm(!showForm)} style={styles.addBtn} title="添加账号">
          {showForm ? '✕' : '＋'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>账号名称</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="输入账号名称"
              style={styles.input}
              maxLength={20}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>平台</label>
            <select
              value={platform}
              onChange={e => {
                setPlatform(e.target.value as Account['platform'])
              }}
              style={styles.select}
            >
              {(['weibo', 'wechat', 'xiaohongshu'] as const).map(p => (
                <option key={p} value={p}>{platformIconMap[p]} {platformLabels[p]}</option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>颜色标签</label>
            <div style={styles.colorGrid}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    ...styles.colorDot,
                    backgroundColor: c,
                    transform: color === c ? 'scale(1.25)' : 'scale(1)',
                    boxShadow: color === c ? `0 0 0 2px #e0e0f0, 0 0 0 4px ${c}` : 'none'
                  }}
                />
              ))}
            </div>
          </div>
          <button type="submit" style={styles.submitBtn}>创建账号</button>
        </form>
      )}

      <div style={styles.accountList}>
        <button
          onClick={() => onSelectAccount(null)}
          style={{
            ...styles.accountCard,
            borderColor: selectedAccountId === null ? '#7950f2' : 'transparent',
            backgroundColor: selectedAccountId === null ? '#3a3a52' : 'transparent'
          }}
        >
          <div style={{ ...styles.accountIcon, backgroundColor: '#6366f1' }}>📊</div>
          <div style={styles.accountInfo}>
            <div style={styles.accountName}>全部账号</div>
            <div style={styles.accountMeta}>{accounts.length} 个账号</div>
          </div>
        </button>

        {accounts.map(acc => (
          <button
            key={acc.id}
            onClick={() => onSelectAccount(acc.id)}
            style={{
              ...styles.accountCard,
              borderColor: selectedAccountId === acc.id ? acc.color : 'transparent',
              backgroundColor: selectedAccountId === acc.id ? '#3a3a52' : 'transparent'
            }}
          >
            <div style={{ ...styles.accountIcon, backgroundColor: acc.color }}>{acc.icon}</div>
            <div style={styles.accountInfo}>
              <div style={styles.accountName}>{acc.name}</div>
              <div style={styles.accountMeta}>{platformLabels[acc.platform]}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 250,
    minWidth: 250,
    backgroundColor: '#2a2a3e',
    borderRight: '1px solid #3a3a52',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    padding: '20px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #3a3a52'
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#e0e0f0'
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#7950f2',
    color: '#fff',
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  form: {
    padding: 16,
    borderBottom: '1px solid #3a3a52',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflowY: 'auto'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  label: {
    fontSize: 12,
    color: '#a0a0c0',
    fontWeight: 500
  },
  input: {
    padding: '8px 12px',
    borderRadius: 6,
    backgroundColor: '#1e1e2e',
    color: '#e0e0f0',
    fontSize: 13,
    border: '1px solid #3a3a52'
  },
  select: {
    padding: '8px 12px',
    borderRadius: 6,
    backgroundColor: '#1e1e2e',
    color: '#e0e0f0',
    fontSize: 13,
    border: '1px solid #3a3a52',
    cursor: 'pointer'
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 8
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    cursor: 'pointer'
  },
  submitBtn: {
    padding: '10px 16px',
    borderRadius: 6,
    backgroundColor: '#7950f2',
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    marginTop: 4
  },
  accountList: {
    flex: 1,
    overflowY: 'auto',
    padding: 8
  },
  accountCard: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
    marginBottom: 4,
    border: '2px solid transparent',
    textAlign: 'left'
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0
  },
  accountInfo: {
    flex: 1,
    minWidth: 0
  },
  accountName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#e0e0f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  accountMeta: {
    fontSize: 12,
    color: '#8080a0',
    marginTop: 2
  }
}

export default AccountPanel
