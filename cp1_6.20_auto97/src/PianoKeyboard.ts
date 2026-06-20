import { AudioEngine } from './AudioEngine';

interface PianoKey {
  note: string;
  octave: number;
  isBlack: boolean;
  keyBinding: string;
  element: HTMLElement;
}

export class PianoKeyboard {
  private container: HTMLElement;
  private audioEngine: AudioEngine;
  private keys: PianoKey[] = [];
  private currentNoteElement: HTMLElement;
  private onNoteOn: ((note: string, octave: number) => void) | null = null;
  private onNoteOff: ((note: string, octave: number) => void) | null = null;
  private pressedKeys: Set<string> = new Set();

  constructor(container: HTMLElement, currentNoteElement: HTMLElement, audioEngine: AudioEngine) {
    this.container = container;
    this.currentNoteElement = currentNoteElement;
    this.audioEngine = audioEngine;
    this.createKeyboard();
    this.bindEvents();
  }

  private createKeyboard(): void {
    const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const blackKeys = ['C#', 'D#', null, 'F#', 'G#', 'A#', null];
    const whiteBindings = ['A', 'S', 'D', 'F', 'G', 'H', 'J'];
    const blackBindings = ['W', 'E', '', 'T', 'Y', 'U', ''];
    const octave = 4;

    whiteKeys.forEach((note, index) => {
      const whiteKey = document.createElement('div');
      whiteKey.className = 'white-key';
      whiteKey.dataset.note = note;
      whiteKey.dataset.octave = String(octave);
      whiteKey.innerHTML = `
        <span class="key-label">${whiteBindings[index]}</span>
        <span class="note-label">${note}${octave}</span>
      `;
      this.container.appendChild(whiteKey);

      this.keys.push({
        note,
        octave,
        isBlack: false,
        keyBinding: whiteBindings[index].toLowerCase(),
        element: whiteKey
      });

      if (blackKeys[index]) {
        const blackKey = document.createElement('div');
        blackKey.className = 'black-key';
        blackKey.dataset.note = blackKeys[index]!;
        blackKey.dataset.octave = String(octave);
        blackKey.innerHTML = `
          <span class="key-label">${blackBindings[index]}</span>
          <span class="note-label">${blackKeys[index]}${octave}</span>
        `;

        const whiteKeyWidth = 40;
        const blackKeyWidth = 24;
        const leftOffset = whiteKeyWidth * (index + 1) - blackKeyWidth / 2 - 1;
        blackKey.style.left = `${leftOffset}px`;

        this.container.appendChild(blackKey);

        this.keys.push({
          note: blackKeys[index]!,
          octave,
          isBlack: true,
          keyBinding: blackBindings[index].toLowerCase(),
          element: blackKey
        });
      }
    });

    this.keys.sort((a, b) => {
      const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      return notes.indexOf(a.note) - notes.indexOf(b.note);
    });
  }

  private bindEvents(): void {
    this.keys.forEach((key) => {
      key.element.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.handleNoteOn(key.note, key.octave);
      });

      key.element.addEventListener('mouseup', () => {
        this.handleNoteOff(key.note, key.octave);
      });

      key.element.addEventListener('mouseleave', () => {
        if (this.pressedKeys.has(`${key.note}${key.octave}`)) {
          this.handleNoteOff(key.note, key.octave);
        }
      });

      key.element.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleNoteOn(key.note, key.octave);
      });

      key.element.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.handleNoteOff(key.note, key.octave);
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const key = this.keys.find((k) => k.keyBinding === e.key.toLowerCase());
      if (key && !this.pressedKeys.has(`${key.note}${key.octave}`)) {
        e.preventDefault();
        this.handleNoteOn(key.note, key.octave);
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = this.keys.find((k) => k.keyBinding === e.key.toLowerCase());
      if (key) {
        e.preventDefault();
        this.handleNoteOff(key.note, key.octave);
      }
    });
  }

  private handleNoteOn(note: string, octave: number): void {
    this.audioEngine.resume();
    this.audioEngine.noteOn(note, octave);
    this.setKeyActive(note, octave, true);
    this.currentNoteElement.textContent = `${note}${octave}`;
    this.pressedKeys.add(`${note}${octave}`);

    if (this.onNoteOn) {
      this.onNoteOn(note, octave);
    }
  }

  private handleNoteOff(note: string, octave: number): void {
    this.audioEngine.noteOff(note, octave);
    this.setKeyActive(note, octave, false);
    this.pressedKeys.delete(`${note}${octave}`);

    if (this.pressedKeys.size === 0) {
      this.currentNoteElement.textContent = '—';
    }

    if (this.onNoteOff) {
      this.onNoteOff(note, octave);
    }
  }

  private setKeyActive(note: string, octave: number, active: boolean): void {
    const key = this.keys.find((k) => k.note === note && k.octave === octave);
    if (key) {
      if (active) {
        key.element.classList.add('active');
      } else {
        key.element.classList.remove('active');
      }
    }
  }

  public setOnNoteOn(callback: (note: string, octave: number) => void): void {
    this.onNoteOn = callback;
  }

  public setOnNoteOff(callback: (note: string, octave: number) => void): void {
    this.onNoteOff = callback;
  }

  public pressKey(note: string, octave: number): void {
    this.setKeyActive(note, octave, true);
    this.currentNoteElement.textContent = `${note}${octave}`;
  }

  public releaseKey(note: string, octave: number): void {
    this.setKeyActive(note, octave, false);
    this.currentNoteElement.textContent = '—';
  }

  public releaseAllKeys(): void {
    this.keys.forEach((k) => k.element.classList.remove('active'));
    this.currentNoteElement.textContent = '—';
    this.pressedKeys.clear();
  }

  public getKeys(): PianoKey[] {
    return this.keys;
  }
}
