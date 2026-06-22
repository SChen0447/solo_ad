import { useState, useEffect, useRef } from 'react';
import {
  getPodcasts,
  subscribePodcast,
  unsubscribePodcast,
  getSubscribedPodcasts,
  type Podcast,
  type Episode,
  getProgressFromLocal,
} from '@/api/api';
import './PodcastList.css';

interface PodcastListProps {
  onSelectEpisode?: (episode: Episode, podcast: Podcast) => void;
}

export default function PodcastList({ onSelectEpisode }: PodcastListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Podcast[]>([]);
  const [subscribedPodcasts, setSubscribedPodcasts] = useState<Podcast[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<string, Episode[]>>({});
  const [activeTab, setActiveTab] = useState<'subscribed' | 'search'>('subscribed');
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [progressMap, setProgressMap] = useState<Record<string, any>>({});
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSubscribedPodcasts();
    setProgressMap(getProgressFromLocal());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgressMap(getProgressFromLocal());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function loadSubscribedPodcasts() {
    try {
      const res = await getSubscribedPodcasts();
      setSubscribedPodcasts(res.podcasts);
    } catch (err) {
      console.error('Failed to load subscribed podcasts:', err);
    }
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await getPodcasts(query, 1, 10);
        setSearchResults(res.podcasts);
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 300);
  }

  async function handleSubscribe(podcastId: string) {
    try {
      await subscribePodcast(podcastId);
      await loadSubscribedPodcasts();
      const res = await getPodcasts(searchQuery, 1, 10);
      setSearchResults(res.podcasts);
    } catch (err) {
      console.error('Subscribe failed:', err);
    }
  }

  async function handleUnsubscribe(podcastId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setExitingIds((prev) => new Set(prev).add(podcastId));

    setTimeout(async () => {
      try {
        await unsubscribePodcast(podcastId);
        await loadSubscribedPodcasts();
        if (searchQuery) {
          const res = await getPodcasts(searchQuery, 1, 10);
          setSearchResults(res.podcasts);
        }
        setExitingIds((prev) => {
          const next = new Set(prev);
          next.delete(podcastId);
          return next;
        });
        if (expandedId === podcastId) {
          setExpandedId(null);
        }
      } catch (err) {
        console.error('Unsubscribe failed:', err);
      }
    }, 400);
  }

  async function handleToggleExpand(podcast: Podcast) {
    if (expandedId === podcast.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(podcast.id);

    if (!expandedEpisodes[podcast.id]) {
      try {
        const { getEpisodes } = await import('@/api/api');
        const res = await getEpisodes(podcast.id);
        setExpandedEpisodes((prev) => ({
          ...prev,
          [podcast.id]: res.episodes,
        }));
      } catch (err) {
        console.error('Failed to load episodes:', err);
      }
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    return date.toLocaleDateString('zh-CN');
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins < 60) return `${mins}分${secs}秒`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}小时${remainMins}分`;
  }

  function renderEpisodeProgress(episodeId: string, duration: number) {
    const progress = progressMap[episodeId];
    if (!progress) {
      return (
        <div className="episode-progress-bar dashed">
          <div className="episode-progress-fill" style={{ width: '0%' }} />
        </div>
      );
    }

    const percent = duration > 0 ? (progress.currentTime / duration) * 100 : 0;
    const isCompleted = progress.status === 'completed';

    return (
      <div className="episode-progress-bar">
        <div
          className={`episode-progress-fill ${isCompleted ? 'completed' : ''}`}
          style={{ width: isCompleted ? '100%' : `${percent}%` }}
        />
        {isCompleted && (
          <span
            style={{
              position: 'absolute',
              right: 0,
              top: '-3px',
              color: '#10B981',
              fontSize: '12px',
            }}
          >
            ✓
          </span>
        )}
      </div>
    );
  }

  function renderPodcastCard(podcast: Podcast, isSubscribedView: boolean) {
    const isExpanded = expandedId === podcast.id;
    const episodes = expandedEpisodes[podcast.id] || [];
    const isExiting = exitingIds.has(podcast.id);

    return (
      <div
        key={podcast.id}
        className={`podcast-card ${isExpanded ? 'expanded' : ''} ${isExiting ? 'exit-animation' : ''} ${isExpanded ? 'selected' : ''}`}
        onClick={() => isSubscribedView && handleToggleExpand(podcast)}
      >
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <img src={podcast.coverUrl} alt={podcast.title} className="podcast-cover" />
          <div className="podcast-info">
            <h3 className="podcast-title">{podcast.title}</h3>
            <p className="podcast-meta">{podcast.author}</p>
            {isSubscribedView ? (
              <p className="podcast-meta">{podcast.episodes?.length || 0} 期节目</p>
            ) : null}
            <p className="podcast-date">更新于 {formatDate(podcast.lastUpdated)}</p>
          </div>
          {isSubscribedView ? (
            <button
              className="unsubscribe-btn"
              onClick={(e) => handleUnsubscribe(podcast.id, e)}
            >
              取消
            </button>
          ) : podcast.isSubscribed ? (
            <button className="subscribe-btn" disabled style={{ opacity: 0.6 }}>
              已订阅
            </button>
          ) : (
            <button className="subscribe-btn" onClick={(e) => { e.stopPropagation(); handleSubscribe(podcast.id); }}>
              订阅
            </button>
          )}
        </div>

        {isExpanded && isSubscribedView && (
          <div className="episodes-list">
            {episodes.length === 0 ? (
              <p style={{ color: '#71717A', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                加载中...
              </p>
            ) : (
              episodes.map((ep) => (
                <div
                  key={ep.id}
                  className="episode-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEpisode?.(ep, podcast);
                  }}
                >
                  <p className="episode-title">{ep.title}</p>
                  <div className="episode-meta">
                    <span>{formatDuration(ep.duration)}</span>
                    <span>⭐ {ep.rating.toFixed(1)}</span>
                  </div>
                  {renderEpisodeProgress(ep.id, ep.duration)}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  const emptyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16.85 18.58a9 9 0 1 0-9.7 0"/>
    <path d="M8 14a5 5 0 1 1 8 0"/>
    <circle cx="12" cy="18" r="1"/>
  </svg>`;

  return (
    <div className="podcast-list-container">
      <div className="podcast-list-header">
        <h2 className="podcast-list-title">我的播客</h2>
        <input
          type="text"
          className="search-input"
          placeholder="搜索播客..."
          value={searchQuery}
          onChange={(e) => {
            handleSearch(e.target.value);
            if (e.target.value) setActiveTab('search');
          }}
          onFocus={() => searchQuery && setActiveTab('search')}
        />
      </div>

      <div style={{ padding: '0 12px' }}>
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'subscribed' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscribed')}
          >
            已订阅
          </button>
          <button
            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            发现
          </button>
        </div>
      </div>

      {activeTab === 'subscribed' ? (
        <div className="subscribed-section">
          {subscribedPodcasts.length === 0 ? (
            <div className="empty-state">
              <div dangerouslySetInnerHTML={{ __html: emptyIcon }} />
              <p>还没有订阅任何播客</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>去"发现"页看看吧</p>
            </div>
          ) : (
            subscribedPodcasts.map((p) => renderPodcastCard(p, true))
          )}
        </div>
      ) : (
        <div className="search-results-section">
          {!searchQuery ? (
            <div className="empty-state">
              <div dangerouslySetInnerHTML={{ __html: emptyIcon }} />
              <p>输入关键词搜索播客</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="empty-state">
              <div dangerouslySetInnerHTML={{ __html: emptyIcon }} />
              <p>没有找到相关播客</p>
            </div>
          ) : (
            searchResults.map((p) => renderPodcastCard(p, false))
          )}
        </div>
      )}
    </div>
  );
}
