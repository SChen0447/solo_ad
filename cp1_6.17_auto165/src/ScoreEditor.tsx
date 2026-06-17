import { useEffect, useRef, useState, useCallback } from 'react';
import { Download, Play, Pause } from 'lucide-react';
import { useAppStore } from './store';
import { Note, Score, User, EditType, NOTE_NAMES } from './types';

interface ScoreEditorProps {
  score: Score;
  onNoteEdit: (type: EditType, note: Note) => void;
  onCursorMove: (x: number, y: number) => void;
  currentUser: User;
}

const STAFF_LINE_SPACING = 20;
const STAFF_LINE_COUNT = 5;
const NOTE_RADIUS = 8;
const NOTE_ADD_ANIMATION_DURATION = 150;
const OPERATION_TRAIL_DURATION = 1500;
const CURSOR_THROTTLE_MS = 50;

const PITCH_TO_MIDI: Record<string, number> = {
  'C4': 60, 'D4': 62, 'E4': 64, 'F4': 65, 'G4': 67, 'A4': 69, 'B4': 71,
  'C5': 72, 'D5': 74, 'E5': 76, 'F5': 77, 'G5': 79, 'A5': 81, 'B5': 83,
  'C6': 84,
};

const MIDI_TO_PITCH: Record<number, string> = Object.entries(PITCH_TO_MIDI)
  .reduce((acc, [pitch, midi]) => ({ ...acc, [midi]: pitch }), {});

export default function ScoreEditor({
  score,
  onNoteEdit,
  onCursorMove,
  currentUser,
}: ScoreEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastCursorSendRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const activeNotesRef = useRef<Map<string, { oscillator: OscillatorNode; gain: GainNode }>>(new Map());

  const {
    isPlaying,
    playbackSpeed,
    cursors,
    operationTrails,
    highlightedNoteIds,
    setIsPlaying,
    setCurrentPlaybackTime,
    setHighlightedNoteIds,
    addOperationTrail,
    removeOperationTrail,
  } = useAppStore();

  const [hoveredNote, setHoveredNote] = useState<Note | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggingNote, setDraggingNote] = useState<Note | null>(null);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [animatingNotes, setAnimatingNotes] = useState<Map<string, number>>(new Map());
  const [currentTrail, setCurrentTrail] = useState<{ x: number; y: number }[]>([]);

  const getStaffTop = useCallback(() => {
    return 80;
  }, []);

  const getStaffBottom = useCallback(() => {
    return getStaffTop() + (STAFF_LINE_COUNT - 1) * STAFF_LINE_SPACING;
  }, [getStaffTop]);

  const getMeasureWidth = useCallback(() => {
    return 200;
  }, []);

  const yToPitch = useCallback((y: number): string => {
    const staffBottom = getStaffBottom();
    const semitonesFromBottom = Math.round((staffBottom - y) / (STAFF_LINE_SPACING / 2));
    const midiNote = 60 + semitonesFromBottom;
    return MIDI_TO_PITCH[midiNote] || `C${Math.floor(midiNote / 12) - 1}`;
  }, [getStaffBottom]);

  const pitchToY = useCallback((pitch: string): number => {
    const midiNote = PITCH_TO_MIDI[pitch] || 60;
    const semitonesFromMiddleC = midiNote - 60;
    const staffBottom = getStaffBottom();
    return staffBottom - semitonesFromMiddleC * (STAFF_LINE_SPACING / 2);
  }, [getStaffBottom]);

  const getNoteDurationName = (duration: number): string => {
    if (duration >= 1) return '四分音符';
    if (duration >= 0.5) return '八分音符';
    if (duration >= 0.25) return '十六分音符';
    return '二分音符';
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#ECF0F1';
    ctx.lineWidth = 1;
    const staffTop = getStaffTop();
    for (let i = 0; i < STAFF_LINE_COUNT; i++) {
      const y = staffTop + i * STAFF_LINE_SPACING;
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(width - 50, y);
      ctx.stroke();
    }

    const measureWidth = getMeasureWidth();
    const totalMeasures = Math.max(10, Math.ceil(score.notes.length / 4) + 2);
    for (let i = 0; i <= totalMeasures; i++) {
      const x = 50 + i * measureWidth;
      ctx.strokeStyle = '#BDC3C7';
      ctx.lineWidth = i === 0 || i === totalMeasures ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, staffTop);
      ctx.lineTo(x, staffTop + (STAFF_LINE_COUNT - 1) * STAFF_LINE_SPACING);
      ctx.stroke();
    }

    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(score.timeSignature, 20, staffTop + 2 * STAFF_LINE_SPACING);
    ctx.fillText(score.keySignature, 20, staffTop + 3 * STAFF_LINE_SPACING);

    const now = Date.now();
    score.notes.forEach((note) => {
      const isHighlighted = highlightedNoteIds.includes(note.id);
      const isDragging = draggingNote?.id === note.id;
      const animationStart = animatingNotes.get(note.id);
      const isAnimating = animationStart && (now - animationStart) < NOTE_ADD_ANIMATION_DURATION;

      let scale = 1;
      if (isAnimating && animationStart) {
        const progress = (now - animationStart) / NOTE_ADD_ANIMATION_DURATION;
        scale = 1 + 0.1 * Math.sin(progress * Math.PI);
      }

      const radius = NOTE_RADIUS * scale;

      ctx.beginPath();
      ctx.arc(note.x, note.y, radius, 0, Math.PI * 2);

      if (isHighlighted) {
        ctx.fillStyle = '#3498DB';
      } else if (isDragging) {
        ctx.fillStyle = '#FFA500';
      } else {
        ctx.fillStyle = '#2C3E50';
      }
      ctx.fill();

      const stemX = note.x + radius + 2;
      const stemTop = note.y - 30;
      const stemBottom = note.y;
      ctx.beginPath();
      ctx.moveTo(stemX, stemBottom);
      ctx.lineTo(stemX, stemTop);
      ctx.lineWidth = 2;
      ctx.strokeStyle = isHighlighted ? '#3498DB' : '#2C3E50';
      ctx.stroke();
    });

    if (isPlaying) {
      const elapsed = (Date.now() - playbackStartTimeRef.current) / 1000 * playbackSpeed;
      const progressX = 50 + elapsed * 100;
      ctx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(progressX, staffTop - 20);
      ctx.lineTo(progressX, staffTop + (STAFF_LINE_COUNT - 1) * STAFF_LINE_SPACING + 20);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    operationTrails.forEach((trail) => {
      if (trail.points.length < 2) return;
      const age = Date.now() - trail.timestamp;
      const opacity = Math.max(0, 1 - age / OPERATION_TRAIL_DURATION);
      ctx.strokeStyle = `rgba(52, 152, 219, ${opacity})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(trail.points[0].x, trail.points[0].y);
      for (let i = 1; i < trail.points.length; i++) {
        ctx.lineTo(trail.points[i].x, trail.points[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });

    if (currentTrail.length > 1) {
      ctx.strokeStyle = 'rgba(52, 152, 219, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(currentTrail[0].x, currentTrail[0].y);
      for (let i = 1; i < currentTrail.length; i++) {
        ctx.lineTo(currentTrail[i].x, currentTrail[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    cursors.forEach((cursor) => {
      if (cursor.userId === currentUser.id) return;
      const user = useAppStore.getState().users.find((u) => u.id === cursor.userId);
      if (!user) return;

      const age = Date.now() - cursor.timestamp;
      if (age > 5000) return;

      const pulseScale = 1 + 0.2 * Math.sin(Date.now() / 500);
      const radius = 6 * pulseScale;

      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = user.color;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    if (hoveredNote) {
      const tooltipX = hoveredNote.x + 15;
      const tooltipY = hoveredNote.y - 30;
      const padding = 8;
      const text = `${hoveredNote.pitch} (${getNoteDurationName(hoveredNote.duration)})`;
      ctx.font = '12px Arial';
      const textWidth = ctx.measureText(text).width;

      ctx.fillStyle = 'rgba(44, 62, 80, 0.9)';
      ctx.beginPath();
      ctx.roundRect(tooltipX - padding, tooltipY - 16, textWidth + padding * 2, 24, 4);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.fillText(text, tooltipX, tooltipY);
    }

    animationFrameRef.current = requestAnimationFrame(render);
  }, [
    score,
    highlightedNoteIds,
    draggingNote,
    animatingNotes,
    isPlaying,
    playbackSpeed,
    operationTrails,
    currentTrail,
    cursors,
    hoveredNote,
    currentUser.id,
    getStaffTop,
    getMeasureWidth,
  ]);

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      operationTrails.forEach((trail) => {
        if (now - trail.timestamp > OPERATION_TRAIL_DURATION) {
          removeOperationTrail(trail.id);
        }
      });
    }, 500);

    return () => clearInterval(cleanupInterval);
  }, [operationTrails, removeOperationTrail]);

  const getNoteAtPosition = useCallback((x: number, y: number): Note | null => {
    for (const note of score.notes) {
      const dx = x - note.x;
      const dy = y - note.y;
      if (Math.sqrt(dx * dx + dy * dy) <= NOTE_RADIUS + 5) {
        return note;
      }
    }
    return null;
  }, [score.notes]);

  const generateNoteId = () => `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const existingNote = getNoteAtPosition(x, y);
    if (existingNote) {
      onNoteEdit('delete', existingNote);
      return;
    }

    const staffTop = getStaffTop();
    const staffBottom = getStaffBottom();
    if (y < staffTop - 30 || y > staffBottom + 30) return;

    const measureWidth = getMeasureWidth();
    const measure = Math.floor((x - 50) / measureWidth);
    const positionInMeasure = ((x - 50) % measureWidth) / measureWidth;
    const pitch = yToPitch(y);

    const newNote: Note = {
      id: generateNoteId(),
      pitch,
      duration: 1,
      measure,
      position: positionInMeasure,
      x: 50 + measure * measureWidth + positionInMeasure * measureWidth,
      y: pitchToY(pitch),
      velocity: 0.8 + Math.random() * 0.2,
      delay: Math.random() * 0.05,
    };

    onNoteEdit('add', newNote);
    setAnimatingNotes((prev) => new Map(prev).set(newNote.id, Date.now()));

    setTimeout(() => {
      setAnimatingNotes((prev) => {
        const next = new Map(prev);
        next.delete(newNote.id);
        return next;
      });
    }, NOTE_ADD_ANIMATION_DURATION);
  }, [getNoteAtPosition, getStaffTop, getStaffBottom, getMeasureWidth, yToPitch, pitchToY, onNoteEdit]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    const now = Date.now();
    if (now - lastCursorSendRef.current > CURSOR_THROTTLE_MS) {
      onCursorMove(x, y);
      lastCursorSendRef.current = now;
    }

    const hovered = getNoteAtPosition(x, y);
    setHoveredNote(hovered);

    if (draggingNote) {
      setCurrentTrail((prev) => [...prev, { x, y }]);

      const staffTop = getStaffTop();
      const staffBottom = getStaffBottom();
      let newY = y;
      newY = Math.max(staffTop - 40, Math.min(staffBottom + 40, newY));

      const newPitch = yToPitch(newY);
      const updatedNote: Note = {
        ...draggingNote,
        pitch: newPitch,
        y: pitchToY(newPitch),
      };
      setDraggingNote(updatedNote);
      onNoteEdit('update', updatedNote);
    }
  }, [getNoteAtPosition, draggingNote, getStaffTop, getStaffBottom, yToPitch, pitchToY, onCursorMove, onNoteEdit]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const note = getNoteAtPosition(x, y);
    if (note) {
      setDraggingNote(note);
      setDragStartY(y);
      setCurrentTrail([{ x, y }]);
    }
  }, [getNoteAtPosition]);

  const handleMouseUp = useCallback(() => {
    if (draggingNote && currentTrail.length > 0) {
      const trail = {
        id: `trail-${Date.now()}`,
        userId: currentUser.id,
        points: [...currentTrail],
        timestamp: Date.now(),
      };
      addOperationTrail(trail);
    }
    setDraggingNote(null);
    setCurrentTrail([]);
  }, [draggingNote, currentTrail, currentUser.id, addOperationTrail]);

  const handleMouseLeave = useCallback(() => {
    setHoveredNote(null);
    if (draggingNote) {
      handleMouseUp();
    }
  }, [draggingNote, handleMouseUp]);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playNote = useCallback((note: Note, startTime: number) => {
    const audioContext = initAudioContext();
    const midiNote = PITCH_TO_MIDI[note.pitch] || 60;
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startTime);

    const velocity = note.velocity || 0.8;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.3, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5 * playbackSpeed);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.6 * playbackSpeed);

    activeNotesRef.current.set(note.id, { oscillator, gain: gainNode });

    oscillator.onended = () => {
      activeNotesRef.current.delete(note.id);
    };
  }, [initAudioContext, playbackSpeed]);

  const stopAllNotes = useCallback(() => {
    activeNotesRef.current.forEach(({ oscillator, gain }) => {
      try {
        gain.gain.cancelScheduledValues(audioContextRef.current?.currentTime || 0);
        gain.gain.setValueAtTime(0, audioContextRef.current?.currentTime || 0);
        oscillator.stop();
      } catch (e) {
        // Ignore errors from already stopped notes
      }
    });
    activeNotesRef.current.clear();
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      stopAllNotes();
      setHighlightedNoteIds([]);
      return;
    }

    const audioContext = initAudioContext();
    playbackStartTimeRef.current = Date.now();
    const baseTime = audioContext.currentTime + 0.1;

    const sortedNotes = [...score.notes].sort((a, b) => {
      const timeA = a.measure * 4 + a.position * 4;
      const timeB = b.measure * 4 + b.position * 4;
      return timeA - timeB;
    });

    sortedNotes.forEach((note, index) => {
      const timeOffset = (note.measure * 4 + note.position * 4) / playbackSpeed;
      const noteTime = baseTime + timeOffset + (note.delay || 0);
      setTimeout(() => {
        if (useAppStore.getState().isPlaying) {
          playNote(note, audioContext.currentTime);
          setHighlightedNoteIds([note.id]);
          setCurrentPlaybackTime(timeOffset);
        }
      }, timeOffset * 1000);
    });

    const totalDuration = sortedNotes.length > 0
      ? (sortedNotes[sortedNotes.length - 1].measure * 4 + sortedNotes[sortedNotes.length - 1].position * 4 + 2) / playbackSpeed
      : 5;

    const timeoutId = setTimeout(() => {
      setIsPlaying(false);
      setHighlightedNoteIds([]);
      setCurrentPlaybackTime(0);
    }, totalDuration * 1000);

    return () => {
      clearTimeout(timeoutId);
      stopAllNotes();
    };
  }, [isPlaying, score.notes, playbackSpeed, initAudioContext, playNote, stopAllNotes, setIsPlaying, setHighlightedNoteIds, setCurrentPlaybackTime]);

  const exportMIDI = useCallback(() => {
    const sortedNotes = [...score.notes].sort((a, b) => {
      const timeA = a.measure * 4 + a.position * 4;
      const timeB = b.measure * 4 + b.position * 4;
      return timeA - timeB;
    });

    const midiEvents: number[] = [];

    midiEvents.push(0x4D, 0x54, 0x68, 0x64);
    midiEvents.push(0x00, 0x00, 0x00, 0x06);
    midiEvents.push(0x00, 0x00);
    midiEvents.push(0x00, 0x01);
    midiEvents.push(0x00, 0x60);

    midiEvents.push(0x4D, 0x54, 0x72, 0x6B);

    const trackEvents: number[] = [];

    const timeSignature = score.timeSignature.split('/');
    const numerator = parseInt(timeSignature[0]);
    const denominator = parseInt(timeSignature[1]);
    trackEvents.push(0x00);
    trackEvents.push(0xFF, 0x58, 0x04);
    trackEvents.push(numerator);
    trackEvents.push(Math.log2(denominator));
    trackEvents.push(24);
    trackEvents.push(8);

    trackEvents.push(0x00);
    trackEvents.push(0xFF, 0x51, 0x03);
    const tempo = Math.floor(60000000 / 120);
    trackEvents.push((tempo >> 16) & 0xFF);
    trackEvents.push((tempo >> 8) & 0xFF);
    trackEvents.push(tempo & 0xFF);

    let lastTime = 0;
    sortedNotes.forEach((note) => {
      const noteTime = Math.round((note.measure * 4 + note.position * 4) * 192);
      const deltaTime = noteTime - lastTime;
      lastTime = noteTime;

      const midiNote = PITCH_TO_MIDI[note.pitch] || 60;
      const velocity = Math.round((note.velocity || 0.8) * 127);

      if (deltaTime > 0x7F) {
        trackEvents.push(0x80 | ((deltaTime >> 14) & 0x7F));
        trackEvents.push(0x80 | ((deltaTime >> 7) & 0x7F));
      }
      trackEvents.push(deltaTime & 0x7F);

      trackEvents.push(0x90);
      trackEvents.push(midiNote);
      trackEvents.push(velocity);

      const duration = Math.round(note.duration * 192);
      if (duration > 0x7F) {
        trackEvents.push(0x80 | ((duration >> 14) & 0x7F));
        trackEvents.push(0x80 | ((duration >> 7) & 0x7F));
      }
      trackEvents.push(duration & 0x7F);

      trackEvents.push(0x80);
      trackEvents.push(midiNote);
      trackEvents.push(0x00);
    });

    trackEvents.push(0x00);
    trackEvents.push(0xFF, 0x2F, 0x00);

    const length = trackEvents.length;
    midiEvents.push((length >> 24) & 0xFF);
    midiEvents.push((length >> 16) & 0xFF);
    midiEvents.push((length >> 8) & 0xFF);
    midiEvents.push(length & 0xFF);
    midiEvents.push(...trackEvents);

    const blob = new Blob([new Uint8Array(midiEvents)], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${score.title || 'score'}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [score]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full cursor-crosshair"
        style={{ backgroundColor: '#FFFFFF' }}
      />
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="flex items-center gap-1"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isPlaying ? '暂停' : '播放'}</span>
        </button>
        <button
          onClick={exportMIDI}
          className="flex items-center gap-1"
        >
          <Download className="w-4 h-4" />
          <span>导出MIDI</span>
        </button>
      </div>
    </div>
  );
}
