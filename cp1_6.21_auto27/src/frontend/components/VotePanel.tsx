import { useState, useEffect, useMemo } from 'react';
import { TopicPublic, Proposal, RankedProposal, Category, CATEGORIES } from '../types';
import { useSocket, getVoterId, formatDateTime, formatTimeRemaining } from '../hooks/useSocket';

interface VotePanelProps {
  topicId: string | null;
  onBack: () => void;
}

const categoryColors: Record<Category, string> = {
  '产品功能': 'bg-[#B8A88A] text-white',
  '活动方案': 'bg-[#8F9E87] text-white',
  '技术选型': 'bg-[#A8B5C0] text-white',
};

const rankBadgeColors = [
  'bg-[#D4A853] text-white',
  'bg-[#A8A8A8] text-white',
  'bg-[#B87333] text-white',
  'bg-[#E8DFD0] text-[#5C5040]',
  'bg-[#E8DFD0] text-[#5C5040]',
];

export default function VotePanel({ topicId, onBack }: VotePanelProps) {
  const { socket } = useSocket();
  const voterId = useMemo(() => getVoterId(), []);

  const [topic, setTopic] = useState<TopicPublic | null>(null);
  const [rankings, setRankings] = useState<RankedProposal[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVoteId, setUserVoteId] = useState<string | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [proposalContent, setProposalContent] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [voteError, setVoteError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [isEndingTopic, setIsEndingTopic] = useState(false);
  const [animatingVoteId, setAnimatingVoteId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!topicId) return;
    setLoading(true);
    setTopic(null);
    setRankings([]);
    setHasVoted(false);
    setUserVoteId(null);
    setSelectedProposalId(null);
    fetchTopicDetail(topicId);

    socket.emit('topic:join', topicId);
    return () => {
      socket.emit('topic:leave', topicId);
    };
  }, [topicId, socket]);

  useEffect(() => {
    if (!topicId) return;

    const handleState = ({ topic, rankings }: { topic: TopicPublic; rankings: RankedProposal[] }) => {
      setTopic(topic);
      setRankings(rankings);
      setLoading(false);
    };

    const handleVote = ({
      topic,
      rankings,
      proposalId,
    }: {
      topic: TopicPublic;
      rankings: RankedProposal[];
      proposalId: string;
    }) => {
      setTopic(topic);
      setRankings(rankings);
      setAnimatingVoteId(proposalId);
      setTimeout(() => setAnimatingVoteId(null), 600);
    };

    const handleProposal = (proposal: Proposal) => {
      setTopic((prev) =>
        prev
          ? { ...prev, proposals: [proposal, ...prev.proposals] }
          : prev
      );
    };

    const handleEnded = ({ topic, rankings }: { topic: TopicPublic; rankings: RankedProposal[] }) => {
      setTopic(topic);
      setRankings(rankings);
    };

    socket.on(`topic:${topicId}:state`, handleState);
    socket.on(`topic:${topicId}:vote`, handleVote);
    socket.on(`topic:${topicId}:proposal`, handleProposal);
    socket.on(`topic:${topicId}:ended`, handleEnded);

    return () => {
      socket.off(`topic:${topicId}:state`, handleState);
      socket.off(`topic:${topicId}:vote`, handleVote);
      socket.off(`topic:${topicId}:proposal`, handleProposal);
      socket.off(`topic:${topicId}:ended`, handleEnded);
    };
  }, [topicId, socket]);

  const fetchTopicDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/topics/${id}?voterId=${encodeURIComponent(voterId)}`);
      const data = await res.json();
      if (res.ok) {
        setTopic(data.topic);
        setHasVoted(data.hasVoted || false);
        setUserVoteId(data.userVoteId || null);
        const rankRes = await fetch(`/api/topics/${id}/rankings`);
        const rankData = await rankRes.json();
        if (rankRes.ok) {
          setRankings(rankData.rankings || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch topic:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicId || !topic) return;
    setSubmitError('');

    const content = proposalContent.trim();
    if (!content) {
      setSubmitError('请输入提案内容');
      return;
    }
    if (content.length > 200) {
      setSubmitError('提案内容不能超过200字');
      return;
    }

    setIsSubmittingProposal(true);
    try {
      const res = await fetch(`/api/topics/${topicId}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || '提交失败');
        return;
      }
      setProposalContent('');
    } catch (err) {
      setSubmitError('提交失败，请重试');
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const handleVote = async () => {
    if (!topicId || !selectedProposalId || !topic) return;
    setVoteError('');
    setIsSubmittingVote(true);

    try {
      const res = await fetch(`/api/topics/${topicId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: selectedProposalId, voterId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVoteError(data.error || '投票失败');
        return;
      }
      setHasVoted(true);
      setUserVoteId(selectedProposalId);
      setTopic(data.topic);
      setRankings(data.rankings);
    } catch (err) {
      setVoteError('投票失败，请重试');
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const handleEndTopic = async () => {
    if (!topicId) return;
    if (!confirm('确定要手动结束投票吗？此操作不可撤销。')) return;

    setIsEndingTopic(true);
    try {
      const res = await fetch(`/api/topics/${topicId}/end`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setTopic(data.topic);
        setRankings(data.rankings);
      }
    } catch (err) {
      console.error('Failed to end topic:', err);
    } finally {
      setIsEndingTopic(false);
    }
  };

  const charCount = proposalContent.length;
  const isNearLimit = charCount > 160;
  const isOverLimit = charCount > 200;

  if (!topicId) {
    return (
      <div className="vote-panel-empty flex flex-col items-center justify-center h-full min-h-[400px]
                    bg-[#FDFBF7] rounded-2xl border border-dashed border-[#D4C9B8]">
        <div className="text-6xl mb-4">🗳️</div>
        <p className="text-[#8B7E6A] text-lg">请从左侧选择一个话题</p>
        <p className="text-[#B8A88A] text-sm mt-1">或创建新的投票话题开始</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#D4C9B8] border-t-[#8F9E87] rounded-full animate-spin" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]
                    bg-[#F5E6E6] rounded-2xl">
        <div className="text-5xl mb-3">😕</div>
        <p className="text-[#C07676] mb-4">话题不存在或已被删除</p>
        <button
          onClick={onBack}
          className="px-5 py-2 bg-[#B8A88A] text-white rounded-xl hover:bg-[#A6977A] transition-colors"
        >
          返回话题列表
        </button>
      </div>
    );
  }

  const isEnded = topic.status === 'ended' || Date.now() >= topic.deadline;
  const top5 = rankings.slice(0, 5);
  const totalVotes = topic.proposals.reduce((sum, p) => sum + p.votes, 0);

  const getVotePercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  return (
    <div className="vote-panel animate-fadeIn">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-[#F5F0E8] text-[#5C5040] hover:bg-[#EDE7DB]
                   active:scale-95 transition-all"
          title="返回话题列表"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-[#3D352A] truncate" title={topic.name}>
            {topic.name}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[topic.category]}`}>
              {topic.category}
            </span>
            <span className="text-xs text-[#8B7E6A]">
              {topic.totalVoters} 人参与 · {topic.proposals.length} 个提案
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#F5F0E8] to-[#EDE7DB] rounded-2xl p-4 mb-5
                    border border-[#D4C9B8]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <svg className={`w-5 h-5 ${isEnded ? 'text-[#C07676]' : 'text-[#8F9E87]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`font-medium ${isEnded ? 'text-[#C07676]' : 'text-[#5C5040]'}`}>
              {isEnded ? '投票已结束' : `剩余时间：${formatTimeRemaining(topic.deadline)}`}
            </span>
          </div>
          {!isEnded && (
            <button
              onClick={handleEndTopic}
              disabled={isEndingTopic}
              className="px-3 py-1.5 text-sm bg-[#C07676]/10 text-[#C07676] rounded-lg
                       hover:bg-[#C07676]/20 disabled:opacity-50 transition-colors"
            >
              {isEndingTopic ? '处理中...' : '手动结束投票'}
            </button>
          )}
        </div>
      </div>

      {hasVoted && !isEnded && (
        <div className="bg-[#8F9E87]/10 border border-[#8F9E87]/30 rounded-2xl p-4 mb-5
                      flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#8F9E87] flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-[#5C5040]">您已完成投票</p>
            <p className="text-sm text-[#8B7E6A]">感谢您的参与，排名正在实时更新中</p>
          </div>
        </div>
      )}

      {isEnded && top5.length > 0 && (
        <div className="bg-gradient-to-br from-[#F5F0E8] to-[#EDE7DB] rounded-2xl p-5 mb-5
                      border border-[#D4C9B8]">
          <h3 className="font-bold text-[#3D352A] mb-4 flex items-center gap-2">
            <span className="text-xl">🏆</span> 最终排名 Top 5
          </h3>
          <div className="space-y-2">
            {top5.map((proposal) => (
              <div
                key={proposal.id}
                className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm animate-popIn"
                style={{ animationDelay: `${proposal.rank * 80}ms` }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                  ${rankBadgeColors[Math.min(proposal.rank - 1, 4)]}`}>
                  {proposal.rank <= 3 ? ['🥇', '🥈', '🥉'][proposal.rank - 1] : proposal.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#3D352A] truncate">{proposal.content}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-[#8F9E87]">{proposal.votes}</p>
                  <p className="text-xs text-[#8B7E6A]">票</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isEnded && (
        <form onSubmit={handleSubmitProposal} className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-[#EDE7DB]">
          <h3 className="font-semibold text-[#3D352A] mb-3 flex items-center gap-2">
            <span className="text-lg">💡</span> 提交创意提案
          </h3>
          <textarea
            value={proposalContent}
            onChange={(e) => setProposalContent(e.target.value)}
            maxLength={250}
            rows={3}
            placeholder="描述您的创意想法（限200字）..."
            className="w-full px-4 py-3 rounded-xl border border-[#D4C9B8] bg-[#FDFBF7]
                     text-[#3D352A] placeholder-[#B8A88A] resize-none
                     focus:outline-none focus:border-[#8F9E87] focus:ring-2 focus:ring-[#8F9E87]/20
                     transition-all"
          />
          <div className="flex justify-between items-center mt-2">
            <span className={`text-xs font-medium ${isOverLimit ? 'text-[#C07676]' : isNearLimit ? 'text-[#D4A853]' : 'text-[#B8A88A]'}`}>
              {charCount}/200 {isNearLimit && !isOverLimit && '· 接近上限'}
              {isOverLimit && '· 已超出限制'}
            </span>
            {submitError && <span className="text-xs text-[#C07676]">{submitError}</span>}
          </div>
          <button
            type="submit"
            disabled={isSubmittingProposal || !proposalContent.trim() || isOverLimit}
            className="mt-3 w-full sm:w-auto px-6 py-2.5 bg-[#B8A88A] text-white rounded-xl font-medium
                     hover:bg-[#A6977A] active:scale-95 disabled:opacity-50 disabled:active:scale-100
                     transition-all duration-200 shadow-md"
          >
            {isSubmittingProposal ? '提交中...' : '提交提案'}
          </button>
        </form>
      )}

      <div className="mb-5">
        <h3 className="font-semibold text-[#3D352A] mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-lg">📝</span>
            提案列表
            {hasVoted && <span className="text-xs font-normal text-[#8F9E87]">（已投票，可见实时票数）</span>}
          </span>
          <span className="text-xs font-normal text-[#8B7E6A]">共 {topic.proposals.length} 个</span>
        </h3>

        {voteError && (
          <div className="mb-3 px-4 py-2.5 bg-[#F5E6E6] text-[#C07676] rounded-xl text-sm">
            {voteError}
          </div>
        )}

        {topic.proposals.length === 0 ? (
          <div className="text-center py-12 bg-[#FDFBF7] rounded-2xl border border-dashed border-[#D4C9B8]">
            <div className="text-4xl mb-2">💭</div>
            <p className="text-[#8B7E6A]">还没有提案</p>
            {!isEnded && <p className="text-sm text-[#B8A88A] mt-1">成为第一个提交创意的人吧！</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {topic.proposals.map((proposal, index) => {
              const ranked = rankings.find((r) => r.id === proposal.id);
              const rank = ranked?.rank || 0;
              const isUserVote = userVoteId === proposal.id;
              const isAnimating = animatingVoteId === proposal.id;
              const percentage = getVotePercentage(proposal.votes);

              return (
                <div
                  key={proposal.id}
                  className={`proposal-card bg-white rounded-2xl p-4 border-2 transition-all duration-300
                    ${selectedProposalId === proposal.id && !hasVoted && !isEnded
                      ? 'border-[#8F9E87] shadow-md'
                      : 'border-[#EDE7DB] hover:border-[#D4C9B8]'
                    }
                    ${isUserVote ? 'bg-[#8F9E87]/5' : ''}
                    ${isAnimating ? 'animate-pulse ring-2 ring-[#8F9E87]' : ''}
                  `}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-start gap-3">
                    {!hasVoted && !isEnded ? (
                      <button
                        onClick={() => setSelectedProposalId(proposal.id)}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                          transition-all duration-200 vote-radio-btn
                          ${selectedProposalId === proposal.id
                            ? 'border-[#8F9E87] bg-[#8F9E87]'
                            : 'border-[#D4C9B8] hover:border-[#B8A88A]'
                          }`}
                        aria-label="选择此提案"
                      >
                        {selectedProposalId === proposal.id && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </button>
                    ) : (
                      <div className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center
                        ${isUserVote ? 'bg-[#8F9E87]' : 'bg-[#EDE7DB]'}`}>
                        {isUserVote && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-[#3D352A] leading-relaxed whitespace-pre-wrap break-words">
                        {proposal.content}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[#8B7E6A]">
                        <span>{formatDateTime(proposal.createdAt)}</span>
                        {rank > 0 && (
                          <span className={`px-2 py-0.5 rounded-full ${rank <= 3 ? 'bg-[#D4A853]/10 text-[#B8892E]' : 'bg-[#EDE7DB] text-[#6B5E4E]'}`}>
                            #{rank}
                          </span>
                        )}
                        {isUserVote && (
                          <span className="px-2 py-0.5 rounded-full bg-[#8F9E87]/10 text-[#8F9E87] font-medium">
                            我的选择
                          </span>
                        )}
                      </div>

                      {(hasVoted || isEnded) && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[#8B7E6A]">得票</span>
                            <span className="font-medium text-[#5C5040]">
                              {proposal.votes} 票 · {percentage}%
                            </span>
                          </div>
                          <div className="h-2 bg-[#F5F0E8] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ease-out
                                ${isUserVote ? 'bg-[#8F9E87]' : 'bg-[#B8A88A]'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!hasVoted && !isEnded && topic.proposals.length > 0 && (
        <div className="sticky bottom-4 bg-white rounded-2xl p-4 shadow-lg border border-[#EDE7DB]
                      animate-slideUp z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {selectedProposalId ? (
                <p className="text-sm text-[#5C5040]">
                  已选择提案，请确认投票
                  <span className="text-[#8B7E6A]">（每个话题仅能投一次）</span>
                </p>
              ) : (
                <p className="text-sm text-[#8B7E6A]">请选择一个提案进行投票</p>
              )}
            </div>
            <button
              onClick={handleVote}
              disabled={!selectedProposalId || isSubmittingVote}
              className="px-6 py-2.5 bg-[#8F9E87] text-white rounded-xl font-medium
                       hover:bg-[#7A8972] active:scale-95 disabled:opacity-50 disabled:active:scale-100
                       transition-all duration-200 shadow-md vote-confirm-btn
                       disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isSubmittingVote ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  投票中
                </span>
              ) : (
                '确认投票 🗳️'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
