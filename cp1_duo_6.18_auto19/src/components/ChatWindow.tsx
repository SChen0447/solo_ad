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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeScene = scenes.find((s) => s.id === activeSceneId) || null;
  const messages = activeSceneId ? getMessages(activeSceneId) : [];

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, activeSceneId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    if (!inputValue.trim() || !activeSceneId) return;

    addMessage(activeSceneId, 'user', inputValue.trim());
    setInputValue('');

    setTimeout(() => {
      const replies = [
        '这是一个很有趣的设定，让我想想怎么回应…',
        '我明白你的意思，接下来我们可以继续推进剧情。',
        '嗯，这个方向不错，角色们会如何反应呢？',
        '好的，我来扮演一下这个场景中的角色。',
        '让我们继续探索这个世界吧！',
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      addMessage(activeSceneId, 'ai', randomReply);
    }, 500 + Math.random() * 500);
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
    deleteMessage(messageId);
    setOpenMenuId(null);
  };

  const toggleMenu = (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === messageId ? null : messageId);
  };

  if (!activeScene) {
    return (
      <div className="chat-window empty">
        <div className="empty-chat">
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
      </div>

      <div className="chat-messages">
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
                    保存
                  </button>
                  <button className="edit-cancel" onClick={handleEditCancel}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="message-content">
                  {msg.content}
                  {msg.edited && <span className="edited-badge">(已编辑)</span>}
                </div>
                <div className="message-menu-wrapper" ref={openMenuId === msg.id ? menuRef : null}>
                  <button
                    className="message-menu-btn"
                    onClick={(e) => toggleMenu(msg.id, e)}
                  >
                    ⋮
                  </button>
                  {openMenuId === msg.id && (
                    <div className="message-menu">
                      <button onClick={() => handleEditStart(msg)}>编辑</button>
                      <button className="danger" onClick={() => handleDelete(msg.id)}>
                        删除
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，按 Enter 发送..."
            className="chat-input"
            rows={1}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!inputValue.trim() || !activeSceneId}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
