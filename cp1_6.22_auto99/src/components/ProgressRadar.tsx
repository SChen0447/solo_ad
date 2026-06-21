import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import type { Progress } from '../types';

interface ProgressRadarProps {
  progress: Progress;
  onClose: () => void;
}

export default function ProgressRadar({ progress, onClose }: ProgressRadarProps) {
  const data = [
    { subject: '技能', value: progress.skills, fullMark: 100 },
    { subject: '课程完成度', value: progress.courseCompletion, fullMark: 100 },
    { subject: '测试分数', value: progress.testScore, fullMark: 100 },
    { subject: '出席率', value: progress.attendance, fullMark: 100 },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content radar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="radar-title">{progress.employeeName} 学习进度雷达</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="radar-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="80%">
              <PolarGrid stroke="#4a5568" strokeOpacity={0.3} fill="transparent" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#ffffff', fontSize: 14 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#a0aec0', fontSize: 10 }}
                tickCount={5}
              />
              <Radar
                name="评分"
                dataKey="value"
                stroke="#667eea"
                fill="#667eea"
                fillOpacity={0.25}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="radar-stats">
          <div className="stat-item">
            <span className="stat-label">技能</span>
            <span className="stat-value">{progress.skills}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">课程完成度</span>
            <span className="stat-value">{progress.courseCompletion}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">测试分数</span>
            <span className="stat-value">{progress.testScore}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">出席率</span>
            <span className="stat-value">{progress.attendance}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
