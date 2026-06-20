import axios from 'axios';

export interface Character {
  name: string;
  position: { x: number; y: number };
  facing: 'left' | 'right';
}

export interface Dialogue {
  speaker: string;
  text: string;
  position: 'left' | 'right';
}

export interface Storyboard {
  id: string;
  pageNumber: number;
  sceneDescription: string;
  characters: Character[];
  dialogue: Dialogue;
  shotAngle: string;
  cameraDescription: string;
}

export interface GenerateRequest {
  text: string;
  numPages?: number;
}

export interface GenerateResponse {
  success: boolean;
  storyboards: Storyboard[];
  totalPages: number;
}

export async function generateStoryboard(text: string, numPages: number = 5): Promise<GenerateResponse> {
  const response = await axios.post<GenerateResponse>('/api/generate_storyboard', {
    text,
    numPages,
  });
  return response.data;
}
