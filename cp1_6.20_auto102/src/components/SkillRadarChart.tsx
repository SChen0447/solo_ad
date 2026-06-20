import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SkillItem } from '../utils/api';

interface SkillRadarChartProps {
  skills: SkillItem[];
  size?: number;
}

const SkillRadarChart: React.FC<SkillRadarChartProps> = ({ skills, size = 400 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; score: number } | null>(null);
  const animationRef = useRef<number>(0);
  const animationProgressRef = useRef(0);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 60;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || skills.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const sides = Math.max(skills.length, 6);

    const draw = (progress: number) => {
      ctx.clearRect(0, 0, size, size);

      for (let level = 5; level >= 1; level--) {
        const levelRadius = (radius * level) / 5;
        ctx.beginPath();
        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 1;
        for (let i = 0; i < sides; i++) {
          const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
          const x = centerX + Math.cos(angle) * levelRadius;
          const y = centerY + Math.sin(angle) * levelRadius;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();
      }

      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(52, 152, 219, 0.15)';
      for (let i = 0; i < skills.length; i++) {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        const skillRadius = (radius * skills[i].score * progress) / 100;
        const x = centerX + Math.cos(angle) * skillRadius;
        const y = centerY + Math.sin(angle) * skillRadius;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      for (let i = 0; i < skills.length; i++) {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        const skillRadius = (radius * skills[i].score * progress) / 100;
        const x = centerX + Math.cos(angle) * skillRadius;
        const y = centerY + Math.sin(angle) * skillRadius;

        ctx.beginPath();
        ctx.arc(x, y, hoveredIndex === i ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = hoveredIndex === i ? '#c0392b' : '#e74c3c';
        ctx.fill();

        const labelRadius = radius + 25;
        const labelX = centerX + Math.cos(angle) * labelRadius;
        const labelY = centerY + Math.sin(angle) * labelRadius;
        ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#2c3e50';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(skills[i].name, labelX, labelY);
      }
    };

    const animate = () => {
      animationProgressRef.current += 0.04;
      if (animationProgressRef.current >= 1) {
        animationProgressRef.current = 1;
        draw(1);
        return;
      }
      draw(animationProgressRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationProgressRef.current = 0;
    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [skills, size, hoveredIndex, centerX, centerY, radius]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const sides = Math.max(skills.length, 6);
    let found = false;

    for (let i = 0; i < skills.length; i++) {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
      const skillRadius = (radius * skills[i].score) / 100;
      const dotX = centerX + Math.cos(angle) * skillRadius;
      const dotY = centerY + Math.sin(angle) * skillRadius;
      const distance = Math.sqrt((x - dotX) ** 2 + (y - dotY) ** 2);

      if (distance < 12) {
        setHoveredIndex(i);
        setTooltip({ x: e.clientX, y: e.clientY, name: skills[i].name, score: skills[i].score });
        found = true;
        break;
      }
    }

    if (!found) {
      setHoveredIndex(null);
      setTooltip(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setTooltip(null);
  };

  return (
    <div className="radar-chart-wrapper">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: hoveredIndex !== null ? 'pointer' : 'default' }}
      />
      {tooltip && (
        <motion.div
          className="radar-tooltip"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: 'fixed',
            left: tooltip.x + 15,
            top: tooltip.y - 10,
            zIndex: 100
          }}
        >
          <div className="tooltip-name">{tooltip.name}</div>
          <div className="tooltip-score">匹配度: {tooltip.score}%</div>
        </motion.div>
      )}
    </div>
  );
};

export default SkillRadarChart;
