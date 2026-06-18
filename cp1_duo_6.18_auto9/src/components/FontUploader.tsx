import React, { useState, useRef, useCallback } from 'react';
import { FontLoader } from '../FontLoader';
import { useAppStore } from '../store';
import { PRESET_FONTS } from '../types';

export const FontUploader: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentFont, setCurrentFont, setFontLoading, isFontLoading, fontLoadingProgress } = useAppStore();

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(woff|ttf)$/i)) {
      alert('请上传 .woff 或 .ttf 格式的字体文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('字体文件大小不能超过5MB');
      return;
    }

    try {
      setFontLoading(true, 0);
      const fontData = await FontLoader.loadFromFile(file, (progress) => {
        setFontLoading(true, progress);
      });
      setCurrentFont(fontData);
    } catch (error) {
      alert('字体加载失败: ' + (error as Error).message);
    } finally {
      setFontLoading(false, 0);
    }
  }, [setCurrentFont, setFontLoading]);

  const handlePresetSelect = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fontName = e.target.value;
    if (!fontName) return;

    const presetFont = PRESET_FONTS.find((f) => f.name === fontName);
    if (!presetFont) return;

    try {
      setFontLoading(true, 0);
      const fontData = await FontLoader.loadPresetFont(
        presetFont.name,
        presetFont.family,
        presetFont.url,
        (progress) => {
          setFontLoading(true, progress);
        }
      );
      setCurrentFont(fontData);
    } catch (error) {
      alert('字体加载失败: ' + (error as Error).message);
    } finally {
      setFontLoading(false, 0);
    }
  }, [setCurrentFont, setFontLoading]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFile]);

  return (
    <div style={styles.container}>
      <div style={styles.label}>字体选择</div>

      <select
        value={currentFont.isCustom ? '' : currentFont.name}
        onChange={handlePresetSelect}
        disabled={isFontLoading}
        style={styles.select}
      >
        <option value="">预设字体...</option>
        {PRESET_FONTS.map((font) => (
          <option key={font.name} value={font.name}>
            {font.name}
          </option>
        ))}
      </select>

      <div style={styles.divider}>或</div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{
          ...styles.dropZone,
          borderColor: isDragging ? '#4a90d9' : '#ccc',
          backgroundColor: isDragging ? '#e8f4fd' : '#f0f0f0',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".woff,.ttf"
          onChange={handleInputChange}
          style={styles.hiddenInput}
        />

        {isFontLoading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.progressCircle}>
              <svg width="48" height="48" viewBox="0 0 48 48">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#b3d4f5"
                  strokeWidth="4"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#4a90d9"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${fontLoadingProgress * 1.26} 126`}
                  transform="rotate(-90 24 24)"
                  style={{ transition: 'stroke-dasharray 0.2s ease' }}
                />
              </svg>
              <span style={styles.progressText}>{fontLoadingProgress}%</span>
            </div>
            <span style={styles.loadingText}>正在加载字体...</span>
          </div>
        ) : (
          <>
            <div style={styles.uploadIcon}>📁</div>
            <div style={styles.uploadText}>
              {isDragging ? '释放以上传字体' : '点击或拖拽字体文件到此处'}
            </div>
            <div style={styles.uploadHint}>支持 .woff, .ttf 格式 (最大 5MB)</div>
          </>
        )}
      </div>

      {currentFont.name && (
        <div style={styles.currentFont}>
          <span style={styles.currentFontLabel}>当前字体:</span>
          <span style={styles.currentFontName}>{currentFont.name}</span>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '4px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  divider: {
    textAlign: 'center',
    color: '#999',
    fontSize: '12px',
    position: 'relative',
  },
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '32px 20px',
    border: '2px dashed #ccc',
    borderRadius: '8px',
    backgroundColor: '#f0f0f0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
  },
  hiddenInput: {
    display: 'none',
  },
  uploadIcon: {
    fontSize: '32px',
  },
  uploadText: {
    fontSize: '14px',
    color: '#666',
    fontWeight: 500,
  },
  uploadHint: {
    fontSize: '12px',
    color: '#999',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  progressCircle: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    position: 'absolute',
    fontSize: '12px',
    fontWeight: 600,
    color: '#4a90d9',
  },
  loadingText: {
    fontSize: '13px',
    color: '#666',
  },
  currentFont: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  },
  currentFontLabel: {
    fontSize: '13px',
    color: '#666',
  },
  currentFontName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#4a90d9',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
