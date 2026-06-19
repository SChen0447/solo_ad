import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import PlayerBar from './PlayerBar';
import { NavKey, Song } from './types';
import './App.css';

const mockSongs: Song[] = [
  {
    id: 's1',
    title: 'Starlight',
    artist: 'Cosmic Band',
    album: 'Starlight',
    duration: 234,
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=space%20stars%20galaxy%20purple%20blue%20album%20cover%20cosmic%20music&image_size=square',
  },
  {
    id: 's2',
    title: 'Midnight Drive',
    artist: 'Luna Wave',
    album: 'Midnight City',
    duration: 198,
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=abstract%20dark%20purple%20album%20cover%20with%20neon%20city%20skyline%20music&image_size=square',
  },
  {
    id: 's3',
    title: 'Ocean Breeze',
    artist: 'Blue Horizon',
    album: 'Ocean Dreams',
    duration: 267,
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ocean%20waves%20at%20sunset%20dreamy%20album%20cover%20ambient%20music&image_size=square',
  },
  {
    id: 's4',
    title: 'Neon Lights',
    artist: 'Neon Pulse',
    album: 'Electric Soul',
    duration: 215,
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=electric%20neon%20blue%20abstract%20album%20cover%20electronic%20music&image_size=square',
  },
];

const App: React.FC = () => {
  const [activeKey, setActiveKey] = useState<NavKey>('my-music');
  const [currentSong, setCurrentSong] = useState<Song | null>(mockSongs[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying || !currentSong) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const animate = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      setProgress((prev) => {
        const next = prev + delta / (currentSong.duration * 1000);
        if (next >= 1) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentSong]);

  const handlePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleNext = () => {
    if (!currentSong) return;
    const currentIndex = mockSongs.findIndex((s) => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % mockSongs.length;
    setCurrentSong(mockSongs[nextIndex]);
    setProgress(0);
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  const handleSeek = (percent: number) => {
    setProgress(percent);
  };

  const handlePlaySong = (song: Song) => {
    setCurrentSong(song);
    setProgress(0);
    setIsPlaying(true);
  };

  const duration = currentSong?.duration || 0;

  return (
    <div className="app">
      <Sidebar activeKey={activeKey} onSelect={setActiveKey} />
      <MainContent activeKey={activeKey} onPlaySong={handlePlaySong} />
      <PlayerBar
        currentSong={currentSong}
        isPlaying={isPlaying}
        progress={progress}
        duration={duration}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onSeek={handleSeek}
      />
    </div>
  );
};

export default App;
