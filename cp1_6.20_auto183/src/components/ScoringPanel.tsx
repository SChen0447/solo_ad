import React from 'react';
import { motion } from 'framer-motion';
import { ScoreResult, GrammarError } from '../utils/textComparison';
import './ScoringPanel.css';

interface ScoringPanelProps {
  score: ScoreResult | null;
  currentRound: number;
  totalRounds: number;
  passedRounds: number;
  recognizedText: string;
  standardText: string;
}

const getScoreColor = (score: number): string => {
  const ratio = score / 100;
  const r = Math.round(255 * (1 - ratio) + 0 * ratio);
  const g = Math.round(68 * (1 - ratio) + 200 * ratio);
  const b = Math.round(68 * (1 - ratio) + 83 * ratio);
  return `rgb(${r}, ${g}, ${b})`;
};

const CircularProgress: React.FC<{ score: number; size?: number }> = ({ score, size = 120 }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="circular-progress-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="circular-progress">
        <circle
          className="progress-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          className="progress-fg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={color}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <motion.div 
        className="progress-text"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <span className="score-value">{score}</span>
        <span className="score-unit">分</span>
      </motion.div>
    </div>
  );
};

const BarProgress: React.FC<{ passed: number; total: number }> = ({ passed, total }) => {
  const percentage = total > 0 ? (passed / total) * 100 : 0;
  const color = getScoreColor(Math.round(percentage));

  return (
    <div className="bar-progress-container">
      <div className="bar-progress-header">
        <span className="bar-label">语法准确性</span>
        <span className="bar-value">{passed} / {total} 轮</span>
      </div>
      <div className="bar-progress-bg">
        <motion.div
          className="bar-progress-fg"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

const GrammarErrorList: React.FC<{ errors: GrammarError[] }> = ({ errors }) => {
  if (errors.length === 0) {
    return (
      <div className="grammar-no-errors">
        <span className="check-icon">✓</span>
        <span>未检测到明显语法错误</span>
      </div>
    );
  }

  return (
    <div className="grammar-errors-list">
      <h4 className="grammar-title">语法错误提示</h4>
      <ul>
        {errors.map((error, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="grammar-error-item"
          >
            <span className="error-type">{error.type}</span>
            <span className="error-message">{error.message}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
};

const ScoringPanel: React.FC<ScoringPanelProps> = ({
  score,
  currentRound,
  totalRounds,
  passedRounds,
  recognizedText,
  standardText,
}) => {
  const displayScore = score?.pronunciationScore ?? 0;

  return (
    <div className="scoring-panel">
      <div className="scoring-header">
        <h3>本轮评分</h3>
        <span className="round-info">第 {currentRound} / {totalRounds} 轮</span>
      </div>

      <div className="score-sections">
        <div className="pronunciation-section">
          <h4 className="section-title">发音准确度</h4>
          <CircularProgress score={displayScore} />
          <p className="score-status">
            {score?.isPassed ? (
              <span className="status-passed">✓ 通过</span>
            ) : score ? (
              <span className="status-failed">✗ 未通过</span>
            ) : (
              <span className="status-waiting">等待输入</span>
            )}
          </p>
        </div>

        <div className="grammar-section">
          <BarProgress passed={passedRounds} total={currentRound > 0 ? currentRound : 1} />
          {score && <GrammarErrorList errors={score.grammarErrors} />}
        </div>
      </div>

      {score && (
        <div className="text-comparison">
          <div className="comparison-row">
            <span className="comparison-label">你的回答：</span>
            <span className="comparison-text recognized">{recognizedText || '—'}</span>
          </div>
          <div className="comparison-row">
            <span className="comparison-label">标准答案：</span>
            <span className="comparison-text standard">{standardText}</span>
          </div>
        </div>
      )}

      {!score && (
        <div className="waiting-hint">
          <p>🎤 请在30秒内完成回答</p>
          <p className="hint-small">点击麦克风按钮开始录音</p>
        </div>
      )}
    </div>
  );
};

export default ScoringPanel;
