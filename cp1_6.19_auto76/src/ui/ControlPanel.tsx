import { useState } from 'react';
import { useSimulationStore } from '../store/store';
import type { SchedulingStrategy } from '../types';
import './ControlPanel.css';

const strategies: { value: SchedulingStrategy; label: string; description: string }[] = [
  { value: 'astar', label: '最短路径', description: 'A* 算法寻找最优路径' },
  { value: 'load_balance', label: '负载均衡', description: '按机场拥挤度分配任务' },
  { value: 'priority', label: '紧急优先', description: '按包裹优先级插队' },
];

export function ControlPanel() {
  const strategy = useSimulationStore((state) => state.strategy);
  const speedMultiplier = useSimulationStore((state) => state.speedMultiplier);
  const isRunning = useSimulationStore((state) => state.isRunning);
  const setStrategy = useSimulationStore((state) => state.setStrategy);
  const setSpeedMultiplier = useSimulationStore((state) => state.setSpeedMultiplier);
  const toggleRunning = useSimulationStore((state) => state.toggleRunning);
  const generateNewTasks = useSimulationStore((state) => state.generateNewTasks);

  const [pulsingStrategy, setPulsingStrategy] = useState<string | null>(null);

  const handleStrategyChange = (newStrategy: SchedulingStrategy) => {
    if (newStrategy === strategy) return;

    setPulsingStrategy(newStrategy);
    setStrategy(newStrategy);

    setTimeout(() => {
      setPulsingStrategy(null);
    }, 200);
  };

  const handleGenerateTasks = () => {
    generateNewTasks(5);
  };

  return (
    <div className="control-panel">
      <h2 className="panel-title">调度控制台</h2>

      <div className="panel-section">
        <h3 className="section-title">调度策略</h3>
        <div className="strategy-buttons">
          {strategies.map((s) => (
            <button
              key={s.value}
              className={`strategy-btn ${strategy === s.value ? 'active' : ''} ${
                pulsingStrategy === s.value ? 'pulse' : ''
              }`}
              onClick={() => handleStrategyChange(s.value)}
            >
              <span className="strategy-label">{s.label}</span>
              <span className="strategy-desc">{s.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h3 className="section-title">模拟速度</h3>
        <div className="speed-control">
          <span className="speed-label">0.5x</span>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={speedMultiplier}
            onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
            className="speed-slider"
          />
          <span className="speed-label">5x</span>
        </div>
        <div className="speed-value">{speedMultiplier.toFixed(1)}x</div>
      </div>

      <div className="panel-section">
        <button
          className={`control-btn ${isRunning ? 'pause' : 'play'}`}
          onClick={toggleRunning}
        >
          {isRunning ? '⏸ 暂停模拟' : '▶ 开始模拟'}
        </button>
      </div>

      <div className="panel-section">
        <button className="generate-btn" onClick={handleGenerateTasks}>
          ✦ 生成新任务
        </button>
        <p className="hint-text">点击后 10 秒内随机生成 5 个新包裹</p>
      </div>
    </div>
  );
}
