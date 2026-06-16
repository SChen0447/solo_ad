import { useCallback } from 'react';
import { Vote } from 'lucide-react';
import { VoteForm } from '@/components/VoteForm';
import { VoteList } from '@/components/VoteList';
import { VoteDetail } from '@/components/VoteDetail';
import { useVoteState } from '@/hooks/useVoteState';
import type { CreateVoteData } from '@/types';

export default function App() {
  const {
    votes,
    selectedVoteId,
    setSelectedVoteId,
    createVote,
    submitVote,
    toggleVoteStatus,
    getVoteById,
    hasVoted,
  } = useVoteState();

  const handleCreateVote = useCallback(
    (data: CreateVoteData) => {
      const newVote = createVote(data);
      setSelectedVoteId(null);
      return newVote;
    },
    [createVote, setSelectedVoteId]
  );

  const handleSelectVote = useCallback(
    (voteId: string) => {
      setSelectedVoteId(voteId);
    },
    [setSelectedVoteId]
  );

  const handleBack = useCallback(() => {
    setSelectedVoteId(null);
  }, [setSelectedVoteId]);

  const handleVote = useCallback(
    (optionIds: string[]) => {
      if (!selectedVoteId) return false;
      return submitVote(selectedVoteId, optionIds);
    },
    [selectedVoteId, submitVote]
  );

  const handleToggleStatus = useCallback(() => {
    if (selectedVoteId) {
      toggleVoteStatus(selectedVoteId);
    }
  }, [selectedVoteId, toggleVoteStatus]);

  const selectedVote = selectedVoteId ? getVoteById(selectedVoteId) : undefined;
  const userHasVoted = selectedVoteId ? hasVoted(selectedVoteId) : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white py-6 md:py-8 shadow-lg">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Vote className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">实时投票决策看板</h1>
              <p className="text-blue-200 text-sm mt-0.5">
                快速创建匿名投票，高效统计决策结果
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        {selectedVote ? (
          <VoteDetail
            vote={selectedVote}
            hasVoted={userHasVoted}
            onVote={handleVote}
            onToggleStatus={handleToggleStatus}
            onBack={handleBack}
          />
        ) : (
          <>
            <VoteForm onSubmit={handleCreateVote} />

            <div className="mt-8">
              <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
                  {votes.length}
                </span>
                投票列表
              </h2>
              <VoteList votes={votes} onSelect={handleSelectVote} />
            </div>
          </>
        )}
      </main>

      <footer className="py-6 text-center text-gray-400 text-sm">
        <p>© 2024 实时投票决策看板 - 让团队决策更高效</p>
      </footer>
    </div>
  );
}
