import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Users, Music } from 'lucide-react';
import NowPlaying from '@/components/NowPlaying';
import QueueList from '@/components/QueueList';
import AddSongBar from '@/components/AddSongBar';
import { getPlaylist } from '@/utils/api';
import { socketManager, type PlaylistState, type Song, type NowPlaying as NowPlayingType } from '@/utils/socket';

const mockSongs: Song[] = [
  {
    id: '1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    coverUrl: 'https://picsum.photos/seed/song1/400/400',
    duration: 200,
    votes: 15,
    addedBy: 'User1',
  },
  {
    id: '2',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    coverUrl: 'https://picsum.photos/seed/song2/400/400',
    duration: 233,
    votes: 12,
    addedBy: 'User2',
  },
  {
    id: '3',
    title: 'Watermelon Sugar',
    artist: 'Harry Styles',
    coverUrl: 'https://picsum.photos/seed/song3/400/400',
    duration: 174,
    votes: 8,
    addedBy: 'User3',
  },
  {
    id: '4',
    title: 'Levitating',
    artist: 'Dua Lipa',
    coverUrl: 'https://picsum.photos/seed/song4/400/400',
    duration: 203,
    votes: 6,
    addedBy: 'User4',
  },
  {
    id: '5',
    title: 'Stay',
    artist: 'The Kid LAROI, Justin Bieber',
    coverUrl: 'https://picsum.photos/seed/song5/400/400',
    duration: 141,
    votes: 4,
    addedBy: 'User1',
  },
  {
    id: '6',
    title: 'Bad Guy',
    artist: 'Billie Eilish',
    coverUrl: 'https://picsum.photos/seed/song6/400/400',
    duration: 194,
    votes: 3,
    addedBy: 'User5',
  },
];

const mockNowPlaying: NowPlayingType = {
  song: {
    id: '0',
    title: 'Sunflower',
    artist: 'Post Malone, Swae Lee',
    coverUrl: 'https://picsum.photos/seed/nowplaying/400/400',
    duration: 158,
    votes: 0,
    addedBy: 'System',
  },
  currentTime: 65,
  startedAt: Date.now() - 65000,
};

const mockPlaylistState: PlaylistState = {
  nowPlaying: mockNowPlaying,
  queue: mockSongs,
  onlineUsers: 12,
  totalSongs: mockSongs.length + 1,
};

const App: React.FC = () => {
  const [playlistState, setPlaylistState] = useState<PlaylistState>(mockPlaylistState);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [useMockData, setUseMockData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getPlaylist();
        setPlaylistState(data);
        setUseMockData(false);
      } catch (_error) {
        setUseMockData(true);
      }
    };

    fetchData();

    try {
      socketManager.connect();

      const unsubscribePlaylist = socketManager.onPlaylistUpdate((state) => {
        setPlaylistState(state);
        setUseMockData(false);
      });

      const unsubscribeSong = socketManager.onSongAdded(() => {
        fetchData();
      });

      return () => {
        unsubscribePlaylist();
        unsubscribeSong();
        socketManager.disconnect();
      };
    } catch (_error) {
      setUseMockData(true);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(false);

    requestAnimationFrame(() => {
      setIsRefreshing(true);
      setTimeout(() => {
        // 确保动画能完整播放
      }, 10);
    });

    try {
      const data = await getPlaylist();
      setPlaylistState(data);
      setUseMockData(false);
    } catch (_error) {
      if (useMockData) {
        const shuffled = [...mockSongs].map((s) => ({
          ...s,
          votes: Math.max(0, s.votes + Math.floor(Math.random() * 5) - 2),
        }));
        setPlaylistState({
          ...mockPlaylistState,
          queue: shuffled,
          onlineUsers: Math.max(1, mockPlaylistState.onlineUsers + Math.floor(Math.random() * 5) - 2),
        }));
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  }, [useMockData]);

  const handleSongAdded = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  return (
    <div className="min-h-screen w-full pb-32" style={{ backgroundColor: '#121212' }}>
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 py-4"
        style={{
          backgroundColor: 'rgba(18, 18, 18, 0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#1db954' }}
              >
                <Music size={18} style={{ color: '#ffffff' }} />
              </div>
              <h1 className="text-lg md:text-xl font-bold text-white">协作音乐歌单</h1>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-full transition-all duration-200 hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed"
              title="刷新数据"
            >
              <RefreshCw
                size={20}
                className={isRefreshing ? 'animate-rotate-360' : ''}
                style={{ color: '#b3b3b3' }}
              />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ backgroundColor: '#1e1e1e' }}
            >
              <Users size={16} style={{ color: '#1db954' }} />
              <span className="text-sm font-medium text-white">
                {playlistState.onlineUsers} 在线
              </span>
            </div>

            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ backgroundColor: '#1e1e1e' }}
            >
              <Music size={16} style={{ color: '#1db954' }} />
              <span className="text-sm font-medium text-white">
                {playlistState.totalSongs} 首歌曲
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)]">
          <div className="lg:w-2/3 flex-shrink-0">
            <NowPlaying data={playlistState.nowPlaying} />
          </div>

          <div className="lg:w-1/3 flex-shrink-0 min-h-[400px]">
            <QueueList songs={playlistState.queue} />
          </div>
        </div>
      </main>

      <AddSongBar onSongAdded={handleSongAdded} />

      {useMockData && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm z-40"
          style={{
            backgroundColor: 'rgba(29, 185, 84, 0.2)',
            border: '1px solid rgba(29, 185, 84, 0.3)',
            color: '#1db954',
          }}
        >
          当前使用演示数据，启动 Flask 后端后将使用真实数据
        </div>
      )}
    </div>
  );
};

export default App;
