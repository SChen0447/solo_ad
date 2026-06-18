import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useTravelStore } from './store';
import { findNearestPointIndex } from './utils/path';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const PLAYBACK_INTERVAL_MS = 1000;

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

export function TimelineController(): JSX.Element {
  const travelData = useTravelStore((state) => state.travelData);
  const currentTime = useTravelStore((state) => state.currentTime);
  const isPlaying = useTravelStore((state) => state.isPlaying);
  const togglePlayback = useTravelStore((state) => state.togglePlayback);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef<number>(0);

  const timeRange = useMemo(() => {
    if (travelData.length === 0) {
      return { min: 0, max: 0, totalDays: 0 };
    }
    const min = new Date(travelData[0].date).getTime();
    const max = new Date(travelData[travelData.length - 1].date).getTime();
    const totalDays = Math.ceil((max - min) / DAY_IN_MS);
    return { min, max, totalDays };
  }, [travelData]);

  const dateTicks = useMemo(() => {
    if (travelData.length === 0 || timeRange.totalDays === 0) return [];

    const ticks: { time: number; label: string }[] = [];
    const numTicks = Math.min(5, travelData.length);

    for (let i = 0; i < numTicks; i++) {
      const index = Math.round((i * (travelData.length - 1)) / (numTicks - 1));
      const point = travelData[index];
      const time = new Date(point.date).getTime();
      ticks.push({
        time,
        label: point.date,
      });
    }

    return ticks;
  }, [travelData, timeRange.totalDays]);

  const progressPercent = useMemo(() => {
    if (timeRange.totalDays === 0) return 0;
    return ((currentTime - timeRange.min) / (timeRange.max - timeRange.min)) * 100;
  }, [currentTime, timeRange]);

  useEffect(() => {
    currentIndexRef.current = findNearestPointIndex(travelData, currentTime);
  }, [travelData, currentTime]);

  useEffect(() => {
    if (isPlaying && travelData.length > 0) {
      const store = useTravelStore.getState();

      currentIndexRef.current = findNearestPointIndex(travelData, store.currentTime);

      if (currentIndexRef.current >= travelData.length - 1) {
        currentIndexRef.current = 0;
        const firstPointTime = new Date(travelData[0].date).getTime();
        store.setCurrentTime(firstPointTime);
        store.selectPoint(0);
      }

      intervalRef.current = setInterval(() => {
        const s = useTravelStore.getState();
        const data = s.travelData;
        if (data.length === 0) {
          s.stopPlayback();
          return;
        }

        const nextIndex = currentIndexRef.current + 1;

        if (nextIndex >= data.length) {
          currentIndexRef.current = data.length - 1;
          s.stopPlayback();
          return;
        }

        const nextPointTime = new Date(data[nextIndex].date).getTime();
        currentIndexRef.current = nextIndex;
        s.setCurrentTime(nextPointTime);
        s.selectPoint(nextIndex);
      }, PLAYBACK_INTERVAL_MS);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, travelData]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      const newTime = timeRange.min + value * DAY_IN_MS;
      const store = useTravelStore.getState();
      store.setCurrentTime(newTime);

      const nearestIndex = findNearestPointIndex(travelData, newTime);
      if (nearestIndex >= 0) {
        currentIndexRef.current = nearestIndex;
        store.selectPoint(nearestIndex);
      }
    },
    [timeRange.min, travelData]
  );

  const handleSkipBack = useCallback(() => {
    if (travelData.length === 0) return;
    currentIndexRef.current = 0;
    const store = useTravelStore.getState();
    store.setCurrentTime(timeRange.min);
    store.selectPoint(0);
  }, [travelData.length, timeRange.min]);

  const handleSkipForward = useCallback(() => {
    if (travelData.length === 0) return;
    currentIndexRef.current = travelData.length - 1;
    const store = useTravelStore.getState();
    store.setCurrentTime(timeRange.max);
    store.selectPoint(travelData.length - 1);
  }, [travelData.length, timeRange.max]);

  if (travelData.length === 0) {
    return (
      <div className="timeline-container disabled">
        <div className="timeline-placeholder">
          上传数据后即可使用时间轴控制
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <div className="timeline-title">旅行时间线</div>
        <div className="timeline-date">{formatDate(currentTime)}</div>
      </div>

      <div className="timeline-controls">
        <button
          className="control-btn skip-btn"
          onClick={handleSkipBack}
          title="回到起点"
        >
          <SkipBack size={20} />
        </button>
        <button
          className={`control-btn play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlayback}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button
          className="control-btn skip-btn"
          onClick={handleSkipForward}
          title="跳到终点"
        >
          <SkipForward size={20} />
        </button>
      </div>

      <div className="timeline-slider-container">
        <div className="timeline-slider-track">
          <div
            className="timeline-slider-progress"
            style={{ width: `${progressPercent}%` }}
          />
          <input
            type="range"
            min={0}
            max={timeRange.totalDays}
            step={1}
            value={Math.round((currentTime - timeRange.min) / DAY_IN_MS)}
            onChange={handleSliderChange}
            className="timeline-slider"
          />
        </div>

        <div className="timeline-ticks">
          {dateTicks.map((tick, index) => {
            const percent = ((tick.time - timeRange.min) / (timeRange.max - timeRange.min)) * 100;
            return (
              <div
                key={index}
                className="timeline-tick"
                style={{ left: `${percent}%` }}
              >
                <div className="timeline-tick-mark" />
                <div className="timeline-tick-label">{tick.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="timeline-stats">
        <div className="stat-item">
          <span className="stat-label">目的地数量</span>
          <span className="stat-value">{travelData.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">旅行天数</span>
          <span className="stat-value">{timeRange.totalDays}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">当前进度</span>
          <span className="stat-value">{Math.round(progressPercent)}%</span>
        </div>
      </div>
    </div>
  );
}
