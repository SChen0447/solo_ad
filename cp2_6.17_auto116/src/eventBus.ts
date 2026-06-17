export type DisplayMode = 'solid' | 'wireframe';

export interface Atom {
  element: 'H' | 'C' | 'O' | 'N' | 'S';
  elementName: string;
  atomicNumber: number;
  color: string;
  position: [number, number, number];
  radius: number;
}

export interface Bond {
  atomIndex1: number;
  atomIndex2: number;
  bondOrder: number;
}

export interface Molecule {
  id: string;
  name: string;
  formula: string;
  atoms: Atom[];
  bonds: Bond[];
}

export interface AppState {
  currentMoleculeId: string;
  atomScale: number;
  cameraDistance: number;
  backgroundColor: string;
  displayMode: DisplayMode;
  autoRotate: boolean;
  rotationSpeed: number;
}

type EventType =
  | 'molecule:change'
  | 'atomScale:change'
  | 'cameraDistance:change'
  | 'backgroundColor:change'
  | 'displayMode:change'
  | 'autoRotate:change'
  | 'rotationSpeed:change'
  | 'molecule:loaded'
  | 'atom:doubleClick';

interface EventPayloadMap {
  'molecule:change': string;
  'atomScale:change': number;
  'cameraDistance:change': number;
  'backgroundColor:change': string;
  'displayMode:change': DisplayMode;
  'autoRotate:change': boolean;
  'rotationSpeed:change': number;
  'molecule:loaded': Molecule;
  'atom:doubleClick': Atom;
}

type EventCallback<T extends EventType> = (payload: EventPayloadMap[T]) => void;

class EventBus {
  private static instance: EventBus;
  private listeners: Map<EventType, Set<EventCallback<EventType>>>;

  private constructor() {
    this.listeners = new Map();
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  on<T extends EventType>(event: T, callback: EventCallback<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<EventType>);
  }

  off<T extends EventType>(event: T, callback: EventCallback<T>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback as EventCallback<EventType>);
    }
  }

  emit<T extends EventType>(event: T, payload: EventPayloadMap[T]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(payload));
    }
  }
}

export const eventBus = EventBus.getInstance();
