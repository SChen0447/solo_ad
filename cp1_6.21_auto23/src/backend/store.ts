import { v4 as uuidv4 } from 'uuid';

export interface VoteOption {
  id: string;
  text: string;
  votes: number;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  options: VoteOption[];
  createdAt: number;
  deadline: number | null;
  totalVotes: number;
}

export interface VoteRecord {
  activityId: string;
  optionId: string;
  userId: string;
  votedAt: number;
}

export interface UserVoteHistory {
  activityId: string;
  activityTitle: string;
  optionId: string;
  optionText: string;
  votedAt: number;
}

class MemoryStore {
  private activities: Map<string, Activity> = new Map();
  private votes: Map<string, VoteRecord> = new Map();

  createActivity(
    title: string,
    description: string,
    options: string[],
    deadline: number | null
  ): Activity {
    const id = uuidv4();
    const activity: Activity = {
      id,
      title,
      description,
      options: options.map((text) => ({
        id: uuidv4(),
        text,
        votes: 0,
      })),
      createdAt: Date.now(),
      deadline,
      totalVotes: 0,
    };
    this.activities.set(id, activity);
    return activity;
  }

  getActivity(id: string): Activity | null {
    return this.activities.get(id) || null;
  }

  getAllActivities(): Activity[] {
    return Array.from(this.activities.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }

  vote(activityId: string, optionId: string, userId: string): Activity | null {
    const activity = this.activities.get(activityId);
    if (!activity) return null;

    const option = activity.options.find((o) => o.id === optionId);
    if (!option) return null;

    const voteKey = `${userId}-${activityId}`;
    const existingVote = this.votes.get(voteKey);

    if (existingVote) {
      if (existingVote.optionId === optionId) {
        return activity;
      }
      const prevOption = activity.options.find(
        (o) => o.id === existingVote.optionId
      );
      if (prevOption) {
        prevOption.votes--;
      }
    } else {
      activity.totalVotes++;
    }

    option.votes++;
    this.votes.set(voteKey, {
      activityId,
      optionId,
      userId,
      votedAt: Date.now(),
    });

    return activity;
  }

  unvote(activityId: string, userId: string): Activity | null {
    const activity = this.activities.get(activityId);
    if (!activity) return null;

    const voteKey = `${userId}-${activityId}`;
    const existingVote = this.votes.get(voteKey);
    if (!existingVote) return activity;

    const option = activity.options.find(
      (o) => o.id === existingVote.optionId
    );
    if (option) {
      option.votes--;
    }

    activity.totalVotes--;
    this.votes.delete(voteKey);

    return activity;
  }

  getUserVote(activityId: string, userId: string): VoteRecord | null {
    const voteKey = `${userId}-${activityId}`;
    return this.votes.get(voteKey) || null;
  }

  getUserVoteHistory(userId: string): UserVoteHistory[] {
    const history: UserVoteHistory[] = [];
    for (const vote of this.votes.values()) {
      if (vote.userId === userId) {
        const activity = this.activities.get(vote.activityId);
        if (activity) {
          const option = activity.options.find(
            (o) => o.id === vote.optionId
          );
          if (option) {
            history.push({
              activityId: activity.id,
              activityTitle: activity.title,
              optionId: option.id,
              optionText: option.text,
              votedAt: vote.votedAt,
            });
          }
        }
      }
    }
    return history.sort((a, b) => b.votedAt - a.votedAt);
  }

  getOptionRankings(activityId: string): VoteOption[] | null {
    const activity = this.activities.get(activityId);
    if (!activity) return null;

    return [...activity.options].sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.id.localeCompare(b.id);
    });
  }
}

export const store = new MemoryStore();
