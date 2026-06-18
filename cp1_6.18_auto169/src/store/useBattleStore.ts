import { create } from 'zustand';
import type {
  BattleState,
  GridCoord,
  DeployCharacterPayload,
  AddActionPayload,
  ReorderActionPayload,
  Character,
} from '../types';
import {
  createInitialState,
  deployCharacter,
  addActionToQueue,
  removeActionFromQueue,
  reorderActionQueue,
  startExecution,
  executeNextAction,
  selectCharacter,
  selectSkill,
  highlightValidTargets,
  clearHighlights,
  removeExpiredFloatingTexts,
} from '../engine/battleEngine';
import { createTeamA, createTeamB } from '../data/characters';

interface BattleStore extends BattleState {
  initializeBattle: () => void;
  deployCharacterAction: (payload: DeployCharacterPayload) => void;
  addAction: (payload: AddActionPayload) => void;
  removeAction: (actionId: string) => void;
  reorderAction: (payload: ReorderActionPayload) => void;
  startExecuteTurn: () => void;
  executeStep: () => void;
  selectCharacterAction: (characterId: string | null) => void;
  selectSkillAction: (skillId: string | null) => void;
  highlightTargets: (characterId: string, skillId: string) => void;
  clearHighlightsAction: () => void;
  cleanupFloatingTexts: () => void;
  resetBattle: () => void;
  getCharactersByTeam: (team: 'A' | 'B') => Character[];
  getDeployedCharacters: () => Character[];
}

const initialCharacters: Character[] = [...createTeamA(), ...createTeamB()];

export const useBattleStore = create<BattleStore>((set, get) => ({
  ...createInitialState(initialCharacters),

  initializeBattle: () => {
    const chars = [...createTeamA(), ...createTeamB()];
    set(createInitialState(chars));
  },

  deployCharacterAction: (payload: DeployCharacterPayload) => {
    set(state => deployCharacter(state, payload.characterId, payload.position));
  },

  addAction: (payload: AddActionPayload) => {
    set(state => addActionToQueue(state, payload.characterId, payload.skillId, payload.targetPosition));
  },

  removeAction: (actionId: string) => {
    set(state => removeActionFromQueue(state, actionId));
  },

  reorderAction: (payload: ReorderActionPayload) => {
    set(state => reorderActionQueue(state, payload.actionId, payload.newOrder));
  },

  startExecuteTurn: () => {
    set(state => startExecution(state));
  },

  executeStep: () => {
    set(state => executeNextAction(state));
  },

  selectCharacterAction: (characterId: string | null) => {
    set(state => selectCharacter(state, characterId));
  },

  selectSkillAction: (skillId: string | null) => {
    set(state => selectSkill(state, skillId));
  },

  highlightTargets: (characterId: string, skillId: string) => {
    set(state => highlightValidTargets(state, characterId, skillId));
  },

  clearHighlightsAction: () => {
    set(state => clearHighlights(state));
  },

  cleanupFloatingTexts: () => {
    set(state => removeExpiredFloatingTexts(state));
  },

  resetBattle: () => {
    const chars = [...createTeamA(), ...createTeamB()];
    set(createInitialState(chars));
  },

  getCharactersByTeam: (team: 'A' | 'B') => {
    return get().characters.filter(c => c.team === team);
  },

  getDeployedCharacters: () => {
    return get().characters.filter(c => c.position !== null);
  },
}));
