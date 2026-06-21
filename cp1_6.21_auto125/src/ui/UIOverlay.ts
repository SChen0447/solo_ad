import Phaser from 'phaser';
import { GravityManager, PlanetData, PLANETS } from '../physics/GravityManager';

export interface PlanetSwitchCallback {
  (planetId: string): void;
}

export class UIOverlay {
  private scene: Phaser.Scene;
  private gravityManager: GravityManager;
  private hudContainer: Phaser.GameObjects.Container;
  private buttonsContainer: Phaser.GameObjects.Container;
  private planetNameText!: Phaser.GameObjects.Text;
  private gravityText!: Phaser.GameObjects.Text;
  private fpsText!: Phaser.GameObjects.Text;
  private hudBg!: Phaser.GameObjects.Graphics;
  private planetButtons: Map<string, {
    btn: Phaser.GameObjects.Container;
    icon: Phaser.GameObjects.Graphics;
    halo: Phaser.GameObjects.Arc;
    label: Phaser.GameObjects.Text;
  }> = new Map();
  private onPlanetSwitch: PlanetSwitchCallback | null = null;
  private selectedPlanetId: string = 'earth';
  private pulseTime: number = 0;
  private lastFpsUpdate: number = 0;
  private frameCount: number = 0;

  constructor(scene: Phaser.Scene, gravityManager: GravityManager) {
    this.scene = scene;
    this.gravityManager = gravityManager;
    this.hudContainer = scene.add.container(0, 0);
    this.buttonsContainer = scene.add.container(0, 0);
    this.hudContainer.setDepth(1000);
    this.buttonsContainer.setDepth(1000);
    this.selectedPlanetId = gravityManager.getCurrentPlanet().id;

    this.createHUD();
    this.createPlanetButtons();
  }

  private createHUD(): void {
    const padding = 15;
    const bgWidth = 220;
    const bgHeight = 95;

    this.hudBg = this.scene.add.graphics();
    this.hudBg.fillStyle(0x000000, 0.45);
    this.hudBg.lineStyle(2, 0x00ffff, 0.3);
    this.drawRoundedRect(this.hudBg, padding, padding, bgWidth, bgHeight, 8);
    this.hudBg.fillPath();
    this.hudBg.strokePath();
    this.hudContainer.add(this.hudBg);

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      color: '#00ffff',
      fontStyle: 'bold'
    };

    this.planetNameText = this.scene.add.text(
      padding + 12,
      padding + 10,
      '',
      { ...textStyle, fontSize: '20px', color: '#ffffff' }
    );
    this.hudContainer.add(this.planetNameText);

    this.gravityText = this.scene.add.text(
      padding + 12,
      padding + 40,
      '',
      textStyle
    );
    this.hudContainer.add(this.gravityText);

    this.fpsText = this.scene.add.text(
      padding + 12,
      padding + 65,
      '',
      { ...textStyle, color: '#ffff00', fontSize: '14px' }
    );
    this.hudContainer.add(this.fpsText);

    this.updatePlanetInfo(this.gravityManager.getCurrentPlanet(), this.gravityManager.getCurrentGravityFactor());
  }

  private drawRoundedRect(gfx: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: number): void {
    gfx.beginPath();
    gfx.moveTo(x + r, y);
    gfx.lineTo(x + w - r, y);
    gfx.arc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    gfx.lineTo(x + w, y + h - r);
    gfx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
    gfx.lineTo(x + r, y + h);
    gfx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
    gfx.lineTo(x, y + r);
    gfx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    gfx.closePath();
  }

  private createPlanetButtons(): void {
    const gameW = this.scene.scale.width;
    const gameH = this.scene.scale.height;
    const btnSize = 60;
    const spacing = 90;
    const totalW = PLANETS.length * spacing;
    const startX = (gameW - totalW) / 2 + spacing / 2;
    const y = gameH - 70;

    PLANETS.forEach((planet, idx) => {
      const x = startX + idx * spacing;
      const btn = this.createPlanetButton(x, y, btnSize, planet);
      this.planetButtons.set(planet.id, btn);
      this.buttonsContainer.add(btn.btn);
    });

    this.updateButtonSelection();
  }

  private createPlanetButton(x: number, y: number, size: number, planet: PlanetData) {
    const container = this.scene.add.container(x, y);
    container.setSize(size + 20, size + 40);
    container.setInteractive(
      new Phaser.Geom.Circle(0, 0, size / 2 + 10),
      Phaser.Geom.Circle.Contains
    );

    const halo = this.scene.add.circle(0, 0, size / 2 + 8, 0x00ffff, 0);
    halo.setStrokeStyle(3, 0x00ffff, 0);
    container.add(halo);

    const icon = this.scene.add.graphics();
    this.drawPlanetIcon(icon, planet, size);
    container.add(icon);

    const label = this.scene.add.text(
      0,
      size / 2 + 18,
      planet.name,
      {
        fontFamily: '"Courier New", monospace',
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center'
      }
    );
    label.setOrigin(0.5);
    container.add(label);

    container.on('pointerdown', () => {
      this.handlePlanetClick(planet.id);
    });

    container.on('pointerover', () => {
      icon.setAlpha(1);
      label.setColor('#00ffff');
    });

    container.on('pointerout', () => {
      if (planet.id !== this.selectedPlanetId) {
        icon.setAlpha(0.75);
        label.setColor('#ffffff');
      }
    });

    if (planet.id !== this.selectedPlanetId) {
      icon.setAlpha(0.75);
    }

    return { btn: container, icon, halo, label };
  }

  private drawPlanetIcon(gfx: Phaser.GameObjects.Graphics, planet: PlanetData, size: number): void {
    const r = size / 2;
    gfx.clear();

    gfx.fillStyle(planet.bgTop, 1);
    gfx.fillCircle(0, 0, r);

    gfx.fillStyle(planet.groundColor, 0.7);
    if (planet.id === 'earth') {
      gfx.fillEllipse(-r * 0.2, -r * 0.1, r * 0.5, r * 0.35);
      gfx.fillEllipse(r * 0.25, r * 0.2, r * 0.4, r * 0.3);
    } else if (planet.id === 'mars') {
      gfx.fillCircle(-r * 0.3, -r * 0.2, r * 0.2);
      gfx.fillCircle(r * 0.2, r * 0.15, r * 0.15);
    } else if (planet.id === 'moon') {
      gfx.fillStyle(0x505050, 0.8);
      gfx.fillCircle(-r * 0.25, -r * 0.2, r * 0.15);
      gfx.fillCircle(r * 0.2, r * 0.1, r * 0.12);
      gfx.fillCircle(-r * 0.1, r * 0.3, r * 0.08);
    } else if (planet.id === 'europa') {
      gfx.lineStyle(1.5, 0xffffff, 0.5);
      gfx.beginPath();
      gfx.moveTo(-r * 0.7, -r * 0.3);
      const steps = 12;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const px = -r * 0.7 + (r * 1.4) * t;
        const py = -r * 0.3 + (r * 0.1) * t + Math.sin(t * Math.PI) * r * 0.1;
        gfx.lineTo(px, py);
      }
      gfx.strokePath();
      gfx.beginPath();
      gfx.moveTo(-r * 0.6, r * 0.2);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const px = -r * 0.6 + (r * 1.2) * t;
        const py = r * 0.2 + (-r * 0.05) * t + Math.sin(t * Math.PI) * r * 0.12;
        gfx.lineTo(px, py);
      }
      gfx.strokePath();
    }

    gfx.lineStyle(2, 0xffffff, 0.6);
    gfx.strokeCircle(0, 0, r);
  }

  private handlePlanetClick(planetId: string): void {
    if (planetId === this.selectedPlanetId) return;
    this.selectedPlanetId = planetId;
    this.updateButtonSelection();
    if (this.onPlanetSwitch) {
      this.onPlanetSwitch(planetId);
    }
  }

  private updateButtonSelection(): void {
    this.planetButtons.forEach((data, id) => {
      if (id === this.selectedPlanetId) {
        data.icon.setAlpha(1);
        data.label.setColor('#00ffff');
      } else {
        data.icon.setAlpha(0.75);
        data.label.setColor('#ffffff');
      }
    });
  }

  public setPlanetSwitchCallback(callback: PlanetSwitchCallback): void {
    this.onPlanetSwitch = callback;
  }

  public updatePlanetInfo(planet: PlanetData, gravityFactor: number): void {
    this.planetNameText.setText(`${planet.name} (${planet.nameEn})`);
    this.gravityText.setText(`重力: ${gravityFactor.toFixed(2)}g`);
  }

  public update(time: number, delta: number): void {
    this.pulseTime += delta;
    this.frameCount++;

    if (time - this.lastFpsUpdate >= 500) {
      const fps = Math.round((this.frameCount * 1000) / (time - this.lastFpsUpdate));
      this.fpsText.setText(`FPS: ${fps}`);
      this.frameCount = 0;
      this.lastFpsUpdate = time;
    }

    const pulseProgress = (this.pulseTime % 2000) / 2000;
    const pulseAlpha = Math.sin(pulseProgress * Math.PI) * 0.7;
    const pulseScale = 1 + pulseProgress * 0.5;

    this.planetButtons.forEach((data, id) => {
      if (id === this.selectedPlanetId) {
        data.halo.setAlpha(pulseAlpha);
        data.halo.setStrokeStyle(3, 0x00ffff, pulseAlpha);
        data.halo.setScale(pulseScale);
      } else {
        data.halo.setAlpha(0);
        data.halo.setScale(1);
      }
    });
  }

  public setSelectedPlanet(planetId: string): void {
    this.selectedPlanetId = planetId;
    this.updateButtonSelection();
  }

  public resize(width: number, height: number): void {
    this.buttonsContainer.removeAll(true);
    this.planetButtons.clear();
    this.createPlanetButtons();
  }

  public destroy(): void {
    this.hudContainer.destroy();
    this.buttonsContainer.destroy();
  }
}
