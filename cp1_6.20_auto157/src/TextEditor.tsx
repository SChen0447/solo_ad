import { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontItem, TypographySettings, PreviewColumn } from './types';

interface TextEditorProps {
  text: string;
  onTextChange: (text: string) => void;
  fonts: FontItem[];
  columns: PreviewColumn[];
  typography: TypographySettings;
  onColumnFontChange: (columnId: string, fontId: string | null) => void;
  onAddColumn: () => void;
  onRemoveColumn: (columnId: string) => void;
}

function TextEditor({
  text,
  onTextChange,
  fonts,
  columns,
  typography,
  onColumnFontChange,
  onAddColumn,
  onRemoveColumn,
}: TextEditorProps) {
  const previewRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isSyncingRef = useRef(false);

  const handleScroll = useCallback((index: number) => {
    if (isSyncingRef.current) return;
    
    const source = previewRefs.current[index];
    if (!source) return;
    
    isSyncingRef.current = true;
    const scrollTop = source.scrollTop;
    
    previewRefs.current.forEach((ref, i) => {
      if (i !== index && ref) {
        ref.scrollTop = scrollTop;
      }
    });
    
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, []);

  useEffect(() => {
    previewRefs.current = previewRefs.current.slice(0, columns.length);
  }, [columns.length]);

  const getFontById = (fontId: string | null): FontItem | undefined => {
    if (!fontId) return undefined;
    return fonts.find(f => f.id === fontId);
  };

  return (
    <div style={styles.container}>
      <div style={styles.textareaWrapper}>
        <label style={styles.textareaLabel}>文本内容</label>
        <textarea
          style={styles.textarea}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="在此输入要预览的文本..."
          rows={6}
        />
      </div>

      <div style={styles.previewHeader}>
        <span style={styles.previewTitle}>
          预览 ({columns.length}/4列)
        </span>
        <button
          style={{
            ...styles.addColumnButton,
            ...(columns.length >= 4 ? styles.addColumnButtonDisabled : {}),
          }}
          onClick={onAddColumn}
          disabled={columns.length >= 4}
        >
          + 添加列
        </button>
      </div>

      <div style={styles.previewContainer}>
        {columns.map((column, index) => {
          const font = getFontById(column.fontId);
          return (
            <motion.div
              key={column.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                ...styles.previewColumn,
                ...(index < columns.length - 1 ? styles.previewColumnBorder : {}),
              }}
            >
              <div style={styles.columnHeader}>
                <select
                  style={styles.columnFontSelect}
                  value={column.fontId || ''}
                  onChange={(e) => onColumnFontChange(column.id, e.target.value || null)}
                >
                  <option value="">选择字体</option>
                  {fonts.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {columns.length > 1 && (
                  <button
                    style={styles.removeColumnButton}
                    onClick={() => onRemoveColumn(column.id)}
                    title="删除列"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div style={styles.fontNameTag}>
                {font ? font.name : '未选择字体'}
              </div>

              <div
                ref={(el) => { previewRefs.current[index] = el; }}
                style={{
                  ...styles.previewContent,
                  fontFamily: font ? `'${font.name}'` : 'inherit',
                  fontSize: `${typography.fontSize}px`,
                  lineHeight: typography.lineHeight,
                  fontWeight: typography.fontWeight,
                  color: typography.color,
                  textAlign: typography.textAlign,
                }}
                onScroll={() => handleScroll(index)}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={text + (font?.id || 'default')}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={styles.previewText}
                  >
                    {text || <span style={{ color: '#9ca3af' }}>暂无文本</span>}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minHeight: 0,
  },
  textareaWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  textareaLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  textarea: {
    width: '100%',
    height: '120px',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: 1.5,
    resize: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.1s',
    outline: 'none',
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  addColumnButton: {
    padding: '6px 14px',
    backgroundColor: '#ffffff',
    color: '#3b82f6',
    border: '1px solid #3b82f6',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.1s',
  },
  addColumnButtonDisabled: {
    color: '#9ca3af',
    borderColor: '#e5e7eb',
    cursor: 'not-allowed',
  },
  previewContainer: {
    flex: 1,
    display: 'flex',
    minHeight: '400px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  previewColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  previewColumnBorder: {
    borderRight: '1px solid #e5e7eb',
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  columnFontSelect: {
    flex: 1,
    padding: '4px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '12px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  removeColumnButton: {
    width: '24px',
    height: '24px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fontNameTag: {
    padding: '8px 12px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#fafafa',
    borderBottom: '1px solid #e5e7eb',
    fontWeight: 500,
  },
  previewContent: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
    overflowX: 'hidden',
    minHeight: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  previewText: {
    minHeight: '100%',
  },
};

export default TextEditor;
