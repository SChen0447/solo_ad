import { useState, useRef, useEffect } from 'react'

interface ChatMessage {
  userId: string
  username: string
  message: string
  timestamp: number
}

interface ChatProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  onlineCount: number
  isMobileExpanded?: boolean
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

type MessagePart =
  | { type: 'text'; content: string }
  | { type: 'code'; content: string; language: string }

function parseMessage(message: string): MessagePart[] {
  const parts: MessagePart[] = []
  if (!message) {
    return parts
  }

  const regex = /```(\w*)\r?\n([\s\S]*?)```/g
  let lastEnd = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(message)) !== null) {
    if (match.index > lastEnd) {
      const textContent = message.slice(lastEnd, match.index)
      if (textContent.length > 0) {
        parts.push({ type: 'text', content: textContent })
      }
    }

    const language = (match[1] || '').trim() || 'javascript'
    const codeContent = match[2].replace(/\r?\n$/, '')
    parts.push({ type: 'code', content: codeContent, language })

    lastEnd = regex.lastIndex
  }

  if (lastEnd < message.length) {
    const remaining = message.slice(lastEnd)
    if (remaining.length > 0) {
      parts.push({ type: 'text', content: remaining })
    }
  }

  if (parts.length === 0 && message.length > 0) {
    parts.push({ type: 'text', content: message })
  }

  return parts
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <div style={{ marginTop: '4px', marginBottom: '4px' }}>
      {language && (
        <div
          style={{
            fontSize: '11px',
            color: '#9CA3AF',
            marginBottom: '4px',
            fontFamily: 'sans-serif',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {language}
        </div>
      )}
      <pre
        style={{
          backgroundColor: '#1A1A2E',
          color: '#E2E8F0',
          padding: '12px',
          borderRadius: '6px',
          overflowX: 'auto',
          margin: 0,
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '13px',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          border: '1px solid #2D2D3F',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}

function MessageContent({ content }: { content: string }) {
  const parts = parseMessage(content)

  if (parts.length === 0) {
    return null
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'code') {
          return <CodeBlock key={i} code={part.content} language={part.language} />
        }
        return (
          <span key={i} style={{ whiteSpace: 'pre-wrap' }}>
            {part.content}
          </span>
        )
      })}
    </>
  )
}

export default function Chat({ messages, onSendMessage, onlineCount, isMobileExpanded }: ChatProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim())
      setInputValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const chatStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#2D2D3F',
    color: '#E5E7EB',
    overflow: 'hidden',
  }

  if (isMobileExpanded !== undefined) {
    chatStyle.transition = 'height 0.3s ease'
    chatStyle.height = isMobileExpanded ? '200px' : '0'
    chatStyle.overflow = isMobileExpanded ? 'hidden' : 'hidden'
  }

  return (
    <div style={chatStyle} className={isMobileExpanded !== undefined ? (isMobileExpanded ? 'chat-expanded' : 'chat-collapsed') : ''}>
      <style>{`
        @keyframes slideDown {
          from { height: 0; opacity: 0; }
          to { height: 200px; opacity: 1; }
        }
        @keyframes slideUp {
          from { height: 200px; opacity: 1; }
          to { height: 0; opacity: 0; }
        }
        .chat-expanded {
          animation: slideDown 0.3s ease forwards;
        }
        .chat-collapsed {
          animation: slideUp 0.3s ease forwards;
        }
      `}</style>
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #4B5563',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#F3F4F6' }}>
          房间聊天
        </h3>
        <span
          style={{
            fontSize: '12px',
            color: '#9CA3AF',
            backgroundColor: '#374151',
            padding: '4px 10px',
            borderRadius: '12px',
          }}
        >
          {onlineCount} 人在线
        </span>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '12px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#4B5563 transparent',
          minHeight: 0,
        }}
        className="chat-messages"
      >
        <style>{`
          .chat-messages::-webkit-scrollbar {
            width: 6px;
          }
          .chat-messages::-webkit-scrollbar-track {
            background: transparent;
          }
          .chat-messages::-webkit-scrollbar-thumb {
            background-color: #4B5563;
            border-radius: 3px;
          }
        `}</style>

        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#6B7280',
              fontSize: '13px',
              padding: '20px',
            }}
          >
            暂无消息，开始聊天吧
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: '12px',
              wordBreak: 'break-word',
            }}
          >
            <div
              style={{
                marginBottom: '4px',
                fontSize: '13px',
              }}
            >
              <span style={{ color: '#60A5FA', fontWeight: 500 }}>
                {msg.username}
              </span>
              <span style={{ color: '#9CA3AF', marginLeft: '8px', fontSize: '12px' }}>
                {formatTime(msg.timestamp)}
              </span>
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#D1D5DB' }}>
              <MessageContent content={msg.message} />
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          padding: '12px',
          borderTop: '1px solid #4B5563',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (支持```包裹代码块)"
            style={{
              flex: 1,
              padding: '10px 12px',
              backgroundColor: '#374151',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            style={{
              padding: '10px 16px',
              backgroundColor: '#60A5FA',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 500,
              opacity: inputValue.trim() ? 1 : 0.5,
            }}
          >
            发送
          </button>
        </div>
      </form>
    </div>
  )
}
