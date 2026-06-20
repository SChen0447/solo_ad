import React, { useState, useRef, useEffect, useCallback } from 'react';
import MixerChannel from './MixerChannel';
import MasterControl from './MasterControl';
import { AudioEngine } from '../models/AudioEngine';

const MixerBoard: React.FC = () => {
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const [trackOrder, setTrackOrder] = useState<number[]>([0, 1, 2, 3]);
  const [trackStates, setTrackStates] = useState(
    Array.from({ length: 4 }, (_, i) => ({
      id: i,
      name: `Track ${i + 1}`,
      volume: 70,
      pan: 0,
      muted: false,
      solo: false,
      hasAudio: false,
    }))
  );
  const [masterVolume, setMasterVolume] = useState(80);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    audioEngineRef.current = new AudioEngine(4);
    return () => {
      audioEngineRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    let animationId: number;
    const updateTime = () => {
      if (audioEngineRef.current) {
        setCurrentTime(audioEngineRef.current.getCurrentTime());
        setDuration(audioEngineRef.current.getDuration());
      }
      animationId = requestAnimationFrame(updateTime);
    };
    animationId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const handleVolumeChange = useCallback((index: number, value: number) => {
    setTrackStates(prev => {
      const next = [...prev];
      next[index] = { ...next[index], volume: value };
      return next;
    });
    audioEngineRef.current?.setVolume(index, value);
  }, []);

  const handlePanChange = useCallback((index: number, value: number) => {
    setTrackStates(prev => {
      const next = [...prev];
      next[index] = { ...next[index], pan: value };
      return next;
    });
    audioEngineRef.current?.setPan(index, value);
  }, []);

  const handleToggleMute = useCallback((index: number) => {
    setTrackStates(prev => {
      const next = [...prev];
      next[index] = { ...next[index], muted: !next[index].muted };
      return next;
    });
    audioEngineRef.current?.toggleMute(index);
  }, []);

  const handleToggleSolo = useCallback((index: number) => {
    setTrackStates(prev => {
      const next = [...prev];
      next[index] = { ...next[index], solo: !next[index].solo };
      return next;
    });
    audioEngineRef.current?.toggleSolo(index);
  }, []);

  const handleFileDrop = useCallback(async (index: number, file: File) => {
    if (!audioEngineRef.current) return;
    try {
      await audioEngineRef.current.loadAudio(file, index);
      setTrackStates(prev => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          name: file.name.replace(/\.[^/.]+$/, ''),
          hasAudio: true,
        };
        return next;
      });
      setDuration(audioEngineRef.current.getDuration());
    } catch (err) {
      console.error('Failed to load audio:', err);
    }
  }, []);

  const handleMasterVolumeChange = useCallback((value: number) => {
    setMasterVolume(value);
    audioEngineRef.current?.setMasterVolume(value);
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      audioEngineRef.current?.stop();
      setIsPlaying(false);
    } else {
      audioEngineRef.current?.start();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleBPMChange = useCallback((value: number) => {
    setBpm(value);
    audioEngineRef.current?.setBPM(value);
  }, []);

  const handleSeek = useCallback((time: number) => {
    audioEngineRef.current?.seek(time);
    setCurrentTime(time);
  }, []);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDropTrack = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === toIndex) {
      setDraggingIndex(null);
      setDragOverIndex(null);
      return;
    }

    const fromIndex = draggingIndex;
    const newOrder = [...trackOrder];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    setTrackOrder(newOrder);

    const newStates = [...trackStates];
    const [removedState] = newStates.splice(fromIndex, 1);
    newStates.splice(toIndex, 0, removedState);
    setTrackStates(newStates);

    audioEngineRef.current?.reorderTracks(fromIndex, toIndex);

    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="mixer-board">
      <div className="app-title">
        <h1>VIRTUAL MIXER</h1>
        <span className="subtitle">在线虚拟乐器混音台</span>
      </div>

      <MasterControl
        masterVolume={masterVolume}
        isPlaying={isPlaying}
        bpm={bpm}
        currentTime={currentTime}
        duration={duration}
        onMasterVolumeChange={handleMasterVolumeChange}
        onTogglePlay={handleTogglePlay}
        onBPMChange={handleBPMChange}
        onSeek={handleSeek}
      />

      <div className="channels-container">
        {trackOrder.map((trackId, displayIndex) => {
          const state = trackStates[displayIndex];
          return (
            <MixerChannel
              key={trackId}
              trackIndex={displayIndex}
              trackName={state.name}
              volume={state.volume}
              pan={state.pan}
              muted={state.muted}
              solo={state.solo}
              hasAudio={state.hasAudio}
              analyser={audioEngineRef.current?.getAnalyser(displayIndex) as any}
              onVolumeChange={(v) => handleVolumeChange(displayIndex, v)}
              onPanChange={(p) => handlePanChange(displayIndex, p)}
              onToggleMute={() => handleToggleMute(displayIndex)}
              onToggleSolo={() => handleToggleSolo(displayIndex)}
              onFileDrop={(file) => handleFileDrop(displayIndex, file)}
              onDragStart={(e) => handleDragStart(e, displayIndex)}
              onDragOver={(e) => handleDragOver(e, displayIndex)}
              onDropTrack={(e) => handleDropTrack(e, displayIndex)}
              isDragging={draggingIndex === displayIndex}
              dragOver={dragOverIndex === displayIndex && draggingIndex !== displayIndex}
            />
          );
        })}
      </div>

      <div className="footer-tip">
        提示：拖拽 wav/mp3 文件到轨道波形区域加载音频，拖拽轨道标题可重新排序
      </div>
    </div>
  );
};

export default MixerBoard;
