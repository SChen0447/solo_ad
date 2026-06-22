const COLORS = ['#FBBF24', '#60A5FA', '#818CF8', '#F87171', '#A78BFA', '#10B981', '#F59E0B', '#7C3AED', '#EC4899', '#06B6D4']

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotationSpeed: number
  color: string
  size: number
  life: number
  maxLife: number
  element: HTMLDivElement
}

export function confettiEffect(container: HTMLElement): void {
  const particleCount = 80
  const particles: Particle[] = []
  const duration = 2000
  const startTime = performance.now()

  const rect = container.getBoundingClientRect()
  const centerX = rect.width / 2
  const centerY = rect.height / 2

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 3 + Math.random() * 8
    const particle = document.createElement('div')
    particle.style.cssText = `
      position: absolute;
      width: ${6 + Math.random() * 6}px;
      height: ${6 + Math.random() * 6}px;
      background: ${COLORS[Math.floor(Math.random() * COLORS.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      pointer-events: none;
      will-change: transform, opacity;
      z-index: 9999;
    `
    container.appendChild(particle)

    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 15,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 6,
      life: 0,
      maxLife: duration,
      element: particle
    })
  }

  function animate(currentTime: number) {
    const elapsed = currentTime - startTime
    if (elapsed >= duration) {
      particles.forEach((p) => {
        p.element.remove()
      })
      return
    }

    particles.forEach((p) => {
      p.vy += 0.15
      p.x += p.vx
      p.y += p.vy
      p.rotation += p.rotationSpeed
      p.life = elapsed

      const opacity = 1 - elapsed / duration
      p.element.style.transform = `translate(${p.x - centerX}px, ${p.y - centerY}px) rotate(${p.rotation}deg)`
      p.element.style.opacity = String(Math.max(0, opacity))
    })

    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)
}
