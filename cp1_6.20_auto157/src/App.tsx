import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FontUploader from './FontUploader';
import TextEditor from './TextEditor';
import CodeGenerator from './CodeGenerator';
import { FontItem, TypographySettings, PreviewColumn, SampleTextKey, SAMPLE_TEXTS } from './types';
import './App.css';

function App() {
  const [fonts, setFonts] = useState<FontItem[]>([]);
  const [columns, setColumns] = useState<PreviewColumn[]>([
    { id: 'col-1', fontId: null },
  ]);
  const [text, setText] = useState<string>(SAMPLE_TEXTS.poem.content);
  const [selectedSample, setSelectedSample] = useState<SampleTextKey>('poem');
  const [typography, setTypography] = useState<TypographySettings>({
    fontSize: 24,
    lineHeight: 1.6,
    fontWeight: 400,
    color: '#1f2937',
    textAlign: 'left',
  });
  const [showCodeModal, setShowCodeModal] = useState(false);

  const handleFontAdd = useCallback((font: FontItem) => {
    setFonts(prev => [...prev, font]);
    setColumns(prev => {
      const emptyCol = prev.find(col => col.fontId === null);
      if (emptyCol) {
        return prev.map(col =>
          col.id === emptyCol.id ? { ...col, fontId: font.id } : col
        );
      }
      if (prev.length < 4) {
        return [...prev, { id: `col-${Date.now()}`, fontId: font.id }];
      }
      return prev;
    });
  }, []);

  const handleFontDelete = useCallback((fontId: string) => {
    setFonts(prev => prev.filter(f => f.id !== fontId));
    setColumns(prev =>
      prev.map(col =>
        col.fontId === fontId ? { ...col, fontId: null } : col
      )
    );
  }, []);

  const handleColumnFontChange = useCallback((columnId: string, fontId: string | null) => {
    setColumns(prev =>
      prev.map(col =>
        col.id === columnId ? { ...col, fontId } : col
      )
    );
  }, []);

  const addColumn = useCallback(() => {
    if (columns.length < 4) {
      setColumns(prev => [...prev, { id: `col-${Date.now()}`, fontId: null }]);
    }
  }, [columns.length]);

  const removeColumn = useCallback((columnId: string) => {
    if (columns.length > 1) {
      setColumns(prev => prev.filter(col => col.id !== columnId));
    }
  }, [columns.length]);

  const handleSampleChange = useCallback((key: SampleTextKey) => {
    setSelectedSample(key);
    setText(SAMPLE_TEXTS[key].content);
  }, []);

  const handleTypographyChange = useCallback((key: keyof TypographySettings, value: number | string) => {
    setTypography(prev => ({ ...prev, [key]: value }));
  }, []);

  const selectedFonts = useMemo(() => {
    return columns
      .map(col => fonts.find(f => f.id === col.fontId))
      .filter((f): f is FontItem => f !== undefined);
  }, [columns, fonts]);

  return (
    <div className="app-container" style={styles.container}>
      <div className="main-panel" style={styles.mainPanel}>
        <aside className="sidebar" style={styles.sidebar}>
          <h2 style={styles.sidebarTitle}>字体管理</h2>
          <FontUploader
            fonts={fonts}
            onFontAdd={handleFontAdd}
            onFontDelete={handleFontDelete}
          />
        </aside>

        <main className="content" style={styles.content}>
          <div style={styles.header}>
            <h1 style={styles.title}>字体预览与排版对比</h1>
            <motion.button
              className="button-primary"
              style={styles.exportButton}
              onClick={() => setShowCodeModal(true)}
              disabled={selectedFonts.length === 0}
              whileHover={{ filter: 'brightness(1.1)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.1 }}
            >
              导出代码
            </motion.button>
          </div>

          <div className="controls-section" style={styles.controlsSection}>
            <div style={styles.controlGroup}>
              <label style={styles.controlLabel}>示例文本</label>
              <select
                className="select"
                style={styles.select}
                value={selectedSample}
                onChange={(e) => handleSampleChange(e.target.value as SampleTextKey)}
              >
                {Object.entries(SAMPLE_TEXTS).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            <div style={styles.controlGroup}>
              <label style={styles.controlLabel}>
                字号: {typography.fontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="72"
                step="1"
                value={typography.fontSize}
                onChange={(e) => handleTypographyChange('fontSize', Number(e.target.value))}
                style={styles.slider}
              />
            </div>

            <div style={styles.controlGroup}>
              <label style={styles.controlLabel}>
                行高: {typography.lineHeight.toFixed(1)}
              </label>
              <input
                type="range"
                min="1.0"
                max="2.0"
                step="0.1"
                value={typography.lineHeight}
                onChange={(e) => handleTypographyChange('lineHeight', Number(e.target.value))}
                style={styles.slider}
              />
            </div>

            <div style={styles.controlGroup}>
              <label style={styles.controlLabel}>
                字重: {typography.fontWeight}
              </label>
              <select
                className="select"
                style={styles.select}
                value={typography.fontWeight}
                onChange={(e) => handleTypographyChange('fontWeight', Number(e.target.value))}
              >
                {[100, 200, 300, 400, 500, 600, 700, 800, 900].map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            <div style={styles.controlGroup}>
              <label style={styles.controlLabel}>颜色</label>
              <input
                type="color"
                className="color-picker"
                value={typography.color}
                onChange={(e) => handleTypographyChange('color', e.target.value)}
                style={styles.colorPicker}
              />
            </div>

            <div style={styles.controlGroup}>
              <label style={styles.controlLabel}>对齐</label>
              <div style={styles.alignButtons}>
                {(['left', 'center', 'right'] as const).map(align => (
                  <motion.button
                    key={align}
                    className={`align-button ${typography.textAlign === align ? 'align-button-active' : ''}`}
                    style={{
                      ...styles.alignButton,
                      ...(typography.textAlign === align ? styles.alignButtonActive : {}),
                    }}
                    onClick={() => handleTypographyChange('textAlign', align)}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                  >
                    {align === 'left' ? '左' : align === 'center' ? '中' : '右'}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          <TextEditor
            text={text}
            onTextChange={setText}
            fonts={fonts}
            columns={columns}
            typography={typography}
            onColumnFontChange={handleColumnFontChange}
            onAddColumn={addColumn}
            onRemoveColumn={removeColumn}
          />
        </main>
      </div>

      <AnimatePresence>
        {showCodeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={styles.modalOverlay}
            onClick={() => setShowCodeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <CodeGenerator
                fonts={selectedFonts}
                typography={typography}
                onClose={() => setShowCodeModal(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '24px 0',
  },
  mainPanel: {
    display: 'flex',
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    minHeight: 'calc(100vh - 48px)',
  },
  sidebar: {
    width: '280px',
    flexShrink: 0,
    padding: '16px',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1f2937',
  },
  exportButton: {
    padding: '8px 20px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  controlsSection: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '140px',
  },
  controlLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: 500,
  },
  select: {
    padding: '6px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'border-color 0.1s, box-shadow 0.1s',
    outline: 'none',
  },
  slider: {
    width: '100%',
    cursor: 'pointer',
    accentColor: '#3b82f6',
  },
  colorPicker: {
    width: '40px',
    height: '32px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    padding: '2px',
    transition: 'border-color 0.1s',
  },
  alignButtons: {
    display: 'flex',
    gap: '4px',
  },
  alignButton: {
    flex: 1,
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.1s',
  },
  alignButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderColor: '#3b82f6',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    maxWidth: '700px',
    maxHeight: '80vh',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
  },
};

export default App;
