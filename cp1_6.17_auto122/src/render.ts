import type { Sun, Planet, Asteroid, Vector2 } from './simulation';

export interface RenderState {
  sun: Sun;
  planets: Planet[];
  asteroids: Asteroid[];
  selectedPlanetId: string | null;
  selectedAsteroidId: string | null;
  getPlanetOrbitPoints: (planet: Planet) => Vector2[];
  getInfluenceRadius: (planet: Planet) => number;
  isInPlanetInfluence: (asteroid: Asteroid, planet: Planet) => boolean;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public render(state: RenderState): void {
    this.clear();
    this.drawBackground();
    this.drawStars();
    this.drawOrbits(state);
    this.drawInfluenceRanges(state);
    this.drawSun(state.sun);
    this.drawPlanets(state);
    this.drawAsteroids(state);
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(
      0, 0, 0, this.canvas.height
    );
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#000000');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawStars(): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    const starCount = 100;
    for (let i = 0; i < starCount; i++) {
      const x = ((i * 137.5) % this.canvas.width);
      const y = ((i * 73.3) % this.canvas.height);
      const size = (i % 3) * 0.5 + 0.5;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawOrbits(state: RenderState): void {
    for (const planet of state.planets) {
      const points = state.getPlanetOrbitPoints(planet);
      this.drawDashedEllipse(points, planet === this.getSelectedPlanet(state));
    }
  }

  private getSelectedPlanet(state: RenderState): Planet | null {
    return state.planets.find(p => p.id === state.selectedPlanetId) || null;
  }

  private drawDashedEllipse(points: Vector2[], isSelected: boolean): void {
    if (points.length < 2) return;

    this.ctx.save();
    this.ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = isSelected ? 1.5 : 1;
    this.ctx.setLineDash([5, 5]);

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawInfluenceRanges(state: RenderState): void {
    for (const planet of state.planets) {
      const hasAsteroidInRange = state.asteroids.some(a =>
        state.isInPlanetInfluence(a, planet)
      );

      if (hasAsteroidInRange || planet.id === state.selectedPlanetId) {
        const radius = state.getInfluenceRadius(planet);
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)';
        this.ctx.fillStyle = 'rgba(255, 100, 100, 0.05)';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(planet.position.x, planet.position.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
      }
    }
  }

  private drawSun(sun: Sun): void {
    const { x, y } = sun.position;

    this.ctx.save();

    const glowGradient = this.ctx.createRadialGradient(x, y, 0, x, y, sun.radius * 2);
    glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
    glowGradient.addColorStop(0.4, 'rgba(255, 165, 0, 0.4)');
    glowGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, sun.radius * 2, 0, Math.PI * 2);
    this.ctx.fill();

    const coreGradient = this.ctx.createRadialGradient(x, y, 0, x, y, sun.radius);
    coreGradient.addColorStop(0, '#FFFFFF');
    coreGradient.addColorStop(0.3, '#FFEB3B');
    coreGradient.addColorStop(0.7, '#FFC107');
    coreGradient.addColorStop(1, '#FF9800');
    this.ctx.fillStyle = coreGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, sun.radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawPlanets(state: RenderState): void {
    const sortedPlanets = [...state.planets].sort((a, b) =>
      a.position.y - b.position.y
    );

    for (const planet of sortedPlanets) {
      this.drawPlanetTrail(planet);
      
      if (planet.hasRings && planet.position.y > state.sun.position.y) {
        this.drawPlanetRings(planet);
      }

      this.drawPlanet(planet, planet.id === state.selectedPlanetId);

      if (planet.hasRings && planet.position.y <= state.sun.position.y) {
        this.drawPlanetRings(planet);
      }
    }
  }

  private drawPlanetTrail(planet: Planet): void {
    if (planet.trail.length < 2) return;

    this.ctx.save();
    for (let i = planet.trail.length - 1; i >= 1; i--) {
      const alpha = (1 - i / planet.trail.length) * 0.5;
      const size = planet.radius * (1 - i / planet.trail.length) * 0.6;
      
      this.ctx.fillStyle = planet.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      this.ctx.beginPath();
      this.ctx.arc(planet.trail[i].x, planet.trail[i].y, Math.max(size, 1), 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private drawPlanet(planet: Planet, isSelected: boolean): void {
    const { x, y } = planet.position;

    this.ctx.save();

    const glowRadius = planet.radius * 1.8;
    const glowGradient = this.ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
    glowGradient.addColorStop(0, planet.color + '80');
    glowGradient.addColorStop(1, planet.color + '00');
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    this.ctx.fill();

    const bodyGradient = this.ctx.createRadialGradient(
      x - planet.radius * 0.3, y - planet.radius * 0.3, 0,
      x, y, planet.radius
    );
    bodyGradient.addColorStop(0, this.lightenColor(planet.color, 40));
    bodyGradient.addColorStop(1, this.darkenColor(planet.color, 30));
    this.ctx.fillStyle = bodyGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, planet.radius, 0, Math.PI * 2);
    this.ctx.fill();

    if (planet.hasStripes) {
      this.drawPlanetStripes(planet);
    }

    if (isSelected) {
      this.ctx.strokeStyle = '#FFD700';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 4]);
      this.ctx.beginPath();
      this.ctx.arc(x, y, planet.radius + 8, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawPlanetStripes(planet: Planet): void {
    const { x, y } = planet.position;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(x, y, planet.radius, 0, Math.PI * 2);
    this.ctx.clip();

    const stripeCount = 4;
    const stripeHeight = (planet.radius * 2) / (stripeCount * 2 + 1);
    
    for (let i = 0; i < stripeCount; i++) {
      const stripeY = y - planet.radius + stripeHeight * (i * 2 + 1);
      this.ctx.fillStyle = this.darkenColor(planet.color, 20) + '80';
      this.ctx.fillRect(x - planet.radius, stripeY, planet.radius * 2, stripeHeight * 0.7);
    }

    this.ctx.restore();
  }

  private drawPlanetRings(planet: Planet): void {
    const { x, y } = planet.position;

    this.ctx.save();
    
    this.ctx.translate(x, y);
    this.ctx.rotate(-0.3);
    this.ctx.scale(1, 0.3);

    const ringOuter = planet.radius * 2.2;
    const ringInner = planet.radius * 1.4;

    const ringGradient = this.ctx.createRadialGradient(0, 0, ringInner, 0, 0, ringOuter);
    ringGradient.addColorStop(0, 'rgba(244, 213, 158, 0.1)');
    ringGradient.addColorStop(0.3, 'rgba(244, 213, 158, 0.5)');
    ringGradient.addColorStop(0.6, 'rgba(210, 180, 140, 0.4)');
    ringGradient.addColorStop(1, 'rgba(244, 213, 158, 0.1)');

    this.ctx.fillStyle = ringGradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, ringOuter, 0, Math.PI * 2);
    this.ctx.arc(0, 0, ringInner, 0, Math.PI * 2, true);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(210, 180, 140, 0.3)';
    this.ctx.lineWidth = 1;
    for (let r = ringInner + 2; r < ringOuter; r += 4) {
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawAsteroids(state: RenderState): void {
    for (const asteroid of state.asteroids) {
      this.drawAsteroidTrail(asteroid);
      this.drawAsteroid(asteroid, asteroid.id === state.selectedAsteroidId);
    }
  }

  private drawAsteroidTrail(asteroid: Asteroid): void {
    if (asteroid.trail.length < 2) return;

    this.ctx.save();
    for (let i = asteroid.trail.length - 1; i >= 1; i--) {
      const alpha = (1 - i / asteroid.trail.length) * 0.6;
      const size = asteroid.radius * (1 - i / asteroid.trail.length) * 0.5;
      
      this.ctx.fillStyle = `rgba(76, 175, 80, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(asteroid.trail[i].x, asteroid.trail[i].y, Math.max(size, 1), 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private drawAsteroid(asteroid: Asteroid, isSelected: boolean): void {
    const { x, y } = asteroid.position;

    this.ctx.save();

    if (isSelected) {
      const glowGradient = this.ctx.createRadialGradient(x, y, 0, x, y, asteroid.radius * 3);
      glowGradient.addColorStop(0, 'rgba(76, 175, 80, 0.5)');
      glowGradient.addColorStop(1, 'rgba(76, 175, 80, 0)');
      this.ctx.fillStyle = glowGradient;
      this.ctx.beginPath();
      this.ctx.arc(x, y, asteroid.radius * 3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = asteroid.color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, asteroid.radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = this.lightenColor(asteroid.color, 30);
    this.ctx.beginPath();
    this.ctx.arc(x - asteroid.radius * 0.3, y - asteroid.radius * 0.3, asteroid.radius * 0.3, 0, Math.PI * 2);
    this.ctx.fill();

    if (isSelected) {
      this.ctx.strokeStyle = '#FFD700';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([3, 3]);
      this.ctx.beginPath();
      this.ctx.arc(x, y, asteroid.radius + 6, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }
}
