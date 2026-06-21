import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import '../styles/chatpanel.css';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentUserId: string;
}

function ChatPanel({ messages, onSendMessage, currentUserId }: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message ${msg.type === 'system' ? 'system' : ''} ${msg.userId === currentUserId ? 'own' : ''}`}
          >
            {msg.type === 'system' ? (
              <div className="system-message">
                {msg.text}
              </div>
            ) : (
              <>
                <div
                  className="chat-avatar"
                  style={{ backgroundColor: msg.avatarColor }}
                >
                  {msg.nickname.charAt(0).toUpperCase()}
                </div>
                <div className="chat-content">
                  <div className="chat-meta">
                    <span className="chat-name">{msg.nickname}</span>
                    <span className="chat-time">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="chat-bubble">
                    {msg.text}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          placeholder="发送消息..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button type="submit" className="chat-send-btn">
          发送
        </button>
      </form>
    </div>
  );
}

export default ChatPanel;
