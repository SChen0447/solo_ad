import React, { useState, useEffect, useCallback } from 'react';
import { NavKey, Album, Playlist, Song } from './types';

const mockAlbums: Album[] = [
  {
    id: '1',
    title: 'Midnight City',
    artist: 'Luna Wave',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=abstract%20dark%20purple%20album%20cover%20with%20neon%20city%20skyline%20music&image_size=square_hd',
    year: 2024,
    songs: [],
  },
  {
    id: '2',
    title: 'Ocean Dreams',
    artist: 'Blue Horizon',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ocean%20waves%20at%20sunset%20dreamy%20album%20cover%20ambient%20music&image_size=square_hd',
    year: 2023,
    songs: [],
  },
  {
    id: '3',
    title: 'Electric Soul',
    artist: 'Neon Pulse',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=electric%20neon%20blue%20abstract%20album%20cover%20electronic%20music&image_size=square_hd',
    year: 2024,
    songs: [],
  },
  {
    id: '4',
    title: 'Forest Whispers',
    artist: 'Echo Valley',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=misty%20forest%20green%20nature%20album%20cover%20acoustic%20music&image_size=square_hd',
    year: 2023,
    songs: [],
  },
  {
    id: '5',
    title: 'Golden Hour',
    artist: 'Sunset Drive',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=golden%20sunset%20road%20warm%20album%20cover%20indie%20music&image_size=square_hd',
    year: 2024,
    songs: [],
  },
  {
    id: '6',
    title: 'Starlight',
    artist: 'Cosmic Band',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=space%20stars%20galaxy%20purple%20blue%20album%20cover%20cosmic%20music&image_size=square_hd',
    year: 2024,
    songs: [],
  },
];

const mockPlaylists: Playlist[] = [
  {
    id: 'p1',
    name: '今日推荐',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mixed%20colorful%20music%20playlist%20cover%20diverse%20genres&image_size=square_hd',
    description: '每天为你精选优质好歌',
    songs: [],
  },
  {
    id: 'p2',
    name: '深夜电台',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=night%20city%20radio%20moody%20dark%20blue%20playlist%20cover&image_size=square_hd',
    description: '适合深夜独处的治愈歌曲',
    songs: [],
  },
  {
    id: 'p3',
    name: '运动节拍',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=energetic%20sports%20workout%20red%20orange%20playlist%20cover&image_size=square_hd',
    description: '高燃节奏，运动必备',
    songs: [],
  },
];

const mockRecentSongs: Song[] = [
  { id: 's1', title: 'Starlight', artist: 'Cosmic Band', album: 'Starlight', duration: 234, cover: '' },
  { id: 's2', title: 'Midnight Drive', artist: 'Luna Wave', album: 'Midnight City', duration: 198, cover: '' },
  { id: 's3', title: 'Ocean Breeze', artist: 'Blue Horizon', album: 'Ocean Dreams', duration: 267, cover: '' },
  { id: 's4', title: 'Neon Lights', artist: 'Neon Pulse', album: 'Electric Soul', duration: 215, cover: '' },
  { id: 's5', title: 'Forest Rain', artist: 'Echo Valley', album: 'Forest Whispers', duration: 289, cover: '' },
];

const carouselSlides = [
  {
    id: 'c1',
    title: '发现新音乐',
    subtitle: '每周为你精选新歌',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=music%20discovery%20banner%20colorful%20headphones%20notes&image_size=landscape_16_9',
  },
  {
    id: 'c2',
    title: '热门歌单',
    subtitle: '千万用户都在听',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=popular%20playlist%20banner%20trending%20music%20charts&image_size=landscape_16_9',
  },
  {
    id: 'c3',
    title: '独家首发',
    subtitle: '最新专辑抢先听',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=exclusive%20album%20launch%20banner%20premiere%20music&image_size=landscape_16_9',
  },
];

interface MainContentProps {
  activeKey: NavKey;
  onPlaySong?: (song: Song) => void;
}

const MainContent: React.FC<MainContentProps> = ({ activeKey, onPlaySong }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const nextSlide = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    setTimeout(() => setIsAnimating(false), 600);
  }, [isAnimating]);

  const prevSlide = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
    setTimeout(() => setIsAnimating(false), 600);
  }, [isAnimating]);

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentSlide) return;
    setIsAnimating(true);
    setCurrentSlide(index);
    setTimeout(() => setIsAnimating(false), 600);
  };

  useEffect(() => {
    const timer = setInterval(nextSlide, 4000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  const renderCarousel = () => (
    <div className="carousel">
      <div
        className="carousel-track"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {carouselSlides.map((slide) => (
          <div key={slide.id} className="carousel-slide">
            <img src={slide.cover} alt={slide.title} className="carousel-image" />
            <div className="carousel-overlay">
              <h2 className="carousel-title">{slide.title}</h2>
              <p className="carousel-subtitle">{slide.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
      <button className="carousel-arrow carousel-arrow-left" onClick={prevSlide}>
        ‹
      </button>
      <button className="carousel-arrow carousel-arrow-right" onClick={nextSlide}>
        ›
      </button>
      <div className="carousel-dots">
        {carouselSlides.map((_, index) => (
          <span
            key={index}
            className={`carousel-dot ${currentSlide === index ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>
    </div>
  );

  const renderAlbumGrid = () => (
    <div className="album-grid">
      {mockAlbums.map((album) => (
        <div key={album.id} className="album-card">
          <div className="album-cover">
            <img src={album.cover} alt={album.title} />
            <div className="album-play-overlay">
              <span className="play-icon">▶</span>
            </div>
          </div>
          <h3 className="album-title">{album.title}</h3>
          <p className="album-artist">{album.artist} · {album.year}</p>
        </div>
      ))}
    </div>
  );

  const renderPlaylistGrid = () => (
    <div className="album-grid">
      {mockPlaylists.map((playlist) => (
        <div key={playlist.id} className="album-card">
          <div className="album-cover">
            <img src={playlist.cover} alt={playlist.name} />
            <div className="album-play-overlay">
              <span className="play-icon">▶</span>
            </div>
          </div>
          <h3 className="album-title">{playlist.name}</h3>
          <p className="album-artist">{playlist.description}</p>
        </div>
      ))}
    </div>
  );

  const renderRecentList = () => (
    <div className="song-list">
      {mockRecentSongs.map((song, index) => (
        <div key={song.id} className="song-row" onClick={() => onPlaySong?.(song)}>
          <span className="song-index">{index + 1}</span>
          <div className="song-info">
            <span className="song-title">{song.title}</span>
            <span className="song-artist">{song.artist}</span>
          </div>
          <span className="song-album">{song.album}</span>
          <span className="song-duration">
            {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
          </span>
        </div>
      ))}
    </div>
  );

  const getTitle = () => {
    switch (activeKey) {
      case 'my-music': return '我的音乐';
      case 'albums': return '专辑库';
      case 'playlists': return '播放列表';
      case 'recent': return '最近播放';
      default: return '';
    }
  };

  const renderContent = () => {
    switch (activeKey) {
      case 'my-music':
        return (
          <>
            {renderCarousel()}
            <section className="content-section">
              <h2 className="section-title">推荐专辑</h2>
              {renderAlbumGrid()}
            </section>
          </>
        );
      case 'albums':
        return <>{renderAlbumGrid()}</>;
      case 'playlists':
        return <>{renderPlaylistGrid()}</>;
      case 'recent':
        return <>{renderRecentList()}</>;
      default:
        return null;
    }
  };

  return (
    <main className="main-content" key={activeKey}>
      <header className="main-header">
        <h1 className="page-title">{getTitle()}</h1>
      </header>
      <div className="content-area">
        {renderContent()}
      </div>
    </main>
  );
};

export default MainContent;
