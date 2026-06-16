import { memo } from 'react';
import { Users, Clock, CheckCircle2 } from 'lucide-react';
import type { Vote } from '@/types';

interface VoteListProps {
  votes: Vote[];
  onSelect: (voteId: string) => void;
}

const VoteCard = memo(function VoteCard({
  vote,
  onSelect,
  index,
}: {
  vote: Vote;
  onSelect: (voteId: string) => void;
  index: number;
}) {
  const participantCount = vote.voters.length;
  const totalVotes = vote.options.reduce((sum, opt) => sum + opt.votes, 0);

  const getStatusConfig = (status: Vote['status']) => {
    if (status === 'active') {
      return {
        label: '进行中',
        className: 'bg-green-50 text-green-700 border-green-200',
        icon: Clock,
      };
    }
    return {
      label: '已结束',
      className: 'bg-gray-100 text-gray-600 border-gray-200',
      icon: CheckCircle2,
    };
  };

  const statusConfig = getStatusConfig(vote.status);
  const StatusIcon = statusConfig.icon;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      onClick={() => onSelect(vote.id)}
      className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-xl transform hover:-translate-y-1 cursor-pointer transition-all duration-300 overflow-hidden group"
      style={{
        animation: `fadeSlideIn 0.5s ease forwards`,
        animationDelay: `${index * 50}ms`,
        opacity: 0,
      }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.className}
          `}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {statusConfig.label}
          </span>
          <span className="text-xs text-gray-400 font-medium">
            {formatDate(vote.createdAt)}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-gray-800 mb-4 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
          {vote.title}
        </h3>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>{participantCount} 人参与</span>
          </div>
          <div className="text-gray-300">|</div>
          <span>{vote.options.length} 个选项</span>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>当前票数</span>
            <span className="font-semibold text-gray-600">{totalVotes} 票</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, totalVotes * 5)}%` }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
});

export function VoteList({ votes, onSelect }: VoteListProps) {
  if (votes.length === 0) {
    return (
      <div className="text-center py-16 bg-white/50 rounded-2xl border-2 border-dashed border-gray-200">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
          <Users className="w-8 h-8 text-blue-400" />
        </div>
        <p className="text-gray-500 text-lg">暂无投票</p>
        <p className="text-gray-400 text-sm mt-1">创建第一个投票开始吧</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {votes.map((vote, index) => (
        <VoteCard key={vote.id} vote={vote} onSelect={onSelect} index={index} />
      ))}
    </div>
  );
}
