import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GeneColor, Seed, PlantTraits, GENE_COLOR_HEX, BreedResult } from '../types'
import { breedPlants } from '../api'

const MATRIX_SIZE = 8
const CELL_SIZE = 12
const GENE_TYPES: { color: GeneColor; label: string; hex: string }[] = [
  { color: 'red', label: 'R', hex: GENE_COLOR_HEX.red },
  { color: 'blue', label: 'B', hex: GENE_COLOR_HEX.blue },
  { color: 'yellow', label: 'Y', hex: GENE_COLOR_HEX.yellow },
  { color: 'purple', label: 'P', hex: GENE_COLOR_HEX.purple }
]

interface GeneticsEditorProps {
  seeds: Seed[]
  onBreedComplete: (result: BreedResult) => void
  onPreviewGenesChange?: (genes: GeneColor[]) => void
}

function genesToMatrix(genes: GeneColor[]): (GeneColor)[][] {
  const matrix: (GeneColor)[][] = Array.from({ length: MATRIX_SIZE }, () =>
    Array(MATRIX_SIZE).fill(null)
  )
  for (let i = 0; i < genes.length && i < MATRIX_SIZE; i++) {
    const row = Math.floor(i / MATRIX_SIZE)
    const col = i % MATRIX_SIZE
    matrix[row][col] = genes[i]
  }
  return matrix
}

function matrixToGenes(matrix: (GeneColor)[][]): GeneColor[] {
  const genes: GeneColor[] = []
  for (let row = 0; row < MATRIX_SIZE; row++) {
    for (let col = 0; col < MATRIX_SIZE; col++) {
      if (genes.length < MATRIX_SIZE) {
        genes.push(matrix[row][col])
      }
    }
  }
  while (genes.length < 8) genes.push(null)
  return genes.slice(0, 8)
}

function calculateTraitsPreview(geneSequence: GeneColor[]): PlantTraits {
  const colorCounts: Record<string, number> = { red: 0, blue: 0, yellow: 0, purple: 0 }
  geneSequence.forEach(g => { if (g) colorCounts[g]++ })
  const total = Object.values(colorCounts).reduce((a, b) => a + b, 0) || 1
  const r = (colorCounts.red * 255) / total
  const g = ((colorCounts.yellow * 200) + (colorCounts.blue * 50)) / total
  const b = ((colorCounts.blue * 255) + (colorCounts.purple * 180)) / total
  const petalColor = `rgb(${Math.round(Math.min(255, r))}, ${Math.round(Math.min(255, g))}, ${Math.round(Math.min(255, b))})`
  const shapes: PlantTraits['leafShape'][] = ['round', 'pointed', 'heart', 'lanceolate']
  const idx = Object.values(colorCounts).indexOf(Math.max(...Object.values(colorCounts)))
  return {
    petalColor,
    leafShape: shapes[Math.max(0, idx) % shapes.length],
    height: 0.5 + (total / 8) * 1.5,
    diseaseResistance: (colorCounts.purple + colorCounts.blue) / 8,
    flowerSize: 0.3 + ((colorCounts.red + colorCounts.yellow) / 8) * 0.4
  }
}

interface RippleData {
  id: number
  x: number
  y: number
  startTime: number
}

function useRipples(): [RippleData[], (e: React.MouseEvent) => void] {
  const [ripples, setRipples] = useState<RippleData[]>([])
  const idRef = useRef(0)
  useEffect(() => {
    if (ripples.length === 0) return
    const t = setInterval(() => {
      const now = performance.now()
      setRipples(prev => prev.filter(r => now - r.startTime < 300))
    }, 60)
    return () => clearInterval(t)
  }, [ripples.length])
  const addRipple = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setRipples(prev => [...prev, {
      id: ++idRef.current,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      startTime: performance.now()
    }])
  }, [])
  return [ripples, addRipple]
}

interface Gene3DPreviewProps {
  traits: PlantTraits | null
  morphProgress: number
  prevTraits: PlantTraits | null
}

function Gene3DPreview({ traits, morphProgress, prevTraits }: Gene3DPreviewProps) {
  const groupRef = useRef<THREE.Group>(null)
  const flowerGroupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.6
    }
    if (flowerGroupRef.current && morphProgress < 1) {
      const bounce = Math.sin((1 - morphProgress) * Math.PI * 3) * 0.15 * (1 - morphProgress)
      flowerGroupRef.current.scale.setScalar(1 + bounce)
    }
  })

  const t = morphProgress
  const startT = prevTraits || traits
  const endT = traits || prevTraits
  if (!startT || !endT) return null

  const lerp = (a: number, b: number) => a + (b - a) * t
  const lerpColor = (c1: string, c2: string): string => {
    const parse = (c: string) => {
      if (c.startsWith('#')) {
        return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]
      }
      const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])]
      return [200, 200, 200]
    }
    const [r1, g1, b1] = parse(c1)
    const [r2, g2, b2] = parse(c2)
    return `rgb(${Math.round(lerp(r1, r2))}, ${Math.round(lerp(g1, g2))}, ${Math.round(lerp(b1, b2))})`
  }

  const height = lerp(startT.height, endT.height)
  const flowerSize = lerp(startT.flowerSize, endT.flowerSize)
  const petalColor = lerpColor(startT.petalColor, endT.petalColor)
  const petals = 5

  return (
    <group ref={groupRef} position={[0, -0.3, 0]}>
      <mesh position={[0, height * 0.35, 0]}>
        <cylinderGeometry args={[0.04, 0.06, height * 0.7, 8]} />
        <meshStandardMaterial color="#6b8e23" roughness={0.8} />
      </mesh>
      {[0, 1, 2].map(i => (
        <mesh
          key={i}
          position={[
            (i % 2 === 0 ? 1 : -1) * 0.15,
            height * (0.15 + i * 0.18),
            i === 1 ? 0.1 : 0
          ]}
          rotation={[-0.5 + i * 0.2, (i % 2 === 0 ? 1 : -1) * 0.6, 0.3]}
        >
          <sphereGeometry args={[0.16, 8, 6]} />
          <meshStandardMaterial color="#4a8c3a" roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <group ref={flowerGroupRef} position={[0, height * 0.78, 0]}>
        {Array.from({ length: petals }).map((_, i) => {
          const angle = (i / petals) * Math.PI * 2
          return (
            <mesh
              key={i}
              position={[
                Math.cos(angle) * flowerSize * 0.42,
                0,
                Math.sin(angle) * flowerSize * 0.42
              ]}
              rotation={[0.4, angle, 0]}
            >
              <sphereGeometry args={[flowerSize * 0.36, 10, 8]} />
              <meshStandardMaterial
                color={petalColor}
                emissive={petalColor}
                emissiveIntensity={0.25 + (1 - t) * 0.3}
                roughness={0.4}
              />
            </mesh>
          )
        })}
        <mesh>
          <sphereGeometry args={[flowerSize * 0.3, 10, 8]} />
          <meshStandardMaterial color="#ffe44d" emissive="#ffe44d" emissiveIntensity={0.25} />
        </mesh>
      </group>
    </group>
  )
}

export default function GeneticsEditor({ seeds, onBreedComplete, onPreviewGenesChange }: GeneticsEditorProps) {
  const [parent1Matrix, setParent1Matrix] = useState<(GeneColor)[][]>(() =>
    seeds.length > 0 ? genesToMatrix(seeds[0].geneSequence) : genesToMatrix(Array(8).fill(null))
  )
  const [parent2Matrix, setParent2Matrix] = useState<(GeneColor)[][]>(() =>
    seeds.length > 1 ? genesToMatrix(seeds[1].geneSequence) : genesToMatrix(Array(8).fill(null))
  )
  const [activeParent, setActiveParent] = useState<1 | 2>(1)
  const [draggedGene, setDraggedGene] = useState<GeneColor | null>(null)
  const [isBreeding, setIsBreeding] = useState(false)
  const [morphProgress, setMorphProgress] = useState(1)
  const [prevTraits, setPrevTraits] = useState<PlantTraits | null>(null)
  const [breedResult, setBreedResult] = useState<BreedResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [ripples1, addRipple1] = useRipples()
  const [ripples2, addRipple2] = useRipples()

  const parent1Genes = useMemo(() => matrixToGenes(parent1Matrix), [parent1Matrix])
  const parent2Genes = useMemo(() => matrixToGenes(parent2Matrix), [parent2Matrix])
  const traits1 = useMemo(() => calculateTraitsPreview(parent1Genes), [parent1Genes])
  const traits2 = useMemo(() => calculateTraitsPreview(parent2Genes), [parent2Genes])
  const childPreviewGenes = useMemo(() => {
    const r: GeneColor[] = []
    for (let i = 0; i < 8; i++) {
      if (Math.random() < 0.5) r.push(parent1Genes[i])
      else r.push(parent2Genes[i])
    }
    return r
  }, [parent1Genes, parent2Genes])

  const displayTraits: PlantTraits | null = useMemo(() => {
    if (breedResult) return breedResult.traits
    return calculateTraitsPreview(activeParent === 1 ? parent1Genes : parent2Genes)
  }, [breedResult, parent1Genes, parent2Genes, activeParent])

  useEffect(() => {
    if (!prevTraits) return
    let raf = 0
    const start = performance.now()
    const animate = () => {
      const t = Math.min(1, (performance.now() - start) / 1200)
      setMorphProgress(t)
      if (t < 1) raf = requestAnimationFrame(animate)
      else setPrevTraits(null)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [prevTraits])

  useEffect(() => {
    onPreviewGenesChange?.(displayTraits ? (breedResult ? breedResult.geneSequence : (activeParent === 1 ? parent1Genes : parent2Genes)) : Array(8).fill(null))
  }, [displayTraits, breedResult, activeParent, parent1Genes, parent2Genes, onPreviewGenesChange])

  const handleCellClick = (row: number, col: number) => {
    if (row * MATRIX_SIZE + col >= 8) return
    const setM = activeParent === 1 ? setParent1Matrix : setParent2Matrix
    setM(prev => {
      const nm = prev.map(r => [...r])
      nm[row][col] = nm[row][col] ? null : (activeParent === 1 ? parent1Genes[row * MATRIX_SIZE + col] || 'red' : parent2Genes[row * MATRIX_SIZE + col] || 'blue')
      return nm
    })
  }

  const handleCellDrop = (row: number, col: number, e: React.DragEvent) => {
    e.preventDefault()
    if (row * MATRIX_SIZE + col >= 8) return
    if (!draggedGene) return
    const setM = activeParent === 1 ? setParent1Matrix : setParent2Matrix
    setM(prev => {
      const nm = prev.map(r => [...r])
      nm[row][col] = draggedGene
      return nm
    })
    setDraggedGene(null)
  }

  const loadSeed = (seed: Seed, parent: 1 | 2) => {
    const mat = genesToMatrix(seed.geneSequence)
    if (parent === 1) {
      setPrevTraits(traits1)
      setMorphProgress(0)
      setParent1Matrix(mat)
    } else {
      setPrevTraits(traits2)
      setMorphProgress(0)
      setParent2Matrix(mat)
    }
    setActiveParent(parent)
    setBreedResult(null)
  }

  const handleBreed = async (e: React.MouseEvent) => {
    if (isBreeding) return
    addRipple1(e)
    addRipple2(e)
    setIsBreeding(true)
    setError(null)
    const oldTraits = displayTraits
    try {
      const p1 = parent1Genes.some(g => g)
      const p2 = parent2Genes.some(g => g)
      if (!p1 || !p2) {
        throw new Error('请先在两个亲本中放置基因片段')
      }
      const p1Id = seeds.find(s => JSON.stringify(s.geneSequence) === JSON.stringify(parent1Genes))?.id
      const p2Id = seeds.find(s => JSON.stringify(s.geneSequence) === JSON.stringify(parent2Genes))?.id
      const result = await breedPlants(parent1Genes, parent2Genes, p1Id, p2Id)
      setPrevTraits(oldTraits)
      setMorphProgress(0)
      setBreedResult(result)
      onBreedComplete(result)
    } catch (err: any) {
      setError(err.message || '杂交失败')
    } finally {
      setTimeout(() => setIsBreeding(false), 1200)
    }
  }

  const resetMatrices = () => {
    setParent1Matrix(genesToMatrix(Array(8).fill(null)))
    setParent2Matrix(genesToMatrix(Array(8).fill(null)))
    setBreedResult(null)
    setError(null)
  }

  const renderGeneMatrix = (
    matrix: (GeneColor)[][],
    parentLabel: string,
    isActive: boolean,
    onClick: (e: React.MouseEvent) => void,
    onRipple: (e: React.MouseEvent) => void,
    ripples: RippleData[],
    traits: PlantTraits
  ) => {
    const panelStyle: React.CSSProperties = {
      background: '#1e293b',
      border: `1px solid ${isActive ? '#38bdf8' : 'rgba(56, 189, 248, 0.2)'}`,
      borderRadius: 10,
      padding: 14,
      position: 'relative',
      overflow: 'hidden',
      cursor: 'pointer',
      boxShadow: isActive ? '0 0 20px rgba(56, 189, 248, 0.15)' : 'none',
      transition: 'all 0.3s'
    }
    return (
      <div
        style={panelStyle}
        onClick={(e) => { onRipple(e); onClick(e) }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>{parentLabel}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: traits.petalColor, boxShadow: `0 0 6px ${traits.petalColor}` }} />
            <span style={{ color: '#94a3b8', fontSize: 11 }}>{Math.round(traits.height * 50)}cm</span>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${MATRIX_SIZE}, ${CELL_SIZE}px)`,
            gap: 2,
            background: '#0f172a',
            padding: 6,
            borderRadius: 6
          }}
        >
          {matrix.map((row, ri) =>
            row.map((cell, ci) => {
              const geneIdx = ri * MATRIX_SIZE + ci
              const isActiveCell = geneIdx < 8
              return (
                <div
                  key={`${ri}-${ci}`}
                  draggable={!!cell && isActiveCell}
                  onDragStart={() => cell && isActiveCell && setDraggedGene(cell)}
                  onDragOver={(e) => isActiveCell && e.preventDefault()}
                  onDrop={(e) => isActiveCell && handleCellDrop(ri, ci, e)}
                  onClick={(e) => { e.stopPropagation(); isActiveCell && handleCellClick(ri, ci) }}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    borderRadius: 3,
                    background: isActiveCell ? (cell ? GENE_COLOR_HEX[cell] : '#334155') : '#1e293b',
                    cursor: isActiveCell ? 'pointer' : 'default',
                    opacity: isActiveCell ? 1 : 0.25,
                    boxShadow: cell && isActiveCell ? `0 0 4px ${GENE_COLOR_HEX[cell]}60` : 'none',
                    transition: 'all 0.15s',
                    transform: cell ? 'scale(1)' : 'scale(0.92)'
                  }}
                />
              )
            })
          )}
        </div>
        {ripples.map(r => {
          const age = (performance.now() - r.startTime) / 300
          return (
            <span
              key={r.id}
              style={{
                position: 'absolute',
                left: r.x - 60,
                top: r.y - 60,
                width: 120,
                height: 120,
                borderRadius: '50%',
                border: `2px solid rgba(34, 211, 238, ${(1 - age) * 0.6})`,
                transform: `scale(${0.1 + age})`,
                pointerEvents: 'none'
              }}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #161026 0%, #0f0a1a 100%)',
      padding: 16,
      gap: 14,
      overflow: 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ color: '#22d3ee', fontSize: 16, fontWeight: 700, marginBottom: 2 }}>🧬 基因杂交编辑器</h2>
          <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>从基因库拖拽或点击矩阵编辑基因</p>
        </div>
        {error && <span style={{ color: '#f87171', fontSize: 12, background: 'rgba(248,113,113,0.1)', padding: '4px 10px', borderRadius: 6 }}>{error}</span>}
      </div>

      <div style={{
        display: 'flex',
        background: '#1e293b',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: 10,
        padding: 12,
        gap: 10,
        alignItems: 'center'
      }}>
        <span style={{ color: '#94a3b8', fontSize: 12, flexShrink: 0 }}>基因库</span>
        {GENE_TYPES.map(g => (
          <div
            key={g.color}
            draggable
            onDragStart={() => setDraggedGene(g.color)}
            onClick={() => {
              if (activeParent === 1) {
                setParent1Matrix(prev => {
                  const nm = prev.map(r => [...r])
                  for (let i = 0; i < 8; i++) {
                    const r = Math.floor(i / 8), c = i % 8
                    if (!nm[r][c]) { nm[r][c] = g.color; break }
                  }
                  return nm
                })
              } else {
                setParent2Matrix(prev => {
                  const nm = prev.map(r => [...r])
                  for (let i = 0; i < 8; i++) {
                    const r = Math.floor(i / 8), c = i % 8
                    if (!nm[r][c]) { nm[r][c] = g.color; break }
                  }
                  return nm
                })
              }
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${g.hex}, ${g.hex}80)`,
              cursor: 'grab',
              boxShadow: `0 0 12px ${g.hex}60, inset 0 0 6px rgba(255,255,255,0.3)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              userSelect: 'none'
            }}
            title={`${g.label} - 拖拽到矩阵`}
          >
            {g.label}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={resetMatrices}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: '1px solid rgba(56, 189, 248, 0.3)',
            background: 'transparent',
            color: '#94a3b8',
            fontSize: 11,
            cursor: 'pointer'
          }}
        >清空</button>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        {renderGeneMatrix(parent1Matrix, '亲本 A ♀', activeParent === 1, () => setActiveParent(1), addRipple1, ripples1, traits1)}
        <div style={{ display: 'flex', alignItems: 'center', color: '#f59e0b', fontSize: 24, fontWeight: 700 }}>×</div>
        {renderGeneMatrix(parent2Matrix, '亲本 B ♂', activeParent === 2, () => setActiveParent(2), addRipple2, ripples2, traits2)}
      </div>

      <button
        onClick={handleBreed}
        disabled={isBreeding}
        style={{
          padding: '14px 24px',
          borderRadius: 10,
          border: 'none',
          background: isBreeding
            ? 'linear-gradient(135deg, #475569, #334155)'
            : 'linear-gradient(135deg, #22d3ee, #0891b2)',
          color: '#0f172a',
          fontSize: 15,
          fontWeight: 700,
          cursor: isBreeding ? 'wait' : 'pointer',
          boxShadow: isBreeding ? 'none' : '0 0 20px rgba(34, 211, 238, 0.35)',
          letterSpacing: 1,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {isBreeding ? (
          <span>⚗️ 杂交中... <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⎋</span></span>
        ) : '🧬 执行杂交 (1200ms)'}
      </button>

      <div style={{
        flex: 1,
        minHeight: 220,
        background: 'linear-gradient(180deg, #1e293b, #0f172a)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: 10,
          left: 12,
          zIndex: 10,
          color: '#e2e8f0',
          fontSize: 12
        }}>
          <div style={{ color: '#22d3ee', fontWeight: 700 }}>
            {breedResult ? `🌼 ${breedResult.name}` : activeParent === 1 ? '亲本A预览' : '亲本B预览'}
          </div>
          {breedResult && (
            <div style={{ marginTop: 2, color: '#f59e0b', fontSize: 11 }}>
              {breedResult.rarity === 'epic' ? '⭐⭐⭐ 史诗' : breedResult.rarity === 'rare' ? '⭐⭐ 稀有' : '⭐ 普通'}
            </div>
          )}
        </div>
        <Canvas camera={{ position: [0, 1.4, 3], fov: 40 }} dpr={[1, 2]}>
          <color attach="background" args={[0x161026]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 5, 3]} intensity={1.1} color="#fff5e0" />
          <pointLight position={[-2, 3, 2]} intensity={0.5} color={displayTraits?.petalColor || '#b04dff'} />
          <Gene3DPreview
            traits={displayTraits}
            morphProgress={prevTraits ? morphProgress : 1}
            prevTraits={prevTraits || displayTraits}
          />
          <mesh rotation-x={-Math.PI / 2} position={[0, -0.6, 0]}>
            <circleGeometry args={[1.6, 48]} />
            <meshStandardMaterial color="#2d3e1e" roughness={1} />
          </mesh>
        </Canvas>
        {breedResult && morphProgress >= 1 && (
          <div style={{
            position: 'absolute',
            bottom: 10,
            left: 12,
            right: 12,
            background: 'rgba(15, 23, 42, 0.85)',
            borderRadius: 8,
            padding: 8,
            fontSize: 11,
            color: '#94a3b8',
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap'
          }}>
            <span>基因: {breedResult.geneSequence.map(g => g ? (
              <span key={Math.random()} style={{ color: GENE_COLOR_HEX[g] || '#fff' }}>●</span>
            ) : <span style={{ opacity: 0.3 }}>○</span>)}</span>
            <span>高: {Math.round(breedResult.traits.height * 50)}cm</span>
            <span>抗病: {Math.round(breedResult.traits.diseaseResistance * 100)}%</span>
            <span>生长: {breedResult.growthTime}s</span>
          </div>
        )}
      </div>

      {seeds.length > 0 && (
        <div>
          <div style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>快速加载种子到亲本 (点击分配到当前激活亲本)</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {seeds.slice(0, 8).map(seed => {
              const border = { common: '#94a3b8', rare: '#3b82f6', epic: '#f59e0b' }[seed.rarity]
              return (
                <div
                  key={seed.id}
                  style={{
                    padding: '6px 10px',
                    background: '#1e293b',
                    border: `1px solid ${border}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  onClick={() => loadSeed(seed, activeParent)}
                  title={`加载到亲本${activeParent === 1 ? 'A' : 'B'}`}
                >
                  <span style={{ fontSize: 12, color: '#e2e8f0' }}>{seed.name}</span>
                  <div style={{ display: 'flex', gap: 1 }}>
                    {seed.geneSequence.map((g, i) => (
                      <div key={i} style={{
                        width: 6, height: 6, borderRadius: 2,
                        background: g ? GENE_COLOR_HEX[g] : '#334155'
                      }} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
