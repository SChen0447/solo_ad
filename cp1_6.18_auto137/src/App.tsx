import React, { useState, useEffect } from 'react';
import { useColorStore } from './store/colorStore';
import ColorWheel from './components/ColorWheel';
import SwatchPanel from './components/SwatchPanel';
import ScenePreview from './components/ScenePreview';
import BottomNav from './components/BottomNav';
import PresetList from './components/PresetList';

const App: React.FC = () => {
  const pageMode = useColorStore(state => state.pageMode);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayMode, setDisplayMode] = useState(pageMode);

  useEffect(() => {
    if (pageMode !== displayMode) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayMode(pageMode);
        setIsTransitioning(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pageMode, displayMode]);

  const renderPage = () => {
    switch (displayMode) {
      case 'wheel':
        return (
          <div className="min-h-screen flex flex-col justify-center pb-20">
            <header className="text-center pt-8 pb-4">
              <h1
                className="text-4xl font-bold text-gray-800"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                色彩色谱
              </h1>
              <p className="text-sm text-gray-400 mt-2">
                拖拽色环探索色彩 · 自动生成专业配色方案
              </p>
            </header>
            <ColorWheel />
          </div>
        );
      case 'scheme':
        return (
          <div className="min-h-screen pb-20">
            <header className="text-center pt-8 pb-2">
              <h1
                className="text-4xl font-bold text-gray-800"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                配色方案
              </h1>
              <p className="text-sm text-gray-400 mt-2">
                基于当前主色自动生成的协调配色
              </p>
            </header>
            <SwatchPanel />
            <ScenePreview />
          </div>
        );
      case 'preset':
        return (
          <div className="min-h-screen pb-20">
            <header className="text-center pt-8 pb-2">
              <h1
                className="text-4xl font-bold text-gray-800"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                预设配色
              </h1>
              <p className="text-sm text-gray-400 mt-2">
                精选经典色系，一键应用
              </p>
            </header>
            <PresetList />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div
        className="transition-opacity duration-300 ease-in-out"
        style={{
          opacity: isTransitioning ? 0 : 1,
          willChange: 'opacity',
        }}
      >
        {renderPage()}
      </div>
      <BottomNav />
    </div>
  );
};

export default App;
