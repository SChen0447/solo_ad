import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Particle } from '../types';
import { audioEngine } from '../utils/audioUtils';

interface VisualizerProps {
  isPlaying: boolean;
}

const Visualizer = ({ isPlaying }: VisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const particleIdRef = useRef(0);
  const [particleCount, setParticleCount] = useState(0);

  const MAX_PARTICLES = 500;
  const CANVAS_WIDTH = 300;
  const CANVAS_HEIGHT = 250;

  const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const r = i === 0 ? radius : radius;
      if (i === 0) {
        ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      } else {
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const addParticles = (low: number, mid: number, high: number) => {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;

    const lowRadius = 2 + low * 10;
    const lowParticle: Particle = {
      id: particleIdRef.current++,
      x: centerX,
      y: centerY,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      radius: lowRadius,
      color: '#ffffff',
      life: 2000,
      maxLife: 2000,
      type: 'circle'
    };
    particlesRef.current.push(lowParticle);

    const midCount = Math.floor(mid * 10 * 5);
    for (let i = 0; i < midCount && particlesRef.current.length < MAX_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      const particle: Particle = {
        id: particleIdRef.current++,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 4,
        color: '#2ecc71',
        life: 2000,
        maxLife: 2000,
        type: 'circle'
      };
      particlesRef.current.push(particle);
    }

    if (high > 0.3) {
      const highCount = Math.floor((high - 0.3) * 20);
      for (let i = 0; i < highCount && particlesRef.current.length < MAX_PARTICLES; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 4;
        const particle: Particle = {
          id: particleIdRef.current++,
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 4 + Math.random() * 6,
          color: '#ff6b6b',
          life: 2000,
          maxLife: 2000,
          type: 'star'
        };
        particlesRef.current.push(particle);
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = 0;

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      ctx.fillStyle = '#0f3460';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (isPlaying) {
        const { low, mid, high } = audioEngine.getBandLevels();
        addParticles(low, mid, high);

        const gradient = ctx.createLinearGradient(0, CANVAS_HEIGHT, 0, 0);
        gradient.addColorStop(0, '#00d2ff');
        gradient.addColorStop(1, '#3a7bd5');
        
        const barCount = 32;
        const barWidth = CANVAS_WIDTH / barCount - 2;
        const freqData = audioEngine.getFrequencyData();
        
        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor(i * freqData.length / barCount);
          const barHeight = (freqData[dataIndex] / 255) * (CANVAS_HEIGHT * 0.4);
          
          ctx.fillStyle = gradient;
          ctx.fillRect(
            i * (barWidth + 2),
            CANVAS_HEIGHT - barHeight - 10,
            barWidth,
            barHeight
          );
        }
      }

      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      
      particlesRef.current.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= deltaTime;
        
        const alpha = Math.max(0, particle.life / particle.maxLife);
        
        ctx.globalAlpha = alpha;
        
        if (particle.type === 'star') {
          drawStar(ctx, particle.x, particle.y, particle.radius, particle.color);
        } else {
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.globalAlpha = 1;
      });

      setParticleCount(particlesRef.current.length);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ 
        color: '#bdc3c7', 
        fontSize: '12px', 
        marginBottom: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        width: CANVAS_WIDTH
      }}>
        <span>🎨 可视化面板</span>
        <span>粒子: {particleCount}/{MAX_PARTICLES}</span>
      </div>
      
      <motion.div
        style={{
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          background: '#0f3460'
        }}
        animate={{
          boxShadow: isPlaying 
            ? ['0 4px 20px rgba(0, 210, 255, 0.2)', '0 4px 30px rgba(0, 210, 255, 0.4)', '0 4px 20px rgba(0, 210, 255, 0.2)']
            : '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
        transition={{
          duration: 2,
          repeat: isPlaying ? Infinity : 0,
          ease: 'easeInOut'
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            display: 'block'
          }}
        />
      </motion.div>

      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginTop: '12px', 
        fontSize: '11px',
        color: '#7f8c8d',
        width: CANVAS_WIDTH,
        justifyContent: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff' }}></div>
          <span>低频</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2ecc71' }}></div>
          <span>中频</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '8px', height: '8px', background: '#ff6b6b', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div>
          <span>高频</span>
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
