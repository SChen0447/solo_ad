import React from 'react';

interface InfoBarProps {
  peakFrequency: number;
  peakAmplitude: number;
  averageLoudness: number;
}

export const InfoBar: React.FC<InfoBarProps> = ({ peakFrequency, peakAmplitude, averageLoudness }) => {
  const clampedLoudness = Math.max(0, Math.min(1, averageLoudness));
  const loudnessPercent = clampedLoudness * 100;

  return (
    <div className="info-bar">
      <div className="info-item">
        <div className="info-label">峰值频率</div>
        <div className="info-value">
          <span className="value-number">{peakFrequency}</span>
          <span className="value-unit">Hz</span>
        </div>
      </div>
      <div className="info-divider"></div>
      <div className="info-item">
        <div className="info-label">幅度</div>
        <div className="info-value">
          <span className="value-number">{peakAmplitude.toFixed(1)}</span>
          <span className="value-unit">dB</span>
        </div>
      </div>
      <div className="info-divider"></div>
      <div className="info-item loudness-item">
        <div className="info-label">平均响度</div>
        <div className="loudness-bar-container">
          <div
            className="loudness-bar-fill"
            style={{ width: `${loudnessPercent}%` }}
          />
        </div>
        <div className="info-value loudness-value">
          <span className="value-number">{Math.round(loudnessPercent)}</span>
          <span className="value-unit">%</span>
        </div>
      </div>
    </div>
  );
};
