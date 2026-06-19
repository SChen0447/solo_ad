import React from 'react';
import { BarChart2, Sun, Wind } from 'lucide-react';
import type { Scheme } from '@/types';

interface ComparePanelProps {
  schemeA: Scheme;
  schemeB: Scheme;
  isOpen: boolean;
  onClose: () => void;
}

export const ComparePanel: React.FC<ComparePanelProps> = ({
  schemeA,
  schemeB,
  isOpen,
  onClose,
}) => {
  const maxSunshine = 12;
  const maxWindSpeed = 10;

  const sunshineA = schemeA.metrics.avgSunshineHours;
  const sunshineB = schemeB.metrics.avgSunshineHours;
  const windA = schemeA.metrics.avgWindSpeed;
  const windB = schemeB.metrics.avgWindSpeed;

  return (
    <div className={`compare-panel ${isOpen ? 'open' : ''}`}>
      <div className="compare-header">
        <h3 className="compare-title">
          <BarChart2 size={16} />
          方案对比
        </h3>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="compare-content">
        <div className="compare-item">
          <div className="compare-item-header">
            <Sun size={16} className="item-icon" />
            <span className="item-label">平均日照时长</span>
          </div>
          <div className="compare-bars">
            <div className="bar-row">
              <span className="bar-label">方案 A</span>
              <div className="bar-track">
                <div
                  className="bar-fill bar-sun"
                  style={{ width: `${(sunshineA / maxSunshine) * 100}%` }}
                />
              </div>
              <span className="bar-value">{sunshineA.toFixed(1)}h</span>
            </div>
            <div className="bar-row">
              <span className="bar-label">方案 B</span>
              <div className="bar-track">
                <div
                  className="bar-fill bar-sun"
                  style={{ width: `${(sunshineB / maxSunshine) * 100}%` }}
                />
              </div>
              <span className="bar-value">{sunshineB.toFixed(1)}h</span>
            </div>
          </div>
          <div className="compare-delta">
            {sunshineA > sunshineB ? (
              <span className="delta-positive">方案 A 多 {(sunshineA - sunshineB).toFixed(1)}h</span>
            ) : sunshineB > sunshineA ? (
              <span className="delta-positive">方案 B 多 {(sunshineB - sunshineA).toFixed(1)}h</span>
            ) : (
              <span className="delta-neutral">两方案持平</span>
            )}
          </div>
        </div>

        <div className="compare-item">
          <div className="compare-item-header">
            <Wind size={16} className="item-icon" />
            <span className="item-label">平均风速</span>
          </div>
          <div className="compare-bars">
            <div className="bar-row">
              <span className="bar-label">方案 A</span>
              <div className="bar-track">
                <div
                  className="bar-fill bar-wind"
                  style={{ width: `${(windA / maxWindSpeed) * 100}%` }}
                />
              </div>
              <span className="bar-value">{windA.toFixed(1)} m/s</span>
            </div>
            <div className="bar-row">
              <span className="bar-label">方案 B</span>
              <div className="bar-track">
                <div
                  className="bar-fill bar-wind"
                  style={{ width: `${(windB / maxWindSpeed) * 100}%` }}
                />
              </div>
              <span className="bar-value">{windB.toFixed(1)} m/s</span>
            </div>
          </div>
          <div className="compare-delta">
            {windA > windB ? (
              <span className="delta-negative">方案 A 大 {(windA - windB).toFixed(1)} m/s</span>
            ) : windB > windA ? (
              <span className="delta-negative">方案 B 大 {(windB - windA).toFixed(1)} m/s</span>
            ) : (
              <span className="delta-neutral">两方案持平</span>
            )}
          </div>
        </div>

        <div className="compare-summary">
          <h4 className="summary-title">综合评估</h4>
          <div className="summary-content">
            <p>
              {sunshineA + windA * 0.5 > sunshineB + windB * 0.5
                ? '方案 A 在日照和风环境综合表现上更优'
                : '方案 B 在日照和风环境综合表现上更优'}
            </p>
            <p className="summary-note">
              * 数据基于夏至日 6:00-18:00 平均日照时长与近地面平均风速估算
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparePanel;
