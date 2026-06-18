import { useEffect, useRef, useState, useCallback } from "react";
import { Renderer } from "./renderer";
import {
  updatePhysics,
  createParticle,
  createObstacle,
  isPointInPolygon,
  DEFAULT_GRAVITY,
  MAX_PARTICLES,
  MAX_OBSTACLES,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from "./physics";
import type { Particle, PolygonObstacle, Vector2, Gravity } from "./physics";

const PARTICLE_COLORS = [
  "#ff4d4d",
  "#ff9933",
  "#ffcc4d",
  "#4dff4d",
  "#4da6ff",
  "#b366ff",
];

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const animationIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const particlesRef = useRef<Particle[]>([]);
  const obstaclesRef = useRef<PolygonObstacle[]>([]);
  const currentDrawingRef = useRef<Vector2[] | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const gravityRef = useRef<Gravity>({ ...DEFAULT_GRAVITY });
  const mousePosRef = useRef<Vector2>({ x: 0, y: 0 });
  const lastMousePosRef = useRef<Vector2>({ x: 0, y: 0 });
  const isDrawingRef = useRef<boolean>(false);

  const [particleCount, setParticleCount] = useState(0);
  const [obstacleCount, setObstacleCount] = useState(0);
  const [gravityX, setGravityX] = useState(DEFAULT_GRAVITY.x);
  const [gravityY, setGravityY] = useState(DEFAULT_GRAVITY.y);

  const getCanvasMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Vector2 => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasMousePos(e);
    mousePosRef.current = pos;
    lastMousePosRef.current = pos;

    if (e.button === 0) {
      let clickedObstacle: PolygonObstacle | null = null;
      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const obs = obstaclesRef.current[i];
        if (obs.vertices.length >= 3 && isPointInPolygon(pos, obs.vertices)) {
          clickedObstacle = obs;
          break;
        }
      }

      if (clickedObstacle) {
        obstaclesRef.current.forEach((o) => (o.isSelected = false));
        clickedObstacle.isSelected = true;
        selectedIdRef.current = clickedObstacle.id;
        setObstacleCount(obstaclesRef.current.length);
      } else {
        obstaclesRef.current.forEach((o) => (o.isSelected = false));
        selectedIdRef.current = null;

        if (obstaclesRef.current.length < MAX_OBSTACLES) {
          isDrawingRef.current = true;
          currentDrawingRef.current = [pos];
        }
      }
    } else if (e.button === 2) {
      e.preventDefault();
      let clickedObstacle: PolygonObstacle | null = null;
      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const obs = obstaclesRef.current[i];
        if (obs.vertices.length >= 3 && isPointInPolygon(pos, obs.vertices)) {
          clickedObstacle = obs;
          break;
        }
      }

      obstaclesRef.current.forEach((o) => (o.isSelected = false));
      if (clickedObstacle) {
        clickedObstacle.isSelected = true;
        selectedIdRef.current = clickedObstacle.id;
      } else {
        selectedIdRef.current = null;
      }
      setObstacleCount(obstaclesRef.current.length);
    }
  }, [getCanvasMousePos]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasMousePos(e);
    lastMousePosRef.current = mousePosRef.current;
    mousePosRef.current = pos;

    if (isDrawingRef.current && currentDrawingRef.current) {
      const points = currentDrawingRef.current;
      const lastPoint = points[points.length - 1];
      const dist = Math.sqrt(
        Math.pow(pos.x - lastPoint.x, 2) + Math.pow(pos.y - lastPoint.y, 2)
      );
      if (dist > 8) {
        points.push(pos);
      }
    }
  }, [getCanvasMousePos]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0 && isDrawingRef.current) {
      isDrawingRef.current = false;
      if (
        currentDrawingRef.current &&
        currentDrawingRef.current.length >= 3
      ) {
        const obstacle = createObstacle(currentDrawingRef.current);
        obstaclesRef.current.push(obstacle);
        setObstacleCount(obstaclesRef.current.length);
      }
      currentDrawingRef.current = null;
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      if (selectedIdRef.current !== null) {
        obstaclesRef.current = obstaclesRef.current.filter(
          (o) => o.id !== selectedIdRef.current
        );
        selectedIdRef.current = null;
        setObstacleCount(obstaclesRef.current.length);
      }
    }
  }, []);

  const spawnParticle = useCallback(() => {
    if (particlesRef.current.length >= MAX_PARTICLES) return;

    const speed = 120 + Math.random() * 60;
    const radius = 8 + Math.random() * 8;
    const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];

    const dir = {
      x: mousePosRef.current.x - lastMousePosRef.current.x,
      y: mousePosRef.current.y - lastMousePosRef.current.y,
    };
    const dirLen = Math.sqrt(dir.x * dir.x + dir.y * dir.y);

    let velocity: Vector2;
    if (dirLen > 0.1) {
      velocity = {
        x: (dir.x / dirLen) * speed,
        y: (dir.y / dirLen) * speed,
      };
    } else {
      const angle = Math.random() * Math.PI * 2;
      velocity = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      };
    }

    const particle = createParticle(mousePosRef.current, velocity, color, radius);
    particlesRef.current.push(particle);
    setParticleCount(particlesRef.current.length);
  }, []);

  const clearAllParticles = useCallback(() => {
    particlesRef.current = [];
    setParticleCount(0);
  }, []);

  const resetCanvas = useCallback(() => {
    particlesRef.current = [];
    obstaclesRef.current = [];
    currentDrawingRef.current = null;
    selectedIdRef.current = null;
    isDrawingRef.current = false;
    setParticleCount(0);
    setObstacleCount(0);
  }, []);

  const handleGravityXChange = useCallback((value: number) => {
    setGravityX(value);
    gravityRef.current.x = value;
  }, []);

  const handleGravityYChange = useCallback((value: number) => {
    setGravityY(value);
    gravityRef.current.y = value;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    rendererRef.current = new Renderer(canvas);

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 1 / 30);
      lastTimeRef.current = timestamp;

      particlesRef.current = updatePhysics(
        particlesRef.current,
        obstaclesRef.current,
        gravityRef.current,
        dt
      );
      setParticleCount(particlesRef.current.length);

      if (rendererRef.current) {
        rendererRef.current.render({
          particles: particlesRef.current,
          obstacles: obstaclesRef.current,
          currentDrawing: currentDrawingRef.current,
          selectedObstacleId: selectedIdRef.current,
          isDrawingMode: isDrawingRef.current,
        });
      }

      animationIdRef.current = requestAnimationFrame(gameLoop);
    };

    animationIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div style={styles.appContainer}>
      <div style={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          style={styles.canvas}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
        />

        <div style={styles.leftPanel}>
          <div style={styles.glassPanel}>
            <button style={styles.spawnButton} onClick={spawnParticle}>
              发射粒子
            </button>
            <div style={styles.panelInfo}>
              <span>障碍物: {obstacleCount}/{MAX_OBSTACLES}</span>
            </div>
          </div>
        </div>

        <div style={styles.rightPanel}>
          <div style={styles.sliderContainer}>
            <div style={styles.sliderLabel}>重力 X</div>
            <div style={styles.sliderValue}>{Math.round(gravityX)}</div>
            <div style={styles.sliderWrapper}>
              <input
                type="range"
                min="-1000"
                max="1000"
                value={gravityX}
                onChange={(e) => handleGravityXChange(Number(e.target.value))}
                style={styles.verticalSlider}
              />
            </div>
          </div>
          <div style={styles.sliderContainer}>
            <div style={styles.sliderLabel}>重力 Y</div>
            <div style={styles.sliderValue}>{Math.round(gravityY)}</div>
            <div style={styles.sliderWrapper}>
              <input
                type="range"
                min="-1000"
                max="1000"
                value={gravityY}
                onChange={(e) => handleGravityYChange(Number(e.target.value))}
                style={styles.verticalSlider}
              />
            </div>
          </div>
        </div>

        <div style={styles.bottomRightPanel}>
          <div style={styles.controlPanel}>
            <button
              style={{ ...styles.controlButton, ...styles.redButton }}
              onClick={clearAllParticles}
            >
              清空所有粒子
            </button>
            <button
              style={{ ...styles.controlButton, ...styles.blueButton }}
              onClick={resetCanvas}
            >
              重置画布
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    margin: 0,
    padding: 0,
    overflow: "hidden",
    fontFamily: 'Arial, sans-serif',
  },
  canvasWrapper: {
    position: "relative",
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  },
  canvas: {
    display: "block",
    backgroundColor: "#ffffff",
    borderRadius: 4,
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
    cursor: "crosshair",
  },
  leftPanel: {
    position: "absolute",
    left: 16,
    bottom: 16,
    pointerEvents: "auto",
  },
  glassPanel: {
    background: "rgba(255, 255, 255, 0.6)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    borderRadius: 12,
    padding: 12,
    border: "1px solid rgba(255, 255, 255, 0.3)",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
  },
  spawnButton: {
    display: "block",
    width: "100%",
    padding: "10px 20px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background-color 0.2s",
    marginBottom: 8,
  },
  panelInfo: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  rightPanel: {
    position: "absolute",
    right: -60,
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    gap: 20,
  },
  sliderContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    borderRadius: 10,
    padding: "10px 8px",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
  },
  sliderLabel: {
    fontSize: 12,
    color: "#555",
    marginBottom: 4,
    fontWeight: 500,
  },
  sliderValue: {
    fontSize: 13,
    color: "#333",
    fontWeight: 600,
    marginBottom: 8,
  },
  sliderWrapper: {
    width: 30,
    height: 180,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  verticalSlider: {
    width: 180,
    height: 30,
    transform: "rotate(-90deg)",
    cursor: "pointer",
    WebkitAppearance: "none",
    appearance: "none",
    background: "transparent",
  },
  bottomRightPanel: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
  controlPanel: {
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
  },
  controlButton: {
    padding: "8px 16px",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    color: "white",
    cursor: "pointer",
    transition: "filter 0.2s",
    fontWeight: 500,
    minWidth: 100,
  },
  redButton: {
    backgroundColor: "#e74c3c",
  },
  blueButton: {
    backgroundColor: "#3498db",
  },
};

export default App;
