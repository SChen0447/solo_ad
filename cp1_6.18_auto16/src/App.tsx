import { useEffect, useState } from 'react';
import CreatePoll from './components/CreatePoll';
import VotePanel from './components/VotePanel';
import ResultChart from './components/ResultChart';
import { useVoteStore } from './store/useVoteStore';

function App() {
  const [pollId, setPollId] = useState<string | null>(null);
  const { pollData, connectSocket, clearPoll, error } = useVoteStore();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setPollId(hash);
      connectSocket();
    }
  }, [connectSocket]);

  useEffect(() => {
    if (pollId) {
      useVoteStore.getState().joinPoll(pollId);
    }
  }, [pollId]);

  const handlePollCreated = (newPollId: string, adminToken: string) => {
    window.location.hash = newPollId;
    useVoteStore.getState().setAdminToken(adminToken);
    setPollId(newPollId);
  };

  const handleBack = () => {
    window.location.hash = '';
    clearPoll();
    setPollId(null);
  };

  if (!pollId) {
    return <CreatePoll onPollCreated={handlePollCreated} />;
  }

  if (pollData?.isDestroyed) {
    return (
      <div className="app-container">
        <div className="card destroyed-card">
          <h1>该投票已被关闭</h1>
          <button className="btn btn-primary" onClick={handleBack}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {error && <div className="error-toast">{error}</div>}
      <div className="header-bar">
        <button className="back-btn" onClick={handleBack}>
          ← 创建新投票
        </button>
        {pollData && (
          <div className="online-badge">
            <span className="online-dot"></span>
            <span>{pollData.onlineCount} 人在线</span>
          </div>
        )}
      </div>

      <div className="content-grid">
        <VotePanel />
        <ResultChart />
      </div>
    </div>
  );
}

export default App;
