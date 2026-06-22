interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
  life: number
  maxLife: number
}

const COLORS = ['#7C3AED', '#FBBF24', '#60A5FA', '#F87171', '#10B981', '#F59E0B', '#818CF8', '#A78BFA']

export function confettiEffect(container: HTMLElement): void {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rect = container.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
  canvas.style.position = 'absolute'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '1000'
  container.appendChild(canvas)

  const particles: Particle[] = []
  const particleCount = 120
  const duration = 2000
  const startTime = Date.now()

  for (let i = 0; i < particleCount; i++) {
    particles.push(createParticle(canvas.width / 2, canvas.height / 2))
  }

  function createParticle(x: number, y: number): Particle {
    const angle = Math.random() * Math.PI * 2
    const speed = 2 + Math.random() * 8
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 4 + Math.random() * 8,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      life: 1,
      maxLife: 1
    }
  }

  function animate(): void {
    const elapsed = Date.now() - startTime
    const progress = elapsed / duration

    if (progress >= 1) {
      canvas.remove()
      return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    particles.forEach(particle => {
      particle.vy += 0.15
      particle.x += particle.vx
      particle.y += particle.vy
      particle.rotation += particle.rotationSpeed
      particle.life = 1 - progress

      ctx.save()
      ctx.translate(particle.x, particle.y)
      ctx.rotate(particle.rotation)
      ctx.fillStyle = particle.color
      ctx.globalAlpha = particle.life
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.6)
      ctx.restore()
    })

    requestAnimationFrame(animate)
  }

  animate()
}
