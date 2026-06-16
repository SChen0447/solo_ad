import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TreeEngine, TreeData, TreeConfig, DEFAULT_TREE_CONFIG } from './TreeEngine';

interface GardenCanvasProps {
  config: Partial<TreeConfig>;
  onTreeSelect?: (tree: TreeData | null) => void;
  selectedTreeId?: string | null;
}

const GardenCanvas: React.FC<GardenCanvasProps> = ({ config, onTreeSelect, selectedTreeId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TreeEngine>(new TreeEngine(config));
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    engineRef.current.updateConfig(config);
  }, [config]);

  useEffect(() => {
    const updateDimensions = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    ctx.scale(dpr, dpr);

    const animate = (currentTime: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = currentTime;
      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      engineRef.current.update(deltaTime);
      render(ctx);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [dimensions]);

  const render = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = dimensions;
    const engine = engineRef.current;

    drawBackground(ctx, width, height);
    drawConnections(ctx, engine);
    drawParticles(ctx, engine);
    drawTrees(ctx, engine);
  }, [dimensions]);

  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a472a');
    gradient.addColorStop(0.5, '#2d5a3d');
    gradient.addColorStop(1, '#1f4a30');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 50; i++) {
      const x = (i * 73) % width;
      const y = (i * 137) % height;
      const r = 2 + (i % 5);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#3d7a4a';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const drawConnections = (ctx: CanvasRenderingContext2D, engine: TreeEngine) => {
    const connections = engine.getConnections();
    const trees = engine.getAllTrees();
    const treeMap = new Map(trees.map(t => [t.id, t]));

    for (const conn of connections) {
      const treeA = treeMap.get(conn.treeAId);
      const treeB = treeMap.get(conn.treeBId);
      if (!treeA || !treeB) continue;

      const ax = treeA.x;
      const ay = treeA.y - treeA.currentHeight * 0.5;
      const bx = treeB.x;
      const by = treeB.y - treeB.currentHeight * 0.5;

      const alpha = 0.3 + (1 - conn.distance / 80) * 0.4;

      ctx.save();
      ctx.shadowColor = 'rgba(100, 220, 180, 0.8)';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = `rgba(120, 240, 200, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.restore();
    }
  };

  const drawParticles = (ctx: CanvasRenderingContext2D, engine: TreeEngine) => {
    const particles = engine.getParticles();
    const trees = engine.getAllTrees();
    const treeMap = new Map(trees.map(t => [t.id, t]));

    for (const particle of particles) {
      const fromTree = treeMap.get(particle.fromTreeId);
      const toTree = treeMap.get(particle.toTreeId);
      if (!fromTree || !toTree) continue;

      const ax = fromTree.x;
      const ay = fromTree.y - fromTree.currentHeight * 0.5;
      const bx = toTree.x;
      const by = toTree.y - toTree.currentHeight * 0.5;

      const x = ax + (bx - ax) * particle.progress;
      const y = ay + (by - ay) * particle.progress;

      ctx.save();
      ctx.shadowColor = 'rgba(150, 255, 200, 1)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = 'rgba(180, 255, 220, 0.9)';
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const drawTrees = (ctx: CanvasRenderingContext2D, engine: TreeEngine) => {
    const trees = engine.getAllTrees();
    const sortedTrees = [...trees].sort((a, b) => a.y - b.y);

    for (const tree of sortedTrees) {
      if (tree.isDead) continue;
      drawTree(ctx, tree);
    }
  };

  const drawTree = (ctx: CanvasRenderingContext2D, tree: TreeData) => {
    const { x, y } = tree;
    const height = (tree as any).currentHeight as number;
    const canopyRadius = (tree as any).currentCanopyRadius as number;
    const leafOpacity = (tree as any).getLeafOpacity() as number;
    const leafCount = (tree as any).getLeafCount() as number;
    const wiltShift = (tree as any).wiltColorShift as { r: number; g: number; b: number };

    const trunkWidth = 3 + tree.growthProgress * 7;
    const trunkGradient = ctx.createLinearGradient(x - trunkWidth / 2, y, x + trunkWidth / 2, y);
    trunkGradient.addColorStop(0, '#4a3728');
    trunkGradient.addColorStop(0.5, '#6b4f3a');
    trunkGradient.addColorStop(1, '#3d2e22');

    ctx.fillStyle = trunkGradient;
    ctx.beginPath();
    ctx.moveTo(x - trunkWidth / 2, y);
    ctx.lineTo(x - trunkWidth / 3, y - height * 0.6);
    ctx.lineTo(x + trunkWidth / 3, y - height * 0.6);
    ctx.lineTo(x + trunkWidth / 2, y);
    ctx.closePath();
    ctx.fill();

    if (tree.growthProgress > 0.3) {
      drawBranches(ctx, tree, height, trunkWidth, wiltShift);
    }

    if (tree.growthProgress > 0.15) {
      drawCanopy(ctx, tree, canopyRadius, leafOpacity, leafCount, wiltShift);
    } else {
      const seedlingHeight = height;
      const seedlingColor = `rgb(${120 + wiltShift.r}, ${200 + wiltShift.g}, ${80 + wiltShift.b})`;
      ctx.strokeStyle = seedlingColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x - 3, y - seedlingHeight / 2, x, y - seedlingHeight);
      ctx.stroke();

      ctx.fillStyle = seedlingColor;
      ctx.beginPath();
      ctx.ellipse(x + 4, y - seedlingHeight + 3, 5, 3, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawBranches = (
    ctx: CanvasRenderingContext2D,
    tree: TreeData,
    height: number,
    trunkWidth: number,
    wiltShift: { r: number; g: number; b: number }
  ) => {
    const { x, y } = tree;
    const branchCount = tree.trunkBranches;
    const branchStartY = y - height * 0.3;
    const branchEndY = y - height * 0.85;

    for (let i = 0; i < branchCount; i++) {
      const t = (i + 1) / (branchCount + 1);
      const branchY = branchStartY + (branchEndY - branchStartY) * t;
      const direction = i % 2 === 0 ? 1 : -1;
      const branchLength = (8 + tree.growthProgress * 15) * (0.6 + t * 0.4);
      const branchWidth = trunkWidth * 0.3 * (1 - t * 0.5);

      const branchColor = `rgb(${74 + wiltShift.r}, ${55 + wiltShift.g}, ${40 + wiltShift.b})`;
      ctx.strokeStyle = branchColor;
      ctx.lineWidth = branchWidth;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(x + direction * trunkWidth / 4, branchY);
      ctx.quadraticCurveTo(
        x + direction * branchLength * 0.6,
        branchY - 5,
        x + direction * branchLength,
        branchY - 8 - tree.growthProgress * 5
      );
      ctx.stroke();
    }
  };

  const drawCanopy = (
    ctx: CanvasRenderingContext2D,
    tree: TreeData,
    radius: number,
    opacity: number,
    leafCount: number,
    wiltShift: { r: number; g: number; b: number }
  ) => {
    const { x } = tree;
    const canopyY = tree.y - (tree as any).currentHeight * 0.8;
    const green = (tree as any).colorGreen as string;
    const darkGreen = (tree as any).colorDarkGreen as string;

    ctx.globalAlpha = opacity;

    const gradient = ctx.createRadialGradient(x, canopyY - radius * 0.3, 0, x, canopyY, radius);
    gradient.addColorStop(0, green);
    gradient.addColorStop(0.7, darkGreen);
    gradient.addColorStop(1, `rgba(30, 80, 40, ${opacity})`);

    ctx.fillStyle = gradient;
    ctx.beginPath();

    const leafNodes: { x: number; y: number; r: number }[] = [];
    for (let i = 0; i < leafCount; i++) {
      const angle = (i / leafCount) * Math.PI * 2 + i * 0.3;
      const dist = radius * (0.5 + Math.sin(i * 1.5) * 0.4);
      const lx = x + Math.cos(angle) * dist * 0.8;
      const ly = canopyY + Math.sin(angle) * dist * 0.6;
      const lr = radius * (0.25 + Math.sin(i * 2.3) * 0.15);
      leafNodes.push({ x: lx, y: ly, r: lr });
    }

    for (const leaf of leafNodes) {
      ctx.moveTo(leaf.x + leaf.r, leaf.y);
      ctx.arc(leaf.x, leaf.y, leaf.r, 0, Math.PI * 2);
    }
    ctx.fill();

    ctx.globalAlpha = opacity * 0.3;
    ctx.fillStyle = `rgba(200, 255, 200, 0.5)`;
    for (const leaf of leafNodes.slice(0, Math.floor(leafCount / 3))) {
      ctx.beginPath();
      ctx.arc(leaf.x - leaf.r * 0.3, leaf.y - leaf.r * 0.3, leaf.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  };

  const getCanvasPosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const plantSeed = (centerX: number, centerY: number) => {
    const radius = 30;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    const x = centerX + Math.cos(angle) * dist;
    const y = centerY + Math.sin(angle) * dist * 0.5;
    engineRef.current.addTree(x, y);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPosition(e);
    dragStartRef.current = pos;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const pos = getCanvasPosition(e);
    const dx = pos.x - dragStartRef.current.x;
    const dy = pos.y - dragStartRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 20) {
      plantSeed(pos.x, pos.y);
      dragStartRef.current = pos;
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    const pos = getCanvasPosition(e);
    const dx = pos.x - dragStartRef.current.x;
    const dy = pos.y - dragStartRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      const tree = engineRef.current.findTreeAtPosition(pos.x, pos.y);
      if (!tree) {
        plantSeed(pos.x, pos.y);
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPosition(e);
    const tree = engineRef.current.findTreeAtPosition(pos.x, pos.y);
    if (onTreeSelect) {
      onTreeSelect(tree);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{
          cursor: 'pointer',
          display: 'block',
          borderRadius: '8px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          color: 'rgba(255,255,255,0.6)',
          fontSize: '14px',
          pointerEvents: 'none',
        }}
      >
        点击或拖拽种植树木 · 双击查看详情
      </div>
    </div>
  );
};

export default GardenCanvas;
