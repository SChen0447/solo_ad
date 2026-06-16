import { useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Play, Pause, Check, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Vote } from '@/types';

interface VoteDetailProps {
  vote: Vote;
  hasVoted: boolean;
  onVote: (optionIds: string[]) => boolean;
  onToggleStatus: () => void;
  onBack: () => void;
}

function getBarColor(voteCount: number, maxVotes: number): string {
  if (maxVotes === 0) return '#3b82f6';
  const ratio = voteCount / maxVotes;
  const r = Math.round(59 + (26 - 59) * ratio);
  const g = Math.round(130 + (64 - 130) * ratio);
  const b = Math.round(246 + (191 - 246) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

export function VoteDetail({
  vote,
  hasVoted,
  onVote,
  onToggleStatus,
  onBack,
}: VoteDetailProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const totalVotes = useMemo(
    () => vote.options.reduce((sum, opt) => sum + opt.votes, 0),
    [vote.options]
  );

  const maxVotes = useMemo(
    () => Math.max(...vote.options.map((opt) => opt.votes), 1),
    [vote.options]
  );

  const chartData = useMemo(() => {
    return vote.options.map((option) => {
      const percentage = totalVotes > 0 ? ((option.votes / totalVotes) * 100).toFixed(1) : '0.0';
      return {
        name: option.text.length > 8 ? option.text.slice(0, 8) + '...' : option.text,
        fullName: option.text,
        votes: option.votes,
        percentage: parseFloat(percentage),
        color: getBarColor(option.votes, maxVotes),
      };
    });
  }, [vote.options, totalVotes, maxVotes]);

  const handleOptionClick = useCallback(
    (optionId: string) => {
      if (hasVoted || vote.status !== 'active') return;

      setVoteError(null);
      if (vote.type === 'single') {
        setSelectedOptions([optionId]);
      } else {
        setSelectedOptions((prev) =>
          prev.includes(optionId)
            ? prev.filter((id) => id !== optionId)
            : [...prev, optionId]
        );
      }
    },
    [hasVoted, vote.status, vote.type]
  );

  const handleSubmitVote = useCallback(() => {
    if (selectedOptions.length === 0) {
      setVoteError('请至少选择一个选项');
      return;
    }

    const success = onVote(selectedOptions);
    if (success) {
      setShowSuccess(true);
      setSelectedOptions([]);
      setTimeout(() => setShowSuccess(false), 2000);
    } else {
      setVoteError('投票失败，您可能已经投过票或投票已结束');
    }
  }, [selectedOptions, onVote]);

  const canVote = vote.status === 'active' && !hasVoted;

  return (
    <div className="w-full max-w-6xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6 transition-colors duration-200 group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
        <span className="font-medium">返回投票列表</span>
      </button>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-100">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    vote.status === 'active'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                >
                  {vote.status === 'active' ? '进行中' : '已结束'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {vote.type === 'single' ? '单选' : '多选'}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                {vote.title}
              </h1>
            </div>
            <button
              onClick={onToggleStatus}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                vote.status === 'active'
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                  : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
              }`}
            >
              {vote.status === 'active' ? (
                <>
                  <Pause className="w-4 h-4" />
                  结束投票
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  重新开启
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
            <span>参与人数: {vote.voters.length} 人</span>
            <span>总票数: {totalVotes} 票</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-gray-100">
          <div className="p-6 md:p-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-sm font-bold">1</span>
              投票选项
              {vote.type === 'multiple' && (
                <span className="text-xs font-normal text-gray-400 ml-2">
                  (可多选)
                </span>
              )}
            </h2>

            {hasVoted && vote.status === 'active' && (
              <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
                <Check className="w-5 h-5 text-blue-600 shrink-0" />
                <span className="text-blue-700">您已完成投票，感谢参与！</span>
              </div>
            )}

            {vote.status === 'ended' && (
              <div className="mb-5 p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-gray-500 shrink-0" />
                <span className="text-gray-600">投票已结束，无法继续投票</span>
              </div>
            )}

            {showSuccess && (
              <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-fadeIn">
                <Check className="w-5 h-5 text-green-600 shrink-0" />
                <span className="text-green-700">投票成功！</span>
              </div>
            )}

            {voteError && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <span className="text-red-600">{voteError}</span>
              </div>
            )}

            <div className="space-y-3">
              {vote.options.map((option, index) => {
                const isSelected = selectedOptions.includes(option.id);
                const percentage =
                  totalVotes > 0
                    ? ((option.votes / totalVotes) * 100).toFixed(1)
                    : '0.0';

                return (
                  <div
                    key={option.id}
                    onClick={() => handleOptionClick(option.id)}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                      canVote
                        ? 'cursor-pointer hover:border-blue-300 hover:bg-blue-50/30'
                        : 'cursor-default'
                    } ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 bg-white'
                    }`}
                  >
                    <div
                      className={`absolute bottom-0 left-0 h-full bg-blue-500/10 rounded-xl transition-all duration-500 ease-out`}
                      style={{ width: `${percentage}%` }}
                    />

                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500 scale-110'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                        <span
                          className={`font-medium transition-colors duration-300 ${
                            isSelected ? 'text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          {String.fromCharCode(65 + index)}. {option.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-semibold text-gray-700">
                          {option.votes} 票
                        </span>
                        <span className="text-gray-400 font-mono min-w-[50px] text-right">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {canVote && (
              <button
                onClick={handleSubmitVote}
                disabled={selectedOptions.length === 0}
                className={`mt-6 w-full py-3.5 px-6 rounded-xl font-semibold transition-all duration-300 ${
                  selectedOptions.length > 0
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                提交投票
              </button>
            )}
          </div>

          <div className="p-6 md:p-8 bg-gray-50/50">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 text-sm font-bold">2</span>
              投票结果
            </h2>

            <div className="h-80 md:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 20, right: 60, left: 20, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#374151', fontSize: 13 }}
                    width={80}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-3">
                            <p className="text-sm font-medium text-gray-800 mb-1">
                              {data.fullName}
                            </p>
                            <p className="text-lg font-bold text-blue-600">
                              {data.votes} 票
                              <span className="text-sm text-gray-400 ml-2">
                                ({data.percentage}%)
                              </span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="votes"
                    radius={[0, 8, 8, 0]}
                    animationDuration={500}
                    animationEasing="ease-out"
                    barSize={32}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">最高票数</p>
                <p className="text-2xl font-bold text-gray-800">{maxVotes}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">选项数量</p>
                <p className="text-2xl font-bold text-gray-800">
                  {vote.options.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
