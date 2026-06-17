import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import type { DiffLine, DiffResult, SupportedLanguage, BubbleState } from '@/types';
import { highlight } from '@/utils/highlighter';

interface SideBySideViewProps {
  diffResult: DiffResult | null;
  language: SupportedLanguage;
}

const STATUS_BG: Record<string, string> = {
  added: '#d4fcbc',
  removed: '#fbb',
  changed: '#ffeaa7',
  unchanged: 'transparent',
};

const STATUS_INDICATOR: Record<string, { symbol: string; color: string }> = {
  added: { symbol: '+', color: '#2d6a4f' },
  removed: { symbol: '-', color: '#c0392b' },
  changed: { symbol: '~', color: '#e67e22' },
  unchanged: { symbol: '', color: 'transparent' },
};

const STATUS_BUBBLE: Record<string, string> = {
  added: '此行在新版本中新增',
  removed: '此行在旧版本中被删除',
  changed: '此行在新版本中被修改',
};

interface DiffPanelProps {
  lines: DiffLine[];
  side: 'left' | 'right';
  language: SupportedLanguage;
  bubble: BubbleState;
  onLineClick: (e: React.MouseEvent, line: DiffLine) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (scrollTop: number) => void;
  isSyncScrolling: React.MutableRefObject<boolean>;
}

const DiffPanel = React.memo(function DiffPanel({
  lines,
  side,
  language,
  bubble,
  onLineClick,
  scrollRef,
  onScroll,
  isSyncScrolling,
}: DiffPanelProps) {
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (isSyncScrolling.current) return;
      const target = e.currentTarget;
      onScroll(target.scrollTop);
    },
    [onScroll, isSyncScrolling]
  );

  return (
    <div className="diff-panel" ref={scrollRef} onScroll={handleScroll}>
      <table className="diff-table">
        <tbody>
          {lines.map((line, idx) => {
            const bg = STATUS_BG[line.status];
            const indicator = STATUS_INDICATOR[line.status];
            const isHighlight = line.status !== 'unchanged';
            const highlightedText = highlight(line.text, language);

            return (
              <tr
                key={`${side}-${idx}`}
                className={`diff-line ${isHighlight ? 'diff-line-highlight' : ''}`}
                style={{ backgroundColor: bg }}
                onClick={isHighlight ? (e) => onLineClick(e, line) : undefined}
              >
                <td className="diff-line-number">
                  {indicator.symbol && (
                    <span
                      className="diff-indicator"
                      style={{ color: indicator.color }}
                    >
                      {indicator.symbol}
                    </span>
                  )}
                  <span>{line.lineNumber}</span>
                </td>
                <td className="diff-line-content">
                  <span dangerouslySetInnerHTML={{ __html: highlightedText }} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {bubble.visible && (
        <div
          className="diff-bubble"
          style={{ top: bubble.y, left: bubble.x }}
        >
          {bubble.text}
        </div>
      )}
    </div>
  );
});

export default function SideBySideView({ diffResult, language }: SideBySideViewProps) {
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isSyncScrolling = useRef(false);
  const scrollRafId = useRef<number | null>(null);
  const lastScrollSide = useRef<'left' | 'right' | null>(null);

  const [leftBubble, setLeftBubble] = useState<BubbleState>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
  });
  const [rightBubble, setRightBubble] = useState<BubbleState>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
  });

  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const syncScroll = useCallback((source: 'left' | 'right', scrollTop: number) => {
    if (scrollRafId.current) {
      cancelAnimationFrame(scrollRafId.current);
    }

    scrollRafId.current = requestAnimationFrame(() => {
      isSyncScrolling.current = true;
      lastScrollSide.current = source;

      const targetEl = source === 'left' ? rightScrollRef.current : leftScrollRef.current;
      if (targetEl) {
        const maxScroll = targetEl.scrollHeight - targetEl.clientHeight;
        const clampedTop = Math.max(0, Math.min(scrollTop, maxScroll));
        targetEl.scrollTop = clampedTop;
      }

      scrollRafId.current = requestAnimationFrame(() => {
        isSyncScrolling.current = false;
        lastScrollSide.current = null;
      });

      scrollRafId.current = null;
    });
  }, []);

  const handleLeftScroll = useCallback(
    (scrollTop: number) => {
      syncScroll('left', scrollTop);
    },
    [syncScroll]
  );

  const handleRightScroll = useCallback(
    (scrollTop: number) => {
      syncScroll('right', scrollTop);
    },
    [syncScroll]
  );

  useEffect(() => {
    return () => {
      if (scrollRafId.current) {
        cancelAnimationFrame(scrollRafId.current);
      }
      if (bubbleTimerRef.current) {
        clearTimeout(bubbleTimerRef.current);
      }
    };
  }, []);

  const handleLineClick = useCallback(
    (side: 'left' | 'right') => (e: React.MouseEvent, line: DiffLine) => {
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);

      const target = e.currentTarget as HTMLElement;
      const panelEl = target.closest('.diff-panel');
      if (!panelEl) return;

      const targetRect = target.getBoundingClientRect();
      const panelRect = panelEl.getBoundingClientRect();
      const x = e.clientX - panelRect.left;

      let y = targetRect.top - panelRect.top - 36;
      if (y < 0) {
        y = targetRect.bottom - panelRect.top + 4;
      }

      const bubbleState: BubbleState = {
        visible: true,
        x,
        y,
        text: STATUS_BUBBLE[line.status] ?? '',
      };

      if (side === 'left') {
        setLeftBubble(bubbleState);
        setRightBubble((prev) => ({ ...prev, visible: false }));
      } else {
        setRightBubble(bubbleState);
        setLeftBubble((prev) => ({ ...prev, visible: false }));
      }

      bubbleTimerRef.current = setTimeout(() => {
        setLeftBubble((prev) => ({ ...prev, visible: false }));
        setRightBubble((prev) => ({ ...prev, visible: false }));
      }, 2000);
    },
    []
  );

  const leftLines = useMemo(() => diffResult?.leftLines ?? [], [diffResult]);
  const rightLines = useMemo(() => diffResult?.rightLines ?? [], [diffResult]);

  const handleLeftLineClick = useMemo(
    () => handleLineClick('left'),
    [handleLineClick]
  );
  const handleRightLineClick = useMemo(
    () => handleLineClick('right'),
    [handleLineClick]
  );

  return (
    <div className="side-by-side-view">
      <DiffPanel
        lines={leftLines}
        side="left"
        language={language}
        bubble={leftBubble}
        onLineClick={handleLeftLineClick}
        scrollRef={leftScrollRef}
        onScroll={handleLeftScroll}
        isSyncScrolling={isSyncScrolling}
      />
      <DiffPanel
        lines={rightLines}
        side="right"
        language={language}
        bubble={rightBubble}
        onLineClick={handleRightLineClick}
        scrollRef={rightScrollRef}
        onScroll={handleRightScroll}
        isSyncScrolling={isSyncScrolling}
      />
    </div>
  );
}
