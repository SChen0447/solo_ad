import { AudioManager } from './AudioManager';
import { EntityManager, PuppetType, PATH_WAYPOINTS } from './EntityManager';
import { UIController } from './ui/UIController';

export class GameManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private em: EntityManager;
  private audio: AudioManager;
  private ui: UIController;
  private keys: Set<string> = new Set();
  private mousePos: { x: number; y: number } | null = null;
  private lastTime: number = 0;
  private running: boolean = false;
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.audio = new AudioManager();
    this.audio.init();
    this.em = new EntityManager(this.audio);
    this.ui = new UIController(this.ctx, this.em);
    this.ui.updateShopPrices();
    this.setupInput();
  }

  private setupInput() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      this.keys.add(key);
      this.audio.resume();

      if (key === '1') this.em.puppeteer.selectedType = PuppetType.Melee;
      if (key === '2') this.em.puppeteer.selectedType = PuppetType.Ranged;
      if (key === '3') this.em.puppeteer.selectedType = PuppetType.Healer;
      if (key === 'e') this.em.shopOpen = !this.em.shopOpen;
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos = {
        x: (e.clientX - rect.left) * (1280 / rect.width),
        y: (e.clientY - rect.top) * (720 / rect.height),
      };
      this.ui.handleMouseMove(this.mousePos.x, this.mousePos.y);
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (1280 / rect.width);
      const my = (e.clientY - rect.top) * (720 / rect.height);

      this.audio.resume();

      if (this.em.gameOver) {
        this.restart();
        return;
      }

      if (this.ui.handleClick(mx, my)) return;

      if (my < 650) {
        this.em.summonPuppet(mx, my);
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private restart() {
    this.em = new EntityManager(this.audio);
    this.ui = new UIController(this.ctx, this.em);
    this.ui.updateShopPrices();
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.em.spawnWave();
    this.loop();
  }

  private loop = () => {
    if (!this.running) return;
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    dt = Math.min(dt, 0.05);
    this.time += dt;

    this.em.update(dt, this.keys, this.mousePos);
    this.ui.update(dt);
    this.render();

    requestAnimationFrame(this.loop);
  };

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 1280, 720);

    this.renderBackground();
    this.ui.render();
    this.renderPortal();
    this.renderCrystal();
    this.renderSummonCircles();
    this.renderPuppets();
    this.renderMonsters();
    this.renderProjectiles();
    this.renderPuppeteer();
    this.renderParticles();
    this.renderGoldCoins();
  }

  private renderBackground() {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, 720);
    grad.addColorStop(0, '#0d0a1a');
    grad.addColorStop(0.5, '#15102a');
    grad.addColorStop(1, '#0a0815');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    for (const p of this.em.getBackgroundParticles()) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    this.renderPathGlow();
  }

  private renderPathGlow() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(80, 50, 120, 0.2)';
    ctx.lineWidth = 45;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(PATH_WAYPOINTS[0].x, PATH_WAYPOINTS[0].y);
    for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
      ctx.lineTo(PATH_WAYPOINTS[i].x, PATH_WAYPOINTS[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(60, 35, 100, 0.15)';
    ctx.lineWidth = 60;
    ctx.beginPath();
    ctx.moveTo(PATH_WAYPOINTS[0].x, PATH_WAYPOINTS[0].y);
    for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
      ctx.lineTo(PATH_WAYPOINTS[i].x, PATH_WAYPOINTS[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private renderPortal() {
    const ctx = this.ctx;
    const portalX = PATH_WAYPOINTS[0].x;
    const portalY = PATH_WAYPOINTS[0].y;
    const pulse = Math.sin(this.time * 3) * 0.3 + 0.7;

    ctx.save();
    ctx.globalAlpha = 0.3 * pulse;
    const portalGrad = ctx.createRadialGradient(portalX, portalY, 5, portalX, portalY, 40);
    portalGrad.addColorStop(0, '#cc44ff');
    portalGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = portalGrad;
    ctx.beginPath();
    ctx.arc(portalX, portalY, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#9933cc';
    ctx.lineWidth = 3;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.ellipse(portalX, portalY, 25, 30, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#bb55ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(portalX, portalY, 18, 22, this.time * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#cc88ff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('传送门', portalX, portalY - 40);
    ctx.textAlign = 'left';
  }

  private renderCrystal() {
    const ctx = this.ctx;
    const c = this.em.crystal;
    const flash = c.flashTimer > 0 ? 0.5 + Math.sin(c.flashTimer * 20) * 0.3 : 0;

    ctx.save();
    if (flash > 0) {
      ctx.globalAlpha = flash;
      const flashGrad = ctx.createRadialGradient(c.x, c.y, 5, c.x, c.y, 50);
      flashGrad.addColorStop(0, '#ff4444');
      flashGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const crystalGlow = ctx.createRadialGradient(c.x, c.y, 5, c.x, c.y, 30);
    crystalGlow.addColorStop(0, 'rgba(100, 180, 255, 0.3)');
    crystalGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = crystalGlow;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#88ccff';
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - 22);
    ctx.lineTo(c.x + 12, c.y);
    ctx.lineTo(c.x, c.y + 22);
    ctx.lineTo(c.x - 12, c.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#aaeeff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - 22);
    ctx.lineTo(c.x + 12, c.y);
    ctx.lineTo(c.x, c.y + 22);
    ctx.lineTo(c.x - 12, c.y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    this.ui.renderHealthBar(c.x - 20, c.y + 28, 40, 5, c.hp, c.maxHp);
  }

  private renderSummonCircles() {
    const ctx = this.ctx;
    for (const sc of this.em.summonCircles) {
      const progress = sc.progress;
      const radius = progress * 35;
      const alpha = progress < 0.8 ? 0.8 : (1 - progress) * 4;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = sc.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.rotate(this.time * 3);
      const innerRadius = radius * 0.6;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i;
        const ix = sc.x + Math.cos(angle + this.time * 3) * innerRadius;
        const iy = sc.y + Math.sin(angle + this.time * 3) * innerRadius;
        ctx.moveTo(ix, iy);
        ctx.arc(ix, iy, 2, 0, Math.PI * 2);
      }
      ctx.fillStyle = sc.color;
      ctx.fill();

      ctx.globalAlpha = alpha * 0.3;
      const circleGrad = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, radius);
      circleGrad.addColorStop(0, sc.color);
      circleGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = circleGrad;
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderPuppets() {
    const ctx = this.ctx;
    for (const p of this.em.puppets) {
      if (!p.alive) continue;

      const summonScale = p.summonAnim > 0 ? 1 - p.summonAnim * 0.8 : 1;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(summonScale, summonScale);

      const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
      if (p.type === PuppetType.Melee) {
        bodyGrad.addColorStop(0, '#6abbff');
        bodyGrad.addColorStop(1, '#2a5eaa');
      } else if (p.type === PuppetType.Ranged) {
        bodyGrad.addColorStop(0, '#ffbb55');
        bodyGrad.addColorStop(1, '#aa6622');
      } else {
        bodyGrad.addColorStop(0, '#66ffaa');
        bodyGrad.addColorStop(1, '#228855');
      }

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      if (p.type === PuppetType.Melee) {
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#88ccff';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (p.slashAnim > 0) {
          ctx.strokeStyle = '#88ddff';
          ctx.lineWidth = 3;
          ctx.globalAlpha = p.slashAnim / 0.3;
          const slashAngle = p.facingAngle;
          ctx.beginPath();
          ctx.arc(0, 0, p.size + 10, slashAngle - 0.8, slashAngle + 0.8);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        const shieldAngle = p.facingAngle;
        ctx.fillStyle = 'rgba(100, 180, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, p.size + 5, shieldAngle - 0.5, shieldAngle + 0.5);
        ctx.lineTo(0, 0);
        ctx.fill();
      } else if (p.type === PuppetType.Ranged) {
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.8, p.size * 0.6);
        ctx.lineTo(-p.size * 0.8, p.size * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffcc66';
        ctx.lineWidth = 2;
        ctx.stroke();

        const bowAngle = p.facingAngle;
        ctx.strokeStyle = '#ffcc88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.size + 4, bowAngle - 0.4, bowAngle + 0.4);
        ctx.stroke();
      } else {
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
          const outerR = p.size;
          const innerR = p.size * 0.5;
          const midAngle = angle + Math.PI / 5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
          ctx.lineTo(Math.cos(midAngle) * innerR, Math.sin(midAngle) * innerR);
          ctx.lineTo(Math.cos(angle + Math.PI * 2 / 5) * outerR, Math.sin(angle + Math.PI * 2 / 5) * outerR);
          ctx.fillStyle = bodyGrad;
          ctx.fill();
        }
        ctx.strokeStyle = '#88ffbb';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, p.size + 3 + Math.sin(this.time * 4) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(Math.cos(p.facingAngle) * 5, Math.sin(p.facingAngle) * 5 - 2, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      const shake = p.hp < p.maxHp * 0.3;
      this.ui.renderHealthBar(p.x - 18, p.y - p.size - 10, 36, 4, p.hp, p.maxHp, shake);
      this.ui.renderPuppetLevel(p);
    }
  }

  private renderMonsters() {
    const ctx = this.ctx;
    for (const m of this.em.monsters) {
      if (!m.alive) continue;

      ctx.save();
      ctx.translate(m.x, m.y);

      if (m.hitFlash > 0) {
        ctx.globalAlpha = 0.7 + Math.sin(m.hitFlash * 30) * 0.3;
      }

      const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, m.size);
      if (m.type === 'normal') {
        bodyGrad.addColorStop(0, '#ee5555');
        bodyGrad.addColorStop(1, '#881111');
      } else if (m.type === 'fast') {
        bodyGrad.addColorStop(0, '#ffdd44');
        bodyGrad.addColorStop(1, '#aa8800');
      } else {
        bodyGrad.addColorStop(0, '#aa3333');
        bodyGrad.addColorStop(1, '#551111');
      }

      ctx.fillStyle = bodyGrad;
      if (m.type === 'fast') {
        ctx.beginPath();
        ctx.moveTo(Math.cos(m.facingAngle) * m.size, Math.sin(m.facingAngle) * m.size);
        ctx.lineTo(Math.cos(m.facingAngle + 2.4) * m.size, Math.sin(m.facingAngle + 2.4) * m.size);
        ctx.lineTo(Math.cos(m.facingAngle - 2.4) * m.size, Math.sin(m.facingAngle - 2.4) * m.size);
        ctx.closePath();
        ctx.fill();
      } else if (m.type === 'giant') {
        ctx.fillRect(-m.size, -m.size, m.size * 2, m.size * 2);
        ctx.strokeStyle = '#cc4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(-m.size, -m.size, m.size * 2, m.size * 2);
        ctx.fillStyle = '#ffcccc';
        ctx.fillRect(-m.size * 0.3, -m.size * 0.3, m.size * 0.2, m.size * 0.2);
        ctx.fillRect(m.size * 0.1, -m.size * 0.3, m.size * 0.2, m.size * 0.2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, m.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (m.hitFlash > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, m.size, 0, Math.PI * 2);
        ctx.fill();
      }

      const eyeAngle = m.facingAngle;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(Math.cos(eyeAngle) * m.size * 0.3 - 3, Math.sin(eyeAngle) * m.size * 0.3 - 2, m.size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(Math.cos(eyeAngle) * m.size * 0.3 + 3, Math.sin(eyeAngle) * m.size * 0.3 - 2, m.size * 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = m.type === 'fast' ? '#440000' : '#220000';
      ctx.beginPath();
      ctx.arc(Math.cos(eyeAngle) * m.size * 0.35 - 3, Math.sin(eyeAngle) * m.size * 0.3 - 2, m.size * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(Math.cos(eyeAngle) * m.size * 0.35 + 3, Math.sin(eyeAngle) * m.size * 0.3 - 2, m.size * 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      const barWidth = m.type === 'giant' ? 50 : 30;
      this.ui.renderHealthBar(m.x - barWidth / 2, m.y - m.size - 12, barWidth, 4, m.hp, m.maxHp, true);
    }
  }

  private renderProjectiles() {
    const ctx = this.ctx;
    for (const proj of this.em.projectiles) {
      ctx.save();
      const glowGrad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 8);
      glowGrad.addColorStop(0, '#ffcc44');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffdd66';
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderPuppeteer() {
    const ctx = this.ctx;
    const p = this.em.puppeteer;

    for (const pt of p.trailParticles) {
      ctx.save();
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(p.x, p.y);

    const glowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 40);
    glowGrad.addColorStop(0, 'rgba(150, 100, 255, 0.15)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fill();

    const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
    bodyGrad.addColorStop(0, '#bb88ff');
    bodyGrad.addColorStop(1, '#6633aa');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ddaaff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ddaaff';
    ctx.beginPath();
    ctx.arc(0, -4, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4400aa';
    ctx.beginPath();
    ctx.arc(-2, -5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2, -5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    const cloakWave = Math.sin(this.time * 3) * 0.1;
    ctx.fillStyle = 'rgba(80, 40, 140, 0.8)';
    ctx.beginPath();
    ctx.moveTo(-12, 8);
    ctx.quadraticCurveTo(-8, 22 + cloakWave * 10, -14, 26);
    ctx.lineTo(14, 26);
    ctx.quadraticCurveTo(8, 22 - cloakWave * 10, 12, 8);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffdd44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -10, 6, Math.PI * 0.8, Math.PI * 0.2);
    ctx.stroke();
    ctx.fillStyle = '#ffdd44';
    ctx.beginPath();
    ctx.moveTo(4, -12);
    ctx.lineTo(6, -16);
    ctx.lineTo(2, -13);
    ctx.fill();
    ctx.restore();

    const typeColors: Record<PuppetType, string> = {
      [PuppetType.Melee]: '#4a9eff',
      [PuppetType.Ranged]: '#ff9944',
      [PuppetType.Healer]: '#44ff88',
    };
    ctx.strokeStyle = typeColors[p.selectedType];
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4 + Math.sin(this.time * 4) * 0.2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private renderParticles() {
    const ctx = this.ctx;
    for (const pt of this.em.particles) {
      ctx.save();
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderGoldCoins() {
    const ctx = this.ctx;
    for (const gc of this.em.goldCoins) {
      ctx.save();
      const glow = ctx.createRadialGradient(gc.x, gc.y, 0, gc.x, gc.y, 6);
      glow.addColorStop(0, '#ffee44');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(gc.x, gc.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffcc22';
      ctx.beginPath();
      ctx.arc(gc.x, gc.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  stop() {
    this.running = false;
  }
}
