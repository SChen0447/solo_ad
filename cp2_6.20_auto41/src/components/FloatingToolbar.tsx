import React, { useCallback } from 'react';
import { Copy, Volume2 } from 'lucide-react';
import { useAppStore } from '../store';

const FloatingToolbar: React.FC = () => {
  const { selectedText, selectionPosition, setIsSpeaking, setSpeakingCharIndex, setSelectedText, setSelectionPosition } = useAppStore();

  const handleCopy = useCallback(() => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText).catch(() => {});
    }
  }, [selectedText]);

  const handleSpeak = useCallback(() => {
    if (!selectedText) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(selectedText);
    utterance.lang = 'zh-CN';
    utterance.rate = 1;
    utterance.pitch = 1;

    setIsSpeaking(true);
    let charIdx = 0;
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        charIdx = event.charIndex;
        setSpeakingCharIndex(charIdx);
      }
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingCharIndex(-1);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingCharIndex(-1);
    };

    window.speechSynthesis.speak(utterance);

    setSelectedText('');
    setSelectionPosition(null);
  }, [selectedText, setIsSpeaking, setSpeakingCharIndex, setSelectedText, setSelectionPosition]);

  if (!selectedText || !selectionPosition) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: `${selectionPosition.x}px`,
        top: `${selectionPosition.y - 50}px`,
        display: 'flex',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: '6px',
        background: 'rgba(30, 30, 60, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(108, 99, 255, 0.3)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        zIndex: 1000,
        transform: 'translateX(-50%)',
      }}
    >
      <button
        onClick={handleCopy}
        style={{
          background: 'none',
          border: 'none',
          color: '#e0e0ff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '13px',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(108,99,255,0.3)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
      >
        <Copy size={14} /> 复制
      </button>
      <button
        onClick={handleSpeak}
        style={{
          background: 'none',
          border: 'none',
          color: '#e0e0ff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '13px',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(108,99,255,0.3)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
      >
        <Volume2 size={14} /> 朗读
      </button>
    </div>
  );
};

export default FloatingToolbar;
