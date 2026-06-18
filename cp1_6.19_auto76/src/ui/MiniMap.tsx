import { useRef, useEffect } from 'react';
import { useSimulationStore } from '../store/store';
import './MiniMap.css';

const MAP_SIZE = 150;
const WORLD_SIZE = 100;

export function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drones = useSimulationStore((state) => state.drones);
  const packages = useSimulationStore((state) => state.packages);
  const deliveryCenters = useSimulationStore((state) => state.deliveryCenters);
  const buildings = useSimulationStore((state) => state.buildings);
  const cameraAngle = useSimulationStore((state) => state.cameraAngle);

  const worldToMap = (x: number, z: number): { x: number; y: number } => {
    const scale = MAP_SIZE / WORLD_SIZE;
    const mapX = MAP_SIZE / 2 + x * scale;
    const mapY = MAP_SIZE / 2 + z * scale;
    return { x: mapX, y: mapY };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = MAP_SIZE * dpr;
    canvas.height = MAP_SIZE * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);

    ctx.save();
    ctx.translate(MAP_SIZE / 2, MAP_SIZE / 2);
    ctx.rotate(-cameraAngle);
    ctx.translate(-MAP_SIZE / 2, -MAP_SIZE / 2);

    ctx.fillStyle = 'rgba(26, 37, 48, 0.8)';
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

    ctx.strokeStyle = 'rgba(100, 120, 140, 0.3)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const pos = (i / 10) * MAP_SIZE;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, MAP_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(MAP_SIZE, pos);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(90, 101, 117, 0.7)';
    buildings.forEach((b) => {
      const pos = worldToMap(b.position.x, b.position.z);
      const scale = MAP_SIZE / WORLD_SIZE;
      const w = b.width * scale;
      const h = b.depth * scale;
      ctx.fillRect(pos.x - w / 2, pos.y - h / 2, w, h);
    });

    deliveryCenters.forEach((center) => {
      const pos = worldToMap(center.position.x, center.position.z);
      const radius = 6;

      const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 1.5);
      gradient.addColorStop(0, 'rgba(51, 153, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(51, 153, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#3399ff';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    packages.forEach((pkg) => {
      if (pkg.status !== 'pending') return;

      const pos = worldToMap(pkg.position.x, pkg.position.z);
      const size = 3;

      ctx.fillStyle = '#ffa500';
      ctx.fillRect(pos.x - size / 2, pos.y - size / 2, size, size);
    });

    drones.forEach((drone) => {
      const pos = worldToMap(drone.position.x, drone.position.z);
      const radius = 3;

      const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 2);
      gradient.addColorStop(0, drone.color);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = drone.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();

    ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE);

    const cornerSize = 8;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, cornerSize);
    ctx.lineTo(0, 0);
    ctx.lineTo(cornerSize, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(MAP_SIZE - cornerSize, 0);
    ctx.lineTo(MAP_SIZE, 0);
    ctx.lineTo(MAP_SIZE, cornerSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(MAP_SIZE, MAP_SIZE - cornerSize);
    ctx.lineTo(MAP_SIZE, MAP_SIZE);
    ctx.lineTo(MAP_SIZE - cornerSize, MAP_SIZE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cornerSize, MAP_SIZE);
    ctx.lineTo(0, MAP_SIZE);
    ctx.lineTo(0, MAP_SIZE - cornerSize);
    ctx.stroke();
  }, [drones, packages, deliveryCenters, buildings, cameraAngle]);

  return (
    <div className="minimap-container">
      <div className="minimap-title">小地图</div>
      <canvas
        ref={canvasRef}
        width={MAP_SIZE}
        height={MAP_SIZE}
        className="minimap-canvas"
      />
    </div>
  );
}
