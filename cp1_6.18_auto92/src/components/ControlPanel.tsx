import { useStarStore } from '../store/starStore';
import { STAGE_INFO, EvolutionStage, getEvolutionTimeline } from '../physics/starEvolution';

export default function ControlPanel() {
  const mass = useStarStore(state => state.mass);
  const setMass = useStarStore(state => state.setMass);
  const stage = useStarStore(state => state.stage);
  const setStage = useStarStore(state => state.setStage);
  const evolutionProgress = useStarStore(state => state.evolutionProgress);
  const setEvolutionProgress = useStarStore(state => state.setEvolutionProgress);
  const isPlaying = useStarStore(state => state.isPlaying);
  const togglePlay = useStarStore(state => state.togglePlay);
  const timeSpeed = useStarStore(state => state.timeSpeed);
  const setTimeSpeed = useStarStore(state => state.setTimeSpeed);
  const physicsState = useStarStore(state => state.physicsState);

  const stages: EvolutionStage[] = mass >= 8
    ? ['mainSequence', 'redGiant', 'supernova']
    : ['mainSequence', 'redGiant', 'whiteDwarf'];

  const timeline = getEvolutionTimeline(mass);

  const formatTemp = (temp: number) => {
    if (temp >= 1000000) return (temp / 1000000).toFixed(2) + ' M K';
    if (temp >= 1000) return (temp / 1000).toFixed(1) + ' K';
    return temp.toFixed(0) + ' K';
  };

  const formatRadius = (radius: number) => {
    return radius.toFixed(2) + ' R☉';
  };

  return (
    <div className="control-panel">
      <div className="panel-header">
        <h2>恒星演化控制台</h2>
        <p className="subtitle">Stellar Evolution Control</p>
      </div>

      <div className="panel-section">
        <label className="section-label">恒星质量</label>
        <div className="mass-display">
          <span className="mass-value">{mass.toFixed(1)}</span>
          <span className="mass-unit">M☉</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="50"
          step="0.1"
          value={mass}
          onChange={(e) => setMass(parseFloat(e.target.value))}
          className="mass-slider"
        />
        <div className="slider-labels">
          <span>0.5</span>
          <span>25</span>
          <span>50</span>
        </div>
      </div>

      <div className="panel-section">
        <label className="section-label">演化阶段</label>
        <div className="stage-buttons">
          {stages.map((s) => (
            <button
              key={s}
              className={`stage-btn ${stage === s ? 'active' : ''}`}
              onClick={() => setStage(s)}
            >
              <span className="stage-icon">{STAGE_INFO[s].icon}</span>
              <span className="stage-name">{STAGE_INFO[s].nameCN}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <label className="section-label">演化时间轴</label>
        <div className="timeline-container">
          <input
            type="range"
            min="0"
            max="0.999"
            step="0.001"
            value={evolutionProgress}
            onChange={(e) => setEvolutionProgress(parseFloat(e.target.value))}
            className="timeline-slider"
          />
          <div className="timeline-markers">
            {timeline.map((t, i) => (
              <div
                key={t.stage}
                className="timeline-marker"
                style={{ left: `${t.start * 100}%` }}
                title={STAGE_INFO[t.stage].nameCN}
              >
                {STAGE_INFO[t.stage].icon}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="playback-controls">
          <button
            className={`play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlay}
          >
            {isPlaying ? '⏸ 暂停' : '▶ 播放'}
          </button>
          <div className="speed-buttons">
            {[1, 3, 10].map((speed) => (
              <button
                key={speed}
                className={`speed-btn ${timeSpeed === speed ? 'active' : ''}`}
                onClick={() => setTimeSpeed(speed as 1 | 3 | 10)}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-section stats-section">
        <label className="section-label">当前状态</label>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">表面温度</span>
            <span className="stat-value">{formatTemp(physicsState.temperature)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">半径</span>
            <span className="stat-value">{formatRadius(physicsState.radius)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">阶段进度</span>
            <span className="stat-value">{(physicsState.stageProgress * 100).toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">粒子强度</span>
            <span className="stat-value">{physicsState.particleIntensity.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
