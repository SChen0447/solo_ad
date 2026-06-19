export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
}

export type NoteColor = 'yellow' | 'pink' | 'lightblue';

export interface Note {
  id: string;
  x: number;
  y: number;
  text: string;
  color: NoteColor;
}

export interface SnapshotPayload {
  strokes: Stroke[];
  notes: Note[];
}

export type MessageType =
  | 'stroke-add'
  | 'note-add'
  | 'note-move'
  | 'note-edit'
  | 'note-delete'
  | 'note-color'
  | 'snapshot'
  | 'clear'
  | 'user-count';

export interface WSMessage {
  type: MessageType;
  payload: any;
}
