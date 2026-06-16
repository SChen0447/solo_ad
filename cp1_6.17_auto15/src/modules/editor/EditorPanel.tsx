import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { Paragraph, PlayerState } from '../../types';
import { paragraphsToText } from '../../utils/textParser';

interface EditorPanelProps {
  paragraphs: Paragraph[];
  onTextChange: (text: string) => void;
  playerState: PlayerState;
  onJumpToSentence: (paragraphIndex: number, sentenceIndex: number) => void;
  onMergeParagraph: (index: number) => void;
  onSplitParagraph: (paragraphIndex: number, sentenceIndex: number) => void;
}

function EditorPanel({
  paragraphs,
  onTextChange,
  playerState,
  onJumpToSentence,
  onMergeParagraph,
  onSplitParagraph,
}: EditorPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [rawText, setRawText] = useState('');
  const highlightContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setRawText(paragraphsToText(paragraphs));
    }
  }, [paragraphs, isEditing]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawText(e.target.value);
  };

  const handleTextareaBlur = () => {
    setIsEditing(false);
    onTextChange(rawText);
  };

  const handleTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      onTextChange(rawText);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(false);
      onTextChange(rawText);
    }
  };

  const handleSentenceClick = (pIdx: number, sIdx: number) => {
    onJumpToSentence(pIdx, sIdx);
  };

  const scrollToHighlight = useCallback(() => {
    if (!highlightContainerRef.current) return;
    const highlightEl = highlightContainerRef.current.querySelector('.highlight-sentence');
    if (highlightEl) {
      highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  useEffect(() => {
    if (playerState.isPlaying) {
      scrollToHighlight();
    }
  }, [playerState.currentParagraphIndex, playerState.currentSentenceIndex, playerState.isPlaying, scrollToHighlight]);

  const isCurrentSentence = (pIdx: number, sIdx: number): boolean => {
    return (
      playerState.isPlaying &&
      pIdx === playerState.currentParagraphIndex &&
      sIdx === playerState.currentSentenceIndex
    );
  };

  const isCurrentParagraph = (pIdx: number): boolean => {
    return playerState.isPlaying && pIdx === playerState.currentParagraphIndex;
  };

  if (isEditing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <span style={{ color: '#888', fontSize: '13px' }}>编辑模式（Esc 或 Ctrl+Enter 完成）</span>
          <button
            onClick={() => {
              setIsEditing(false);
              onTextChange(rawText);
            }}
            style={{
              padding: '4px 12px',
              backgroundColor: '#007acc',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            完成
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={rawText}
          onChange={handleTextareaChange}
          onBlur={handleTextareaBlur}
          onKeyDown={handleTextareaKeyDown}
          autoFocus
          style={{
            flex: 1,
            backgroundColor: '#1e1e1e',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '16px',
            fontSize: '15px',
            lineHeight: '1.8',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        padding: '16px 20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          onClick={() => setIsEditing(true)}
          style={{
            padding: '4px 12px',
            backgroundColor: 'transparent',
            color: '#007acc',
            border: '1px solid #007acc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          ✏️ 编辑文本
        </button>
      </div>

      <div ref={highlightContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {paragraphs.map((paragraph, pIdx) => (
          <div
            key={paragraph.id}
            style={{
              display: 'flex',
              borderBottom: pIdx < paragraphs.length - 1 ? '1px solid #333' : 'none',
              padding: '12px 0',
            }}
          >
            <div
              style={{
                width: '40px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '4px',
                gap: '4px',
              }}
            >
              {isCurrentParagraph(pIdx) && (
                <span className="speaker-icon" title="朗读中">
                  🔊
                </span>
              )}
              <span
                style={{
                  fontSize: '12px',
                  color: isCurrentParagraph(pIdx) ? '#007acc' : '#666',
                  fontWeight: isCurrentParagraph(pIdx) ? 600 : 400,
                }}
              >
                {pIdx + 1}
              </span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', lineHeight: '2' }}>
                {paragraph.sentences.map((sentence, sIdx) => (
                  <span
                    key={sentence.id}
                    onClick={() => handleSentenceClick(pIdx, sIdx)}
                    className={isCurrentSentence(pIdx, sIdx) ? 'highlight-sentence' : ''}
                    style={{
                      cursor: 'pointer',
                      padding: '2px 4px',
                      margin: '1px 0',
                      borderRadius: '3px',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    {sentence.text}
                  </span>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '6px',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
              >
                <button
                  onClick={() => onSplitParagraph(pIdx, Math.max(1, Math.floor(paragraph.sentences.length / 2)))}
                  disabled={paragraph.sentences.length < 2}
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    backgroundColor: 'transparent',
                    color: '#666',
                    border: '1px solid #444',
                    borderRadius: '3px',
                    cursor: paragraph.sentences.length < 2 ? 'not-allowed' : 'pointer',
                  }}
                  title="拆分段落"
                >
                  ↕ 拆分
                </button>
                {pIdx < paragraphs.length - 1 && (
                  <button
                    onClick={() => onMergeParagraph(pIdx)}
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      backgroundColor: 'transparent',
                      color: '#666',
                      border: '1px solid #444',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                    title="与下一段合并"
                  >
                    ↔ 合并
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EditorPanel;
