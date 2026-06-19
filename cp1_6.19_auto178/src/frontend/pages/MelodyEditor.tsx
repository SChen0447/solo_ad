import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine } from '../engine/AudioEngine';
import { Note } from '../utils/Api';

interface MelodyEditorProps {
  loadedNotes: Note[] | null;
  loadedBpm: number;
  onSave: (data: { name: string; tags: string[]; notes: Note[]; bpm: number }) => void;
  mixTracks?: { notes: Note[]; color: string }[];
  isMixPlaying?: boolean;
}

const PITCH_COLORS = [
  '#00d2ff', '#3ab0ff', '#5c8ff0', '#7a70d0',
  '#9960b0', '#b85090', '#d94570', '#ff6b6b',
];

const GRID_SIZE = 8;

export function MelodyEditor({ loadedNotes, loadedBpm, onSave, mixTracks = [], isMixPlaying = false }: MelodyEditorProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [melodyName, setMelodyName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragNote, setDragNote] = useState<Note | null>(null);

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    audioEngineRef.current = new AudioEngine();
    audioEngineRef.current.setOnBeatCallback((beat) => {
      setCurrentBeat(beat);
    });
    audioEngineRef.current.setOnEndCallback(() => {
      setIsPlaying(false);
      setCurrentBeat(-1);
    });
  }, []);

  useEffect(() => {
    if (loadedNotes) {
      setNotes(loadedNotes);
    }
  }, [loadedNotes]);

  useEffect(() => {
    setBpm(loadedBpm);
  }, [loadedBpm]);

  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setBpm(bpm);
    }
  }, [bpm]);

  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setNotes(notes);
    }
  }, [notes]);

  const getNoteAt = useCallback((beat: number, pitch: number): Note | undefined => {
    return notes.find((n) => n.beat === beat && n.pitch === pitch);
  }, [notes]);

  const handleCellClick = (beat: number, pitch: number) => {
    if (isMixPlaying) return;
    const existing = getNoteAt(beat, pitch);
    if (existing) {
      setNotes(notes.filter((n) => !(n.beat === beat && n.pitch === pitch)));
    } else {
      setNotes([...notes, { beat, pitch }]);
      if (audioEngineRef.current) {
        audioEngineRef.current.playNote(pitch);
      }
    }
  };

  const handleMouseDown = (beat: number, pitch: number, e: React.MouseEvent) => {
    if (isMixPlaying) return;
    e.preventDefault();
    const existing = getNoteAt(beat, pitch);
    if (existing) {
      setIsDragging(true);
      setDragNote(existing);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragNote || !gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const cellHeight = rect.height / GRID_SIZE;
    const y = e.clientY - rect.top;
    const pitch = GRID_SIZE - 1 - Math.floor(y / cellHeight);
    const clampedPitch = Math.max(0, Math.min(GRID_SIZE - 1, pitch));

    if (clampedPitch !== dragNote.pitch && !getNoteAt(dragNote.beat, clampedPitch)) {
      setNotes(notes.map((n) =>
        n.beat === dragNote.beat && n.pitch === dragNote.pitch
          ? { ...n, pitch: clampedPitch }
          : n
      ));
      setDragNote({ ...dragNote, pitch: clampedPitch });
      if (audioEngineRef.current) {
        audioEngineRef.current.playNote(clampedPitch);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragNote(null);
  };

  const togglePlay = () => {
    if (!audioEngineRef.current) return;
    if (isPlaying) {
      audioEngineRef.current.stop();
      setIsPlaying(false);
      setCurrentBeat(-1);
    } else {
      audioEngineRef.current.setNotes(notes);
      audioEngineRef.current.setBpm(bpm);
      audioEngineRef.current.play();
      setIsPlaying(true);
    }
  };

  const resetGrid = () => {
    if (audioEngineRef.current) {
      audioEngineRef.current.stop();
    }
    setNotes([]);
    setIsPlaying(false);
    setCurrentBeat(-1);
  };

  const handleSaveClick = () => {
    setShowSaveModal(true);
    setMelodyName('');
    setTags([]);
    setTagInput('');
  };

  const handleSaveConfirm = () => {
    if (!melodyName.trim()) return;
    onSave({ name: melodyName, tags, notes, bpm });
    setShowSaveModal(false);
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && tags.length < 3 && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const getMixNotesAtBeat = (beat: number) => {
    return mixTracks.map((track, idx) => ({
      trackIdx: idx,
      color: track.color,
      notes: track.notes.filter((n) => n.beat === beat),
    }));
  };

  return (
    <div className="editor-container">
      <h2 className="editor-title">旋律编辑器</h2>

      <div
        ref={gridRef}
        className="grid-container"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {Array.from({ length: GRID_SIZE }).map((_, row) => {
          const pitch = GRID_SIZE - 1 - row;
          return (
            <div key={row} className="grid-row">
              {Array.from({ length: GRID_SIZE }).map((_, beat) => {
                const note = getNoteAt(beat, pitch);
                const isActive = !!note;
                const isCurrentBeat = beat === currentBeat;
                const mixNotesAtBeat = getMixNotesAtBeat(beat);

                return (
                  <div
                    key={beat}
                    className={`grid-cell ${isActive ? 'active' : ''} ${isCurrentBeat ? 'current-beat' : ''}`}
                    onClick={() => handleCellClick(beat, pitch)}
                    onMouseDown={(e) => handleMouseDown(beat, pitch, e)}
                  >
                    {isActive && (
                      <div
                        className={`note-dot ${isCurrentBeat ? 'pulsing' : ''}`}
                        style={{ backgroundColor: PITCH_COLORS[pitch] }}
                      />
                    )}
                    {isMixPlaying && mixNotesAtBeat.map((track) =>
                      track.notes.map((n) =>
                        n.pitch === pitch ? (
                          <div
                            key={`mix-${track.trackIdx}-${beat}-${pitch}`}
                            className={`note-dot mix-note ${isCurrentBeat ? 'pulsing' : ''}`}
                            style={{ backgroundColor: track.color }}
                          />
                        ) : null
                      )
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="controls-bar">
        <button
          className={`play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
          disabled={isMixPlaying}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div className="bpm-control">
          <span className="bpm-label">BPM: {bpm}</span>
          <input
            type="range"
            min="60"
            max="180"
            step="5"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="bpm-slider"
            disabled={isPlaying || isMixPlaying}
          />
        </div>

        <button className="reset-btn" onClick={resetGrid} disabled={isMixPlaying}>
          ↺ 重置
        </button>

        <button className="save-btn" onClick={handleSaveClick} disabled={isMixPlaying}>
          💾 保存片段
        </button>
      </div>

      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>保存旋律片段</h3>
            <div className="form-group">
              <label>旋律名称</label>
              <input
                type="text"
                value={melodyName}
                onChange={(e) => setMelodyName(e.target.value)}
                placeholder="输入旋律名称..."
                className="modal-input"
              />
            </div>
            <div className="form-group">
              <label>标签 (最多3个)</label>
              <div className="tags-input-container">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  placeholder="输入标签后按回车..."
                  className="modal-input tag-input"
                  disabled={tags.length >= 3}
                />
                <button className="add-tag-btn" onClick={addTag} disabled={tags.length >= 3}>
                  +
                </button>
              </div>
              <div className="tags-list">
                {tags.map((tag) => (
                  <span key={tag} className="tag-chip">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="tag-remove">×</button>
                  </span>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setShowSaveModal(false)}>
                取消
              </button>
              <button className="modal-save" onClick={handleSaveConfirm} disabled={!melodyName.trim()}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .editor-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 24px;
          background: #16213e;
          border-radius: 16px;
          height: 100%;
          box-sizing: border-box;
        }

        .editor-title {
          margin: 0;
          color: #fff;
          font-size: 24px;
          font-weight: 600;
        }

        .grid-container {
          display: flex;
          flex-direction: column;
          background: #1a1a2e;
          border-radius: 12px;
          padding: 12px;
          flex: 1;
          min-height: 300px;
          user-select: none;
          cursor: pointer;
        }

        .grid-row {
          display: flex;
          flex: 1;
        }

        .grid-cell {
          flex: 1;
          border: 0.5px solid rgba(255, 255, 255, 0.125);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: all 0.1s ease;
        }

        .grid-cell:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .grid-cell.current-beat {
          background: rgba(233, 69, 96, 0.15);
          box-shadow: inset 0 0 8px rgba(233, 69, 96, 0.3);
        }

        .grid-cell.active {
          animation: cellSelect 0.1s ease;
        }

        @keyframes cellSelect {
          0% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }

        .note-dot {
          width: 60%;
          height: 60%;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: transform 0.1s ease;
        }

        .note-dot.mix-note {
          position: absolute;
          opacity: 0.6;
        }

        .note-dot.pulsing {
          animation: pulse 0.3s ease;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }

        .controls-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #1a1a2e;
          border-radius: 12px;
        }

        .play-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          background: #e94560;
          color: white;
          font-size: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
          box-shadow: 0 0 20px rgba(233, 69, 96, 0.5);
          animation: breathe 2s ease-in-out infinite;
        }

        .play-btn:hover:not(:disabled) {
          transform: scale(1.1);
        }

        .play-btn:active:not(:disabled) {
          transform: scale(0.9);
          transition: transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .play-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @keyframes breathe {
          0%, 100% { box-shadow: 0 0 20px rgba(233, 69, 96, 0.5); }
          50% { box-shadow: 0 0 35px rgba(233, 69, 96, 0.8); }
        }

        .bpm-control {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .bpm-label {
          color: #fff;
          font-size: 14px;
          font-weight: 500;
        }

        .bpm-slider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: #2a2a4e;
          outline: none;
          appearance: none;
          cursor: pointer;
        }

        .bpm-slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #e94560;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        .reset-btn, .save-btn {
          padding: 12px 20px;
          border-radius: 8px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .reset-btn {
          background: #2a2a4e;
          color: #fff;
        }

        .reset-btn:hover:not(:disabled) {
          background: #3a3a5e;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .save-btn {
          background: linear-gradient(135deg, #e94560, #ff6b6b);
          color: white;
        }

        .save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(233, 69, 96, 0.4);
        }

        .reset-btn:disabled, .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.4s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content {
          background: #16213e;
          border-radius: 16px;
          padding: 32px;
          width: 90%;
          max-width: 420px;
          animation: modalIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }

        .modal-content h3 {
          margin: 0 0 24px 0;
          color: #fff;
          font-size: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          color: #aaa;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .modal-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid #2a2a4e;
          background: #1a1a2e;
          color: #fff;
          font-size: 14px;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s ease;
        }

        .modal-input:focus {
          border-color: #e94560;
        }

        .tags-input-container {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .tag-input {
          flex: 1;
        }

        .add-tag-btn {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          border: none;
          background: #e94560;
          color: white;
          font-size: 20px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .add-tag-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .tag-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: linear-gradient(135deg, #e94560, #ff6b6b);
          color: white;
          border-radius: 20px;
          font-size: 13px;
        }

        .tag-remove {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          line-height: 1;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
        }

        .modal-cancel, .modal-save {
          padding: 12px 24px;
          border-radius: 8px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .modal-cancel {
          background: #2a2a4e;
          color: #fff;
        }

        .modal-cancel:hover {
          background: #3a3a5e;
        }

        .modal-save {
          background: linear-gradient(135deg, #e94560, #ff6b6b);
          color: white;
        }

        .modal-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-save:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
        }

        @media (max-width: 768px) {
          .editor-container {
            padding: 16px;
          }

          .controls-bar {
            flex-wrap: wrap;
          }

          .bpm-control {
            order: 3;
            min-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
