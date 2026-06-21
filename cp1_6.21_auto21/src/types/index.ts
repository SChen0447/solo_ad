export type ToolType = 'arrow' | 'rectangle' | 'text' | 'brush';

export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  type: ToolType;
  userId: string;
  userName: string;
  userAvatar: string;
  timestamp: number;
  sessionId: string;
  color: string;
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  startPoint: Point;
  endPoint: Point;
  strokeWidth: number;
}

export interface RectangleAnnotation extends BaseAnnotation {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeWidth: number;
  fillOpacity: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

export interface BrushAnnotation extends BaseAnnotation {
  type: 'brush';
  points: Point[];
  strokeWidth: number;
}

export type Annotation = ArrowAnnotation | RectangleAnnotation | TextAnnotation | BrushAnnotation;

export interface Session {
  id: string;
  name: string;
  imageUrl: string;
  createdAt: number;
  createdBy: string;
}

export interface ReplayState {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  speed: number;
  visibleAnnotations: string[];
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export type ServerEvent = 
  | { type: 'annotation:added'; data: Annotation }
  | { type: 'annotation:updated'; data: Annotation }
  | { type: 'annotation:deleted'; data: { id: string; sessionId: string } }
  | { type: 'user:joined'; data: User }
  | { type: 'user:left'; data: { userId: string } };

export type ClientEvent =
  | { type: 'annotation:add'; data: Annotation }
  | { type: 'annotation:update'; data: Annotation }
  | { type: 'annotation:delete'; data: { id: string; sessionId: string } }
  | { type: 'session:join'; data: { sessionId: string; user: User } }
  | { type: 'session:leave'; data: { sessionId: string; userId: string } };
