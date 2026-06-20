export interface SceneElement {
  type: 'tree' | 'house' | 'castle' | 'tower' | 'river' | 'mountain' | 'grass' | 'cloud' | 'sun' | 'moon' | 'star';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  variant?: number;
}

export interface WeatherEffect {
  type: 'rain' | 'snow' | 'sunbeam' | 'none';
  intensity: number;
}

export interface SceneData {
  elements: SceneElement[];
  weather: WeatherEffect;
  timeOfDay: 'day' | 'sunset' | 'night';
  backgroundColor: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export class SceneRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private particles: Particle[] = [];
  private animationFrameId: number | null = null;
  private currentScene: SceneData | null = null;
  private transitionProgress: number = 1;
  private targetScene: SceneData | null = null;
  private pixelSize: number = 2;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx.imageSmoothingEnabled = false;
  }

  private drawPixel(x: number, y: number, color: string, size: number = this.pixelSize): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      Math.floor(x / size) * size,
      Math.floor(y / size) * size,
      size,
      size
    );
  }

  private drawPixelRect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    const size = this.pixelSize;
    for (let py = 0; py < h; py += size) {
      for (let px = 0; px < w; px += size) {
        this.ctx.fillRect(x + px, y + py, size, size);
      }
    }
  }

  drawTree(x: number, y: number, width: number, height: number, variant: number = 0): void {
    const trunkWidth = width * 0.2;
    const trunkHeight = height * 0.4;
    const trunkX = x + (width - trunkWidth) / 2;
    const trunkY = y + height - trunkHeight;

    const trunkColors = ['#8B4513', '#654321', '#A0522D'];
    const trunkColor = trunkColors[variant % trunkColors.length];
    this.drawPixelRect(trunkX, trunkY, trunkWidth, trunkHeight, trunkColor);

    const foliageColors = [
      ['#228B22', '#32CD32', '#006400'],
      ['#2E8B57', '#3CB371', '#006400'],
      ['#808080', '#A9A9A9', '#696969'],
    ];
    const colors = foliageColors[variant % foliageColors.length];

    const foliageHeight = height - trunkHeight;
    const foliageWidth = width;
    const layers = 4;

    for (let i = 0; i < layers; i++) {
      const layerWidth = foliageWidth * (1 - i * 0.2);
      const layerHeight = foliageHeight / layers;
      const layerX = x + (foliageWidth - layerWidth) / 2;
      const layerY = y + i * layerHeight;
      const color = colors[i % colors.length];

      this.drawPixelRect(layerX, layerY, layerWidth, layerHeight, color);

      for (let j = 0; j < 3; j++) {
        const highlightX = layerX + Math.random() * (layerWidth - this.pixelSize);
        const highlightY = layerY + Math.random() * (layerHeight - this.pixelSize);
        this.drawPixel(highlightX, highlightY, 'rgba(255,255,255,0.3)');
      }
    }
  }

  drawHouse(x: number, y: number, width: number, height: number, variant: number = 0): void {
    const bodyHeight = height * 0.6;
    const roofHeight = height * 0.4;
    const bodyY = y + roofHeight;

    const wallColors = [
      ['#DEB887', '#D2691E', '#8B4513'],
      ['#F5F5DC', '#8B7355', '#6B4423'],
      ['#B0C4DE', '#4682B4', '#1E3A5F'],
    ];
    const colors = wallColors[variant % wallColors.length];

    this.drawPixelRect(x, bodyY, width, bodyHeight, colors[0]);

    for (let i = 0; i < width; i += this.pixelSize) {
      const brickY = bodyY + Math.floor((i / this.pixelSize) % 2) * (this.pixelSize * 2);
      for (let j = brickY; j < bodyY + bodyHeight; j += this.pixelSize * 4) {
        this.drawPixel(x + i, j, colors[1], this.pixelSize);
      }
    }

    const roofColor = colors[2];
    for (let i = 0; i < roofHeight; i += this.pixelSize) {
      const rowWidth = width - i * (width / roofHeight);
      const rowX = x + (width - rowWidth) / 2;
      this.drawPixelRect(rowX, y + i, rowWidth, this.pixelSize, roofColor);
    }

    const doorWidth = width * 0.25;
    const doorHeight = bodyHeight * 0.5;
    const doorX = x + (width - doorWidth) / 2;
    const doorY = y + height - doorHeight;
    this.drawPixelRect(doorX, doorY, doorWidth, doorHeight, '#4A2511');
    this.drawPixel(doorX + doorWidth - this.pixelSize * 3, doorY + doorHeight / 2, '#FFD700');

    const windowSize = width * 0.15;
    const windowY = bodyY + bodyHeight * 0.2;
    this.drawPixelRect(x + width * 0.15, windowY, windowSize, windowSize, '#87CEEB');
    this.drawPixelRect(x + width * 0.7, windowY, windowSize, windowSize, '#87CEEB');
  }

  drawCastle(x: number, y: number, width: number, height: number): void {
    const stoneColor = '#708090';
    const darkStone = '#4A5568';
    const lightStone = '#A0AEC0';

    const mainHeight = height * 0.7;
    const mainY = y + height - mainHeight;
    this.drawPixelRect(x, mainY, width, mainHeight, stoneColor);

    for (let i = 0; i < width; i += this.pixelSize * 4) {
      for (let j = 0; j < mainHeight; j += this.pixelSize * 4) {
        if ((i + j) % (this.pixelSize * 8) === 0) {
          this.drawPixel(x + i, mainY + j, darkStone);
        }
      }
    }

    const towerWidth = width * 0.2;
    const towerHeight = height;
    this.drawPixelRect(x, y, towerWidth, towerHeight, stoneColor);
    this.drawPixelRect(x + width - towerWidth, y, towerWidth, towerHeight, stoneColor);

    const battlementsHeight = this.pixelSize * 4;
    for (let i = 0; i < towerWidth; i += this.pixelSize * 4) {
      this.drawPixelRect(x + i, y, this.pixelSize * 2, battlementsHeight, lightStone);
      this.drawPixelRect(x + width - towerWidth + i, y, this.pixelSize * 2, battlementsHeight, lightStone);
    }

    const gateWidth = width * 0.3;
    const gateHeight = mainHeight * 0.5;
    const gateX = x + (width - gateWidth) / 2;
    const gateY = y + height - gateHeight;
    
    for (let i = 0; i < gateWidth; i += this.pixelSize) {
      const archHeight = gateHeight - Math.sin((i / gateWidth) * Math.PI) * gateHeight * 0.3;
      this.drawPixelRect(gateX + i, gateY + (gateHeight - archHeight), this.pixelSize, archHeight, '#2D3748');
    }

    const windowWidth = towerWidth * 0.4;
    const windowHeight = towerHeight * 0.15;
    this.drawPixelRect(x + (towerWidth - windowWidth) / 2, y + towerHeight * 0.3, windowWidth, windowHeight, '#FCD34D');
    this.drawPixelRect(x + width - towerWidth + (towerWidth - windowWidth) / 2, y + towerHeight * 0.3, windowWidth, windowHeight, '#FCD34D');

    const flagHeight = height * 0.15;
    const flagX = x + width / 2 - this.pixelSize;
    this.drawPixelRect(flagX, y - flagHeight, this.pixelSize, flagHeight, '#718096');
    this.drawPixelRect(flagX + this.pixelSize, y - flagHeight + this.pixelSize * 2, this.pixelSize * 6, this.pixelSize * 4, '#E53E3E');
  }

  drawTower(x: number, y: number, width: number, height: number): void {
    const stoneColor = '#8B7355';
    const roofColor = '#4A2511';

    const bodyHeight = height * 0.75;
    const bodyY = y + height - bodyHeight;
    this.drawPixelRect(x, bodyY, width, bodyHeight, stoneColor);

    for (let i = 0; i < width; i += this.pixelSize * 2) {
      for (let j = 0; j < bodyHeight; j += this.pixelSize * 2) {
        if (Math.random() > 0.7) {
          this.drawPixel(x + i, bodyY + j, '#6B4423');
        }
      }
    }

    const roofHeight = height * 0.25;
    for (let i = 0; i < roofHeight; i += this.pixelSize) {
      const rowWidth = width - i * (width / roofHeight);
      const rowX = x + (width - rowWidth) / 2;
      this.drawPixelRect(rowX, y + i, rowWidth, this.pixelSize, roofColor);
    }

    const windowWidth = width * 0.3;
    const windowHeight = bodyHeight * 0.12;
    for (let i = 0; i < 3; i++) {
      const windowY = bodyY + bodyHeight * (0.2 + i * 0.25);
      this.drawPixelRect(x + (width - windowWidth) / 2, windowY, windowWidth, windowHeight, '#FCD34D');
    }
  }

  drawRiver(x: number, y: number, width: number, height: number): void {
    const waterColors = ['#1E90FF', '#4169E1', '#00BFFF', '#6495ED'];

    this.drawPixelRect(x, y, width, height, waterColors[0]);

    for (let i = 0; i < width; i += this.pixelSize) {
      for (let j = 0; j < height; j += this.pixelSize) {
        const waveOffset = Math.sin((i + j) * 0.1 + Date.now() * 0.002) * this.pixelSize;
        if (Math.random() > 0.6) {
          const colorIndex = Math.floor(Math.random() * waterColors.length);
          this.drawPixel(x + i, y + j + waveOffset, waterColors[colorIndex]);
        }
      }
    }

    for (let i = 0; i < 10; i++) {
      const sparkleX = x + Math.random() * width;
      const sparkleY = y + Math.random() * height;
      this.drawPixel(sparkleX, sparkleY, 'rgba(255,255,255,0.8)');
    }
  }

  drawMountain(x: number, y: number, width: number, height: number, variant: number = 0): void {
    const mountainColors = [
      ['#4A5568', '#2D3748', '#718096'],
      ['#6B7280', '#374151', '#9CA3AF'],
      ['#5D4E37', '#3D2914', '#8B7355'],
    ];
    const colors = mountainColors[variant % mountainColors.length];

    for (let i = 0; i < height; i += this.pixelSize) {
      const progress = i / height;
      const rowWidth = width * (1 - progress * 0.7);
      const rowX = x + (width - rowWidth) / 2;
      const color = progress < 0.3 ? colors[2] : progress < 0.7 ? colors[0] : colors[1];
      this.drawPixelRect(rowX, y + height - i, rowWidth, this.pixelSize, color);

      if (progress > 0.7) {
        const snowWidth = rowWidth * 0.6;
        const snowX = x + (width - snowWidth) / 2;
        this.drawPixelRect(snowX, y + height - i, snowWidth, this.pixelSize, '#FFFFFF');
      }
    }
  }

  drawGrass(x: number, y: number, width: number, height: number): void {
    const grassColors = ['#228B22', '#32CD32', '#006400', '#90EE90'];

    for (let i = 0; i < width; i += this.pixelSize) {
      for (let j = 0; j < height; j += this.pixelSize) {
        const colorIndex = Math.floor(Math.random() * grassColors.length);
        this.drawPixel(x + i, y + j, grassColors[colorIndex]);
      }
    }

    for (let i = 0; i < width; i += this.pixelSize * 3) {
      const bladeHeight = this.pixelSize * (2 + Math.floor(Math.random() * 3));
      const bladeX = x + i;
      const bladeY = y - bladeHeight;
      for (let j = 0; j < bladeHeight; j += this.pixelSize) {
        this.drawPixel(bladeX, bladeY + j, '#228B22');
      }
    }
  }

  drawCloud(x: number, y: number, width: number, height: number): void {
    const cloudColor = 'rgba(255, 255, 255, 0.9)';
    const segments = Math.floor(width / (height * 0.4));

    for (let i = 0; i < segments; i++) {
      const segWidth = height * (0.6 + Math.random() * 0.4);
      const segHeight = height * (0.7 + Math.random() * 0.3);
      const segX = x + i * (width / segments) + (i === 0 ? 0 : Math.random() * 10);
      const segY = y + Math.random() * (height - segHeight);
      this.drawPixelRect(segX, segY, segWidth, segHeight, cloudColor);
    }
  }

  drawSun(x: number, y: number, width: number, height: number): void {
    const radius = Math.min(width, height) / 2;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    for (let i = -radius; i <= radius; i += this.pixelSize) {
      for (let j = -radius; j <= radius; j += this.pixelSize) {
        const dist = Math.sqrt(i * i + j * j);
        if (dist <= radius) {
          const color = dist < radius * 0.7 ? '#FFD700' : '#FFA500';
          this.drawPixel(centerX + i, centerY + j, color);
        }
      }
    }

    const beamLength = radius * 1.5;
    for (let angle = 0; angle < 360; angle += 45) {
      const rad = (angle * Math.PI) / 180;
      for (let i = radius; i < beamLength; i += this.pixelSize) {
        const bx = centerX + Math.cos(rad) * i;
        const by = centerY + Math.sin(rad) * i;
        this.drawPixel(bx, by, 'rgba(255, 215, 0, 0.5)');
      }
    }
  }

  drawMoon(x: number, y: number, width: number, height: number): void {
    const radius = Math.min(width, height) / 2;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    for (let i = -radius; i <= radius; i += this.pixelSize) {
      for (let j = -radius; j <= radius; j += this.pixelSize) {
        const dist = Math.sqrt(i * i + j * j);
        if (dist <= radius) {
          const shadowDist = Math.sqrt((i + radius * 0.3) * (i + radius * 0.3) + j * j);
          if (shadowDist > radius * 0.8) {
            this.drawPixel(centerX + i, centerY + j, '#F0E68C');
          } else if (dist < radius * 0.9) {
            this.drawPixel(centerX + i, centerY + j, '#2C3E50');
          }
        }
      }
    }

    for (let k = 0; k < 5; k++) {
      const craterX = centerX + (Math.random() - 0.5) * radius;
      const craterY = centerY + (Math.random() - 0.5) * radius;
      const craterSize = this.pixelSize * (2 + Math.floor(Math.random() * 3));
      this.drawPixel(craterX, craterY, '#D4AF37', craterSize);
    }
  }

  drawStar(x: number, y: number, size: number = this.pixelSize * 2): void {
    const twinkle = Math.sin(Date.now() * 0.01 + x * 0.1) * 0.3 + 0.7;
    this.drawPixel(x, y, `rgba(255, 255, 255, ${twinkle})`, size);
    
    if (Math.random() > 0.95) {
      this.drawPixel(x - size, y, `rgba(255, 255, 200, ${twinkle * 0.5})`, size);
      this.drawPixel(x + size, y, `rgba(255, 255, 200, ${twinkle * 0.5})`, size);
      this.drawPixel(x, y - size, `rgba(255, 255, 200, ${twinkle * 0.5})`, size);
      this.drawPixel(x, y + size, `rgba(255, 255, 200, ${twinkle * 0.5})`, size);
    }
  }

  private initWeatherParticles(weather: WeatherEffect): void {
    this.particles = [];
    const count = Math.floor(weather.intensity * 100);

    if (weather.type === 'rain') {
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          vx: -1 + Math.random() * 2,
          vy: 8 + Math.random() * 6,
          size: this.pixelSize,
          opacity: 0.6 + Math.random() * 0.4,
          life: 1,
          maxLife: 1,
        });
      }
    } else if (weather.type === 'snow') {
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          vx: -0.5 + Math.random(),
          vy: 1 + Math.random() * 2,
          size: this.pixelSize * (1 + Math.floor(Math.random() * 2)),
          opacity: 0.7 + Math.random() * 0.3,
          life: 1,
          maxLife: 1,
        });
      }
    }
  }

  private updateWeatherParticles(): void {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.y > this.height) {
        p.y = -10;
        p.x = Math.random() * this.width;
      }
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
    }
  }

  private drawWeather(): void {
    for (const p of this.particles) {
      if (p.size > this.pixelSize) {
        this.drawPixel(p.x, p.y, `rgba(255, 255, 255, ${p.opacity})`, p.size);
        this.drawPixel(p.x + this.pixelSize, p.y, `rgba(255, 255, 255, ${p.opacity * 0.5})`, p.size);
        this.drawPixel(p.x, p.y + this.pixelSize, `rgba(255, 255, 255, ${p.opacity * 0.5})`, p.size);
      } else {
        this.drawPixel(p.x, p.y, `rgba(174, 194, 224, ${p.opacity})`, p.size);
        if (p.vy > 5) {
          this.drawPixel(p.x, p.y - this.pixelSize, `rgba(174, 194, 224, ${p.opacity * 0.5})`, p.size);
        }
      }
    }
  }

  private drawSunbeam(): void {
    const centerX = this.width * 0.8;
    const centerY = this.height * 0.15;

    for (let i = 0; i < 5; i++) {
      const angle = -60 + i * 30;
      const rad = (angle * Math.PI) / 180;
      const length = this.height * 0.8;
      const width = this.pixelSize * (4 + i * 2);

      for (let j = 0; j < length; j += this.pixelSize) {
        const x = centerX + Math.cos(rad) * j;
        const y = centerY + Math.sin(rad) * j;
        const alpha = 0.3 * (1 - j / length);
        this.drawPixelRect(x - width / 2, y, width, this.pixelSize * 2, `rgba(255, 248, 220, ${alpha})`);
      }
    }
  }

  private drawSky(scene: SceneData): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height * 0.6);

    if (scene.timeOfDay === 'day') {
      gradient.addColorStop(0, '#87CEEB');
      gradient.addColorStop(0.5, '#B0E0E6');
      gradient.addColorStop(1, '#E0F7FA');
    } else if (scene.timeOfDay === 'sunset') {
      gradient.addColorStop(0, '#1a1a3e');
      gradient.addColorStop(0.3, '#FF6B6B');
      gradient.addColorStop(0.6, '#FFA07A');
      gradient.addColorStop(1, '#FFD93D');
    } else {
      gradient.addColorStop(0, '#0a0a1a');
      gradient.addColorStop(0.5, '#1a1a3e');
      gradient.addColorStop(1, '#2a2a4e');
    }

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height * 0.6);

    if (scene.timeOfDay === 'night') {
      for (let i = 0; i < 50; i++) {
        const starX = Math.random() * this.width;
        const starY = Math.random() * this.height * 0.5;
        this.drawStar(starX, starY);
      }
    }
  }

  render(scene: SceneData): void {
    if (!this.currentScene) {
      this.currentScene = scene;
      this.targetScene = scene;
      this.initWeatherParticles(scene.weather);
    } else if (this.targetScene !== scene) {
      this.targetScene = scene;
      this.transitionProgress = 0;
      this.initWeatherParticles(scene.weather);
    }

    this.drawScene(this.currentScene, 1 - this.transitionProgress);
    
    if (this.transitionProgress > 0 && this.targetScene) {
      this.drawScene(this.targetScene, this.transitionProgress);
    }

    this.updateWeatherParticles();
    this.drawWeather();

    if (this.targetScene?.weather.type === 'sunbeam' || this.currentScene?.weather.type === 'sunbeam') {
      this.drawSunbeam();
    }

    if (this.transitionProgress < 1) {
      this.transitionProgress += 0.02;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.currentScene = this.targetScene;
      }
    }
  }

  private drawScene(scene: SceneData, alpha: number): void {
    if (alpha <= 0) return;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    this.drawSky(scene);

    const groundY = this.height * 0.55;
    const groundGradient = this.ctx.createLinearGradient(0, groundY, 0, this.height);
    groundGradient.addColorStop(0, '#228B22');
    groundGradient.addColorStop(0.3, '#2E8B57');
    groundGradient.addColorStop(1, '#006400');
    this.ctx.fillStyle = groundGradient;
    this.ctx.fillRect(0, groundY, this.width, this.height - groundY);

    const sortedElements = [...scene.elements].sort((a, b) => a.y - b.y);

    for (const element of sortedElements) {
      switch (element.type) {
        case 'mountain':
          this.drawMountain(element.x, element.y, element.width, element.height, element.variant);
          break;
        case 'cloud':
          this.drawCloud(element.x, element.y, element.width, element.height);
          break;
        case 'sun':
          this.drawSun(element.x, element.y, element.width, element.height);
          break;
        case 'moon':
          this.drawMoon(element.x, element.y, element.width, element.height);
          break;
        case 'river':
          this.drawRiver(element.x, element.y, element.width, element.height);
          break;
        case 'grass':
          this.drawGrass(element.x, element.y, element.width, element.height);
          break;
        case 'tree':
          this.drawTree(element.x, element.y, element.width, element.height, element.variant);
          break;
        case 'house':
          this.drawHouse(element.x, element.y, element.width, element.height, element.variant);
          break;
        case 'castle':
          this.drawCastle(element.x, element.y, element.width, element.height);
          break;
        case 'tower':
          this.drawTower(element.x, element.y, element.width, element.height);
          break;
      }
    }

    this.ctx.restore();
  }

  startAnimation(): void {
    const animate = () => {
      if (this.currentScene) {
        this.render(this.currentScene);
      }
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  stopAnimation(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  setScene(scene: SceneData): void {
    if (!this.currentScene) {
      this.currentScene = scene;
      this.targetScene = scene;
    } else {
      this.targetScene = scene;
      this.transitionProgress = 0;
    }
    this.initWeatherParticles(scene.weather);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.ctx.imageSmoothingEnabled = false;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
