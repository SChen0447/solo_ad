import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signin, getEventByCode, Event } from '../api'

interface SigninPanelProps {
  eventId?: string
}

function SigninPanel({ eventId }: SigninPanelProps) {
  const [signinCode, setSigninCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [event, setEvent] = useState<Event | null>(null)
  const [resolvedEventId, setResolvedEventId] = useState(eventId || '')
  const navigate = useNavigate()

  useEffect(() => {
    if (eventId) {
      setResolvedEventId(eventId)
    }
  }, [eventId])

  useEffect(() => {
    if (resolvedEventId && !eventId) {
      setShowSuccess(true)
      const timer = setTimeout(() => {
        navigate(`/event/${resolvedEventId}/wall`)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [resolvedEventId, eventId, navigate])

  const handleLookupCode = async () => {
    if (!signinCode.trim()) {
      setError('请输入签到码')
      return
    }
    if (signinCode.length !== 6) {
      setError('签到码为6位')
      return
    }

    setLoading(true)
    setError('')
    try {
      const foundEvent = await getEventByCode(signinCode.trim())
      setEvent(foundEvent)
      setResolvedEventId(foundEvent.id)
    } catch (err) {
      setError('签到码无效，请检查后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nickname.trim()) {
      setError('请输入昵称')
      return
    }
    if (nickname.length > 20) {
      setError('昵称最多20字')
      return
    }

    setLoading(true)
    setError('')
    try {
      const result = await signin(resolvedEventId, nickname.trim())
      if (result.success) {
        localStorage.setItem(`nickname_${resolvedEventId}`, nickname.trim())
        setShowSuccess(true)
        setTimeout(() => {
          navigate(`/event/${resolvedEventId}/wall`)
        }, 1500)
      }
    } catch (err) {
      setError('签到失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (showSuccess) {
    return (
      <div style={styles.successContainer}>
        <div style={styles.checkmarkWrapper}>
          <svg
            style={styles.checkmark}
            viewBox="0 0 52 52"
          >
            <circle
              cx="26"
              cy="26"
              r="25"
              fill="none"
              stroke="#2ecc71"
              strokeWidth="2"
              style={styles.checkCircle}
            />
            <path
              d="M14 27 l7 7 l16 -16"
              fill="none"
              stroke="#2ecc71"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={styles.checkPath}
            />
          </svg>
        </div>
        <p style={styles.successText}>签到成功！</p>
      </div>
    )
  }

  const needsCodeLookup = !eventId && !resolvedEventId

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>活动签到</h1>

      {needsCodeLookup ? (
        <div style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>签到码 <span style={styles.required}>*</span></label>
            <input
              type="text"
              value={signinCode}
              onChange={(e) => setSigninCode(e.target.value.toUpperCase())}
              placeholder="请输入6位签到码"
              style={styles.input}
              maxLength={6}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            onClick={handleLookupCode}
            style={{ ...styles.button, ...(loading ? styles.buttonLoading : {}) }}
            disabled={loading}
          >
            {loading ? (
              <span style={styles.spinner}></span>
            ) : (
              '查找活动'
            )}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSignin} style={styles.form}>
          {event && (
            <div style={styles.eventInfo}>
              <h2 style={styles.eventName}>{event.name}</h2>
              {event.description && <p style={styles.eventDesc}>{event.description}</p>}
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>昵称 <span style={styles.required}>*</span></label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入昵称（最多20字）"
              style={styles.input}
              maxLength={20}
              autoFocus
            />
            <span style={styles.charCount}>{nickname.length}/20</span>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            style={{ ...styles.button, ...(loading ? styles.buttonLoading : {}) }}
            disabled={loading}
          >
            {loading ? (
              <span style={styles.spinner}></span>
            ) : (
              '签到'
            )}
          </button>
        </form>
      )}
    </div>
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
    justifyContent: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: '24px',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
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
    textAlign: 'center',
    paddingBottom: '16px',
    borderBottom: '1px solid #f0f0f0',
  },
  eventName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333333',
    margin: '0 0 8px 0',
  },
  eventDesc: {
    fontSize: '14px',
    color: '#666',
    margin: '0',
  },
  successContainer: {
    maxWidth: '480px',
    margin: '0 auto',
    padding: '20px',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
  },
  checkmarkWrapper: {
    position: 'relative',
  },
  checkmark: {
    width: '100px',
    height: '100px',
    animation: 'checkmarkPop 0.5s ease-out forwards',
  },
  checkCircle: {
    strokeDasharray: '166',
    strokeDashoffset: '166',
    animation: 'strokeCircle 0.5s ease-out forwards',
  },
  checkPath: {
    strokeDasharray: '48',
    strokeDashoffset: '48',
    animation: 'strokeCheck 0.3s ease-out 0.2s forwards',
  },
  successText: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2ecc71',
    margin: '0',
    animation: 'fadeIn 0.5s ease-out 0.3s both',
  },
}

export default SigninPanel
