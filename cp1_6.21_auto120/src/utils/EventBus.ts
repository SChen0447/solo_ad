type EventCallback = (...args: any[]) => void;

interface EventMap {
  [key: string]: EventCallback[];
}

class EventBus {
  private static instance: EventBus | null = null;
  private events: EventMap = {};

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on(event: string, callback: EventCallback): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  public off(event: string, callback: EventCallback): void {
    if (!this.events[event]) return;
    const index = this.events[event].indexOf(callback);
    if (index > -1) {
      this.events[event].splice(index, 1);
    }
  }

  public emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;
    this.events[event].forEach((callback) => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    });
  }

  public once(event: string, callback: EventCallback): void {
    const wrapper = (...args: any[]) => {
      this.off(event, wrapper);
      callback(...args);
    };
    this.on(event, wrapper);
  }

  public clear(): void {
    this.events = {};
  }
}

export const eventBus = EventBus.getInstance();

export const GameEvents = {
  ITEM_COLLECTED: 'item:collected',
  ITEM_COMBINED: 'item:combined',
  ITEM_DRAG_START: 'item:drag:start',
  ITEM_DRAG_END: 'item:drag:end',
  ITEM_DROP_ZONE: 'item:drop:zone',
  CLUE_UNLOCKED: 'clue:unlocked',
  STORY_PROGRESS: 'story:progress',
  CHOICE_MADE: 'choice:made',
  SCENE_TRANSITION: 'scene:transition',
  GAME_ENDING: 'game:ending',
  INVENTORY_UPDATED: 'inventory:updated',
} as const;
