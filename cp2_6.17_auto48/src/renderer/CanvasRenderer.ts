import { drawPixelText, wrapPixelText, measurePixelText } from './PixelFont';
import { DialogueNode } from '../types/DialogueNode';
import { eventBus, EVENTS } from '../eventBus';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 240;
const DIALOGUE_AREA_HEIGHT = 120;
const TEXT_PADDING = 12;
const BUTTON_WIDTH = 160;
const BUTTON_HEIGHT = 28;
const BUTTON_SPACING = 8;

const BACKGROUNDS = [
  '#1a1a2e',
  '#2d5a27',
  '#8b5e3c',
  '#1c1c1c',
];

interface ButtonRect {
  x: number;
  y: number;
  width: number;
  height: number;
  optionIndex: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private nodes: DialogueNode[] = [];
  private currentNode: DialogueNode | null = null;
  private buttonRects: ButtonRect[] = [];
  private hoveredButtonIndex: number = -1;
  private animationFrame: number | null = null;
  private characterFrame: number = 0;
  private lastTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.canvas.style.imageRendering = 'pixelated';
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.setupEventListeners();
    this.setupBusListeners();
    this.startAnimationLoop();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
  }

  private setupBusListeners(): void {
    eventBus.on(EVENTS.PREVIEW_NODE, (nodeId: unknown) => {
      this.previewNode(nodeId as string);
    });

    eventBus.on(EVENTS.UPDATE_TREE, (nodes: unknown) => {
      this.nodes = nodes as DialogueNode[];
    });
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let newHoveredIndex = -1;
    for (const btn of this.buttonRects) {
      if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
        newHoveredIndex = btn.optionIndex;
        break;
      }
    }

    if (newHoveredIndex !== this.hoveredButtonIndex) {
      this.hoveredButtonIndex = newHoveredIndex;
      this.canvas.style.cursor = newHoveredIndex >= 0 ? 'pointer' : 'default';
    }
  };

  private handleMouseLeave = (): void => {
    if (this.hoveredButtonIndex !== -1) {
      this.hoveredButtonIndex = -1;
      this.canvas.style.cursor = 'default';
    }
  };

  private handleClick = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (const btn of this.buttonRects) {
      if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
        eventBus.emit(EVENTS.OPTION_CLICKED, btn.optionIndex);
        if (this.currentNode?.options[btn.optionIndex]) {
          const nextNodeId = this.currentNode.options[btn.optionIndex].nextNodeId;
          this.previewNode(nextNodeId);
        }
        break;
      }
    }
  };

  private startAnimationLoop(): void {
    const animate = (time: number) => {
      const delta = time - this.lastTime;
      if (delta > 500) {
        this.characterFrame = (this.characterFrame + 1) % 2;
        this.lastTime = time;
      }
      this.render();
      this.animationFrame = requestAnimationFrame(animate);
    };
    this.animationFrame = requestAnimationFrame(animate);
  }

  previewNode(nodeId: string): void {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      this.currentNode = node;
      this.hoveredButtonIndex = -1;
    }
  }

  setNodes(nodes: DialogueNode[]): void {
    this.nodes = nodes;
  }

  getCurrentNodeId(): string | null {
    return this.currentNode?.id || null;
  }

  private render(): void {
    const startTime = performance.now();
    
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.drawBackground();
    this.drawCharacter();

    if (this.currentNode) {
      this.drawDialogueBox();
      this.drawSpeakerName();
      this.drawDialogueText();
      this.drawOptionButtons();
    }

    const renderTime = performance.now() - startTime;
    if (renderTime > 16) {
      console.warn(`Render time exceeded 16ms: ${renderTime.toFixed(2)}ms`);
    }
  }

  private drawBackground(): void {
    const bgIndex = this.currentNode?.backgroundIndex ?? 0;
    const bgColor = BACKGROUNDS[bgIndex] || BACKGROUNDS[0];
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (bgIndex === 0) {
      this.drawStars();
    } else if (bgIndex === 1) {
      this.drawTrees();
    } else if (bgIndex === 2) {
      this.drawCastle();
    } else {
      this.drawCave();
    }
  }

  private drawStars(): void {
    this.ctx.fillStyle = '#ffffff';
    const starPositions = [
      [30, 20], [60, 40], [90, 15], [120, 35], [150, 25],
      [180, 45], [210, 20], [240, 50], [270, 30], [300, 15],
      [330, 40], [360, 25], [390, 35], [45, 55], [135, 60],
      [225, 55], [315, 58], [375, 18], [75, 5], [195, 8],
    ];
    for (const [x, y] of starPositions) {
      this.ctx.fillRect(x, y, 2, 2);
    }
  }

  private drawTrees(): void {
    this.ctx.fillStyle = '#1a3a17';
    this.ctx.fillRect(0, 90, CANVAS_WIDTH, 30);
    
    const treePositions = [30, 100, 200, 300, 370];
    for (const x of treePositions) {
      this.ctx.fillStyle = '#3d2817';
      this.ctx.fillRect(x + 8, 70, 8, 50);
      this.ctx.fillStyle = '#1e4d1a';
      this.ctx.fillRect(x, 40, 24, 40);
      this.ctx.fillRect(x + 4, 30, 16, 20);
      this.ctx.fillStyle = '#2d6b27';
      this.ctx.fillRect(x + 2, 42, 8, 12);
    }
  }

  private drawCastle(): void {
    this.ctx.fillStyle = '#6b4423';
    this.ctx.fillRect(140, 40, 120, 80);
    
    this.ctx.fillStyle = '#8b5e3c';
    this.ctx.fillRect(130, 70, 20, 50);
    this.ctx.fillRect(250, 70, 20, 50);
    
    this.ctx.fillStyle = '#4a2d1a';
    this.ctx.fillRect(160, 80, 12, 20);
    this.ctx.fillRect(185, 60, 15, 25);
    this.ctx.fillRect(210, 80, 12, 20);
    this.ctx.fillRect(228, 80, 12, 20);
    
    this.ctx.fillStyle = '#2a1a0f';
    this.ctx.fillRect(188, 95, 9, 15);
  }

  private drawCave(): void {
    this.ctx.fillStyle = '#2a2a2a';
    for (let i = 0; i < 15; i++) {
      const x = i * 28;
      const h = 20 + (i % 3) * 10;
      this.ctx.fillRect(x, 0, 20, h);
    }
    
    this.ctx.fillStyle = '#3a3a3a';
    for (let i = 0; i < 12; i++) {
      const x = 20 + i * 32;
      this.ctx.fillRect(x, 85, 8, 15);
    }
  }

  private drawCharacter(): void {
    const baseY = 70 + this.characterFrame * 2;
    
    this.ctx.fillStyle = '#4a90d9';
    this.ctx.fillRect(175, baseY, 50, 50);
    
    this.ctx.fillStyle = '#f5d0a9';
    this.ctx.fillRect(180, baseY - 30, 40, 35);
    
    this.ctx.fillStyle = '#5a3a22';
    this.ctx.fillRect(180, baseY - 35, 40, 12);
    this.ctx.fillRect(178, baseY - 30, 6, 15);
    this.ctx.fillRect(216, baseY - 30, 6, 15);
    
    this.ctx.fillStyle = '#2a2a2a';
    this.ctx.fillRect(188, baseY - 18, 5, 5);
    this.ctx.fillRect(207, baseY - 18, 5, 5);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(190, baseY - 16, 2, 2);
    this.ctx.fillRect(209, baseY - 16, 2, 2);
    
    this.ctx.fillStyle = '#d4a574';
    this.ctx.fillRect(195, baseY - 6, 10, 3);
    
    this.ctx.fillStyle = '#3a7ac9';
    this.ctx.fillRect(170, baseY + 5, 8, 35);
    this.ctx.fillRect(222, baseY + 5, 8, 35);
    
    this.ctx.fillStyle = '#2a5a99';
    this.ctx.fillRect(178, baseY + 48, 18, 15);
    this.ctx.fillRect(204, baseY + 48, 18, 15);
  }

  private drawDialogueBox(): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(0, CANVAS_HEIGHT - DIALOGUE_AREA_HEIGHT, CANVAS_WIDTH, DIALOGUE_AREA_HEIGHT);
    
    this.ctx.strokeStyle = '#555';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0.5, CANVAS_HEIGHT - DIALOGUE_AREA_HEIGHT + 0.5, CANVAS_WIDTH - 1, DIALOGUE_AREA_HEIGHT - 1);
  }

  private drawSpeakerName(): void {
    if (!this.currentNode?.speaker) return;
    
    const speaker = this.currentNode.speaker;
    const x = TEXT_PADDING;
    const y = CANVAS_HEIGHT - DIALOGUE_AREA_HEIGHT + TEXT_PADDING;
    
    drawPixelText(this.ctx, speaker, x, y, 12, '#f0c040');
  }

  private drawDialogueText(): void {
    if (!this.currentNode?.text) return;
    
    const text = this.currentNode.text;
    const maxWidth = CANVAS_WIDTH - TEXT_PADDING * 2;
    const lines = wrapPixelText(text, maxWidth, 12);
    
    const speakerHeight = this.currentNode.speaker ? 18 : 0;
    let y = CANVAS_HEIGHT - DIALOGUE_AREA_HEIGHT + TEXT_PADDING + speakerHeight + 8;
    
    for (const line of lines.slice(0, 3)) {
      drawPixelText(this.ctx, line, TEXT_PADDING, y, 12, '#ffffff');
      y += 18;
    }
  }

  private drawOptionButtons(): void {
    this.buttonRects = [];
    if (!this.currentNode?.options || this.currentNode.options.length === 0) return;

    const options = this.currentNode.options.slice(0, 2);
    const totalHeight = options.length * BUTTON_HEIGHT + (options.length - 1) * BUTTON_SPACING;
    const startY = CANVAS_HEIGHT - totalHeight - 10;
    const centerX = (CANVAS_WIDTH - BUTTON_WIDTH) / 2;

    options.forEach((option, index) => {
      const x = centerX;
      const y = startY + index * (BUTTON_HEIGHT + BUTTON_SPACING);
      const isHovered = this.hoveredButtonIndex === index;

      this.ctx.fillStyle = isHovered ? '#555555' : 'rgba(40, 40, 40, 0.8)';
      this.ctx.fillRect(x, y, BUTTON_WIDTH, BUTTON_HEIGHT);

      this.ctx.strokeStyle = '#888';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x + 0.5, y + 0.5, BUTTON_WIDTH - 1, BUTTON_HEIGHT - 1);

      const text = option.text.length > 20 ? option.text.substring(0, 17) + '...' : option.text;
      const textMeasure = measurePixelText(text, 12);
      const textX = x + (BUTTON_WIDTH - textMeasure.width) / 2;
      const textY = y + (BUTTON_HEIGHT - textMeasure.height) / 2;

      drawPixelText(this.ctx, text, textX, textY, 12, '#ffffff');

      this.buttonRects.push({
        x,
        y,
        width: BUTTON_WIDTH,
        height: BUTTON_HEIGHT,
        optionIndex: index,
      });
    });
  }

  getCurrentNodeInfo(): { nodeId: string; optionCount: number } | null {
    if (!this.currentNode) return null;
    return {
      nodeId: this.currentNode.id,
      optionCount: this.currentNode.options.length,
    };
  }

  destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    eventBus.clear();
  }
}
