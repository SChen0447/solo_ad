import { useState } from 'react'
import { motion } from 'framer-motion'
import { Equipment, EquipmentSlotType } from '../types'
import { subStatNames, slotNames } from '../data/equipmentPool'

interface EquipmentSlotProps {
  slot: EquipmentSlotType
  equipment: Equipment | null
  onEquip: (equipment: Equipment) => void
  onUnequip: () => void
  accentColor: string
  disabled?: boolean
}

export default function EquipmentSlot({
  slot,
  equipment,
  onEquip,
  onUnequip,
  accentColor,
  disabled = false
}: EquipmentSlotProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled) return

    try {
      const data = e.dataTransfer.getData('equipment')
      if (data) {
        const parsedEquipment: Equipment = JSON.parse(data)
        if (parsedEquipment.slot === slot) {
          onEquip(parsedEquipment)
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  const borderStyle = equipment
    ? `2px solid ${accentColor}`
    : isDragOver
      ? '2px dashed #FFD700'
      : '2px dashed rgba(255,255,255,0.3)'

  const bgStyle = equipment
    ? 'rgba(255, 215, 0, 0.1)'
    : isDragOver
      ? 'rgba(255, 215, 0, 0.15)'
      : 'rgba(255, 255, 255, 0.02)'

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => equipment && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => equipment && !disabled && onUnequip()}
        whileHover={!disabled ? { scale: 1.05, y: -2 } : {}}
        transition={{ duration: 0.2 }}
        style={{
          width: 70,
          height: 70,
          borderRadius: 12,
          border: borderStyle,
          background: bgStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          cursor: disabled ? 'default' : equipment ? 'pointer' : 'copy',
          transition: 'all 0.3s ease',
          position: 'relative'
        }}
      >
        {equipment ? (
          <span>{equipment.icon}</span>
        ) : (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.2 }}>
            {slotNames[slot]}
          </span>
        )}
      </motion.div>

      {showTooltip && equipment && (
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
            minWidth: 180,
            zIndex: 100,
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
            {equipment.icon} {equipment.name}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 6 }}>
            {slotNames[equipment.slot]}
          </div>
          {Object.entries(equipment.baseStats).map(([key, value]) => (
            <div key={key} style={{ fontSize: 12, color: '#90EE90' }}>
              +{value} {statNames[key as keyof typeof statNames] || key}
            </div>
          ))}
          {equipment.subStats.map((sub, idx) => (
            <div key={idx} style={{ fontSize: 12, color: '#87CEEB' }}>
              +{sub.value}% {subStatNames[sub.type]}
            </div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

const statNames = {
  maxHp: '生命值',
  attack: '攻击力',
  defense: '防御力',
  agility: '敏捷',
  critRate: '暴击率%'
}
