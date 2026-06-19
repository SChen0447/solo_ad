import type { GameLogic } from '../game/GameLogic';
import type { Renderer } from './Renderer';
import type { GameState } from '../types/game';

export class InputHandler {
  private logic: GameLogic;
  private renderer: Renderer;
  private canvas: HTMLCanvasElement;
  private boundMove: (e: MouseEvent) => void;
  private boundDown: (e: MouseEvent) => void;
  private boundUp: (e: MouseEvent) => void;
  private boundClick: (e: MouseEvent) => void;
  private pendingCardId: string | null = null;

  constructor(canvas: HTMLCanvasElement, logic: GameLogic, renderer: Renderer) {
    this.canvas = canvas;
    this.logic = logic;
    this.renderer = renderer;

    this.boundMove = (e) => this.onMouseMove(e);
    this.boundDown = (e) => this.onMouseDown(e);
    this.boundUp = (e) => this.onMouseUp(e);
    this.boundClick = (e) => this.onClick(e);
  }

  attach(): void {
    this.canvas.addEventListener('mousemove', this.boundMove);
    this.canvas.addEventListener('mousedown', this.boundDown);
    this.canvas.addEventListener('mouseup', this.boundUp);
    this.canvas.addEventListener('click', this.boundClick);
  }

  detach(): void {
    this.canvas.removeEventListener('mousemove', this.boundMove);
    this.canvas.removeEventListener('mousedown', this.boundDown);
    this.canvas.removeEventListener('mouseup', this.boundUp);
    this.canvas.removeEventListener('click', this.boundClick);
  }

  private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    return this.renderer.screenToVirtual(sx, sy);
  }

  private onMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    const card = this.renderer.getCardAtPoint(x, y);
    if (card) {
      this.canvas.style.cursor = 'pointer';
      this.renderer.setHoveredCard(card.id);
    } else {
      const state: GameState = (window as unknown as { __lastState?: GameState }).__lastState || this.logic.state;
      const overBtn = this.renderer.getEndTurnBtnAt(x, y, state);
      const overRestart = this.renderer.getRestartBtnAt(x, y, state);
      this.canvas.style.cursor = overBtn || overRestart ? 'pointer' : 'default';
      this.renderer.setHoveredCard(null);
    }
  }

  private onMouseDown(e: MouseEvent): void {
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
    this.renderer.setPressedCard(null);
  }

  private onClick(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    const state = this.logic.state;

    if (state.phase !== 'playing') {
      if (this.renderer.getRestartBtnAt(x, y, state)) {
        this.logic.restart();
      }
      return;
    }

    if (this.pendingCardId) {
      const card = state.player.hand.find((c) => c.id === this.pendingCardId);
      if (card && card.cost <= state.player.energy && state.turnPhase === 'player_action') {
        this.logic.playCard(this.pendingCardId);
      }
      this.pendingCardId = null;
      return;
    }

    if (this.renderer.getEndTurnBtnAt(x, y, state)) {
      this.logic.endTurn();
    }
  }
}
