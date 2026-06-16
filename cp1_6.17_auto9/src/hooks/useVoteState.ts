import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Vote, CreateVoteData } from '@/types';

const STORAGE_KEY = 'voting-board-data';
const USER_ID_KEY = 'voting-board-user-id';

function getStoredUserId(): string {
  let userId = sessionStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = uuidv4();
    sessionStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

function getStoredVotes(): Vote[] {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

export function useVoteState() {
  const [votes, setVotes] = useState<Vote[]>(getStoredVotes);
  const [selectedVoteId, setSelectedVoteId] = useState<string | null>(null);
  const [currentUserId] = useState<string>(getStoredUserId);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
  }, [votes]);

  const createVote = useCallback((data: CreateVoteData): Vote => {
    const newVote: Vote = {
      id: uuidv4(),
      title: data.title,
      options: data.options.map((text) => ({
        id: uuidv4(),
        text,
        votes: 0,
      })),
      type: data.type,
      status: 'active',
      createdAt: Date.now(),
      voters: [],
    };

    setVotes((prev) => [newVote, ...prev]);
    return newVote;
  }, []);

  const submitVote = useCallback((voteId: string, optionIds: string[]): boolean => {
    let success = false;

    setVotes((prev) =>
      prev.map((vote) => {
        if (vote.id !== voteId) return vote;
        if (vote.status !== 'active') return vote;
        if (vote.voters.includes(currentUserId)) return vote;

        success = true;
        return {
          ...vote,
          options: vote.options.map((option) => ({
            ...option,
            votes: optionIds.includes(option.id) ? option.votes + 1 : option.votes,
          })),
          voters: [...vote.voters, currentUserId],
        };
      })
    );

    return success;
  }, [currentUserId]);

  const toggleVoteStatus = useCallback((voteId: string): void => {
    setVotes((prev) =>
      prev.map((vote) => {
        if (vote.id !== voteId) return vote;
        return {
          ...vote,
          status: vote.status === 'active' ? 'ended' : 'active',
        };
      })
    );
  }, []);

  const getVoteById = useCallback(
    (voteId: string): Vote | undefined => {
      return votes.find((v) => v.id === voteId);
    },
    [votes]
  );

  const hasVoted = useCallback(
    (voteId: string): boolean => {
      const vote = votes.find((v) => v.id === voteId);
      return vote ? vote.voters.includes(currentUserId) : false;
    },
    [votes, currentUserId]
  );

  return {
    votes,
    selectedVoteId,
    currentUserId,
    setSelectedVoteId,
    createVote,
    submitVote,
    toggleVoteStatus,
    getVoteById,
    hasVoted,
  };
}
