import type { AstroBody } from '../core/AstroBody';

export interface InfoPanelEvents {
  'body:delete': (body: AstroBody) => void;
}

type EventCallback = (...args: any[]) => void;

export class InfoPanel {
  private eventBus: Map<keyof InfoPanelEvents, EventCallback[]> = new Map();
  private selectedBody: AstroBody | null = null;

  private panel: HTMLElement;
  private bodyNameEl: HTMLElement;
  private bodyTypeEl: HTMLElement;
  private bodyMassEl: HTMLElement;
  private bodyRadiusEl: HTMLElement;
  private bodyPosXEl: HTMLElement;
  private bodyPosYEl: HTMLElement;
  private bodyPosZEl: HTMLElement;
  private bodyVelXEl: HTMLElement;
  private bodyVelYEl: HTMLElement;
  private bodyVelZEl: HTMLElement;
  private bodyAccelEl: HTMLElement;
  private btnDelete: HTMLButtonElement;

  constructor() {
    this.panel = document.getElementById('info-panel') as HTMLElement;
    this.bodyNameEl = document.getElementById('body-name') as HTMLElement;
    this.bodyTypeEl = document.getElementById('body-type') as HTMLElement;
    this.bodyMassEl = document.getElementById('body-mass') as HTMLElement;
    this.bodyRadiusEl = document.getElementById('body-radius') as HTMLElement;
    this.bodyPosXEl = document.getElementById('body-pos-x') as HTMLElement;
    this.bodyPosYEl = document.getElementById('body-pos-y') as HTMLElement;
    this.bodyPosZEl = document.getElementById('body-pos-z') as HTMLElement;
    this.bodyVelXEl = document.getElementById('body-vel-x') as HTMLElement;
    this.bodyVelYEl = document.getElementById('body-vel-y') as HTMLElement;
    this.bodyVelZEl = document.getElementById('body-vel-z') as HTMLElement;
    this.bodyAccelEl = document.getElementById('body-accel') as HTMLElement;
    this.btnDelete = document.getElementById('btn-delete') as HTMLButtonElement;

    this.btnDelete.addEventListener('click', () => {
      if (this.selectedBody) {
        this.emit('body:delete', this.selectedBody);
        this.hide();
      }
    });
  }

  public on<K extends keyof InfoPanelEvents>(event: K, callback: InfoPanelEvents[K]): void {
    if (!this.eventBus.has(event)) {
      this.eventBus.set(event, []);
    }
    this.eventBus.get(event)!.push(callback as EventCallback);
  }

  private emit<K extends keyof InfoPanelEvents>(event: K, ...args: Parameters<InfoPanelEvents[K]>): void {
    const callbacks = this.eventBus.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(...args));
    }
  }

  public show(body: AstroBody): void {
    this.selectedBody = body;
    this.panel.classList.add('visible');
    this.updateContent();
  }

  public hide(): void {
    this.selectedBody = null;
    this.panel.classList.remove('visible');
  }

  public getSelectedBody(): AstroBody | null {
    return this.selectedBody;
  }

  public clearIfBodyRemoved(body: AstroBody): void {
    if (this.selectedBody === body) {
      this.hide();
    }
  }

  public updateContent(): void {
    if (!this.selectedBody) return;

    const body = this.selectedBody;
    const typeName = body.type === 'star' ? '恒星' : '行星';

    this.bodyNameEl.textContent = `${typeName} ${body.id.slice(-6)}`;
    this.bodyTypeEl.textContent = typeName;
    this.bodyMassEl.textContent = body.mass.toFixed(2);
    this.bodyRadiusEl.textContent = body.radius.toFixed(2);
    this.bodyPosXEl.textContent = body.position.x.toFixed(2);
    this.bodyPosYEl.textContent = body.position.y.toFixed(2);
    this.bodyPosZEl.textContent = body.position.z.toFixed(2);
    this.bodyVelXEl.textContent = body.velocity.x.toFixed(3);
    this.bodyVelYEl.textContent = body.velocity.y.toFixed(3);
    this.bodyVelZEl.textContent = body.velocity.z.toFixed(3);
    this.bodyAccelEl.textContent = body.getAccelerationMagnitude().toFixed(4);
  }
}
