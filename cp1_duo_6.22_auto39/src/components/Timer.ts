import { useRef, useState, useCallback, useEffect } from 'react';

export interface RehearsalRecord {
  songId: string;
  songName: string;
  count: number;
  totalDuration: number;
}

export function useTimer() {
  const startTimeRef = useRef<number | null>(null);
  const accumulatedRef = useRef<number>(0);
  const currentSongStartTimeRef = useRef<number | null>(null);
  const currentSongAccumulatedRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);
  
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [currentSongDuration, setCurrentSongDuration] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [records, setRecords] = useState<Map<string, RehearsalRecord>>(new Map());

  const updateTime = useCallback(() => {
    const now = Date.now();
    
    if (startTimeRef.current !== null) {
      const elapsed = (now - startTimeRef.current) / 1000;
      const total = accumulatedRef.current + elapsed;
      setTotalDuration(total);
    }
    
    if (currentSongStartTimeRef.current !== null) {
      const elapsed = (now - currentSongStartTimeRef.current) / 1000;
      const total = currentSongAccumulatedRef.current + elapsed;
      setCurrentSongDuration(total);
    }
  }, []);

  const start = useCallback(() => {
    if (isRunning) return;
    
    const now = Date.now();
    startTimeRef.current = now;
    currentSongStartTimeRef.current = now;
    setIsRunning(true);
    
    intervalRef.current = window.setInterval(() => {
      updateTime();
    }, 1000);
    
    updateTime();
  }, [isRunning, updateTime]);

  const stop = useCallback(() => {
    if (!isRunning) return;
    
    const now = Date.now();
    
    if (startTimeRef.current !== null) {
      accumulatedRef.current += (now - startTimeRef.current) / 1000;
      startTimeRef.current = null;
    }
    
    if (currentSongStartTimeRef.current !== null) {
      currentSongAccumulatedRef.current += (now - currentSongStartTimeRef.current) / 1000;
      currentSongStartTimeRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsRunning(false);
    updateTime();
  }, [isRunning, updateTime]);

  const reset = useCallback(() => {
    stop();
    accumulatedRef.current = 0;
    currentSongAccumulatedRef.current = 0;
    setTotalDuration(0);
    setCurrentSongDuration(0);
    setRecords(new Map());
  }, [stop]);

  const switchSong = useCallback((songId: string, songName: string) => {
    const now = Date.now();
    
    if (currentSongStartTimeRef.current !== null) {
      currentSongAccumulatedRef.current += (now - currentSongStartTimeRef.current) / 1000;
    }
    
    setRecords(prev => {
      const newRecords = new Map(prev);
      const existing = newRecords.get(songId);
      if (existing) {
        newRecords.set(songId, {
          ...existing,
          count: existing.count + 1,
        });
      } else {
        newRecords.set(songId, {
          songId,
          songName,
          count: 1,
          totalDuration: 0,
        });
      }
      return newRecords;
    });
    
    currentSongAccumulatedRef.current = 0;
    if (isRunning) {
      currentSongStartTimeRef.current = now;
    }
    setCurrentSongDuration(0);
  }, [isRunning]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getRecordsArray = useCallback((): RehearsalRecord[] => {
    const now = Date.now();
    const result: RehearsalRecord[] = [];
    
    records.forEach((record, songId) => {
      let totalDuration = record.totalDuration;
      if (isRunning && currentSongStartTimeRef.current !== null && songId === record.songId) {
        totalDuration += (now - currentSongStartTimeRef.current) / 1000;
      }
      result.push({ ...record, totalDuration });
    });
    
    return result;
  }, [records, isRunning]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    totalDuration,
    currentSongDuration,
    isRunning,
    start,
    stop,
    reset,
    switchSong,
    getRecordsArray,
    formatTime,
  };
}
