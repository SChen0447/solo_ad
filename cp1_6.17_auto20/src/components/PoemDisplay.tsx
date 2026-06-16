import React, { useRef, useEffect } from 'react';

interface PoemDisplayProps {
  lines: string[];
  currentLineIndex: number;
  onLineClick: (index: number) => void;
  poemText: string;
  onPoemTextChange: (text: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  mood: string;
}

export const PoemDisplay: React.FC<PoemDisplayProps> = ({
  lines,
  currentLineIndex,
  onLineClick,
  poemText,
  onPoemTextChange,
  onAnalyze,
  isAnalyzing,
  mood,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentLineIndex]);

  const moodLabels: Record<string, { label: string; color: string }> = {
    passionate: { label: '激昂', color: 'text-red-400' },
    gentle: { label: '婉约', color: 'text-pink-400' },
    melancholic: { label: '忧郁', color: 'text-blue-400' },
    peaceful: { label: '宁静', color: 'text-green-400' },
    inspiring: { label: '励志', color: 'text-yellow-400' },
  };

  const showInputMode = () => {
    if (lines.length === 0) return true;
    return false;
  };

  return (
    <div className="card p-5 flex flex-col h-full animate-fade-in">
      <div className="flex items-center justify-between mb-4">
      <h2 className="font-display text-xl font-bold text-white mb-1">诗歌文本</h2>
      {mood && moodLabels[mood] && (
        <span className={`text-sm ${moodLabels[mood].color} font-semibold bg-white/10 px-3 py-1 rounded-full">
          {moodLabels[mood].label}
        </span>
      )}
      </div>

      {showInputMode() ? (
        <div className="flex flex-col gap-4 flex-1">
          <textarea
        value={poemText}
        onChange={(e) => onPoemTextChange(e.target.value)}
        placeholder="在此输入诗歌文本，每行一句...&#10;&#10;例如：&#10;床前明月光&#10;疑是地上霜&#10;举头望明月&#10;低头思故乡"
        className="flex-1 w-full bg-white/5 border border-white/20 rounded-lg p-4 text-white placeholder-text-secondary/60 font-serif-cn text-base leading-relaxed resize-none outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
      />
      <button
        onClick={onAnalyze}
        disabled={!poemText.trim() || isAnalyzing}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {isAnalyzing ? (
          <>
            <span className="animate-spin">⏳</span>
            <span>分析中...</span>
          </>
        ) : (
          <>
            <span>✨</span>
            <span>分析诗歌</span>
          </>
        )}
      </button>
      </div>
      ) : (
        <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-2 pr-2"
      >
        {lines.map((line, index) => (
          <div
            key={index}
            ref={index === currentLineIndex ? activeLineRef : null}
            onClick={() => onLineClick(index)}
            className={`poem-line ${
              index === currentLineIndex ? 'poem-line-active glow-text' : ''
            }`}
          >
            <span className="text-text-secondary/50 text-sm mr-3 font-mono">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="font-serif-cn text-lg">{line}</span>
          </div>
        ))}
      </div>
      )}

      {lines.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <button
            onClick={() => onPoemTextChange('')}
            className="btn-secondary w-full text-sm"
          >
            🔄 重新输入
          </button>
        </div>
      )}
    </div>
  );
};
