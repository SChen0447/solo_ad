import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../App';
import { getNoteColor, STEP_WIDTH, STEP_HEIGHT, NUM_TRACKS, NUM_STEPS, MAX_STEPS_VISIBLE, DEFAULT_STEPS_VISIBLE, TRACK_NAMES, TRACK_COLORS, INSTRUMENT_TYPES, InstrumentType } from '../types';

interface TrackEditorProps {
  currentStep: number;
  isPlaying: boolean;
  highlightedCells: { [key: string]: number };
}

const TrackEditor = ({ currentStep, isPlaying, highlightedCells }: TrackEditorProps) => {
  const { notes, setNote, removeNote, remoteEdits, currentUser } = useApp();
  const [visibleSteps, setVisibleSteps] = useState(DEFAULT_STEPS_VISIBLE);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [selectionStart, setSelectionStart] = useState<{ track: number; step: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ track: number; step: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedCells, setSelectedCells] = useState<{ [key: string]: boolean }>({});
  const [clickedCell, setClickedCell] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getSelectionRange = useCallback(() => {
    if (!selectionStart || !selectionEnd) return { minTrack: 0, maxTrack: 0, minStep: 0, maxStep: 0 };
    return {
      minTrack: Math.min(selectionStart.track, selectionEnd.track),
      maxTrack: Math.max(selectionStart.track, selectionEnd.track),
      minStep: Math.min(selectionStart.step, selectionEnd.step),
      maxStep: Math.max(selectionStart.step, selectionEnd.step)
    };
  }, [selectionStart, selectionEnd]);

  const isCellSelected = useCallback((track: number, step: number) => {
    if (!selectionStart || !selectionEnd) return false;
    const { minTrack, maxTrack, minStep, maxStep } = getSelectionRange();
    return track >= minTrack && track <= maxTrack && step >= minStep && step <= maxStep;
  }, [selectionStart, selectionEnd, getSelectionRange]);

  const handleCellMouseDown = (track: number, step: number, e: React.MouseEvent) => {
    e.preventDefault();
    const key = `${track}-${step}`;
    
    if (e.shiftKey) {
      if (notes[key]) {
        removeNote(track, step);
      } else {
        setNote(track, step, currentUser?.id || '');
      }
      setClickedCell(key);
      setTimeout(() => setClickedCell(null), 150);
    } else {
      setIsSelecting(true);
      setSelectionStart({ track, step });
      setSelectionEnd({ track, step });
      setSelectedCells({});
    }
  };

  const handleCellMouseEnter = (track: number, step: number) => {
    if (isSelecting) {
      setSelectionEnd({ track, step });
    }
  };

  const handleMouseUp = useCallback(() => {
    if (isSelecting && selectionStart && selectionEnd) {
      const { minTrack, maxTrack, minStep, maxStep } = getSelectionRange();
      const newSelected: { [key: string]: boolean } = {};
      for (let t = minTrack; t <= maxTrack; t++) {
        for (let s = minStep; s <= maxStep; s++) {
          newSelected[`${t}-${s}`] = true;
        }
      }
      setSelectedCells(newSelected);
    }
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [isSelecting, selectionStart, selectionEnd, getSelectionRange]);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const handleDeleteSelected = () => {
    Object.keys(selectedCells).forEach(key => {
      if (notes[key]) {
        const [track, step] = key.split('-').map(Number);
        removeNote(track, step);
      }
    });
    setSelectedCells({});
  };

  const handleCopySelected = () => {
    const selectedNotes = Object.keys(selectedCells)
      .filter(key => notes[key])
      .map(key => {
        const [track, step] = key.split('-').map(Number);
        return { track, step };
      });
    
    if (selectedNotes.length > 0) {
      localStorage.setItem('copiedNotes', JSON.stringify(selectedNotes));
    }
  };

  const handlePasteNotes = () => {
    const copied = localStorage.getItem('copiedNotes');
    if (copied) {
      const notesToPaste: { track: number; step: number }[] = JSON.parse(copied);
      const pasteStartStep = currentStep;
      notesToPaste.forEach(({ track, step }) => {
        const newStep = pasteStartStep + step;
        if (newStep < NUM_STEPS) {
          setNote(track, newStep, currentUser?.id || '');
        }
      });
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollOffset(target.scrollLeft);
    const contentWidth = target.scrollWidth - target.clientWidth;
    const ratio = target.scrollLeft / contentWidth;
    const newVisibleSteps = Math.round(DEFAULT_STEPS_VISIBLE + ratio * (MAX_STEPS_VISIBLE - DEFAULT_STEPS_VISIBLE));
    setVisibleSteps(Math.min(newVisibleSteps, MAX_STEPS_VISIBLE));
  };

  const renderTracks = () => {
    const tracks = [];
    
    for (let track = 0; track < NUM_TRACKS; track++) {
      const cells = [];
      const startStep = Math.max(0, Math.floor(scrollOffset / STEP_WIDTH) - 1);
      const endStep = Math.min(NUM_STEPS, startStep + visibleSteps + 2);
      
      for (let step = startStep; step < endStep; step++) {
        const key = `${track}-${step}`;
        const isActive = notes[key];
        const isHighlighted = highlightedCells[key] !== undefined;
        const isCurrentStep = step === currentStep && isPlaying;
        const remoteEdit = remoteEdits[key];
        const isSelected = selectedCells[key] || isCellSelected(track, step);
        const isClicked = clickedCell === key;
        
        cells.push(
          <motion.div
            key={key}
            initial={false}
            animate={{
              scale: isClicked ? [1, 1.2, 1] : 1,
              opacity: isActive ? 1 : 0.3,
              backgroundColor: isCurrentStep ? '#ffffff' : (isActive ? getNoteColor(track) : '#0f3460'),
              borderColor: isSelected ? '#ffffff' : (remoteEdit ? remoteEdit.color : '#2c3e50'),
              boxShadow: remoteEdit ? `0 0 8px ${remoteEdit.color}` : (isHighlighted ? '0 0 6px #ffffff' : 'none')
            }}
            transition={{
              scale: { duration: 0.15, ease: 'easeInOut' },
              opacity: { duration: isActive ? 0.2 : 0.15 },
              backgroundColor: { duration: isCurrentStep ? 0.1 : 0.1 },
              borderColor: { duration: 0.1 }
            }}
            onMouseDown={(e) => handleCellMouseDown(track, step, e)}
            onMouseEnter={() => handleCellMouseEnter(track, step)}
            style={{
              width: STEP_WIDTH,
              height: STEP_HEIGHT,
              border: `1px solid ${remoteEdit ? remoteEdit.color : (isSelected ? '#ffffff' : '#2c3e50')}`,
              borderRadius: '2px',
              cursor: 'pointer',
              flexShrink: 0,
              position: 'absolute',
              left: step * STEP_WIDTH,
              top: track * STEP_HEIGHT
            }}
          />
        );
      }
      
      tracks.push(
        <div key={track} style={{ position: 'relative', height: STEP_HEIGHT }}>
          {cells}
        </div>
      );
    }
    
    return tracks;
  };

  const getInstrumentIcon = (type: InstrumentType) => {
    switch (type) {
      case 'piano': return '🎹';
      case 'drum': return '🥁';
      case 'bass': return '🎸';
      case 'lead': return '🎤';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDeleteSelected}
          disabled={Object.keys(selectedCells).length === 0}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            background: Object.keys(selectedCells).length > 0 ? '#e74c3c' : '#2c3e50',
            color: '#ecf0f1',
            fontSize: '12px',
            cursor: Object.keys(selectedCells).length > 0 ? 'pointer' : 'not-allowed',
            opacity: Object.keys(selectedCells).length > 0 ? 1 : 0.5
          }}
        >
          🗑️ 删除选中
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopySelected}
          disabled={Object.keys(selectedCells).length === 0}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            background: Object.keys(selectedCells).length > 0 ? '#3498db' : '#2c3e50',
            color: '#ecf0f1',
            fontSize: '12px',
            cursor: Object.keys(selectedCells).length > 0 ? 'pointer' : 'not-allowed',
            opacity: Object.keys(selectedCells).length > 0 ? 1 : 0.5
          }}
        >
          📋 复制
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePasteNotes}
          disabled={!localStorage.getItem('copiedNotes')}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            background: localStorage.getItem('copiedNotes') ? '#2ecc71' : '#2c3e50',
            color: '#ecf0f1',
            fontSize: '12px',
            cursor: localStorage.getItem('copiedNotes') ? 'pointer' : 'not-allowed',
            opacity: localStorage.getItem('copiedNotes') ? 1 : 0.5
          }}
        >
          📌 粘贴
        </motion.button>
        <div style={{ marginLeft: 'auto', color: '#7f8c8d', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
          💡 按住 Shift 点击快速添加/删除
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ 
          width: '240px', 
          background: '#16213e', 
          borderRadius: '8px 0 0 8px',
          padding: '8px',
          overflowY: 'auto',
          flexShrink: 0
        }}>
          <div style={{ marginBottom: '12px', color: '#bdc3c7', fontSize: '12px', fontWeight: 500 }}>
            音轨列表 (共 {NUM_TRACKS} 轨)
          </div>
          {Array.from({ length: NUM_TRACKS }).map((_, i) => (
            <div 
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                borderRadius: '4px',
                marginBottom: '4px',
                background: '#0f3460',
                height: STEP_HEIGHT
              }}
            >
              <span style={{ fontSize: '14px' }}>{getInstrumentIcon(INSTRUMENT_TYPES[i])}</span>
              <span style={{ flex: 1, fontSize: '12px', color: '#ecf0f1' }}>{TRACK_NAMES[i]}</span>
              <select 
                defaultValue={INSTRUMENT_TYPES[i]}
                style={{
                  background: '#2c3e50',
                  color: '#ecf0f1',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '2px 4px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="piano">钢琴</option>
                <option value="drum">鼓</option>
                <option value="bass">贝斯</option>
                <option value="lead">主音</option>
              </select>
              <div 
                style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  background: TRACK_COLORS[i] 
                }} 
              />
            </div>
          ))}
        </div>

        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'auto',
            background: '#16213e',
            borderRadius: '0 8px 8px 0',
            position: 'relative'
          }}
        >
          <div
            style={{
              position: 'sticky',
              top: 0,
              height: '24px',
              background: '#0f3460',
              display: 'flex',
              alignItems: 'center',
              zIndex: 10,
              borderBottom: '1px solid #2c3e50'
            }}
          >
            {Array.from({ length: NUM_STEPS }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: STEP_WIDTH,
                  flexShrink: 0,
                  textAlign: 'center',
                  fontSize: '10px',
                  color: i % 4 === 0 ? '#3498db' : '#7f8c8d',
                  position: 'absolute',
                  left: i * STEP_WIDTH
                }}
              >
                {i % 4 === 0 ? i + 1 : ''}
              </div>
            ))}
            
            <AnimatePresence>
              {isPlaying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    width: '8px',
                    height: '8px',
                    background: 'linear-gradient(90deg, #00d2ff, #3a7bd5)',
                    borderRadius: '4px 4px 0 0',
                    transform: `translateX(${currentStep * STEP_WIDTH + STEP_WIDTH / 2 - 4}px)`,
                    zIndex: 20,
                    pointerEvents: 'none'
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          <div style={{ position: 'relative', width: NUM_STEPS * STEP_WIDTH, height: NUM_TRACKS * STEP_HEIGHT }}>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage: `
                  linear-gradient(to right, #2c3e50 1px, transparent 1px),
                  linear-gradient(to bottom, #2c3e50 1px, transparent 1px)
                `,
                backgroundSize: `${STEP_WIDTH}px ${STEP_HEIGHT}px`,
                pointerEvents: 'none'
              }}
            />
            
            {isPlaying && (
              <motion.div
                animate={{
                  left: currentStep * STEP_WIDTH
                }}
                transition={{ duration: 0.1, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  top: 0,
                  width: STEP_WIDTH,
                  height: '100%',
                  background: 'linear-gradient(180deg, rgba(0, 210, 255, 0.1) 0%, rgba(58, 123, 213, 0.1) 100%)',
                  pointerEvents: 'none',
                  zIndex: 5
                }}
              />
            )}

            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              {renderTracks()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackEditor;
