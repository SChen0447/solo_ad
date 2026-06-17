import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioAnalyzer, type AudioAnalysisData } from './AudioAnalyzer';
import { ParticleSystem, type VisualizationMode } from './ParticleSystem';
import { ModeSelector } from './ModeSelector';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
  const lastAnalysisRef = useRef<AudioAnalysisData | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<VisualizationMode>('waveform');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0a2e');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      canvasContainerRef.current.clientWidth / canvasContainerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canvasContainerRef.current.clientWidth, canvasContainerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvasContainerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controlsRef.current = controls;

    const particleSystem = new ParticleSystem(scene, { particleCount: 6000, sphereRadius: 5 });
    particleSystemRef.current = particleSystem;

    const animate = () => {
      const deltaTime = clockRef.current.getDelta();
      controls.update();

      if (lastAnalysisRef.current && audioAnalyzerRef.current?.isPlaying) {
        particleSystem.update(lastAnalysisRef.current, deltaTime);
      } else {
        particleSystem.idleUpdate(deltaTime);
      }

      renderer.render(scene, camera);
      rafIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!canvasContainerRef.current || !camera || !renderer) return;
      const w = canvasContainerRef.current.clientWidth;
      const h = canvasContainerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      particleSystem.dispose();
      controls.dispose();
      renderer.dispose();
      if (canvasContainerRef.current && renderer.domElement.parentNode === canvasContainerRef.current) {
        canvasContainerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setMode(mode);
    }
  }, [mode]);

  const handleAnalysis = useCallback((data: AudioAnalysisData) => {
    lastAnalysisRef.current = data;
  }, []);

  const ensureAnalyzer = () => {
    if (!audioAnalyzerRef.current) {
      audioAnalyzerRef.current = new AudioAnalyzer(handleAnalysis);
    }
    return audioAnalyzerRef.current;
  };

  const handleFile = useCallback(async (file: File) => {
    setError('');
    try {
      const analyzer = ensureAnalyzer();
      await analyzer.loadFile(file);
      setFileName(file.name);
      setIsPlaying(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load audio file';
      setError(message);
      setFileName('');
      setIsPlaying(false);
    }
  }, [handleAnalysis]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const togglePlay = () => {
    if (!audioAnalyzerRef.current) return;
    if (audioAnalyzerRef.current.isPlaying) {
      audioAnalyzerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioAnalyzerRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.title}>
        <span style={styles.titleText}>3D Music Visualizer</span>
      </div>

      <div ref={canvasContainerRef} style={styles.canvasContainer} />

      <div style={styles.bottomBar}>
        <div style={styles.bottomContent}>
          <div
            style={{
              ...styles.uploadArea,
              ...(isDragOver ? styles.uploadAreaActive : {}),
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"
              style={{ display: 'none' }}
              onChange={handleInputChange}
            />
            {fileName ? (
              <div style={styles.fileInfo}>
                <span style={styles.fileName}>{fileName}</span>
                <button onClick={togglePlay} style={styles.playButton}>
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
              </div>
            ) : (
              <div onClick={handleUploadClick} style={styles.uploadPrompt}>
                <div style={styles.uploadIcon}>♪</div>
                <div style={styles.uploadText}>
                  <div style={styles.uploadTitle}>Drop audio file here or click to upload</div>
                  <div style={styles.uploadHint}>Supports MP3, WAV, OGG (max 30MB)</div>
                </div>
              </div>
            )}
            {error && <div style={styles.errorText}>{error}</div>}
          </div>

          <ModeSelector currentMode={mode} onModeChange={setMode} />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#0a0a2e',
    color: '#cccccc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden',
  },
  title: {
    position: 'fixed',
    top: '20px',
    left: '20px',
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: '10px 20px',
    borderRadius: '8px',
  },
  titleText: {
    fontSize: '18px',
    color: '#ffffff',
    letterSpacing: '2px',
    fontWeight: 600,
  },
  canvasContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  bottomBar: {
    position: 'fixed',
    bottom: '20px',
    left: 0,
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    zIndex: 10,
    pointerEvents: 'none',
  },
  bottomContent: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '32px',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: '20px 32px',
    borderRadius: '16px',
    backdropFilter: 'blur(10px)',
    pointerEvents: 'auto',
    maxWidth: '95vw',
  },
  uploadArea: {
    width: '400px',
    height: '200px',
    border: '2px dashed rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    padding: '16px',
    boxSizing: 'border-box',
  },
  uploadAreaActive: {
    border: '2px solid #00e5ff',
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
  },
  uploadPrompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  uploadIcon: {
    fontSize: '48px',
    color: '#00e5ff',
    lineHeight: 1,
  },
  uploadText: {
    textAlign: 'center',
  },
  uploadTitle: {
    fontSize: '14px',
    color: '#ffffff',
    marginBottom: '4px',
  },
  uploadHint: {
    fontSize: '12px',
    color: '#888899',
  },
  fileInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  fileName: {
    fontSize: '14px',
    color: '#00e5ff',
    maxWidth: '360px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  playButton: {
    padding: '10px 24px',
    backgroundColor: '#00e5ff',
    color: '#0a0a2e',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  errorText: {
    fontSize: '12px',
    color: '#ff5555',
    marginTop: '8px',
    textAlign: 'center',
  },
};

const responsiveStyles = `
  @media (max-width: 768px) {
    div[style*="bottomContent"] {
      flex-direction: column !important;
      gap: 20px !important;
      padding: 16px 20px !important;
    }
    div[style*="uploadArea"] {
      width: 280px !important;
      height: 160px !important;
    }
    div[style*="uploadTitle"] {
      font-size: 12px !important;
    }
    div[style*="uploadHint"] {
      font-size: 11px !important;
    }
    div[style*="uploadIcon"] {
      font-size: 36px !important;
    }
    span[style*="titleText"] {
      font-size: 14px !important;
      letter-spacing: 1px !important;
    }
    div[style*="title"] {
      padding: 8px 14px !important;
      top: 12px !important;
      left: 12px !important;
    }
  }
`;

const styleEl = document.createElement('style');
styleEl.textContent = responsiveStyles;
document.head.appendChild(styleEl);
