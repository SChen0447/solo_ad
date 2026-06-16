import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import axios from 'axios';
import { ChatMessage } from '../types';

interface Props {
  voteId: string;
  userId?: string;
  socket: Socket | null;
  visible: boolean;
  isMobile: boolean;
  onClose: () => void;
}

const EMOJI_LIST = ['😀', '😂', '😍', '🤔', '👍', '👎', '🎉', '🔥', '❤️', '💯', '😎', '🙏', '👏', '✨', '💪', '🌟'];

export default function ChatPanel({ voteId, socket, visible, isMobile, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nickname, setNickname] = useState(() => localStorage.getItem('chat_nickname_' + voteId) || '');
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadNickRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (loadNickRef.current !== voteId) {
      loadNickRef.current = voteId;
      const saved = localStorage.getItem('chat_nickname_' + voteId) || '';
      setNickname(saved);
    }
    axios.get<ChatMessage[]>(`/api/votes/${voteId}/messages`).then(res => {
      setMessages(res.data);
    });
    let cleanup: (() => void) | undefined;
    if (socket) {
      const handler = (msg: ChatMessage) => {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      };
      socket.on('new_message', handler);
      cleanup = () => socket.off('new_message', handler);
    }
    return () => { cleanup?.(); };
  }, [voteId, visible, socket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, visible]);

  const handleSend = () => {
    if (!input.trim() || !socket) return;
    const name = nickname.trim();
    localStorage.setItem('chat_nickname_' + voteId, name);
    socket.emit('send_message', {
      vote_id: voteId,
      nickname: name,
      content: input.trim(),
    });
    setInput('');
    setShowEmoji(false);
  };

  const insertEmoji = (emoji: string) => {
    setInput(prev => prev + emoji);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const isSelf = (msg: ChatMessage) => {
    const myNick = nickname.trim() || '匿名';
    return msg.nickname === myNick;
  };

  if (!visible) return null;

  const panelStyle: React.CSSProperties = isMobile ? {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70vh',
    background: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 40,
    animation: 'slideInUp 0.3s ease',
  } : {
    position: 'fixed',
    top: 0,
    right: 0,
    width: 360,
    height: '100vh',
    background: '#fff',
    borderLeft: '1px solid #E5E7EB',
    boxShadow: '-4px 0 14px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 40,
    animation: 'slideInRight 0.3s ease',
  };

  return (
    <div style={panelStyle}>
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#F8FAFC',
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F2937' }}>💬 匿名讨论</h3>
        <button onClick={onClose} style={{
          background: 'transparent',
          color: '#6B7280',
          fontSize: 18,
          padding: 4,
        }}>✕</button>
      </div>

      <div style={{ padding: '10px 16px', borderBottom: '1px solid #F3F4F6' }}>
        <input
          type="text"
          value={nickname}
          onChange={e => setNickname(e.target.value.slice(0, 20))}
          placeholder="昵称（留空为匿名）"
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #E5E7EB',
            fontSize: 13,
          }}
        />
      </div>

      <div ref={scrollRef} style={{
        flex: 1,
        overflowY: 'auto',
        padding: 14,
        background: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: 30 }}>
            暂无消息，发送第一条吧～
          </div>
        )}
        {messages.map(msg => {
          const self = isSelf(msg);
          return (
            <div key={msg.id} style={{
              display: 'flex',
              justifyContent: self ? 'flex-end' : 'flex-start',
              animation: 'fadeIn 0.3s ease',
            }}>
              <div style={{ maxWidth: '78%' }}>
                <div style={{
                  fontSize: 11,
                  color: '#9CA3AF',
                  marginBottom: 3,
                  textAlign: self ? 'right' : 'left',
                  padding: '0 6px',
                }}>
                  {msg.nickname} · {formatTime(msg.created_at)}
                </div>
                <div style={{
                  padding: '9px 13px',
                  borderRadius: 16,
                  fontSize: 14,
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                  background: self ? '#3B82F6' : '#E5E7EB',
                  color: self ? '#fff' : '#1F2937',
                  borderBottomRightRadius: self ? 4 : 16,
                  borderBottomLeftRadius: self ? 16 : 4,
                }}>{msg.content}</div>
              </div>
            </div>
          );
        })}
      </div>

      {showEmoji && (
        <div style={{
          padding: 8,
          borderTop: '1px solid #F3F4F6',
          background: '#fff',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
        }}>
          {EMOJI_LIST.map(e => (
            <button key={e} onClick={() => insertEmoji(e)} style={{
              fontSize: 20,
              background: '#F3F4F6',
              borderRadius: 6,
              padding: '4px 8px',
            }}>{e}</button>
          ))}
        </div>
      )}

      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid #E5E7EB',
        background: '#fff',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}>
        <button onClick={() => setShowEmoji(!showEmoji)} style={{
          fontSize: 18,
          padding: '6px 8px',
          borderRadius: 8,
          background: '#F3F4F6',
        }}>😊</button>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          placeholder="说点什么..."
          style={{
            flex: 1,
            padding: '9px 12px',
            borderRadius: 8,
            border: '1px solid #E5E7EB',
            fontSize: 14,
          }}
        />
        <button onClick={handleSend} disabled={!input.trim()} style={{
          padding: '9px 16px',
          borderRadius: 8,
          background: input.trim() ? '#3B82F6' : '#D1D5DB',
          color: '#fff',
          fontWeight: 500,
          fontSize: 13,
        }}>发送</button>
      </div>
    </div>
  );
}
