import { Bubble, BubbleType, Panel, TextAlign } from '../../types';

export class DialogueEditor {
  generateBubbleId(): string {
    return `bubble_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createBubble(type: BubbleType = 'ellipse', panelWidth: number = 200, panelHeight: number = 150): Bubble {
    let width = 140;
    let height = 70;

    if (type === 'ellipse') {
      width = 140;
      height = 70;
    } else if (type === 'rectangle') {
      width = 130;
      height = 60;
    } else if (type === 'cloud') {
      width = 150;
      height = 80;
    }

    return {
      id: this.generateBubbleId(),
      type,
      text: '对话内容',
      x: Math.max(10, (panelWidth - width) / 2),
      y: Math.max(10, (panelHeight - height) / 2),
      width,
      height,
      fontSize: 14,
      textColor: '#000000',
      textAlign: 'center',
      borderRadius: type === 'rectangle' ? 8 : 0
    };
  }

  validateBubblePosition(bubble: Bubble, panel: Panel): Bubble {
    const maxX = panel.width - bubble.width - 5;
    const maxY = panel.height - bubble.height - 5;
    return {
      ...bubble,
      x: Math.min(Math.max(5, bubble.x), Math.max(5, maxX)),
      y: Math.min(Math.max(5, bubble.y), Math.max(5, maxY))
    };
  }

  validateBubbleSize(bubble: Bubble, panel: Panel): Bubble {
    const minSize = 40;
    const maxWidth = panel.width - 10;
    const maxHeight = panel.height - 10;
    return {
      ...bubble,
      width: Math.min(Math.max(minSize, bubble.width), maxWidth),
      height: Math.min(Math.max(minSize, bubble.height), maxHeight)
    };
  }

  checkBubbleOverlap(bubbles: Bubble[], movingId: string): string[] {
    const overlapping: string[] = [];
    const moving = bubbles.find(b => b.id === movingId);
    if (!moving) return overlapping;

    for (const other of bubbles) {
      if (other.id === movingId) continue;
      if (this.bubblesOverlap(moving, other)) {
        overlapping.push(other.id);
      }
    }
    return overlapping;
  }

  private bubblesOverlap(a: Bubble, b: Bubble): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  updateBubbleText(bubble: Bubble, text: string): Bubble {
    return { ...bubble, text };
  }

  updateBubbleStyle(
    bubble: Bubble,
    updates: Partial<Pick<Bubble, 'fontSize' | 'textColor' | 'textAlign' | 'borderRadius' | 'type'>>
  ): Bubble {
    return { ...bubble, ...updates };
  }

  moveBubble(bubble: Bubble, dx: number, dy: number, panel: Panel): Bubble {
    const moved = { ...bubble, x: bubble.x + dx, y: bubble.y + dy };
    return this.validateBubblePosition(moved, panel);
  }

  resizeBubble(bubble: Bubble, newWidth: number, newHeight: number, panel: Panel): Bubble {
    const resized = { ...bubble, width: newWidth, height: newHeight };
    const validated = this.validateBubbleSize(resized, panel);
    return this.validateBubblePosition(validated, panel);
  }
}

export const dialogueEditor = new DialogueEditor();
