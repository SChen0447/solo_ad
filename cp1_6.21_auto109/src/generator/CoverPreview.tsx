import React, { forwardRef, memo } from 'react';
import type { Template } from '@/types';
import WavePattern from './WavePattern';
import { v4 as uuidv4 } from 'uuid';

interface CoverPreviewProps {
  template: Template;
  waveData: number[];
  showName: string;
  episodeTitle: string;
  guestName: string;
}

const CoverPreview = memo(
  forwardRef<HTMLElement, CoverPreviewProps>(function CoverPreview(
    { template, waveData, showName, episodeTitle, guestName },
    ref
  ) {
    const gradientId = `cover-wave-${uuidv4().slice(0, 8)}`;
    const bgId = `cover-bg-${uuidv4().slice(0, 8)}`;

    const W = 400;
    const H = 400;

    const displayShowName = showName || '节目名称';
    const displayEpisodeTitle = episodeTitle || '单集标题';
    const displayGuest = guestName || '嘉宾姓名';

    return (
      <div
        className="cover-wrapper"
        style={{
          width: W,
          height: H,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,92,252,0.1)',
        }}
      >
        <section
          ref={ref as React.RefObject<HTMLElement>}
          style={{
            width: W,
            height: H,
            position: 'relative',
            fontFamily: template.fontFamily,
            color: template.textColor,
          }}
          data-cover="true"
        >
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={{ position: 'absolute', top: 0, left: 0, display: 'block' }}
          >
            <defs>
              <linearGradient id={bgId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={template.bgGradient[0]} />
                <stop offset="100%" stopColor={template.bgGradient[1]} />
              </linearGradient>
              <filter id="coverGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="12" result="blur" />
                <feColorMatrix
                  in="blur"
                  type="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.35 0"
                />
              </filter>
            </defs>
            <rect width={W} height={H} fill={`url(#${bgId})`} />
            <circle
              cx={W * 0.85}
              cy={H * 0.15}
              r={80}
              fill={template.primary}
              opacity={0.15}
              filter="url(#coverGlow)"
            />
            <circle
              cx={W * 0.1}
              cy={H * 0.9}
              r={100}
              fill={template.secondary}
              opacity={0.1}
              filter="url(#coverGlow)"
            />
            <WavePattern
              data={waveData}
              primary={template.primary}
              secondary={template.secondary}
              width={W}
              height={H}
              gradientId={gradientId}
              opacity={template.waveOpacity}
            />
          </svg>

          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: W,
              height: H,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 32px',
              textAlign: 'center',
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontSize: 12,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                opacity: 0.6,
                marginBottom: 12,
                fontWeight: 600,
                color: template.textColor,
              }}
            >
              PODCAST
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                lineHeight: 1.2,
                marginBottom: 28 * 1.2,
                wordBreak: 'break-word',
                maxWidth: '100%',
                color: template.textColor,
                textShadow: `0 2px 20px ${template.primary}50`,
                fontFamily: template.fontFamily,
              }}
            >
              {displayShowName}
            </div>

            <div
              style={{
                fontSize: 18,
                fontStyle: 'italic',
                fontWeight: 500,
                lineHeight: 1.35,
                marginBottom: 18 * 1.2,
                wordBreak: 'break-word',
                maxWidth: '100%',
                opacity: 0.92,
                color: template.textColor,
                fontFamily: template.fontFamily,
              }}
            >
              {displayEpisodeTitle}
            </div>

            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.5px',
                opacity: 0.75,
                color: template.textColor,
                fontFamily: template.fontFamily,
              }}
            >
              with <span style={{ fontWeight: 700 }}>{displayGuest}</span>
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: 24,
                left: 0,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 2,
                  borderRadius: 2,
                  background: `linear-gradient(90deg, ${template.primary}, ${template.secondary})`,
                  opacity: 0.8,
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: template.secondary,
                  opacity: 0.9,
                  boxShadow: `0 0 8px ${template.secondary}`,
                }}
              />
              <div
                style={{
                  width: 20,
                  height: 2,
                  borderRadius: 2,
                  background: `linear-gradient(90deg, ${template.secondary}, ${template.primary})`,
                  opacity: 0.8,
                }}
              />
            </div>
          </div>
        </section>
      </div>
    );
  })
);

export default CoverPreview;
