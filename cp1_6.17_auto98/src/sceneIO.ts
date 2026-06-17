import axios from 'axios';
import { SceneData, CurveData } from './types';

export class SceneIO {
  export(sceneData: SceneData): Promise<{ success: boolean; filename?: string; downloadUrl?: string; error?: string }> {
    return axios
      .post('/api/export', sceneData)
      .then(res => res.data)
      .catch(err => ({ success: false, error: err.message || '网络错误' }));
  }

  async importFromFile(file: File): Promise<{ success: boolean; data?: SceneData; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/api/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    } catch (err: any) {
      const fileData = await this.readFileDirectly(file);
      if (fileData) {
        return { success: true, data: fileData };
      }
      return { success: false, error: err.message || '读取文件失败' };
    }
  }

  private readFileDirectly(file: File): Promise<SceneData | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = reader.result as string;
          const parsed = JSON.parse(text);
          resolve({
            version: parsed.version || '1.0',
            curves: (parsed.curves || []) as CurveData[],
            exportTime: parsed.exportTime || new Date().toISOString()
          });
        } catch {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    });
  }

  downloadBrowser(sceneData: SceneData, filename?: string) {
    const blob = new Blob([JSON.stringify(sceneData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = filename || `scene_${Date.now()}.scene`;
    a.download = safeName.endsWith('.scene') ? safeName : safeName + '.scene';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
