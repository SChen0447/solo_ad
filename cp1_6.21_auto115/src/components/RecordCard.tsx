import React, { useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Star, Clock, Thermometer, Droplets, Coffee, Scale } from 'lucide-react';
import type { BrewRecord } from '../types';
import { ROAST_LABELS, FLAVOR_TAG_LABELS } from '../types';

interface RecordCardProps {
  record: BrewRecord;
  onEvaluate: (record: BrewRecord) => void;
}

const getScoreGradient = (score: number | undefined): string => {
  if (!score) return 'linear-gradient(135deg, #F5E6D3 0%, #E8D5BC 100%)';
  const ratio = (score - 1) / 4;
  const r = Math.round(255 - ratio * (255 - 60));
  const g = Math.round(220 - ratio * (220 - 30));
  const b = Math.round(150 - ratio * (150 - 15));
  const r2 = Math.round(230 - ratio * (230 - 30));
  const g2 = Math.round(190 - ratio * (190 - 15));
  const b2 = Math.round(120 - ratio * (120 - 5));
  return `linear-gradient(135deg, rgb(${r},${g},${b}) 0%, rgb(${r2},${g2},${b2}) 100%)`;
};

const RecordCard: React.FC<RecordCardProps> = ({ record, onEvaluate }) => {
  const [isHovered, setIsHovered] = useState(false);

  const score = record.flavorEval?.overallScore;
  const date = format(new Date(record.createdAt), 'MM月dd日 HH:mm', {
    locale: zhCN,
  });

  return (
    <div
      style={{
        position: 'relative',
        background: getScoreGradient(score),
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'transform 250ms ease, box-shadow 250ms ease',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered
          ? '0 12px 24px rgba(139, 94, 60, 0.25)'
          : '0 4px 12px rgba(139, 94, 60, 0.12)',
        overflow: 'hidden',
        color: score && score > 3 ? '#fff' : '#5D4037',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onEvaluate(record)}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '6px',
          background: 'linear-gradient(180deg, #FF6B9D 0%, #9B59B6 100%)',
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'opacity 300ms ease, transform 300ms ease',
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '12px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '13px',
              opacity: 0.8,
              marginBottom: '4px',
            }}
          >
            #{record.recordNumber}
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            {record.coffeeName}
          </div>
        </div>
        {score !== undefined && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
              padding: '6px 10px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            <Star size={14} fill="currentColor" />
            {score.toFixed(1)}
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: '13px',
          marginBottom: '16px',
          opacity: 0.85,
        }}
      >
        {ROAST_LABELS[record.roastLevel]} · {date}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Scale size={14} />
          <span>研磨度 {record.grindSize}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Thermometer size={14} />
          <span>{record.waterTemp}°C</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Coffee size={14} />
          <span>1:{record.ratio}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Droplets size={14} />
          <span>注水 {record.totalTime}s</span>
        </div>
      </div>

      {record.flavorEval && (
        <div
          style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              marginBottom: '8px',
            }}
          >
            {record.flavorEval.flavorTags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                }}
              >
                {FLAVOR_TAG_LABELS[tag]}
              </span>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              opacity: 0.8,
            }}
          >
            <span>酸{record.flavorEval.acidity}</span>
            <span>甜{record.flavorEval.sweetness}</span>
            <span>苦{record.flavorEval.bitterness}</span>
            <span>醇{record.flavorEval.body}</span>
          </div>
        </div>
      )}

      {!record.flavorEval && (
        <div
          style={{
            marginTop: '16px',
            textAlign: 'center',
            padding: '10px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          点击进行风味评价
        </div>
      )}
    </div>
  );
};

export default RecordCard;
