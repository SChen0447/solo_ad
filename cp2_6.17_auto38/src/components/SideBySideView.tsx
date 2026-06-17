import React, { useRef, useCallback, useMemo } from 'react';
import type { DiffLine, DiffResult } from '@/utils/diffEngine';
import { highlight, type SupportedLanguage } from '@/utils/highlighter';

interface SideBySideViewProps {
  diffResult: DiffResult | null;
  language: SupportedLanguage;
}

interface BubbleState {
  visible: boolean;
  x: number;
  y: number;
  text: string;
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

function DiffPanel({
  lines,
  side,
  language,
  bubble,
  onLineClick,
  scrollRef,
  onScroll,
}: {
  lines: DiffLine[];
  side: 'left' | 'right';
  language: SupportedLanguage;
  bubble: BubbleState;
  onLineClick: (e: React.MouseEvent, line: DiffLine) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="diff-panel" ref={scrollRef} onScroll={onScroll}>
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
}

export default function SideBySideView({ diffResult, language }: SideBySideViewProps) {
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  const [leftBubble, setLeftBubble] = React.useState<BubbleState>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
  });
  const [rightBubble, setRightBubble] = React.useState<BubbleState>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
  });

  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleLineClick = useCallback(
    (side: 'left' | 'right') => (e: React.MouseEvent, line: DiffLine) => {
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const panelRect = (e.currentTarget as HTMLElement)
        .closest('.diff-panel')
        ?.getBoundingClientRect();

      const x = e.clientX - (panelRect?.left ?? 0);
      const y = rect.top - (panelRect?.top ?? 0) - 36;

      const bubbleState: BubbleState = {
        visible: true,
        x,
        y: y < 0 ? rect.bottom - (panelRect?.top ?? 0) + 4 : y,
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

  const handleLeftScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      const target = e.currentTarget;
      if (rightScrollRef.current) {
        rightScrollRef.current.scrollTop = target.scrollTop;
        rightScrollRef.current.scrollLeft = target.scrollLeft;
      }
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    },
    []
  );

  const handleRightScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      const target = e.currentTarget;
      if (leftScrollRef.current) {
        leftScrollRef.current.scrollTop = target.scrollTop;
        leftScrollRef.current.scrollLeft = target.scrollLeft;
      }
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
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
      />
      <DiffPanel
        lines={rightLines}
        side="right"
        language={language}
        bubble={rightBubble}
        onLineClick={handleRightLineClick}
        scrollRef={rightScrollRef}
        onScroll={handleRightScroll}
      />
    </div>
  );
}
