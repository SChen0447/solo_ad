import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Card } from '@/data/cards'

interface GameState {
  coins: number
  collectedIds: string[]
  pitySR: number
  pitySSR: number
  totalPulls: number
  pulledCards: Card[]

  addCoins: (amount: number) => void
  spendCoins: (amount: number) => boolean
  addCollectedCard: (cardId: string) => void
  setPity: (pitySR: number, pitySSR: number) => void
  incrementTotalPulls: (count: number) => void
  setPulledCards: (cards: Card[]) => void
  removeCardsForEvolution: (cardIds: string[]) => void
  evolveCard: (newCardId: string, consumedCardIds: string[], coinCost: number) => void
  resetGame: () => void
}

const initialState = {
  coins: 50,
  collectedIds: [] as string[],
  pitySR: 0,
  pitySSR: 0,
  totalPulls: 0,
  pulledCards: [] as Card[],
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialState,

      addCoins: (amount) =>
        set((state) => ({ coins: state.coins + amount })),

      spendCoins: (amount) => {
        const { coins } = get()
        if (coins < amount) return false
        set({ coins: coins - amount })
        return true
      },

      addCollectedCard: (cardId) =>
        set((state) => {
          if (state.collectedIds.includes(cardId)) return state
          return { collectedIds: [...state.collectedIds, cardId] }
        }),

      setPity: (pitySR, pitySSR) => set({ pitySR, pitySSR }),

      incrementTotalPulls: (count) =>
        set((state) => ({ totalPulls: state.totalPulls + count })),

      setPulledCards: (cards) => set({ pulledCards: cards }),

      removeCardsForEvolution: (cardIds) =>
        set((state) => ({
          collectedIds: state.collectedIds.filter(
            (id) => !cardIds.includes(id)
          ),
        })),

      evolveCard: (newCardId, consumedCardIds, coinCost) => {
        const { coins, collectedIds } = get()
        if (coins < coinCost) return
        if (!consumedCardIds.every((id) => collectedIds.includes(id))) return
        set({
          coins: coins - coinCost,
          collectedIds: [
            ...collectedIds.filter((id) => !consumedCardIds.includes(id)),
            newCardId,
          ],
        })
      },

      resetGame: () => set(initialState),
    }),
    {
      name: 'phantom-gacha-save',
    }
  )
)
