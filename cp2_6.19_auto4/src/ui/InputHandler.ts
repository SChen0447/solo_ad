import type { GameLogic } from '../game/GameLogic';
import type { Renderer } from './Renderer';

export class InputHandler {
  private logic: GameLogic;
  private renderer: Renderer;
  private canvas: HTMLCanvasElement;
  private boundMove: (e: MouseEvent) => void;
  private boundDown: (e: MouseEvent) => void;
  private boundUp: (e: MouseEvent) => void;
  private boundClick: (e: MouseEvent) => void;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private pendingCardId: string | null = null;

  constructor(canvas: HTMLCanvasElement, logic: GameLogic, renderer: Renderer) {
    this.canvas = canvas;
    this.logic = logic;
    this.renderer = renderer;

    this.boundMove = (e) => this.onMouseMove(e);
    this.boundDown = (e) => this.onMouseDown(e);
    this.boundUp = (e) => this.onMouseUp(e);
    this.boundClick = (e) => this.onClick(e);
    this.boundTouchStart = (e) => this.onTouchStart(e);
    this.boundTouchMove = (e) => this.onTouchMove(e);
    this.boundTouchEnd = (e) => this.onTouchEnd(e);
    this.boundKeyDown = (e) => this.onKeyDown(e);
    this.boundKeyUp = (e) => this.onKeyUp(e);
  }

  attach(): void {
    this.canvas.addEventListener('mousemove', this.boundMove);
    this.canvas.addEventListener('mousedown', this.boundDown);
    this.canvas.addEventListener('mouseup', this.boundUp);
    this.canvas.addEventListener('click', this.boundClick);
    this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.boundTouchEnd, { passive: false });
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  detach(): void {
    this.canvas.removeEventListener('mousemove', this.boundMove);
    this.canvas.removeEventListener('mousedown', this.boundDown);
    this.canvas.removeEventListener('mouseup', this.boundUp);
    this.canvas.removeEventListener('click', this.boundClick);
    this.canvas.removeEventListener('touchstart', this.boundTouchStart);
    this.canvas.removeEventListener('touchmove', this.boundTouchMove);
    this.canvas.removeEventListener('touchend', this.boundTouchEnd);
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }

  private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    return this.renderer.screenToVirtual(sx, sy);
  }

  private onMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    const state = this.logic.state;
    if (state.gameOver) {
      const overRestart = this.renderer.getRestartBtnAt(x, y, state);
      this.canvas.style.cursor = overRestart ? 'pointer' : 'default';
      this.renderer.setHoveredCard(null);
      return;
    }
    const card = this.renderer.getCardAtPoint(x, y);
    if (card) {
      this.canvas.style.cursor = 'pointer';
      this.renderer.setHoveredCard(card.id);
    } else {
      const overBtn = this.renderer.getEndTurnBtnAt(x, y, state);
      const overRestart = this.renderer.getRestartBtnAt(x, y, state);
      this.canvas.style.cursor = overBtn || overRestart ? 'pointer' : 'default';
      this.renderer.setHoveredCard(null);
    }
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.logic.state.gameOver) {
      this.pendingCardId = null;
      return;
    }
    const { x, y } = this.getCanvasCoords(e);
    const card = this.renderer.getCardAtPoint(x, y);
    if (card) {
      this.pendingCardId = card.id;
      this.renderer.setPressedCard(card.id);
    } else {
      this.pendingCardId = null;
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    if (this.logic.state.gameOver) {
      this.renderer.setPressedCard(null);
      return;
    }
    this.renderer.setPressedCard(null);
  }

  private onClick(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    const state = this.logic.state;

    if (state.gameOver || state.phase !== 'playing') {
      if (this.renderer.getRestartBtnAt(x, y, state)) {
        this.logic.restart();
      }
      return;
    }

    if (this.pendingCardId) {
      const card = state.player.hand.find((c) => c.id === this.pendingCardId);
      if (card && card.energyCost <= state.player.energy && state.turnPhase === 'player_action') {
        this.logic.playCard(this.pendingCardId);
      }
      this.pendingCardId = null;
      return;
    }

    if (this.renderer.getEndTurnBtnAt(x, y, state)) {
      this.logic.endTurn();
    }
  }

  private getTouchCoords(e: TouchEvent): { x: number; y: number } | null {
    if (e.touches.length === 0 && e.changedTouches.length === 0) return null;
    const touch = e.touches[0] || e.changedTouches[0];
    const rect = this.canvas.getBoundingClientRect();
    const sx = touch.clientX - rect.left;
    const sy = touch.clientY - rect.top;
    return this.renderer.screenToVirtual(sx, sy);
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const state = this.logic.state;
    if (state.gameOver) {
      this.pendingCardId = null;
      return;
    }
    const coords = this.getTouchCoords(e);
    if (!coords) return;
    const { x, y } = coords;
    const card = this.renderer.getCardAtPoint(x, y);
    if (card) {
      this.pendingCardId = card.id;
      this.renderer.setPressedCard(card.id);
      this.renderer.setHoveredCard(card.id);
    } else {
      this.pendingCardId = null;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const state = this.logic.state;
    if (state.gameOver) {
      this.renderer.setHoveredCard(null);
      return;
    }
    const coords = this.getTouchCoords(e);
    if (!coords) return;
    const { x, y } = coords;
    const card = this.renderer.getCardAtPoint(x, y);
    if (card) {
      this.renderer.setHoveredCard(card.id);
    } else {
      this.renderer.setHoveredCard(null);
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    this.renderer.setPressedCard(null);
    const state = this.logic.state;
    const coords = this.getTouchCoords(e);
    if (!coords) return;
    const { x, y } = coords;

    if (state.gameOver || state.phase !== 'playing') {
      if (this.renderer.getRestartBtnAt(x, y, state)) {
        this.logic.restart();
      }
      this.renderer.setHoveredCard(null);
      return;
    }

    if (this.pendingCardId) {
      const card = state.player.hand.find((c) => c.id === this.pendingCardId);
      if (card && card.energyCost <= state.player.energy && state.turnPhase === 'player_action') {
        this.logic.playCard(this.pendingCardId);
      }
      this.pendingCardId = null;
      this.renderer.setHoveredCard(null);
      return;
    }

    if (this.renderer.getEndTurnBtnAt(x, y, state)) {
      this.logic.endTurn();
    }
    this.renderer.setHoveredCard(null);
  }

  private onKeyDown(e: KeyboardEvent): void {
    const state = this.logic.state;
    if (state.gameOver) {
      if (e.key === 'Enter' || e.key === ' ') {
        this.logic.restart();
      }
      e.preventDefault();
      return;
    }
    if (state.phase !== 'playing' || state.turnPhase !== 'player_action') {
      return;
    }
    if (e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key) - 1;
      if (index < state.player.hand.length) {
        const card = state.player.hand[index];
        if (card && card.energyCost <= state.player.energy) {
          this.logic.playCard(card.id);
        }
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      this.logic.endTurn();
    }
  }

  private onKeyUp(_e: KeyboardEvent): void {
  }
}
