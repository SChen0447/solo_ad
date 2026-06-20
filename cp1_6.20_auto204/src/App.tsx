import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Stats from 'stats.js';
import Scene from '@/components/Scene';
import InfoPanel from '@/components/InfoPanel';
import BoneList from '@/components/BoneList';
import { bones, getBoneById, groupCameraPositions, BoneData } from '@/utils/boneData';

const INITIAL_CAMERA_POSITION: [number, number, number] = [0, 3, 12];

function App() {
  const [selectedBone, setSelectedBone] = useState<string | null>(null);
  const [hoveredBone, setHoveredBone] = useState<string | null>(null);
  const [targetPosition, setTargetPosition] = useState<[number, number, number] | null>(null);
  const [flashingBone, setFlashingBone] = useState<string | null>(null);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showFlash, setShowFlash] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [quality, setQuality] = useState<'high' | 'low'>('high');

  const statsRef = useRef<Stats | null>(null);
  const sceneRef = useRef<any>(null);

  const selectedBoneData = selectedBone ? getBoneById(selectedBone) || null : null;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const stats = new Stats();
    stats.showPanel(0);
    stats.dom.style.position = 'fixed';
    stats.dom.style.right = '16px';
    stats.dom.style.top = '16px';
    stats.dom.style.left = 'auto';
    stats.dom.style.zIndex = '9999';
    document.body.appendChild(stats.dom);
    statsRef.current = stats;

    let animationId: number;
    const animate = () => {
      stats.begin();
      stats.end();
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      if (stats.dom.parentNode) {
        stats.dom.parentNode.removeChild(stats.dom);
      }
    };
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1280);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isCompareMode) {
      setQuality('low');
    } else {
      setQuality('high');
    }
  }, [isCompareMode]);

  const flashBone = useCallback((boneId: string) => {
    let count = 0;
    const maxFlashes = 4;

    const doFlash = () => {
      if (count >= maxFlashes) {
        setFlashingBone(null);
        return;
      }

      setFlashingBone((prev) => (prev === boneId ? null : boneId));
      count++;
      setTimeout(doFlash, 150);
    };

    doFlash();
  }, []);

  const handleBoneSelect = useCallback(
    (boneId: string) => {
      setSelectedBone(boneId);
      const bone = getBoneById(boneId);
      if (bone) {
        const targetPos: [number, number, number] = [
          bone.position[0],
          bone.position[1],
          bone.position[2],
        ];
        setTargetPosition(targetPos);
        flashBone(boneId);
      }
    },
    [flashBone]
  );

  const handleBoneClick = useCallback(
    (boneId: string) => {
      handleBoneSelect(boneId);
    },
    [handleBoneSelect]
  );

  const handleBoneHover = useCallback((boneId: string | null) => {
    setHoveredBone(boneId);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedBone(null);
  }, []);

  const handleResetView = useCallback(() => {
    setTargetPosition([0, 1, 0]);
    setSelectedBone(null);
  }, []);

  const handleGroupView = useCallback(
    (group: 'head' | 'torso' | 'forelimb' | 'hindlimb') => {
      const pos = groupCameraPositions[group];
      setTargetPosition(pos);
      setSelectedBone(null);
    },
    []
  );

  const handleScreenshot = useCallback(() => {
    setShowFlash(true);
    
    setTimeout(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `screenshot_${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
      setShowFlash(false);
    }, 500);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case '1':
          handleGroupView('head');
          break;
        case '2':
          handleGroupView('torso');
          break;
        case '3':
          handleGroupView('forelimb');
          break;
        case '4':
          handleGroupView('hindlimb');
          break;
        case 'r':
          handleResetView();
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
          }
          handleScreenshot();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGroupView, handleResetView, handleScreenshot]);

  const toggleCompareMode = useCallback(() => {
    setIsCompareMode((prev) => !prev);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#121212',
      }}
    >
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: '#0B0B2B',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
          >
            <div style={{ width: '200px', height: '200px', marginBottom: '24px' }}>
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="boneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D2C8B0" />
                    <stop offset="100%" stopColor="#A09080" />
                  </linearGradient>
                </defs>
                <g fill="url(#boneGrad)">
                  <motion.rect
                    x="90"
                    y="30"
                    width="20"
                    height="140"
                    rx="10"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 2, ease: 'easeInOut' }}
                    style={{ transformOrigin: 'center top' }}
                  />
                  <motion.circle
                    cx="100"
                    cy="30"
                    r="18"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  />
                  <motion.rect
                    x="50"
                    y="80"
                    width="15"
                    height="50"
                    rx="7"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    style={{ transformOrigin: 'top' }}
                  />
                  <motion.rect
                    x="135"
                    y="80"
                    width="15"
                    height="50"
                    rx="7"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.7, duration: 1 }}
                    style={{ transformOrigin: 'top' }}
                  />
                  <motion.rect
                    x="70"
                    y="160"
                    width="15"
                    height="30"
                    rx="7"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 1.2, duration: 0.8 }}
                    style={{ transformOrigin: 'top' }}
                  />
                  <motion.rect
                    x="115"
                    y="160"
                    width="15"
                    height="30"
                    rx="7"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 1.4, duration: 0.8 }}
                    style={{ transformOrigin: 'top' }}
                  />
                </g>
              </svg>
            </div>
            <h2
              style={{
                color: '#F0E6D3',
                fontSize: '22px',
                fontFamily: "'Times New Roman', Georgia, serif",
                fontWeight: 'normal',
                marginBottom: '8px',
              }}
            >
              古生物骨骼化石展示
            </h2>
            <p
              style={{
                color: '#A0C4E8',
                fontSize: '13px',
                fontStyle: 'italic',
              }}
            >
              正在加载霸王龙骨架...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <Scene
        ref={sceneRef}
        selectedBone={selectedBone}
        hoveredBone={hoveredBone}
        onBoneHover={handleBoneHover}
        onBoneClick={handleBoneClick}
        targetPosition={targetPosition}
        flashingBone={flashingBone}
        isCompareMode={isCompareMode}
        quality={quality}
      />

      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '12px',
          zIndex: 800,
        }}
      >
        <button
          onClick={toggleCompareMode}
          title="对比模式"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            background: isCompareMode ? '#E8A87C' : '#5A4A3A',
            color: '#F0E6D3',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease-in-out',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
          onMouseEnter={(e) => {
            if (!isCompareMode) {
              e.currentTarget.style.background = '#6A5A4A';
            }
          }}
          onMouseLeave={(e) => {
            if (!isCompareMode) {
              e.currentTarget.style.background = '#5A4A3A';
            }
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="12" r="7" opacity="0.6" />
            <circle cx="15" cy="12" r="7" />
          </svg>
        </button>

        <button
          onClick={handleResetView}
          title="复位视角 (R)"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            background: '#5A4A3A',
            color: '#F0E6D3',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease-in-out',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#6A5A4A';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#5A4A3A';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6" />
            <path d="M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
        </button>

        <button
          onClick={handleScreenshot}
          title="截图 (S)"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            background: '#5A4A3A',
            color: '#F0E6D3',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease-in-out',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#6A5A4A';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#5A4A3A';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="13" r="8" />
            <circle cx="12" cy="13" r="3" />
            <line x1="3" y1="9" x2="8" y2="9" />
            <line x1="21" y1="9" x2="16" y2="9" />
          </svg>
        </button>
      </div>

      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '70px',
          display: 'flex',
          gap: '6px',
          zIndex: 800,
        }}
      >
        {['1', '2', '3', '4'].map((num, index) => {
          const groups: Array<'head' | 'torso' | 'forelimb' | 'hindlimb'> = ['head', 'torso', 'forelimb', 'hindlimb'];
          const labels = ['头部', '躯干', '前肢', '后肢'];
          return (
            <button
              key={num}
              onClick={() => handleGroupView(groups[index])}
              title={`切换到${labels[index]}视角 (${num})`}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(90, 74, 58, 0.8)',
                color: '#F0E6D3',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: "'Times New Roman', Georgia, serif",
                transition: 'all 0.3s ease-in-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(106, 90, 74, 0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(90, 74, 58, 0.8)';
              }}
            >
              {num} {labels[index]}
            </button>
          );
        })}
      </div>

      <BoneList
        selectedBone={selectedBone}
        onBoneSelect={handleBoneSelect}
        isMobile={isMobile}
      />

      {!isMobile && (
        <InfoPanel bone={selectedBoneData} onClose={handleClosePanel} />
      )}

      {isMobile && selectedBoneData && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            position: 'fixed',
            bottom: '0',
            left: '0',
            right: '0',
            maxHeight: '60vh',
            overflowY: 'auto',
            background: 'rgba(20, 20, 30, 0.95)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px 16px 0 0',
            zIndex: 950,
          }}
        >
          <div
            style={{
              width: '40px',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '2px',
              margin: '10px auto',
            }}
          />
          <div style={{ padding: '0 20px 20px 20px' }}>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#F0E6D3',
                margin: 0,
                marginBottom: '4px',
              }}
            >
              {selectedBoneData.name}
            </h2>
            <p
              style={{
                fontSize: '13px',
                fontStyle: 'italic',
                color: '#A0C4E8',
                margin: 0,
                marginBottom: '12px',
              }}
            >
              {selectedBoneData.latinName}
            </p>
            <div
              style={{
                fontSize: '11px',
                fontStyle: 'italic',
                color: '#A0C4E8',
                marginBottom: '12px',
              }}
            >
              发现于 {selectedBoneData.discoveryYear} 年 · {selectedBoneData.discoverer}
            </div>
            <p
              style={{
                fontSize: '14px',
                color: '#F0E6D3',
                lineHeight: '1.6',
                margin: 0,
                marginBottom: '12px',
              }}
            >
              {selectedBoneData.description}
            </p>
            <button
              onClick={handleClosePanel}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 160, 122, 0.2)',
                color: '#FFA07A',
                fontSize: '14px',
                cursor: 'pointer',
                fontFamily: "'Times New Roman', Georgia, serif",
              }}
            >
              关闭
            </button>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'white',
              zIndex: 10000,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      <div
        style={{
          position: 'fixed',
          bottom: '12px',
          right: '16px',
          fontSize: '10px',
          color: 'rgba(255, 255, 255, 0.3)',
          zIndex: 500,
          fontFamily: "'Times New Roman', Georgia, serif",
        }}
      >
        © 2024 古生物骨骼化石展示 · Tyrannosaurus Rex
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.4)',
          zIndex: 500,
          fontFamily: "'Times New Roman', Georgia, serif",
          textAlign: 'center',
        }}
      >
        快捷键：1-4 切换视角 · R 复位 · S 截图 · 点击骨骼查看详情
      </div>
    </div>
  );
}

export default App;
