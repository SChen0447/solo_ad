export enum PetState {
  HUNGRY = 'HUNGRY',
  PLAYING = 'PLAYING',
  SLEEPING = 'SLEEPING',
  SICK = 'SICK'
}

export interface PetAttributes {
  hunger: number;
  happiness: number;
  energy: number;
  health: number;
}

export interface Notification {
  text: string;
  startTime: number;
  duration: number;
}

const STATE_LABELS: Record<PetState, string> = {
  [PetState.HUNGRY]: '饿了...',
  [PetState.PLAYING]: '玩耍中~',
  [PetState.SLEEPING]: '睡觉中zzZ',
  [PetState.SICK]: '不舒服...'
};

const MIN_DURATION = 5000;
const MAX_DURATION = 20000;
const NATURAL_DECAY_RATES: Record<PetState, Partial<PetAttributes>> = {
  [PetState.HUNGRY]: { hunger: -2, happiness: -1, energy: -1, health: 0 },
  [PetState.PLAYING]: { hunger: -3, happiness: 2, energy: -2, health: 0 },
  [PetState.SLEEPING]: { hunger: -1, happiness: 0, energy: 3, health: 1 },
  [PetState.SICK]: { hunger: -1, happiness: -2, energy: -2, health: -3 }
};

function randomDuration(): number {
  return MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export type StateChangeListener = (state: PetState, label: string, opacity: number) => void;
export type AttributeChangeListener = (attrs: PetAttributes) => void;
export type NotificationListener = (notification: Notification) => void;

export class Pet {
  state: PetState = PetState.HUNGRY;
  attributes: PetAttributes = {
    hunger: 70,
    happiness: 70,
    energy: 70,
    health: 70
  };
  stateDuration: number = randomDuration();
  stateElapsed: number = 0;
  fadeOpacity: number = 1;
  isFading: boolean = false;
  pendingState: PetState | null = null;
  notifications: Notification[] = [];

  private stateListeners: StateChangeListener[] = [];
  private attrListeners: AttributeChangeListener[] = [];
  private notifListeners: NotificationListener[] = [];

  onStateChange(listener: StateChangeListener): void {
    this.stateListeners.push(listener);
  }

  onAttributeChange(listener: AttributeChangeListener): void {
    this.attrListeners.push(listener);
  }

  onNotification(listener: NotificationListener): void {
    this.notifListeners.push(listener);
  }

  private emitState(opacity: number): void {
    const label = STATE_LABELS[this.state];
    this.stateListeners.forEach(fn => fn(this.state, label, opacity));
  }

  private emitAttributes(): void {
    this.attrListeners.forEach(fn => fn({ ...this.attributes }));
  }

  private emitNotification(text: string): void {
    const notif: Notification = {
      text,
      startTime: performance.now(),
      duration: 2000
    };
    this.notifications.push(notif);
    this.notifListeners.forEach(fn => fn(notif));
  }

  updateFade(dt: number): void {
    if (!this.isFading && this.fadeOpacity >= 1) return;

    if (this.isFading) {
      this.fadeOpacity -= dt / 300;
      if (this.fadeOpacity <= 0) {
        this.fadeOpacity = 0;
        if (this.pendingState !== null) {
          this.state = this.pendingState;
          this.pendingState = null;
          this.stateDuration = randomDuration();
          this.stateElapsed = 0;
        }
        this.isFading = false;
      }
      this.fadeOpacity = Math.max(0, this.fadeOpacity);
      this.emitState(this.fadeOpacity);
      return;
    }

    if (this.fadeOpacity < 1) {
      this.fadeOpacity += dt / 300;
      this.fadeOpacity = Math.min(1, this.fadeOpacity);
      this.emitState(this.fadeOpacity);
    }
  }

  tick(dt: number): void {
    if (this.isFading) return;

    this.stateElapsed += dt;
    if (this.stateElapsed >= this.stateDuration) {
      this.transitionTo(this.pickNextState());
      return;
    }

    const decay = NATURAL_DECAY_RATES[this.state];
    const secs = dt / 1000;
    this.attributes.hunger = clamp(this.attributes.hunger + (decay.hunger ?? 0) * secs, 0, 100);
    this.attributes.happiness = clamp(this.attributes.happiness + (decay.happiness ?? 0) * secs, 0, 100);
    this.attributes.energy = clamp(this.attributes.energy + (decay.energy ?? 0) * secs, 0, 100);
    this.attributes.health = clamp(this.attributes.health + (decay.health ?? 0) * secs, 0, 100);

    this.checkLowAttributes();
    this.emitAttributes();
  }

  private pickNextState(): PetState {
    const states = Object.values(PetState).filter(s => s !== this.state);
    if (this.attributes.hunger < 30 && Math.random() < 0.6) return PetState.HUNGRY;
    if (this.attributes.health < 30 && Math.random() < 0.6) return PetState.SICK;
    if (this.attributes.energy < 30 && Math.random() < 0.6) return PetState.SLEEPING;
    return states[Math.floor(Math.random() * states.length)];
  }

  private transitionTo(newState: PetState): void {
    if (newState === this.state) return;
    this.isFading = true;
    this.pendingState = newState;
    this.fadeOpacity = 1;
  }

  private checkLowAttributes(): void {
    const now = performance.now();
    const recentTexts = this.notifications
      .filter(n => now - n.startTime < 3000)
      .map(n => n.text);

    if (this.attributes.hunger < 20 && !recentTexts.includes('饿！快喂食')) {
      this.emitNotification('饿！快喂食');
    }
    if (this.attributes.happiness < 20 && !recentTexts.includes('不开心！')) {
      this.emitNotification('不开心！');
    }
    if (this.attributes.energy < 20 && !recentTexts.includes('好累！')) {
      this.emitNotification('好累！');
    }
    if (this.attributes.health < 20 && !recentTexts.includes('生病了！')) {
      this.emitNotification('生病了！');
    }
  }

  feed(): void {
    this.attributes.hunger = clamp(this.attributes.hunger + 30, 0, 100);
    this.attributes.health = clamp(this.attributes.health + 5, 0, 100);
    this.emitAttributes();
    this.emitNotification('好吃！');
  }

  play(): void {
    this.attributes.happiness = clamp(this.attributes.happiness + 30, 0, 100);
    this.attributes.hunger = clamp(this.attributes.hunger - 5, 0, 100);
    this.attributes.energy = clamp(this.attributes.energy - 10, 0, 100);
    this.emitAttributes();
    this.emitNotification('开心~');
  }

  sleep(): void {
    this.attributes.energy = clamp(this.attributes.energy + 30, 0, 100);
    this.attributes.health = clamp(this.attributes.health + 5, 0, 100);
    this.emitAttributes();
    this.emitNotification('zzZ...');
  }

  heal(): void {
    this.attributes.health = clamp(this.attributes.health + 30, 0, 100);
    this.attributes.happiness = clamp(this.attributes.happiness + 5, 0, 100);
    if (this.state === PetState.SICK) {
      this.transitionTo(PetState.HUNGRY);
    }
    this.emitAttributes();
    this.emitNotification('好多了！');
  }

  getAnimationAction(): 'standing' | 'jumping' | 'yawning' | 'weak' {
    if (this.isFading && this.pendingState !== null) {
      switch (this.pendingState) {
        case PetState.PLAYING: return 'jumping';
        case PetState.SLEEPING: return 'yawning';
        case PetState.SICK: return 'weak';
        default: return 'standing';
      }
    }
    switch (this.state) {
      case PetState.PLAYING: return 'jumping';
      case PetState.SLEEPING: return 'yawning';
      case PetState.SICK: return 'weak';
      default: return 'standing';
    }
  }

  cleanupNotifications(): void {
    const now = performance.now();
    this.notifications = this.notifications.filter(n => now - n.startTime < n.duration + 500);
  }
}
