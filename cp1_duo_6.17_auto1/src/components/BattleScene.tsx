import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store'
import { BattleTurn, DamageNumber } from '../types'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  delay: number
}

export default function BattleScene() {
  const { battleTurns, battleResult, setView } = useAppStore()
  const [currentTurnIndex, setCurrentTurnIndex] = useState(-1)
  const [currentLogIndex, setCurrentLogIndex] = useState(0)
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([])
  const [shakingCharId, setShakingCharId] = useState<string | null>(null)
  const [displayHp, setDisplayHp] = useState<Record<string, number>>({})

  const groundParticles = useMemo<Particle[]>(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      opacity: Math.random() * 0.5 + 0.2,
      delay: Math.random() * 3
    }))
  }, [])

  useEffect(() => {
    if (battleTurns.length > 0) {
      const states = battleTurns[0].characterStates
      setDisplayHp({
        [states[0].id]: states[0].maxHp,
        [states[1].id]: states[1].maxHp
      })
    }
  }, [battleTurns])

  const addDamageNumber = useCallback((value: number, charId: string, isCrit: boolean, isHeal: boolean) => {
    const id = `${Date.now()}-${Math.random()}`
    const x = charId.includes('1') ? 25 : 75
    const y = 50

    const newDmg: DamageNumber = {
      id,
      value,
      x,
      y,
      isCrit,
      isHeal,
      createdAt: Date.now()
    }
    setDamageNumbers(prev => [...prev, newDmg])

    setTimeout(() => {
      setDamageNumbers(prev => prev.filter(d => d.id !== id))
    }, 1500)
  }, [])

  const triggerShake = useCallback((charId: string) => {
    setShakingCharId(charId)
    setTimeout(() => setShakingCharId(null), 200)
  }, [])

  useEffect(() => {
    if (battleTurns.length === 0) return

    if (currentTurnIndex >= battleTurns.length) {
      const timer = setTimeout(() => {
        setView('result')
      }, 1000)
      return () => clearTimeout(timer)
    }

    let turn: BattleTurn | null = null
    if (currentTurnIndex >= 0) {
      turn = battleTurns[currentTurnIndex]
    }

    if (!turn) {
      const startTimer = setTimeout(() => {
        setCurrentTurnIndex(0)
        setCurrentLogIndex(0)
      }, 500)
      return () => clearTimeout(startTimer)
    }

    if (currentLogIndex >= turn.logs.length) {
      const nextTimer = setTimeout(() => {
        setCurrentTurnIndex(prev => prev + 1)
        setCurrentLogIndex(0)
      }, 600)
      return () => clearTimeout(nextTimer)
    }

    const log = turn.logs[currentLogIndex]
    const actionTimer = setTimeout(() => {
      if (log.damage && log.damage > 0) {
        const defenderState = turn.characterStates.find(c => c.name === log.defender)
        if (defenderState) {
          triggerShake(defenderState.id)
          addDamageNumber(log.damage, defenderState.id, log.isCrit, false)
          setDisplayHp(prev => ({
            ...prev,
            [defenderState.id]: Math.max(0, (prev[defenderState.id] ?? defenderState.maxHp) - log.damage)
          }))
        }
      }
      if (log.healing && log.healing > 0) {
        const attackerState = turn.characterStates.find(c => c.name === log.attacker)
        if (attackerState) {
          addDamageNumber(log.healing, attackerState.id, false, true)
          setDisplayHp(prev => ({
            ...prev,
            [attackerState.id]: Math.min(attackerState.maxHp, (prev[attackerState.id] ?? attackerState.maxHp) + log.healing)
          }))
        }
      }
      setCurrentLogIndex(prev => prev + 1)
    }, 700)

    return () => clearTimeout(actionTimer)
  }, [battleTurns, currentTurnIndex, currentLogIndex, addDamageNumber, triggerShake, setView])

  if (battleTurns.length === 0 || !battleResult) {
    return null
  }

  const charStates = battleTurns[Math.max(0, currentTurnIndex < battleTurns.length ? currentTurnIndex : battleTurns.length - 1)].characterStates
  const char1 = charStates[0]
  const char2 = charStates[1]

  const currentLog = currentTurnIndex >= 0 && currentTurnIndex < battleTurns.length
    ? battleTurns[currentTurnIndex].logs[Math.max(0, currentLogIndex - 1)]
    : null

  return (
    <div style={{ position: 'relative' }}>
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          width: '100%',
          height: 500,
          borderRadius: 16,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          padding: 0
        }}
      >
        {groundParticles.map(p => (
          <motion.div
            key={p.id}
            animate={{
              opacity: [p.opacity, p.opacity * 0.3, p.opacity],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut'
            }}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              bottom: `${10 + p.y * 0.2}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: `rgba(255, 255, 255, ${p.opacity})`,
              boxShadow: `0 0 ${p.size * 2}px rgba(255, 255, 255, ${p.opacity * 0.5})`,
              pointerEvents: 'none'
            }}
          />
        ))}

        <BattleCharacter
          name={char1.name}
          currentHp={displayHp[char1.id] ?? char1.maxHp}
          maxHp={char1.maxHp}
          isLeft={true}
          isShaking={shakingCharId === char1.id}
          accentColor="#3498DB"
        />

        <BattleCharacter
          name={char2.name}
          currentHp={displayHp[char2.id] ?? char2.maxHp}
          maxHp={char2.maxHp}
          isLeft={false}
          isShaking={shakingCharId === char2.id}
          accentColor="#E74C3C"
        />

        <AnimatePresence>
          {damageNumbers.map(dmg => (
            <motion.div
              key={dmg.id}
              initial={{ opacity: 1, y: 0, scale: dmg.isCrit ? 0.5 : 1 }}
              animate={{
                opacity: 0,
                y: -80,
                scale: dmg.isCrit ? [0.5, 1.5, 1.3] : 1
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: `${dmg.x}%`,
                top: `${dmg.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: dmg.isCrit ? 36 : 24,
                fontWeight: 700,
                color: dmg.isHeal ? '#4ADE80' : dmg.isCrit ? '#FFD700' : '#FF6B6B',
                textShadow: dmg.isCrit
                  ? '0 0 20px #FFD700, 2px 2px 4px rgba(0,0,0,0.8)'
                  : '2px 2px 4px rgba(0,0,0,0.8)',
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              {dmg.isHeal ? '+' : '-'}{dmg.value}
            </motion.div>
          ))}
        </AnimatePresence>

        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 20px',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: 20,
            fontSize: 16,
            fontWeight: 600,
            zIndex: 5
          }}
        >
          回合 {Math.max(0, currentTurnIndex + 1)} / {battleTurns.length}
        </div>
      </div>

      <motion.div
        className="glass-panel"
        style={{
          marginTop: 16,
          padding: 16,
          minHeight: 60
        }}
      >
        <AnimatePresence mode="wait">
          {currentLog && (
            <motion.div
              key={`${currentTurnIndex}-${currentLogIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
            >
              <span style={{ color: '#3498DB', fontWeight: 600 }}>{currentLog.attacker}</span>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>使用</span>
              <span style={{ color: '#FFD700', fontWeight: 600 }}>{currentLog.skill}</span>
              {currentLog.isDodge ? (
                <span style={{ color: '#87CEEB' }}>→ {currentLog.defender} 闪避了攻击!</span>
              ) : (
                <>
                  {currentLog.damage ? (
                    <span style={{ color: currentLog.isCrit ? '#FFD700' : '#FF6B6B' }}>
                      → 对 {currentLog.defender} 造成 <strong>{currentLog.damage}</strong> 伤害
                      {currentLog.isCrit && ' (暴击!)'}
                      {currentLog.shieldAbsorbed ? ` (护盾吸收 ${currentLog.shieldAbsorbed})` : ''}
                    </span>
                  ) : null}
                  {currentLog.healing ? (
                    <span style={{ color: '#4ADE80' }}>
                      → 回复 <strong>{currentLog.healing}</strong> 生命
                    </span>
                  ) : null}
                </>
              )}
            </motion.div>
          )}
          {!currentLog && currentTurnIndex < 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}
            >
              ⚔️ 战斗即将开始...
            </motion.div>
          )}
          {currentTurnIndex >= battleTurns.length && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: 'center', color: '#FFD700', fontSize: 18, fontWeight: 600 }}
            >
              🎉 战斗结束!
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

interface BattleCharacterProps {
  name: string
  currentHp: number
  maxHp: number
  isLeft: boolean
  isShaking: boolean
  accentColor: string
}

function BattleCharacter({ name, currentHp, maxHp, isLeft, isShaking, accentColor }: BattleCharacterProps) {
  const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100))

  return (
    <motion.div
      animate={isShaking ? { x: [0, -5, 5, -5, 5, 0] } : {}}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        top: '45%',
        left: isLeft ? '15%' : '75%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12
      }}
    >
      <div
        style={{
          padding: '6px 16px',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          color: accentColor,
          border: `1px solid ${accentColor}50`
        }}
      >
        {name}
      </div>

      <motion.div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${accentColor}, ${accentColor}80)`,
          boxShadow: `0 0 30px ${accentColor}80`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32
        }}
        animate={{
          boxShadow: [
            `0 0 20px ${accentColor}60`,
            `0 0 40px ${accentColor}90`,
            `0 0 20px ${accentColor}60`
          ]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {isLeft ? '🛡️' : '⚔️'}
      </motion.div>

      <div style={{ width: 120 }}>
        <div
          style={{
            height: 12,
            background: 'rgba(0,0,0,0.5)',
            borderRadius: 6,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          <motion.div
            initial={false}
            animate={{ width: `${hpPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: hpPercent > 50
                ? 'linear-gradient(90deg, #4ADE80, #22C55E)'
                : hpPercent > 25
                  ? 'linear-gradient(90deg, #FBBF24, #F59E0B)'
                  : 'linear-gradient(90deg, #F87171, #EF4444)',
              borderRadius: 6
            }}
          />
        </div>
        <div
          style={{
            textAlign: 'center',
            fontSize: 12,
            marginTop: 4,
            color: 'rgba(255,255,255,0.8)'
          }}
        >
          {Math.round(currentHp)} / {maxHp}
        </div>
      </div>
    </motion.div>
  )
}
