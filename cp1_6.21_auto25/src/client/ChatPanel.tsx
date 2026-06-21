import { useState, useRef, useEffect } from 'react'

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

interface User {
  id: string
  name: string
  avatar: string
}

interface ChatPanelProps {
  taskId: string
  messages: ChatMessage[]
  currentUser: User
  onSendMessage: (taskId: string, content: string, type: 'text' | 'emoji') => void
  onClose: () => void
  taskTitle: string
}

const quickEmojis = [
  { emoji: '🚚', label: '已出发' },
  { emoji: '✅', label: '送达' },
  { emoji: '👍', label: '收到' },
  { emoji: '⚠️', label: '注意' },
  { emoji: '📦', label: '物资' },
  { emoji: '🙋', label: '需要帮助' },
]

function ChatPanel({
  taskId,
  messages,
  currentUser,
  onSendMessage,
  onClose,
  taskTitle,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!inputText.trim()) return
    onSendMessage(taskId, inputText.trim(), 'text')
    setInputText('')
  }

  const handleQuickEmoji = (emoji: string, label: string) => {
    onSendMessage(taskId, `${emoji}${label}`, 'emoji')
    setShowEmojiPicker(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const isCurrentUser = (userId: string) => userId === currentUser.id

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerIcon}>💬</span>
            <div>
              <h3 style={styles.headerTitle}>{taskTitle}</h3>
              <p style={styles.headerSubtitle}>任务聊天</p>
            </div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.messagesContainer}>
          {sortedMessages.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>💭</span>
              <p style={styles.emptyText}>暂无消息，发送第一条消息吧</p>
            </div>
          ) : (
            sortedMessages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  ...styles.messageRow,
                  ...(isCurrentUser(msg.userId) ? styles.messageRowRight : styles.messageRowLeft),
                }}
                className="fade-in"
              >
                {!isCurrentUser(msg.userId) && (
                  <span style={styles.avatar}>{msg.avatar}</span>
                )}
                <div style={{
                  ...styles.messageBubbleWrapper,
                  ...(isCurrentUser(msg.userId) ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft),
                }}>
                  {!isCurrentUser(msg.userId) && (
                    <span style={styles.senderName}>{msg.userName}</span>
                  )}
                  <div
                    style={{
                      ...styles.messageBubble,
                      ...(isCurrentUser(msg.userId) ? styles.bubbleSelf : styles.bubbleOther),
                      ...(msg.type === 'emoji' ? styles.bubbleEmoji : {}),
                    }}
                  >
                    <span style={styles.messageText}>{msg.content}</span>
                  </div>
                  <span style={styles.messageTime}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                {isCurrentUser(msg.userId) && (
                  <span style={styles.avatar}>{currentUser.avatar}</span>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.quickEmojiBar}>
          <span style={styles.quickEmojiLabel}>快捷表情：</span>
          <div style={styles.quickEmojiList}>
            {quickEmojis.map((item) => (
              <button
                key={item.emoji}
                style={styles.quickEmojiBtn}
                onClick={() => handleQuickEmoji(item.emoji, item.label)}
                title={item.label}
              >
                {item.emoji}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.inputContainer}>
          <button
            style={styles.emojiButton}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            😊
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            style={styles.input}
          />
          <button
            style={{
              ...styles.sendButton,
              ...(!inputText.trim() ? styles.sendButtonDisabled : {}),
            }}
            onClick={handleSend}
            disabled={!inputText.trim()}
          >
            发送
          </button>
        </div>

        {showEmojiPicker && (
          <div style={styles.emojiPicker}>
            <div style={styles.emojiPickerTitle}>选择表情</div>
            <div style={styles.emojiGrid}>
              {['😊', '😂', '🥰', '😎', '🤔', '😅', '👍', '👏', '🙏', '💪', '❤️', '🎉', '🚚', '📦', '✅', '⚠️'].map((emoji) => (
                <button
                  key={emoji}
                  style={styles.emojiItem}
                  onClick={() => {
                    setInputText((prev) => prev + emoji)
                    setShowEmojiPicker(false)
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  panel: {
    width: '100%',
    maxWidth: '480px',
    height: '80vh',
    maxHeight: '600px',
    background: 'linear-gradient(180deg, #FFF8F0 0%, #FFE8D6 100%)',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(255,140,66,0.4)',
  },
  header: {
    padding: '16px 20px',
    background: 'linear-gradient(135deg, rgba(255,140,66,0.95) 0%, rgba(255,209,102,0.95) 100%)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: {
    fontSize: '28px',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
    margin: 0,
  },
  headerSubtitle: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.8)',
    margin: 0,
  },
  closeButton: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  emptyIcon: {
    fontSize: '48px',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '14px',
    color: '#9B9B9B',
  },
  messageRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0,
    border: '2px solid rgba(255,140,66,0.2)',
  },
  messageBubbleWrapper: {
    maxWidth: '70%',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  bubbleWrapperLeft: {
    alignItems: 'flex-start',
  },
  bubbleWrapperRight: {
    alignItems: 'flex-end',
  },
  senderName: {
    fontSize: '11px',
    color: '#9B9B9B',
    marginLeft: '4px',
  },
  messageBubble: {
    padding: '10px 14px',
    borderRadius: '16px',
    maxWidth: '100%',
    wordBreak: 'break-word',
  },
  bubbleSelf: {
    background: 'linear-gradient(135deg, #FF8C42 0%, #FFB07C 100%)',
    color: '#fff',
    borderBottomRightRadius: '4px',
  },
  bubbleOther: {
    background: 'rgba(255,255,255,0.9)',
    color: '#3D3D3D',
    borderBottomLeftRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  bubbleEmoji: {
    fontSize: '24px',
    background: 'transparent',
    boxShadow: 'none',
    padding: '4px',
  },
  messageText: {
    fontSize: '14px',
    lineHeight: 1.5,
  },
  messageTime: {
    fontSize: '10px',
    color: '#9B9B9B',
    margin: '0 4px',
  },
  quickEmojiBar: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.5)',
    borderTop: '1px solid rgba(255,140,66,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  quickEmojiLabel: {
    fontSize: '12px',
    color: '#9B9B9B',
    flexShrink: 0,
  },
  quickEmojiList: {
    display: 'flex',
    gap: '4px',
    overflowX: 'auto',
    flex: 1,
  },
  quickEmojiBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.8)',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: '1px solid rgba(255,140,66,0.1)',
  },
  inputContainer: {
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.8)',
    borderTop: '1px solid rgba(255,140,66,0.1)',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  emojiButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(255,140,66,0.1)',
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    padding: '10px 16px',
    border: '1px solid rgba(255,140,66,0.2)',
    borderRadius: '20px',
    fontSize: '14px',
    outline: 'none',
    background: '#fff',
    color: '#3D3D3D',
  },
  sendButton: {
    padding: '10px 20px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #FF8C42 0%, #FFB07C 100%)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
  },
  sendButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  emojiPicker: {
    position: 'absolute',
    bottom: '80px',
    left: '16px',
    background: '#fff',
    borderRadius: '16px',
    padding: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    border: '1px solid rgba(255,140,66,0.2)',
    zIndex: 10,
  },
  emojiPickerTitle: {
    fontSize: '12px',
    color: '#9B9B9B',
    marginBottom: '8px',
  },
  emojiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: '4px',
  },
  emojiItem: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'rgba(255,140,66,0.05)',
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}

export default ChatPanel
