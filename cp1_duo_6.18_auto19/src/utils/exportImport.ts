import { Scene, Message, Role, SceneExport } from '../types';

export const EXPORT_VERSION = '1.0.0';

export const exportScene = (
  scene: Scene,
  roles: Role[],
  messages: Message[]
): void => {
  const data: SceneExport = {
    scene,
    roles,
    messages,
    version: EXPORT_VERSION,
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${scene.name}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importScene = (file: File): Promise<{
  scene: Scene;
  roles: Role[];
  messages: Message[];
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text) as SceneExport;

        if (!data.scene || !data.roles || !data.messages) {
          reject(new Error('Invalid scene file format'));
          return;
        }

        resolve({
          scene: data.scene,
          roles: data.roles,
          messages: data.messages,
        });
      } catch (err) {
        reject(new Error('Failed to parse JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

export const validateSceneExport = (data: unknown): data is SceneExport => {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.scene === 'object' &&
    Array.isArray(d.roles) &&
    Array.isArray(d.messages) &&
    typeof d.version === 'string'
  );
};
