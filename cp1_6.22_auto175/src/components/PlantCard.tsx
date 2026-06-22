import React, { useState } from 'react';
import { Plant, getPlantType, STAGE_NAMES, STAGE_ICONS, GROWTH_STAGES } from '../utils/plantEngine';

interface PlantCardProps {
  plant: Plant;
  compact?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.MouseEvent | React.TouchEvent) => void;
  isDragging?: boolean;
  style?: React.CSSProperties;
}

function interpolateColor(health: number): string {
  const h = Math.max(0, Math.min(100, health));
  if (h >= 100) return '#51cf66';
  if (h <= 0) return '#ff6b6b';
  const danger = { r: 255, g: 107, b: 107 };
  const healthy = { r: 81, g: 207, b: 102 };
  const ratio = h / 100;
  const r = Math.round(danger.r + (healthy.r - danger.r) * ratio);
  const g = Math.round(danger.g + (healthy.g - danger.g) * ratio);
  const b = Math.round(danger.b + (healthy.b - danger.b) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

export const PlantCard: React.FC<PlantCardProps> = ({
  plant,
  compact = false,
  onClick,
  onDragStart,
  isDragging = false,
  style
}) => {
  const plantType = getPlantType(plant.typeId);
  const [pressTimer, setPressTimer] = useState<number | null>(null);

  const healthColor = plant.isWithered ? '#94a3b8' : interpolateColor(plant.health);
  const isLowHealth = !plant.isWithered && plant.health < 30;
  const stageIndex = GROWTH_STAGES.indexOf(plant.stage);
  const progressPercent = Math.round(plant.growthProgress);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!compact) return;
    const timer = window.setTimeout(() => {
      onDragStart?.(e);
    }, 300);
    setPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (pressTimer !== null) {
      window.clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const handleMouseLeave = () => {
    if (pressTimer !== null) {
      window.clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!compact) return;
    const timer = window.setTimeout(() => {
      onDragStart?.(e);
    }, 300);
    setPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (pressTimer !== null) {
      window.clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  if (compact) {
    return (
      <div
        className={`plant-card-compact ${isDragging ? 'dragging' : ''} ${plant.stageAnimating ? 'stage-animate' : ''}`}
        onClick={(e) => {
          if (pressTimer === null) onClick?.();
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          background: `linear-gradient(135deg, ${healthColor}22, ${healthColor}44)`,
          borderColor: isLowHealth ? '#ff6b6b' : `${healthColor}88`,
          ...style
        }}
      >
        <div className="card-icon" style={{ filter: plant.isWithered ? 'grayscale(1)' : 'none' }}>
          {plantType?.icon || STAGE_ICONS[plant.stage]}
        </div>
        <div className="card-name">{plant.name}</div>
        <div className="card-stage">{STAGE_ICONS[plant.stage]} {STAGE_NAMES[plant.stage]}</div>
        <div className="mini-progress">
          <div
            className="mini-progress-fill"
            style={{ width: `${progressPercent}%`, backgroundColor: healthColor }}
          />
        </div>
        <div className="mini-health">
          <span style={{ color: healthColor }}>♥</span> {Math.round(plant.health)}%
        </div>
        <style>{`
          .plant-card-compact {
            width: 100%;
            height: 100%;
            border-radius: 12px;
            border: 2px solid;
            padding: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
            box-sizing: border-box;
            user-select: none;
            gap: 2px;
          }
          .plant-card-compact:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.12);
          }
          .plant-card-compact.dragging {
            opacity: 0.5;
            cursor: grabbing;
            pointer-events: none;
          }
          .plant-card-compact.stage-animate {
            animation: stage-scale-rotate 0.8s ease-in-out;
          }
          @keyframes stage-scale-rotate {
            0% { transform: scale(1) rotate(0deg); }
            50% { transform: scale(1.1) rotate(180deg); }
            100% { transform: scale(1) rotate(360deg); }
          }
          .card-icon {
            font-size: 28px;
            line-height: 1;
          }
          .card-name {
            font-size: 12px;
            font-weight: 600;
            color: #1e293b;
          }
          .card-stage {
            font-size: 10px;
            color: #64748b;
          }
          .mini-progress {
            width: 90%;
            height: 4px;
            background: #e2e8f0;
            border-radius: 2px;
            overflow: hidden;
          }
          .mini-progress-fill {
            height: 100%;
            transition: width 0.3s ease;
          }
          .mini-health {
            font-size: 10px;
            font-weight: 600;
          }
          @keyframes border-blink {
            0%, 100% { border-color: #ff6b6b; }
            50% { border-color: #ffc9c9; }
          }
          .plant-card-compact[style*="border-color: rgb(255, 107, 107)"] {
            animation: border-blink 0.5s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className={`plant-card ${isLowHealth ? 'low-health' : ''} ${plant.stageAnimating ? 'stage-animate' : ''}`}
      onClick={onClick}
      style={{
        background: `linear-gradient(145deg, ${healthColor}, ${healthColor}dd)`,
        filter: plant.isWithered ? 'grayscale(1)' : 'none'
      }}
    >
      <div className="plant-header">
        <span className="plant-icon">{plantType?.icon}</span>
        <span className="plant-stage-icon">{STAGE_ICONS[plant.stage]}</span>
      </div>
      <h3 className="plant-name">{plant.name}</h3>
      <p className="plant-species">{plantType?.species}</p>
      <div className="stage-info">
        <span className="stage-label">生长阶段</span>
        <span className="stage-value">{STAGE_NAMES[plant.stage]}</span>
      </div>
      <div className="progress-section">
        <div className="progress-label">
          <span>阶段进度</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, #ffffff, #f0fdf4)`
            }}
          />
        </div>
      </div>
      <div className="stage-dots">
        {GROWTH_STAGES.map((s, i) => (
          <div
            key={s}
            className={`stage-dot ${i < stageIndex ? 'passed' : ''} ${i === stageIndex ? 'current' : ''}`}
          />
        ))}
      </div>
      <div className="health-section">
        <div className="health-label">
          <span>健康度</span>
          <span className="health-value" style={{ color: plant.isWithered ? '#94a3b8' : '#ffffff' }}>
            {Math.round(plant.health)}%
          </span>
        </div>
        <div className="health-bar">
          <div
            className="health-fill"
            style={{
              width: `${plant.health}%`,
              background: plant.isWithered ? '#94a3b8' : '#ffffff'
            }}
          />
        </div>
      </div>
      <style>{`
        .plant-card {
          width: 220px;
          height: 300px;
          border-radius: 16px;
          padding: 20px;
          box-sizing: border-box;
          color: white;
          cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          user-select: none;
        }
        .plant-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 28px rgba(0,0,0,0.2);
        }
        .plant-card.low-health {
          animation: border-blink 0.5s ease-in-out infinite;
        }
        @keyframes border-blink {
          0%, 100% { box-shadow: 0 4px 12px rgba(0,0,0,0.1), 0 0 0 3px rgba(255,107,107,0.5); }
          50% { box-shadow: 0 4px 12px rgba(0,0,0,0.1), 0 0 0 3px rgba(255,107,107,0.1); }
        }
        .plant-card.stage-animate {
          animation: stage-scale-rotate 0.8s ease-in-out;
        }
        @keyframes stage-scale-rotate {
          0% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(180deg); }
          100% { transform: scale(1) rotate(360deg); }
        }
        .plant-header {
          display: flex;
          gap: 12px;
          font-size: 36px;
          margin-bottom: 12px;
        }
        .plant-name {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
        }
        .plant-species {
          margin: 4px 0 16px 0;
          font-size: 12px;
          opacity: 0.9;
          font-style: italic;
        }
        .stage-info {
          width: 100%;
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 13px;
        }
        .stage-label { opacity: 0.9; }
        .stage-value { font-weight: 600; }
        .progress-section { width: 100%; margin-bottom: 12px; }
        .progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 4px;
          opacity: 0.9;
        }
        .progress-bar {
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,0.3);
          border-radius: 3px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
          border-radius: 3px;
        }
        .stage-dots {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .stage-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255,255,255,0.3);
          transition: all 0.3s ease;
        }
        .stage-dot.passed {
          background: rgba(255,255,255,0.9);
        }
        .stage-dot.current {
          background: white;
          box-shadow: 0 0 8px rgba(255,255,255,0.8);
        }
        .health-section {
          width: 100%;
          margin-top: auto;
        }
        .health-label {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 4px;
          opacity: 0.95;
        }
        .health-value { font-weight: 700; }
        .health-bar {
          width: 100%;
          height: 10px;
          background: rgba(255,255,255,0.25);
          border-radius: 5px;
          overflow: hidden;
        }
        .health-fill {
          height: 100%;
          transition: width 0.3s ease;
          border-radius: 5px;
        }
        @media (max-width: 768px) {
          .plant-card {
            width: 140px;
            height: 240px;
            padding: 12px;
          }
          .plant-header { font-size: 28px; }
          .plant-name { font-size: 16px; }
        }
      `}</style>
    </div>
  );
};

export default PlantCard;
