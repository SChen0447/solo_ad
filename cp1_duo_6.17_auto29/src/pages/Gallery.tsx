import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getPoems, favoritePoem, getPalettes, getTextures, getFonts, Poem, Palette, Texture, FontOption } from '../api/poems'
import { useHeartbeat, hexToRgba } from '../utils/animations'

interface Particle {
  x: number
  y: number
  size: number
  vx: number
  vy: number
  color: string
}

const PARTICLE_COLORS = [
  'rgba(120, 140, 180, 0.4)',
  'rgba(150, 130, 180, 0.3)',
  'rgba(100, 160, 180, 0.35)',
  'rgba(180, 140, 160, 0.3)',
  'rgba(130, 150, 200, 0.35)',
]

const initParticles = (count: number, width: number, height: number): Particle[] => {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 2 + Math.random() * 6,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    })
  }
  return particles
}

const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let particles = initParticles(60, canvas.width, canvas.height)
    let lastTime = performance.now()
    let frameCount = 0

    const animate = (time: number) => {
      const delta = time - lastTime
      if (delta >= 33) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        particles.forEach((p) => {
          p.x += p.vx
          p.y += p.vy
          if (p.x < 0) p.x = canvas.width
          if (p.x > canvas.width) p.x = 0
          if (p.y < 0) p.y = canvas.height
          if (p.y > canvas.height) p.y = 0
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = p.color
          ctx.fill()
        })
        lastTime = time
        frameCount++
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="particles-canvas" />
}

const PoemCard = ({ poem, palette, texture, font, onClick }: {
  poem: Poem
  palette: Palette
  texture: Texture
  font: FontOption
  onClick: () => void
}) => {
  const { beating, trigger } = useHeartbeat()
  const [favorites, setFavorites] = useState(poem.favorites)
  const [hovered, setHovered] = useState(false)

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    trigger()
    try {
      const res = await favoritePoem(poem.id)
      setFavorites(res.favorites)
    } catch (err) {
      setFavorites((f) => f + 1)
    }
  }

  const shadowColor = hexToRgba(palette.primary, 0.4)
  const cardStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${palette.background} 0%, ${palette.secondary} 100%)`,
    color: palette.text,
    fontFamily: font.family,
    boxShadow: hovered ? `0 12px 40px ${shadowColor}` : `0 4px 16px rgba(0,0,0,0.15)`,
  }

  return (
    <div
      className="poem-card"
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div dangerouslySetInnerHTML={{ __html: texture.svg }}
        style={{ position: absolute; inset: 0; opacity: 0.08; pointerEvents: 'none' }}
      />
      <div className="poem-card-header">
        <div>
          <div className="poem-card-title">{poem.title}</div>
          <div className="poem-card-poet">{poem.poet}</div>
        </div>
        <button
          className={`favorite-btn ${beating ? 'heartbeat' : ''}`}
          onClick={handleFavorite}
        >
            ♥ {favorites}
        </button>
      </div>
      <div className="poem-card-content">
        {poem.content.split('\n').slice(0, 4).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        {poem.content.split('\n').length > 4 && <div>...</div>}
      </div>
      <div className="poem-card-footer">
        <span>{palette.name}</span>
      </div>
    </div>
  )
}

export default function Gallery() {
  const navigate = useNavigate()
  const [poems, setPoems] = useState<Poem[]>([])
  const [palettes, setPalettes] = useState<Palette[]>([])
  const [textures, setTextures] = useState<Texture[]>([])
  const [fonts, setFonts] = useState<FontOption[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const res = await getPoems(page, 12)
      setPoems((prev) => [...prev, ...res.poems])
      setHasMore(res.hasMore)
      setPage((p) => p + 1)
    } finally {
      setLoading(false)
    }
  }, [page, loading, hasMore])

  useEffect(() => {
    const loadStatic = async () => {
      const [pals, texs, fnts] = await Promise.all([
        getPalettes().catch(() => []),
        getTextures().catch(() => []),
        getFonts().catch(() => []),
      ])
      setPalettes(pals)
      setTextures(texs)
      setFonts(fnts)
    }
    loadStatic()
    loadMore()
  }, [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [loadMore])

  const getPalette = (id: number) => palettes.find((p) => p.id === id) || palettes[0]
  const getTexture = (id: number) => textures.find((t) => t.id === id) || textures[0]
  const getFont = (id: string) => fonts.find((f) => f.id === id) || fonts[0]

  return (
    <>
      <ParticleBackground />
      <div className="gallery-container">
        <div className="gallery-grid">
          {poems.map((poem) => (
            <PoemCard
              key={poem.id}
              poem={poem}
              palette={getPalette(poem.palette_id)}
              texture={getTexture(poem.texture_id)}
              font={getFont(poem.font_id)}
              onClick={() => navigate(`/poem/${poem.id}`)}
            />
          ))}
        </div>
        <div ref={sentinelRef} className="loading-spinner">
          {loading && '加载中...'}
          {!hasMore && poems.length > 0 && '— 没有更多了 —'}
        </div>
      </div>
    </>
  )
}
