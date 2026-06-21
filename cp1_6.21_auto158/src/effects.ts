interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export function createFloatingNumber(
  container: HTMLElement,
  x: number,
  y: number,
  value: number | string,
  color: string = '#ffd700',
  duration: number = 1000
): void {
  const el = document.createElement('div');
  el.textContent = typeof value === 'number' ? (value > 0 ? `+${value}` : `${value}`) : value;
  el.style.cssText = `
    position: absolute;
    left: ${x}px;
    top: ${y}px;
    color: ${color};
    font-size: 24px;
    font-weight: bold;
    text-shadow: 0 0 10px ${color}, 0 0 20px ${color};
    pointer-events: none;
    z-index: 1000;
    opacity: 1;
    transform: translate(-50%, -50%);
    transition: all ${duration}ms ease-out;
  `;
  
  container.appendChild(el);
  
  requestAnimationFrame(() => {
    el.style.transform = 'translate(-50%, -150%)';
    el.style.opacity = '0';
  });
  
  setTimeout(() => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }, duration);
}

export function createComboNameAnimation(
  container: HTMLElement,
  comboName: string,
  duration: number = 600
): void {
  const el = document.createElement('div');
  el.textContent = comboName;
  el.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    color: #ffd700;
    font-size: 72px;
    font-weight: 900;
    text-shadow: 0 0 20px #ffd700, 0 0 40px #ff8c00, 0 0 60px #ff4500;
    pointer-events: none;
    z-index: 2000;
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3);
    transition: all ${duration}ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
    letter-spacing: 4px;
  `;
  
  container.appendChild(el);
  
  createGoldParticleTrail(container, window.innerWidth / 2, window.innerHeight / 2);
  
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translate(-50%, -50%) scale(1.2)';
  });
  
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%, -50%) scale(1.5)';
  }, duration);
  
  setTimeout(() => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }, duration * 2);
}

export function createGoldParticleTrail(
  container: HTMLElement,
  startX: number,
  startY: number,
  particleCount: number = 50
): void {
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.cssText = `
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: none;
    z-index: 1500;
  `;
  
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const particles: Particle[] = [];
  const maxParticles = Math.min(particleCount, 100);

  for (let i = 0; i < maxParticles; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      maxLife: 1,
      size: 2 + Math.random() * 4,
      color: `hsl(${45 + Math.random() * 15}, 100%, ${60 + Math.random() * 30}%)`,
      alpha: 1,
    });
  }

  let startTime = Date.now();
  const maxDuration = 1500;

  function animate() {
    if (!ctx) return;
    const elapsed = Date.now() - startTime;
    if (elapsed > maxDuration) {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.016;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (particles.length > 0) {
      requestAnimationFrame(animate);
    } else if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  }

  animate();
}

export function createCardFlipAnimation(
  cardElement: HTMLElement
): Promise<void> {
  return new Promise((resolve) => {
    cardElement.style.transition = `transform 300ms ease-in-out`;
    cardElement.style.transform = 'rotateY(90deg)';
    
    setTimeout(() => {
      cardElement.classList.add('flipped');
      cardElement.style.transform = 'rotateY(0deg)';
      
      setTimeout(() => {
        resolve();
      }, 300);
    }, 150);
  });
}

export function createHighlightPulse(
  element: HTMLElement,
  color: string = '#00d4ff'
): void {
  const originalBoxShadow = element.style.boxShadow;
  const originalBorder = element.style.border;
  
  let pulseCount = 0;
  const maxPulses = 1;
  
  function pulse() {
    if (pulseCount >= maxPulses) {
      element.style.boxShadow = originalBoxShadow;
      element.style.border = originalBorder;
      return;
    }
    
    element.style.transition = 'all 0.25s ease-in-out';
    element.style.boxShadow = `0 0 30px ${color}, 0 0 60px ${color}`;
    element.style.border = `3px solid ${color}`;
    
    setTimeout(() => {
      element.style.boxShadow = originalBoxShadow;
      element.style.border = originalBorder;
      pulseCount++;
      setTimeout(pulse, 250);
    }, 250);
  }
  
  pulse();
}

export function createHealthFlash(
  element: HTMLElement,
  isDamage: boolean = true,
  duration: number = 300
): void {
  const color = isDamage ? '#ff4444' : '#44ff44';
  const originalBackground = element.style.backgroundColor;
  
  element.style.transition = `background-color ${duration}ms ease-in-out`;
  element.style.backgroundColor = color;
  
  setTimeout(() => {
    element.style.backgroundColor = originalBackground;
  }, duration);
}

export function createArmorShieldAnimation(
  container: HTMLElement,
  targetX: number,
  targetY: number
): void {
  for (let i = 0; i < 3; i++) {
    const shield = document.createElement('div');
    shield.innerHTML = '🛡️';
    shield.style.cssText = `
      position: absolute;
      left: ${targetX}px;
      top: ${targetY}px;
      font-size: 32px;
      pointer-events: none;
      z-index: 900;
      opacity: 0;
      transition: all 1s ease-out;
    `;
    
    container.appendChild(shield);
    
    const angle = (i / 3) * Math.PI * 2;
    const radius = 60;
    const endX = targetX + Math.cos(angle) * radius;
    const endY = targetY + Math.sin(angle) * radius;
    
    setTimeout(() => {
      shield.style.opacity = '1';
      shield.style.left = `${endX}px`;
      shield.style.top = `${endY}px`;
      shield.style.transform = 'rotate(360deg)';
    }, i * 100);
    
    setTimeout(() => {
      shield.style.opacity = '0';
    }, 800 + i * 100);
    
    setTimeout(() => {
      if (shield.parentNode) {
        shield.parentNode.removeChild(shield);
      }
    }, 1200 + i * 100);
  }
}

export function createVictoryAnimation(container: HTMLElement): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 3000;
    overflow: hidden;
  `;
  
  container.appendChild(overlay);
  
  const fireworkCount = 8;
  for (let i = 0; i < fireworkCount; i++) {
    setTimeout(() => {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight * 0.6 + 100;
      createFirework(overlay, x, y);
    }, i * 200);
  }
  
  const victoryText = document.createElement('div');
  victoryText.textContent = '胜 利!';
  victoryText.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    color: #ffd700;
    font-size: 96px;
    font-weight: 900;
    text-shadow: 0 0 30px #ffd700, 0 0 60px #ff8c00;
    pointer-events: none;
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
    transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation: glow 1s ease-in-out infinite alternate;
  `;
  
  overlay.appendChild(victoryText);
  
  requestAnimationFrame(() => {
    victoryText.style.opacity = '1';
    victoryText.style.transform = 'translate(-50%, -50%) scale(1)';
  });
  
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }, 4000);
}

function createFirework(container: HTMLElement, x: number, y: number): void {
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.cssText = `
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: none;
  `;
  
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const particles: Particle[] = [];
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500'];

  for (let i = 0; i < 50; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 1,
      size: 2 + Math.random() * 3,
      color,
      alpha: 1,
    });
  }

  let startTime = Date.now();
  const maxDuration = 2000;

  function animate() {
    const elapsed = Date.now() - startTime;
    if (elapsed > maxDuration) {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.vx *= 0.99;
      p.life -= 0.012;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (particles.length > 0) {
      requestAnimationFrame(animate);
    } else if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  }

  animate();
}

export function createEpicParticleBackground(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
  }

  const particles: Particle[] = [];
  const particleCount = 30;
  let animationId: number;
  let isRunning = true;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: 1 + Math.random() * 2,
      alpha: 0.3 + Math.random() * 0.7,
    });
  }

  function animate() {
    if (!isRunning) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.save();
      ctx.globalAlpha = p.alpha * (0.5 + Math.sin(Date.now() / 1000 + p.x) * 0.5);
      ctx.fillStyle = '#a855f7';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#a855f7';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    animationId = requestAnimationFrame(animate);
  }

  animate();

  return () => {
    isRunning = false;
    cancelAnimationFrame(animationId);
  };
}

export function createDragScaleAnimation(
  element: HTMLElement,
  isDragging: boolean,
  scale: number = 1.1
): void {
  element.style.transition = 'transform 0.15s ease-out';
  if (isDragging) {
    element.style.transform = `scale(${scale})`;
    element.style.zIndex = '100';
  } else {
    element.style.transform = 'scale(1)';
    element.style.zIndex = '';
  }
}

export function createSlideAnimation(
  element: HTMLElement,
  direction: 'left' | 'right' | 'top' | 'bottom',
  show: boolean,
  duration: number = 300
): void {
  const distance = 400;
  let initialTransform = '';
  let finalTransform = '';

  switch (direction) {
    case 'left':
      initialTransform = show ? `translateX(-${distance}px)` : 'translateX(0)';
      finalTransform = show ? 'translateX(0)' : `translateX(-${distance}px)`;
      break;
    case 'right':
      initialTransform = show ? `translateX(${distance}px)` : 'translateX(0)';
      finalTransform = show ? 'translateX(0)' : `translateX(${distance}px)`;
      break;
    case 'top':
      initialTransform = show ? `translateY(-${distance}px)` : 'translateY(0)';
      finalTransform = show ? 'translateY(0)' : `translateY(-${distance}px)`;
      break;
    case 'bottom':
      initialTransform = show ? `translateY(${distance}px)` : 'translateY(0)';
      finalTransform = show ? 'translateY(0)' : `translateY(${distance}px)`;
      break;
  }

  element.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
  element.style.transform = initialTransform;
  element.style.opacity = show ? '0' : '1';

  requestAnimationFrame(() => {
    element.style.transform = finalTransform;
    element.style.opacity = show ? '1' : '0';
  });
}
