import React, { useState, useEffect, useCallback, useRef } from 'react'
import Garden3D from './garden/Garden3D'
import GeneticsEditor from './genetics/GeneticsEditor'
import EvolutionTree from './tree/EvolutionTree'
import { Seed, Plant, TreeNode, BreedResult, GeneColor, Rarity, GENE_COLOR_HEX, RARITY_COLORS } from './types'
import { fetchSeeds, fetchPlants, fetchEvolutionTree, plantSeedToPlot } from './api'

type TabId = 'garden' | 'genetics' | 'tree'

interface Ripple {
  id: number
  x: number
  y: number
}

export default function App() {
  const [tab, setTab] = useState<TabId>('garden')
  const [seeds, setSeeds] = useState<Seed[]>([])
  const [plants, setPlants] = useState<Plant[]>([])
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([])
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0)
  const rippleIdRef = useRef(0)
  const [ripples, setRipples] = useState<Ripple[]>([])

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }, [])

  const refreshData = useCallback(async () => {
    try {
      const [s, p, t] = await Promise.all([fetchSeeds(), fetchPlants(), fetchEvolutionTree()])
      setSeeds(s)
      setPlants(p)
      setTreeNodes(t.nodes)
    } catch (e) {
      console.warn('数据加载失败(后端可能未启动，使用演示模式):', e)
      if (seeds.length === 0) {
        setSeeds(demoSeeds())
      }
    }
  }, [seeds.length])

  useEffect(() => {
    refreshData()
  }, [inventoryRefreshKey])

  const handlePlantPlanted = useCallback(async (plotIndex: number) => {
    if (!selectedSeedId) {
      showToast('请先在背包中选择一颗种子', 'info')
      return
    }
    try {
      const newPlant = await plantSeedToPlot(selectedSeedId, plotIndex)
      setPlants(prev => [...prev, newPlant])
      const seed = seeds.find(s => s.id === selectedSeedId)
      showToast(`🌱 成功种植 ${seed?.name || '种子'}`, 'success')
      setTimeout(refreshData, 300)
    } catch (e: any) {
      showToast(e.message || '种植失败', 'error')
    }
  }, [selectedSeedId, seeds, refreshData, showToast])

  const handleBreedComplete = useCallback((result: BreedResult) => {
    showToast(`🧬 杂交成功: ${result.name} (${rarityLabel(result.rarity)})`, 'success')
    setInventoryRefreshKey(k => k + 1)
  }, [showToast])

  const handleTreeNodeClick = useCallback((node: TreeNode) => {
    showToast(`查看 ${node.plantName} - 第${node.generation}代`, 'info')
  }, [showToast])

  const addRipple = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const id = ++rippleIdRef.current
    setRipples(prev => [...prev, {
      id,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }])
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id))
    }, 300)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f0a1a' }}>
      <Header
        tab={tab}
        setTab={(t, e) => { addRipple(e); setTab(t) }}
        ripples={ripples}
        seedsCount={seeds.length}
        plantsCount={plants.length}
        treeCount={treeNodes.length}
      />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {tab === 'garden' && (
            <Garden3D
              plants={plants}
              seeds={seeds}
              selectedSeedId={selectedSeedId}
              onPlantPlanted={handlePlantPlanted}
            />
          )}
          {tab === 'genetics' && (
            <GeneticsEditor
              seeds={seeds}
              onBreedComplete={handleBreedComplete}
            />
          )}
          {tab === 'tree' && (
            <EvolutionTree
              tree={treeNodes}
              onNodeClick={handleTreeNodeClick}
            />
          )}
        </div>
        <InventoryPanel
          seeds={seeds}
          selectedSeedId={selectedSeedId}
          onSelectSeed={(id) => setSelectedSeedId(prev => prev === id ? null : id)}
        />
      </div>
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 30,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          background: toast.type === 'success' ? 'rgba(74, 222, 128, 0.15)' :
            toast.type === 'error' ? 'rgba(248, 113, 113, 0.15)' : 'rgba(34, 211, 238, 0.15)',
          border: `1px solid ${toast.type === 'success' ? '#4ade80' : toast.type === 'error' ? '#f87171' : '#22d3ee'}50`,
          color: toast.type === 'success' ? '#86efac' : toast.type === 'error' ? '#fca5a5' : '#67e8f9',
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 13,
          zIndex: 9999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function Header({
  tab, setTab, ripples, seedsCount, plantsCount, treeCount
}: {
  tab: TabId
  setTab: (t: TabId, e: React.MouseEvent) => void
  ripples: Ripple[]
  seedsCount: number
  plantsCount: number
  treeCount: number
}) {
  const tabs: { id: TabId; label: string; icon: string; count: number }[] = [
    { id: 'garden', label: '3D花园', icon: '🌻', count: plantsCount },
    { id: 'genetics', label: '基因编辑', icon: '🧬', count: 0 },
    { id: 'tree', label: '进化树', icon: '🌳', count: treeCount }
  ]
  return (
    <div style={{
      height: 60,
      background: 'linear-gradient(90deg, #1e293b, #161026)',
      borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 20,
      position: 'relative',
      boxShadow: '0 2px 20px rgba(0,0,0,0.4)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginRight: 20,
        paddingRight: 24,
        borderRight: '1px solid rgba(56, 189, 248, 0.15)'
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #22d3ee, #b04dff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, boxShadow: '0 0 20px rgba(34, 211, 238, 0.4)'
        }}>🌸</div>
        <div>
          <div style={{ color: '#22d3ee', fontWeight: 800, fontSize: 15, letterSpacing: 0.5 }}>
            基因育种模拟器
          </div>
          <div style={{ color: '#64748b', fontSize: 10, marginTop: 1 }}>
            Plant Breeding Simulator v1.0
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={(e) => setTab(t.id, e)}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: tab === t.id ? '1px solid #22d3ee' : '1px solid rgba(56, 189, 248, 0.15)',
              background: tab === t.id ? 'rgba(34, 211, 238, 0.12)' : 'transparent',
              color: tab === t.id ? '#22d3ee' : '#94a3b8',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s',
              boxShadow: tab === t.id ? '0 0 16px rgba(34, 211, 238, 0.2)' : 'none',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.count > 0 && (
              <span style={{
                marginLeft: 2,
                padding: '1px 6px',
                background: tab === t.id ? 'rgba(245, 158, 11, 0.3)' : 'rgba(148, 163, 184, 0.15)',
                color: tab === t.id ? '#f59e0b' : '#64748b',
                borderRadius: 10,
                fontSize: 10,
                fontWeight: 700
              }}>{t.count}</span>
            )}
            {ripples.map(r => (
              <span
                key={r.id}
                style={{
                  position: 'absolute',
                  left: r.x - 60,
                  top: r.y - 60,
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  border: '2px solid rgba(34, 211, 238, 0.6)',
                  animation: 'ripple 0.3s ease-out forwards',
                  pointerEvents: 'none'
                }}
              />
            ))}
          </button>
        ))}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Stat icon="🌰" label="种子" value={seedsCount} color="#f59e0b" />
        <StatusDot />
      </div>
    </div>
  )
}

function Stat({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10, color: '#64748b' }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  )
}

function StatusDot() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: '#22c55e',
        boxShadow: '0 0 10px #22c55e',
        animation: 'pulse 2s infinite'
      }} />
      <span style={{ fontSize: 11, color: '#64748b' }}>在线</span>
    </div>
  )
}

function InventoryPanel({
  seeds, selectedSeedId, onSelectSeed
}: {
  seeds: Seed[]
  selectedSeedId: string | null
  onSelectSeed: (id: string) => void
}) {
  return (
    <div style={{
      width: 320,
      background: 'linear-gradient(180deg, #1e293b 0%, #161026 100%)',
      borderLeft: '1px solid rgba(56, 189, 248, 0.15)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        padding: '16px 18px 10px',
        borderBottom: '1px solid rgba(56, 189, 248, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>🎒</span>
            <span style={{ color: '#22d3ee', fontWeight: 700, fontSize: 14 }}>种子背包</span>
          </div>
          <span style={{ color: '#64748b', fontSize: 11 }}>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>{seeds.length}</span> 颗
          </span>
        </div>
        <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
          点击种子选中 → 切到花园界面 → 点击地块种植
        </div>
      </div>

      <div style={{
        flex: 1,
        padding: 14,
        overflowX: 'hidden',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {seeds.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 10px',
              color: '#475569',
              fontSize: 12
            }}>
              <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 8 }}>📦</div>
              背包为空，去基因编辑器<br />杂交获得新种子吧！
            </div>
          ) : (
            seeds.map(seed => (
              <SeedCard
                key={seed.id}
                seed={seed}
                isSelected={selectedSeedId === seed.id}
                onClick={() => onSelectSeed(seed.id)}
              />
            ))
          )}
        </div>
      </div>

      <div style={{
        padding: 12,
        borderTop: '1px solid rgba(56, 189, 248, 0.1)',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6
      }}>
        {(['common', 'rare', 'epic'] as Rarity[]).map(r => (
          <div key={r} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            justifyContent: 'center',
            fontSize: 10,
            color: RARITY_COLORS[r],
            padding: '4px 6px',
            background: `${RARITY_COLORS[r]}10`,
            borderRadius: 4,
            border: `1px solid ${RARITY_COLORS[r]}30`
          }}>
            <div style={{ width: 6, height: 6, borderRadius: 2, background: RARITY_COLORS[r] }} />
            <span>{seeds.filter(s => s.rarity === r).length} {rarityLabelShort(r)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SeedCard({
  seed, isSelected, onClick
}: {
  seed: Seed
  isSelected: boolean
  onClick: () => void
}) {
  const border = RARITY_COLORS[seed.rarity]
  const glow = isSelected ? `0 0 20px ${border}60, 0 0 40px ${border}30` : `0 4px 12px rgba(0,0,0,0.3)`
  const mainColor = dominantColor(seed.geneSequence)

  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderRadius: 10,
        background: isSelected
          ? `linear-gradient(135deg, ${border}15, ${border}05)`
          : 'rgba(15, 23, 42, 0.6)',
        border: `1px solid ${isSelected ? border : border + '40'}`,
        padding: 12,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isSelected ? 'translateY(-1px) scale(1.01)' : 'scale(1)',
        boxShadow: glow,
        position: 'relative',
        animation: isSelected ? 'glowPulse 2s ease-in-out infinite' : 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 52, height: 52,
          borderRadius: 8,
          background: `radial-gradient(circle at 35% 35%, ${mainColor}, ${mainColor}60)`,
          border: `1px solid ${mainColor}80`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
          flexShrink: 0,
          boxShadow: `inset 0 0 10px rgba(0,0,0,0.3)`
        }}>
          🌰
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{
              color: '#e2e8f0',
              fontWeight: 700,
              fontSize: 13,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>{seed.name}</span>
            <span style={{
              fontSize: 9,
              padding: '1px 6px',
              borderRadius: 10,
              color: border,
              background: `${border}15`,
              border: `1px solid ${border}40`,
              flexShrink: 0,
              fontWeight: 700
            }}>
              {rarityLabel(seed.rarity)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
            {seed.geneSequence.map((g, i) => (
              <div key={i} style={{
                width: 10, height: 10,
                borderRadius: 3,
                background: g ? GENE_COLOR_HEX[g] : '#334155',
                border: g ? `1px solid ${GENE_COLOR_HEX[g]}60` : '1px solid #475569',
                boxShadow: g ? `0 0 3px ${GENE_COLOR_HEX[g]}50` : 'none'
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#64748b' }}>
            <span>⏱ {seed.growthTime}s</span>
            <span>🧬 {seed.geneSequence.filter(g => g).length}/8</span>
          </div>
        </div>
      </div>
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 18, height: 18,
          borderRadius: '50%',
          background: '#22d3ee',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11,
          color: '#0f172a',
          fontWeight: 900,
          boxShadow: '0 0 10px #22d3ee'
        }}>✓</div>
      )}
    </div>
  )
}

function rarityLabel(r: Rarity): string {
  return r === 'common' ? '普通' : r === 'rare' ? '稀有' : '史诗'
}
function rarityLabelShort(r: Rarity): string {
  return r === 'common' ? '普' : r === 'rare' ? '稀' : '史'
}
function dominantColor(genes: GeneColor[]): string {
  const counts: Record<string, number> = {}
  genes.forEach(g => { if (g) counts[g] = (counts[g] || 0) + 1 })
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) return '#475569'
  return GENE_COLOR_HEX[sorted[0][0]] || '#475569'
}

function demoSeeds(): Seed[] {
  return [
    {
      id: 'demo-1', name: '火焰玫瑰',
      geneSequence: ['red', 'red', 'yellow', 'red', null, 'red', null, 'yellow'],
      growthTime: 8, rarity: 'common'
    },
    {
      id: 'demo-2', name: '海洋蓝铃',
      geneSequence: ['blue', 'blue', null, 'blue', 'blue', null, 'purple', null],
      growthTime: 10, rarity: 'rare'
    },
    {
      id: 'demo-3', name: '金阳菊',
      geneSequence: ['yellow', 'yellow', 'yellow', null, 'red', 'yellow', null, null],
      growthTime: 6, rarity: 'common'
    },
    {
      id: 'demo-4', name: '紫晶兰花',
      geneSequence: ['purple', 'purple', 'blue', null, 'purple', null, 'purple', 'blue'],
      growthTime: 15, rarity: 'epic'
    }
  ]
}
