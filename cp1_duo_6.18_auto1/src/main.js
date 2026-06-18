import { EventBus, GameEngine } from './engine';
import { Renderer } from './renderer';
import { UIManager } from './ui';
class Game {
    canvas;
    eventBus;
    engine;
    renderer;
    ui;
    lastTime = 0;
    animationId = 0;
    frameCount = 0;
    fpsUpdateTime = 0;
    currentFPS = 0;
    constructor() {
        const container = document.getElementById('canvas-container');
        if (!container)
            throw new Error('Canvas container not found');
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas)
            throw new Error('Game canvas not found');
        this.resizeCanvas();
        window.addEventListener('resize', this.handleResize.bind(this));
        this.eventBus = new EventBus();
        this.engine = new GameEngine(this.eventBus, this.canvas.width, this.canvas.height);
        this.renderer = new Renderer(this.canvas);
        this.ui = new UIManager(this.canvas, this.eventBus, this.engine);
        this.start();
    }
    resizeCanvas() {
        const container = document.getElementById('canvas-container');
        if (!container)
            return;
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        const ctx = this.canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
        }
        if (this.engine) {
            this.engine.resize(rect.width, rect.height);
        }
        if (this.renderer) {
            this.renderer.resize(rect.width, rect.height);
        }
        if (this.ui) {
            this.ui.resize();
        }
    }
    handleResize() {
        this.resizeCanvas();
    }
    start() {
        this.lastTime = performance.now();
        this.loop();
    }
    loop() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.frameCount++;
        this.fpsUpdateTime += deltaTime;
        if (this.fpsUpdateTime >= 1000) {
            this.currentFPS = Math.round(this.frameCount * 1000 / this.fpsUpdateTime);
            this.frameCount = 0;
            this.fpsUpdateTime = 0;
        }
        try {
            this.engine.update(deltaTime);
            this.renderer.render(this.engine, deltaTime);
            this.ui.render();
        }
        catch (error) {
            console.error('Game loop error:', error);
        }
        this.animationId = requestAnimationFrame(() => this.loop());
    }
    getFPS() {
        return this.currentFPS;
    }
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.handleResize.bind(this));
    }
}
let game = null;
document.addEventListener('DOMContentLoaded', () => {
    try {
        game = new Game();
        console.log('星轨弹射游戏已启动');
    }
    catch (error) {
        console.error('游戏初始化失败:', error);
    }
});
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        if (game) {
            game.destroy();
            game = null;
        }
    });
}
