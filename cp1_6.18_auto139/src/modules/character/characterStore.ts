import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { roll, DiceResult } from '../dice/DiceRoller';

export type ClassName = '战士' | '法师' | '游侠' | '牧师';

export interface AttributeRolls {
  rolls: number[];
  total: number;
}

export interface CharacterAttributes {
  力量: number;
  敏捷: number;
  体质: number;
  智力: number;
  感知: number;
  魅力: number;
}

export interface AttributeDetail {
  力量: AttributeRolls;
  敏捷: AttributeRolls;
  体质: AttributeRolls;
  智力: AttributeRolls;
  感知: AttributeRolls;
  魅力: AttributeRolls;
}

export interface Adjustment {
  力量: number;
  敏捷: number;
  体质: number;
  智力: number;
  感知: number;
  魅力: number;
}

export interface LevelUpRecord {
  timestamp: number;
  level: number;
  attributes: CharacterAttributes;
}

export interface Character {
  id: string;
  name: string;
  className: ClassName;
  level: number;
  experience: number;
  baseAttributes: CharacterAttributes;
  attributeDetail: AttributeDetail;
  adjustment: Adjustment;
  levelUpRecords: LevelUpRecord[];
}

export const ATTR_KEYS: (keyof CharacterAttributes)[] = [
  '力量', '敏捷', '体质', '智力', '感知', '魅力',
];

function rollAttribute(): { rolls: number[]; total: number } {
  const result: DiceResult = roll({ diceCount: 3, sides: 6 });
  return { rolls: result.rolls, total: result.total };
}

function calcTotalAttrs(
  base: CharacterAttributes,
  adj: Adjustment,
  level: number
): CharacterAttributes {
  const levelBonus = level - 1;
  const result = {} as CharacterAttributes;
  for (const k of ATTR_KEYS) {
    result[k] = base[k] + adj[k] + levelBonus;
  }
  return result;
}

interface CharacterState {
  character: Character | null;
  createCharacter: (name: string, className: ClassName) => void;
  rollAllAttributes: () => void;
  adjustAttribute: (attr: keyof CharacterAttributes, delta: number) => void;
  addExperience: (amount: number) => LevelUpRecord[];
  loadCharacter: (character: Character) => void;
  getEffectiveAttributes: () => CharacterAttributes | null;
  getAttrModifier: (attr: keyof CharacterAttributes) => number;
}

const INITIAL_ADJ: Adjustment = {
  力量: 0, 敏捷: 0, 体质: 0, 智力: 0, 感知: 0, 魅力: 0,
};

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set, get) => ({
      character: null,

      createCharacter: (name, className) => {
        const char: Character = {
          id: crypto.randomUUID(),
          name,
          className,
          level: 1,
          experience: 0,
          baseAttributes: { 力量: 0, 敏捷: 0, 体质: 0, 智力: 0, 感知: 0, 魅力: 0 },
          attributeDetail: {
            力量: { rolls: [0, 0, 0], total: 0 },
            敏捷: { rolls: [0, 0, 0], total: 0 },
            体质: { rolls: [0, 0, 0], total: 0 },
            智力: { rolls: [0, 0, 0], total: 0 },
            感知: { rolls: [0, 0, 0], total: 0 },
            魅力: { rolls: [0, 0, 0], total: 0 },
          },
          adjustment: { ...INITIAL_ADJ },
          levelUpRecords: [],
        };
        set({ character: char });
      },

      rollAllAttributes: () => {
        const { character } = get();
        if (!character) return;
        const newBase: CharacterAttributes = { 力量: 0, 敏捷: 0, 体质: 0, 智力: 0, 感知: 0, 魅力: 0 };
        const newDetail: AttributeDetail = {
          力量: { rolls: [0, 0, 0], total: 0 },
          敏捷: { rolls: [0, 0, 0], total: 0 },
          体质: { rolls: [0, 0, 0], total: 0 },
          智力: { rolls: [0, 0, 0], total: 0 },
          感知: { rolls: [0, 0, 0], total: 0 },
          魅力: { rolls: [0, 0, 0], total: 0 },
        };
        for (const k of ATTR_KEYS) {
          const r = rollAttribute();
          newBase[k] = r.total;
          newDetail[k] = r;
        }
        set({
          character: {
            ...character,
            baseAttributes: newBase,
            attributeDetail: newDetail,
            adjustment: { ...INITIAL_ADJ },
          },
        });
      },

      adjustAttribute: (attr, delta) => {
        const { character } = get();
        if (!character) return;
        const newAdj = { ...character.adjustment };
        const newVal = newAdj[attr] + delta;
        if (newVal < -2 || newVal > 2) return;
        const totalBaseSum = ATTR_KEYS.reduce(
          (s, k) => s + character.baseAttributes[k] + (k === attr ? newVal : newAdj[k]),
          0
        );
        if (totalBaseSum > 72) return;
        newAdj[attr] = newVal;
        set({ character: { ...character, adjustment: newAdj } });
      },

      addExperience: (amount) => {
        const { character } = get();
        if (!character) return [];
        const levelUps: LevelUpRecord[] = [];
        let exp = character.experience + amount;
        let lvl = character.level;
        while (exp >= 100) {
          exp -= 100;
          lvl += 1;
          const record: LevelUpRecord = {
            timestamp: Date.now(),
            level: lvl,
            attributes: calcTotalAttrs(character.baseAttributes, character.adjustment, lvl),
          };
          levelUps.push(record);
        }
        set({
          character: {
            ...character,
            experience: exp,
            level: lvl,
            levelUpRecords: [...character.levelUpRecords, ...levelUps],
          },
        });
        return levelUps;
      },

      loadCharacter: (char) => set({ character: char }),

      getEffectiveAttributes: () => {
        const { character } = get();
        if (!character) return null;
        return calcTotalAttrs(
          character.baseAttributes,
          character.adjustment,
          character.level
        );
      },

      getAttrModifier: (attr) => {
        const effective = get().getEffectiveAttributes();
        if (!effective) return 0;
        return Math.floor((effective[attr] - 10) / 2);
      },
    }),
    { name: 'dice-soul-codex-character' }
  )
);
