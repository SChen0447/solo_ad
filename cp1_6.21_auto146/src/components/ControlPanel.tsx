import { useState, useEffect, useMemo } from 'react';
import {
  GridConfig,
  GridItemConfig,
  generateCSSCode
} from '../utils/gridStyles';

interface ControlPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  gridConfig: GridConfig;
  onGridConfigChange: (key: keyof GridConfig, value: string | number) => void;
  itemsConfig: GridItemConfig[];
  onItemConfigChange: (index: number, key: keyof GridItemConfig, value: string) => void;
  selectedItem: number | null;
  onReset: () => void;
}

const COLUMN_PRESETS = [
  { label: '1fr 1fr 1fr', value: '1fr 1fr 1fr' },
  { label: '2fr 1fr', value: '2fr 1fr' },
  { label: '1fr 2fr 1fr', value: '1fr 2fr 1fr' },
  { label: '100px 1fr 100px', value: '100px 1fr 100px' },
  { label: '自定义', value: 'custom' }
];

const ROW_PRESETS = [
  { label: 'auto', value: 'auto' },
  { label: '1fr 1fr', value: '1fr 1fr' },
  { label: '100px 1fr', value: '100px 1fr' },
  { label: '自定义', value: 'custom' }
];

const ALIGN_OPTIONS = ['start', 'end', 'center', 'stretch'] as const;

export default function ControlPanel({
  isOpen,
  onToggle,
  gridConfig,
  onGridConfigChange,
  itemsConfig,
  onItemConfigChange,
  selectedItem,
  onReset
}: ControlPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [customColumns, setCustomColumns] = useState(false);
  const [customRows, setCustomRows] = useState(false);
  const [columnsInput, setColumnsInput] = useState(gridConfig.templateColumns);
  const [rowsInput, setRowsInput] = useState(gridConfig.templateRows);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const cssCode = useMemo(() => generateCSSCode(gridConfig), [gridConfig]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cssCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 500);
    } catch (e) {
      console.error('复制失败:', e);
    }
  };

  const handleColumnsPreset = (value: string) => {
    if (value === 'custom') {
      setCustomColumns(true);
    } else {
      setCustomColumns(false);
      setColumnsInput(value);
      onGridConfigChange('templateColumns', value);
    }
  };

  const handleRowsPreset = (value: string) => {
    if (value === 'custom') {
      setCustomRows(true);
    } else {
      setCustomRows(false);
      setRowsInput(value);
      onGridConfigChange('templateRows', value);
    }
  };

  const handleColumnsInputChange = (value: string) => {
    setColumnsInput(value);
    onGridConfigChange('templateColumns', value);
  };

  const handleRowsInputChange = (value: string) => {
    setRowsInput(value);
    onGridConfigChange('templateRows', value);
  };

  const selectedItemConfig = selectedItem !== null ? itemsConfig[selectedItem] : null;

  const panelTransform = isMobile
    ? isOpen ? 'translateY(0)' : 'translateY(-100%)'
    : isOpen ? 'translateX(0)' : 'translateX(-100%)';

  return (
    <>
      <button
        onClick={onToggle}
        style={{
          ...styles.toggleButton,
          ...(isMobile
            ? { top: isOpen ? 'auto' : '16px', left: '16px' }
            : { left: isOpen ? '336px' : '16px', top: '50%', transform: 'translateY(-50%)' }),
          zIndex: 1001
        }}
      >
        {isOpen ? '收起控件' : '打开控件'}
      </button>

      <div
        style={{
          ...styles.panel,
          ...(isMobile
            ? { width: '100%', height: 'auto', maxHeight: '60vh', top: 0, left: 0, overflowY: 'auto' }
            : { width: '320px', height: '100%', top: 0, left: 0 }),
          transform: panelTransform,
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: 1000
        }}
      >
        <div style={styles.header}>
          <h2 style={styles.title}>CSS Grid 控制面板</h2>
          <button onClick={onReset} style={styles.resetButton}>
            重置所有属性
          </button>
        </div>

        <div style={styles.containerSection}>
          <h3 style={styles.sectionTitle}>容器属性</h3>

          <div style={styles.field}>
            <label style={styles.label}>grid-template-columns</label>
            <select
              value={customColumns ? 'custom' : gridConfig.templateColumns}
              onChange={e => handleColumnsPreset(e.target.value)}
              style={styles.select}
            >
              {COLUMN_PRESETS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            {customColumns && (
              <input
                type="text"
                value={columnsInput}
                onChange={e => handleColumnsInputChange(e.target.value)}
                placeholder="例如: 1fr 2fr 1fr"
                style={{ ...styles.input, marginTop: '8px' }}
              />
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>grid-template-rows</label>
            <select
              value={customRows ? 'custom' : gridConfig.templateRows}
              onChange={e => handleRowsPreset(e.target.value)}
              style={styles.select}
            >
              {ROW_PRESETS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            {customRows && (
              <input
                type="text"
                value={rowsInput}
                onChange={e => handleRowsInputChange(e.target.value)}
                placeholder="例如: 100px 1fr"
                style={{ ...styles.input, marginTop: '8px' }}
              />
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>gap: {gridConfig.gap}px</label>
            <input
              type="range"
              min={0}
              max={50}
              value={gridConfig.gap}
              onChange={e => onGridConfigChange('gap', parseInt(e.target.value))}
              style={styles.slider}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>justify-items</label>
            <select
              value={gridConfig.justifyItems}
              onChange={e => onGridConfigChange('justifyItems', e.target.value)}
              style={styles.select}
            >
              {ALIGN_OPTIONS.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>align-items</label>
            <select
              value={gridConfig.alignItems}
              onChange={e => onGridConfigChange('alignItems', e.target.value)}
              style={styles.select}
            >
              {ALIGN_OPTIONS.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.itemsSection}>
          <h3 style={styles.sectionTitle}>子项属性</h3>
          {selectedItem === null ? (
            <p style={styles.hint}>点击预览区中的子元素以编辑其属性</p>
          ) : selectedItemConfig ? (
            <>
              <p style={styles.selectedInfo}>已选中: 子项 #{selectedItem + 1}</p>

              <div style={styles.field}>
                <label style={styles.label}>grid-column</label>
                <input
                  type="text"
                  value={selectedItemConfig.gridColumn}
                  onChange={e => onItemConfigChange(selectedItem, 'gridColumn', e.target.value)}
                  placeholder="例如: 1 / 3"
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>grid-row</label>
                <input
                  type="text"
                  value={selectedItemConfig.gridRow}
                  onChange={e => onItemConfigChange(selectedItem, 'gridRow', e.target.value)}
                  placeholder="例如: 1 / 2"
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>justify-self</label>
                <select
                  value={selectedItemConfig.justifySelf}
                  onChange={e => onItemConfigChange(selectedItem, 'justifySelf', e.target.value)}
                  style={styles.select}
                >
                  {ALIGN_OPTIONS.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>align-self</label>
                <select
                  value={selectedItemConfig.alignSelf}
                  onChange={e => onItemConfigChange(selectedItem, 'alignSelf', e.target.value)}
                  style={styles.select}
                >
                  {ALIGN_OPTIONS.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </>
          ) : null}
        </div>

        <div style={styles.codeSection}>
          <div style={styles.codeHeader}>
            <span style={styles.codeTitle}>CSS 代码（容器）</span>
            <button onClick={handleCopy} style={styles.copyButton}>
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <pre style={styles.codeBlock}>
            <code>{cssCode}</code>
          </pre>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    backgroundColor: '#ffffff',
    boxShadow: '2px 0 12px rgba(0, 0, 0, 0.1)',
    padding: '20px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  toggleButton: {
    position: 'fixed',
    padding: '10px 18px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
    transition: 'all 0.2s ease'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '4px'
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0
  },
  resetButton: {
    padding: '10px 16px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'background-color 0.2s'
  },
  containerSection: {
    backgroundColor: '#f5f5f5',
    borderRadius: '10px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  itemsSection: {
    backgroundColor: '#f5f5f5',
    borderRadius: '10px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    flex: 1,
    minHeight: '120px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    margin: 0,
    marginBottom: '4px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#4b5563'
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    backgroundColor: '#ffffff',
    outline: 'none',
    cursor: 'pointer'
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    backgroundColor: '#ffffff',
    outline: 'none'
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    backgroundColor: '#e5e7eb',
    outline: 'none',
    cursor: 'pointer',
    accentColor: '#4f46e5'
  },
  hint: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
    fontStyle: 'italic'
  },
  selectedInfo: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#4f46e5',
    margin: 0
  },
  codeSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px'
  },
  codeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  codeTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151'
  },
  copyButton: {
    padding: '5px 12px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    minWidth: '60px'
  },
  codeBlock: {
    backgroundColor: '#2d2d2d',
    color: '#b5cea8',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    fontSize: '12px',
    padding: '14px',
    borderRadius: '8px',
    margin: 0,
    overflowX: 'auto',
    lineHeight: 1.6
  }
};
