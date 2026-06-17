import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';
import '@tensorflow/tfjs-backend-webgl';
import { GestureRecognizer, SpellType, HandLandmark, TrackPoint } from './GestureRecognizer';
import { SpellEffectManager, setupArena } from './SpellEffect';
import { UIOverlay, SpellIconState, SpellLogEntry, formatTime } from './UIOverlay';

const COOLDOWN_MS = 2000;
const CHARGE_MS = 300;

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [handLandmarks, setHandLandmarks] = useState<HandLandmark[] | null>(null);
  const [trajectory, setTrajectory] = useState<TrackPoint[]>([]);
  const [spellIcons, setSpellIcons] = useState<SpellIconState[]>([
    { type: 'fireball', isCharging: false, cooldownProgress: 1 },
    { type: 'iceSpike', isCharging: false, cooldownProgress: 1 },
    { type: 'lightning', isCharging: false, cooldownProgress: 1 }
  ]);
  const [spellLogs, setSpellLogs] = useState<SpellLogEntry[]>([]);

  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const spellManagerRef = useRef<SpellEffectManager | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const arenaUpdaterRef = useRef<{ update: (d: number) => void } | null>(null);
  const lastCastTimeRef = useRef<Record<string, number>>({
    fireball: 0, iceSpike: 0, lightning: 0
  });
  const chargingRef = useRef<Record<string, number>>({
    fireball: 0, iceSpike: 0, lightning: 0
  });
  const handposeModelRef = useRef<any>(null);
  const logIdRef = useRef(0);
  const [modelReady, setModelReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const initThreeScene = useCallback(() => {
    const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    canvasRef.current = canvas;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0810);
    scene.fog = new THREE.Fog(0x0a0810, 8, 20);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    arenaUpdaterRef.current = setupArena(scene);
    spellManagerRef.current = new SpellEffectManager(scene);

    const onResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const initCamera = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      video.srcObject = stream;
      await video.play();
      setCameraReady(true);
    } catch (e) {
      console.error('摄像头初始化失败:', e);
    }
  }, []);

  const loadHandpose = useCallback(async () => {
    try {
      await tf.setBackend('webgl');
      await tf.ready();
      const model = await handpose.load();
      handposeModelRef.current = model;
      recognizerRef.current = new GestureRecognizer();
      setModelReady(true);
    } catch (e) {
      console.error('Handpose 模型加载失败:', e);
    }
  }, []);

  const runHandDetection = useCallback(async () => {
    if (!handposeModelRef.current || !videoRef.current || !cameraReady) {
      requestAnimationFrame(runHandDetection);
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2) {
      requestAnimationFrame(runHandDetection);
      return;
    }

    try {
      const predictions = await handposeModelRef.current.estimateHands(video);

      if (predictions && predictions.length > 0) {
        const landmarks: HandLandmark[] = predictions[0].landmarks.map(
          (pt: number[]) => ({
            x: 1 - pt[0] / video.videoWidth,
            y: pt[1] / video.videoHeight,
            z: pt[2] || 0
          })
        );
        setHandLandmarks(landmarks);

        if (recognizerRef.current) {
          recognizerRef.current.addPoint(landmarks);
          setTrajectory(recognizerRef.current.getTrajectory());

          const result = recognizerRef.current.recognize();
          if (result && result.spellType) {
            castSpell(result.spellType, landmarks);
          }
        }
      } else {
        setHandLandmarks(null);
        setTrajectory([]);
        if (recognizerRef.current) {
          recognizerRef.current.reset();
        }
      }
    } catch (e) {
      // 忽略偶尔的检测错误
    }

    setTimeout(runHandDetection, 30);
  }, [cameraReady]);

  const castSpell = useCallback((spellType: SpellType, landmarks: HandLandmark[]) => {
    if (!spellType || !spellManagerRef.current) return;

    const now = Date.now();
    if (now - (lastCastTimeRef.current[spellType] || 0) < COOLDOWN_MS) return;

    const palm = landmarks[0];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];

    const handCenterX = (palm.x + indexTip.x + middleTip.x) / 3;
    const handCenterY = (palm.y + indexTip.y + middleTip.y) / 3;

    const sceneX = (handCenterX - 0.5) * 10;
    const sceneY = (1 - handCenterY) * 4 + 0.5;

    const startPos = new THREE.Vector3(sceneX, sceneY, 2);
    const targetPos = new THREE.Vector3(sceneX * 0.3, sceneY * 0.6, -3);

    const dir = new THREE.Vector3().subVectors(targetPos, startPos).normalize();
    targetPos.copy(startPos).add(dir.multiplyScalar(6));

    spellManagerRef.current.castSpell(spellType, startPos, targetPos);

    lastCastTimeRef.current[spellType] = now;
    chargingRef.current[spellType] = now + CHARGE_MS;

    const colorMap: Record<string, string> = {
      fireball: '#ff6633',
      iceSpike: '#66aaff',
      lightning: '#ffdd44'
    };
    const nameMap: Record<string, string> = {
      fireball: '火球术',
      iceSpike: '冰锥术',
      lightning: '雷电术'
    };

    logIdRef.current += 1;
    setSpellLogs(prev => [
      ...prev,
      {
        id: logIdRef.current,
        spellName: nameMap[spellType],
        timestamp: formatTime(new Date()),
        color: colorMap[spellType]
      }
    ].slice(-10));
  }, []);

  useEffect(() => {
    const cleanup = initThreeScene();
    initCamera();
    loadHandpose();

    const startTime = performance.now();
    let lastTime = startTime;
    let animFrame = 0;

    const animate = () => {
      animFrame = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (arenaUpdaterRef.current) {
        arenaUpdaterRef.current.update(delta);
      }
      if (spellManagerRef.current) {
        spellManagerRef.current.update(delta);
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      const currentNow = Date.now();
      setSpellIcons(prev => prev.map(icon => {
        const type = icon.type!;
        const lastCast = lastCastTimeRef.current[type] || 0;
        const elapsed = currentNow - lastCast;
        const cooldownProgress = lastCast === 0
          ? 1
          : Math.min(1, elapsed / COOLDOWN_MS);
        const isCharging = currentNow < (chargingRef.current[type] || 0);
        return { ...icon, isCharging, cooldownProgress };
      }));
    };

    runHandDetection();
    animate();

    return () => {
      cancelAnimationFrame(animFrame);
      cleanup?.();
      if (spellManagerRef.current) spellManagerRef.current.dispose();
      if (rendererRef.current) rendererRef.current.dispose();
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [initThreeScene, initCamera, loadHandpose, runHandDetection]);

  return (
    <>
      <UIOverlay
        videoRef={videoRef}
        handLandmarks={handLandmarks}
        trajectory={trajectory}
        spellIcons={spellIcons}
        spellLogs={spellLogs}
      />
      {(!modelReady || !cameraReady) && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(5,3,10,0.85)',
          zIndex: 100,
          color: '#fff'
        }}>
          <div style={{
            textAlign: 'center',
            padding: 40,
            borderRadius: 16,
            background: 'rgba(30,20,50,0.8)',
            border: '1px solid rgba(120,80,200,0.3)'
          }}>
            <div style={{ fontSize: 24, marginBottom: 16, color: '#c9a6ff' }}>
              ✨ 魔法咒语施放模拟器 ✨
            </div>
            <div style={{ fontSize: 14, color: '#aaa', marginBottom: 8 }}>
              {!modelReady ? '正在加载手势识别模型...' : ''}
              {!cameraReady ? '正在启动摄像头...' : ''}
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 20 }}>
              请确保允许浏览器访问摄像头
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}
