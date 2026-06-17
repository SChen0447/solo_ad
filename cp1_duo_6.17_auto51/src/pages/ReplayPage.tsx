import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/gameStore';
import ReplayViewer from '../components/replay/ReplayViewer';
import './ReplayPage.css';

export default function ReplayPage() {
  const { state } = useAppStore();
  const navigate = useNavigate();

  const hasBattle = state.currentBattle && state.currentFrames.length > 0;

  return (
    <div className="replay-page">
      <div className="replay-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← 返回编队
        </button>
        <h2>战斗回放</h2>
        <div className="replay-info">
          {state.currentBattle && (
            <>
              <span>共 {state.currentBattle.totalTurns} 回合</span>
              <span>·</span>
              <span>{state.currentBattle.frames.length} 帧</span>
            </>
          )}
        </div>
      </div>

      <div className="replay-content">
        {hasBattle ? (
          <ReplayViewer />
        ) : (
          <div className="no-replay">
            <div className="no-replay-icon">🎬</div>
            <div className="no-replay-text">暂无回放数据</div>
            <div className="no-replay-sub">请先完成一场推演</div>
            <button className="go-btn" onClick={() => navigate('/')}>
              去编队
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
