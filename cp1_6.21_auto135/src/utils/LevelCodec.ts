export type NoteType = 0 | 1 | 2;

export const NOTE_COLORS = {
  0: 0xff4444,
  1: 0x4444ff,
  2: 0x44ff44
} as const;

export const NOTE_KEYS = {
  0: 'A',
  1: 'S',
  2: 'D'
} as const;

export interface GridNote {
  type: NoteType;
  row: number;
  col: number;
}

export interface GridData {
  rows: number;
  cols: number;
  bpm: number;
  notes: GridNote[];
  name: string;
}

export class LevelCodec {
  public static encode(gridData: GridData): string {
    const data = {
      r: gridData.rows,
      c: gridData.cols,
      b: gridData.bpm,
      n: gridData.name,
      nt: gridData.notes.map(note => ({
        t: note.type,
        r: note.row,
        c: note.col
      }))
    };

    const jsonStr = JSON.stringify(data);
    const uint8 = new TextEncoder().encode(jsonStr);
    let binaryStr = '';
    for (let i = 0; i < uint8.length; i++) {
      binaryStr += String.fromCharCode(uint8[i]);
    }

    return btoa(binaryStr);
  }

  public static decode(encoded: string): GridData {
    const binaryStr = atob(encoded);
    const uint8 = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      uint8[i] = binaryStr.charCodeAt(i);
    }

    const jsonStr = new TextDecoder().decode(uint8);
    const data = JSON.parse(jsonStr);

    return {
      rows: data.r,
      cols: data.c,
      bpm: data.b,
      name: data.n || '未命名关卡',
      notes: data.nt.map((n: { t: number; r: number; c: number }) => ({
        type: n.t as NoteType,
        row: n.r,
        col: n.c
      }))
    };
  }

  public static validate(encoded: string): boolean {
    try {
      const data = this.decode(encoded);
      return (
        typeof data.rows === 'number' &&
        typeof data.cols === 'number' &&
        typeof data.bpm === 'number' &&
        Array.isArray(data.notes) &&
        data.notes.every(
          (n: GridNote) =>
            typeof n.type === 'number' &&
            typeof n.row === 'number' &&
            typeof n.col === 'number'
        )
      );
    } catch {
      return false;
    }
  }
}
