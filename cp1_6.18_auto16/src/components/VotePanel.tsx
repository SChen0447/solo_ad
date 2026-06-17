import { useEffect, useState } from 'react';
import { useVoteStore } from '../store/useVoteStore';

const VotePanel = () => {
  const {
    pollData,
    selectedOptionId,
    hasVoted,
    adminToken,
    isAdminMode,
    setSelectedOption,
    submitVote,
    resetPoll,
    destroyPoll,
    setAdminToken,
    toggleAdminMode,
  } = useVoteStore();

  const [adminInput, setAdminInput] = useState('');

  useEffect(() => {
    if (adminToken) {
      setAdminInput(adminToken);
    }
  }, [adminToken]);

  if (!pollData) {
    return (
      <div className="card">
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>
          加载中...
        </p>
      </div>
    );
  }

  const handleOptionClick = (optionId: string) => {
    if (hasVoted) return;
    setSelectedOption(selectedOptionId === optionId ? null : optionId);
  };

  const handleSubmit = () => {
    if (!selectedOptionId || hasVoted) return;
    submitVote();
  };

  const handleVerifyAdmin = () => {
    if (adminInput.length === 6) {
      setAdminToken(adminInput);
      toggleAdminMode();
    }
  };

  return (
    <div className="card">
      <h2 className="vote-panel-topic">{pollData.topic}</h2>

      <div className="vote-stats">
        <div>
          <strong>{pollData.totalVotes}</strong>
          已投票
        </div>
        <div>
          <strong>{pollData.options.length}</strong>
          个选项
        </div>
      </div>

      {hasVoted && (
        <div className="voted-banner">
          ✓ 您已成功投票，感谢参与！
        </div>
      )}

      <div className="vote-options-list">
        {pollData.options.map((option) => (
          <div
            key={option.id}
            className={`vote-option-item ${
              selectedOptionId === option.id ? 'selected' : ''
            } ${hasVoted ? 'voted' : ''}`}
            onClick={() => handleOptionClick(option.id)}
          >
            <div className="vote-radio">
              <div className="vote-radio-inner"></div>
            </div>
            <span className="vote-option-text">{option.text}</span>
          </div>
        ))}
      </div>

      <button
        className={`btn ${hasVoted ? 'btn-success' : 'btn-primary'} vote-submit-btn`}
        onClick={handleSubmit}
        disabled={!selectedOptionId || hasVoted}
      >
        {hasVoted ? '已投票' : '提交投票'}
      </button>

      <div className="admin-section">
        <button className="admin-toggle" onClick={toggleAdminMode}>
          {isAdminMode ? '隐藏管理选项' : '管理员入口'}
        </button>

        {isAdminMode && (
          <>
            {!adminToken ? (
              <>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="输入6位管理员令牌"
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                />
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px' }}
                  onClick={handleVerifyAdmin}
                  disabled={adminInput.length !== 6}
                >
                  验证令牌
                </button>
              </>
            ) : (
              <>
                <div className="admin-actions">
                  <button className="btn btn-secondary" onClick={resetPoll}>
                    重置投票
                  </button>
                  <button className="btn btn-danger" onClick={destroyPoll}>
                    销毁投票
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VotePanel;
