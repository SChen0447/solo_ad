import { Template, CanvasElement, PaperSize } from '../types';

const STORAGE_KEY = 'journal_templates';

export function loadTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    return [];
  }
}

export function saveTemplates(templates: Template[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('保存模板失败', e);
  }
}

export function createTemplate(
  name: string,
  paperSize: PaperSize,
  elements: CanvasElement[],
  thumbnail: string
): Template {
  return {
    id: Math.random().toString(36).substring(2, 11),
    name,
    paperSize,
    elements: JSON.parse(JSON.stringify(elements)),
    thumbnail,
    createdAt: Date.now(),
  };
}

export function downloadTemplateJSON(template: Template): void {
  const data = JSON.stringify(template, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${template.name}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readTemplateFromFile(file: File): Promise<Template> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const tpl = JSON.parse(reader.result as string) as Template;
        resolve(tpl);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
