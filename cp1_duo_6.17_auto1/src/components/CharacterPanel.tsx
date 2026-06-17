import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, CharId } from '../store'
import { BaseStats, Equipment, EquipmentSlotType, Skill } from '../types'
import { generateEquipmentPool, slotNames } from '../data/equipmentPool'
import { getActiveSkills, getPassiveSkills } from '../data/skillPool'
import EquipmentSlot from './EquipmentSlot'

interface CharacterPanelProps {
  charId: CharId
  title: string
  accentColor: string
}

interface StatConfig {
  key: keyof BaseStats
  label: string
  min: number
  max: number
  unit?: string
}

const statConfigs: StatConfig[] = [
  { key: 'maxHp', label: '生命值', min: 100, max: 5000 },
  { key: 'attack', label: '攻击力', min: 1, max: 500 },
  { key: 'defense', label: '防御力', min: 1, max: 300 },
  { key: 'agility', label: '敏捷', min: 1, max: 200 },
  { key: 'critRate', label: '暴击率', min: 0, max: 50, unit: '%' }
]

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 }
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)
  return `rgb(${r},${g},${b})`
}

export default function CharacterPanel({ charId, title, accentColor }: CharacterPanelProps) {
  const character = useAppStore((state) => state[charId])
  const updateCharacterBaseStats = useAppStore((state) => state.updateCharacterBaseStats)
  const equipItem = useAppStore((state) => state.equipItem)
  const unequipItem = useAppStore((state) => state.unequipItem)
  const setActiveSkill = useAppStore((state) => state.setActiveSkill)
  const setPassiveSkill = useAppStore((state) => state.setPassiveSkill)

  const [collapsed, setCollapsed] = useState(false)
  const [showSkillPicker, setShowSkillPicker] = useState<number | null>(null)
  const [showPassivePicker, setShowPassivePicker] = useState(false)
  const [equipmentPool] = useState<Equipment[]>(() => generateEquipmentPool())

  const activeSkills = getActiveSkills()
  const passiveSkills = getPassiveSkills()

  const handleStatChange = (key: keyof BaseStats, value: number) => {
    const config = statConfigs.find((c) => c.key === key)!
    const clamped = Math.max(config.min, Math.min(config.max, value))
    updateCharacterBaseStats(charId, { [key]: clamped })
  }

  const handleEquipmentDragStart = (e: any, equipment: Equipment) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('equipment', JSON.stringify(equipment))
      e.dataTransfer.effectAllowed = 'copy'
    }
  }

  const slots: EquipmentSlotType[] = ['weapon', 'armor', 'ring', 'boots']

  return (
    <motion.div
      initial={{ opacity: 0, x: charId === 'character1' ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel"
      style={{ padding: 20 }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: `1px solid ${accentColor}40`
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, color: accentColor }}>
          {title} - {character.name}
        </h2>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            fontSize: 18,
            padding: '4px 8px',
            borderRadius: 6
          }}
        >
          {collapsed ? '▼' : '▲'}
        </button>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.9)' }}>
                📊 基础属性
              </h3>
              {statConfigs.map((config) => {
                const value = character.baseStats[config.key]
                const ratio = (value - config.min) / (config.max - config.min)
                const trackColor = lerpColor('#3498DB', '#E74C3C', ratio)

                return (
                  <div key={config.key} style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 12 }}>
                    <span style={{ width: 70, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                      {config.label}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        position: 'relative',
                        height: 24,
                        ['--slider-color' as any]: trackColor
                      }}
                      className="stat-slider-container"
                    >
                      <motion.input
                        type="range"
                        min={config.min}
                        max={config.max}
                        value={value}
                        onChange={(e) => handleStatChange(config.key, Number(e.target.value))}
                        transition={{ type: 'tween', duration: 0.5, ease: 'easeOut' }}
                        className="stat-slider"
                        style={{
                          width: '100%',
                          height: 6,
                          borderRadius: 3,
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          outline: 'none',
                          background: `linear-gradient(to right, ${trackColor} 0%, ${trackColor} ${ratio * 100}%, rgba(255,255,255,0.1) ${ratio * 100}%, rgba(255,255,255,0.1) 100%)`,
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                    <input
                      type="number"
                      min={config.min}
                      max={config.max}
                      value={value}
                      onChange={(e) => handleStatChange(config.key, Number(e.target.value))}
                      style={{ width: 70 }}
                    />
                    {config.unit && (
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', width: 20 }}>
                        {config.unit}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.9)' }}>
                🎒 装备栏
              </h3>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                {slots.map((slot) => (
                  <EquipmentSlot
                    key={slot}
                    slot={slot}
                    equipment={character.equipment[slot]}
                    onEquip={(eq) => equipItem(charId, slot, eq)}
                    onUnequip={() => unequipItem(charId, slot)}
                    accentColor={accentColor}
                  />
                ))}
              </div>

              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                拖拽下方装备到对应槽位：
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {equipmentPool.map((eq) => (
                  <motion.div
                    key={eq.id}
                    draggable
                    onDragStart={(e) => handleEquipmentDragStart(e, eq)}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileDrag={{ scale: 1.2, opacity: 0.7 }}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      cursor: 'grab',
                      position: 'relative',
                      transition: 'all 0.3s ease'
                    }}
                    title={`${eq.name} (${slotNames[eq.slot]})`}
                  >
                    {eq.icon}
                  </motion.div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.9)' }}>
                ⚡ 主动技能 (3个)
              </h3>
              <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                {character.activeSkills.map((skill, index) => (
                  <SkillSlot
                    key={index}
                    skill={skill}
                    onClick={() => setShowSkillPicker(showSkillPicker === index ? null : index)}
                    accentColor={accentColor}
                    isSelected={showSkillPicker === index}
                  />
                ))}
              </div>

              <AnimatePresence>
                {showSkillPicker !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      padding: 12,
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 8,
                      marginBottom: 8
                    }}
                  >
                    {activeSkills.map((skill) => (
                      <SkillPickerItem
                        key={skill.id}
                        skill={skill}
                        selected={character.activeSkills[showSkillPicker]?.id === skill.id}
                        onSelect={() => {
                          setActiveSkill(charId, showSkillPicker, skill)
                          setShowSkillPicker(null)
                        }}
                      />
                    ))}
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setActiveSkill(charId, showSkillPicker, null)
                        setShowSkillPicker(null)
                      }}
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      清空
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.9)' }}>
                🌟 被动技能 (1个)
              </h3>
              <div style={{ marginBottom: 8 }}>
                <SkillSlot
                  skill={character.passiveSkill}
                  onClick={() => setShowPassivePicker(!showPassivePicker)}
                  accentColor={accentColor}
                  isSelected={showPassivePicker}
                  isPassive
                />
              </div>

              <AnimatePresence>
                {showPassivePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      padding: 12,
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 8
                    }}
                  >
                    {passiveSkills.map((skill) => (
                      <SkillPickerItem
                        key={skill.id}
                        skill={skill}
                        selected={character.passiveSkill?.id === skill.id}
                        onSelect={() => {
                          setPassiveSkill(charId, skill)
                          setShowPassivePicker(false)
                        }}
                      />
                    ))}
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setPassiveSkill(charId, null)
                        setShowPassivePicker(false)
                      }}
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      清空
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface SkillSlotProps {
  skill: Skill | null
  onClick: () => void
  accentColor: string
  isSelected: boolean
  isPassive?: boolean
}

function SkillSlot({ skill, onClick, accentColor, isSelected, isPassive = false }: SkillSlotProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => skill && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <motion.div
        onClick={onClick}
        initial={isSelected ? { rotate: 0 } : false}
        animate={isSelected ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: 1.1, y: -2 }}
        style={{
          width: 60,
          height: 60,
          borderRadius: 12,
          border: `2px solid ${isSelected ? accentColor : skill ? 'rgba(255,215,0,0.6)' : '2px dashed rgba(255,255,255,0.3)'}`,
          background: skill ? 'rgba(255, 215, 0, 0.08)' : 'rgba(255,255,255,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
      >
        {skill ? skill.icon : (isPassive ? '🌟' : '+')}
      </motion.div>

      {showTooltip && skill && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 8,
            padding: 12,
            background: 'linear-gradient(135deg, rgba(102,126,234,0.95) 0%, rgba(118,75,162,0.95) 100%)',
            borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            minWidth: 220,
            zIndex: 100,
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
            {skill.icon} {skill.name}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
            {skill.type === 'active' ? '主动技能' : '被动技能'}
            {skill.cooldown > 0 && ` · 冷却 ${skill.cooldown} 回合`}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
            {skill.description}
          </div>
        </motion.div>
      )}
    </div>
  )
}

interface SkillPickerItemProps {
  skill: Skill
  selected: boolean
  onSelect: () => void
}

function SkillPickerItem({ skill, selected, onSelect }: SkillPickerItemProps) {
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      style={{
        padding: '8px 12px',
        borderRadius: 8,
        border: selected ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.2)',
        background: selected ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        transition: 'all 0.3s ease'
      }}
    >
      <span style={{ fontSize: 18 }}>{skill.icon}</span>
      <span>{skill.name}</span>
    </motion.button>
  )
}
