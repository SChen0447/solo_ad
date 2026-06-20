import React, { useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../store';

const StoryPanel: React.FC = () => {
  const { displayedStory, isSpeaking, speakingCharIndex } = useAppStore();
  const { setSelectedText, setSelectionPosition } = useAppStore();
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(selection.toString());
      setSelectionPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    } else {
      setSelectedText('');
      setSelectionPosition(null);
    }
  }, [setSelectedText, setSelectionPosition]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.addEventListener('mouseup', handleMouseUp);
    return () => panel.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  return (
    <div
      ref={panelRef}
      style={{
        background: 'rgba(20, 20, 50, 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '12px',
        border: '1px solid rgba(108, 99, 255, 0.2)',
        padding: '24px',
        minHeight: '300px',
        maxHeight: '500px',
        overflowY: 'auto',
        color: '#e0e0ff',
        fontSize: '15px',
        lineHeight: 1.8,
        letterSpacing: '0.3px',
      }}
    >
      {displayedStory ? (
        <p style={{ margin: 0 }}>
          {displayedStory.split('').map((char, i) => {
            const isHighlight = isSpeaking && i >= speakingCharIndex && i < speakingCharIndex + 1;
            return (
              <span
                key={i}
                style={{
                  opacity: 1,
                  transition: 'opacity 0.05s ease-in',
                  background: isHighlight ? 'rgba(250, 204, 21, 0.4)' : 'transparent',
                  borderRadius: isHighlight ? '2px' : '0',
                  transition: 'background 0.15s ease',
                }}
              >
                {char}
              </span>
            );
          })}
        </p>
      ) : (
        <p style={{
          color: '#606080',
          textAlign: 'center',
          marginTop: '80px',
          fontSize: '14px',
        }}>
          选择一个主题或输入提示词开始生成故事...
        </p>
      )}
    </div>
  );
};

export default StoryPanel;
