import { useState, useEffect, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import {
  calculateSASA,
  calculateBondAngle,
  calculateAtomDistance
} from '../analysis/SurfaceAnalyzer'
import { loadMolecule } from '../data/MoleculeLoader'
import './UIController.css'

const MOLECULE_OPTIONS = [
  { value: 'peptide', label: '短肽 (Tetrapeptide)' },
  { value: 'water', label: '水分子簇 (Water)' },
  { value: 'benzene', label: '苯环 (Benzene)' }
]

export function UIController() {
  const [isMobile, setIsMobile] = useState(false)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [offsetZ, setOffsetZ] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const currentMolecule = useStore(state => state.currentMolecule)
  const setCurrentMolecule = useStore(state => state.setCurrentMolecule)
  const editMode = useStore(state => state.editMode)
  const setEditMode = useStore(state => state.setEditMode)
  const rotationSpeed = useStore(state => state.rotationSpeed)
  const setRotationSpeed = useStore(state => state.setRotationSpeed)
  const selectedAtomIds = useStore(state => state.selectedAtomIds)
  const atoms = useStore(state => state.atoms)
  const bonds = useStore(state => state.bonds)
  const updateAtomPosition = useStore(state => state.updateAtomPosition)
  const sasaFormatted = useStore(state => state.analysis.sasaFormatted)
  const setSasa = useStore(state => state.setSasa)
  const showSurface = useStore(state => state.analysis.showSurface)
  const setShowSurface = useStore(state => state.setShowSurface)
  const setBondAngle = useStore(state => state.setBondAngle)
  const setAtomDistance = useStore(state => state.setAtomDistance)
  const bondAngleFormatted = useStore(state => state.analysis.bondAngleFormatted)
  const atomDistanceFormatted = useStore(state => state.analysis.atomDistanceFormatted)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 800)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const selectedAtoms = useMemo(() => {
    return selectedAtomIds.map(id => atoms.find(a => a.id === id)).filter(Boolean)
  }, [selectedAtomIds, atoms])

  useEffect(() => {
    if (selectedAtomIds.length === 1) {
      const angle = calculateBondAngle(selectedAtomIds[0], atoms, bonds)
      setBondAngle(angle)
      setAtomDistance(null)
    } else if (selectedAtomIds.length === 2) {
      const dist = calculateAtomDistance(selectedAtomIds[0], selectedAtomIds[1], atoms)
      setAtomDistance(dist)
      setBondAngle(null)
    } else {
      setBondAngle(null)
      setAtomDistance(null)
    }
  }, [selectedAtomIds, atoms, bonds, setBondAngle, setAtomDistance])

  useEffect(() => {
    if (atoms.length > 0 && !isAnimating) {
      const sasa = calculateSASA(atoms)
      setSasa(sasa)
    }
  }, [atoms, setSasa, isAnimating])

  const handleMoleculeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value
    setIsAnimating(true)
    setCurrentMolecule(name)
    setTimeout(() => {
      setIsAnimating(false)
    }, 1100)
  }

  const handleAnalyzeClick = () => {
    const sasa = calculateSASA(atoms)
    setSasa(sasa)
  }

  const handleOffsetChange = (axis: 'x' | 'y' | 'z', value: number) => {
    if (selectedAtomIds.length !== 1) return
    const atom = atoms.find(a => a.id === selectedAtomIds[0])
    if (!atom) return

    let delta = 0
    if (axis === 'x') {
      delta = value - offsetX
      setOffsetX(value)
      updateAtomPosition(atom.id, atom.x + delta, atom.y, atom.z)
    } else if (axis === 'y') {
      delta = value - offsetY
      setOffsetY(value)
      updateAtomPosition(atom.id, atom.x, atom.y + delta, atom.z)
    } else if (axis === 'z') {
      delta = value - offsetZ
      setOffsetZ(value)
      updateAtomPosition(atom.id, atom.x, atom.y, atom.z + delta)
    }
  }

  useEffect(() => {
    if (selectedAtomIds.length === 1) {
      setOffsetX(0)
      setOffsetY(0)
      setOffsetZ(0)
    }
  }, [selectedAtomIds])

  const panelClassName = isMobile ? 'ui-panel ui-panel-mobile' : 'ui-panel'

  return (
    <div className={panelClassName}>
      <div className="ui-panel-content">
        <h2 className="panel-title">分子编辑器</h2>

        <div className="section">
          <label className="section-label">选择分子</label>
          <select
            className="select-input"
            value={currentMolecule}
            onChange={handleMoleculeChange}
          >
            {MOLECULE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="section">
          <div className="toggle-row">
            <span className="section-label">编辑模式</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={editMode}
                onChange={(e) => setEditMode(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        <div className="section">
          <label className="section-label">
            旋转速度: {rotationSpeed.toFixed(1)}
          </label>
          <input
            type="range"
            className="slider"
            min="0"
            max="5"
            step="0.1"
            value={rotationSpeed}
            onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
          />
        </div>

        {editMode && selectedAtoms.length === 1 && selectedAtoms[0] && (
          <div className="section edit-section">
            <label className="section-label">选中原子信息</label>
            <div className="atom-info">
              <div className="info-row">
                <span className="info-label">类型:</span>
                <span className="info-value">{selectedAtoms[0]!.type}</span>
              </div>
              <div className="info-row">
                <span className="info-label">残基:</span>
                <span className="info-value">{selectedAtoms[0]!.residue}</span>
              </div>
              <div className="info-row">
                <span className="info-label">坐标:</span>
                <span className="info-value">
                  ({selectedAtoms[0]!.x.toFixed(2)}, {selectedAtoms[0]!.y.toFixed(2)}, {selectedAtoms[0]!.z.toFixed(2)})
                </span>
              </div>
            </div>

            <div className="offset-controls">
              <div className="offset-control">
                <label>X偏移</label>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={offsetX}
                  onChange={(e) => handleOffsetChange('x', parseFloat(e.target.value))}
                />
                <span>{offsetX.toFixed(1)}</span>
              </div>
              <div className="offset-control">
                <label>Y偏移</label>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={offsetY}
                  onChange={(e) => handleOffsetChange('y', parseFloat(e.target.value))}
                />
                <span>{offsetY.toFixed(1)}</span>
              </div>
              <div className="offset-control">
                <label>Z偏移</label>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={offsetZ}
                  onChange={(e) => handleOffsetChange('z', parseFloat(e.target.value))}
                />
                <span>{offsetZ.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="section analysis-section">
          <button className="analyze-btn" onClick={handleAnalyzeClick}>
            计算表面积
          </button>

          <div className="result-row">
            <span className="result-label">SASA:</span>
            <span className="result-value">{sasaFormatted} Å²</span>
          </div>

          <div className="toggle-row">
            <span className="section-label">显示表面</span>
            <label className="toggle-switch small">
              <input
                type="checkbox"
                checked={showSurface}
                onChange={(e) => setShowSurface(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        <div className="section bond-analysis-section">
          <label className="section-label">键分析</label>
          {bondAngleFormatted !== null && (
            <div className="result-row">
              <span className="result-label">键角:</span>
              <span className="result-value">{bondAngleFormatted}°</span>
            </div>
          )}
          {atomDistanceFormatted !== null && (
            <div className="result-row">
              <span className="result-label">原子距离:</span>
              <span className="result-value">{atomDistanceFormatted} Å</span>
            </div>
          )}
          {bondAngleFormatted === null && atomDistanceFormatted === null && (
            <p className="hint-text">
              选择1个原子查看键角，选择2个原子查看距离
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
