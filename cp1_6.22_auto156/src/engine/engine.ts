export interface DialogueLine {
  characterId: string;
  expression: string;
  text: string;
}

export interface Choice {
  id: string;
  text: string;
  nextScene: string;
}

export interface SceneData {
  id: string;
  title: string;
  background: string;
  isEnding: boolean;
  endingType?: string;
  dialogues: DialogueLine[];
  choices: Choice[];
}

export interface SaveData {
  sceneId: string;
  dialogueIndex: number;
  choiceHistory: Array<{
    sceneId: string;
    choiceId: string;
    choiceText: string;
    timestamp: number;
  }>;
  sceneTitle: string;
}

const API_BASE = '/api';

export async function loadScene(sceneId: string): Promise<SceneData> {
  const response = await fetch(`${API_BASE}/story/${sceneId}`);
  if (!response.ok) {
    throw new Error(`Failed to load scene: ${sceneId}`);
  }
  return response.json();
}

export async function saveGame(slot: number, saveData: SaveData): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ slot, saveData })
    });
    return response.ok;
  } catch (error) {
    console.error('Save failed:', error);
    return false;
  }
}

export async function loadGame(slot: number): Promise<SaveData | null> {
  try {
    const response = await fetch(`${API_BASE}/load`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ slot })
    });
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Load failed:', error);
    return null;
  }
}

export async function getAllSaves(): Promise<(SaveData | null)[]> {
  try {
    const response = await fetch(`${API_BASE}/saves`);
    if (!response.ok) return [null, null, null, null, null];
    return response.json();
  } catch (error) {
    console.error('Failed to get saves:', error);
    return [null, null, null, null, null];
  }
}

export function getCurrentDialogue(scene: SceneData, index: number): DialogueLine | null {
  if (index < 0 || index >= scene.dialogues.length) {
    return null;
  }
  return scene.dialogues[index];
}

export function isLastDialogue(scene: SceneData, index: number): boolean {
  return index >= scene.dialogues.length - 1;
}

export function hasChoices(scene: SceneData): boolean {
  return scene.choices.length > 0;
}

export function getChoices(scene: SceneData): Choice[] {
  return scene.choices;
}

export function getNextSceneFromChoice(scene: SceneData, choiceId: string): string | null {
  const choice = scene.choices.find(c => c.id === choiceId);
  return choice ? choice.nextScene : null;
}

export function calculateBranchStats(
  choiceHistory: Array<{ sceneId: string; choiceId: string }>,
  totalScenes: string[]
): Record<string, number> {
  const stats: Record<string, number> = {};
  const choices = choiceHistory.length;
  
  if (choices === 0) return stats;
  
  totalScenes.forEach(sceneId => {
    const count = choiceHistory.filter(c => c.sceneId === sceneId).length;
    stats[sceneId] = choices > 0 ? (count / choices) * 100 : 0;
  });
  
  return stats;
}
