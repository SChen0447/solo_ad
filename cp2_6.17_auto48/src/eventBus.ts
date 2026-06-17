import { DialogueNode } from './types/DialogueNode';

export interface EditorToRendererEvents {
  PREVIEW_NODE: [nodeId: string];
  UPDATE_TREE: [nodes: DialogueNode[]];
}

export interface RendererToEditorEvents {
  OPTION_CLICKED: [optionIndex: number];
  NODE_CLICKED: [nodeId: string];
}

type EventMap = Record<string, unknown[]>;

class TypedEventBus<EmitEvents extends EventMap, OnEvents extends EventMap> {
  private events: Map<keyof (EmitEvents & OnEvents), Array<(...args: never[]) => void>> = new Map();

  on<K extends keyof OnEvents>(event: K, callback: (...args: OnEvents[K]) => void): void {
    const key = event as keyof (EmitEvents & OnEvents);
    if (!this.events.has(key)) {
      this.events.set(key, []);
    }
    this.events.get(key)!.push(callback as (...args: never[]) => void);
  }

  off<K extends keyof OnEvents>(event: K, callback: (...args: OnEvents[K]) => void): void {
    const key = event as keyof (EmitEvents & OnEvents);
    const callbacks = this.events.get(key);
    if (callbacks) {
      const index = callbacks.indexOf(callback as (...args: never[]) => void);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit<K extends keyof EmitEvents>(event: K, ...args: EmitEvents[K]): void {
    const key = event as keyof (EmitEvents & OnEvents);
    const callbacks = this.events.get(key);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(...(args as never[]));
        } catch (error) {
          console.error(`Error in event handler for ${String(event)}:`, error);
        }
      });
    }
  }

  clear(): void {
    this.events.clear();
  }
}

type EditorBus = TypedEventBus<EditorToRendererEvents, RendererToEditorEvents>;
type RendererBus = TypedEventBus<RendererToEditorEvents, EditorToRendererEvents>;

class SharedEventBus {
  private editorBus: EditorBus;
  private rendererBus: RendererBus;

  constructor() {
    const sharedEvents = new Map<string, Array<(...args: never[]) => void>>();

    this.editorBus = new TypedEventBus<EditorToRendererEvents, RendererToEditorEvents>();
    this.rendererBus = new TypedEventBus<RendererToEditorEvents, EditorToRendererEvents>();

    (this.editorBus as unknown as { events: typeof sharedEvents }).events = sharedEvents;
    (this.rendererBus as unknown as { events: typeof sharedEvents }).events = sharedEvents;
  }

  forEditor(): EditorBus {
    return this.editorBus;
  }

  forRenderer(): RendererBus {
    return this.rendererBus;
  }

  clear(): void {
    this.editorBus.clear();
  }
}

export const eventBusHub = new SharedEventBus();
export const editorBus = eventBusHub.forEditor();
export const rendererBus = eventBusHub.forRenderer();

export const EDITOR_EVENTS: Record<keyof EditorToRendererEvents, keyof EditorToRendererEvents> = {
  PREVIEW_NODE: 'PREVIEW_NODE',
  UPDATE_TREE: 'UPDATE_TREE',
};

export const RENDERER_EVENTS: Record<keyof RendererToEditorEvents, keyof RendererToEditorEvents> = {
  OPTION_CLICKED: 'OPTION_CLICKED',
  NODE_CLICKED: 'NODE_CLICKED',
};
