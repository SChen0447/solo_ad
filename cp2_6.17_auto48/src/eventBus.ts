import type { DialogueNode } from './types/DialogueNode';

export interface EditorToRendererEvents {
  PREVIEW_NODE: [nodeId: string];
  UPDATE_TREE: [nodes: DialogueNode[]];
}

export interface RendererToEditorEvents {
  OPTION_CLICKED: [optionIndex: number];
  NODE_CLICKED: [nodeId: string];
}

type EventName = string | symbol;

type InternalCallback = (...args: unknown[]) => void;

class EventBusCore {
  private callbacks: Map<EventName, InternalCallback[]> = new Map();

  get(event: EventName): InternalCallback[] {
    return this.callbacks.get(event) || [];
  }

  add(event: EventName, callback: InternalCallback): void {
    const cbs = this.callbacks.get(event) || [];
    cbs.push(callback);
    this.callbacks.set(event, cbs);
  }

  remove(event: EventName, callback: InternalCallback): void {
    const cbs = this.callbacks.get(event);
    if (cbs) {
      const index = cbs.indexOf(callback);
      if (index > -1) {
        cbs.splice(index, 1);
      }
    }
  }

  clear(): void {
    this.callbacks.clear();
  }
}

export interface EditorEventBus {
  emit<K extends keyof EditorToRendererEvents>(
    event: K,
    ...args: EditorToRendererEvents[K]
  ): void;
  on<K extends keyof RendererToEditorEvents>(
    event: K,
    callback: (...args: RendererToEditorEvents[K]) => void
  ): () => void;
  off<K extends keyof RendererToEditorEvents>(
    event: K,
    callback: (...args: RendererToEditorEvents[K]) => void
  ): void;
  clear(): void;
}

export interface RendererEventBus {
  emit<K extends keyof RendererToEditorEvents>(
    event: K,
    ...args: RendererToEditorEvents[K]
  ): void;
  on<K extends keyof EditorToRendererEvents>(
    event: K,
    callback: (...args: EditorToRendererEvents[K]) => void
  ): () => void;
  off<K extends keyof EditorToRendererEvents>(
    event: K,
    callback: (...args: EditorToRendererEvents[K]) => void
  ): void;
  clear(): void;
}

class EventBusFactory {
  private core: EventBusCore;
  private _editor: EditorEventBus;
  private _renderer: RendererEventBus;

  constructor() {
    this.core = new EventBusCore();

    this._editor = {
      emit: (event, ...args) => {
        const callbacks = this.core.get(event as EventName);
        callbacks.forEach((cb) => {
          try {
            cb(...args);
          } catch (error) {
            console.error(
              `[EventBus] Error in handler for event "${String(event)}":`,
              error
            );
          }
        });
      },
      on: (event, callback) => {
        const cb = callback as InternalCallback;
        this.core.add(event as EventName, cb);
        return () => this.core.remove(event as EventName, cb);
      },
      off: (event, callback) => {
        this.core.remove(event as EventName, callback as InternalCallback);
      },
      clear: () => {
        this.core.clear();
      },
    };

    this._renderer = {
      emit: (event, ...args) => {
        const callbacks = this.core.get(event as EventName);
        callbacks.forEach((cb) => {
          try {
            cb(...args);
          } catch (error) {
            console.error(
              `[EventBus] Error in handler for event "${String(event)}":`,
              error
            );
          }
        });
      },
      on: (event, callback) => {
        const cb = callback as InternalCallback;
        this.core.add(event as EventName, cb);
        return () => this.core.remove(event as EventName, cb);
      },
      off: (event, callback) => {
        this.core.remove(event as EventName, callback as InternalCallback);
      },
      clear: () => {
        this.core.clear();
      },
    };
  }

  forEditor(): EditorEventBus {
    return this._editor;
  }

  forRenderer(): RendererEventBus {
    return this._renderer;
  }
}

export const eventBusHub = new EventBusFactory();

export const editorBus: EditorEventBus = eventBusHub.forEditor();

export const rendererBus: RendererEventBus = eventBusHub.forRenderer();

export const EDITOR_EVENTS: { [K in keyof EditorToRendererEvents]: K } = {
  PREVIEW_NODE: 'PREVIEW_NODE',
  UPDATE_TREE: 'UPDATE_TREE',
};

export const RENDERER_EVENTS: { [K in keyof RendererToEditorEvents]: K } = {
  OPTION_CLICKED: 'OPTION_CLICKED',
  NODE_CLICKED: 'NODE_CLICKED',
};
