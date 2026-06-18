import { useState, useEffect, useRef, useCallback } from 'react';
import type { Meeting, Idea } from './types';

function hashColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

interface MeetingRoomProps {
  meetingId: string;
  userId: string;
  onMeetingLoad?: (meeting: Meeting) => void;
}

export default function MeetingRoom({ meetingId, userId, onMeetingLoad }: MeetingRoomProps) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [displayedIdeas, setDisplayedIdeas] = useState<Idea[]>([]);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaDesc, setNewIdeaDesc] = useState('');
  const [error, setError] = useState('');
  const [votingIdeaId, setVotingIdeaId] = useState<string | null>(null);
  const [userVotesLeft, setUserVotesLeft] = useState(5);
  const [voterCount, setVoterCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const sortIdeas = useCallback((ideasList: Idea[]): Idea[] => {
    return [...ideasList].sort((a, b) => {
      if (b.votes !== a.votes) {
        return b.votes - a.votes;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, []);

  useEffect(() => {
    fetchMeeting();
    fetchIdeas();
    fetchVoterCount();
  }, [meetingId]);

  useEffect(() => {
    if (meeting && onMeetingLoad) {
      onMeetingLoad(meeting);
    }
  }, [meeting, onMeetingLoad]);

  useEffect(() => {
    if (ideas.length > 0) {
      const sorted = sortIdeas(ideas);
      setDisplayedIdeas(sorted.slice(0, 20));
    }
  }, [ideas, sortIdeas]);

  useEffect(() => {
    if (meeting) {
      const isClosed = meeting.isClosed || new Date(meeting.deadline) <= new Date();
      if (!isClosed) {
        const timer = setInterval(() => {
          updateTimeLeft();
        }, 1000);
        updateTimeLeft();
        return () => clearInterval(timer);
      } else {
        setTimeLeft('已结束');
      }
    }
  }, [meeting]);

  useEffect(() => {
    const votedIdeas = ideas.filter(i => i.votedBy.includes(userId));
    setUserVotesLeft(5 - votedIdeas.length);
  }, [ideas, userId]);

  const updateTimeLeft = () => {
    if (!meeting) return;
    const now = new Date().getTime();
    const deadlineTime = new Date(meeting.deadline).getTime();
    const diff = deadlineTime - now;
    
    if (diff <= 0) {
      setTimeLeft('已结束');
      setMeeting(m => m ? { ...m, isClosed: true } : null);
      return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 0) {
      setTimeLeft(`${days}天 ${hours}时 ${minutes}分 ${seconds}秒`);
    } else if (hours > 0) {
      setTimeLeft(`${hours}时 ${minutes}分 ${seconds}秒`);
    } else if (minutes > 0) {
      setTimeLeft(`${minutes}分 ${seconds}秒`);
    } else {
      setTimeLeft(`${seconds}秒`);
    }
  };

  const fetchMeeting = async () => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}`);
      const data = await res.json();
      const meetingData = { ...data };
      delete meetingData.ideas;
      setMeeting(meetingData);
    } catch (err) {
      console.error('获取会议信息失败', err);
    }
  };

  const fetchIdeas = async () => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}/ideas`);
      const data = await res.json();
      setIdeas(data);
    } catch (err) {
      console.error('获取点子列表失败', err);
    }
  };

  const fetchVoterCount = async () => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}/voters`);
      const data = await res.json();
      setVoterCount(data.voterCount);
    } catch (err) {
      console.error('获取投票人数失败', err);
    }
  };

  const handleAddIdea = async () => {
    setError('');
    
    if (!newIdeaTitle.trim()) {
      setError('请输入点子标题');
      return;
    }
    
    if (newIdeaTitle.length > 60) {
      setError('点子标题最多60个字符');
      return;
    }
    
    if (newIdeaDesc.length > 200) {
      setError('说明文字最多200个字符');
      return;
    }
    
    try {
      const res = await fetch(`/api/meetings/${meetingId}/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newIdeaTitle.trim(),
          description: newIdeaDesc.trim(),
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }
      
      const newIdea = await res.json();
      setIdeas(prev => [...prev, newIdea]);
      setNewIdeaTitle('');
      setNewIdeaDesc('');
      setShowAddForm(false);
    } catch (err) {
      setError('添加点子失败');
    }
  };

  const handleVote = async (ideaId: string) => {
    if (votingIdeaId) return;
    
    const idea = ideas.find(i => i.id === ideaId);
    if (!idea || idea.votedBy.includes(userId)) return;
    if (userVotesLeft <= 0) return;
    
    setVotingIdeaId(ideaId);
    
    try {
      const res = await fetch(`/api/ideas/${ideaId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        setVotingIdeaId(null);
        return;
      }
      
      const updatedIdea = await res.json();
      setIdeas(prev => prev.map(i => i.id === ideaId ? updatedIdea : i));
      fetchVoterCount();
      
      setTimeout(() => {
        setVotingIdeaId(null);
      }, 300);
    } catch (err) {
      setError('投票失败');
      setVotingIdeaId(null);
    }
  };

  const handleEndMeeting = async () => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}/close`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        setError('结束会议失败');
        return;
      }
      
      const updatedMeeting = await res.json();
      setMeeting(updatedMeeting);
    } catch (err) {
      setError('结束会议失败');
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    
    if (bottom && !loadingMore && displayedIdeas.length < ideas.length) {
      loadMoreIdeas();
    }
  };

  const loadMoreIdeas = () => {
    setLoadingMore(true);
    setTimeout(() => {
      const sorted = sortIdeas(ideas);
      const currentCount = displayedIdeas.length;
      const nextCount = Math.min(currentCount + 20, sorted.length);
      setDisplayedIdeas(sorted.slice(0, nextCount));
      setLoadingMore(false);
    }, 100);
  };

  const generateReportText = (): string => {
    if (!meeting) return '';
    const sortedIdeas = sortIdeas(ideas);
    let text = `会议决策报告\n`;
    text += `================\n\n`;
    text += `会议标题：${meeting.title}\n`;
    text += `参与投票人数：${voterCount}人\n`;
    text += `点子总数：${ideas.length}个\n\n`;
    text += `点子排名（按票数排序）：\n`;
    text += `--------------------\n`;
    sortedIdeas.forEach((idea, index) => {
      text += `${index + 1}. ${idea.title} - ${idea.votes}票\n`;
    });
    return text;
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(generateReportText());
      alert('报告已复制到剪贴板');
    } catch (err) {
      console.error('复制失败', err);
    }
  };

  const isMeetingClosed = meeting?.isClosed || (meeting && new Date(meeting.deadline) <= new Date());

  const top3Ids = displayedIdeas.slice(0, 3).map(i => i.id);

  if (!meeting) {
    return <div style={{ color: '#9ca3af' }}>加载中...</div>;
  }

  const meetingHeaderStyles: React.CSSProperties = {
    backgroundColor: '#1f2937',
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '24px',
    border: '1px solid #374151',
  };

  const meetingTitleStyles: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: '#f9fafb',
    margin: '0 0 8px 0',
  };

  const meetingDescStyles: React.CSSProperties = {
    fontSize: '14px',
    color: '#9ca3af',
    margin: '0 0 16px 0',
    lineHeight: 1.6,
  };

  const meetingMetaStyles: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '24px',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const metaItemStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#9ca3af',
  };

  const timerStyles: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: isMeetingClosed ? '#6b7280' : '#f59e0b',
    fontFamily: 'monospace',
  };

  const votesRemainingStyles: React.CSSProperties = {
    padding: '4px 12px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500,
  };

  const endButtonStyles: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: isMeetingClosed ? 'transparent' : '#ef4444',
    color: isMeetingClosed ? '#6b7280' : '#ffffff',
    border: isMeetingClosed ? '1px solid #374151' : 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: isMeetingClosed ? 'default' : 'pointer',
    minHeight: '44px',
    minWidth: '44px',
  };

  const addButtonStyles: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    backgroundColor: 'transparent',
    color: '#3b82f6',
    border: '2px dashed #374151',
    borderRadius: '12px',
    fontSize: '15px',
    cursor: 'pointer',
    marginBottom: '20px',
    minHeight: '52px',
    transition: 'all 0.2s',
  };

  const addFormStyles: React.CSSProperties = {
    backgroundColor: '#1f2937',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid #374151',
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
    marginBottom: '12px',
  };

  const textareaStyles: React.CSSProperties = {
    ...inputStyles,
    minHeight: '80px',
    resize: 'vertical',
    fontFamily: 'inherit',
  };

  const formButtonRowStyles: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  };

  const formCancelBtnStyles: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    border: '1px solid #374151',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    minHeight: '44px',
  };

  const formSubmitBtnStyles: React.CSSProperties = {
    padding: '10px 24px',
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
    marginBottom: '12px',
  };

  const charCountStyles: React.CSSProperties = {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'right',
    marginTop: '-8px',
    marginBottom: '12px',
  };

  const ideasListStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: 'calc(100vh - 400px)',
    overflowY: 'auto',
    padding: '4px',
  };

  const sectionTitleStyles: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#f9fafb',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const top3SectionStyles: React.CSSProperties = {
    marginBottom: '24px',
  };

  const reportSectionStyles: React.CSSProperties = {
    marginTop: '32px',
  };

  const reportCardStyles: React.CSSProperties = {
    backgroundColor: '#1f2937',
    borderRadius: '16px',
    padding: '24px',
    border: '2px solid #f59e0b',
  };

  const reportTitleStyles: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: '#f59e0b',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const reportStatsStyles: React.CSSProperties = {
    display: 'flex',
    gap: '32px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  };

  const reportStatItemStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  const reportStatLabelStyles: React.CSSProperties = {
    fontSize: '13px',
    color: '#9ca3af',
  };

  const reportStatValueStyles: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: '#f9fafb',
  };

  const reportListStyles: React.CSSProperties = {
    marginTop: '16px',
  };

  const reportItemStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#111827',
    borderRadius: '8px',
    marginBottom: '8px',
  };

  const reportRankStyles: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#374151',
    color: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    marginRight: '16px',
    flexShrink: 0,
  };

  const reportItemTitleStyles: React.CSSProperties = {
    flex: 1,
    fontSize: '14px',
    color: '#f9fafb',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const reportItemVotesStyles: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#3b82f6',
    minWidth: '60px',
    textAlign: 'right',
  };

  const copyButtonStyles: React.CSSProperties = {
    padding: '12px 24px',
    backgroundColor: '#f59e0b',
    color: '#1f2937',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    minHeight: '44px',
    marginTop: '20px',
  };

  const loadMoreStyles: React.CSSProperties = {
    textAlign: 'center',
    padding: '16px',
    color: '#6b7280',
    fontSize: '14px',
  };

  return (
    <div>
      <div style={meetingHeaderStyles}>
        <h2 style={meetingTitleStyles}>{meeting.title}</h2>
        <p style={meetingDescStyles}>{meeting.description || '暂无描述'}</p>
        <div style={meetingMetaStyles}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={metaItemStyles}>
              <span>⏱️</span>
              <span style={timerStyles}>{timeLeft}</span>
            </div>
            <div style={metaItemStyles}>
              <span>💡</span>
              <span>{ideas.length} 个点子</span>
            </div>
            <div style={metaItemStyles}>
              <span>👥</span>
              <span>{voterCount} 人参与</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={votesRemainingStyles}>剩余 {userVotesLeft} 票</span>
            {!isMeetingClosed && (
              <button style={endButtonStyles} onClick={handleEndMeeting}>
                结束投票
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div style={errorStyles}>{error}</div>}

      {!isMeetingClosed && (
        showAddForm ? (
          <div style={addFormStyles}>
            <input
              type="text"
              style={inputStyles}
              value={newIdeaTitle}
              onChange={(e) => setNewIdeaTitle(e.target.value)}
              placeholder="输入点子标题（最多60字符）"
              maxLength={60}
            />
            <div style={charCountStyles}>{newIdeaTitle.length}/60</div>
            <textarea
              style={textareaStyles}
              value={newIdeaDesc}
              onChange={(e) => setNewIdeaDesc(e.target.value)}
              placeholder="补充说明（最多200字，可选）"
              rows={3}
              maxLength={200}
            />
            <div style={charCountStyles}>{newIdeaDesc.length}/200</div>
            <div style={formButtonRowStyles}>
              <button style={formCancelBtnStyles} onClick={() => setShowAddForm(false)}>
                取消
              </button>
              <button style={formSubmitBtnStyles} onClick={handleAddIdea}>
                添加点子
              </button>
            </div>
          </div>
        ) : (
          <button style={addButtonStyles} onClick={() => setShowAddForm(true)}>
            + 添加新点子
          </button>
        )
      )}

      {displayedIdeas.length > 0 && displayedIdeas.slice(0, 3).some(i => i.votes > 0) && (
        <div style={top3SectionStyles}>
          <h3 style={sectionTitleStyles}>🏆 热门点子</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {displayedIdeas
              .filter(i => i.votes > 0)
              .slice(0, 3)
              .map((idea, index) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  rank={index + 1}
                  isTop3={true}
                  isVoting={votingIdeaId === idea.id}
                  hasVoted={idea.votedBy.includes(userId)}
                  canVote={userVotesLeft > 0 && !isMeetingClosed}
                  isClosed={isMeetingClosed || false}
                  onVote={handleVote}
                  expanded={expandedId === idea.id}
                  onToggleExpand={() => setExpandedId(expandedId === idea.id ? null : idea.id)}
                />
              ))}
          </div>
        </div>
      )}

      <h3 style={sectionTitleStyles}>全部点子</h3>
      <div
        ref={listRef}
        style={ideasListStyles}
        onScroll={handleScroll}
      >
        {displayedIdeas.map(idea => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            isTop3={top3Ids.includes(idea.id) && idea.votes > 0}
            isVoting={votingIdeaId === idea.id}
            hasVoted={idea.votedBy.includes(userId)}
            canVote={userVotesLeft > 0 && !isMeetingClosed}
            isClosed={isMeetingClosed || false}
            onVote={handleVote}
            expanded={expandedId === idea.id}
            onToggleExpand={() => setExpandedId(expandedId === idea.id ? null : idea.id)}
          />
        ))}
        {loadingMore && (
          <div style={loadMoreStyles}>加载中...</div>
        )}
        {displayedIdeas.length >= ideas.length && ideas.length > 0 && (
          <div style={loadMoreStyles}>已显示全部 {ideas.length} 个点子</div>
        )}
        {ideas.length === 0 && (
          <div style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
            暂无点子，快来添加第一个吧！
          </div>
        )}
      </div>

      {isMeetingClosed && (
        <div style={reportSectionStyles}>
          <div style={reportCardStyles}>
            <h3 style={reportTitleStyles}>📊 决策报告</h3>
            <div style={reportStatsStyles}>
              <div style={reportStatItemStyles}>
                <span style={reportStatLabelStyles}>会议标题</span>
                <span style={{ ...reportStatValueStyles, fontSize: '18px' }}>{meeting.title}</span>
              </div>
              <div style={reportStatItemStyles}>
                <span style={reportStatLabelStyles}>参与投票人数</span>
                <span style={reportStatValueStyles}>{voterCount} 人</span>
              </div>
              <div style={reportStatItemStyles}>
                <span style={reportStatLabelStyles}>点子总数</span>
                <span style={reportStatValueStyles}>{ideas.length} 个</span>
              </div>
            </div>
            <div style={reportListStyles}>
              {sortIdeas(ideas).map((idea, index) => (
                <div key={idea.id} style={reportItemStyles}>
                  <div style={{
                    ...reportRankStyles,
                    backgroundColor: index < 3 ? '#f59e0b' : '#374151',
                    color: index < 3 ? '#1f2937' : '#f9fafb',
                  }}>
                    {index + 1}
                  </div>
                  <span style={reportItemTitleStyles}>{idea.title}</span>
                  <span style={reportItemVotesStyles}>{idea.votes} 票</span>
                </div>
              ))}
            </div>
            <button style={copyButtonStyles} onClick={copyReport}>
              📋 复制报告为纯文本
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface IdeaCardProps {
  idea: Idea;
  rank?: number;
  isTop3: boolean;
  isVoting: boolean;
  hasVoted: boolean;
  canVote: boolean;
  isClosed: boolean;
  onVote: (ideaId: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

function IdeaCard({
  idea,
  rank,
  isTop3,
  isVoting,
  hasVoted,
  canVote,
  isClosed,
  onVote,
  expanded,
  onToggleExpand,
}: IdeaCardProps) {
  const sideColor = hashColor(idea.id);
  
  const cardStyles: React.CSSProperties = {
    width: '100%',
    borderRadius: '12px',
    backgroundColor: '#f9fafb',
    padding: '16px 18px',
    boxSizing: 'border-box',
    border: isTop3 ? '2px solid #f59e0b' : '1px solid transparent',
    display: 'flex',
    alignItems: 'stretch',
    gap: '14px',
    position: 'relative',
  };

  const sideBarStyles: React.CSSProperties = {
    width: '4px',
    minHeight: '100%',
    borderRadius: '2px',
    backgroundColor: sideColor,
    flexShrink: 0,
  };

  const contentStyles: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const titleRowStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  };

  const titleStyles: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1f2937',
    margin: 0,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const votesBadgeStyles: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 700,
    color: '#3b82f6',
    backgroundColor: '#dbeafe',
    padding: '4px 10px',
    borderRadius: '20px',
    whiteSpace: 'nowrap',
    transition: 'all 0.3s',
    transform: isVoting ? 'scale(1.15)' : 'scale(1)',
  };

  const descStyles: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.5,
    margin: 0,
    cursor: idea.description ? 'pointer' : 'default',
    display: expanded ? 'block' : '-webkit-box',
    WebkitLineClamp: expanded ? 'unset' : 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  const voteButtonStyles: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: isClosed ? '#d1d5db' : (hasVoted ? '#93c5fd' : '#3b82f6'),
    color: isClosed ? '#9ca3af' : '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: isClosed || hasVoted || !canVote ? 'not-allowed' : 'pointer',
    minHeight: '44px',
    minWidth: '80px',
    transition: 'all 0.3s',
    transform: isVoting ? 'scale(1.1)' : 'scale(1)',
    alignSelf: 'flex-start',
  };

  const rankBadgeStyles: React.CSSProperties = {
    position: 'absolute',
    top: '-10px',
    right: '20px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#f59e0b',
    color: '#1f2937',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
  };

  return (
    <div style={cardStyles}>
      {rank && rank <= 3 && <div style={rankBadgeStyles}>{rank}</div>}
      <div style={sideBarStyles}></div>
      <div style={contentStyles}>
        <div style={titleRowStyles}>
          <h4 style={titleStyles}>{idea.title}</h4>
          <span style={votesBadgeStyles}>{idea.votes} 票</span>
        </div>
        {idea.description && (
          <p style={descStyles} onClick={onToggleExpand}>
            {idea.description}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            style={voteButtonStyles}
            onClick={() => !isClosed && !hasVoted && canVote && onVote(idea.id)}
            disabled={isClosed || hasVoted || !canVote}
          >
            {isClosed ? '已结束' : hasVoted ? '已投票' : '投票'}
          </button>
        </div>
      </div>
    </div>
  );
}
