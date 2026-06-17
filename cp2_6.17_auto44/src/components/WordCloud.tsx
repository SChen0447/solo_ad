/**
 * WordCloud 组件 - 讨论热词词云展示组件
 * 
 * 调用关系 & 数据流向：
 * 1. 由 App.tsx 传入 props: { shelfId }
 *    - shelfId: 当前书架ID，通过 apiClient.getWordCloud(shelfId) 获取该书架的讨论关键词频率数据
 * 2. 组件内部通过 apiClient 调用后端接口：
 *    - GET /api/shelves/:shelfId/wordcloud → 获取关键词+频率数组（按书架ID动态聚合）
 *    - GET /api/discussions?word=xxx → 点击词云词汇时，获取该词相关的讨论记录
 * 3. 渲染内容：
 *    - 主体: 使用阿基米德螺旋算法（Archimedean Spiral）从中心向外搜索无重叠位置
 *      词汇大小/颜色根据频率映射（最大频率 #ff6b6b，最小频率 #b0b0b0）
 *    - 交互: 每个词汇绑定 onClick，点击后打开模态框展示相关讨论
 *      （如果需要跳转新窗口可取消 window.open 的注释）
 * 4. 子组件依赖: Modal.tsx (通用模态框组件，展示讨论列表)
 */

import { useState, useEffect, useRef } from 'react'
import { apiClient } from '../apiClient'
import type { DiscussionKeyword, Discussion } from '../types'
import Modal from './Modal'
import '../styles/WordCloud.css'

interface WordCloudProps {
  shelfId: string
}

interface WordPosition {
  word: string
  frequency: number
  x: number
  y: number
  fontSize: number
  color: string
  width: number
  height: number
}

function WordCloud({ shelfId }: WordCloudProps) {
  // 关键词频率数据（来自后端）
  const [keywords, setKeywords] = useState<DiscussionKeyword[]>([])
  // 当前选中的词汇（用于模态框）
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  // 当前选中词汇的讨论列表
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  // 词云容器 DOM 引用
  const containerRef = useRef<HTMLDivElement>(null)
  // 计算后的词汇位置数组（含坐标、大小、颜色）
  const [wordPositions, setWordPositions] = useState<WordPosition[]>([])
  // 刷新按钮加载中状态
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 组件挂载或 shelfId 变化时，加载词云数据
  useEffect(() => {
    loadWordCloud()
  }, [shelfId])

  // 关键词数据变化或容器尺寸变化时，重新计算螺旋布局
  useEffect(() => {
    if (keywords.length > 0 && containerRef.current) {
      calculateWordPositions()
    }
    // 监听窗口 resize 以重新布局
    const handleResize = () => {
      if (keywords.length > 0 && containerRef.current) {
        calculateWordPositions()
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [keywords, containerRef.current?.offsetWidth])

  // 通过 apiClient.getWordCloud(shelfId) 加载当前书架的关键词词云数据
  const loadWordCloud = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true)
    try {
      const data = await apiClient.getWordCloud(shelfId)
      setKeywords(data)
    } catch (err) {
      console.error('Failed to load word cloud:', err)
    } finally {
      if (showLoading) setIsRefreshing(false)
    }
  }

  // 点击刷新按钮：重新拉取后端词云数据并重绘布局
  const handleRefresh = () => {
    loadWordCloud(true)
  }

  /**
   * 阿基米德螺旋布局算法（Archimedean Spiral）
   * 公式: r(θ) = a + bθ
   * - 从容器中心作为起始点
   * - 按频率从高到低放置词汇（频率高的占中心，视觉上更突出）
   * - 对每个词：沿螺旋线采样若干候选位置，找到第一个不与已放置词汇重叠的位置
   */
  const calculateWordPositions = () => {
    if (!containerRef.current) return

    const containerWidth = containerRef.current.offsetWidth
    const containerHeight = 320
    const centerX = containerWidth / 2
    const centerY = containerHeight / 2

    // 频率映射参数
    const maxFreq = Math.max(...keywords.map((k) => k.frequency))
    const minFreq = Math.min(...keywords.map((k) => k.frequency))

    const positions: WordPosition[] = []
    const placedRects: { x: number; y: number; width: number; height: number }[] = []

    // 按频率降序排列，高频词优先占据中心位置
    const sortedKeywords = [...keywords].sort((a, b) => b.frequency - a.frequency)

    // 阿基米德螺旋参数
    const spiralA = 5        // 起始半径偏移
    const spiralB = 1.2      // 螺旋间距系数（值越大，旋转越稀疏）
    const angleStep = 0.18   // 角度采样步长（弧度），值越小采样越密
    const maxAttempts = 2500 // 单个词最大尝试次数（防止死循环）

    sortedKeywords.forEach((keyword) => {
      // 归一化频率到 [0, 1]
      const normalizedFreq = maxFreq === minFreq ? 1 : (keyword.frequency - minFreq) / (maxFreq - minFreq)
      // 使用平方根映射放大高频词视觉权重，低频词更小更淡
      // 字体大小范围：12px ~ 52px（之前 14~46，范围扩大并使用非线性曲线）
      const boostedFreq = Math.pow(normalizedFreq, 0.65)
      const fontSize = 12 + boostedFreq * 40

      // 颜色插值：低频 #8b949e（更暗） → 中频 #58a6ff（蓝） → 高频 #ff6b6b（亮红）
      const color = normalizedFreq < 0.5
        ? lerpColor('#8b949e', '#58a6ff', normalizedFreq * 2)
        : lerpColor('#58a6ff', '#ff6b6b', (normalizedFreq - 0.5) * 2)

      // 测量词汇实际渲染尺寸（在 DOM 中创建临时 span 测量）
      const tempSpan = document.createElement('span')
      tempSpan.style.fontSize = `${fontSize}px`
      tempSpan.style.fontWeight = '600'
      tempSpan.style.visibility = 'hidden'
      tempSpan.style.position = 'absolute'
      tempSpan.style.whiteSpace = 'nowrap'
      tempSpan.textContent = keyword.word
      document.body.appendChild(tempSpan)
      const textWidth = tempSpan.offsetWidth
      const textHeight = tempSpan.offsetHeight
      document.body.removeChild(tempSpan)

      const padding = 8
      const wordWidth = textWidth + padding * 2
      const wordHeight = textHeight + padding * 2

      let placed = false
      let finalX = 0
      let finalY = 0

      // 沿阿基米德螺旋线从中心向外搜索位置
      for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
        const angle = attempt * angleStep
        // 阿基米德螺旋半径公式：r = a + b * θ
        const radius = spiralA + spiralB * angle

        // 计算当前角度下的候选中心坐标
        const candidateCenterX = centerX + Math.cos(angle) * radius
        const candidateCenterY = centerY + Math.sin(angle) * (radius * 0.75) // Y轴稍微压缩让布局更紧凑

        // 词汇左上角坐标
        const x = candidateCenterX - wordWidth / 2
        const y = candidateCenterY - wordHeight / 2

        // 边界检查：必须完全在容器内部
        if (x < 0 || y < 0 || x + wordWidth > containerWidth || y + wordHeight > containerHeight) {
          continue
        }

        // 与已放置的词汇做 AABB 矩形碰撞检测
        const rect = { x, y, width: wordWidth, height: wordHeight }
        let collision = false
        for (const placedRect of placedRects) {
          if (intersects(rect, placedRect)) {
            collision = true
            break
          }
        }

        if (!collision) {
          placed = true
          finalX = x
          finalY = y
        }
      }

      // 如果找到了位置则加入结果
      if (placed) {
        positions.push({
          word: keyword.word,
          frequency: keyword.frequency,
          x: finalX,
          y: finalY,
          fontSize,
          color,
          width: wordWidth,
          height: wordHeight,
        })
        placedRects.push({ x: finalX, y: finalY, width: wordWidth, height: wordHeight })
      }
    })

    setWordPositions(positions)
  }

  /**
   * AABB 矩形碰撞检测：两个轴对齐矩形是否相交
   */
  const intersects = (
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean => {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    )
  }

  /**
   * 线性插值颜色：在 color1 和 color2 之间按 t 比例插值
   */
  const lerpColor = (color1: string, color2: string, t: number): string => {
    const c1 = hexToRgb(color1)
    const c2 = hexToRgb(color2)
    if (!c1 || !c2) return color1

    const r = Math.round(c1.r + (c2.r - c1.r) * t)
    const g = Math.round(c1.g + (c2.g - c1.g) * t)
    const b = Math.round(c1.b + (c2.b - c1.b) * t)

    return `rgb(${r}, ${g}, ${b})`
  }

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  }

  /**
   * 点击词汇时触发：
   * 1. 调用 apiClient.getDiscussions(word) 加载相关讨论
   * 2. 打开模态框展示讨论列表
   *    （如需新窗口跳转讨论页面，可取消下面 window.open 注释）
   */
  const handleWordClick = async (word: string) => {
    setSelectedWord(word)
    try {
      const data = await apiClient.getDiscussions(word)
      setDiscussions(data)
      // 如需新窗口跳转讨论页面，使用以下代码：
      // window.open(`/discussions?word=${encodeURIComponent(word)}`, '_blank')
    } catch (err) {
      console.error('Failed to load discussions:', err)
    }
  }

  return (
    <div className="wordcloud-section card">
      <div className="section-header">
        <h2 className="section-title">💬 讨论热词</h2>
        <button
          className={`wordcloud-refresh-btn ${isRefreshing ? 'loading' : ''}`}
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="刷新词云"
          title="重新获取最新讨论热词"
        >
          <span className={`refresh-icon ${isRefreshing ? 'spin' : ''}`}>⟳</span>
          {isRefreshing ? '刷新中...' : '刷新词云'}
        </button>
      </div>
      <div
        ref={containerRef}
        className="wordcloud-container"
        style={{ minHeight: '320px' }}
      >
        {/* 渲染词云词汇 */}
        {wordPositions.map((wp, index) => (
          <span
            key={wp.word}
            className="wordcloud-word"
            style={{
              left: wp.x,
              top: wp.y,
              fontSize: `${wp.fontSize}px`,
              color: wp.color,
              animationDelay: `${index * 0.04}s`,
            }}
            onClick={() => handleWordClick(wp.word)}
            title={`「${wp.word}」出现 ${wp.frequency} 次 - 点击查看相关讨论`}
          >
            {wp.word}
          </span>
        ))}
        {wordPositions.length === 0 && keywords.length > 0 && (
          <div className="wordcloud-loading">计算词云布局中...</div>
        )}
      </div>

      {/* 讨论模态框：点击词云词汇后打开，展示与该词相关的讨论记录 */}
      <Modal
        isOpen={!!selectedWord}
        onClose={() => setSelectedWord(null)}
        title={`「${selectedWord}」相关讨论`}
      >
        <div className="discussion-list">
          {discussions.length === 0 ? (
            <p className="empty-discussions">暂无关于「{selectedWord}」的讨论</p>
          ) : (
            discussions.map((discussion) => (
              <div key={discussion.id} className="discussion-item">
                <div className="discussion-header">
                  <span className="discussion-author">{discussion.author}</span>
                  <span className="discussion-date">{discussion.date}</span>
                </div>
                <p className="discussion-content">{discussion.content}</p>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}

export default WordCloud
