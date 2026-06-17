import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../store'
import { BattleResult as BattleResultType } from '../types'
import { simulateBattle } from '../engine/BattleEngine'

const gradeColors: Record<string, string> = {
  S: 'linear-gradient(135deg, #FFD700, #FFA500)',
  A: 'linear-gradient(135deg, #90EE90, #32CD32)',
  B: 'linear-gradient(135deg, #87CEEB, #4169E1)',
  C: 'linear-gradient(135deg, #DDA0DD, #9370DB)',
  D: 'linear-gradient(135deg, #CD853F, #8B4513)'
}

export default function BattleResult() {
  const { battleResult, character1, character2, resetBattle, setBattleData, setView } = useAppStore()

  if (!battleResult) {
    return (
      <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>暂无战斗结果</p>
      </div>
    )
  }

  const winner = battleResult.characters.find(c => c.id === battleResult.winnerId)

  const handleRebattle = () => {
    const { turns, result } = simulateBattle(character1, character2)
    setBattleData(turns, result)
    setView('battle')
  }

  return (
    <div className="glass-panel" style={{ padding: 32 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: 32 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          style={{
            display: 'inline-block',
            padding: '8px 24px',
            background: gradeColors[battleResult.grade] || gradeColors.D,
            borderRadius: 12,
            marginBottom: 12
          }}
        >
          <span style={{ fontSize: 42, fontWeight: 900, color: '#1a1a2e' }}>
            {battleResult.grade}
          </span>
        </motion.div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
          综合评分
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#FFD700' }}>
          {battleResult.score} 分
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
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
        style={{ display: 'flex', justifyContent: 'center', gap: 16 }}
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
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                      }}
                    >
                      {count}
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

function getSkillDisplayName(skillId: string): string {
  const names: Record<string, string> = {
    'fireball': '🔥 火球术',
    'heal-wave': '💚 治疗波',
    'shield': '🛡️ 护盾',
    'power-strike': '💥 强力打击',
    'lightning-bolt': '⚡ 闪电链',
    'ice-blast': '❄️ 冰霜爆发',
    'rage': '😤 狂暴',
    'holy-light': '✨ 圣光术',
    'basic-attack': '👊 普通攻击',
    'deadly-blow': '🎯 致命一击',
    'passive-regen': '💗 生命回复(被动)',
    'passive-thorns': '🌹 荆棘反伤(被动)'
  }
  return names[skillId] || skillId
}
