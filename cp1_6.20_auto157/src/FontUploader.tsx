import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontItem } from './types';

interface FontUploaderProps {
  fonts: FontItem[];
  onFontAdd: (font: FontItem) => void;
  onFontDelete: (fontId: string) => void;
}

const ACCEPTED_FORMATS = ['.ttf', '.otf', '.woff', '.woff2'];

function FontUploader({ fonts, onFontAdd, onFontDelete }: FontUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleSheetRef = useRef<CSSStyleSheet | null>(null);

  useEffect(() => {
    const style = document.createElement('style');
    document.head.appendChild(style);
    styleSheetRef.current = style.sheet;
    return () => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  const getFontFormat = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ext;
  };

  const getCssFontFormat = (format: string): string => {
    switch (format) {
      case 'ttf': return 'truetype';
      case 'otf': return 'opentype';
      case 'woff': return 'woff';
      case 'woff2': return 'woff2';
      default: return format;
    }
  };

  const extractFontName = (fileName: string): string => {
    return fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  };

  const addFontFace = useCallback((font: FontItem) => {
    if (!styleSheetRef.current) return;
    const cssFormat = getCssFontFormat(font.format);
    const fontFaceRule = `
      @font-face {
        font-family: '${font.name}';
        src: url('${font.dataUrl}') format('${cssFormat}');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }
    `;
    styleSheetRef.current.insertRule(fontFaceRule, styleSheetRef.current.cssRules.length);
  }, []);

  const removeFontFace = useCallback((fontName: string) => {
    if (!styleSheetRef.current) return;
    const rules = styleSheetRef.current.cssRules;
    for (let i = rules.length - 1; i >= 0; i--) {
      const rule = rules[i] as CSSFontFaceRule;
      if (rule.style && rule.style.fontFamily === `'${fontName}'`) {
        styleSheetRef.current.deleteRule(i);
        break;
      }
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    const fileName = file.name;
    const ext = `.${fileName.split('.').pop()?.toLowerCase()}`;
    
    if (!ACCEPTED_FORMATS.includes(ext)) {
      alert('不支持的字体格式，请上传 TTF、OTF、WOFF 或 WOFF2 格式的文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const format = getFontFormat(fileName);
      const fontName = extractFontName(fileName);
      
      const font: FontItem = {
        id: `font-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: fontName,
        format,
        dataUrl,
        fileName,
      };
      
      addFontFace(font);
      onFontAdd(font);
    };
    reader.readAsDataURL(file);
  }, [addFontFace, onFontAdd]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => handleFile(file));
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => handleFile(file));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFile]);

  const handleDelete = useCallback((font: FontItem) => {
    removeFontFace(font.name);
    onFontDelete(font.id);
  }, [removeFontFace, onFontDelete]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.uploadArea,
          ...(isDragging ? styles.uploadAreaDragging : {}),
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          multiple
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
        <div style={styles.uploadIcon}>📁</div>
        <p style={styles.uploadText}>
          点击或拖拽字体文件到此处
        </p>
        <p style={styles.uploadHint}>
          支持 TTF、OTF、WOFF、WOFF2 格式
        </p>
      </div>

      <div style={styles.fontListTitle}>
        已上传字体 ({fonts.length})
      </div>

      <div style={styles.fontList}>
        <AnimatePresence>
          {fonts.map((font) => (
            <motion.div
              key={font.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              style={styles.fontItem}
              whileHover={{ backgroundColor: '#eef2ff' }}
            >
              <div style={styles.fontInfo}>
                <span style={styles.fontName} title={font.name}>
                  {font.name}
                </span>
                <span style={styles.formatTag}>
                  {font.format.toUpperCase()}
                </span>
              </div>
              <button
                style={styles.deleteButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(font);
                }}
                title="删除字体"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {fonts.length === 0 && (
          <p style={styles.emptyHint}>暂无字体，请上传</p>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
  },
  uploadArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    border: '2px solid #d1d5db',
    borderRadius: '12px',
    backgroundColor: '#fafafa',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    textAlign: 'center',
  },
  uploadAreaDragging: {
    borderStyle: 'dashed',
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  uploadIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  uploadText: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: 500,
    marginBottom: '4px',
  },
  uploadHint: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  fontListTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginTop: '16px',
    marginBottom: '8px',
  },
  fontList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fontItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  fontInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
    flex: 1,
  },
  fontName: {
    fontSize: '13px',
    color: '#1f2937',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  formatTag: {
    fontSize: '10px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 600,
    flexShrink: 0,
  },
  deleteButton: {
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
    transition: 'all 0.1s',
  },
  emptyHint: {
    fontSize: '13px',
    color: '#9ca3af',
    textAlign: 'center',
    padding: '20px 0',
  },
};

export default FontUploader;
