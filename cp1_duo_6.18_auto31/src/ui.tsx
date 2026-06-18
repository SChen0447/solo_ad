import { useEffect, useRef } from 'react';
import p5 from 'p5';
import type P5 from 'p5';
import { useGameStore, CONSTANTS, snapToGrid, clampToMaze } from './store';
import type { Wall, Receiver, SoundWave, Particle } from './store';
import {
  simulateFrame,
  generateFanWavesFromSource,
  getIntensityColor,
  findWallAtPoint,
} from './physics';

const MazeCanvas = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<P5 | null>(null);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    let resizeHandler: (() => void) | null = null;

    const sketch = (p: P5) => {
      const getStore = () => useGameStore.getState();

      const handleResize = () => {
        const state = getStore();
        const isMobile = window.innerWidth < 768;
        const newMazeSize = isMobile ? CONSTANTS.MAZE_SIZE_MOBILE : CONSTANTS.MAZE_SIZE;
        
        if (state.isMobile !== isMobile) {
          state.setIsMobile(isMobile);
        }
        if (state.mazeSize !== newMazeSize) {
          state.setMazeSize(newMazeSize);
          state.resetReceiverIntensities();
          state.clearWaves();
        }

        p.resizeCanvas(newMazeSize, newMazeSize);
        p.pixelDensity(window.devicePixelRatio || 1);
      };

      resizeHandler = handleResize;

      p.setup = () => {
        const state = getStore();
        const isMobile = window.innerWidth < 768;
        const mazeSize = isMobile ? CONSTANTS.MAZE_SIZE_MOBILE : CONSTANTS.MAZE_SIZE;
        state.setIsMobile(isMobile);
        state.setMazeSize(mazeSize);

        const canvas = p.createCanvas(mazeSize, mazeSize);
        canvas.parent(canvasRef.current!);
        canvas.elt.addEventListener('contextmenu', (e: Event) => e.preventDefault());
        p.frameRate(CONSTANTS.TARGET_FPS);
        p.pixelDensity(window.devicePixelRatio || 1);

        window.addEventListener('resize', handleResize);
      };

      p.windowResized = () => {
        handleResize();
      };

      const drawBackground = () => {
        const state = getStore();
        p.background(CONSTANTS.COLORS.BG_MAZE);

        p.stroke(30, 30, 50);
        p.strokeWeight(1);
        for (let x = 0; x <= state.mazeSize; x += CONSTANTS.GRID_SIZE) {
          p.line(x, 0, x, state.mazeSize);
        }
        for (let y = 0; y <= state.mazeSize; y += CONSTANTS.GRID_SIZE) {
          p.line(0, y, state.mazeSize, y);
        }
      };

      const drawWalls = (walls: Wall[]) => {
        p.stroke(CONSTANTS.COLORS.WALL);
        p.strokeWeight(CONSTANTS.WALL_THICKNESS);
        p.strokeCap(p.ROUND);
        for (const wall of walls) {
          p.line(wall.x1, wall.y1, wall.x2, wall.y2);
        }
      };

      const drawSource = () => {
        const state = getStore();
        const pulse = Math.sin(state.frameCount * 0.1) * 0.3 + 0.7;
        const glowRadius = CONSTANTS.SOURCE_RADIUS * (1 + pulse * 0.3);

        const gradient = p.drawingContext.createRadialGradient(
          state.source.x, state.source.y, 0,
          state.source.x, state.source.y, glowRadius * 2
        );
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        p.drawingContext.fillStyle = gradient;
        p.noStroke();
        p.ellipse(state.source.x, state.source.y, glowRadius * 4, glowRadius * 4);

        p.fill(CONSTANTS.COLORS.SOURCE);
        p.noStroke();
        p.ellipse(state.source.x, state.source.y, CONSTANTS.SOURCE_RADIUS * 2 * pulse, CONSTANTS.SOURCE_RADIUS * 2 * pulse);
      };

      const drawFanWaves = (waves: SoundWave[]) => {
        const groups: Map<string, SoundWave[]> = new Map();
        for (const wave of waves) {
          const key = `${wave.fanDirIndex}_${wave.age}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(wave);
        }

        for (const groupWaves of groups.values()) {
          if (groupWaves.length < 2) continue;

          const sorted = [...groupWaves].sort((a, b) => a.originAngle - b.originAngle);

          for (let i = 0; i < sorted.length - 1; i++) {
            const w1 = sorted[i];
            const w2 = sorted[i + 1];
            const avgIntensity = (w1.intensity + w2.intensity) / 2;

            if (avgIntensity < 0.02) continue;

            const fillAlpha = Math.min(0.45, avgIntensity * 0.5);

            p.noStroke();
            p.fill(100, 149, 237, fillAlpha * 255);

            p.beginShape();
            p.vertex(w1.prevX, w1.prevY);
            p.vertex(w1.x, w1.y);
            p.vertex(w2.x, w2.y);
            p.vertex(w2.prevX, w2.prevY);
            p.endShape(p.CLOSE);
          }
        }

        p.strokeCap(p.ROUND);
        for (const wave of waves) {
          if (wave.intensity < 0.02) continue;

          const strokeW = 1 + wave.intensity * 2;
          const alpha = Math.min(0.7, wave.intensity * 0.8);

          const r = Math.floor(80 + 70 * (1 - wave.intensity));
          const g = Math.floor(130 + 70 * wave.intensity);
          const b = 237;

          p.stroke(r, g, b, alpha * 255);
          p.strokeWeight(strokeW);
          p.line(wave.prevX, wave.prevY, wave.x, wave.y);
        }
      };

      const drawReceivers = (receivers: Receiver[]) => {
        const state = getStore();
        for (const receiver of receivers) {
          const innerColor = getIntensityColor(receiver.intensity);
          const isGlowing = receiver.intensity >= receiver.threshold;
          const pulse = isGlowing ? Math.sin(state.frameCount * 0.2) * 0.2 + 1 : 1;

          if (isGlowing) {
            const glowRadius = CONSTANTS.RECEIVER_RADIUS * 2 * pulse;
            const gradient = p.drawingContext.createRadialGradient(
              receiver.x, receiver.y, 0,
              receiver.x, receiver.y, glowRadius * 2
            );
            gradient.addColorStop(0, 'rgba(0, 255, 255, 0.6)');
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            p.drawingContext.fillStyle = gradient;
            p.noStroke();
            p.ellipse(receiver.x, receiver.y, glowRadius * 4, glowRadius * 4);
          }

          p.stroke(CONSTANTS.COLORS.RECEIVER_OUTER);
          p.strokeWeight(2);
          p.noFill();
          p.ellipse(receiver.x, receiver.y, CONSTANTS.RECEIVER_RADIUS * 2 * pulse, CONSTANTS.RECEIVER_RADIUS * 2 * pulse);

          p.fill(innerColor);
          p.noStroke();
          p.ellipse(receiver.x, receiver.y, (CONSTANTS.RECEIVER_RADIUS - 3) * 2, (CONSTANTS.RECEIVER_RADIUS - 3) * 2);

          if (state.hoveredReceiverId === receiver.id) {
            p.fill(255);
            p.textSize(12);
            p.textAlign(p.CENTER, p.BOTTOM);
            const intensityText = `${Math.round(receiver.intensity * 100)}%`;
            p.text(intensityText, receiver.x, receiver.y - CONSTANTS.RECEIVER_RADIUS - 5);
          }
        }
      };

      const drawParticles = (particles: Particle[]) => {
        const state = getStore();
        if (state.isMobile && particles.length > 50) return;

        for (const particle of particles) {
          const alpha = particle.life;
          if (alpha < 0.05) continue;
          
          p.fill(135, 206, 235, alpha * 255);
          p.noStroke();
          p.ellipse(particle.x, particle.y, 3 * particle.life, 3 * particle.life);
        }
      };

      const drawTempWall = () => {
        const state = getStore();
        if (state.isDrawingWall && state.wallStart && lastMouseRef.current) {
          const endX = clampToMaze(snapToGrid(lastMouseRef.current.x), state.mazeSize);
          const endY = clampToMaze(snapToGrid(lastMouseRef.current.y), state.mazeSize);
          
          p.stroke(200, 200, 200, 150);
          p.strokeWeight(CONSTANTS.WALL_THICKNESS);
          p.strokeCap(p.ROUND);
          p.drawingContext.setLineDash([5, 5]);
          p.line(state.wallStart.x, state.wallStart.y, endX, endY);
          p.drawingContext.setLineDash([]);

          p.fill(255, 200);
          p.textSize(11);
          p.textAlign(p.CENTER, p.BOTTOM);
          const midX = (state.wallStart.x + endX) / 2;
          const midY = (state.wallStart.y + endY) / 2;
          p.text(`${state.walls.length + 1}/${CONSTANTS.MAX_WALLS}`, midX, midY - 10);
        }
      };

      const drawUI = () => {
        const state = getStore();
        p.fill(255, 255, 255, 180);
        p.textSize(11);
        p.textAlign(p.LEFT, p.TOP);
        p.text(`墙壁: ${state.walls.length}/${CONSTANTS.MAX_WALLS}`, 10, 10);
        p.text(`声波: ${state.waves.length}`, 10, 25);
        p.text(`FPS: ${Math.round(p.frameRate())}`, 10, 40);

        const allReceiversActive = state.receivers.every(r => r.intensity >= r.threshold);
        if (allReceiversActive) {
          p.fill(0, 255, 0);
          p.textSize(14);
          p.textAlign(p.CENTER, p.TOP);
          p.text('所有接收器已激活！', state.mazeSize / 2, 10);
        }
      };

      const checkHoveredReceiver = () => {
        const state = getStore();
        let found = false;
        for (const receiver of state.receivers) {
          const dist = Math.sqrt(
            (p.mouseX - receiver.x) ** 2 + (p.mouseY - receiver.y) ** 2
          );
          if (dist <= CONSTANTS.RECEIVER_RADIUS) {
            state.setHoveredReceiver(receiver.id);
            found = true;
            break;
          }
        }
        if (!found && state.hoveredReceiverId !== null) {
          state.setHoveredReceiver(null);
        }
      };

      p.draw = () => {
        const state = getStore();

        drawBackground();

        const simResult = simulateFrame(
          state.waves,
          state.walls,
          state.receivers,
          state.mazeSize
        );

        state.updateWaves(simResult.updatedWaves);

        for (const [id, intensity] of simResult.receiverIntensities) {
          const receiver = state.receivers.find(r => r.id === id);
          if (receiver) {
            const smoothedIntensity = receiver.intensity * 0.7 + intensity * 0.3;
            state.updateReceiverIntensity(id, smoothedIntensity);
          }
        }

        if (!state.isMobile) {
          for (const point of simResult.reflectionPoints) {
            if (Math.random() < 0.3) {
              state.addParticle({
                x: point.x,
                y: point.y,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5 - 0.5,
              });
            }
          }
        }

        if (state.frameCount % 10 === 0 && !state.isDraggingSource) {
          const raysPerDir = state.isMobile ? 4 : CONSTANTS.WAVES_PER_DIRECTION;
          const newWaves = generateFanWavesFromSource(
            state.source.x,
            state.source.y,
            raysPerDir
          );
          for (const wave of newWaves) {
            state.addWave(wave);
          }
        }

        state.updateParticles();
        state.incrementFrameCount();

        drawFanWaves(state.waves);
        drawWalls(state.walls);
        drawReceivers(state.receivers);
        drawParticles(state.particles);
        drawSource();
        drawTempWall();
        drawUI();
        checkHoveredReceiver();
      };

      const getCanvasMouse = () => {
        const state = getStore();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: p.mouseX, y: p.mouseY };
        const scaleX = state.mazeSize / rect.width;
        const scaleY = state.mazeSize / rect.height;
        return {
          x: p.mouseX * scaleX,
          y: p.mouseY * scaleY,
        };
      };

      p.mousePressed = (event: MouseEvent) => {
        const state = getStore();
        const mouse = getCanvasMouse();

        if (mouse.x < 0 || mouse.x > state.mazeSize || mouse.y < 0 || mouse.y > state.mazeSize) {
          return;
        }

        if (event.button === 2) {
          event.preventDefault();
          const wallIndex = findWallAtPoint(mouse.x, mouse.y, state.walls);
          if (wallIndex >= 0) {
            state.removeWall(wallIndex);
            state.clearWaves();
            state.resetReceiverIntensities();
          }
          return;
        }

        if (event.button !== 0) return;

        const distToSource = Math.sqrt(
          (mouse.x - state.source.x) ** 2 + (mouse.y - state.source.y) ** 2
        );

        if (distToSource <= CONSTANTS.SOURCE_RADIUS + 8) {
          state.setIsDraggingSource(true);
          return;
        }

        if (state.walls.length < CONSTANTS.MAX_WALLS) {
          const startX = clampToMaze(snapToGrid(mouse.x), state.mazeSize);
          const startY = clampToMaze(snapToGrid(mouse.y), state.mazeSize);
          state.setWallStart({ x: startX, y: startY });
          state.setIsDrawingWall(true);
          lastMouseRef.current = { x: mouse.x, y: mouse.y };
        }
      };

      p.mouseDragged = () => {
        const state = getStore();
        const mouse = getCanvasMouse();
        lastMouseRef.current = { x: mouse.x, y: mouse.y };

        if (state.isDraggingSource) {
          const newX = clampToMaze(mouse.x, state.mazeSize);
          const newY = clampToMaze(mouse.y, state.mazeSize);
          
          const snappedX = snapToGrid(newX);
          const snappedY = snapToGrid(newY);
          
          if (Math.abs(snappedX - state.source.x) > 1 || Math.abs(snappedY - state.source.y) > 1) {
            state.setSourcePosition(snappedX, snappedY);
          }
        }
      };

      p.mouseReleased = () => {
        const state = getStore();
        const mouse = getCanvasMouse();

        if (state.isDraggingSource) {
          state.setIsDraggingSource(false);
          return;
        }

        if (state.isDrawingWall && state.wallStart) {
          const endX = clampToMaze(snapToGrid(mouse.x), state.mazeSize);
          const endY = clampToMaze(snapToGrid(mouse.y), state.mazeSize);

          const dx = Math.abs(endX - state.wallStart.x);
          const dy = Math.abs(endY - state.wallStart.y);
          
          if (dx >= CONSTANTS.GRID_SIZE || dy >= CONSTANTS.GRID_SIZE) {
            const success = state.addWall({
              x1: state.wallStart.x,
              y1: state.wallStart.y,
              x2: endX,
              y2: endY,
            });

            if (success) {
              state.clearWaves();
              state.resetReceiverIntensities();
            }
          }
        }

        state.setIsDrawingWall(false);
        state.setWallStart(null);
        lastMouseRef.current = null;
      };

      p.mouseMoved = () => {
        const mouse = getCanvasMouse();
        lastMouseRef.current = { x: mouse.x, y: mouse.y };
      };
    };

    p5InstanceRef.current = new p5(sketch);

    return () => {
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      p5InstanceRef.current?.remove();
    };
  }, []);

  return (
    <div
      ref={canvasRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
      }}
    />
  );
};

export default MazeCanvas;
