import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Plus } from 'lucide-react';
import type { Note } from '../types';
import { MOOD_COLORS } from '../types';
import NoteCard from './NoteCard';
import { useNoteStore } from '../store';

interface TimelineProps {
  notes: Note[];
  onInsertClick?: (insertAfterId?: string) => void;
}

const VISIBLE_RANGE = 30;
const ITEM_HEIGHT = 160;
const BUFFER = 5;

const Timeline: React.FC<TimelineProps> = memo(function Timeline({ notes, onInsertClick }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const newlyAddedId = useNoteStore(state => state.newlyAddedId);
  const setNewlyAddedId = useNoteStore(state => state.setNewlyAddedId);
  const noteCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      setContainerHeight(container.clientHeight);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (newlyAddedId && noteCardRefs.current[newlyAddedId]) {
      const element = noteCardRefs.current[newlyAddedId];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [newlyAddedId]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      setScrollTop(container.scrollTop);
    });
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
  const endIndex = Math.min(
    notes.length,
    Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER
  );

  const visibleNotes = notes.slice(startIndex, startIndex + VISIBLE_RANGE);
  const paddingTop = Math.max(0, startIndex * ITEM_HEIGHT);
  const paddingBottom = Math.max(0, (notes.length - (startIndex + visibleNotes.length)) * ITEM_HEIGHT);

  const handleAnimationEnd = useCallback((noteId: string) => {
    if (noteId === newlyAddedId) {
      setTimeout(() => setNewlyAddedId(null), 100);
    }
  }, [newlyAddedId, setNewlyAddedId]);

  if (notes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📝</div>
        <div className="empty-title">还没有便签</div>
        <div className="empty-description">点击右下角的 + 按钮记录你的第一条心情便签吧</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="timeline-section"
      onScroll={handleScroll}
    >
      <div className="timeline-container">
        <div className="timeline-line" />
        <div
          className="timeline-items"
          style={{
            paddingTop: `${paddingTop}px`,
            paddingBottom: `${paddingBottom}px`
          }}
        >
          {visibleNotes.map((note, index) => {
            const absoluteIndex = startIndex + index;
            const isLeft = absoluteIndex % 2 === 0;
            const moodColor = MOOD_COLORS[note.mood] || MOOD_COLORS['soft-pink'];
            const isNew = note.id === newlyAddedId;

            return (
              <div
                key={note.id}
                ref={el => { noteCardRefs.current[note.id] = el; }}
                className={`timeline-item ${isLeft ? 'left' : 'right'}`}
                style={{ height: `${ITEM_HEIGHT}px` }}
              >
                <div
                  className="timeline-dot"
                  style={{ backgroundColor: moodColor.hex }}
                />
                <div
                  className="insert-point"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onInsertClick) {
                      onInsertClick(note.id);
                    }
                  }}
                  title="在上方插入"
                >
                  <Plus size={12} />
                </div>
                <NoteCard
                  note={note}
                  isNew={isNew}
                  onAnimationEnd={() => handleAnimationEnd(note.id)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default Timeline;
