import { useState } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { createEvent, Event } from './api'
import SigninPanel from './components/SigninPanel'
import MessageWall from './components/MessageWall'

function CreateEventPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('请输入活动名称')
      return
    }
    if (name.length > 50) {
      setError('活动名称最多50字')
      return
    }
    if (description.length > 200) {
      setError('活动描述最多200字')
      return
    }

    setLoading(true)
    setError('')
    try {
      const newEvent = await createEvent(name.trim(), description.trim())
      setEvent(newEvent)
      localStorage.setItem(`organizer_${newEvent.id}`, 'true')
    } catch (err) {
      setError('创建活动失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const goToMessageWall = () => {
    if (event) {
      navigate(`/event/${event.id}/wall`)
    }
  }

  const signinUrl = event ? `${window.location.origin}/signin/${event.id}` : ''

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>创建活动</h1>

      {!event ? (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>活动名称 <span style={styles.required}>*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入活动名称（最多50字）"
              style={styles.input}
              maxLength={50}
            />
            <span style={styles.charCount}>{name.length}/50</span>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>活动描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入活动描述（最多200字）"
              style={{ ...styles.input, ...styles.textarea }}
              maxLength={200}
              rows={4}
            />
            <span style={styles.charCount}>{description.length}/200</span>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={{ ...styles.button, ...(loading ? styles.buttonLoading : {}) }} disabled={loading}>
            {loading ? (
              <span style={styles.spinner}></span>
            ) : (
              '创建活动'
            )}
          </button>
        </form>
      ) : (
        <div style={styles.eventInfo}>
          <h2 style={styles.eventName}>{event.name}</h2>
          {event.description && <p style={styles.eventDesc}>{event.description}</p>}

          <div style={styles.qrSection}>
            <p style={styles.qrLabel}>扫码签到</p>
            <div style={styles.qrWrapper}>
              <QRCodeSVG value={signinUrl} size={200} level="H" />
            </div>
          </div>

          <div style={styles.codeSection}>
            <p style={styles.codeLabel}>签到码</p>
            <p style={styles.signinCode}>{event.signinCode}</p>
          </div>

          <button onClick={goToMessageWall} style={styles.button}>
            进入留言墙管理
          </button>
        </div>
      )}
    </div>
  )
}

function SigninPage() {
  const { eventId } = useParams<{ eventId: string }>()
  return <SigninPanel eventId={eventId} />
}

function MessageWallPage() {
  const { eventId } = useParams<{ eventId: string }>()
  return <MessageWall eventId={eventId || ''} />
}

function SigninByCodePage() {
  return <SigninPanel eventId={undefined} />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<CreateEventPage />} />
      <Route path="/signin/:eventId" element={<SigninPage />} />
      <Route path="/signin" element={<SigninByCodePage />} />
      <Route path="/event/:eventId/wall" element={<MessageWallPage />} />
    </Routes>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '480px',
    margin: '0 auto',
    padding: '20px',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: '24px',
    textAlign: 'center',
    paddingTop: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333333',
    marginBottom: '8px',
  },
  required: {
    color: '#e74c3c',
  },
  input: {
    padding: '12px 14px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '15px',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  textarea: {
    resize: 'vertical',
    minHeight: '100px',
  },
  charCount: {
    fontSize: '12px',
    color: '#999',
    textAlign: 'right',
    marginTop: '4px',
  },
  error: {
    color: '#e74c3c',
    fontSize: '14px',
    margin: '0',
  },
  button: {
    padding: '14px',
    backgroundColor: '#4A90D9',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '8px',
  },
  buttonLoading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#FFFFFF',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },
  eventInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  eventName: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#333333',
    margin: '0',
  },
  eventDesc: {
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
    margin: '0',
  },
  qrSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  qrLabel: {
    fontSize: '14px',
    color: '#666',
    margin: '0',
  },
  qrWrapper: {
    padding: '16px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  },
  codeSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  codeLabel: {
    fontSize: '14px',
    color: '#666',
    margin: '0',
  },
  signinCode: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#4A90D9',
    letterSpacing: '4px',
    margin: '0',
  },
}

export default App
