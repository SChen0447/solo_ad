import React, { useEffect } from 'react';
import { EditorPanel } from './modules/editor/EditorPanel';
import { PreviewPanel } from './modules/preview/PreviewPanel';
import { useLyricStore } from './store';
import { synthEngine } from './modules/audio/SynthEngine';

const App: React.FC = () => {
  const lines = useLyricStore((s) => s.lines);
  const resynth = useLyricStore((s) => s.resynth);

  useEffect(() => {
    (window as any).__lyricLines = lines;
  }, [lines]);

  useEffect(() => {
    if (lines.length > 0) {
      const hasAny = lines.some((l) => l.words.length > 0);
      if (hasAny) {
        const t = setTimeout(() => resynth(), 50);
        return () => clearTimeout(t);
      }
    }
  }, []);

  return (
    <>
      <div className="lf-app-header">
        <h1>◆ LyricForge</h1>
        <span style={{ fontSize: 12, color: '#8a8ab8' }}>可视化歌词编辑与混音预览</span>
      </div>
      <div className="lf-app">
        <EditorPanel />
        <PreviewPanel />
      </div>
    </>
  );
};

export default App;
