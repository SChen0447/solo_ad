import React, { useRef, useEffect } from 'react';

export interface InfoBarData {
  peakFrequency: number;
  peakAmplitude: number;
  averageLoudness: number;
}

interface InfoBarProps {
  initialData: InfoBarData;
  infoBarRef?: React.MutableRefObject<InfoBarHandle | null>;
}

export interface InfoBarHandle {
  updateData: (data: InfoBarData) => void;
}

export const InfoBar: React.FC<InfoBarProps> = ({ initialData, infoBarRef }) => {
  const freqRef = useRef<HTMLSpanElement>(null);
  const ampRef = useRef<HTMLSpanElement>(null);
  const loudnessBarRef = useRef<HTMLDivElement>(null);
  const loudnessValueRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (infoBarRef) {
      infoBarRef.current = {
        updateData: (data: InfoBarData) => {
          if (freqRef.current) {
            freqRef.current.textContent = String(data.peakFrequency);
          }
          if (ampRef.current) {
            ampRef.current.textContent = data.peakAmplitude.toFixed(1);
          }
          const clampedLoudness = Math.max(0, Math.min(1, data.averageLoudness));
          const loudnessPercent = Math.round(clampedLoudness * 100);
          if (loudnessBarRef.current) {
            loudnessBarRef.current.style.width = `${loudnessPercent}%`;
          }
          if (loudnessValueRef.current) {
            loudnessValueRef.current.textContent = String(loudnessPercent);
          }
        }
      };
    }

    if (freqRef.current) {
      freqRef.current.textContent = String(initialData.peakFrequency);
    }
    if (ampRef.current) {
      ampRef.current.textContent = initialData.peakAmplitude.toFixed(1);
    }
    const clampedLoudness = Math.max(0, Math.min(1, initialData.averageLoudness));
    const loudnessPercent = Math.round(clampedLoudness * 100);
    if (loudnessBarRef.current) {
      loudnessBarRef.current.style.width = `${loudnessPercent}%`;
    }
    if (loudnessValueRef.current) {
      loudnessValueRef.current.textContent = String(loudnessPercent);
    }
  }, []);

  return (
    <div className="info-bar">
      <div className="info-item">
        <div className="info-label">峰值频率</div>
        <div className="info-value">
          <span className="value-number" ref={freqRef}>0</span>
          <span className="value-unit">Hz</span>
        </div>
      </div>
      <div className="info-divider"></div>
      <div className="info-item">
        <div className="info-label">幅度</div>
        <div className="info-value">
          <span className="value-number" ref={ampRef}>0.0</span>
          <span className="value-unit">dB</span>
        </div>
      </div>
      <div className="info-divider"></div>
      <div className="info-item loudness-item">
        <div className="info-label">平均响度</div>
        <div className="loudness-bar-container">
          <div
            className="loudness-bar-fill"
            ref={loudnessBarRef}
            style={{ width: '0%' }}
          />
        </div>
        <div className="info-value loudness-value">
          <span className="value-number" ref={loudnessValueRef}>0</span>
          <span className="value-unit">%</span>
        </div>
      </div>
    </div>
  );
};
