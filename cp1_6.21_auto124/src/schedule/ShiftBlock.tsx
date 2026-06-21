import { motion } from 'framer-motion'
import { Clock, User } from 'lucide-react'
import { Shift, SHIFT_INFO } from '../api/requests'

interface ShiftBlockProps {
  shift: Shift
  onClick: () => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  isDragging?: boolean
  isPreview?: boolean
}

export function ShiftBlock({
  shift,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
  isPreview
}: ShiftBlockProps) {
  const info = SHIFT_INFO[shift.shiftType]

  return (
    <motion.div
      draggable={!isPreview}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation()
        if (!isPreview) onClick()
      }}
      layout
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{
        opacity: isPreview ? 0.55 : isDragging ? 0.4 : 1,
        y: 0,
        scale: isDragging ? 1.05 : 1
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28, duration: 0.2 }}
      whileHover={!isPreview ? { scale: 1.03, y: -2 } : undefined}
      whileTap={!isPreview ? { scale: 0.98 } : undefined}
      style={{
        backgroundColor: info.bgColor,
        color: '#fff',
        borderRadius: '10px',
        padding: '8px 10px',
        cursor: isPreview ? 'default' : 'grab',
        userSelect: 'none',
        boxShadow: isPreview
          ? 'none'
          : '0 3px 10px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.25)',
        border: `1.5px solid ${info.color}`,
        marginBottom: '6px',
        minHeight: '54px',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: isPreview ? 'blur(2px)' : undefined
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${info.color}, rgba(255,255,255,0.6))`
        }}
      />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: '13px',
            flexShrink: 0,
            padding: '2px 7px',
            background: 'rgba(255,255,255,0.22)',
            borderRadius: '6px',
            backdropFilter: 'blur(4px)',
            whiteSpace: 'nowrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <User size={12} />
            <span>{shift.employeeName}</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '3px'
            }}
          >
            <span
              style={{
                padding: '1px 6px',
                background: 'rgba(0,0,0,0.18)',
                borderRadius: '4px'
              }}
            >
              {info.label}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '11px',
              opacity: 0.92
            }}
          >
            <Clock size={11} />
            <span>{info.hours}</span>
          </div>
          {shift.note && (
            <div
              style={{
                marginTop: '4px',
                fontSize: '10.5px',
                opacity: 0.88,
                background: 'rgba(0,0,0,0.12)',
                padding: '3px 6px',
                borderRadius: '5px',
                lineHeight: 1.4
              }}
            >
              📝 {shift.note}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
