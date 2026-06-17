import { CombatCharacter, Skill, SkillEffect } from '../types'

export function calculateSkillDamage(
  attacker: CombatCharacter,
  defender: CombatCharacter,
  effect: SkillEffect
): { damage: number; isCrit: boolean; shieldAbsorbed: number } {
  const multiplier = effect.damageMultiplier ?? 1
  const flatDamage = effect.flatDamage ?? 0

  let baseDamage = attacker.attack * multiplier + flatDamage

  const isCrit = Math.random() * 100 < attacker.critRate
  if (isCrit) {
    baseDamage *= 1 + attacker.critDamage / 100
  }

  const damageReduction = defender.defense / (defender.defense + 100)
  let finalDamage = Math.max(1, baseDamage * (1 - damageReduction))

  let shieldAbsorbed = 0
  if (defender.shieldDuration > 0 && defender.shield > 0) {
    shieldAbsorbed = finalDamage * defender.shield
    finalDamage = finalDamage - shieldAbsorbed
  }

  return {
    damage: Math.round(finalDamage),
    isCrit,
    shieldAbsorbed: Math.round(shieldAbsorbed)
  }
}

export function calculateHealing(
  healer: CombatCharacter,
  effect: SkillEffect
): number {
  const healPercent = effect.healPercent ?? 0
  const flatHeal = effect.flatHeal ?? 0
  const healing = healer.maxHp * healPercent + flatHeal
  return Math.round(healing)
}

export function applySkillEffect(
  attacker: CombatCharacter,
  defender: CombatCharacter,
  skill: Skill
): {
  damage: number
  healing: number
  isCrit: boolean
  isDodge: boolean
  shieldAbsorbed: number
} {
  let totalDamage = 0
  let totalHealing = 0
  let critOccurred = false
  let shieldAbsorbed = 0

  const isDodge = Math.random() * 100 < defender.dodgeRate

  if (isDodge) {
    return {
      damage: 0,
      healing: 0,
      isCrit: false,
      isDodge: true,
      shieldAbsorbed: 0
    }
  }

  for (const effect of skill.effects) {
    switch (effect.type) {
      case 'damage': {
        const result = calculateSkillDamage(attacker, defender, effect)
        totalDamage += result.damage
        shieldAbsorbed += result.shieldAbsorbed
        if (result.isCrit) critOccurred = true
        break
      }
      case 'heal': {
        const heal = calculateHealing(attacker, effect)
        totalHealing += heal
        break
      }
      case 'shield': {
        attacker.shield = effect.shieldPercent ?? effect.value ?? 0
        attacker.shieldDuration = effect.duration ?? 2
        break
      }
    }
  }

  if (totalDamage > 0 && attacker.lifeSteal > 0) {
    const lifeStealHeal = Math.round(totalDamage * attacker.lifeSteal / 100)
    totalHealing += lifeStealHeal
  }

  return {
    damage: totalDamage,
    healing: totalHealing,
    isCrit: critOccurred,
    isDodge: false,
    shieldAbsorbed
  }
}

export function selectBestSkill(character: CombatCharacter): Skill {
  const availableSkills = character.activeSkills.filter(
    skill => !character.skillCooldowns[skill.id] || character.skillCooldowns[skill.id] <= 0
  )

  if (availableSkills.length === 0) {
    return character.activeSkills.find(s => s.id === 'basic-attack') || character.activeSkills[0]
  }

  const damageSkills = availableSkills.filter(s =>
    s.effects.some(e => e.type === 'damage')
  )

  if (damageSkills.length > 0) {
    damageSkills.sort((a, b) => {
      const aDamage = (a.effects.find(e => e.type === 'damage')?.damageMultiplier ?? 1) * character.attack + (a.effects.find(e => e.type === 'damage')?.flatDamage ?? 0)
      const bDamage = (b.effects.find(e => e.type === 'damage')?.damageMultiplier ?? 1) * character.attack + (b.effects.find(e => e.type === 'damage')?.flatDamage ?? 0)
      return bDamage - aDamage
    })

    const lowHp = character.currentHp / character.maxHp < 0.3
    if (lowHp) {
      const healSkill = availableSkills.find(s =>
        s.effects.some(e => e.type === 'heal')
      )
      if (healSkill) return healSkill
    }

    return damageSkills[0]
  }

  const healSkill = availableSkills.find(s =>
    s.effects.some(e => e.type === 'heal')
  )
  if (healSkill) return healSkill

  const shieldSkill = availableSkills.find(s =>
    s.effects.some(e => e.type === 'shield')
  )
  if (shieldSkill) return shieldSkill

  return availableSkills[0]
}

export function reduceCooldowns(character: CombatCharacter): void {
  for (const skillId in character.skillCooldowns) {
    if (character.skillCooldowns[skillId] > 0) {
      character.skillCooldowns[skillId] = Math.max(
        0,
        character.skillCooldowns[skillId] - 1
      )
    }
  }
}

export function applyPassiveRegen(character: CombatCharacter): number {
  if (character.passiveSkill?.id === 'passive-regen') {
    const regen = Math.round(character.maxHp * 0.05)
    character.currentHp = Math.min(character.maxHp, character.currentHp + regen)
    return regen
  }
  return 0
}

export function applyThornsReflect(defender: CombatCharacter, damage: number): number {
  if (defender.passiveSkill?.id === 'passive-thorns' && damage > 0) {
    return Math.round(damage * 0.15)
  }
  return 0
}
