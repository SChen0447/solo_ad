import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { getMessages, sendMessage, pinMessage, deleteMessage, Message, getEvent, Event } from '../api'

interface MessageWallProps {
  eventId: string
}

const AVATAR_COLORS = [
  '#FFB3BA',
  '#BAFFC9',
  '#BAE1FF',
  '#FFFFBA',
  '#FFDFBA',
  '#E8BAFF',
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function getAvatarColor(nickname: string): string {
  const hash = hashString(nickname)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function getInitial(nickname: string): string {
  return nickname.charAt(0).toUpperCase()
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function MessageWall({ eventId }: MessageWallProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [nickname, setNickname] = useState('')
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [event, setEvent] = useState<Event | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const savedNickname = localStorage.getItem(`nickname_${eventId}`)
    if (savedNickname) {
      setNickname(savedNickname)
    }

    const organizerFlag = localStorage.getItem(`organizer_${eventId}`)
    setIsOrganizer(!!organizerFlag)
  }, [eventId])

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const evt = await getEvent(eventId)
        setEvent(evt)
      } catch (err) {
        console.error('Failed to fetch event:', err)
      }
    }
    fetchEvent()
  }, [eventId])

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const msgs = await getMessages(eventId)
        setMessages(msgs)
      } catch (err) {
        console.error('Failed to fetch messages:', err)
      }
    }
    fetchMessages()
  }, [eventId])

  useEffect(() => {
    const socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join_event', eventId)
    })

    socket.on('new_message', (message: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) {
          return prev
        }
        if (message.isPinned) {
          return [message, ...prev.filter((m) => !m.isPinned)]
        }
        const pinned = prev.filter((m) => m.isPinned)
        const unpinned = prev.filter((m) => !m.isPinned)
        return [...pinned, message, ...unpinned]
      })
    })

    socket.on('message_pinned', (message: Message) => {
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === message.id ? { ...m, isPinned: true } : m
        )
        const pinned = updated.filter((m) => m.isPinned).sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        const unpinned = updated.filter((m) => !m.isPinned).sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        return [...pinned, ...unpinned]
      })
    })

    socket.on('message_deleted', (messageId: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    })

    return () => {
      socket.disconnect()
    }
  }, [eventId])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        alert('只能上传 JPG 或 PNG 格式的图片')
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('图片大小不能超过 2MB')
        return
      }
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (ev) => {
        setImagePreview(ev.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSend = async () => {
    if (!inputText.trim() && !selectedImage) {
      return
    }
    if (inputText.length > 200) {
      return
    }
    if (!nickname) {
      alert('请先签到')
      return
    }

    setSending(true)
    try {
      const msg = await sendMessage(eventId, nickname, inputText.trim(), selectedImage || undefined)
      setInputText('')
      clearImage()
    } catch (err) {
      console.error('Failed to send message:', err)
      alert('发送失败，请重试')
    } finally {
      setSending(false)
    }
  }

  const handlePin = async (messageId: string) => {
    try {
      await pinMessage(eventId, messageId, 'organizer')
    } catch (err) {
      console.error('Failed to pin message:', err)
      alert('置顶失败')
    }
  }

  const handleDelete = async (messageId: string) => {
    setDeletingId(messageId)
    try {
      await deleteMessage(eventId, messageId, 'organizer')
      setShowDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete message:', err)
      alert('删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  const pinnedMessages = messages.filter((m) => m.isPinned)
  const unpinnedMessages = messages.filter((m) => !m.isPinned)
  const displayMessages = [...pinnedMessages, ...unpinnedMessages]

  return (
    <div style={styles.container}>
      {isOrganizer && (
        <div style={styles.adminBar}>
          <span style={styles.adminLabel}>管理员模式</span>
        </div>
      )}

      <div style={styles.header}>
        <h1 style={styles.title}>{event?.name || '留言墙'}</h1>
        {nickname && <p style={styles.nicknameDisplay}>当前用户：{nickname}</p>}
      </div>

      <div style={styles.messageList} ref={messagesEndRef}>
        {displayMessages.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>暂无消息，快来发第一条吧！</p>
          </div>
        ) : (
          displayMessages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOrganizer={isOrganizer}
              onPin={handlePin}
              onDelete={() => setShowDeleteConfirm(message.id)}
              isDeleting={deletingId === message.id}
              isNew={index === 0 && !message.isPinned}
            />
          ))
        )}
      </div>

      <div style={styles.inputArea}>
        {imagePreview && (
          <div style={styles.imagePreviewContainer}>
            <img src={imagePreview} alt="预览" style={styles.imagePreview} />
            <button onClick={clearImage} style={styles.removeImageBtn}>×</button>
          </div>
        )}
        <div style={styles.inputRow}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/jpeg,image/png"
            style={styles.fileInput}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={styles.imageButton}
            disabled={sending}
          >
            📷
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="说点什么吧（最多200字）"
            style={styles.textInput}
            maxLength={200}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <button
            onClick={handleSend}
            style={{
              ...styles.sendButton,
              ...((!inputText.trim() && !selectedImage) || sending ? styles.sendButtonDisabled : {}),
            }}
            disabled={(!inputText.trim() && !selectedImage) || sending}
          >
            {sending ? (
              <span style={styles.spinner}></span>
            ) : (
              '发送'
            )}
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>确认删除</h3>
            <p style={styles.modalText}>确定要删除这条消息吗？</p>
            <div style={styles.modalButtons}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={styles.modalCancelBtn}
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                style={styles.modalConfirmBtn}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface MessageBubbleProps {
  message: Message
  isOrganizer: boolean
  onPin: (id: string) => void
  onDelete: () => void
  isDeleting: boolean
  isNew: boolean
}

function MessageBubble({ message, isOrganizer, onPin, onDelete, isDeleting, isNew }: MessageBubbleProps) {
  const avatarColor = getAvatarColor(message.nickname)
  const initial = getInitial(message.nickname)

  return (
    <div
      style={{
        ...styles.messageBubble,
        ...(message.isPinned ? styles.pinnedBubble : {}),
        ...(isNew ? styles.newMessage : {}),
        ...(isDeleting ? styles.deletingMessage : {}),
      }}
    >
      {message.isPinned && (
        <div style={styles.pinBadge}>
          <span>📌</span>
          <span style={styles.pinText}>置顶</span>
        </div>
      )}

      <div style={styles.messageHeader}>
        <div style={{ ...styles.avatar, backgroundColor: avatarColor }}>
          {initial}
        </div>
        <div style={styles.messageMeta}>
          <span style={styles.nickname}>{message.nickname}</span>
          <span style={styles.timestamp}>{formatTime(message.timestamp)}</span>
        </div>

        {isOrganizer && (
          <div style={styles.adminActions}>
            {!message.isPinned && (
              <button onClick={() => onPin(message.id)} style={styles.adminBtn} title="置顶">
                📌
              </button>
            )}
            <button onClick={onDelete} style={styles.adminBtn} title="删除">
              🗑️
            </button>
          </div>
        )}
      </div>

      {message.content && <p style={styles.messageContent}>{message.content}</p>}

      {message.imageUrl && (
        <div style={styles.imageContainer}>
          <img src={message.imageUrl} alt="" style={styles.messageImage} />
        </div>
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '768px',
    margin: '0 auto',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#F5F7FA',
    position: 'relative',
  },
  adminBar: {
    position: 'fixed',
    top: 0,
    right: 0,
    left: 0,
    backgroundColor: 'rgba(74, 144, 217, 0.9)',
    color: '#FFFFFF',
    padding: '8px 20px',
    fontSize: '12px',
    textAlign: 'right',
    zIndex: 100,
    backdropFilter: 'blur(4px)',
  },
  adminLabel: {
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: '16px 20px',
    borderBottom: '1px solid #e8e8e8',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333333',
    margin: '0 0 4px 0',
  },
  nicknameDisplay: {
    fontSize: '12px',
    color: '#999',
    margin: '0',
  },
  messageList: {
    flex: 1,
    padding: '12px 16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
  },
  emptyText: {
    color: '#999',
    fontSize: '14px',
    margin: 0,
  },
  messageBubble: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #e8e8e8',
    borderRadius: '12px',
    padding: '12px',
    animation: 'slideIn 0.3s ease-out',
    position: 'relative',
  },
  pinnedBubble: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE082',
  },
  newMessage: {
    animation: 'slideIn 0.3s ease-out',
  },
  deletingMessage: {
    animation: 'fadeOut 0.2s ease-out forwards',
  },
  pinBadge: {
    position: 'absolute',
    top: '-8px',
    right: '12px',
    backgroundColor: '#FFD54F',
    color: '#795548',
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  pinText: {
    fontSize: '11px',
  },
  messageHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginBottom: '8px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    flexShrink: 0,
  },
  messageMeta: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  nickname: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333333',
  },
  timestamp: {
    fontSize: '11px',
    color: '#999',
  },
  adminActions: {
    display: 'flex',
    gap: '4px',
  },
  adminBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  messageContent: {
    fontSize: '14px',
    color: '#333333',
    lineHeight: '1.5',
    margin: '0 0 0 46px',
    wordBreak: 'break-word',
  },
  imageContainer: {
    marginLeft: '46px',
    marginTop: '8px',
  },
  messageImage: {
    maxWidth: '300px',
    maxHeight: '300px',
    borderRadius: '8px',
    objectFit: 'contain',
    display: 'block',
  },
  inputArea: {
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #e8e8e8',
    padding: '12px 16px',
    position: 'sticky',
    bottom: 0,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: '8px',
    display: 'inline-block',
  },
  imagePreview: {
    maxWidth: '120px',
    maxHeight: '120px',
    borderRadius: '8px',
    objectFit: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#FFFFFF',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1',
    padding: 0,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  fileInput: {
    display: 'none',
  },
  imageButton: {
    width: '40px',
    height: '40px',
    border: 'none',
    backgroundColor: '#f0f0f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  textInput: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  },
  sendButton: {
    padding: '10px 20px',
    backgroundColor: '#4A90D9',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  sendButtonDisabled: {
    backgroundColor: '#B0BEC5',
    cursor: 'not-allowed',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#FFFFFF',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '320px',
    width: '100%',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333333',
    margin: '0 0 12px 0',
    textAlign: 'center',
  },
  modalText: {
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
    margin: '0 0 20px 0',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
  },
  modalCancelBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#f0f0f0',
    color: '#333',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  modalConfirmBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#e74c3c',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
}

export default MessageWall
