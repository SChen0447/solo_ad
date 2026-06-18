import React, { useState, useEffect } from 'react';
import { Monitor, Image, Home } from 'lucide-react';
import { useColorStore } from '../store/colorStore';
import { getContrastColor } from '../utils/colorUtils';
import type { SceneMode, Swatch } from '../types';

interface SceneProps {
  swatches: Swatch[];
}

const WebPreview: React.FC<SceneProps> = ({ swatches }) => {
  const getSwatch = (name: string) => swatches.find(s => s.name === name);
  const primary = getSwatch('primary');
  const primaryDark = getSwatch('primary-dark');
  const primaryLight = getSwatch('primary-light');
  const accent = getSwatch('accent');
  const background = getSwatch('background');

  if (!primary || !primaryDark || !primaryLight || !accent || !background) return null;

  return (
    <div
      className="w-full h-full rounded-xl overflow-hidden shadow-lg"
      style={{ backgroundColor: background.hex }}
    >
      <div
        className="px-6 py-3 flex items-center justify-between border-b"
        style={{ borderColor: primaryLight.hex }}
      >
        <div
          className="font-bold text-lg"
          style={{ color: primary.hex, fontFamily: "'Playfair Display', serif" }}
        >
          ColorStudio
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <span style={{ color: primaryDark.hex }}>首页</span>
          <span style={{ color: primaryLight.hex }}>作品</span>
          <span style={{ color: primaryLight.hex }}>关于</span>
        </div>
        <button
          className="px-4 py-1.5 rounded-full text-sm font-medium transition-transform hover:scale-105"
          style={{ backgroundColor: accent.hex, color: getContrastColor(accent.hex) }}
        >
          开始探索
        </button>
      </div>

      <div className="p-8 text-center">
        <h1
          className="text-4xl font-bold mb-4"
          style={{ color: primary.hex, fontFamily: "'Playfair Display', serif" }}
        >
          发现色彩的无限可能
        </h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto text-sm">
          通过直观的交互式色盘，探索专业级配色方案，让设计更加出色
        </p>

        <div className="flex gap-3 justify-center mb-10">
          <button
            className="px-6 py-2.5 rounded-full font-medium transition-transform hover:scale-105 shadow-lg"
            style={{ backgroundColor: primary.hex, color: getContrastColor(primary.hex) }}
          >
            免费开始
          </button>
          <button
            className="px-6 py-2.5 rounded-full font-medium border-2 transition-transform hover:scale-105"
            style={{ borderColor: primaryLight.hex, color: primary.hex, backgroundColor: 'transparent' }}
          >
            了解更多
          </button>
        </div>

        <div className="flex justify-center gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-28 h-36 rounded-xl p-3 text-left"
              style={{
                backgroundColor: 'white',
                border: `2px solid ${i === 1 ? primary.hex : primaryLight.hex}40`,
              }}
            >
              <div
                className="w-8 h-8 rounded-lg mb-2"
                style={{ backgroundColor: i === 1 ? primary.hex : i === 2 ? accent.hex : primaryLight.hex }}
              />
              <p className="text-xs font-bold mb-1" style={{ color: primaryDark.hex }}>特性 {i}</p>
              <p className="text-xs" style={{ color: primaryLight.hex }}>专业功能</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PosterPreview: React.FC<SceneProps> = ({ swatches }) => {
  const getSwatch = (name: string) => swatches.find(s => s.name === name);
  const primary = getSwatch('primary');
  const primaryDark = getSwatch('primary-dark');
  const primaryLight = getSwatch('primary-light');
  const accent = getSwatch('accent');

  if (!primary || !primaryDark || !primaryLight || !accent) return null;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-lg bg-white flex items-center justify-center p-4">
      <div
        className="relative bg-white shadow-2xl"
        style={{ width: '210px', height: '297px' }}
      >
        <div className="absolute top-8 left-6 right-6">
          <p className="text-xs tracking-widest mb-2" style={{ color: primaryLight.hex }}>
            DESIGN EXHIBITION
          </p>
          <h1
            className="text-2xl font-bold leading-tight mb-1"
            style={{ color: primaryDark.hex, fontFamily: "'Playfair Display', serif" }}
          >
            色彩的
          </h1>
          <h1
            className="text-2xl font-bold leading-tight italic"
            style={{ color: primary.hex, fontFamily: "'Playfair Display', serif" }}
          >
            艺术表达
          </h1>
        </div>

        <div className="absolute top-32 left-6 right-6">
          <div
            className="w-16 h-16 rounded-full absolute"
            style={{ backgroundColor: primary.hex, right: 0, top: 0 }}
          />
          <div
            className="absolute"
            style={{
              left: 0,
              top: 30,
              width: 0,
              height: 0,
              borderLeft: '20px solid transparent',
              borderRight: '20px solid transparent',
              borderBottom: `35px solid ${accent.hex}`,
            }}
          />
          <div
            className="w-10 h-10 absolute"
            style={{ backgroundColor: primaryLight.hex, left: '50%', top: 60 }}
          />
        </div>

        <div className="absolute bottom-8 left-6 right-6">
          <div className="h-0.5 mb-3" style={{ backgroundColor: primary.hex }} />
          <p className="text-xs" style={{ color: primaryDark.hex }}>
            2026.06.18 — 2026.08.30
          </p>
          <p className="text-xs mt-1" style={{ color: primaryLight.hex }}>
            当代艺术中心 · 上海
          </p>
        </div>
      </div>
    </div>
  );
};

const InteriorPreview: React.FC<SceneProps> = ({ swatches }) => {
  const getSwatch = (name: string) => swatches.find(s => s.name === name);
  const primary = getSwatch('primary');
  const primaryDark = getSwatch('primary-dark');
  const primaryLight = getSwatch('primary-light');
  const accent = getSwatch('accent');
  const background = getSwatch('background');

  if (!primary || !primaryDark || !primaryLight || !accent || !background) return null;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-lg bg-gray-100 flex items-center justify-center p-4">
      <svg viewBox="0 0 400 300" className="w-full h-full" style={{ maxWidth: '500px' }}>
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15" />
          </filter>
        </defs>

        <polygon
          points="50,50 350,50 380,270 20,270"
          fill={background.hex}
          stroke={primaryLight.hex}
          strokeWidth="2"
          filter="url(#shadow)"
        />

        <polygon points="50,50 350,50 350,70 50,70" fill={primary.hex} opacity="0.3" />
        <polygon points="350,50 380,270 360,270 330,70" fill={primary.hex} opacity="0.2" />
        <polygon points="50,50 20,270 40,270 70,70" fill={primary.hex} opacity="0.15" />

        <rect x="100" y="180" width="120" height="60" rx="8" fill={primary.hex} filter="url(#shadow)" />
        <rect x="110" y="165" width="100" height="25" rx="4" fill={primaryDark.hex} opacity="0.7" />
        <rect x="125" y="195" width="35" height="30" rx="4" fill={primaryLight.hex} opacity="0.5" />
        <rect x="170" y="195" width="35" height="30" rx="4" fill={primaryLight.hex} opacity="0.5" />

        <rect x="250" y="210" width="60" height="35" rx="6" fill={primaryDark.hex} filter="url(#shadow)" />
        <circle cx="280" cy="195" r="8" fill={accent.hex} />

        <rect x="60" y="120" width="40" height="60" rx="2" fill="white" stroke={primaryLight.hex} strokeWidth="2" />
        <line x1="80" y1="120" x2="80" y2="180" stroke={primaryLight.hex} strokeWidth="1" />
        <line x1="60" y1="150" x2="100" y2="150" stroke={primaryLight.hex} strokeWidth="1" />

        <rect x="280" y="120" width="8" height="80" rx="4" fill={primaryDark.hex} />
        <circle cx="284" cy="115" r="12" fill={accent.hex} />

        <rect x="160" y="90" width="60" height="45" rx="4" fill="white" stroke={primaryLight.hex} strokeWidth="2" filter="url(#shadow)" />
        <rect x="168" y="98" width="44" height="29" fill={accent.hex} opacity="0.6" />

        <circle cx="320" cy="240" r="10" fill={primaryLight.hex} />
        <circle cx="80" cy="250" r="8" fill={accent.hex} />

        <text x="200" y="25" textAnchor="middle" fontSize="10" fill={primaryDark.hex} fontFamily="Satoshi, sans-serif">
          客厅俯视图
        </text>
      </svg>
    </div>
  );
};

const ScenePreview: React.FC = () => {
  const swatches = useColorStore(state => state.swatches);
  const sceneMode = useColorStore(state => state.sceneMode);
  const setSceneMode = useColorStore(state => state.setSceneMode);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayMode, setDisplayMode] = useState<SceneMode>(sceneMode);

  const modes: { id: SceneMode; label: string; icon: React.ReactNode }[] = [
    { id: 'web', label: '网页 UI', icon: <Monitor size={16} /> },
    { id: 'poster', label: '海报', icon: <Image size={16} /> },
    { id: 'interior', label: '室内', icon: <Home size={16} /> },
  ];

  useEffect(() => {
    if (sceneMode !== displayMode) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayMode(sceneMode);
        setIsTransitioning(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [sceneMode, displayMode]);

  const handleModeChange = (mode: SceneMode) => {
    if (mode !== sceneMode) {
      setSceneMode(mode);
    }
  };

  const renderScene = () => {
    const props = { swatches };
    switch (displayMode) {
      case 'web': return <WebPreview {...props} />;
      case 'poster': return <PosterPreview {...props} />;
      case 'interior': return <InteriorPreview {...props} />;
      default: return <WebPreview {...props} />;
    }
  };

  return (
    <div className="px-4 pb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center" style={{ fontFamily: "'Playfair Display', serif" }}>
        场景预览
      </h2>

      <div className="flex justify-center gap-1 mb-6">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => handleModeChange(mode.id)}
            className="relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300"
            style={{
              color: sceneMode === mode.id ? '#1A1A1A' : '#9CA3AF',
            }}
          >
            {mode.icon}
            <span>{mode.label}</span>
            {sceneMode === mode.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full origin-left"
                style={{
                  backgroundColor: '#1A1A1A',
                  animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            )}
          </button>
        ))}
      </div>

      <div
        className="max-w-3xl mx-auto rounded-2xl overflow-hidden backdrop-blur-xl bg-white/40 border border-gray-200/50 p-4"
        style={{ height: '400px' }}
      >
        <div
          className="w-full h-full transition-opacity duration-600 ease-in-out"
          style={{
            opacity: isTransitioning ? 0 : 1,
            willChange: 'opacity',
          }}
        >
          {renderScene()}
        </div>
      </div>
    </div>
  );
};

export default ScenePreview;
