export type EventCallback = (data?: unknown) => void;

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, EventCallback[]> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  public emit(event: string, data?: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (e) {
          console.error(`Error in event listener for ${event}:`, e);
        }
      });
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = EventBus.getInstance();

export const GameEvents = {
  INPUT_PING_START: 'input:ping:start',
  INPUT_PING_END: 'input:ping:end',
  INPUT_MOUSE_MOVE: 'input:mouse:move',
  INPUT_KEY_MOVE: 'input:key:move',

  PING_EMIT: 'ping:emit',
  PING_REFLECT: 'ping:reflect',
  PING_EXPIRE: 'ping:expire',

  AUDIO_PLAY_PING: 'audio:play:ping',
  AUDIO_PLAY_REFLECT: 'audio:play:reflect',
  AUDIO_PLAY_SCREAM: 'audio:play:scream',
  AUDIO_PLAY_COLLECT: 'audio:play:collect',
  AUDIO_PLAY_DOOR: 'audio:play:door',
  AUDIO_PLAY_HURT: 'audio:play:hurt',

  PLAYER_MOVE: 'player:move',
  PLAYER_HURT: 'player:hurt',
  PLAYER_ENERGY_CHANGE: 'player:energy:change',

  COLLECTIBLE_PICKUP: 'collectible:pickup',
  COLLECTIBLE_PROGRESS: 'collectible:progress',

  CREATURE_HIT: 'creature:hit',
  CREATURE_TELEPORT: 'creature:teleport',

  DOOR_OPEN: 'door:open',
  LEVEL_COMPLETE: 'level:complete',
  LEVEL_START: 'level:start',

  RENDER_UPDATE: 'render:update'
} as const;
