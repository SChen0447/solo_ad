import { useState, useEffect, useRef, useCallback } from 'react'
import type { Card } from './types'
import { getAllCards, recordBattle } from './api'
import { RARITY_COLORS } from './types'

type GamePhase = 'select' | 'rolling' | 'battle' | 'result' | 'gameover'

interface BattleState {
  phase: GamePhase
  round: number
  currentCardIndex: number
  player1HP: number
  player2HP: number
  player1Cards: Card[]
  player2Cards: Card[]
  dice1: number
  dice2: number
  roundResult: string
  attacker: 'player1' | 'player2' | null
  showParticles: boolean
}

const MAX_HP = 30
const TOTAL_ROUNDS = 3
const CARDS_PER_PLAYER = 3

export default function BattleArena() {
  const [allCards, setAllCards] = useState<Card[]>([])
  const [selectedP1, setSelectedP1] = useState<string[]>([])
  const [selectedP2, setSelectedP2] = useState<string[]>([])
  const [activePlayer, setActivePlayer] = useState<'player1' | 'player2'>('player1')
  const [battleState, setBattleState] = useState<BattleState>({
    phase: 'select',
    round: 1,
    currentCardIndex: 0,
    player1HP: MAX_HP,
    player2HP: MAX_HP,
    player1Cards: [],
    player2Cards: [],
    dice1: 1,
    dice2: 1,
    roundResult: '',
    attacker: null,
    showParticles: false
  })
  
  const diceAnimationRef = useRef<number | null>(null)
  const particleCanvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Array<{
    x: number; y: number; vx: number; vy: number; size: number; alpha: number; life: number
  }>>([])

  useEffect(() => {
    const fetchAll = async () => {
      const data = await getAllCards()
      setAllCards(data.cards)
    }
    fetchAll()
  }, [])

  const handleCardSelect = (card: Card, player: 'player1' | 'player2') => {
    const setter = player === 'player1' ? setSelectedP1 : setSelectedP2
    const selected = player === 'player1' ? selectedP1 : selectedP2
    
    if (selected.includes(card.id)) {
      setter(selected.filter(id => id !== card.id))
    } else if (selected.length < CARDS_PER_PLAYER) {
      setter([...selected, card.id])
    }
  }

  const startBattle = () => {
    const p1Cards = allCards.filter(c => selectedP1.includes(c.id))
    const p2Cards = allCards.filter(c => selectedP2.includes(c.id))
    
    if (p1Cards.length !== CARDS_PER_PLAYER || p2Cards.length !== CARDS_PER_PLAYER) {
      alert('双方各需选择3张卡牌！')
      return
    }

    setBattleState({
      phase: 'rolling',
      round: 1,
      currentCardIndex: 0,
      player1HP: MAX_HP,
      player2HP: MAX_HP,
      player1Cards: p1Cards,
      player2Cards: p2Cards,
      dice1: 1,
      dice2: 1,
      roundResult: '',
      attacker: null,
      showParticles: false
    })

    setTimeout(() => rollDice(), 500)
  }

  const rollDice = useCallback(() => {
    setBattleState(prev => ({ ...prev, phase: 'rolling' }))
    
    const final1 = Math.floor(Math.random() * 6) + 1
    const final2 = Math.floor(Math.random() * 6) + 1
    
    let startTime: number
    const duration = 1200
    let lastUpdate = 0
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      const easeOut = 1 - Math.pow(1 - progress, 3)
      
      if (timestamp - lastUpdate > 50) {
        const current1 = progress < 1 ? Math.floor(Math.random() * 6) + 1 : final1
        const current2 = progress < 1 ? Math.floor(Math.random() * 6) + 1 : final2
        
        setBattleState(prev => ({
          ...prev,
          dice1: current1,
          dice2: current2
        }))
        lastUpdate = timestamp
      }
      
      if (progress < 1) {
        diceAnimationRef.current = requestAnimationFrame(animate)
      } else {
        setBattleState(prev => ({
          ...prev,
          dice1: final1,
          dice2: final2,
          phase: 'battle'
        }))
        setTimeout(() => resolveRound(final1, final2), 300)
      }
    }
    
    diceAnimationRef.current = requestAnimationFrame(animate)
  }, [])

  const resolveRound = (d1: number, d2: number) => {
    setBattleState(prev => {
      const idx = prev.currentCardIndex
      const card1 = prev.player1Cards[idx]
      const card2 = prev.player2Cards[idx]
      
      let attacker: 'player1' | 'player2'
      let damage = 0
      let resultText = ''
      
      if (d1 > d2) {
        attacker = 'player1'
        damage = Math.max(0, card1.attack - card2.defense)
        resultText = `玩家1 掷出 ${d1} vs ${d2} 先手进攻！造成 ${damage} 点伤害`
      } else if (d2 > d1) {
        attacker = 'player2'
        damage = Math.max(0, card2.attack - card1.defense)
        resultText = `玩家2 掷出 ${d2} vs ${d1} 先手进攻！造成 ${damage} 点伤害`
      } else {
        attacker = 'player1'
        damage = 0
        resultText = `平局！双方掷出 ${d1} 点，本回合无伤害`
      }
      
      const newHP1 = attacker === 'player2' ? Math.max(0, prev.player1HP - damage) : prev.player1HP
      const newHP2 = attacker === 'player1' ? Math.max(0, prev.player2HP - damage) : prev.player2HP
      
      return {
        ...prev,
        attacker,
        player1HP: newHP1,
        player2HP: newHP2,
        roundResult: resultText,
        phase: 'result'
      }
    })

    setTimeout(() => {
      setBattleState(prev => {
        if (prev.player1HP <= 0 || prev.player2HP <= 0 || prev.round >= TOTAL_ROUNDS) {
          return { ...prev, phase: 'gameover', showParticles: true }
        }
        return prev
      })
    }, 1500)
  }

  const nextRound = () => {
    setBattleState(prev => ({
      ...prev,
      round: prev.round + 1,
      currentCardIndex: prev.currentCardIndex + 1,
      roundResult: '',
      attacker: null,
      phase: 'rolling'
    }))
    setTimeout(() => rollDice(), 300)
  }

  const endGame = useCallback(async () => {
    const winner = battleState.player1HP > battleState.player2HP 
      ? 'player1' 
      : battleState.player2HP > battleState.player1HP 
        ? 'player2' 
        : 'draw'
    
    try {
      await recordBattle({
        player1Cards: selectedP1,
        player2Cards: selectedP2,
        winner
      })
    } catch (e) {
      console.error('Failed to record battle:', e)
    }
  }, [battleState.player1HP, battleState.player2HP, selectedP1, selectedP2])

  useEffect(() => {
    if (battleState.phase === 'gameover') {
      endGame()
      startParticles()
    }
  }, [battleState.phase, endGame])

  const startParticles = () => {
    const canvas = particleCanvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    particlesRef.current = []
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40 + Math.random() * 0.5
      const speed = 2 + Math.random() * 4
      particlesRef.current.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 6,
        alpha: 1,
        life: 800
      })
    }
    
    let startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / 800, 1)
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      particlesRef.current.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.05
        p.alpha = 1 - progress
        
        ctx.fillStyle = `rgba(245, 158, 11, ${p.alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2)
        ctx.fill()
      })
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    animate()
  }

  const resetBattle = () => {
    setSelectedP1([])
    setSelectedP2([])
    setActivePlayer('player1')
    setBattleState({
      phase: 'select',
      round: 1,
      currentCardIndex: 0,
      player1HP: MAX_HP,
      player2HP: MAX_HP,
      player1Cards: [],
      player2Cards: [],
      dice1: 1,
      dice2: 1,
      roundResult: '',
      attacker: null,
      showParticles: false
    })
    if (diceAnimationRef.current) {
      cancelAnimationFrame(diceAnimationRef.current)
    }
  }

  const renderDice = (value: number) => {
    const dots = {
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[25, 25], [50, 50], [75, 75]],
      4: [[25, 25], [75, 25], [25, 75], [75, 75]],
      5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
      6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]]
    }
    
    return (
      <svg width="80" height="80" viewBox="0 0 100 100">
        <rect x="5" y="5" width="90" height="90" rx="12" fill="white" stroke="#E5E7EB" strokeWidth="2"/>
        {dots[value as keyof typeof dots]?.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="8" fill="#1F2937"/>
        ))}
      </svg>
    )
  }

  const renderBattleCard = (card: Card, isAttacker: boolean, isHit: boolean, side: 'left' | 'right') => {
    const rarityColor = RARITY_COLORS[card.rarity]
    
    return (
      <div 
        className={`battle-card ${isAttacker ? 'attacking' : ''} ${isHit ? 'hit' : ''} ${side}`}
        style={{ borderColor: rarityColor }}
      >
        <div className="battle-card-image">
          <img src={card.imageUrl} alt={card.name} />
        </div>
        <div className="battle-card-name">{card.name}</div>
        <div className="battle-card-stats">
          <span className="atk">⚔ {card.attack}</span>
          <span className="def">🛡 {card.defense}</span>
        </div>
      </div>
    )
  }

  const winner = battleState.player1HP > battleState.player2HP 
    ? '玩家1' 
    : battleState.player2HP > battleState.player1HP 
      ? '玩家2' 
      : '平局'

  return (
    <div className="battle-arena">
      <h2 className="section-title">对战竞技场</h2>
      
      {battleState.phase === 'select' ? (
        <div className="select-phase">
          <div className="player-select-tabs">
            <button 
              className={`tab-btn ${activePlayer === 'player1' ? 'active' : ''}`}
              onClick={() => setActivePlayer('player1')}
            >
              玩家1 ({selectedP1.length}/3)
            </button>
            <button 
              className={`tab-btn ${activePlayer === 'player2' ? 'active' : ''}`}
              onClick={() => setActivePlayer('player2')}
            >
              玩家2 ({selectedP2.length}/3)
            </button>
          </div>
          
          <div className="selected-preview">
            <div className="selected-row">
              <span>玩家1已选：</span>
              {[0, 1, 2].map(i => (
                <div key={i} className="selected-slot">
                  {selectedP1[i] ? (
                    <img 
                      src={allCards.find(c => c.id === selectedP1[i])?.imageUrl} 
                      alt="" 
                    />
                  ) : (
                    <span className="slot-num">{i + 1}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="selected-row">
              <span>玩家2已选：</span>
              {[0, 1, 2].map(i => (
                <div key={i} className="selected-slot">
                  {selectedP2[i] ? (
                    <img 
                      src={allCards.find(c => c.id === selectedP2[i])?.imageUrl} 
                      alt="" 
                    />
                  ) : (
                    <span className="slot-num">{i + 1}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card-select-grid">
            {allCards.map(card => {
              const isP1Selected = selectedP1.includes(card.id)
              const isP2Selected = selectedP2.includes(card.id)
              const currentSelected = activePlayer === 'player1' ? selectedP1 : selectedP2
              const canSelect = !currentSelected.includes(card.id) && currentSelected.length < 3
              
              return (
                <div
                  key={card.id}
                  className={`select-card ${isP1Selected ? 'p1-selected' : ''} ${isP2Selected ? 'p2-selected' : ''} ${!canSelect && !currentSelected.includes(card.id) ? 'disabled' : ''}`}
                  style={{ borderColor: RARITY_COLORS[card.rarity] }}
                  onClick={() => handleCardSelect(card, activePlayer)}
                >
                  <img src={card.imageUrl} alt={card.name} />
                  <div className="select-card-name">{card.name}</div>
                </div>
              )
            })}
          </div>

          <button 
            className="btn-primary start-btn"
            onClick={startBattle}
            disabled={selectedP1.length !== 3 || selectedP2.length !== 3}
          >
            开始对战！
          </button>
        </div>
      ) : (
        <div className="battle-phase">
          <div className="hp-bars">
            <div className="hp-bar-container">
              <div className="hp-label">玩家1 HP</div>
              <div className="hp-bar">
                <div 
                  className="hp-fill player1"
                  style={{ width: `${(battleState.player1HP / MAX_HP) * 100}%` }}
                />
              </div>
              <div className="hp-text">{battleState.player1HP} / {MAX_HP}</div>
            </div>
            <div className="round-info">
              <div className="round-num">第 {battleState.round} 回合</div>
              <div className="round-total">共 {TOTAL_ROUNDS} 回合</div>
            </div>
            <div className="hp-bar-container right">
              <div className="hp-label">玩家2 HP</div>
              <div className="hp-bar">
                <div 
                  className="hp-fill player2"
                  style={{ width: `${(battleState.player2HP / MAX_HP) * 100}%` }}
                />
              </div>
              <div className="hp-text">{battleState.player2HP} / {MAX_HP}</div>
            </div>
          </div>

          <div className="battle-field">
            <div className="player-side left">
              {battleState.player1Cards[battleState.currentCardIndex] && 
                renderBattleCard(
                  battleState.player1Cards[battleState.currentCardIndex],
                  battleState.attacker === 'player1' && battleState.phase === 'result',
                  battleState.attacker === 'player2' && battleState.phase === 'result',
                  'left'
                )
              }
            </div>

            <div className="dice-area">
              <div className={`dice ${battleState.phase === 'rolling' ? 'rolling' : ''}`}>
                {renderDice(battleState.dice1)}
                <span className="dice-label">玩家1</span>
              </div>
              <div className="vs">VS</div>
              <div className={`dice ${battleState.phase === 'rolling' ? 'rolling' : ''}`}>
                {renderDice(battleState.dice2)}
                <span className="dice-label">玩家2</span>
              </div>
            </div>

            <div className="player-side right">
              {battleState.player2Cards[battleState.currentCardIndex] && 
                renderBattleCard(
                  battleState.player2Cards[battleState.currentCardIndex],
                  battleState.attacker === 'player2' && battleState.phase === 'result',
                  battleState.attacker === 'player1' && battleState.phase === 'result',
                  'right'
                )
              }
            </div>
          </div>

          {battleState.roundResult && (
            <div className={`round-result ${battleState.phase === 'result' ? 'show' : ''}`}>
              {battleState.roundResult}
            </div>
          )}

          {battleState.phase === 'result' && battleState.round < TOTAL_ROUNDS && (
            <button className="btn-primary next-btn" onClick={nextRound}>
              下一回合
            </button>
          )}

          {battleState.phase === 'gameover' && (
            <div className="game-over">
              <canvas ref={particleCanvasRef} width={600} height={300} className="particle-canvas" />
              <div className="winner-text">
                {winner === '平局' ? '🤝 平局！' : `🏆 ${winner} 获胜！`}
              </div>
              <button className="btn-primary" onClick={resetBattle}>
                再来一局
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        .battle-arena {
          padding: 20px;
        }
        .section-title {
          font-size: 40px;
          font-weight: bold;
          color: #F59E0B;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
          text-align: center;
          margin-bottom: 24px;
        }
        .btn-primary {
          min-width: 120px;
          height: 44px;
          padding: 0 24px;
          border-radius: 22px;
          background: linear-gradient(135deg, #F59E0B, #D97706);
          color: #1E293B;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .select-phase {
          max-width: 900px;
          margin: 0 auto;
        }
        .player-select-tabs {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-bottom: 16px;
        }
        .tab-btn {
          min-width: 140px;
          height: 40px;
          border-radius: 20px;
          background: #475569;
          color: #E5E7EB;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        .tab-btn.active {
          background: linear-gradient(135deg, #F59E0B, #D97706);
          color: #1E293B;
          font-weight: 600;
        }
        .selected-preview {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 16px;
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .selected-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: #9CA3AF;
        }
        .selected-slot {
          width: 50px;
          height: 70px;
          border-radius: 6px;
          background: #334155;
          border: 2px dashed #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .selected-slot img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .slot-num {
          color: #64748B;
          font-size: 20px;
        }
        .card-select-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
          margin-bottom: 24px;
          max-height: 400px;
          overflow-y: auto;
          padding: 8px;
        }
        .select-card {
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #475569;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #1E293B;
        }
        .select-card:hover:not(.disabled) {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .select-card img {
          width: 100%;
          height: 100px;
          object-fit: cover;
        }
        .select-card-name {
          padding: 6px;
          font-size: 12px;
          text-align: center;
          color: #E5E7EB;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .select-card.p1-selected {
          box-shadow: 0 0 0 3px #3B82F6;
        }
        .select-card.p2-selected {
          box-shadow: 0 0 0 3px #EF4444;
        }
        .select-card.p1-selected.p2-selected {
          box-shadow: 0 0 0 3px #3B82F6, 0 0 0 6px #EF4444;
        }
        .select-card.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .start-btn {
          display: block;
          margin: 0 auto;
          width: 200px;
          font-size: 16px;
        }
        .battle-phase {
          max-width: 900px;
          margin: 0 auto;
        }
        .hp-bars {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding: 0 20px;
        }
        .hp-bar-container {
          flex: 1;
          max-width: 300px;
        }
        .hp-bar-container.right {
          text-align: right;
        }
        .hp-label {
          font-size: 14px;
          color: #9CA3AF;
          margin-bottom: 6px;
        }
        .hp-bar {
          height: 24px;
          background: #334155;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid #475569;
        }
        .hp-fill {
          height: 100%;
          transition: width 0.5s ease;
          border-radius: 10px;
        }
        .hp-fill.player1 {
          background: linear-gradient(90deg, #3B82F6, #60A5FA);
        }
        .hp-fill.player2 {
          background: linear-gradient(90deg, #EF4444, #F87171);
          margin-left: auto;
        }
        .hp-text {
          font-size: 14px;
          color: #E5E7EB;
          margin-top: 4px;
          font-weight: 600;
        }
        .round-info {
          text-align: center;
        }
        .round-num {
          font-size: 24px;
          font-weight: bold;
          color: #F59E0B;
        }
        .round-total {
          font-size: 12px;
          color: #9CA3AF;
        }
        .battle-field {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 40px 20px;
          position: relative;
        }
        .player-side {
          flex: 1;
          display: flex;
          justify-content: center;
        }
        .battle-card {
          width: 160px;
          border-radius: 10px;
          background: #1E293B;
          border: 3px solid #475569;
          overflow: hidden;
          transition: transform 0.3s ease;
          position: relative;
        }
        .battle-card.attacking.left {
          transform: translateX(30px);
        }
        .battle-card.attacking.right {
          transform: translateX(-30px);
        }
        .battle-card.hit {
          animation: hitFlash 0.2s ease;
        }
        @keyframes hitFlash {
          0%, 100% { filter: none; }
          50% { filter: brightness(1.5) drop-shadow(0 0 20px #EF4444); }
        }
        .battle-card-image {
          width: 100%;
          height: 130px;
          background: #334155;
        }
        .battle-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .battle-card-name {
          padding: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #F9FAFB;
          text-align: center;
        }
        .battle-card-stats {
          display: flex;
          justify-content: space-around;
          padding: 0 8px 10px;
          font-size: 13px;
        }
        .battle-card-stats .atk {
          color: #EF4444;
          font-weight: 600;
        }
        .battle-card-stats .def {
          color: #3B82F6;
          font-weight: 600;
        }
        .dice-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .dice {
          transition: transform 0.1s ease;
        }
        .dice.rolling {
          animation: diceShake 0.1s ease infinite;
        }
        @keyframes diceShake {
          0%, 100% { transform: rotate(-5deg) scale(1); }
          50% { transform: rotate(5deg) scale(1.05); }
        }
        .dice-label {
          display: block;
          text-align: center;
          font-size: 12px;
          color: #9CA3AF;
          margin-top: 4px;
        }
        .vs {
          font-size: 20px;
          font-weight: bold;
          color: #F59E0B;
          margin: 4px 0;
        }
        .round-result {
          text-align: center;
          font-size: 24px;
          color: #1F2937;
          background: #F9FAFB;
          padding: 16px 32px;
          border-radius: 12px;
          margin: 20px auto;
          max-width: 500px;
          opacity: 0;
          transform: translateY(20px);
        }
        .round-result.show {
          animation: slideUp 0.4s ease forwards;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .next-btn {
          display: block;
          margin: 20px auto;
        }
        .game-over {
          text-align: center;
          padding: 40px 20px;
          position: relative;
        }
        .particle-canvas {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          pointer-events: none;
        }
        .winner-text {
          font-size: 36px;
          font-weight: bold;
          color: #F59E0B;
          text-shadow: 2px 2px 8px rgba(0,0,0,0.5);
          margin-bottom: 24px;
        }
      `}</style>
    </div>
  )
}
