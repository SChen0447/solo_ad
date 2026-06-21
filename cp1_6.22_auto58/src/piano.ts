export interface PianoKey {
  note: string;
  isBlack: boolean;
  whiteIndex: number;
  keyboardKey: string | null;
  element: HTMLElement;
  labelElement: HTMLElement;
}

export interface PianoOptions {
  container: HTMLElement;
  onKeyDown: (note: string) => void;
  onKeyUp: (note: string) => void;
}

const WHITE_KEY_WIDTH = 40;
const WHITE_KEY_HEIGHT = 180;
const BLACK_KEY_WIDTH = 24;
const BLACK_KEY_HEIGHT = 110;

const OCTAVE_PATTERN: Array<{ note: string; isBlack: boolean }> = [
  { note: 'C', isBlack: false },
  { note: 'C#', isBlack: true },
  { note: 'D', isBlack: false },
  { note: 'D#', isBlack: true },
  { note: 'E', isBlack: false },
  { note: 'F', isBlack: false },
  { note: 'F#', isBlack: true },
  { note: 'G', isBlack: false },
  { note: 'G#', isBlack: true },
  { note: 'A', isBlack: false },
  { note: 'A#', isBlack: true },
  { note: 'B', isBlack: false },
];

const START_OCTAVE = 2;
const END_OCTAVE = 6;
const EXTRA_END_NOTE = 'C6';

const KEYBOARD_MAP: Record<string, string> = {
  'a': 'C4',
  's': 'D4',
  'd': 'E4',
  'f': 'F4',
  'g': 'G4',
  'h': 'A4',
  'j': 'B4',
  'k': 'C5',
  'l': 'D5',
  'w': 'C#4',
  'e': 'D#4',
  't': 'F#4',
  'y': 'G#4',
  'u': 'A#4',
};

export class Piano {
  private container: HTMLElement;
  private keys: PianoKey[] = [];
  private keyByNote: Map<string, PianoKey> = new Map();
  private keyByKeyboard: Map<string, PianoKey> = new Map();
  private pressedKeys: Set<string> = new Set();
  private onKeyDown: (note: string) => void;
  private onKeyUp: (note: string) => void;

  constructor(options: PianoOptions) {
    this.container = options.container;
    this.onKeyDown = options.onKeyDown;
    this.onKeyUp = options.onKeyUp;
    this.buildKeys();
    this.render();
    this.bindKeyboard();
  }

  private buildKeys(): void {
    let whiteIndex = 0;

    for (let octave = START_OCTAVE; octave < END_OCTAVE; octave++) {
      for (const pattern of OCTAVE_PATTERN) {
        const note = `${pattern.note}${octave}`;
        this.addKey(note, pattern.isBlack, whiteIndex);
        if (!pattern.isBlack) {
          whiteIndex++;
        }
      }
    }

    this.addKey(EXTRA_END_NOTE, false, whiteIndex);
  }

  private addKey(note: string, isBlack: boolean, whiteIndex: number): void {
    const keyboardEntry = Object.entries(KEYBOARD_MAP).find(([, n]) => n === note);
    const keyboardKey = keyboardEntry ? keyboardEntry[0].toUpperCase() : null;

    const element = document.createElement('div');
    element.className = `piano-key piano-key-${isBlack ? 'black' : 'white'}`;
    element.dataset.note = note;
    element.style.position = 'absolute';
    element.style.cursor = 'pointer';
    element.style.transition = 'all 0.15s cubic-bezier(0.68, -0.55, 0.265, 1.55)';

    if (isBlack) {
      element.style.width = `${BLACK_KEY_WIDTH}px`;
      element.style.height = `${BLACK_KEY_HEIGHT}px`;
      element.style.backgroundColor = '#1a202c';
      element.style.borderRadius = '0 0 4px 4px';
      element.style.boxShadow = `
        0 1px 0 rgba(255, 255, 255, 0.08) inset,
        0 -2px 4px rgba(255, 255, 255, 0.04) inset,
        0 2px 4px rgba(0, 0, 0, 0.6)
      `;
      element.style.zIndex = '2';
    } else {
      element.style.width = `${WHITE_KEY_WIDTH}px`;
      element.style.height = `${WHITE_KEY_HEIGHT}px`;
      element.style.backgroundColor = '#ffffff';
      element.style.border = '1px solid #cbd5e0';
      element.style.borderRadius = '0 0 6px 6px';
      element.style.boxShadow = `
        1px 0 0 #a0aec0,
        0 1px 1px #a0aec0,
        inset 0 -2px 4px rgba(160, 174, 192, 0.2)
      `;
      element.style.zIndex = '1';
    }

    const labelElement = document.createElement('span');
    labelElement.style.position = 'absolute';
    labelElement.style.bottom = isBlack ? '8px' : '14px';
    labelElement.style.left = '50%';
    labelElement.style.transform = 'translateX(-50%)';
    labelElement.style.fontSize = isBlack ? '9px' : '11px';
    labelElement.style.fontFamily = "'Times New Roman', Georgia, serif";
    labelElement.style.color = isBlack ? 'rgba(255,255,255,0)' : 'rgba(160,174,192,0)';
    labelElement.style.fontWeight = '500';
    labelElement.style.pointerEvents = 'none';
    labelElement.style.transition = 'color 0.15s ease';
    labelElement.textContent = keyboardKey || note;
    element.appendChild(labelElement);

    const key: PianoKey = { note, isBlack, whiteIndex, keyboardKey, element, labelElement };
    this.keys.push(key);
    this.keyByNote.set(note, key);

    if (keyboardKey) {
      this.keyByKeyboard.set(keyboardKey.toLowerCase(), key);
    }

    element.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.pressKey(note);
    });
    element.addEventListener('mouseup', () => {
      this.releaseKey(note);
    });
    element.addEventListener('mouseleave', () => {
      this.releaseKey(note);
    });
    element.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.pressKey(note);
    });
    element.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.releaseKey(note);
    });
  }

  private render(): void {
    const totalWhiteKeys = this.keys.filter(k => !k.isBlack).length;
    const containerWidth = totalWhiteKeys * WHITE_KEY_WIDTH;

    this.container.style.width = `${containerWidth}px`;
    this.container.style.height = `${WHITE_KEY_HEIGHT}px`;
    this.container.style.position = 'relative';

    for (const key of this.keys) {
      if (!key.isBlack) {
        key.element.style.left = `${key.whiteIndex * WHITE_KEY_WIDTH}px`;
        key.element.style.top = '0';
      } else {
        const prevWhiteIndex = key.whiteIndex - 1;
        const leftOffset = (prevWhiteIndex + 1) * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2;
        key.element.style.left = `${leftOffset}px`;
        key.element.style.top = '0';
      }
      this.container.appendChild(key.element);
    }
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      const pianoKey = this.keyByKeyboard.get(key);
      if (pianoKey) {
        e.preventDefault();
        this.pressKey(pianoKey.note);
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      const pianoKey = this.keyByKeyboard.get(key);
      if (pianoKey) {
        e.preventDefault();
        this.releaseKey(pianoKey.note);
      }
    });
  }

  public pressKey(note: string, fromPlayback: boolean = false): void {
    if (this.pressedKeys.has(note)) return;

    const key = this.keyByNote.get(note);
    if (!key) return;

    this.pressedKeys.add(note);

    if (key.isBlack) {
      key.element.style.backgroundColor = '#2b6cb0';
      key.element.style.transform = 'translateY(2px)';
      key.element.style.boxShadow = `
        0 1px 0 rgba(255, 255, 255, 0.04) inset,
        0 1px 2px rgba(0, 0, 0, 0.4)
      `;
    } else {
      key.element.style.backgroundColor = '#bee3f8';
      key.element.style.transform = 'translateY(3px)';
      key.element.style.boxShadow = `
        1px 0 0 #a0aec0,
        inset 0 0 0 1px rgba(66, 153, 225, 0.15)
      `;
    }
    key.labelElement.style.color = key.isBlack ? 'rgba(255,255,255,0.9)' : 'rgba(49,130,206,0.9)';

    if (!fromPlayback) {
      this.onKeyDown(note);
    }
  }

  public releaseKey(note: string, fromPlayback: boolean = false): void {
    if (!this.pressedKeys.has(note)) return;

    const key = this.keyByNote.get(note);
    if (!key) return;

    this.pressedKeys.delete(note);

    key.element.style.backgroundColor = key.isBlack ? '#1a202c' : '#ffffff';
    key.element.style.transform = 'translateY(0)';

    if (key.isBlack) {
      key.element.style.boxShadow = `
        0 1px 0 rgba(255, 255, 255, 0.08) inset,
        0 -2px 4px rgba(255, 255, 255, 0.04) inset,
        0 2px 4px rgba(0, 0, 0, 0.6)
      `;
    } else {
      key.element.style.boxShadow = `
        1px 0 0 #a0aec0,
        0 1px 1px #a0aec0,
        inset 0 -2px 4px rgba(160, 174, 192, 0.2)
      `;
    }
    key.labelElement.style.color = key.isBlack ? 'rgba(255,255,255,0)' : 'rgba(160,174,192,0)';

    if (!fromPlayback) {
      this.onKeyUp(note);
    }
  }

  public releaseAll(): void {
    for (const note of Array.from(this.pressedKeys)) {
      this.releaseKey(note);
    }
  }

  public getAllNotes(): string[] {
    return this.keys.map(k => k.note);
  }
}
