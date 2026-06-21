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

function parseMessage(message: string): Array<{ type: 'text' | 'code'; content: string; language?: string }> {
  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = []
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g

  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: message.slice(lastIndex, match.index),
      })
    }

    parts.push({
      type: 'code',
      content: match[2],
      language: match[1] || 'javascript',
    })

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < message.length) {
    parts.push({
      type: 'text',
      content: message.slice(lastIndex),
    })
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', content: message })
  }

  return parts
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <div>
      {language && (
        <div
          style={{
            fontSize: '11px',
            color: '#9CA3AF',
            marginBottom: '4px',
            fontFamily: 'sans-serif',
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
          margin: '8px 0',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '13px',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
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
    <div style={chatStyle}>
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

        {messages.map((msg, index) => {
          const parts = parseMessage(msg.message)
          return (
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
              <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#D1D5DB' }}>
                {parts.map((part, i) => {
                  if (part.type === 'code') {
                    return <CodeBlock key={i} code={part.content} language={part.language || 'javascript'} />
                  }
                  return <span key={i}>{part.content}</span>
                })}
              </div>
            </div>
          )
        })}
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
            placeholder="输入消息..."
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
