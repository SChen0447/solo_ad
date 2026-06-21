import { useState, useEffect } from 'react';
import TopicBoard from './components/TopicBoard';
import VotePanel from './components/VotePanel';
import StatisticsChart from './components/StatisticsChart';
import { TopicPublic, RankedProposal } from './types';
import { useSocket } from './hooks/useSocket';

export default function App() {
  const { isConnected } = useSocket();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState<TopicPublic | null>(null);
  const [currentRankings, setCurrentRankings] = useState<RankedProposal[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topicParam = params.get('topic');
    if (topicParam) {
      setSelectedTopicId(topicParam);
    }
  }, []);

  useEffect(() => {
    if (!selectedTopicId) {
      setCurrentTopic(null);
      setCurrentRankings([]);
      return;
    }

    const fetchData = async () => {
      try {
        const [topicRes, rankRes] = await Promise.all([
          fetch(`/api/topics/${selectedTopicId}`),
          fetch(`/api/topics/${selectedTopicId}/rankings`),
        ]);
        const topicData = await topicRes.json();
        const rankData = await rankRes.json();
        if (topicRes.ok) {
          setCurrentTopic(topicData.topic);
        }
        if (rankRes.ok) {
          setCurrentRankings(rankData.rankings || []);
        }
      } catch (err) {
        console.error('Failed to fetch topic data:', err);
      }
    };

    fetchData();
  }, [selectedTopicId]);

  const handleSelectTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    const url = new URL(window.location.href);
    url.searchParams.set('topic', topicId);
    window.history.replaceState({}, '', url.toString());
  };

  const handleBack = () => {
    setSelectedTopicId(null);
    setCurrentTopic(null);
    setCurrentRankings([]);
    const url = new URL(window.location.href);
    url.searchParams.delete('topic');
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[#F8F5F0]/85 backdrop-blur-md border-b border-[#EDE7DB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#8F9E87] to-[#B8A88A]
                          flex items-center justify-center shadow-md">
              <span className="text-lg sm:text-xl">🗳️</span>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[#3D352A] leading-tight">
                创意众筹
              </h1>
              <p className="text-[10px] sm:text-xs text-[#8B7E6A] leading-tight">
                匿名投票平台
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              ${isConnected
                ? 'bg-[#8F9E87]/10 text-[#8F9E87]'
                : 'bg-[#C07676]/10 text-[#C07676]'
              }`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#8F9E87] animate-pulse' : 'bg-[#C07676]'}`} />
              {isConnected ? '实时同步' : '连接断开'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {!selectedTopicId ? (
          <TopicBoard
            onSelectTopic={handleSelectTopic}
            selectedTopicId={selectedTopicId}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
            <div className="lg:col-span-7 order-2 lg:order-1">
              <VotePanel
                topicId={selectedTopicId}
                onBack={handleBack}
              />
            </div>
            <div className="lg:col-span-5 order-1 lg:order-2 lg:sticky lg:top-24 self-start space-y-5">
              <StatisticsChartWrapper
                topicId={selectedTopicId}
                currentTopic={currentTopic}
                currentRankings={currentRankings}
                setCurrentTopic={setCurrentTopic}
                setCurrentRankings={setCurrentRankings}
              />
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#EDE7DB]">
                <h4 className="font-semibold text-[#5C5040] text-sm mb-3 flex items-center gap-2">
                  <span>💡</span> 投票指南
                </h4>
                <ul className="space-y-2 text-xs text-[#6B5E4E] leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-[#8F9E87] flex-shrink-0">•</span>
                    <span>每个话题仅能投一次票，请谨慎选择</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#8F9E87] flex-shrink-0">•</span>
                    <span>投票完全匿名，无法查看投票人</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#8F9E87] flex-shrink-0">•</span>
                    <span>投票后可查看实时票数和排名变化</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#8F9E87] flex-shrink-0">•</span>
                    <span>截止时间到达后自动结束并生成排名</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-8 py-6 border-t border-[#EDE7DB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs text-[#B8A88A]">
          创意众筹与匿名投票平台 · 公平 · 透明 · 高效
        </div>
      </footer>
    </div>
  );
}

function StatisticsChartWrapper({
  topicId,
  currentTopic,
  currentRankings,
  setCurrentTopic,
  setCurrentRankings,
}: {
  topicId: string;
  currentTopic: TopicPublic | null;
  currentRankings: RankedProposal[];
  setCurrentTopic: (t: TopicPublic | null) => void;
  setCurrentRankings: (r: RankedProposal[]) => void;
}) {
  const { socket } = useSocket();

  useEffect(() => {
    const handleTopicUpdated = (topic: TopicPublic) => {
      if (topic.id === topicId) {
        setCurrentTopic(topic);
        fetch(`/api/topics/${topicId}/rankings`)
          .then((r) => r.json())
          .then((d) => {
            if (d.rankings) setCurrentRankings(d.rankings);
          })
          .catch(() => {});
      }
    };

    socket.on('topic:updated', handleTopicUpdated);
    return () => {
      socket.off('topic:updated', handleTopicUpdated);
    };
  }, [socket, topicId, setCurrentTopic, setCurrentRankings]);

  return (
    <StatisticsChart topic={currentTopic} rankings={currentRankings} />
  );
}
