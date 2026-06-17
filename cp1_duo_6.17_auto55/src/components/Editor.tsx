import React, { useState, useCallback, useRef, useEffect } from 'react';
import { wsManager } from '../utils/websocket';
import { User } from '../types';

const USER_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#f093fb'];

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  userId: string;
  users: User[];
  lastContentRef: React.MutableRefObject<string>;
  onCursorChange?: (cursorPos: number) => void;
}

const getUserColor = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % USER_COLORS.length;
  return USER_COLORS[index];
};

const Editor: React.FC<EditorProps> = ({ content, onChange, onSave, userId, users, lastContentRef, onCursorChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [userColorMap] = useState<Map<string, string>>(() => new Map());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const broadcastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  useEffect(() => {
    users.forEach(user => {
      if (!userColorMap.has(user.id)) {
        userColorMap.set(user.id, user.color || getUserColor(user.id));
      }
    });
  }, [users, userColorMap]);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (content !== lastContentRef.current) {
        lastContentRef.current = content;
        onSave();
      }
    }, 300);
  }, [content, onSave, lastContentRef]);

  const debouncedBroadcast = useCallback((newContent: string, newCursorPos: number) => {
    if (broadcastTimeoutRef.current) {
      clearTimeout(broadcastTimeoutRef.current);
    }
    broadcastTimeoutRef.current = setTimeout(() => {
      wsManager.send('content_update', {
        content: newContent,
        cursorPosition: newCursorPos,
        userId
      });
    }, 50);
  }, [userId]);

  const broadcastCursor = useCallback((newCursorPos: number) => {
    wsManager.send('cursor_update', {
      cursorPosition: newCursorPos,
      userId
    });
  }, [userId]);

  const saveSelection = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      savedSelectionRef.current = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      };
    }
  }, []);

  const updateSelectionState = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      setCursorPosition(end);
      savedSelectionRef.current = { start, end };
      if (onCursorChange) {
        onCursorChange(end);
      }
    }
  }, [onCursorChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const newCursorPos = e.target.selectionStart;
    onChange(newContent);
    setCursorPosition(newCursorPos);
    savedSelectionRef.current = { start: e.target.selectionStart, end: e.target.selectionEnd };
    if (onCursorChange) {
      onCursorChange(newCursorPos);
    }
    debouncedSave();
    debouncedBroadcast(newContent, newCursorPos);
  }, [onChange, debouncedSave, debouncedBroadcast, onCursorChange]);

  const handleSelect = useCallback(() => {
    updateSelectionState();
    const textarea = textareaRef.current;
    if (textarea) {
      broadcastCursor(textarea.selectionStart);
    }
  }, [updateSelectionState, broadcastCursor]);

  const handleKeyUp = useCallback(() => {
    updateSelectionState();
    const textarea = textareaRef.current;
    if (textarea && textarea.selectionStart !== cursorPosition) {
      broadcastCursor(textarea.selectionStart);
    }
  }, [updateSelectionState, cursorPosition, broadcastCursor]);

  const handleClick = useCallback(() => {
    updateSelectionState();
    const textarea = textareaRef.current;
    if (textarea) {
      broadcastCursor(textarea.selectionStart);
    }
  }, [updateSelectionState, broadcastCursor]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const insertText = useCallback((before: string, after: string = '', placeholderLength = 0) => {
    saveSelection();
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { start, end } = savedSelectionRef.current;
    const hasSelection = start !== end;
    const placeholderText = hasSelection ? content.substring(start, end) : '文本';
    const actualPlaceholderLength = hasSelection ? end - start : placeholderLength;

    const newContent = content.substring(0, start) + before + placeholderText + after + content.substring(end);
    onChange(newContent);

    setTimeout(() => {
      textarea.focus();
      const newStart = start + before.length;
      const newEnd = newStart + actualPlaceholderLength;
      textarea.setSelectionRange(newStart, newEnd);
      setCursorPosition(newEnd);
      savedSelectionRef.current = { start: newStart, end: newEnd };
      if (onCursorChange) {
        onCursorChange(newEnd);
      }
      debouncedSave();
      debouncedBroadcast(newContent, newEnd);
    }, 10);
  }, [content, onChange, saveSelection, debouncedSave, debouncedBroadcast, onCursorChange]);

  const insertBlock = useCallback((prefix: string) => {
    saveSelection();
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { start } = savedSelectionRef.current;
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const newContent = content.substring(0, lineStart) + prefix + content.substring(lineStart);
    onChange(newContent);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      setCursorPosition(newCursorPos);
      savedSelectionRef.current = { start: newCursorPos, end: newCursorPos };
      if (onCursorChange) {
        onCursorChange(newCursorPos);
      }
      debouncedSave();
      debouncedBroadcast(newContent, newCursorPos);
    }, 10);
  }, [content, onChange, saveSelection, debouncedSave, debouncedBroadcast, onCursorChange]);

  const otherUsers = users.filter(u => u.id !== userId);

  const renderCursors = () => {
    return otherUsers.map(user => {
      const pos = user.cursorPosition;
      if (pos < 0 || pos > content.length) return null;

      const lines = content.substring(0, pos).split('\n');
      const lineNumber = lines.length;
      const colPosition = lines[lines.length - 1].length;

      const CHAR_WIDTH = 9.6;
      const LINE_HEIGHT = 25.6;
      const PADDING_X = 16;
      const PADDING_Y = 16;

      const left = colPosition * CHAR_WIDTH + PADDING_X;
      const top = (lineNumber - 1) * LINE_HEIGHT + PADDING_Y - scrollTop;

      if (top < -20) return null;

      const color = user.color || userColorMap.get(user.id) || getUserColor(user.id);

      return (
        <div
          key={user.id}
          title={user.name}
          style={{
            position: 'absolute',
            left: `${left}px`,
            top: `${top}px`,
            width: '2px',
            height: '20px',
            backgroundColor: color,
            pointerEvents: 'none',
            animation: 'blink 1s infinite',
            zIndex: 10,
            boxShadow: `0 0 6px ${color}80`
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-18px',
            left: '0',
            backgroundColor: color,
            color: '#fff',
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '3px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            {user.name}
          </div>
        </div>
      );
    });
  };

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' && target.closest('.editor-toolbar')) {
        saveSelection();
      }
    };
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => document.removeEventListener('mousedown', handleMouseDown, true);
  }, [saveSelection]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (broadcastTimeoutRef.current) {
        clearTimeout(broadcastTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div
        className="editor-toolbar"
        onMouseDown={(e) => e.preventDefault()}
        style={{
          display: 'flex',
          gap: '4px',
          padding: '8px 16px',
          backgroundColor: '#252526',
          borderBottom: '1px solid #3c3c3c'
        }}
      >
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => insertText('**', '**', 2)}
          title="粗体 (Ctrl+B)"
          style={{
            padding: '6px 12px',
            backgroundColor: 'transparent',
            color: '#d4d4d4',
            border: '1px solid #3c3c3c',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#007acc';
            e.currentTarget.style.borderColor = '#007acc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = '#3c3c3c';
          }}
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => insertText('*', '*', 2)}
          title="斜体 (Ctrl+I)"
          style={{
            padding: '6px 12px',
            backgroundColor: 'transparent',
            color: '#d4d4d4',
            border: '1px solid #3c3c3c',
            borderRadius: '4px',
            cursor: 'pointer',
            fontStyle: 'italic',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#007acc';
            e.currentTarget.style.borderColor = '#007acc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = '#3c3c3c';
          }}
        >
          I
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => insertBlock('### ')}
          title="三级标题"
          style={{
            padding: '6px 12px',
            backgroundColor: 'transparent',
            color: '#d4d4d4',
            border: '1px solid #3c3c3c',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#007acc';
            e.currentTarget.style.borderColor = '#007acc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = '#3c3c3c';
          }}
        >
          H
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => insertBlock('- ')}
          title="无序列表"
          style={{
            padding: '6px 12px',
            backgroundColor: 'transparent',
            color: '#d4d4d4',
            border: '1px solid #3c3c3c',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#007acc';
            e.currentTarget.style.borderColor = '#007acc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = '#3c3c3c';
          }}
        >
          • List
        </button>
      </div>

      <div ref={wrapperRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onSelect={handleSelect}
          onKeyUp={handleKeyUp}
          onClick={handleClick}
          onScroll={handleScroll}
          onMouseDown={saveSelection}
          spellCheck={false}
          style={{
            width: '100%',
            height: '100%',
            padding: '16px',
            fontFamily: 'Monaco, "Courier New", monospace',
            fontSize: '16px',
            lineHeight: '1.6',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            border: 'none',
            outline: 'none',
            resize: 'none',
            caretColor: '#fff'
          }}
        />
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          overflow: 'hidden'
        }}>
          {renderCursors()}
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default Editor;
