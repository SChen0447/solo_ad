import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store'
import { BattleResult as BattleResultType } from '../types'
import { simulateBattle } from '../engine/BattleEngine'

const gradeStyles: Record<string, { bg: string; textColor: string; sparkle?: boolean }> = {
  S: {
    bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
    textColor: '#1a1a2e',
    sparkle: true
  },
  A: {
    bg: 'linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 50%, #A8A8A8 100%)',
    textColor: '#1a1a2e'
  },
  B: {
    bg: 'linear-gradient(135deg, #CD7F32 0%, #B87333 50%, #8B4513 100%)',
    textColor: '#ffffff'
  },
  C: {
    bg: 'linear-gradient(135deg, #A0A0A0 0%, #808080 50%, #606060 100%)',
    textColor: '#ffffff'
  },
  D: {
    bg: 'linear-gradient(135deg, #808080 0%, #606060 50%, #404040 100%)',
    textColor: '#ffffff'
  }
}

interface SkillInfo {
  displayName: string
  icon: string
  type: 'damage' | 'heal' | 'shield' | 'buff'
}

const skillInfoMap: Record<string, SkillInfo> = {
  'fireball': { displayName: '火球术', icon: '🔥', type: 'damage' },
  'heal-wave': { displayName: '治疗波', icon: '💚', type: 'heal' },
  'shield': { displayName: '护盾', icon: '🛡️', type: 'shield' },
  'power-strike': { displayName: '强力打击', icon: '💥', type: 'damage' },
  'lightning-bolt': { displayName: '闪电链', icon: '⚡', type: 'damage' },
  'ice-blast': { displayName: '冰霜爆发', icon: '❄️', type: 'damage' },
  'rage': { displayName: '狂暴', icon: '😤', type: 'damage' },
  'holy-light': { displayName: '圣光术', icon: '✨', type: 'heal' },
  'basic-attack': { displayName: '普通攻击', icon: '👊', type: 'damage' },
  'deadly-blow': { displayName: '致命一击', icon: '🎯', type: 'damage' },
  'passive-regen': { displayName: '生命回复', icon: '💗', type: 'buff' },
  'passive-thorns': { displayName: '荆棘反伤', icon: '🌹', type: 'buff' }
}

function getSkillIcon(skillId: string): string {
  const info = skillInfoMap[skillId]
  if (!info) return '⚔️'
  if (info.type === 'damage') return '⚔️'
  if (info.type === 'heal') return '❤️'
  if (info.type === 'shield') return '🛡️'
  return '✨'
}

function getSkillDisplayName(skillId: string): string {
  const info = skillInfoMap[skillId]
  if (!info) return skillId
  return `${info.icon} ${info.displayName}`
}

export default function BattleResult() {
  const { battleResult, character1, character2, resetBattle, setBattleData, setView } = useAppStore()
  const [copied, setCopied] = useState(false)

  if (!battleResult) {
    return (
      <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>暂无战斗结果</p>
      </div>
    )
  }

  const winner = battleResult.characters.find(c => c.id === battleResult.winnerId)
  const grade = battleResult.grade
  const gradeStyle = gradeStyles[grade] || gradeStyles.D

  const handleRebattle = () => {
    const { turns, result } = simulateBattle(character1, character2)
    setBattleData(turns, result)
    setView('battle')
  }

  const handleShare = async () => {
    const c1 = battleResult.characters[0]
    const c2 = battleResult.characters[1]
    const winnerName = winner?.name || '平局'

    const text = `⚔️ 战斗结果报告
━━━━━━━━━━━━━━━━━━━━━━
🏆 胜者：${winnerName}
⭐ 综合评分：${grade}级 (${battleResult.score}分)
⏱️ 总回合数：${battleResult.totalTurns}
━━━━━━━━━━━━━━━━━━━━━━
📊 ${c1.name}：
  ❤️ 剩余生命：${c1.finalHp}/${c1.maxHp}
  ⚔️ 总输出：${c1.totalDamage}
  💚 总治疗：${c1.totalHealing}
  💥 暴击：${c1.critHits}次 | 🌀 闪避：${c1.dodges}次
━━━━━━━━━━━━━━━━━━━━━━
📊 ${c2.name}：
  ❤️ 剩余生命：${c2.finalHp}/${c2.maxHp}
  ⚔️ 总输出：${c2.totalDamage}
  💚 总治疗：${c2.totalHealing}
  💥 暴击：${c2.critHits}次 | 🌀 闪避：${c2.dodges}次
━━━━━━━━━━━━━━━━━━━━━━`

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div className="glass-panel" style={{ padding: 32 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: 24 }}
      >
        <div style={{ position: 'relative', height: 80, marginBottom: 16 }}>
          <AnimatePresence mode="wait">
            {winner && (
              <motion.div
                key="trophy"
                initial={{ y: 100, opacity: 0, rotate: 0 }}
                animate={{ y: 0, opacity: 1, rotate: 360 }}
                exit={{ y: -100, opacity: 0 }}
                transition={{ duration: 0.5, type: 'spring', stiffness: 120, damping: 14 }}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 64
                }}
              >
                🏆
              </motion.div>
            )}
            {!winner && (
              <motion.div
                key="tie"
                initial={{ y: -50, opacity: 0 }}
                animate={{
                  y: 0,
                  opacity: 1,
                  x: [0, -8, 8, -8, 8, 0]
                }}
                transition={{
                  opacity: { duration: 0.3 },
                  y: { duration: 0.4 },
                  x: { duration: 0.5, delay: 0.3 }
                }}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 56,
                  filter: 'grayscale(60%)'
                }}
              >
                🛡️
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
          <motion.div
            key={grade}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, duration: 0.3 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 90,
              height: 90,
              borderRadius: '50%',
              background: gradeStyle.bg,
              boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 60px ${grade === 'S' ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.1)'}`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {gradeStyle.sparkle && (
              <>
                <motion.div
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0.5, 1.2, 0.5],
                    rotate: [0, 180, 360]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 12,
                    fontSize: 16
                  }}
                >
                  ✨
                </motion.div>
                <motion.div
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0.5, 1.2, 0.5],
                    rotate: [0, -180, -360]
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    right: 10,
                    fontSize: 14
                  }}
                >
                  ⭐
                </motion.div>
                <motion.div
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0.3, 1, 0.3]
                  }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    fontSize: 10
                  }}
                >
                  ✦
                </motion.div>
              </>
            )}
            <span
              style={{
                fontSize: 48,
                fontWeight: 900,
                color: gradeStyle.textColor,
                letterSpacing: 2,
                zIndex: 2,
                textShadow: grade === 'S' ? '0 2px 8px rgba(255,165,0,0.6)' : 'none'
              }}
            >
              {grade}
            </span>
          </motion.div>
        </div>

        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
          综合评分
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#FFD700' }}>
          {battleResult.score} 分
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ marginTop: 16, fontSize: 20 }}
        >
          {winner ? (
            <span>
              🎉 <span style={{ color: '#FFD700', fontWeight: 700 }}>{winner.name}</span> 获得胜利!
            </span>
          ) : (
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>⚔️ 双方战平!</span>
          )}
        </motion.div>

        <div style={{ marginTop: 8, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          总回合数: {battleResult.totalTurns}
        </div>
      </motion.div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          marginBottom: 24
        }}
      >
        {battleResult.characters.map((char, idx) => (
          <CharacterStatsCard
            key={char.id}
            char={char}
            isWinner={char.id === battleResult.winnerId}
            accentColor={idx === 0 ? '#3498DB' : '#E74C3C'}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel"
        style={{ padding: 20, marginBottom: 24 }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'rgba(255,255,255,0.9)' }}>
          📊 技能使用次数对比
        </h3>
        <SkillUsageChart result={battleResult} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24
        }}
      >
        {battleResult.characters.map((char, idx) => (
          <div key={`crit-${char.id}`} className="glass-panel" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{char.name} 暴击</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: idx === 0 ? '#3498DB' : '#E74C3C' }}>{char.critHits}</div>
          </div>
        ))}
        {battleResult.characters.map((char, idx) => (
          <div key={`dodge-${char.id}`} className="glass-panel" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{char.name} 闪避</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: idx === 0 ? '#3498DB' : '#E74C3C' }}>{char.dodges}</div>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}
      >
        <motion.button
          className="btn btn-primary"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRebattle}
          style={{ padding: '12px 28px', fontSize: 15 }}
        >
          🔄 重新战斗
        </motion.button>
        <AnimatePresence mode="wait">
          <motion.button
            key={copied ? 'copied' : 'copy'}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="btn"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            disabled={copied}
            style={{
              padding: '12px 28px',
              fontSize: 15,
              background: copied
                ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            {copied ? '✅ 已复制' : '📋 分享战绩'}
          </motion.button>
        </AnimatePresence>
        <motion.button
          className="btn btn-secondary"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={resetBattle}
          style={{ padding: '12px 28px', fontSize: 15 }}
        >
          ⚙️ 调整配置
        </motion.button>
      </motion.div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  )
}

interface CharacterStatsCardProps {
  char: BattleResultType['characters'][0]
  isWinner: boolean
  accentColor: string
}

function CharacterStatsCard({ char, isWinner, accentColor }: CharacterStatsCardProps) {
  const hpPercent = Math.max(0, Math.min(100, (char.finalHp / char.maxHp) * 100))

  return (
    <motion.div
      initial={{ opacity: 0, x: isWinner ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: isWinner ? 0.3 : 0.4 }}
      className="glass-panel"
      style={{
        padding: 20,
        border: isWinner ? `2px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)',
        position: 'relative'
      }}
    >
      {isWinner && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.5 }}
          style={{
            position: 'absolute',
            top: -12,
            right: -12,
            fontSize: 28
          }}
        >
          👑
        </motion.div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, ${accentColor}, ${accentColor}80)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24
          }}
        >
          {isWinner ? '🏆' : '💀'}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: accentColor }}>
            {char.name}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            {isWinner ? '胜者' : '败者'}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>剩余生命</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {char.finalHp} / {char.maxHp}
          </span>
        </div>
        <div style={{ height: 10, background: 'rgba(0,0,0,0.3)', borderRadius: 5, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${hpPercent}%` }}
            transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: hpPercent > 50
                ? 'linear-gradient(90deg, #4ADE80, #22C55E)'
                : hpPercent > 25
                  ? 'linear-gradient(90deg, #FBBF24, #F59E0B)'
                  : 'linear-gradient(90deg, #F87171, #EF4444)',
              borderRadius: 5
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <StatBlock label="总输出" value={char.totalDamage} color="#FF6B6B" />
        <StatBlock label="总治疗" value={char.totalHealing} color="#4ADE80" />
        <StatBlock label="暴击次数" value={char.critHits} color="#FFD700" />
        <StatBlock label="闪避次数" value={char.dodges} color="#87CEEB" />
        <StatBlock label="连击数" value={char.comboCount} color="#DDA0DD" />
      </div>
    </motion.div>
  )
}

function StatBlock({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        padding: 10,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 8,
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function SkillUsageChart({ result }: { result: BattleResultType }) {
  const allSkillIds = useMemo(() => {
    const ids = new Set<string>()
    result.characters.forEach(c => {
      Object.keys(c.skillUsage).forEach(k => ids.add(k))
    })
    return Array.from(ids)
  }, [result])

  const maxValue = useMemo(() => {
    let max = 0
    result.characters.forEach(c => {
      Object.values(c.skillUsage).forEach(v => {
        if (v > max) max = v
      })
    })
    return Math.max(1, max)
  }, [result])

  const colors = ['#3498DB', '#E74C3C']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {allSkillIds.map(skillId => {
        const usages = result.characters.map(c => c.skillUsage[skillId] || 0)
        const charNames = result.characters.map(c => c.name)
        const typeIcon = getSkillIcon(skillId)

        return (
          <div key={skillId} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 13, marginBottom: 6, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
              {getSkillDisplayName(skillId)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {usages.map((count, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 60, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                    {charNames[idx]}
                  </div>
                  <div style={{ flex: 1, height: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / maxValue) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
                      style={{
                        height: '100%',
                        background: colors[idx],
                        borderRadius: 4
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'white',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <span style={{ fontSize: 11 }}>{typeIcon}</span>
                      <span>{count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
