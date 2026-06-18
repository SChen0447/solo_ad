import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStoryStore } from '../stores/useStoryStore';
import { countWords, checkCooldown, containsSensitiveWords } from '../utils/storyParser';
import type { Character } from '../utils/storyParser';

interface MentionOption {
  character: Character;
  start: number;
  end: number;
  query: string;
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    background: 'rgba(255, 251, 240, 0.6)',
    borderRadius: 20,
    padding: 24,
    border: '1px solid rgba(180, 150, 110, 0.15)',
    position: 'sticky',
    bottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: 700,
    color: '#5d4e37',
    marginBottom: 12,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  latestPreview: {
    padding: '10px 14px',
    background: 'rgba(138, 177, 125, 0.1)',
    borderRadius: 12,
    fontSize: 13,
    color: '#6b8f5e',
    marginBottom: 14,
    lineHeight: 1.6,
    fontStyle: 'italic',
    borderLeft: '3px solid #8ab17d',
  },
  textareaWrap: {
    position: 'relative',
  },
  textarea: {
    width: '100%',
    minHeight: 120,
    padding: '14px 16px',
    borderRadius: 14,
    border: '2px solid rgba(180, 150, 110, 0.25)',
    background: 'rgba(255, 255, 255, 0.85)',
    color: '#5d4e37',
    fontSize: 15,
    lineHeight: 1.7,
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'all 0.25s ease',
    boxSizing: 'border-box',
  },
  textareaFocus: {
    borderColor: '#8ab17d',
    boxShadow: '0 0 0 4px rgba(138, 177, 125, 0.18), 0 4px 20px rgba(138, 177, 125, 0.12)',
  },
  dropdown: {
    position: 'absolute',
    zIndex: 50,
    background: 'rgba(255, 251, 240, 0.98)',
    borderRadius: 12,
    padding: 6,
    boxShadow: '0 10px 30px rgba(93, 78, 55, 0.18)',
    border: '1px solid rgba(180, 150, 110, 0.2)',
    minWidth: 180,
    maxHeight: 240,
    overflowY: 'auto',
    transformOrigin: 'top left',
  },
  dropdownItem: {
    padding: '10px 14px',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontSize: 14,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 16,
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    fontSize: 13,
  },
  wordCount: {
    color: '#8a7b65',
    fontWeight: 500,
  },
  wordCountOver: {
    color: '#c44536',
    fontWeight: 700,
  },
  cooldown: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 20,
    background: 'rgba(231, 111, 81, 0.12)',
    color: '#e76f51',
    fontWeight: 600,
    fontSize: 13,
  },
  cooldownBar: {
    flex: 1,
    height: 4,
    background: 'rgba(231, 111, 81, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    maxWidth: 200,
  },
  cooldownBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #e76f51 0%, #f4a261 100%)',
    borderRadius: 4,
    transition: 'width 0.5s linear',
  },
  submitBtn: {
    padding: '12px 32px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #8ab17d 0%, #6b8f5e 100%)',
    color: 'white',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    letterSpacing: '0.5px',
  },
  submitBtnDisabled: {
    background: 'rgba(138, 177, 125, 0.4)',
    cursor: 'not-allowed',
  },
  errorMsg: {
    marginTop: 10,
    padding: '10px 14px',
    background: 'rgba(196, 69, 54, 0.1)',
    borderRadius: 10,
    color: '#c44536',
    fontSize: 13,
    fontWeight: 600,
    borderLeft: '3px solid #c44536',
  },
};

export function StoryEditor() {
  const {
    currentUser,
    currentBranchId,
    paragraphs,
    characters,
    maxWords,
    cooldownSeconds,
    lastSubmitTime,
    setLastSubmit,
    sendWs,
  } = useStoryStore((s) => ({
    currentUser: s.currentUser,
    currentBranchId: s.currentBranchId,
    paragraphs: s.paragraphs,
    characters: s.characters,
    maxWords: s.maxWords,
    cooldownSeconds: s.cooldownSeconds,
    lastSubmitTime: s.lastSubmitTime,
    setLastSubmit: s.setLastSubmit,
    sendWs: undefined as unknown as (msg: { type: string; data?: unknown }) => void,
  }));

  const [content, setContent] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [mention, setMention] = useState<MentionOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wsSendRef = useRef<((msg: { type: string; data?: unknown }) => void) | null>(null);

  const useWs = useStoryStore.getState as unknown as () => { send: (msg: { type: string; data?: unknown }) => void };
  useEffect(() => {
    const ws = (window as unknown as { __wsSend?: (msg: { type: string; data?: unknown }) => void }).__wsSend;
    wsSendRef.current = ws || null;
  }, []);

  useEffect(() => {
    if (!lastSubmitTime) {
      setCooldown(0);
      return;
    }
    const tick = () => {
      setCooldown(checkCooldown(lastSubmitTime, cooldownSeconds));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [lastSubmitTime, cooldownSeconds]);

  const currentParagraphs = currentBranchId ? paragraphs[currentBranchId] || [] : [];
  const latestParagraph = currentParagraphs[currentParagraphs.length - 1];

  const wordCount = useMemo(() => countWords(content), [content]);
  const isOverLimit = wordCount > maxWords;
  const canSubmit = content.trim().length > 0 && !isOverLimit && cooldown === 0 && !isSubmitting;

  const checkMention = useCallback(
    (text: string, cursorPos: number) => {
      const beforeCursor = text.slice(0, cursorPos);
      const match = beforeCursor.match(/@([^@\s]*)$/);
      if (!match) {
        setMention(null);
        return;
      }
      const query = match[1].toLowerCase();
      const start = cursorPos - match[0].length;
      const end = cursorPos;
      const matched = characters.filter((c) => c.name.toLowerCase().includes(query));
      if (matched.length === 0) {
        setMention(null);
        return;
      }
      setMention({ character: matched[0], start, end, query });
    },
    [characters]
  );

  const sendEditing = useCallback(
    (isEditing: boolean) => {
      try {
        const ws = (window as unknown as { __wsSend?: (msg: { type: string; data?: unknown }) => void }).__wsSend;
        if (ws) {
          ws({
            type: 'editing',
            data: { isEditing, branchId: currentBranchId },
          });
        }
      } catch {}
    },
    [currentBranchId]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    setError(null);
    checkMention(val, e.target.selectionStart);
    if (val.length > 0) {
      sendEditing(true);
    } else {
      sendEditing(false);
    }
  };

  const handleFocus = () => {
    setFocused(true);
  };

  const handleBlur = () => {
    setFocused(false);
    setTimeout(() => setMention(null), 150);
    sendEditing(false);
  };

  const insertMention = (character: Character) => {
    if (!mention || !textareaRef.current) return;
    const before = content.slice(0, mention.start);
    const after = content.slice(mention.end);
    const inserted = `@${character.name} `;
    const newContent = before + inserted + after;
    setContent(newContent);
    setMention(null);
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = mention.start + inserted.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention && (e.key === 'Enter' || e.key === 'Tab')) {
      e.preventDefault();
      insertMention(mention.character);
    }
    if (e.key === 'Escape') {
      setMention(null);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser || !currentBranchId) return;
    setError(null);

    if (containsSensitiveWords(content)) {
      setError('内容包含不适当词汇，请修改');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/paragraphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          authorId: currentUser.id,
          branchId: currentBranchId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '提交失败');
        setIsSubmitting(false);
        return;
      }
      setLastSubmit(Date.now());
      setContent('');
      sendEditing(false);
    } catch (e) {
      setError('网络错误，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cooldownPct = cooldown > 0 ? (cooldown / cooldownSeconds) * 100 : 0;

  const mentionFiltered = mention
    ? characters.filter((c) => c.name.toLowerCase().includes(mention.query))
    : [];

  return (
    <div style={styles.wrapper}>
      <style>{`
        @keyframes dropdownFade {
          from { opacity: 0; transform: scale(0.9) translateY(-4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .mention-dropdown { animation: dropdownFade 0.15s ease-out; }
        .dropdown-item:hover { background: rgba(138, 177, 125, 0.15); }
        .highlight-char {
          color: #8ab17d;
          font-weight: 600;
        }
      `}</style>
      <div style={styles.label}>
        <span>续写故事</span>
        {cooldown > 0 && (
          <span style={styles.cooldown}>
            ⏱ 冷却中 {cooldown}s
          </span>
        )}
      </div>

      {latestParagraph && (
        <div style={styles.latestPreview}>
          <span style={{ fontWeight: 700 }}>上一段：</span>
          {latestParagraph.content.length > 120
            ? latestParagraph.content.slice(0, 120) + '...'
            : latestParagraph.content}
        </div>
      )}

      <div style={styles.textareaWrap}>
        <textarea
          ref={textareaRef}
          style={{
            ...styles.textarea,
            ...(focused ? styles.textareaFocus : {}),
          }}
          value={content}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="继续故事... 输入 @ 可以快速提及角色"
          maxLength={maxWords + 50}
        />

        {mention && mentionFiltered.length > 0 && (
          <div
            className="mention-dropdown"
            style={{
              ...styles.dropdown,
              top: textareaRef.current
                ? (() => {
                    const rect = textareaRef.current.getBoundingClientRect();
                    const wrapperRect = (textareaRef.current.parentElement as HTMLElement).getBoundingClientRect();
                    return rect.bottom - wrapperRect.top + 4;
                  })()
                : 130,
              left: 8,
            }}
          >
            {mentionFiltered.map((c) => (
              <div
                key={c.id}
                className="dropdown-item"
                style={{ ...styles.dropdownItem }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(c);
                }}
              >
                <span style={{ fontSize: 20 }}>{c.emoji}</span>
                <span style={{ color: c.color, fontWeight: 600 }}>{c.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <div style={styles.stats}>
          <span style={isOverLimit ? styles.wordCountOver : styles.wordCount}>
            {wordCount} / {maxWords} 字
          </span>
          {cooldown > 0 && (
            <div style={styles.cooldownBar}>
              <div
                style={{
                  ...styles.cooldownBarFill,
                  width: `${cooldownPct}%`,
                }}
              />
            </div>
          )}
        </div>
        <button
          style={{
            ...styles.submitBtn,
            ...(!canSubmit ? styles.submitBtnDisabled : {}),
          }}
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {isSubmitting ? '提交中...' : cooldown > 0 ? `等待 ${cooldown}s` : '提交段落'}
        </button>
      </div>

      {error && <div style={styles.errorMsg}>⚠ {error}</div>}
    </div>
  );
}
