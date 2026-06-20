import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CombatEvent } from '../../types';

interface LogImporterProps {
  onParse: (file: File) => Promise<{ success: boolean; total: number; events: CombatEvent[] }>;
  onComplete: (events: CombatEvent[]) => void;
}

const LogImporter = ({ onParse, onComplete }: LogImporterProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState({ total: 0, timeSpan: '', topDamage: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      alert('请上传 .csv 或 .txt 格式的文件');
      return;
    }

    setIsParsing(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 5;
      });
    }, 100);

    try {
      const result = await onParse(file);
      if (result.success) {
        setProgress(100);

        if (result.events.length > 0) {
          const timestamps = result.events.map((e) => new Date(e.timestamp).getTime());
          const minTime = new Date(Math.min(...timestamps));
          const maxTime = new Date(Math.max(...timestamps));
          const timeSpan = `${minTime.toLocaleDateString()} ~ ${maxTime.toLocaleDateString()}`;

          const damageByMonster: Record<string, number> = {};
          result.events.forEach((e) => {
            damageByMonster[e.monster_name] = (damageByMonster[e.monster_name] || 0) + e.damage;
          });
          const topDamage = Object.entries(damageByMonster).sort((a, b) => b[1] - a[1])[0]?.[0] || '无';

          setSummary({
            total: result.total,
            timeSpan,
            topDamage,
          });
          setShowSummary(true);
          onComplete(result.events);
        }
      }
    } catch (error) {
      console.error('解析失败:', error);
      alert('解析失败，请检查文件格式');
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsParsing(false);
        setProgress(0);
      }, 500);
    }
  }, [onParse, onComplete]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="log-importer">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="drop-zone-icon">📄</div>
        <p className="drop-zone-text">拖拽文件到此处，或点击上传</p>
        <p className="drop-zone-hint">支持 .csv 和 .txt 格式</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
      </div>

      <AnimatePresence>
        {isParsing && (
          <motion.div
            className="progress-container"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="progress-text">解析中... {Math.round(progress)}%</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSummary && (
          <motion.div
            className="summary-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSummary(false)}
          >
            <motion.div
              className="summary-content"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>数据概览</h3>
              <div className="summary-item">
                <span className="summary-label">总日志条目：</span>
                <span className="summary-value">{summary.total} 条</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">时间跨度：</span>
                <span className="summary-value">{summary.timeSpan}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">最高伤害单体：</span>
                <span className="summary-value highlight">{summary.topDamage}</span>
              </div>
              <button className="btn-primary" onClick={() => setShowSummary(false)}>
                确定
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LogImporter;
