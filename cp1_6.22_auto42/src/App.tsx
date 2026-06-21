import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Leva, useControls } from 'leva';
import {
  generatePlantStructure,
  updateGrowthAnimation,
  calculateGrowthProgress,
  type PlantStructure,
  type GrowthState,
  type SimParams
} from './PlantSimulation';
import {
  rebuildPlantMeshes,
  createSeedMesh,
  createGroundMesh,
  createSkyDome,
  updateBranchMesh
} from './PlantMesh';

const App: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const branchGroupRef = useRef<THREE.Group | null>(null);
  const leafGroupRef = useRef<THREE.Group | null>(null);
  const structureRef = useRef<PlantStructure | null>(null);
  const growthStateRef = useRef<GrowthState>({
    currentTime: 0,
    isPaused: false,
    isComplete: false
  });
  const autoRotateRef = useRef(true);
  const userInteractingRef = useRef(false);
  const lastInteractionRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const topViewRef = useRef(false);
  const transitionProgressRef = useRef(1);
  const prevParamsRef = useRef<SimParams | null>(null);

  const [growthProgress, setGrowthProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  const params = useControls({
    '光照方向': {
      value: 180,
      min: 0,
      max: 360,
      step: 1,
      label: '光照方向'
    },
    '生长速度': {
      value: 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.1,
      label: '生长速度'
    },
    '最大分支深度': {
      value: 4,
      min: 1,
      max: 6,
      step: 1,
      label: '最大分支深度'
    },
    '分支角度': {
      value: 30,
      min: 15,
      max: 60,
      step: 1,
      label: '分支角度'
    },
    '树干颜色': {
      value: '#8B4513',
      label: '树干颜色'
    },
    '树叶颜色': {
      value: '#228B22',
      label: '树叶颜色'
    }
  });

  const handleResize = useCallback(() => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
    setIsMobile(window.innerWidth < 768);
  }, []);

  const highlightParam = useCallback((_name: string) => {
  }, []);

  const regeneratePlant = useCallback((smooth: boolean = true) => {
    if (!sceneRef.current) return;

    const simParams: SimParams = {
      maxDepth: params['最大分支深度'],
      branchAngle: params['分支角度'],
      growthSpeed: params['生长速度']
    };

    if (prevParamsRef.current) {
      const changed =
        prevParamsRef.current.maxDepth !== simParams.maxDepth ||
        prevParamsRef.current.branchAngle !== simParams.branchAngle;

      if (!changed && structureRef.current) {
        prevParamsRef.current = simParams;
        updatePlantColors();
        return;
      }
    }

    prevParamsRef.current = simParams;

    if (branchGroupRef.current) {
      sceneRef.current.remove(branchGroupRef.current);
      branchGroupRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
    if (leafGroupRef.current) {
      sceneRef.current.remove(leafGroupRef.current);
      leafGroupRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }

    structureRef.current = generatePlantStructure(simParams);
    const { branchGroup, leafGroup } = rebuildPlantMeshes(
      structureRef.current,
      params['树干颜色'],
      params['树叶颜色']
    );

    branchGroupRef.current = branchGroup;
    leafGroupRef.current = leafGroup;

    if (smooth) {
      transitionProgressRef.current = 0;
      branchGroup.scale.setScalar(0);
      leafGroup.scale.setScalar(0);
    }

    sceneRef.current.add(branchGroup);
    sceneRef.current.add(leafGroup);

    growthStateRef.current = {
      currentTime: 0,
      isPaused: false,
      isComplete: false
    };
    setIsPaused(false);
    setGrowthProgress(0);
  }, [params]);

  const updatePlantColors = useCallback(() => {
    if (!structureRef.current || !sceneRef.current) return;

    if (branchGroupRef.current) {
      sceneRef.current.remove(branchGroupRef.current);
      branchGroupRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
    if (leafGroupRef.current) {
      sceneRef.current.remove(leafGroupRef.current);
      leafGroupRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }

    const { branchGroup, leafGroup } = rebuildPlantMeshes(
      structureRef.current,
      params['树干颜色'],
      params['树叶颜色']
    );

    branchGroupRef.current = branchGroup;
    leafGroupRef.current = leafGroup;
    sceneRef.current.add(branchGroup);
    sceneRef.current.add(leafGroup);
  }, [params]);

  const exportSnapshot = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    const originalClearAlpha = rendererRef.current.getClearAlpha();
    rendererRef.current.setClearAlpha(0);
    rendererRef.current.render(sceneRef.current, cameraRef.current);

    const dataURL = rendererRef.current.domElement.toDataURL('image/png');

    rendererRef.current.setClearAlpha(originalClearAlpha);

    const link = document.createElement('a');
    link.download = `plant_snapshot_${Date.now()}.png`;
    link.href = dataURL;
    link.click();

    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 2000);
  }, []);

  const togglePause = useCallback(() => {
    growthStateRef.current.isPaused = !growthStateRef.current.isPaused;
    setIsPaused(growthStateRef.current.isPaused);
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(6, 5, 8);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3;
    controls.maxDistance = 25;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.target.set(0, 1.5, 0);
    controlsRef.current = controls;

    controls.addEventListener('start', () => {
      userInteractingRef.current = true;
      lastInteractionRef.current = performance.now();
    });
    controls.addEventListener('change', () => {
      lastInteractionRef.current = performance.now();
    });
    controls.addEventListener('end', () => {
      lastInteractionRef.current = performance.now();
      setTimeout(() => {
        if (performance.now() - lastInteractionRef.current > 500) {
          userInteractingRef.current = false;
        }
      }, 600);
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    const ground = createGroundMesh();
    ground.receiveShadow = true;
    scene.add(ground);

    const seed = createSeedMesh();
    seed.castShadow = true;
    scene.add(seed);

    const skyDome = createSkyDome();
    scene.add(skyDome);

    const simParams: SimParams = {
      maxDepth: params['最大分支深度'],
      branchAngle: params['分支角度'],
      growthSpeed: params['生长速度']
    };
    prevParamsRef.current = simParams;
    structureRef.current = generatePlantStructure(simParams);
    const { branchGroup, leafGroup } = rebuildPlantMeshes(
      structureRef.current,
      params['树干颜色'],
      params['树叶颜色']
    );
    branchGroupRef.current = branchGroup;
    leafGroupRef.current = leafGroup;
    scene.add(branchGroup);
    scene.add(leafGroup);

    let lastTime = performance.now();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (!growthStateRef.current.isPaused && !growthStateRef.current.isComplete) {
        growthStateRef.current.currentTime += delta * params['生长速度'];
      }

      if (structureRef.current) {
        updateGrowthAnimation(
          structureRef.current,
          growthStateRef.current,
          delta,
          growthStateRef.current.currentTime,
          {
            maxDepth: params['最大分支深度'],
            branchAngle: params['分支角度'],
            growthSpeed: params['生长速度']
          }
        );

        const progress = calculateGrowthProgress(
          structureRef.current,
          growthStateRef.current.currentTime,
          {
            maxDepth: params['最大分支深度'],
            branchAngle: params['分支角度'],
            growthSpeed: params['生长速度']
          }
        );
        setGrowthProgress(progress);

        if (branchGroupRef.current) {
          branchGroupRef.current.children.forEach((mesh, idx) => {
            if (mesh instanceof THREE.Mesh && structureRef.current) {
              const node = structureRef.current.allNodes[idx];
              if (node) {
                updateBranchMesh(mesh, node);
              }
            }
          });
        }

        if (transitionProgressRef.current < 1) {
          transitionProgressRef.current = Math.min(1, transitionProgressRef.current + delta / 2);
          const t = transitionProgressRef.current;
          const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          if (branchGroupRef.current) branchGroupRef.current.scale.setScalar(eased);
          if (leafGroupRef.current) leafGroupRef.current.scale.setScalar(eased);
        }
      }

      const lightAngleRad = (params['光照方向'] * Math.PI) / 180;
      directionalLight.position.x = Math.cos(lightAngleRad) * 10;
      directionalLight.position.z = Math.sin(lightAngleRad) * 10;
      directionalLight.position.y = 8;

      if (!userInteractingRef.current && autoRotateRef.current && !topViewRef.current) {
        const baseAngle = Math.atan2(camera.position.z, camera.position.x);
        const autoAngle = baseAngle + Math.sin(now * 0.0006) * 0.26;
        const dist = Math.sqrt(
          camera.position.x * camera.position.x +
          camera.position.z * camera.position.z
        );
        camera.position.x = Math.cos(autoAngle) * dist;
        camera.position.z = Math.sin(autoAngle) * dist;
        camera.lookAt(0, 2, 0);
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'v' || e.key === 'V') {
        topViewRef.current = !topViewRef.current;
        if (topViewRef.current) {
          camera.position.set(0, 12, 0.01);
          controls.target.set(0, 0, 0);
        } else {
          camera.position.set(6, 5, 8);
          controls.target.set(0, 1.5, 0);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    setIsMobile(window.innerWidth < 768);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      regeneratePlant(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [params['最大分支深度'], params['分支角度']]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updatePlantColors();
      highlightParam('树干颜色');
    }, 50);
    return () => clearTimeout(timer);
  }, [params['树干颜色']]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updatePlantColors();
      highlightParam('树叶颜色');
    }, 50);
    return () => clearTimeout(timer);
  }, [params['树叶颜色']]);

  useEffect(() => {
    highlightParam('光照方向');
  }, [params['光照方向']]);

  useEffect(() => {
    highlightParam('生长速度');
  }, [params['生长速度']]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60%',
          maxWidth: 600,
          zIndex: 10
        }}
      >
        <div
          style={{
            width: '100%',
            height: 8,
            backgroundColor: '#e2e8f0',
            borderRadius: 999,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${growthProgress * 100}%`,
              background: 'linear-gradient(to right, #48bb78, #38a169)',
              borderRadius: 999,
              transition: 'width 0.1s ease-out'
            }}
          />
        </div>
        <div
          style={{
            textAlign: 'center',
            marginTop: 6,
            fontSize: 12,
            color: '#4a5568',
            fontFamily: 'sans-serif'
          }}
        >
          {Math.round(growthProgress * 100)}%
        </div>
      </div>

      {!isMobile && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 20,
            zIndex: 20,
            maxHeight: 'calc(100% - 120px)',
            overflowY: 'auto'
          }}
        >
          <Leva
            theme={{
              colors: {
                elevation1: 'rgba(255,255,255,0.85)',
                elevation2: 'rgba(255,255,255,0.95)',
                elevation3: 'rgba(240,240,240,0.95)',
                accent1: '#2b6cb0',
                accent2: '#3182ce',
                accent3: '#4299e1',
                highlight1: '#ffff00',
                highlight2: '#ffffcc',
                highlight3: '#ffff99'
              },
              radii: {
                lg: '10px',
                sm: '6px',
                xs: '4px'
              },
              fontSizes: {
                root: '14px',
                toolTip: '13px'
              },
              space: {
                md: '10px',
                sm: '6px',
                rowGap: '10px',
                colGap: '10px'
              },
              shadows: {
                level1: '0 2px 8px rgba(0,0,0,0.08)',
                level2: '0 4px 12px rgba(0,0,0,0.12)'
              }
            }}
            collapsed={false}
          />
        </div>
      )}

      {isMobile && (
        <>
          <button
            onClick={() => setShowPanel(!showPanel)}
            style={{
              position: 'absolute',
              right: 20,
              bottom: 130,
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: '#2b6cb0',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: 20,
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            ⚙
          </button>
          {showPanel && (
            <div
              style={{
                position: 'absolute',
                right: 20,
                bottom: 180,
                zIndex: 25,
                maxWidth: 'calc(100% - 40px)'
              }}
            >
              <Leva />
            </div>
          )}
        </>
      )}

      <div
        style={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          zIndex: 20
        }}
      >
        <button
          onClick={togglePause}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#2b6cb0',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#3182ce';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2b6cb0';
          }}
          title={isPaused ? '继续生长' : '暂停生长'}
        >
          {isPaused ? '▶' : '⏸'}
        </button>

        <button
          onClick={exportSnapshot}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#2b6cb0',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#3182ce';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2b6cb0';
          }}
          title="导出快照"
        >
          📷
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 20,
          bottom: 20,
          fontSize: 12,
          color: '#4a5568',
          fontFamily: 'sans-serif',
          backgroundColor: 'rgba(255,255,255,0.7)',
          padding: '8px 12px',
          borderRadius: 8,
          zIndex: 10
        }}
      >
        鼠标拖拽旋转 | 滚轮缩放 | 按 V 键切换俯视视角
      </div>

      {showFlash && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(72, 187, 120, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            animation: 'flashFade 2s ease-out forwards'
          }}
        >
          <div
            style={{
              color: 'white',
              fontSize: 32,
              fontWeight: 'bold',
              fontFamily: 'sans-serif',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
          >
            快照已保存
          </div>
        </div>
      )}

      <style>{`
        @keyframes flashFade {
          0% { opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        .leva__root {
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important;
          background: rgba(255, 255, 255, 0.85) !important;
          border-radius: 10px !important;
        }
        .leva__label {
          font-family: sans-serif !important;
          font-size: 14px !important;
          color: #2d3748 !important;
        }
      `}</style>
    </div>
  );
};

export default App;
