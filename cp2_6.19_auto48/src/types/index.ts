export interface WordData {
  id: string;
  text: string;
  weight: number;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  rotation: number;
}

export interface WordCloudConfig {
  width: number;
  height: number;
  minFontSize: number;
  maxFontSize: number;
  rotationRange: [number, number];
  colors: string[];
  backgroundColor: string;
}

export interface Theme {
  id: string;
  name: string;
  primaryColor: string;
  backgroundColor: string;
  textColors: string[];
  panelBgColor: string;
  inputBgColor: string;
  textColor: string;
}

export interface RoomMember {
  id: string;
  nickname: string;
  role: 'teacher' | 'student';
}

export interface RoomData {
  id: string;
  name: string;
  teacherId: string;
  members: RoomMember[];
  words: Map<string, number>;
  createdAt: number;
}

export type Role = 'teacher' | 'student' | null;
