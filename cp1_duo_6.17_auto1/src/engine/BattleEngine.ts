import {
  BattleLogEntry,
  BattleResult,
  CharacterState,
  CombatCharacter,
  Equipment,
  EquipmentSlotType
} from '../types'
import {
  applyPassiveRegen,
  applySkillEffect,
  applyThornsReflect,
  reduceCooldowns,
  selectBestSkill
} from './SkillSystem'

function buildCombatCharacter(char: CharacterState): CombatCharacter {
  let maxHp = char.baseStats.maxHp
  let attack = char.baseStats.attack
  let defense = char.baseStats.defense
  let agility = char.baseStats.agility
  let critRate = char.baseStats.critRate
  let critDamage = 50
  let dodgeRate = 0
  let lifeSteal = 0
  let cooldownReduction = 0

  const slots: EquipmentSlotType[] = ['weapon', 'armor', 'ring', 'boots']
  for (const slot of slots) {
    const eq: Equipment | null = char.equipment[slot]
    if (eq) {
      if (eq.baseStats.maxHp) maxHp += eq.baseStats.maxHp
      if (eq.baseStats.attack) attack += eq.baseStats.attack
      if (eq.baseStats.defense) defense += eq.baseStats.defense
      if (eq.baseStats.agility) agility += eq.baseStats.agility
      if (eq.baseStats.critRate) critRate += eq.baseStats.critRate

      for (const sub of eq.subStats) {
        switch (sub.type) {
          case 'critDamage':
            critDamage += sub.value
            break
          case 'dodgeRate':
            dodgeRate += sub.value
            break
          case 'lifeSteal':
            lifeSteal += sub.value
            break
          case 'cooldownReduction':
            cooldownReduction += sub.value
            break
        }
      }
    }
  }

  critRate = Math.min(50, critRate)
  dodgeRate = Math.min(50, dodgeRate)
  cooldownReduction = Math.min(60, cooldownReduction)

  const activeSkills = char.activeSkills.filter((s): s is NonNullable<typeof s> => s !== null)
  if (!activeSkills.find(s => s.id === 'basic-attack')) {
    const basicAttack = {
      id: 'basic-attack',
      name: '普通攻击',
      icon: '👊',
      type: 'active' as const,
      cooldown: 0,
      description: '基础攻击',
      effects: [{ type: 'damage' as const, value: 0, damageMultiplier: 1.0, flatDamage: 0 }]
    }
    activeSkills.push(basicAttack)
  }

  return {
    id: char.id,
    name: char.name,
    maxHp,
    currentHp: maxHp,
    attack,
    defense,
    agility,
    critRate,
    critDamage,
    dodgeRate,
    lifeSteal,
    cooldownReduction,
    shield: 0,
    shieldDuration: 0,
    skillCooldowns: {},
    activeSkills,
    passiveSkill: char.passiveSkill,
    totalDamage: 0,
    totalHealing: 0,
    critHits: 0,
    dodges: 0,
    skillUsage: {},
    isShaking: false
  }
}

export interface BattleTurn {
  turn: number
  logs: BattleLogEntry[]
  characterStates: CombatCharacter[]
}

export function simulateBattle(
  char1: CharacterState,
  char2: CharacterState,
  maxTurns: number = 100
): { turns: BattleTurn[]; result: BattleResult } {
  const startTime = performance.now()

  const c1 = buildCombatCharacter(char1)
  const c2 = buildCombatCharacter(char2)

  const turns: BattleTurn[] = []
  const allLogs: BattleLogEntry[] = []

  let firstAttacker: CombatCharacter
  let secondAttacker: CombatCharacter
  if (c1.agility >= c2.agility) {
    firstAttacker = c1
    secondAttacker = c2
  } else {
    firstAttacker = c2
    secondAttacker = c1
  }

  let comboCounts: Record<string, number> = { [c1.id]: 0, [c2.id]: 0 }
  let lastAttackerId: string | null = null

  for (let turn = 1; turn <= maxTurns; turn++) {
    const turnLogs: BattleLogEntry[] = []

    const regen1 = applyPassiveRegen(c1)
    if (regen1 > 0) {
      c1.totalHealing += regen1
    }
    const regen2 = applyPassiveRegen(c2)
    if (regen2 > 0) {
      c2.totalHealing += regen2
    }

    if (c1.shieldDuration > 0) c1.shieldDuration--
    if (c2.shieldDuration > 0) c2.shieldDuration--
    if (c1.shieldDuration <= 0) c1.shield = 0
    if (c2.shieldDuration <= 0) c2.shield = 0

    const attackers = [firstAttacker, secondAttacker]
    for (const attacker of attackers) {
      if (c1.currentHp <= 0 || c2.currentHp <= 0) break

      const defender = attacker.id === c1.id ? c2 : c1

      const skill = selectBestSkill(attacker)
      const result = applySkillEffect(attacker, defender, skill)

      attacker.skillUsage[skill.id] = (attacker.skillUsage[skill.id] || 0) + 1
      if (skill.cooldown > 0) {
        const effectiveCooldown = Math.max(
          1,
          Math.ceil(skill.cooldown * (1 - attacker.cooldownReduction / 100))
        )
        attacker.skillCooldowns[skill.id] = effectiveCooldown
      }

      if (result.isDodge) {
        defender.dodges++
      } else {
        if (result.damage > 0) {
          defender.currentHp = Math.max(0, defender.currentHp - result.damage)
          attacker.totalDamage += result.damage
          if (result.isCrit) attacker.critHits++

          const reflectDamage = applyThornsReflect(defender, result.damage)
          if (reflectDamage > 0) {
            attacker.currentHp = Math.max(0, attacker.currentHp - reflectDamage)
            defender.totalDamage += reflectDamage
          }
        }
        if (result.healing > 0) {
          attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + result.healing)
          attacker.totalHealing += result.healing
        }
      }

      if (lastAttackerId === attacker.id) {
        comboCounts[attacker.id]++
      } else {
        lastAttackerId = attacker.id
      }

      const log: BattleLogEntry = {
        turn,
        attacker: attacker.name,
        defender: defender.name,
        skill: skill.name,
        damage: result.damage > 0 ? result.damage : undefined,
        healing: result.healing > 0 ? result.healing : undefined,
        isCrit: result.isCrit,
        isDodge: result.isDodge,
        shieldAbsorbed: result.shieldAbsorbed > 0 ? result.shieldAbsorbed : undefined,
        timestamp: Date.now()
      }
      turnLogs.push(log)
      allLogs.push(log)
    }

    reduceCooldowns(c1)
    reduceCooldowns(c2)

    turns.push({
      turn,
      logs: turnLogs,
      characterStates: [
        JSON.parse(JSON.stringify(c1)),
        JSON.parse(JSON.stringify(c2))
      ]
    })

    if (c1.currentHp <= 0 || c2.currentHp <= 0) break
  }

  const endTime = performance.now()
  const calcTime = endTime - startTime
  if (calcTime > 50) {
    console.warn(`Battle simulation took ${calcTime}ms, exceeding 50ms target`)
  }

  let winnerId: string | null = null
  if (c1.currentHp <= 0 && c2.currentHp > 0) {
    winnerId = c2.id
  } else if (c2.currentHp <= 0 && c1.currentHp > 0) {
    winnerId = c1.id
  } else if (c1.currentHp > c2.currentHp) {
    winnerId = c1.id
  } else if (c2.currentHp > c1.currentHp) {
    winnerId = c2.id
  }

  const winner = winnerId ? (winnerId === c1.id ? c1 : c2) : null

  let score = 50
  if (winner) {
    const hpRatio = winner.currentHp / winner.maxHp
    score += hpRatio * 30

    const turnBonus = Math.max(0, 30 - turns.length)
    score += turnBonus

    const totalCombo = comboCounts[winner.id]
    score += Math.min(totalCombo * 2, 10)

    const totalActions = turns.length * 2
    const skillUsageRatio = Object.values(winner.skillUsage).reduce((a, b) => a + b, 0) / Math.max(1, totalActions)
    score += skillUsageRatio * 10
  }

  score = Math.max(0, Math.min(100, score))

  let grade = 'D'
  if (score >= 90) grade = 'S'
  else if (score >= 75) grade = 'A'
  else if (score >= 60) grade = 'B'
  else if (score >= 45) grade = 'C'

  const result: BattleResult = {
    winnerId,
    totalTurns: turns.length,
    characters: [
      {
        id: c1.id,
        name: c1.name,
        finalHp: c1.currentHp,
        maxHp: c1.maxHp,
        totalDamage: c1.totalDamage,
        totalHealing: c1.totalHealing,
        critHits: c1.critHits,
        dodges: c1.dodges,
        skillUsage: { ...c1.skillUsage },
        comboCount: comboCounts[c1.id]
      },
      {
        id: c2.id,
        name: c2.name,
        finalHp: c2.currentHp,
        maxHp: c2.maxHp,
        totalDamage: c2.totalDamage,
        totalHealing: c2.totalHealing,
        critHits: c2.critHits,
        dodges: c2.dodges,
        skillUsage: { ...c2.skillUsage },
        comboCount: comboCounts[c2.id]
      }
    ],
    logs: allLogs,
    grade,
    score: Math.round(score)
  }

  return { turns, result }
}
