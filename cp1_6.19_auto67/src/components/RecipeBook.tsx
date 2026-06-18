import React, { useMemo, useState, useCallback } from 'react'
import { useRecipeStore } from '../store/recipeStore'
import { RecipeTreeNode, Recipe } from '../types'
import styles from './RecipeBook.module.css'

interface NodeProps {
  node: RecipeTreeNode
  level: number
  selectedId: string | null
  onSelect: (itemId: string, isMaterial: boolean) => void
}

const TreeNode: React.FC<NodeProps> = ({ node, level, selectedId, onSelect }) => {
  const { toggleTreeNode, getMaterialById, inventory } = useRecipeStore()
  const mat = getMaterialById(node.itemId)
  const qty = inventory[node.itemId] || 0
  const hasChildren = node.children.length > 0
  const isSelected = selectedId === node.itemId

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      toggleTreeNode(node.itemId)
    }
    onSelect(node.itemId, node.isMaterial)
  }

  return (
    <div className={styles.treeNode} style={{ marginTop: level === 0 ? 0 : 0 }}>
      <div
        className={`${styles.nodeHeader} ${isSelected ? styles.selected : ''}`}
        onClick={handleClick}
        style={{ paddingLeft: level === 0 ? 10 : undefined }}
        title={mat?.description}
      >
        <span
          className={`${styles.arrow} ${node.expanded ? styles.expanded : ''} ${!hasChildren ? styles.leaf : ''}`}
        >
          ▶
        </span>
        <span className={styles.nodeIcon}>
          {mat?.icon || '❓'}
        </span>
        <span className={`${styles.nodeName} ${!node.isMaterial ? styles.isProduct : ''}`}>
          {mat?.name || node.itemId}
        </span>
        {qty > 0 && (
          <span className={styles.nodeQty}>×{qty}</span>
        )}
      </div>
      {hasChildren && node.expanded && (
        <div className={styles.children}>
          {node.children.map(child => (
            <TreeNode
              key={child.itemId}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const RecipeBook: React.FC = () => {
  const {
    isRecipeBookOpen,
    toggleRecipeBook,
    recipeTree,
    unlockedRecipeIds,
    allRecipes,
    getMaterialById,
    openBatchCraft,
    craftHistory
  } = useRecipeStore()

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedIsMaterial, setSelectedIsMaterial] = useState(false)

  const selectedRecipe = useMemo((): Recipe | undefined => {
    if (selectedIsMaterial || !selectedItemId) return undefined
    return allRecipes.find(r => r.outputId === selectedItemId)
  }, [selectedItemId, selectedIsMaterial, allRecipes])

  const selectedMaterial = useMemo(() => {
    if (!selectedItemId) return undefined
    return getMaterialById(selectedItemId)
  }, [selectedItemId, getMaterialById])

  const handleSelect = useCallback((itemId: string, isMaterial: boolean) => {
    setSelectedItemId(itemId)
    setSelectedIsMaterial(isMaterial)
  }, [])

  const handleBatchCraft = useCallback((recipeId: string) => {
    openBatchCraft(recipeId)
  }, [openBatchCraft])

  if (!isRecipeBookOpen) return null

  const totalCrafts = craftHistory.reduce((sum, r) => sum + r.quantity, 0)

  return (
    <>
      <div className={styles.overlay} onClick={toggleRecipeBook} />
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitle}>
            📖 配方书
          </div>
          <button
            className={styles.closeBtn}
            onClick={toggleRecipeBook}
            title="关闭配方书"
          >
            ✕
          </button>
        </div>

        <div className={styles.treeContainer}>
          {recipeTree.length === 0 || unlockedRecipeIds.size === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔒</div>
              <div className={styles.emptyText}>
                暂无已解锁配方
              </div>
              <div className={styles.emptyHint}>
                尝试在工作台上组合不同材料，发现新配方！
              </div>
            </div>
          ) : (
            recipeTree.map(node => (
              <TreeNode
                key={node.itemId}
                node={node}
                level={0}
                selectedId={selectedItemId}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>

        {selectedItemId && (selectedRecipe || selectedIsMaterial) && (
          <div className={styles.detailSection}>
            <div className={styles.detailTitle}>
              {selectedIsMaterial ? '📌 材料详情' : '⚗️ 配方详情'}
            </div>

            {selectedIsMaterial && selectedMaterial && (
              <div className={styles.detailCard}>
                <div className={styles.outputInfo}>
                  <div className={styles.outputIcon}>{selectedMaterial.icon}</div>
                  <div className={styles.outputText}>
                    <div className={styles.outputName}>{selectedMaterial.name}</div>
                    <div className={styles.outputDesc}>{selectedMaterial.description}</div>
                  </div>
                </div>
                <div className={styles.materialsList}>
                  <div className={styles.materialRow}>
                    <span className={styles.materialRowIcon}>📦</span>
                    <span className={styles.materialRowName}>当前库存</span>
                    <span className={styles.materialRowQty}>
                      ×{(inventory[selectedMaterial.id] || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selectedRecipe && selectedMaterial && (
              <div className={styles.detailCard}>
                <div
                  className={styles.outputInfo}
                  onClick={() => handleBatchCraft(selectedRecipe.id)}
                  title="点击进行批量合成"
                >
                  <div className={styles.outputIcon}>{selectedMaterial.icon}</div>
                  <div className={styles.outputText}>
                    <div className={styles.outputName}>{selectedMaterial.name}</div>
                    <div className={styles.outputDesc}>{selectedRecipe.description}</div>
                  </div>
                  <span className={styles.batchHint}>批量合成</span>
                </div>

                <div className={styles.recipePattern}>
                  <div className={styles.patternLabel}>合成配方布局：</div>
                  <div className={styles.miniGrid}>
                    {selectedRecipe.pattern.map((slot, idx) => {
                      const slotMat = slot ? getMaterialById(slot.materialId) : null
                      return (
                        <div
                          key={idx}
                          className={`${styles.miniCell} ${slot ? styles.filled : ''}`}
                        >
                          {slotMat && slotMat.icon}
                          {slot && slot.quantity > 1 && (
                            <span className={styles.miniQty}>×{slot.quantity}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className={styles.recipePattern}>
                  <div className={styles.patternLabel}>材料清单：</div>
                  <div className={styles.materialsList}>
                    {selectedRecipe.pattern.filter(Boolean).map((slot, idx) => {
                      if (!slot) return null
                      const m = getMaterialById(slot.materialId)
                      return (
                        <div className={styles.materialRow} key={idx}>
                          <span className={styles.materialRowIcon}>
                            {m?.icon || '❓'}
                          </span>
                          <span className={styles.materialRowName}>
                            {m?.name || slot.materialId}
                          </span>
                          <span className={styles.materialRowQty}>
                            ×{slot.quantity}
                          </span>
                        </div>
                      )
                    })}
                    <div className={styles.materialRow} style={{
                      background: 'rgba(74, 222, 128, 0.1)',
                      border: '1px solid rgba(74, 222, 128, 0.3)'
                    }}>
                      <span className={styles.materialRowIcon}>🎁</span>
                      <span className={styles.materialRowName} style={{ color: '#4ade80' }}>
                        产出：{selectedMaterial.name}
                      </span>
                      <span style={{ color: '#4ade80', fontWeight: 700 }}>
                        ×{selectedRecipe.outputQuantity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className={styles.stats}>
          <span>已解锁：<span className={styles.statsNum}>{unlockedRecipeIds.size}</span> / {allRecipes.length}</span>
          <span>累计合成：<span className={styles.statsNum}>{totalCrafts}</span> 件</span>
        </div>
      </div>
    </>
  )
}

export default RecipeBook
