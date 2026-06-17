import React, { useState, useCallback, useRef, useEffect } from 'react';
import { wsManager } from '../utils/websocket';
import { User } from '../types';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  userId: string;
  users: User[];
  lastContentRef: React.MutableRefObject<string>;
}

const Editor: React.FC<EditorProps> = ({ content, onChange, onSave, userId, users, lastContentRef }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const broadcastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const newCursorPos = e.target.selectionStart;
    onChange(newContent);
    setCursorPosition(newCursorPos);
    debouncedSave();
    debouncedBroadcast(newContent, newCursorPos);
  }, [onChange, debouncedSave, debouncedBroadcast]);

  const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const pos = target.selectionStart;
    setCursorPosition(pos);
    broadcastCursor(pos);
  }, [broadcastCursor]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const pos = target.selectionStart;
    if (pos !== cursorPosition) {
      setCursorPosition(pos);
      broadcastCursor(pos);
    }
  }, [cursorPosition, broadcastCursor]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const pos = target.selectionStart;
    setCursorPosition(pos);
    broadcastCursor(pos);
  }, [broadcastCursor]);

  const insertText = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selectedText + after + content.substring(end);
    onChange(newContent);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      setCursorPosition(newCursorPos);
      debouncedSave();
      debouncedBroadcast(newContent, newCursorPos);
    }, 0);
  }, [content, onChange, debouncedSave, debouncedBroadcast]);

  const insertBlock = useCallback((prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const newContent = content.substring(0, lineStart) + prefix + content.substring(lineStart);
    onChange(newContent);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      setCursorPosition(newCursorPos);
      debouncedSave();
      debouncedBroadcast(newContent, newCursorPos);
    }, 0);
  }, [content, onChange, debouncedSave, debouncedBroadcast]);

  const otherUsers = users.filter(u => u.id !== userId);

  const renderCursors = () => {
    return otherUsers.map(user => {
      const pos = user.cursorPosition;
      if (pos < 0 || pos > content.length) return null;

      const lines = content.substring(0, pos).split('\n');
      const lineNumber = lines.length;
      const colPosition = lines[lines.length - 1].length;

      return (
        <div
          key={user.id}
          title={user.name}
          style={{
            position: 'absolute',
            left: `${colPosition * 9.6 + 16}px`,
            top: `${(lineNumber - 1) * 25.6 + 10}px`,
            width: '2px',
            height: '20px',
            backgroundColor: user.color,
            pointerEvents: 'none',
            animation: 'blink 1s infinite',
            zIndex: 10
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-18px',
            left: '0',
            backgroundColor: user.color,
            color: '#fff',
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '3px',
            whiteSpace: 'nowrap'
          }}>
            {user.name}
          </div>
        </div>
      );
    });
  };

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
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '8px 16px',
        backgroundColor: '#252526',
        borderBottom: '1px solid #3c3c3c'
      }}>
        <button
          onClick={() => insertText('**', '**')}
          title="粗体"
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
          onClick={() => insertText('*', '*')}
          title="斜体"
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
          onClick={() => insertBlock('# ')}
          title="标题"
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
          onClick={() => insertBlock('- ')}
          title="列表"
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

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onSelect={handleSelect}
          onKeyUp={handleKeyUp}
          onClick={handleClick}
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
        {renderCursors()}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Editor;
