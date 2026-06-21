import { useState, useEffect } from 'react';
import { TopicPublic, Category, CATEGORIES } from '../types';
import { useSocket, formatTimeRemaining } from '../hooks/useSocket';

interface TopicBoardProps {
  onSelectTopic: (topicId: string) => void;
  selectedTopicId: string | null;
}

interface CreateFormData {
  name: string;
  category: Category;
  deadlineDate: string;
  deadlineTime: string;
}

const categoryColors: Record<Category, string> = {
  '产品功能': 'bg-[#B8A88A] text-white',
  '活动方案': 'bg-[#8F9E87] text-white',
  '技术选型': 'bg-[#A8B5C0] text-white',
};

export default function TopicBoard({ onSelectTopic, selectedTopicId }: TopicBoardProps) {
  const { socket } = useSocket();
  const [topics, setTopics] = useState<TopicPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState<CreateFormData>({
    name: '',
    category: '产品功能',
    deadlineDate: '',
    deadlineTime: '23:59',
  });
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [filterCategory]);

  useEffect(() => {
    const handleTopicCreated = (topic: TopicPublic) => {
      if (filterCategory === 'all' || topic.category === filterCategory) {
        setTopics((prev) => [topic, ...prev]);
      }
    };

    const handleTopicUpdated = (topic: TopicPublic) => {
      setTopics((prev) =>
        prev.map((t) => (t.id === topic.id ? topic : t))
      );
    };

    socket.on('topic:created', handleTopicCreated);
    socket.on('topic:updated', handleTopicUpdated);

    return () => {
      socket.off('topic:created', handleTopicCreated);
      socket.off('topic:updated', handleTopicUpdated);
    };
  }, [socket, filterCategory]);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const url =
        filterCategory === 'all'
          ? '/api/topics'
          : `/api/topics?category=${encodeURIComponent(filterCategory)}`;
      const res = await fetch(url);
      const data = await res.json();
      setTopics(data.topics || []);
    } catch (err) {
      console.error('Failed to fetch topics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('请输入话题名称');
      return;
    }
    if (!formData.deadlineDate || !formData.deadlineTime) {
      setFormError('请设置截止时间');
      return;
    }

    const deadline = new Date(`${formData.deadlineDate}T${formData.deadlineTime}`).getTime();
    if (deadline <= Date.now()) {
      setFormError('截止时间必须在未来');
      return;
    }

    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          category: formData.category,
          deadline,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || '创建失败');
        return;
      }
      setShowCreateForm(false);
      setFormData({
        name: '',
        category: '产品功能',
        deadlineDate: '',
        deadlineTime: '23:59',
      });
      onSelectTopic(data.topic.id);
    } catch (err) {
      setFormError('创建失败，请重试');
    }
  };

  const copyShareLink = (topicId: string) => {
    const link = `${window.location.origin}${window.location.pathname}?topic=${topicId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('分享链接已复制到剪贴板');
    });
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="topic-board">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#5C5040] mb-1">
            创意众筹与匿名投票
          </h1>
          <p className="text-sm text-[#8B7E6A]">收集创意，匿名投票，公平决策</p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setFormError('');
          }}
          className="create-topic-btn px-5 py-2.5 bg-[#8F9E87] text-white rounded-xl font-medium
                     hover:bg-[#7A8972] active:scale-95 transition-all duration-200
                     shadow-md hover:shadow-lg whitespace-nowrap"
        >
          {showCreateForm ? '✕ 取消创建' : '+ 创建话题'}
        </button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={handleCreateTopic}
          className="create-form bg-gradient-to-br from-[#F5F0E8] to-[#EDE7DB] rounded-2xl p-5 sm:p-6 mb-6
                     border border-[#D4C9B8] shadow-sm animate-fadeIn"
        >
          <h3 className="text-lg font-semibold text-[#5C5040] mb-4">创建新投票话题</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#6B5E4E] mb-1.5">
                话题名称 <span className="text-[#C07676]">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                maxLength={100}
                placeholder="例如：2026年Q3产品功能优先级投票"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D4C9B8] bg-white
                         text-[#3D352A] placeholder-[#B8A88A]
                         focus:outline-none focus:border-[#8F9E87] focus:ring-2 focus:ring-[#8F9E87]/20
                         transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6B5E4E] mb-1.5">
                分类 <span className="text-[#C07676]">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat })}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                      ${formData.category === cat
                        ? `${categoryColors[cat]} shadow-md scale-105`
                        : 'bg-white text-[#6B5E4E] border border-[#D4C9B8] hover:border-[#B8A88A]'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#6B5E4E] mb-1.5">
                  截止日期 <span className="text-[#C07676]">*</span>
                </label>
                <input
                  type="date"
                  value={formData.deadlineDate}
                  min={getTomorrowDate()}
                  onChange={(e) => setFormData({ ...formData, deadlineDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D4C9B8] bg-white
                           text-[#3D352A] focus:outline-none focus:border-[#8F9E87]
                           focus:ring-2 focus:ring-[#8F9E87]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B5E4E] mb-1.5">
                  截止时间
                </label>
                <input
                  type="time"
                  value={formData.deadlineTime}
                  onChange={(e) => setFormData({ ...formData, deadlineTime: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D4C9B8] bg-white
                           text-[#3D352A] focus:outline-none focus:border-[#8F9E87]
                           focus:ring-2 focus:ring-[#8F9E87]/20 transition-all"
                />
              </div>
            </div>
          </div>

          {formError && (
            <div className="mt-4 px-4 py-2.5 bg-[#F5E6E6] text-[#C07676] rounded-xl text-sm">
              {formError}
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              className="flex-1 px-5 py-2.5 bg-[#B8A88A] text-white rounded-xl font-medium
                       hover:bg-[#A6977A] active:scale-95 transition-all duration-200 shadow-md"
            >
              创建话题
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setFormError('');
              }}
              className="px-5 py-2.5 bg-white text-[#6B5E4E] rounded-xl font-medium
                       border border-[#D4C9B8] hover:bg-[#F5F0E8] active:scale-95
                       transition-all duration-200"
            >
              取消
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200
            ${filterCategory === 'all'
              ? 'bg-[#5C5040] text-white shadow-md'
              : 'bg-[#F5F0E8] text-[#6B5E4E] hover:bg-[#EDE7DB]'
            }`}
        >
          全部 ({topics.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = topics.filter((t) => t.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                ${filterCategory === cat
                  ? `${categoryColors[cat]} shadow-md`
                  : 'bg-[#F5F0E8] text-[#6B5E4E] hover:bg-[#EDE7DB]'
                }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-[#D4C9B8] border-t-[#8F9E87] rounded-full animate-spin" />
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-16 bg-[#FDFBF7] rounded-2xl border border-dashed border-[#D4C9B8]">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-[#8B7E6A] mb-4">暂无话题，快来创建第一个吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.map((topic) => {
            const isSelected = selectedTopicId === topic.id;
            const isEnded = topic.status === 'ended' || Date.now() >= topic.deadline;
            return (
              <div
                key={topic.id}
                onClick={() => onSelectTopic(topic.id)}
                className={`topic-card group bg-white rounded-2xl p-5 cursor-pointer
                  border-2 transition-all duration-300 ease-out
                  ${isSelected
                    ? 'border-[#8F9E87] shadow-lg -translate-y-1'
                    : 'border-transparent shadow-md hover:shadow-lg hover:-translate-y-1 hover:border-[#D4C9B8]'
                  }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#3D352A] mb-2 truncate pr-2" title={topic.name}>
                      {topic.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[topic.category]}`}>
                        {topic.category}
                      </span>
                      {isEnded && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#C07676]/15 text-[#C07676]">
                          已结束
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyShareLink(topic.id);
                    }}
                    className="flex-shrink-0 p-2 rounded-lg text-[#8B7E6A] hover:bg-[#F5F0E8] hover:text-[#5C5040]
                             transition-colors"
                    title="复制分享链接"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center justify-between text-sm text-[#8B7E6A]">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>{topic.totalVoters} 人参与</span>
                  </div>
                  <div className={`flex items-center gap-1 ${isEnded ? 'text-[#C07676]' : ''}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{formatTimeRemaining(topic.deadline)}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#EDE7DB] flex items-center justify-between text-xs text-[#8B7E6A]">
                  <span>{topic.proposals.length} 个提案</span>
                  <span className="group-hover:text-[#8F9E87] transition-colors">
                    查看详情 →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
