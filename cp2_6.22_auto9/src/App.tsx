import { useState, useCallback } from 'react';
import PodcastList from './components/PodcastList';
import PlaylistGenerator from './components/PlaylistGenerator';
import Player from './components/Player';
import { type Episode, type Podcast } from './api/api';
import './index.css';

type View = 'episodes' | 'playlist';

function App() {
  const [currentView, setCurrentView] = useState<View>('episodes');
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [currentPodcastTitle, setCurrentPodcastTitle] = useState<string>('');
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);

  const handleSelectEpisode = useCallback((episode: Episode, podcast: Podcast) => {
    setSelectedEpisode(episode);
    setSelectedPodcast(podcast);
    setCurrentEpisode(episode);
    setCurrentPodcastTitle(podcast.title);
  }, []);

  const handlePlayEpisode = useCallback((episode: Episode) => {
    setCurrentEpisode(episode);
    setCurrentPodcastTitle(episode.podcastTitle || '');
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins < 60) return `${mins}分${secs}秒`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}小时${remainMins}分`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const playIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16.85 18.58a9 9 0 1 0-9.7 0"/>
    <path d="M8 14a5 5 0 1 1 8 0"/>
    <circle cx="12" cy="18" r="1"/>
  </svg>`;

  return (
    <div className="app-container">
      <PodcastList onSelectEpisode={handleSelectEpisode} />

      <div className="main-content">
        <nav className="top-nav">
          <button
            className={`nav-tab ${currentView === 'episodes' ? 'active' : ''}`}
            onClick={() => setCurrentView('episodes')}
          >
            节目详情
          </button>
          <button
            className={`nav-tab ${currentView === 'playlist' ? 'active' : ''}`}
            onClick={() => setCurrentView('playlist')}
          >
            智能播放列表
          </button>
        </nav>

        <div className="content-area">
          {currentView === 'episodes' ? (
            selectedEpisode ? (
              <div className="episode-detail-view" key={selectedEpisode.id}>
                <div className="detail-header">
                  <img
                    src={selectedEpisode.coverUrl}
                    alt={selectedEpisode.title}
                    className="detail-cover"
                  />
                  <div className="detail-info">
                    <h1 className="detail-title">{selectedEpisode.title}</h1>
                    <p className="detail-podcast">
                      {selectedPodcast?.title || selectedEpisode.podcastTitle || ''}
                    </p>
                    <div className="detail-meta">
                      <span>{formatDate(selectedEpisode.pubDate)}</span>
                      <span>{formatDuration(selectedEpisode.duration)}</span>
                      <span className="detail-rating">
                        ⭐ {selectedEpisode.rating.toFixed(1)}
                      </span>
                    </div>
                    <button
                      className="detail-play-btn"
                      onClick={() => {
                        setCurrentEpisode(selectedEpisode);
                        setCurrentPodcastTitle(
                          selectedPodcast?.title || selectedEpisode.podcastTitle || ''
                        );
                      }}
                    >
                      ▶ 播放节目
                    </button>
                  </div>
                </div>
                <div className="detail-summary">
                  <h3>节目简介</h3>
                  <p>{selectedEpisode.summary}</p>
                </div>
              </div>
            ) : (
              <div className="episode-detail-placeholder">
                <div dangerouslySetInnerHTML={{ __html: playIcon }} />
                <p>选择一个节目查看详情</p>
                <span>从左侧播客列表中展开并点击节目</span>
              </div>
            )
          ) : (
            <PlaylistGenerator onPlayEpisode={handlePlayEpisode} />
          )}
        </div>

        <Player episode={currentEpisode} podcastTitle={currentPodcastTitle} />
      </div>
    </div>
  );
}

export default App;
