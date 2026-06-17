import React, { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { BattleEngine } from '../game/BattleEngine';
import { GameScene } from '../game/GameScene';
import { BattleState, Card, RuneType, CreatureOnBoard } from '../game/types';
import RuneSelector from './RuneSelector';
import HandCards from './HandCards';
import DeckPanel from './DeckPanel';
import Scoreboard from './Scoreboard';

interface BattlePageProps {
  onBack?: () => void;
  playerId?: string;
}

const BattlePage: React.FC<BattlePageProps> = ({ onBack, playerId = 'player1' }) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const battleEngineRef = useRef<BattleEngine | null>(null);
  const gameSceneRef = useRef<GameScene | null>(null);
  
  const [phase, setPhase] = useState<'rune_select' | 'battle' | 'ended'>('rune_select');
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [playerRunes, setPlayerRunes] = useState<RuneType[]>([]);
  const [enemyRunes, setEnemyRunes] = useState<RuneType[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'click' | 'card' | 'attack' | 'damage' | 'victory' | 'defeat') => {
    if (isMuted) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      switch (type) {
        case 'click':
          oscillator.frequency.setValueAtTime(600, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.1);
          break;
        case 'card':
          oscillator.frequency.setValueAtTime(500, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
        case 'attack':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(200, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.1);
          break;
        case 'damage':
          oscillator.type = 'square';
          oscillator.frequency.setValueAtTime(150, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
          break;
        case 'victory':
          const notes = [523.25, 659.25, 783.99, 1046.50];
          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
            gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + i * 0.15 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.3);
          });
          return;
        case 'defeat':
          const defeatNotes = [400, 350, 300, 200];
          defeatNotes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.2);
            gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + i * 0.2 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.4);
            osc.start(ctx.currentTime + i * 0.2);
            osc.stop(ctx.currentTime + i * 0.2 + 0.4);
          });
          return;
      }
    } catch (e) {
      console.error('Audio error:', e);
    }
  }, [isMuted]);

  const generateMockDeck = useCallback((runes: RuneType[]): Card[] => {
    const cards: Card[] = [];
    const cardTemplates: Record<RuneType, Partial<Card>[]> = {
      fire: [
        { id: 'fireball', name: '火球术', type: 'spell', cost: 2, damage: 4, description: '对敌方英雄造成4点伤害' },
        { id: 'flame_burst', name: '烈焰爆发', type: 'spell', cost: 3, damage: 3, target_all: true, description: '对所有敌人造成3点伤害' },
        { id: 'fire_elemental', name: '火元素', type: 'creature', cost: 3, attack: 4, health: 3, description: '召唤火元素' },
        { id: 'phoenix', name: '凤凰', type: 'creature', cost: 5, attack: 5, health: 4, description: '召唤凤凰' },
        { id: 'inferno', name: '地狱火', type: 'spell', cost: 6, damage: 8, description: '造成8点伤害' }
      ],
      ice: [
        { id: 'ice_spike', name: '冰锥术', type: 'spell', cost: 2, damage: 2, freeze: true, description: '造成2点伤害并冻结' },
        { id: 'frost_nova', name: '霜冻新星', type: 'spell', cost: 3, damage: 1, freeze_all: true, description: '冻结所有敌人' },
        { id: 'ice_golem', name: '冰霜巨人', type: 'creature', cost: 4, attack: 3, health: 6, description: '召唤冰霜巨人' },
        { id: 'frost_mage', name: '冰霜法师', type: 'creature', cost: 3, attack: 2, health: 4, description: '召唤冰霜法师' },
        { id: 'absolute_zero', name: '绝对零度', type: 'spell', cost: 7, damage: 4, freeze_all: true, description: '冻结并造成伤害' }
      ],
      thunder: [
        { id: 'lightning_bolt', name: '闪电箭', type: 'spell', cost: 1, damage: 3, description: '造成3点伤害' },
        { id: 'chain_lightning', name: '闪电链', type: 'spell', cost: 3, damage: 2, chain_count: 3, description: '闪电跳跃攻击' },
        { id: 'thunder_wolf', name: '雷狼', type: 'creature', cost: 2, attack: 3, health: 2, description: '召唤雷狼' },
        { id: 'storm_elemental', name: '风暴元素', type: 'creature', cost: 4, attack: 5, health: 3, description: '召唤风暴元素' },
        { id: 'divine_thunder', name: '神雷', type: 'spell', cost: 5, damage: 6, target_all: true, description: '对所有敌人造成6点伤害' }
      ],
      shadow: [
        { id: 'shadow_bolt', name: '暗影箭', type: 'spell', cost: 2, damage: 3, description: '暗影箭造成3点伤害' },
        { id: 'drain_life', name: '生命汲取', type: 'spell', cost: 3, damage: 2, heal: 2, description: '造成伤害并恢复生命' },
        { id: 'shadow_wraith', name: '暗影幽灵', type: 'creature', cost: 2, attack: 2, health: 2, description: '召唤暗影幽灵' },
        { id: 'demon_lord', name: '恶魔领主', type: 'creature', cost: 5, attack: 6, health: 5, description: '召唤恶魔领主' },
        { id: 'void_embrace', name: '虚空拥抱', type: 'spell', cost: 6, damage: 5, description: '虚空伤害' }
      ],
      light: [
        { id: 'holy_light', name: '圣光术', type: 'spell', cost: 1, heal: 3, description: '恢复3点生命' },
        { id: 'holy_smite', name: '神圣惩击', type: 'spell', cost: 2, damage: 3, heal: 1, description: '造成伤害并恢复生命' },
        { id: 'holy_knight', name: '圣光骑士', type: 'creature', cost: 3, attack: 3, health: 4, description: '召唤圣光骑士' },
        { id: 'angel', name: '天使', type: 'creature', cost: 5, attack: 4, health: 6, description: '召唤天使' },
        { id: 'divine_blessing', name: '神圣祝福', type: 'spell', cost: 4, heal: 8, description: '恢复8点生命' }
      ],
      nature: [
        { id: 'vine_trap', name: '藤蔓陷阱', type: 'spell', cost: 1, freeze: true, description: '缠绕敌方单位' },
        { id: 'healing_spring', name: '治愈之泉', type: 'spell', cost: 2, heal: 4, description: '恢复4点生命' },
        { id: 'forest_wolf', name: '森林狼', type: 'creature', cost: 1, attack: 2, health: 1, description: '召唤森林狼' },
        { id: 'treant', name: '树人', type: 'creature', cost: 4, attack: 3, health: 7, description: '召唤树人' },
        { id: 'ancient_of_war', name: '战争古树', type: 'creature', cost: 6, attack: 5, health: 10, description: '召唤战争古树' }
      ]
    };

    const rarities: Array<'common' | 'rare' | 'epic' | 'legendary'> = ['common', 'common', 'common', 'rare', 'rare', 'epic', 'legendary'];

    runes.forEach((rune, runeIndex) => {
      const templates = cardTemplates[rune];
      templates.forEach((template, index) => {
        const rarity = rarities[(runeIndex + index) % rarities.length];
        for (let copy = 0; copy < 2; copy++) {
          cards.push({
            uid: `${rune}_${template.id}_${copy}`,
            instance_id: `${rune}_${template.id}_${copy}_${Date.now()}_${Math.random()}`,
            id: template.id || '',
            name: template.name || '',
            type: template.type || 'spell',
            cost: template.cost || 1,
            element: rune,
            rarity,
            description: template.description || '',
            damage: template.damage,
            heal: template.heal,
            freeze: template.freeze,
            freeze_all: template.freeze_all,
            target_all: template.target_all,
            chain_count: template.chain_count,
            attack: template.attack,
            health: template.health
          } as Card);
        }
      });
    });

    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    return cards;
  }, []);

  const initGame = useCallback(() => {
    if (!gameContainerRef.current || battleEngineRef.current) return;

    const battleEngine = new BattleEngine();
    battleEngineRef.current = battleEngine;

    const enemyRunesSelected: RuneType[] = ['fire', 'ice', 'nature'];
    setEnemyRunes(enemyRunesSelected);
    
    const playerDeck = generateMockDeck(playerRunes);
    const enemyDeck = generateMockDeck(enemyRunesSelected);
    
    battleEngine.selectRunes('player', playerRunes, playerDeck);
    const finalState = battleEngine.selectRunes('enemy', enemyRunesSelected, enemyDeck);
    
    setBattleState(finalState);
    setPhase('battle');
    playSound('card');
  }, [playerRunes, generateMockDeck, playSound]);

  useEffect(() => {
    if (phase !== 'battle' || !gameContainerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameContainerRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#1a0f1e',
      scene: [GameScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      fps: {
        target: 60,
        forceSetTimeOut: false
      },
      render: {
        pixelArt: false,
        antialias: true
      }
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    game.events.on('ready', () => {
      const scene = game.scene.getScene('GameScene') as GameScene;
      gameSceneRef.current = scene;
      
      if (battleEngineRef.current) {
        scene.scene.start('GameScene', { battleEngine: battleEngineRef.current });
        
        scene.setOnStateChange((state) => {
          setBattleState({ ...state });
        });
        
        scene.setOnCardPlay((cardId, position, isHero) => {
          if (battleEngineRef.current) {
            const result = battleEngineRef.current.playCard('player', cardId, position, isHero);
            if (result.valid) {
              playSound('card');
              setSelectedCardId(null);
            }
          }
        });
        
        scene.setOnCreatureAttack((creatureId, position, isHero) => {
          if (battleEngineRef.current) {
            const result = battleEngineRef.current.creatureAttack('player', creatureId, position, isHero);
            if (result.valid) {
              playSound('attack');
            }
          }
        });
        
        scene.setOnEndTurn(() => {
          if (battleEngineRef.current) {
            battleEngineRef.current.endTurn('player');
            playSound('click');
            
            setTimeout(() => {
              if (battleEngineRef.current && battleEngineRef.current.getState().current_player === 'enemy') {
                simulateEnemyTurn();
              }
            }, 1500);
          }
        });
      }
    });

    const handleResize = () => {
      if (game) {
        game.scale.resize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (game) {
        game.destroy(true);
        gameRef.current = null;
      }
    };
  }, [phase, playSound]);

  useEffect(() => {
    if (phase !== 'battle' || !battleEngineRef.current) return;

    let animationId: number;
    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (battleEngineRef.current) {
        const result = battleEngineRef.current.tickTimer(deltaTime);
        if (result.timeUp && result.state.current_player === 'player') {
          // 时间到，自动结束回合
        }
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [phase]);

  useEffect(() => {
    if (battleState && battleState.phase === 'ended') {
      setPhase('ended');
      if (battleState.winner === 'player') {
        playSound('victory');
        saveStats(true);
      } else {
        playSound('defeat');
        saveStats(false);
      }
    }
  }, [battleState, playSound]);

  const saveStats = (won: boolean) => {
    try {
      const saved = localStorage.getItem('rune_alchemy_stats');
      const stats = saved ? JSON.parse(saved) : { wins: 0, losses: 0 };
      
      if (won) {
        stats.wins++;
      } else {
        stats.losses++;
      }
      
      localStorage.setItem('rune_alchemy_stats', JSON.stringify(stats));
    } catch (e) {
      console.error('Failed to save stats:', e);
    }
  };

  const simulateEnemyTurn = () => {
    if (!battleEngineRef.current) return;
    
    const engine = battleEngineRef.current;
    
    const playEnemyCard = () => {
      const state = engine.getState();
      if (state.current_player !== 'enemy' || state.phase !== 'battle') return;
      
      const enemyHand = state.enemy.hand;
      const playableCards = enemyHand.filter(c => c.cost <= state.enemy.hero.mana);
      
      if (playableCards.length > 0) {
        const card = playableCards[Math.floor(Math.random() * playableCards.length)];
        
        if (card.type === 'creature') {
          for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
              const cell = state.enemy.battlefield[row][col];
              if (!cell.creature && !cell.frozen) {
                engine.playCard('enemy', card.instance_id, { row, col });
                playSound('card');
                break;
              }
            }
          }
        } else if (card.type === 'spell') {
          if (card.damage && card.target_all) {
            engine.playCard('enemy', card.instance_id);
            playSound('card');
          } else if (card.damage) {
            for (let row = 0; row < 3; row++) {
              for (let col = 0; col < 3; col++) {
                const cell = state.player.battlefield[row][col];
                if (cell.creature) {
                  engine.playCard('enemy', card.instance_id, { row, col });
                  playSound('card');
                  break;
                }
              }
            }
          } else if (card.heal) {
            engine.playCard('enemy', card.instance_id);
            playSound('card');
          }
        }
      }
      
      setTimeout(() => {
        if (engine.getState().current_player === 'enemy') {
          attackWithCreatures();
        }
      }, 800);
    };
    
    const attackWithCreatures = () => {
      const state = engine.getState();
      if (state.current_player !== 'enemy' || state.phase !== 'battle') return;
      
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const cell = state.enemy.battlefield[row][col];
          if (cell.creature && cell.creature.can_attack && !cell.creature.frozen) {
            let hasTarget = false;
            for (let pRow = 0; pRow < 3; pRow++) {
              for (let pCol = 0; pCol < 3; pCol++) {
                const playerCell = state.player.battlefield[pRow][pCol];
                if (playerCell.creature) {
                  engine.creatureAttack('enemy', cell.creature.instance_id, { row: pRow, col: pCol });
                  playSound('attack');
                  hasTarget = true;
                  break;
                }
              }
              if (hasTarget) break;
            }
            
            if (!hasTarget) {
              engine.creatureAttack('enemy', cell.creature.instance_id, undefined, true);
              playSound('damage');
            }
          }
        }
      }
      
      setTimeout(() => {
        if (engine.getState().current_player === 'enemy') {
          engine.endTurn('enemy');
          playSound('click');
        }
      }, 1000);
    };
    
    setTimeout(() => {
      playEnemyCard();
    }, 800);
  };

  const handleRunesSelected = (runes: RuneType[]) => {
    setPlayerRunes(runes);
    playSound('click');
  };

  const handleCardSelect = (card: Card) => {
    if (selectedCardId === card.instance_id) {
      setSelectedCardId(null);
      if (gameSceneRef.current) {
        gameSceneRef.current.cancelSelection();
      }
    } else {
      setSelectedCardId(card.instance_id);
      if (gameSceneRef.current) {
        gameSceneRef.current.playCard(card.instance_id);
      }
      playSound('click');
    }
  };

  const handleDrawCard = () => {
    if (battleEngineRef.current && battleState?.current_player === 'player') {
      battleEngineRef.current.drawCard('player');
      playSound('card');
    }
  };

  const handleRestart = () => {
    setPhase('rune_select');
    setPlayerRunes([]);
    setBattleState(null);
    setSelectedCardId(null);
    
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
    if (battleEngineRef.current) {
      battleEngineRef.current.dispose();
      battleEngineRef.current = null;
    }
    
    playSound('click');
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  return (
    <div className="battle-page">
      {phase === 'rune_select' && (
        <RuneSelector
          onRunesSelected={handleRunesSelected}
          selectedRunes={playerRunes}
        />
      )}

      {phase === 'battle' && (
        <>
          <Scoreboard
            playerId={playerId}
            showLeft={true}
            showRight={true}
          />
          
          <div
            ref={gameContainerRef}
            className="phaser-container"
            style={{ width: '100%', height: '100%' }}
          />
          
          {battleState && (
            <>
              <HandCards
                cards={battleState.player.hand}
                selectedCardId={selectedCardId}
                currentMana={battleState.player.hero.mana}
                onCardSelect={handleCardSelect}
                isPlayerTurn={battleState.current_player === 'player'}
              />
              
              <DeckPanel
                deckCount={battleState.player.deck.length}
                discardCount={battleState.player.discard_pile.length}
                onDrawCard={handleDrawCard}
                canDraw={battleState.current_player === 'player' && battleState.player.hand.length < 7}
              />
            </>
          )}
        </>
      )}

      {phase === 'ended' && battleState && (
        <div className="game-over-overlay">
          <div className={`game-over-title ${battleState.winner === 'player' ? 'victory' : 'defeat'}`}>
            {battleState.winner === 'player' ? '胜利!' : '失败...'}
          </div>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#a89880' }}>
            {battleState.winner === 'player' ? '你击败了对手！' : '下次再接再厉！'}
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="menu-button" onClick={handleRestart}>
              再来一局
            </button>
            <button className="menu-button" onClick={onBack}>
              返回主菜单
            </button>
          </div>
        </div>
      )}

      {phase !== 'rune_select' && (
        <button className="mute-button" onClick={toggleMute} title={isMuted ? '开启音效' : '关闭音效'}>
          {isMuted ? '🔇' : '🔊'}
        </button>
      )}

      {phase === 'rune_select' && playerRunes.length === 3 && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20
        }}>
          <button className="start-battle-button" onClick={initGame}>
            进入战斗
          </button>
        </div>
      )}
    </div>
  );
};

export default BattlePage;
