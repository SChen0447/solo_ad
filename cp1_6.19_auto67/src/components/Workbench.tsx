import React, { useMemo, useCallback, useRef } from 'react'
import { useRecipeStore } from '../store/recipeStore'
import { RecipeSlot, Material } from '../types'
import styles from './Workbench.module.css'

const Workbench: React.FC = () => {
  const {
    materials,
    inventory,
    craftingSlots,
    searchKeyword,
    setSearchKeyword,
    setCraftingSlot,
    craft,
    toggleRecipeBook,
    isRecipeBookOpen,
    animationState,
    unlockedRecipeIds,
    lastCraftedOutputId,
    lastCraftedQuantity,
    getMaterialById
  } = useRecipeStore()

  const dragDataRef = useRef<{ materialId: string; fromSlot?: number } | null>(null)

  const baseMaterials = useMemo(() => {
    return materials.filter(m => {
      const kw = searchKeyword.trim().toLowerCase()
      if (!kw) return true
      return m.name.toLowerCase().includes(kw) || m.description.toLowerCase().includes(kw)
    })
  }, [materials, searchKeyword])

  const canCraft = useMemo(() => {
    return craftingSlots.some(s => s !== null) && !animationState.isCrafting
  }, [craftingSlots, animationState.isCrafting])

  const outputMaterial = lastCraftedOutputId ? getMaterialById(lastCraftedOutputId) : null

  const getBadgeColor = (type: Material['type']): string => {
    const colorMap: Record<string, string> = {
      element: '#4ecdc4',
      metal: '#a8a8b8',
      organic: '#6bcb77',
      gem: '#9370db',
      special: '#ffd700',
      product: '#e2a76f'
    }
    return colorMap[type] || '#888'
  }

  const handleDragStart = useCallback((e: React.DragEvent, materialId: string) => {
    const qty = inventory[materialId] || 0
    if (qty <= 0) {
      e.preventDefault()
      return
    }
    dragDataRef.current = { materialId }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', materialId)
  }, [inventory])

  const handleSlotDragStart = useCallback((e: React.DragEvent, slotIndex: number) => {
    const slot = craftingSlots[slotIndex]
    if (!slot) return
    dragDataRef.current = { materialId: slot.materialId, fromSlot: slotIndex }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', slot.materialId)
  }, [craftingSlots])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleSlotDrop = useCallback((e: React.DragEvent, slotIndex: number) => {
    e.preventDefault()
    const dragData = dragDataRef.current
    if (!dragData) return

    const { materialId, fromSlot } = dragData

    if (fromSlot !== undefined && fromSlot !== slotIndex) {
      const oldSlot = craftingSlots[fromSlot]
      const targetSlot = craftingSlots[slotIndex]
      if (oldSlot) {
        setCraftingSlot(slotIndex, { materialId: oldSlot.materialId, quantity: oldSlot.quantity })
      } else {
        setCraftingSlot(slotIndex, null)
      }
      if (targetSlot) {
        setCraftingSlot(fromSlot, { materialId: targetSlot.materialId, quantity: targetSlot.quantity })
      } else {
        setCraftingSlot(fromSlot, null)
      }
    } else if (fromSlot === undefined) {
      setCraftingSlot(slotIndex, { materialId, quantity: 1 })
    }

    dragDataRef.current = null
  }, [craftingSlots, setCraftingSlot])

  const handleSlotClick = useCallback((slotIndex: number) => {
    const slot = craftingSlots[slotIndex]
    if (slot) {
      setCraftingSlot(slotIndex, null)
    }
  }, [craftingSlots, setCraftingSlot])

  const handleCraft = useCallback(() => {
    craft()
  }, [craft])

  const isSlotAnimating = (index: number): boolean => {
    if (!animationState.isCrafting || animationState.isSuccess !== true) return false
    return craftingSlots[index] !== null
  }

  const slotMaterial = (slot: RecipeSlot | null) => {
    if (!slot) return null
    return getMaterialById(slot.materialId)
  }

  return (
    <div className={styles.workbench}>
      <div className={styles.topBar}>
        <h1 className={styles.title}>
          <span className={styles.titleIcon}>⚗️</span>
          炼金合成工作台
        </h1>
        <button
          className={`${styles.recipeBookBtn} ${
            unlockedRecipeIds.size > 0 ? styles.hasRecipes : styles.noRecipes
          } ${animationState.showUnlockGlow ? styles.unlocking : ''}`}
          onClick={toggleRecipeBook}
          title={isRecipeBookOpen ? '关闭配方书' : '打开配方书'}
        >
          📖
          {animationState.showUnlockGlow && (
            <div className={`${styles.unlockGlow} ${styles.active}`} />
          )}
        </button>
      </div>

      <div className={styles.mainArea}>
        <div className={styles.materialPanel}>
          <div className={styles.panelTitle}>🧪 材料库存</div>
          <input
            className={styles.searchBox}
            type="text"
            placeholder="搜索材料名称..."
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
          />
          <div className={styles.materialGrid}>
            {baseMaterials.map(mat => {
              const qty = inventory[mat.id] || 0
              const disabled = qty <= 0
              return (
                <div
                  key={mat.id}
                  className={`${styles.materialCell} ${disabled ? styles.disabled : ''}`}
                  draggable={!disabled}
                  onDragStart={e => handleDragStart(e, mat.id)}
                  title={`${mat.name} - ${mat.description}`}
                >
                  <span style={{ filter: disabled ? 'grayscale(80%)' : 'none' }}>
                    {mat.icon}
                  </span>
                  <span
                    className={styles.badge}
                    style={{ backgroundColor: getBadgeColor(mat.type) }}
                  >
                    {qty}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className={styles.craftArea}>
          <div
            className={`${styles.slotsContainer} ${
              animationState.isCrafting && animationState.isSuccess === false ? styles.failing : ''
            }`}
          >
            <div className={styles.craftingGrid}>
              {Array.from({ length: 9 }, (_, i) => {
                const slot = craftingSlots[i]
                const mat = slotMaterial(slot)
                const animating = isSlotAnimating(i)
                return (
                  <div
                    key={i}
                    className={`${styles.slot} ${slot ? styles.filled : ''} ${animating ? styles.animating : ''}`}
                    onDragOver={handleDragOver}
                    onDrop={e => handleSlotDrop(e, i)}
                    onDragStart={slot ? e => handleSlotDragStart(e, i) : undefined}
                    onClick={() => handleSlotClick(i)}
                    draggable={!!slot}
                    title={mat ? `${mat.name}（点击移除）` : '空槽位'}
                  >
                    {mat && (
                      <>
                        <span>{mat.icon}</span>
                        {slot && slot.quantity > 1 && (
                          <span className={styles.slotBadge}>
                            {slot.quantity}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <button
            className={styles.craftButton}
            onClick={handleCraft}
            disabled={!canCraft}
          >
            合 成
          </button>

          <div className={styles.previewArea}>
            {animationState.isCrafting && animationState.isSuccess === false && (
              <div className={styles.failHint}>
                ✗ 合成失败！配方不匹配，材料已返还
              </div>
            )}
            {outputMaterial && lastCraftedQuantity > 0 && (
              <div className={styles.outputCard}>
                <span className={styles.outputIcon}>{outputMaterial.icon}</span>
                <span className={styles.outputName}>{outputMaterial.name}</span>
                <span className={styles.outputQty}>+{lastCraftedQuantity} 已加入库存</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default React.memo(Workbench)
