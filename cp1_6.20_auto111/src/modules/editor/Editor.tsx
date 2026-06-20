import { useState, useRef, useEffect, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  vscDarkPlus,
  monokai,
  oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';
import type { Language, Theme, CollaboratorCursor, User } from './types';
import { LANGUAGE_LABELS, THEME_LABELS, CURSOR_COLORS } from './types';
import { collabSync, applyOperation } from './CollabSync';

interface EditorProps {
  code: string;
  language: Language;
  theme: Theme;
  readOnly?: boolean;
  onCodeChange?: (code: string) => void;
  onLanguageChange?: (lang: Language) => void;
  onThemeChange?: (theme: Theme) => void;
  snippetId?: string;
  currentUser?: User;
}

const THEME_STYLES: Record<Theme, unknown> = {
  'vs-dark': vscDarkPlus,
  monokai: monokai,
  light: oneLight,
};

const LANGUAGE_MAP: Record<Language, string> = {
  javascript: 'javascript',
  python: 'python',
  html: 'markup',
  typescript: 'typescript',
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}

export default function Editor({
  code,
  language,
  theme,
  readOnly = false,
  onCodeChange,
  onLanguageChange,
  onThemeChange,
  snippetId,
  currentUser,
}: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursors, setCursors] = useState<CollaboratorCursor[]>([]);
  const [collaborators, setCollaborators] = useState<User[]>([]);

  useEffect(() => {
    if (snippetId && currentUser) {
      collabSync.connect(snippetId, currentUser);
      collabSync.setCursorCallback(setCursors);
      collabSync.setCollaboratorsCallback(setCollaborators);
      collabSync.setOperationCallback((op) => {
        if (op.userId !== currentUser.id) {
          const newCode = applyOperation(code, op);
          onCodeChange?.(newCode);
        }
      });
    }
    return () => {
      collabSync.disconnect();
    };
  }, [snippetId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (readOnly) {
        e.preventDefault();
        return;
      }

      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (e.key === 'Tab') {
        e.preventDefault();
        const newCode = code.slice(0, start) + '  ' + code.slice(end);
        onCodeChange?.(newCode);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const lineStart = code.lastIndexOf('\n', start - 1) + 1;
        const currentLine = code.slice(lineStart, start);
        const indentMatch = currentLine.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';
        const newCode = code.slice(0, start) + '\n' + indent + code.slice(end);
        onCodeChange?.(newCode);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length;
        });
      }

      const brackets: Record<string, string> = {
        '(': ')',
        '[': ']',
        '{': '}',
        '"': '"',
        "'": "'",
        '`': '`',
      };

      if (brackets[e.key]) {
        e.preventDefault();
        const selected = code.slice(start, end);
        const newCode =
          code.slice(0, start) + e.key + selected + brackets[e.key] + code.slice(end);
        onCodeChange?.(newCode);
        requestAnimationFrame(() => {
          if (start === end) {
            textarea.selectionStart = textarea.selectionEnd = start + 1;
          } else {
            textarea.selectionStart = start + 1;
            textarea.selectionEnd = end + 1;
          }
        });
      }
    },
    [code, readOnly, onCodeChange]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    onCodeChange?.(e.target.value);
  };

  const bgColor = theme === 'light' ? '#ffffff' : theme === 'monokai' ? '#272822' : '#1e1e1e';
  const textColor = theme === 'light' ? '#383a42' : '#dcdcdc';

  return (
    <div className="editor-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        className="editor-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          background: '#252526',
          borderBottom: '1px solid #3c3c3c',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ color: '#888', fontSize: 13 }}>语言:</label>
          <select
            value={language}
            onChange={(e) => onLanguageChange?.(e.target.value as Language)}
            disabled={readOnly}
            style={{
              background: '#3c3c3c',
              color: '#dcdcdc',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 13,
              cursor: readOnly ? 'not-allowed' : 'pointer',
              outline: 'none',
            }}
          >
            {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_LABELS[lang]}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ color: '#888', fontSize: 13 }}>主题:</label>
          <select
            value={theme}
            onChange={(e) => onThemeChange?.(e.target.value as Theme)}
            style={{
              background: '#3c3c3c',
              color: '#dcdcdc',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 13,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {(Object.keys(THEME_LABELS) as Theme[]).map((t) => (
              <option key={t} value={t}>
                {THEME_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {readOnly && (
          <span
            style={{
              padding: '4px 10px',
              background: '#e74c3c',
              color: 'white',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            只读模式
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {collaborators.map((user, idx) => (
            <motion.div
              key={user.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              title={user.name}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: user.avatarColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                border: `2px solid ${CURSOR_COLORS[idx % CURSOR_COLORS.length]}`,
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </motion.div>
          ))}
        </div>
      </div>

      <div
        className="editor-container"
        style={{
          position: 'relative',
          flex: 1,
          overflow: 'auto',
          background: bgColor,
        }}
      >
        <div
          style={{
            position: 'relative',
            fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
            fontSize: 14,
            lineHeight: 1.6,
            minHeight: '100%',
          }}
        >
          <SyntaxHighlighter
            language={LANGUAGE_MAP[language]}
            style={THEME_STYLES[theme] as Record<string, React.CSSProperties>}
            showLineNumbers
            wrapLines
            customStyle={{
              margin: 0,
              padding: '16px 0',
              background: 'transparent',
              minHeight: '100%',
              fontSize: 14,
              lineHeight: 1.6,
            }}
            codeTagProps={{
              style: {
                fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
              },
            }}
          >
            {code || ' '}
          </SyntaxHighlighter>

          <textarea
            ref={textareaRef}
            value={code}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            spellCheck={false}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              padding: '16px 16px 16px 60px',
              fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
              fontSize: 14,
              lineHeight: 1.6,
              color: readOnly ? 'transparent' : textColor,
              caretColor: textColor,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              whiteSpace: 'pre',
              overflow: 'hidden',
              cursor: readOnly ? 'default' : 'text',
            }}
          />

          {cursors.map((cursor) => (
            <AnimatePresence key={cursor.userId}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: 2,
                    height: 20,
                    background: cursor.color,
                    transform: `translate(${60 + (cursor.position % 80) * 8}px, ${16 + Math.floor(cursor.position / 80) * 22.4}px)`,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: -18,
                      left: 0,
                      padding: '2px 6px',
                      background: cursor.color,
                      color: 'white',
                      fontSize: 10,
                      borderRadius: 3,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cursor.user.name}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          ))}
        </div>
      </div>
    </div>
  );
}

export { formatRelativeTime };
