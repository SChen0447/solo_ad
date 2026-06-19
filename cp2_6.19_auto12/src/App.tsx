import { useState, useEffect } from 'react';
import CreatePoll from './CreatePoll';
import PollVote from './PollVote';

type View = 'create' | 'vote';

function getPollIdFromUrl(): string | null {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('poll/')) {
    return hash.slice(5);
  }
  return null;
}

function App() {
  const [view, setView] = useState<View>('create');
  const [pollId, setPollId] = useState<string | null>(null);

  useEffect(() => {
    const id = getPollIdFromUrl();
    if (id) {
      setPollId(id);
      setView('vote');
    }
  }, []);

  const handleCreateSuccess = (id: string) => {
    setPollId(id);
    window.location.hash = `poll/${id}`;
    setView('vote');
  };

  const handleBackToCreate = () => {
    window.location.hash = '';
    setPollId(null);
    setView('create');
  };

  const handleNavigateToVote = (id: string) => {
    setPollId(id);
    window.location.hash = `poll/${id}`;
    setView('vote');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>团队实时投票决策</h1>
        <p>快速发起投票，实时收集意见，高效协作决策</p>
      </header>

      {view === 'create' && (
        <CreatePoll onSuccess={handleCreateSuccess} />
      )}

      {view === 'vote' && pollId && (
        <PollVote
          pollId={pollId}
          onBack={handleBackToCreate}
          onNavigate={handleNavigateToVote}
        />
      )}
    </div>
  );
}

export default App;
