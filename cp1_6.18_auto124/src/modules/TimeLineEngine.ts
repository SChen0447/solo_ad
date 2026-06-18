import { Card } from './GridStore'

export interface EngineOptions {
  container: HTMLElement
  viewportWidth: number
  viewportHeight: number
  onCardClick?: (card: Card) => void
  onCardDoubleClick?: (card: Card) => void
  onCardHover?: (card: Card | null) => void
  onScroll?: (scrollX: number) => void
  onCenterCardChange?: (card: Card | null) => void
}

const CARD_WIDTH = 280
const CARD_HEIGHT = 200
const CARD_SPACING = 120
const MIN_ZOOM = 0.5
const MAX_ZOOM = 1.5
const ZOOM_STEP = 0.1

export class TimeLineEngine {
  private container: HTMLElement
  private scrollContainer: HTMLElement | null = null
  private cardsContainer: HTMLElement | null = null
  private linesSvg: SVGElement | null = null
  private cards: Card[] = []
  private zoom: number = 1
  private scrollX: number = 0
  private viewportWidth: number
  private viewportHeight: number
  private isDragging: boolean = false
  private dragStartX: number = 0
  private dragStartScrollX: number = 0
  private lastFrameTime: number = 0
  private animationFrameId: number | null = null
  private cardElements: Map<string, HTMLElement> = new Map()
  private onCardClick?: (card: Card) => void
  private onCardDoubleClick?: (card: Card) => void
  private onCardHover?: (card: Card | null) => void
  private onScroll?: (scrollX: number) => void
  private onCenterCardChange?: (card: Card | null) => void
  private hoveredCardId: string | null = null
  private centerCardId: string | null = null
  private rafPending: boolean = false

  constructor(options: EngineOptions) {
    this.container = options.container
    this.viewportWidth = options.viewportWidth
    this.viewportHeight = options.viewportHeight
    this.onCardClick = options.onCardClick
    this.onCardDoubleClick = options.onCardDoubleClick
    this.onCardHover = options.onCardHover
    this.onScroll = options.onScroll
    this.onCenterCardChange = options.onCenterCardChange

    this.init()
  }

  private init(): void {
    this.container.innerHTML = ''
    this.container.style.overflow = 'hidden'
    this.container.style.position = 'relative'
    this.container.style.willChange = 'transform'
    this.container.style.touchAction = 'none'
    this.container.style.userSelect = 'none'

    this.scrollContainer = document.createElement('div')
    this.scrollContainer.style.position = 'absolute'
    this.scrollContainer.style.top = '0'
    this.scrollContainer.style.left = '0'
    this.scrollContainer.style.width = '100%'
    this.scrollContainer.style.height = '100%'
    this.scrollContainer.style.overflow = 'hidden'
    this.container.appendChild(this.scrollContainer)

    this.linesSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.linesSvg.style.position = 'absolute'
    this.linesSvg.style.top = '0'
    this.linesSvg.style.left = '0'
    this.linesSvg.style.width = '100%'
    this.linesSvg.style.height = '100%'
    this.linesSvg.style.pointerEvents = 'none'
    this.linesSvg.style.zIndex = '1'
    this.scrollContainer.appendChild(this.linesSvg)

    this.cardsContainer = document.createElement('div')
    this.cardsContainer.style.position = 'absolute'
    this.cardsContainer.style.top = '0'
    this.cardsContainer.style.left = '0'
    this.cardsContainer.style.willChange = 'transform'
    this.cardsContainer.style.zIndex = '2'
    this.scrollContainer.appendChild(this.cardsContainer)

    this.bindEvents()
  }

  private bindEvents(): void {
    this.container.addEventListener('mousedown', this.handleMouseDown)
    this.container.addEventListener('mousemove', this.handleMouseMove)
    this.container.addEventListener('mouseup', this.handleMouseUp)
    this.container.addEventListener('mouseleave', this.handleMouseUp)
    this.container.addEventListener('wheel', this.handleWheel, { passive: false })
    this.container.addEventListener('touchstart', this.handleTouchStart)
    this.container.addEventListener('touchmove', this.handleTouchMove)
    this.container.addEventListener('touchend', this.handleTouchEnd)
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    const cardElement = target.closest('.timeline-card') as HTMLElement
    if (cardElement && cardElement.dataset.cardId) {
      const card = this.cards.find(c => c.id === cardElement.dataset.cardId)
      if (card) {
        this.onCardClick?.(card)
      }
    }

    this.isDragging = true
    this.dragStartX = e.clientX
    this.dragStartScrollX = this.scrollX
    this.container.style.cursor = 'grabbing'
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const target = e.target as HTMLElement
    const cardElement = target.closest('.timeline-card') as HTMLElement

    if (cardElement && cardElement.dataset.cardId) {
      if (this.hoveredCardId !== cardElement.dataset.cardId) {
        this.hoveredCardId = cardElement.dataset.cardId
        const card = this.cards.find(c => c.id === this.hoveredCardId)
        this.onCardHover?.(card || null)
      }
    } else if (this.hoveredCardId !== null) {
      this.hoveredCardId = null
      this.onCardHover?.(null)
    }

    if (!this.isDragging) return
    e.preventDefault()

    const deltaX = e.clientX - this.dragStartX
    const newScrollX = this.dragStartScrollX - deltaX
    this.scrollTo(newScrollX)
  }

  private handleMouseUp = (e: MouseEvent): void => {
    if (!this.isDragging) return

    const deltaX = Math.abs(e.clientX - this.dragStartX)
    if (deltaX < 5) {
      const target = e.target as HTMLElement
      const cardElement = target.closest('.timeline-card') as HTMLElement
      if (cardElement && cardElement.dataset.cardId) {
        const card = this.cards.find(c => c.id === cardElement.dataset.cardId)
        if (card) {
          this.onCardClick?.(card)
        }
      }
    }

    this.isDragging = false
    this.container.style.cursor = 'grab'
  }

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault()
    e.stopPropagation()

    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      this.setZoom(this.zoom + delta)
    } else {
      const scrollSpeed = 1.5
      this.scrollTo(this.scrollX + e.deltaY * scrollSpeed)
    }
  }

  private handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      this.isDragging = true
      this.dragStartX = e.touches[0].clientX
      this.dragStartScrollX = this.scrollX
    }
  }

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.isDragging || e.touches.length !== 1) return
    e.preventDefault()

    const deltaX = e.touches[0].clientX - this.dragStartX
    const newScrollX = this.dragStartScrollX - deltaX
    this.scrollTo(newScrollX)
  }

  private handleTouchEnd = (): void => {
    this.isDragging = false
  }

  public render(cards: Card[]): void {
    this.cards = cards
    this.scheduleRender()
  }

  private scheduleRender(): void {
    if (this.rafPending) return
    this.rafPending = true

    requestAnimationFrame((timestamp) => {
      this.rafPending = false
      if (timestamp - this.lastFrameTime < 16) {
        this.scheduleRender()
        return
      }
      this.lastFrameTime = timestamp
      this.performRender()
    })
  }

  private performRender(): void {
    if (!this.cardsContainer || !this.linesSvg) return

    const totalWidth = this.getTotalWidth()
    const baseY = this.viewportHeight / 2

    this.cardsContainer.style.width = `${totalWidth}px`
    this.cardsContainer.style.height = `${this.viewportHeight}px`
    this.cardsContainer.style.transform = `translate3d(${-this.scrollX}px, 0, 0)`

    this.updateCenterCard()

    const existingIds = new Set(this.cardElements.keys())
    const currentIds = new Set(this.cards.map(c => c.id))

    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        const el = this.cardElements.get(id)
        if (el) {
          el.remove()
        }
        this.cardElements.delete(id)
      }
    }

    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i]
      const x = this.getCardPositionX(i)
      const y = baseY - (CARD_HEIGHT * this.zoom) / 2

      card.x = x
      card.y = y
      card.scale = this.zoom

      let cardElement = this.cardElements.get(card.id)

      if (!cardElement) {
        cardElement = this.createCardElement(card)
        this.cardElements.set(card.id, cardElement)
        this.cardsContainer.appendChild(cardElement)
      }

      this.updateCardElement(cardElement, card, x, y)
    }

    this.renderConnections()
  }

  private getCardPositionX(index: number): number {
    const baseX = this.viewportWidth / 2
    const cardWidth = CARD_WIDTH * this.zoom
    const spacing = CARD_SPACING * this.zoom
    return baseX + index * (cardWidth + spacing)
  }

  private getTotalWidth(): number {
    if (this.cards.length === 0) return this.viewportWidth
    const cardWidth = CARD_WIDTH * this.zoom
    const spacing = CARD_SPACING * this.zoom
    const baseX = this.viewportWidth / 2
    const lastCardX = baseX + (this.cards.length - 1) * (cardWidth + spacing)
    return lastCardX + cardWidth + baseX
  }

  private createCardElement(card: Card): HTMLElement {
    const el = document.createElement('div')
    el.className = 'timeline-card'
    el.dataset.cardId = card.id
    el.style.position = 'absolute'
    el.style.willChange = 'transform, opacity'
    el.style.transition = 'box-shadow 0.3s ease, filter 0.3s ease, background-color 0.3s ease'

    if (card.isNew) {
      el.style.animation = 'slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
      el.style.opacity = '0'
    }

    el.addEventListener('dblclick', () => {
      this.onCardDoubleClick?.(card)
    })

    el.addEventListener('mouseenter', () => {
      this.hoveredCardId = card.id
      this.onCardHover?.(card)
    })

    el.addEventListener('mouseleave', () => {
      if (this.hoveredCardId === card.id) {
        this.hoveredCardId = null
        this.onCardHover?.(null)
      }
    })

    return el
  }

  private updateCardElement(el: HTMLElement, card: Card, x: number, y: number): void {
    const width = CARD_WIDTH * this.zoom
    const height = CARD_HEIGHT * this.zoom

    el.style.transform = `translate3d(${x}px, ${y}px, 0)`
    el.style.width = `${width}px`
    el.style.height = `${height}px`

    const centerX = this.viewportWidth / 2
    const cardCenterX = x + width / 2 + this.scrollX
    const distance = Math.abs(cardCenterX - centerX)
    const maxDistance = this.viewportWidth / 2

    let opacity = 1
    let backgroundColor = 'var(--bg-card)'

    if (distance < width * 0.3) {
      backgroundColor = 'var(--focus-bg)'
      opacity = 1
    } else if (distance > maxDistance * 0.7) {
      const fadeStart = maxDistance * 0.7
      const fadeAmount = (distance - fadeStart) / (maxDistance - fadeStart)
      opacity = Math.max(0.4, 1 - fadeAmount * 0.6)
      backgroundColor = this.mixColors('#16213E', '#2D3748', fadeAmount * 0.5)
    }

    el.style.backgroundColor = backgroundColor
    el.style.opacity = String(opacity)

    const isFocused = this.centerCardId === card.id
    const isHovered = this.hoveredCardId === card.id

    let boxShadow = '0.2rem 0.2rem 0.5rem rgba(0, 0, 0, 0.3)'
    let filter = 'none'

    if (isHovered || isFocused) {
      boxShadow = `0.5rem 0.5rem 1rem rgba(0, 0, 0, 0.4), 0 0 1.5rem ${card.color}60`
      filter = `drop-shadow(0 0 0.5rem ${card.color}40)`
    }

    el.style.boxShadow = boxShadow
    el.style.filter = filter

    const fontSizeMultiplier = this.zoom
    const titleSize = Math.max(10, 16 * fontSizeMultiplier)
    const noteSize = Math.max(8, 12 * fontSizeMultiplier)

    const border = card.isUnfiled
      ? '2px dashed rgba(160, 174, 192, 0.5)'
      : '1px solid rgba(160, 174, 192, 0.2)'

    const borderRadius = `${12 * fontSizeMultiplier}px`

    el.style.border = border
    el.style.borderRadius = borderRadius

    el.innerHTML = this.getCardInnerHTML(card, titleSize, noteSize)

    if (card.isUpdating) {
      el.style.animation = 'fadeOutIn 0.4s ease forwards'
    }
  }

  private getCardInnerHTML(card: Card, titleSize: number, noteSize: number): string {
    let dateText = '未归档'
    if (card.timestamp) {
      dateText = card.timestamp.toISOString().split('T')[0]
    }

    let imageHtml = ''
    if (card.imageUrl) {
      imageHtml = `
        <div class="card-image" style="
          width: 100%;
          height: 50%;
          background-image: url(${card.imageUrl});
          background-size: cover;
          background-position: center;
          border-radius: ${12 * this.zoom}px ${12 * this.zoom}px 0 0;
          overflow: hidden;
        "></div>
      `
    }

    return `
      ${imageHtml}
      <div style="padding: ${8 * this.zoom}px ${12 * this.zoom}px; height: ${card.imageUrl ? '50%' : '100%'}; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3 style="
            margin: 0 0 ${4 * this.zoom}px 0;
            font-size: ${titleSize}px;
            font-weight: 600;
            color: var(--text-title);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            line-height: 1.3;
          ">${this.escapeHtml(card.title)}</h3>
          <p style="
            margin: 0;
            font-size: ${noteSize}px;
            color: var(--text-note);
            display: -webkit-box;
            -webkit-line-clamp: ${card.imageUrl ? 2 : 4};
            -webkit-box-orient: vertical;
            overflow: hidden;
            line-height: 1.4;
          ">${this.escapeHtml(card.content)}</p>
        </div>
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: ${8 * this.zoom}px;
        ">
          <span style="
            font-size: ${Math.max(9, 11 * this.zoom)}px;
            color: ${card.isUnfiled ? '#F6AD55' : 'var(--accent-line)'};
            opacity: 0.9;
          ">${dateText}</span>
          <span style="
            width: ${8 * this.zoom}px;
            height: ${8 * this.zoom}px;
            border-radius: 50%;
            background-color: ${card.color};
            box-shadow: 0 0 ${8 * this.zoom}px ${card.color};
          "></span>
        </div>
      </div>
    `
  }

  private renderConnections(): void {
    if (!this.linesSvg || this.cards.length < 2) return

    const width = this.linesSvg.clientWidth
    const height = this.linesSvg.clientHeight
    this.linesSvg.setAttribute('viewBox', `0 0 ${width} ${height}`)

    let svgContent = ''
    const baseY = this.viewportHeight / 2 - this.scrollX

    for (let i = 0; i < this.cards.length - 1; i++) {
      const card1 = this.cards[i]
      const card2 = this.cards[i + 1]

      const x1 = card1.x + (CARD_WIDTH * this.zoom) / 2
      const x2 = card2.x + (CARD_WIDTH * this.zoom) / 2
      const y = baseY

      const lineX1 = x1 + (CARD_WIDTH * this.zoom) / 2
      const lineX2 = x2 - (CARD_WIDTH * this.zoom) / 2

      svgContent += `
        <line
          x1="${lineX1}"
          y1="${y}"
          x2="${lineX2}"
          y2="${y}"
          stroke="var(--accent-line)"
          stroke-width="0.5"
          style="filter: drop-shadow(0 0 2px var(--accent-line));"
        />
        <circle
          cx="${x1}"
          cy="${y}"
          r="${3 * this.zoom}"
          fill="${card1.color}"
          style="filter: drop-shadow(0 0 4px ${card1.color});"
        />
      `
    }

    if (this.cards.length > 0) {
      const lastCard = this.cards[this.cards.length - 1]
      const x = lastCard.x + (CARD_WIDTH * this.zoom) / 2
      svgContent += `
        <circle
          cx="${x}"
          cy="${baseY}"
          r="${3 * this.zoom}"
          fill="${lastCard.color}"
          style="filter: drop-shadow(0 0 4px ${lastCard.color});"
        />
      `
    }

    this.linesSvg.innerHTML = svgContent
  }

  private updateCenterCard(): void {
    if (this.cards.length === 0) return

    const centerX = this.viewportWidth / 2
    let minDistance = Infinity
    let centerCard: Card | null = null

    for (const card of this.cards) {
      const cardCenterX = card.x + (CARD_WIDTH * this.zoom) / 2
      const distance = Math.abs(cardCenterX + this.scrollX - centerX)

      if (distance < minDistance) {
        minDistance = distance
        centerCard = card
      }
    }

    if (centerCard && centerCard.id !== this.centerCardId) {
      this.centerCardId = centerCard.id
      this.onCenterCardChange?.(centerCard)
    }
  }

  public scrollTo(x: number): void {
    const maxScroll = Math.max(0, this.getTotalWidth() - this.viewportWidth)
    this.scrollX = Math.max(0, Math.min(maxScroll, x))
    this.onScroll?.(this.scrollX)
    this.scheduleRender()
  }

  public setZoom(zoom: number): void {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
    if (clampedZoom === this.zoom) return

    const centerX = this.viewportWidth / 2
    const oldZoom = this.zoom
    this.zoom = clampedZoom

    const scaleRatio = clampedZoom / oldZoom
    const centerCardX = centerX + this.scrollX
    const newCenterCardX = centerCardX * scaleRatio
    this.scrollX = newCenterCardX - centerX

    this.scheduleRender()
  }

  public getZoom(): number {
    return this.zoom
  }

  public getScrollX(): number {
    return this.scrollX
  }

  public getTotalWidth(): number {
    return this.getTotalWidth()
  }

  public getCenterCard(): Card | null {
    return this.cards.find(c => c.id === this.centerCardId) || null
  }

  public handleDrag(deltaX: number): void {
    this.scrollTo(this.scrollX - deltaX)
  }

  public destroy(): void {
    this.container.removeEventListener('mousedown', this.handleMouseDown)
    this.container.removeEventListener('mousemove', this.handleMouseMove)
    this.container.removeEventListener('mouseup', this.handleMouseUp)
    this.container.removeEventListener('mouseleave', this.handleMouseUp)
    this.container.removeEventListener('wheel', this.handleWheel)
    this.container.removeEventListener('touchstart', this.handleTouchStart)
    this.container.removeEventListener('touchmove', this.handleTouchMove)
    this.container.removeEventListener('touchend', this.handleTouchEnd)

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }

    this.cardElements.clear()
  }

  private mixColors(color1: string, color2: string, ratio: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16)
    const g1 = parseInt(color1.slice(3, 5), 16)
    const b1 = parseInt(color1.slice(5, 7), 16)
    const r2 = parseInt(color2.slice(1, 3), 16)
    const g2 = parseInt(color2.slice(3, 5), 16)
    const b2 = parseInt(color2.slice(5, 7), 16)

    const r = Math.round(r1 + (r2 - r1) * ratio)
    const g = Math.round(g1 + (g2 - g1) * ratio)
    const b = Math.round(b1 + (b2 - b1) * ratio)

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}
