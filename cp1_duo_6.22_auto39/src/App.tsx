import { useState, useEffect, useRef, useCallback } from 'react';
import SongList, { Song } from './components/SongList';
import SongForm, { SongFormData } from './components/SongForm';
import { MetronomeEngine, BeatMode } from './components/MetronomeEngine';
import { useTimer } from './components/Timer';
import WaveformCanvas from './components/WaveformCanvas';
import RehearsalReport from './components/RehearsalReport';
import './App.css';

function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatMode, setBeatMode] = useState<BeatMode>('quarter');
  const [volume, setVolume] = useState(50);
  const [isLoading, setIsLoading] = useState(true);

  const metronomeRef = useRef<MetronomeEngine | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const {
    totalDuration,
    currentSongDuration,
    isRunning: timerRunning,
    start: startTimer,
    stop: stopTimer,
    reset: resetTimer,
    switchSong,
    getRecordsArray,
    formatTime,
  } = useTimer();

  useEffect(() => {
    fetch('/api/songs')
      .then(res => res.json())
      .then(data => {
        setSongs(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch songs:', err);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    metronomeRef.current = new MetronomeEngine(120, volume, beatMode);
    
    const engine = metronomeRef.current;
    engine.on('start', () => setIsPlaying(true));
    engine.on('stop', () => setIsPlaying(false));

    return () => {
      engine.destroy();
    };
  }, []);

  useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.setVolume(volume);
    }
  }, [volume]);

  useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.setMode(beatMode);
    }
  }, [beatMode]);

  useEffect(() => {
    const selectedSong = songs.find(s => s.id === selectedSongId);
    if (selectedSong && metronomeRef.current) {
      metronomeRef.current.setBPM(selectedSong.bpm);
    }
  }, [selectedSongId, songs]);

  useEffect(() => {
    if (metronomeRef.current) {
      analyserRef.current = metronomeRef.current.getAnalyserNode();
    }
  }, [isPlaying]);

  const handleSelectSong = useCallback((songId: string) => {
    if (selectedSongId === songId) {
      setSelectedSongId(null);
      if (isPlaying && metronomeRef.current) {
        metronomeRef.current.stop();
      }
      return;
    }

    setSelectedSongId(songId);
    
    const song = songs.find(s => s.id === songId);
    if (song) {
      switchSong(songId, song.name);
      
      if (timerRunning) {
        if (metronomeRef.current) {
          metronomeRef.current.setBPM(song.bpm);
        }
      }
    }
  }, [selectedSongId, songs, isPlaying, timerRunning, switchSong]);

  const handleAddSong = useCallback(() => {
    setShowForm(true);
  }, []);

  const handleSubmitSong = useCallback(async (data: SongFormData) => {
    try {
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (res.ok) {
        const newSong = await res.json();
        setSongs(prev => [...prev, newSong]);
      }
    } catch (err) {
      console.error('Failed to add song:', err);
    }
    
    setShowForm(false);
  }, []);

  const toggleMetronome = useCallback(() => {
    if (!metronomeRef.current) return;

    if (isPlaying) {
      metronomeRef.current.stop();
      stopTimer();
    } else {
      if (!selectedSongId && songs.length > 0) {
        setSelectedSongId(songs[0].id);
        switchSong(songs[0].id, songs[0].name);
        metronomeRef.current.setBPM(songs[0].bpm);
      }
      
      metronomeRef.current.start();
      startTimer();
    }
  }, [isPlaying, selectedSongId, songs, startTimer, stopTimer, switchSong]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  }, []);

  const handleModeChange = useCallback((mode: BeatMode) => {
    setBeatMode(mode);
  }, []);

  const handleEndRehearsal = useCallback(() => {
    if (metronomeRef.current) {
      metronomeRef.current.stop();
    }
    stopTimer();
    setShowReport(true);
  }, [stopTimer]);

  const handleReset = useCallback(() => {
    resetTimer();
    setShowReport(false);
  }, [resetTimer]);

  const selectedSong = songs.find(s => s.id === selectedSongId);

  if (isLoading) {
    return (
      <div className="app-container loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🎸 Band Rehearsal</h1>
        <p className="app-subtitle">乐队排练管理</p>
      </header>

      <main className="app-main">
        <SongList
          songs={songs}
          selectedSongId={selectedSongId}
          onSelectSong={handleSelectSong}
          onAddSong={handleAddSong}
        />
      </main>

      <footer className="toolbar">
        <div className="toolbar-left">
          <div className="waveform-container">
            <WaveformCanvas
              analyserNode={analyserRef.current}
              isPlaying={isPlaying}
              width={200}
              height={40}
            />
          </div>
          
          <div className="timer-display">
            <div className="timer-item">
              <span className="timer-label">当前曲目</span>
              <span className="timer-value">{formatTime(currentSongDuration)}</span>
            </div>
            <div className="timer-item">
              <span className="timer-label">累计时长</span>
              <span className="timer-value accent">{formatTime(totalDuration)}</span>
            </div>
          </div>
        </div>

        <div className="toolbar-center">
          <div className="mode-switch">
            <button
              className={`mode-btn ${beatMode === 'quarter' ? 'active' : ''}`}
              onClick={() => handleModeChange('quarter')}
            >
              四分音符
            </button>
            <button
              className={`mode-btn ${beatMode === 'eighth' ? 'active' : ''}`}
              onClick={() => handleModeChange('eighth')}
            >
              八分音符
            </button>
          </div>

          <div className="volume-control">
            <span className="volume-icon">🔊</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
            <span className="volume-value">{volume}%</span>
          </div>
        </div>

        <div className="toolbar-right">
          {selectedSong && (
            <div className="current-song">
              <span className="current-song-name">{selectedSong.name}</span>
              <span className="current-song-bpm">{selectedSong.bpm} BPM</span>
            </div>
          )}
          
          <div className="action-buttons">
            <button
              className={`play-btn ${isPlaying ? 'playing' : ''}`}
              onClick={toggleMetronome}
            >
              {isPlaying ? '⏸ 停止' : '▶ 开始'}
            </button>
            
            {timerRunning && (
              <button className="end-btn" onClick={handleEndRehearsal}>
                结束排练
              </button>
            )}
          </div>
        </div>
      </footer>

      {showForm && (
        <SongForm
          onSubmit={handleSubmitSong}
          onCancel={() => setShowForm(false)}
        />
      )}

      {showReport && (
        <RehearsalReport
          records={getRecordsArray()}
          totalDuration={totalDuration}
          onClose={handleReset}
        />
      )}
    </div>
  );
}

export default App;
