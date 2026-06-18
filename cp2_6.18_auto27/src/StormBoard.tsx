import { useState, useEffect, useRef } from 'react';
import type { Meeting } from './types';

function hashColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

function hashGradient(id: string): string {
  const color1 = hashColor(id);
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) * 2 + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const color2 = `hsl(${hue}, 70%, 45%)`;
  return `linear-gradient(135deg, ${color1}, ${color2})`;
}

function formatTimeRemaining(deadline: string, isClosed: boolean): string {
  if (isClosed) return '已结束';
  
  const now = new Date().getTime();
  const deadlineTime = new Date(deadline).getTime();
  const diff = deadlineTime - now;
  
  if (diff <= 0) return '已结束';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}天${hours}小时后截止`;
  } else if (hours > 0) {
    return `${hours}小时${minutes}分钟后截止`;
  } else {
    return `${minutes}分钟后截止`;
  }
}

interface StormBoardProps {
  onEnterMeeting: (meetingId: string) => void;
}

export default function StormBoard({ onEnterMeeting }: StormBoardProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');
  const [, forceUpdate] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      forceUpdate(n => n + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/meetings');
      const data = await res.json();
      setMeetings(data);
    } catch (err) {
      console.error('获取会议列表失败', err);
    }
  };

  const handleCreateMeeting = async () => {
    setError('');
    
    if (!title.trim()) {
      setError('请输入会议标题');
      return;
    }
    
    if (title.length > 30) {
      setError('会议标题最多30个字符');
      return;
    }
    
    if (!deadline) {
      setError('请选择投票截止时间');
      return;
    }
    
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          deadline: new Date(deadline).toISOString(),
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }
      
      setShowModal(false);
      setTitle('');
      setDescription('');
      setDeadline('');
      fetchMeetings();
    } catch (err) {
      setError('创建会议失败');
    }
  };

  const gridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
    minWidth: '320px',
  };

  const cardStyles: React.CSSProperties = {
    width: '100%',
    maxWidth: '280px',
    borderRadius: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.35s ease-out, box-shadow 0.35s ease-out',
    color: '#1f2937',
  };

  const cardHoverStyles: React.CSSProperties = {
    transform: 'translateY(-5px)',
    boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
  };

  const gradientBarStyles: React.CSSProperties = {
    height: '8px',
    width: '100%',
  };

  const cardContentStyles: React.CSSProperties = {
    padding: '16px 20px 20px',
  };

  const cardTitleStyles: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 8px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const cardDescStyles: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.5,
    margin: '0 0 16px 0',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    minHeight: '42px',
  };

  const timeRemainingStyles: React.CSSProperties = {
    fontSize: '13px',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const createButtonStyles: React.CSSProperties = {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    minWidth: '44px',
    minHeight: '44px',
    transition: 'background-color 0.2s',
  };

  const headerRowStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  };

  const pageTitleStyles: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 600,
    color: '#f9fafb',
    margin: 0,
  };

  const modalOverlayStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  };

  const modalStyles: React.CSSProperties = {
    backgroundColor: '#1f2937',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '480px',
    border: '1px solid #374151',
  };

  const modalTitleStyles: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 600,
    color: '#f9fafb',
    margin: '0 0 20px 0',
  };

  const inputGroupStyles: React.CSSProperties = {
    marginBottom: '16px',
  };

  const labelStyles: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    color: '#9ca3af',
    marginBottom: '8px',
  };

  const inputStyles: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    backgroundColor: '#111827',
    color: '#f9fafb',
    border: '1px solid #374151',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    minHeight: '44px',
  };

  const textareaStyles: React.CSSProperties = {
    ...inputStyles,
    minHeight: '80px',
    resize: 'vertical',
    fontFamily: 'inherit',
  };

  const buttonRowStyles: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  };

  const cancelButtonStyles: React.CSSProperties = {
    flex: 1,
    padding: '12px',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    border: '1px solid #374151',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    minHeight: '44px',
  };

  const submitButtonStyles: React.CSSProperties = {
    flex: 1,
    padding: '12px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    minHeight: '44px',
  };

  const errorStyles: React.CSSProperties = {
    color: '#ef4444',
    fontSize: '13px',
    marginTop: '8px',
  };

  const charCountStyles: React.CSSProperties = {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'right',
    marginTop: '4px',
  };

  const closedBadgeStyles: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  };

  return (
    <div>
      <div style={headerRowStyles}>
        <h2 style={pageTitleStyles}>我的会议</h2>
        <button style={createButtonStyles} onClick={() => setShowModal(true)}>
          + 创建新会议
        </button>
      </div>

      <div ref={listRef} style={gridStyles}>
        {meetings.map(meeting => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            onClick={() => onEnterMeeting(meeting.id)}
          />
        ))}
        {meetings.length === 0 && (
          <div style={{ color: '#6b7280', gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            暂无会议，点击上方按钮创建第一个头脑风暴会议
          </div>
        )}
      </div>

      {showModal && (
        <div style={modalOverlayStyles} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={modalStyles}>
            <h3 style={modalTitleStyles}>创建新会议</h3>
            
            <div style={inputGroupStyles}>
              <label style={labelStyles}>会议标题</label>
              <input
                type="text"
                style={inputStyles}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入会议标题（最多30字符）"
                maxLength={30}
              />
              <div style={charCountStyles}>{title.length}/30</div>
            </div>
            
            <div style={inputGroupStyles}>
              <label style={labelStyles}>会议描述</label>
              <textarea
                style={textareaStyles}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述本次头脑风暴的主题和目标"
                rows={3}
              />
            </div>
            
            <div style={inputGroupStyles}>
              <label style={labelStyles}>投票截止时间</label>
              <input
                type="datetime-local"
                style={inputStyles}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            
            {error && <div style={errorStyles}>{error}</div>}
            
            <div style={buttonRowStyles}>
              <button style={cancelButtonStyles} onClick={() => setShowModal(false)}>
                取消
              </button>
              <button style={submitButtonStyles} onClick={handleCreateMeeting}>
                创建会议
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MeetingCard({ meeting, onClick }: { meeting: Meeting; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  const cardStyles: React.CSSProperties = {
    width: '100%',
    maxWidth: '280px',
    borderRadius: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.35s ease-out, box-shadow 0.35s ease-out',
    color: '#1f2937',
    transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
    boxShadow: isHovered ? '0 8px 20px rgba(0,0,0,0.12)' : 'none',
  };

  const gradientBarStyles: React.CSSProperties = {
    height: '8px',
    width: '100%',
    background: hashGradient(meeting.id),
  };

  const cardContentStyles: React.CSSProperties = {
    padding: '16px 20px 20px',
  };

  const cardTitleStyles: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 8px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const cardDescStyles: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.5,
    margin: '0 0 16px 0',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    minHeight: '42px',
  };

  const timeRemainingStyles: React.CSSProperties = {
    fontSize: '13px',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const closedBadgeStyles: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  };

  const isClosed = meeting.isClosed || new Date(meeting.deadline) <= new Date();

  return (
    <div
      style={cardStyles}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={gradientBarStyles}></div>
      <div style={cardContentStyles}>
        <h3 style={cardTitleStyles}>{meeting.title}</h3>
        <p style={cardDescStyles}>
          {meeting.description || '暂无描述'}
        </p>
        <div style={timeRemainingStyles}>
          {isClosed ? (
            <span style={closedBadgeStyles}>已结束</span>
          ) : (
            <>
              <span>⏰</span>
              <span>{formatTimeRemaining(meeting.deadline, meeting.isClosed)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
