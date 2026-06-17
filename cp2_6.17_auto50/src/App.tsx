import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioAnalyzer, type AudioAnalysisData } from './AudioAnalyzer';
import { ParticleSystem, type VisualizationMode } from './ParticleSystem';
import { ModeSelector } from './ModeSelector';
import './App.css';

const STAR_COUNT = 150;
const MAX_FILE_SIZE = 30 * 1024 * 1024;
const ACCEPTED_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'];

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const analysisDataRef = useRef<AudioAnalysisData | null>(null);

  const [fileName, setFileName] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<VisualizationMode>('pulse');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const initScene = useCallback(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a2e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 12;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.enablePan = true;
    controlsRef.current = controls;

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(STAR_COUNT * 3);

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i3 + 2] = radius * Math.cos(phi);
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.02,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    starsRef.current = stars;

    const particleSystem = new ParticleSystem(scene);
    particleSystemRef.current = particleSystem;

    clockRef.current = new THREE.Clock();

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const animate = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !controlsRef.current) return;
    if (!clockRef.current || !particleSystemRef.current) return;

    const deltaTime = clockRef.current.getDelta();

    if (starsRef.current) {
      starsRef.current.rotation.y += deltaTime * 0.02;
      starsRef.current.rotation.x += deltaTime * 0.01;
    }

    particleSystemRef.current.update(analysisDataRef.current, deltaTime);

    controlsRef.current.update();
    rendererRef.current.render(sceneRef.current, cameraRef.current);

    animationIdRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const cleanup = initScene();
    animate();

    return () => {
      if (cleanup) cleanup();
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (particleSystemRef.current) {
        particleSystemRef.current.dispose();
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      if (audioAnalyzerRef.current) {
        audioAnalyzerRef.current.cleanup();
      }
    };
  }, [initScene, animate]);

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setMode(mode);
    }
  }, [mode]);

  const handleAudioAnalyze = useCallback((data: AudioAnalysisData) => {
    analysisDataRef.current = data;
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!ACCEPTED_FORMATS.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg)$/i)) {
      alert('Please upload a valid audio file (MP3, WAV, OGG)');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert('File size must be less than 30MB');
      return;
    }

    setIsLoading(true);

    try {
      if (audioAnalyzerRef.current) {
        audioAnalyzerRef.current.cleanup();
      }

      const analyzer = new AudioAnalyzer(handleAudioAnalyze);
      audioAnalyzerRef.current = analyzer;

      analyzer.setOnEnded(() => {
        setIsPlaying(false);
      });

      await analyzer.loadFile(file);
      setFileName(file.name);
      setIsPlaying(false);
      analysisDataRef.current = null;
    } catch (error) {
      console.error('Error loading audio file:', error);
      alert('Failed to load audio file');
    } finally {
      setIsLoading(false);
    }
  }, [handleAudioAnalyze]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    e.target.value = '';
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const togglePlay = useCallback(() => {
    if (!audioAnalyzerRef.current) return;

    if (audioAnalyzerRef.current.getIsPlaying()) {
      audioAnalyzerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioAnalyzerRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const handleModeChange = useCallback((newMode: VisualizationMode) => {
    setMode(newMode);
  }, []);

  return (
    <div className="app">
      <div className="title-bar">
        <h1 className="app-title">3D Music Visualizer</h1>
      </div>

      <div ref={containerRef} className="canvas-container" />

      <div className="control-bar">
        <div className="upload-section">
          {!fileName ? (
            <div
              className={`upload-area ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <div className="upload-icon">♪</div>
              <p className="upload-text">Drag & drop audio file here</p>
              <p className="upload-subtext">or click to browse (MP3, WAV, OGG)</p>
              <input
                id="file-input"
                type="file"
                accept="audio/*"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="audio-player">
              <div className="audio-info">
                <span className="audio-icon">🎵</span>
                <span className="audio-name" title={fileName}>{fileName}</span>
              </div>
              <button
                className={`play-button ${isPlaying ? 'playing' : ''}`}
                onClick={togglePlay}
                disabled={isLoading}
              >
                {isLoading ? '...' : isPlaying ? '⏸' : '▶'}
              </button>
            </div>
          )}
        </div>

        <ModeSelector currentMode={mode} onModeChange={handleModeChange} />
      </div>
    </div>
  );
};

export default App;
