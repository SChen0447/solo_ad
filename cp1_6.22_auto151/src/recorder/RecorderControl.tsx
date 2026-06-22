import { useState, useEffect, useRef, useCallback } from 'react';
import { eventBus } from '@/events/EventBus';
import { audioEngine, TimbreId } from '@/audio/AudioEngine';
import './RecorderControl.css';

interface NoteEvent {
  type: 'on' | 'off';
  note: string;
  timbre: TimbreId;
  timestamp: number;
}

type RecorderState = 'idle' | 'recording' | 'playing';

export function RecorderControl() {
  const [state, setState] = useState<RecorderState>('idle');
  const [hasRecording, setHasRecording] = useState(false);
  const recordedEventsRef = useRef<NoteEvent[]>([]);
  const startTimeRef = useRef<number>(0);
  const playTimeoutsRef = useRef<number[]>([]);
  const activePlayNotesRef = useRef<Set<string>>(new Set());

  const handleNoteOn = useCallback((event: Omit<NoteEvent, 'type'>) => {
    if (state === 'recording') {
      recordedEventsRef.current.push({
        ...event,
        type: 'on',
        timestamp: event.timestamp - startTimeRef.current,
      });
    }
  }, [state]);

  const handleNoteOff = useCallback((event: Omit<NoteEvent, 'type'>) => {
    if (state === 'recording') {
      recordedEventsRef.current.push({
        ...event,
        type: 'off',
        timestamp: event.timestamp - startTimeRef.current,
      });
    }
  }, [state]);

  useEffect(() => {
    const unsubOn = eventBus.on('note:on', handleNoteOn);
    const unsubOff = eventBus.on('note:off', handleNoteOff);
    return () => {
      unsubOn();
      unsubOff();
    };
  }, [handleNoteOn, handleNoteOff]);

  const startRecording = useCallback(() => {
    recordedEventsRef.current = [];
    startTimeRef.current = performance.now();
    setState('recording');
    setHasRecording(false);
  }, []);

  const stopRecording = useCallback(() => {
    setState('idle');
    if (recordedEventsRef.current.length > 0) {
      setHasRecording(true);
    }
  }, []);

  const stopPlayback = useCallback(() => {
    playTimeoutsRef.current.forEach((id) => clearTimeout(id));
    playTimeoutsRef.current = [];
    activePlayNotesRef.current.forEach((key) => {
      const [timbre, note] = key.split('|');
      audioEngine.stopNote(timbre as TimbreId, note);
    });
    activePlayNotesRef.current.clear();
    setState('idle');
  }, []);

  const startPlayback = useCallback(() => {
    if (recordedEventsRef.current.length === 0) return;

    setState('playing');
    playTimeoutsRef.current = [];
    activePlayNotesRef.current.clear();

    recordedEventsRef.current.forEach((event) => {
      const timeoutId = window.setTimeout(() => {
        if (event.type === 'on') {
          audioEngine.playNote(event.timbre, event.note);
          activePlayNotesRef.current.add(`${event.timbre}|${event.note}`);
        } else {
          audioEngine.stopNote(event.timbre, event.note);
          activePlayNotesRef.current.delete(`${event.timbre}|${event.note}`);
        }
      }, event.timestamp);
      playTimeoutsRef.current.push(timeoutId);
    });

    const lastEvent = recordedEventsRef.current[recordedEventsRef.current.length - 1];
    const endTimeoutId = window.setTimeout(() => {
      activePlayNotesRef.current.forEach((key) => {
        const [timbre, note] = key.split('|');
        audioEngine.stopNote(timbre as TimbreId, note);
      });
      activePlayNotesRef.current.clear();
      setState('idle');
    }, lastEvent.timestamp + 500);
    playTimeoutsRef.current.push(endTimeoutId);
  }, []);

  useEffect(() => {
    return () => {
      playTimeoutsRef.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  return (
    <div className="recorder-control">
      <div className="recorder-control__title">录音控制</div>
      <div className="recorder-control__buttons">
        <button
          className={`recorder-btn recorder-btn--record ${state === 'recording' ? 'recorder-btn--active' : ''}`}
          onClick={state === 'recording' ? stopRecording : startRecording}
          disabled={state === 'playing'}
          title={state === 'recording' ? '停止录音' : '开始录音'}
        >
          {state === 'recording' ? (
            <span className="recorder-btn__icon recorder-btn__icon--stop" />
          ) : (
            <span className="recorder-btn__icon recorder-btn__icon--record" />
          )}
        </button>
        <button
          className="recorder-btn recorder-btn--stop"
          onClick={stopPlayback}
          disabled={state !== 'playing'}
          title="停止播放"
        >
          <span className="recorder-btn__icon recorder-btn__icon--square" />
        </button>
        <button
          className="recorder-btn recorder-btn--play"
          onClick={state === 'playing' ? stopPlayback : startPlayback}
          disabled={!hasRecording && state !== 'playing'}
          title="播放录音"
        >
          <span className="recorder-btn__icon recorder-btn__icon--play" />
        </button>
        <div className="recorder-control__status">
          {state === 'recording' && <span className="status-dot status-dot--recording" />}
          {state === 'playing' && <span className="status-dot status-dot--playing" />}
          <span className="status-text">
            {state === 'recording' && '录音中...'}
            {state === 'playing' && '播放中...'}
            {state === 'idle' && !hasRecording && '准备就绪'}
            {state === 'idle' && hasRecording && `已录制 ${recordedEventsRef.current.length} 个事件`}
          </span>
        </div>
      </div>
    </div>
  );
}
