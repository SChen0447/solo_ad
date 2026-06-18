import { create } from 'zustand'
import type { Poll, TimelinePoint } from '../../shared/types'

interface PollState {
  polls: Poll[]
  currentPoll: Poll | null
  timeline: TimelinePoint[]
  hasVoted: boolean
  error: string | null
  setPolls: (polls: Poll[]) => void
  setCurrentPoll: (poll: Poll | null) => void
  setTimeline: (points: TimelinePoint[]) => void
  setHasVoted: (voted: boolean) => void
  setError: (error: string | null) => void
}

const usePollStore = create<PollState>((set) => ({
  polls: [],
  currentPoll: null,
  timeline: [],
  hasVoted: false,
  error: null,
  setPolls: (polls) => set({ polls }),
  setCurrentPoll: (currentPoll) => set({ currentPoll }),
  setTimeline: (timeline) => set({ timeline }),
  setHasVoted: (hasVoted) => set({ hasVoted }),
  setError: (error) => set({ error }),
}))

export default usePollStore
