import { useState, useEffect } from 'react';
import type { Song, SongPart, Annotation } from '../types';
import { AnnotationOverlay } from './AnnotationOverlay';
import { useSocket } from '../hooks/useSocket';
import './SongDetail.css';

interface SongDetailProps {
  song: Song | null;
}

interface TabLine {
  string: string;
  notes: string[];
}

export function SongDetail({ song }: SongDetailProps) {
  const [selectedPart, setSelectedPart] = useState<SongPart | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [parsedTab, setParsedTab] = useState<TabLine[]>([]);
  const { joinSong, leaveSong, onAnnotationAdded, onAnnotationDeleted, isConnected } = useSocket();

  useEffect(() => {
    if (song && song.parts.length > 0) {
      setSelectedPart(song.parts[0]);
      setAnnotations(song.parts[0].annotations || []);
    } else {
      setSelectedPart(null);
      setAnnotations([]);
    }
  }, [song]);

  useEffect(() => {
    if (song && selectedPart) {
      joinSong(song._id);
      
      const cleanupAdded = onAnnotationAdded((data: { partId: string; annotation: Annotation }) => {
        if (data.partId === selectedPart.id) {
          setAnnotations((prev) => [...prev, data.annotation]);
        }
      });

      const cleanupDeleted = onAnnotationDeleted((data: { partId: string; annotationId: string }) => {
        if (data.partId === selectedPart.id) {
          setAnnotations((prev) => prev.filter((a) => a.id !== data.annotationId));
        }
      });

      return () => {
        leaveSong(song._id);
        cleanupAdded();
        cleanupDeleted();
      };
    }
  }, [song, selectedPart, joinSong, leaveSong, onAnnotationAdded, onAnnotationDeleted]);

  useEffect(() => {
    if (selectedPart && selectedPart.type === 'tab') {
      setParsedTab(parseTab(selectedPart.content));
    } else {
      setParsedTab([]);
    }
  }, [selectedPart]);

  const parseTab = (content: string): TabLine[] => {
    const lines = content.trim().split('\n').filter(line => line.trim());
    return lines.map(line => {
      const pipeIndex = line.indexOf('|');
      const stringName = pipeIndex > 0 ? line.substring(0, pipeIndex) : '';
      const notesPart = line.substring(pipeIndex + 1);
      const notes: string[] = [];
      let current = '';
      
      for (let i = 0; i < notesPart.length; i++) {
        const char = notesPart[i];
        if (char === '|' || char === '-') {
          if (current) {
            notes.push(current);
            current = '';
          }
          if (char === '|') {
            notes.push('|');
          } else {
            notes.push('-');
          }
        } else if (/\d/.test(char)) {
          if (current && /\d/.test(current)) {
            current += char;
          } else {
            if (current) {
              notes.push(current);
            }
            current = char;
          }
        } else if (char === 'x' || char === 'o' || char === 'X' || char === 'O') {
          if (current) {
            notes.push(current);
            current = '';
          }
          notes.push(char);
        } else {
          if (current) {
            notes.push(current);
            current = '';
          }
          if (char !== ' ') {
            notes.push(char);
          }
        }
      }
      if (current) {
        notes.push(current);
      }
      
      return { string: stringName.trim(), notes };
    });
  };

  const handlePartChange = (part: SongPart) => {
    setSelectedPart(part);
    setAnnotations(part.annotations || []);
  };

  const handleAddAnnotation = async (measure: number, text: string, color: string) => {
    if (!song || !selectedPart) return;
    
    const annotation = {
      partId: selectedPart.id,
      measure,
      text,
      author: '我',
      color,
    };

    try {
      const res = await fetch(`/api/songs/${song._id}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(annotation),
      });
      
      if (res.ok) {
        const newAnnotation = await res.json();
        setAnnotations((prev) => [...prev, newAnnotation]);
      }
    } catch (error) {
      console.error('添加注释失败:', error);
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    if (!song || !selectedPart) return;
    
    try {
      const res = await fetch(`/api/songs/${song._id}/annotations/${annotationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partId: selectedPart.id }),
      });
      
      if (res.ok) {
        setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
      }
    } catch (error) {
      console.error('删除注释失败:', error);
    }
  };

  if (!song) {
    return (
      <div className="song-detail-empty">
        <div className="empty-vinyl">
          <div className="vinyl-icon">🎵</div>
        </div>
        <p>选择一首曲目查看详情</p>
      </div>
    );
  }

  const getMeasureCount = () => {
    if (parsedTab.length === 0) return 0;
    const firstLine = parsedTab[0];
    let count = 0;
    firstLine.notes.forEach(n => {
      if (n === '|') count++;
    });
    return Math.max(count - 1, 0);
  };

  return (
    <div className="song-detail-container">
      <div className="song-header glass-effect">
        <div className="song-title-section">
          <h2 className="song-title-large">{song.title}</h2>
          <div className="song-meta-large">
            <span className="meta-badge">{song.key}</span>
            <span className="meta-badge">{song.bpm} BPM</span>
            <span className="meta-badge">难度 {song.difficulty}/5</span>
          </div>
        </div>
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <span className="status-text">{isConnected ? '实时同步中' : '离线'}</span>
        </div>
      </div>

      <div className="parts-tabs">
        {song.parts.map((part) => (
          <button
            key={part.id}
            className={`part-tab ${selectedPart?.id === part.id ? 'active' : ''}`}
            onClick={() => handlePartChange(part)}
          >
            <span className="part-icon">{getInstrumentIcon(part.instrument)}</span>
            <span className="part-name">{part.instrument}</span>
            {part.annotations && part.annotations.length > 0 && (
              <span className="annotation-badge">{part.annotations.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="tab-scroll-container">
        <div className="scroll-decoration top"></div>
        
        <div className="tab-content-wrapper">
          {selectedPart?.type === 'tab' && parsedTab.length > 0 && (
            <AnnotationOverlay
              annotations={annotations}
              measureCount={getMeasureCount()}
              onAddAnnotation={handleAddAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
            >
              <div className="tab-visualization">
                {parsedTab.map((line, lineIndex) => (
                  <div key={lineIndex} className="tab-string-line">
                    <span className="string-label">{line.string}</span>
                    <div className="string-notes">
                      {line.notes.map((note, noteIndex) => (
                        <span
                          key={noteIndex}
                          className={`note-item ${note === '|' ? 'bar-line' : ''} ${note === '-' ? 'rest' : ''} ${/\d/.test(note) ? 'fret' : ''} ${note.toLowerCase() === 'x' ? 'mute' : ''} ${note.toLowerCase() === 'o' ? 'open' : ''}`}
                        >
                          {note === '-' ? '' : note}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </AnnotationOverlay>
          )}

          {selectedPart?.type === 'tab' && parsedTab.length === 0 && (
            <div className="empty-tab">
              <p>暂无 Tab 内容</p>
            </div>
          )}

          {selectedPart?.type === 'pdf' && (
            <div className="pdf-placeholder">
              <div className="pdf-icon">📄</div>
              <p>PDF 分谱预览</p>
            </div>
          )}
        </div>

        <div className="scroll-decoration bottom"></div>
      </div>
    </div>
  );
}

function getInstrumentIcon(instrument: string): string {
  const icons: Record<string, string> = {
    '吉他': '🎸',
    '贝斯': '🎸',
    '鼓': '🥁',
    '键盘': '🎹',
    '主唱': '🎤',
    '钢琴': '🎹',
  };
  return icons[instrument] || '🎵';
}
