import React, { useState, useRef, useEffect } from 'react';
import { useSceneStore } from '../store/sceneStore';
import { Message } from '../types';
import './ChatWindow.css';

const ChatWindow: React.FC = () => {
  const { activeSceneId, scenes, addMessage, updateMessage, deleteMessage, getMessages } = useSceneStore();
  const [inputValue, setInputValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const activeScene = scenes.find((s) => s.id === activeSceneId) || null;
  const messages = activeSceneId ? getMessages(activeSceneId) : [];

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, activeSceneId, isTyping]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuId) {
        const menuEl = menuRefs.current[openMenuId];
        if (menuEl && !menuEl.contains(e.target as Node)) {
          setOpenMenuId(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const scrollToBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  };

  const handleSend = () => {
    if (!inputValue.trim() || !activeSceneId) return;

    const trimmedContent = inputValue.trim();
    setInputValue('');
    addMessage(activeSceneId, 'user', trimmedContent);

    setIsTyping(true);
    setTimeout(() => {
      const characterNames = activeScene?.name ? `「${activeScene.name}」` : '这个场景';
      const replies = [
        `在${characterNames}的背景下，这是一个很有趣的设定，让我想想如何回应…`,
        `我明白你的意思了。基于这个世界的设定，接下来我们可以继续推进剧情。`,
        `嗯，这个方向不错！结合角色的性格，他们会如何反应呢？`,
        `好的，我来扮演一下这个${characterNames}中的角色，继续我们的故事。`,
        `让我们继续探索这个世界吧！你的行动会带来怎样的结果？`,
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      addMessage(activeSceneId, 'ai', randomReply);
      setIsTyping(false);
    }, 600 + Math.random() * 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEditStart = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
    setOpenMenuId(null);
  };

  const handleEditSave = (messageId: string) => {
    if (editContent.trim()) {
      updateMessage(messageId, editContent.trim());
    }
    setEditingId(null);
    setEditContent('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = (messageId: string) => {
    if (confirm('确定要删除这条消息吗？')) {
      deleteMessage(messageId);
    }
    setOpenMenuId(null);
  };

  const toggleMenu = (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === messageId ? null : messageId);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  if (!activeScene) {
    return (
      <div className="chat-window empty">
        <div className="empty-chat">
          <div className="empty-chat-icon">✨</div>
          <h2>选择一个场景开始你的故事</h2>
          <p>或者创建一个新场景来开始你的角色扮演冒险</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h2>{activeScene.name}</h2>
        <div className="chat-header-info">
          <span className="chat-message-count">{messages.length} 条消息</span>
        </div>
      </div>

      <div className="chat-messages" ref={chatMessagesRef}>
        {messages.length === 0 && (
          <div className="chat-welcome">
            <div className="chat-welcome-icon">💬</div>
            <h3>开始对话</h3>
            <p>基于「{activeScene.name}」的世界设定，开始你的互动叙事吧！</p>
            {activeScene.worldBackground && (
              <div className="chat-world-bg">
                <div className="world-bg-label">世界背景</div>
                <div className="world-bg-content">{activeScene.worldBackground.slice(0, 200)}{activeScene.worldBackground.length > 200 ? '...' : ''}</div>
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-bubble ${msg.role}`}
          >
            {editingId === msg.id ? (
              <div className="message-edit">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  autoFocus
                  className="edit-textarea"
                  rows={3}
                />
                <div className="edit-actions">
                  <button className="edit-save" onClick={() => handleEditSave(msg.id)}>
                    ✓ 保存
                  </button>
                  <button className="edit-cancel" onClick={handleEditCancel}>
                    ✕ 取消
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="message-content">
                  {msg.content}
                  <div className="message-meta">
                    <span className="message-time">{formatTime(msg.timestamp)}</span>
                    {msg.edited && <span className="edited-badge">已编辑</span>}
                  </div>
                </div>
                <div
                  className="message-menu-wrapper"
                  ref={(el) => { menuRefs.current[msg.id] = el; }}
                >
                  <button
                    className="message-menu-btn"
                    onClick={(e) => toggleMenu(msg.id, e)}
                    aria-label="消息操作"
                  >
                    <span className="dots-icon">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                  </button>
                  {openMenuId === msg.id && (
                    <div className="message-menu">
                      <button onClick={() => handleEditStart(msg)} className="menu-item">
                        <span className="menu-icon">✏️</span>
                        <span>编辑消息</span>
                      </button>
                      <button onClick={() => handleDelete(msg.id)} className="menu-item danger">
                        <span className="menu-icon">🗑️</span>
                        <span>删除消息</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="message-bubble ai typing">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，按 Enter 发送，Shift+Enter 换行..."
            className="chat-input"
            rows={1}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!inputValue.trim() || !activeSceneId}
            aria-label="发送消息"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
