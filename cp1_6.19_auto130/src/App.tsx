import { useRef, useState, useCallback } from 'react';
import { AppProvider, useAppStore } from './stores/appStore';
import ColorPalette from './components/ColorPalette';
import MoodBoard from './components/MoodBoard';
import {
  extractColors,
  generateAllPalettes,
  generateCSSVariables,
} from './utils/colorEngine';
import type { Color, Palette } from './types/colors';
import './App.css';

function ImageUploader() {
  const { state, setExtractedColors, setIsExtracting, setPalettes, addToHistory } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
        alert('请上传 JPG 或 PNG 格式的图片');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过 5MB');
        return;
      }

      setIsExtracting(true);

      try {
        const colors = await extractColors(file, 5);
        setExtractedColors(colors);

        if (colors.length > 0) {
          const palettes = generateAllPalettes(colors[0].hex);
          setPalettes(palettes);
          palettes.forEach((p) => addToHistory(p));
        }
      } catch (error) {
        console.error('颜色提取失败:', error);
        alert('颜色提取失败，请重试');
      } finally {
        setIsExtracting(false);
      }
    },
    [setExtractedColors, setIsExtracting, setPalettes, addToHistory]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div
      className={`image-uploader ${isDragging ? 'dragging' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      {state.isExtracting ? (
        <div className="loading-state">
          <div className="color-ring-loader" />
          <p>正在提取主色调...</p>
        </div>
      ) : (
        <>
          <div className="upload-icon">📷</div>
          <p className="upload-title">拖拽或点击上传图片</p>
          <p className="upload-hint">支持 JPG / PNG 格式，最大 5MB</p>
        </>
      )}

      {state.extractedColors.length > 0 && !state.isExtracting && (
        <div className="extracted-colors">
          <p className="extracted-title">提取的主色调</p>
          <div className="color-circles">
            {state.extractedColors.map((color, index) => (
              <div
                key={index}
                className="color-circle"
                style={{ backgroundColor: color.hex, animationDelay: `${index * 0.1}s` }}
                title={`${color.name} - ${color.hex}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('color/hex', color.hex);
                  e.dataTransfer.setData('color/name', color.name);
                }}
              >
                <span className="color-circle-name">{color.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryPanel() {
  const { state, toggleHistory, setPalettes, setCurrentPalette, clearHistory } = useAppStore();

  const handleHistoryClick = (palette: Palette) => {
    const allPalettes = generateAllPalettes(palette.primary.hex);
    setPalettes(allPalettes);
    setCurrentPalette(allPalettes[0]);
  };

  return (
    <>
      <button
        className={`history-toggle ${state.isHistoryOpen ? 'open' : ''}`}
        onClick={toggleHistory}
        title={state.isHistoryOpen ? '收起历史' : '查看历史'}
      >
        {state.isHistoryOpen ? '◀' : '▶'}
      </button>

      <div className={`history-panel ${state.isHistoryOpen ? 'open' : ''}`}>
        <div className="history-header">
          <h3>历史记录</h3>
          <button className="clear-btn" onClick={clearHistory} title="清空历史">
            清空
          </button>
        </div>

        <div className="history-list">
          {state.history.length === 0 ? (
            <p className="empty-history">暂无历史记录</p>
          ) : (
            state.history.map((item) => (
              <div
                key={item.id}
                className="history-item"
                onClick={() => handleHistoryClick(item.palette)}
              >
                <div className="history-colors">
                  {item.palette.colors.slice(0, 5).map((color, idx) => (
                    <div
                      key={idx}
                      className="history-color-dot"
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
                <span className="history-name">{item.palette.name}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>🎨 配色灵感板</h1>
        <p className="tagline">Color Mood Board</p>
      </div>

      <ImageUploader />

      <HistoryPanel />
    </aside>
  );
}

function MainContent() {
  const { state, addItemToMoodBoard, createColorItem } = useAppStore();

  const handleColorChange = (color: Color) => {
    // 颜色变化时重新生成配色方案
    // 这里可以实现更复杂的逻辑
    console.log('Color changed:', color);
  };

  const handleDropColor = (color: Color, boardId: string) => {
    const item = createColorItem(color, 50, 50);
    addItemToMoodBoard(boardId, item);
  };

  return (
    <main className="main-content">
      <div className="content-area">
        <ColorPalette
          palettes={state.palettes}
          onColorChange={handleColorChange}
          onPaletteSelect={(p) => console.log('Selected palette:', p)}
        />
      </div>
      <div className="board-area">
        <MoodBoard onDropColor={handleDropColor} />
      </div>
    </main>
  );
}

function AppContent() {
  return (
    <div className="app">
      <Sidebar />
      <MainContent />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
