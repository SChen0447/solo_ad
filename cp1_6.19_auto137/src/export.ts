import { Annotation, ExportPayload } from './types';
import { v4 as uuidv4 } from 'uuid';

export const buildExportPayload = (
  annotations: Annotation[],
  imageUrl: string | null,
  imageName: string | null
): ExportPayload => {
  const timestamp = Date.now();
  const exportId = uuidv4().slice(0, 12);

  return {
    exportId,
    timestamp,
    exportedAt: new Date(timestamp).toISOString(),
    image: {
      url: imageUrl,
      name: imageName
    },
    statistics: {
      totalAnnotations: annotations.length,
      uniqueComponents: new Set(annotations.map((a) => a.componentName).filter(Boolean)).size,
      uniqueParents: new Set(annotations.map((a) => a.parentName).filter(Boolean)).size
    },
    annotations: annotations.map((a) => ({
      id: a.id,
      position: { x: a.x, y: a.y, width: a.width, height: a.y + a.height },
      size: { width: a.width, height: a.height },
      componentName: a.componentName,
      parentName: a.parentName,
      tagType: a.tagType,
      createdAt: a.createdAt
    }))
  };
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('复制到剪贴板失败:', err);
    return false;
  }
};

export const downloadJSON = (data: ExportPayload, filename?: string): void => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const ts = data.timestamp;
  link.download = filename || `designscribe_annotations_${ts}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

export const uploadImageToServer = async (file: File): Promise<{
  success: boolean;
  url?: string;
  filename?: string;
  originalName?: string;
  error?: string;
}> => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    return result;
  } catch (err) {
    return {
      success: false,
      error: '网络错误，无法连接到服务器'
    };
  }
};

export const validateExportWithServer = async (
  annotations: Annotation[],
  imageUrl: string | null,
  imageName: string | null
): Promise<{
  success: boolean;
  data?: ExportPayload;
  error?: string;
}> => {
  try {
    const response = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annotations, imageUrl, imageName })
    });
    const result = await response.json();
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data };
  } catch (err) {
    return {
      success: false,
      error: '网络错误，使用本地数据导出'
    };
  }
};

export const generateComponentId = (index: number): string => {
  return `comp-${String(index + 1).padStart(3, '0')}`;
};

export const generateCodeSkeleton = (annotation: Annotation, allAnnotations: Annotation[]): string[] => {
  const lines: string[] = [];
  const tag = annotation.tagType || 'div';
  const name = annotation.componentName || annotation.id;
  const className = annotation.componentName
    ? ` className="${annotation.componentName}"`
    : '';

  const children = allAnnotations.filter(
    (a) => a.parentName === annotation.componentName || a.parentName === annotation.id
  );

  lines.push(`<!-- ${annotation.id} | ${Math.round(annotation.width)}x${Math.round(annotation.height)}px -->`);

  if (tag === 'img') {
    lines.push(`<${tag}${className} src="..." alt="${name}" />`);
    return lines;
  }

  if (tag === 'button') {
    lines.push(`<${tag}${className} type="button">`);
    lines.push(`  ${name}`);
    lines.push(`</${tag}>`);
    return lines;
  }

  lines.push(`<${tag}${className}>`);

  if (children.length > 0) {
    lines.push(`  <!-- 子组件: ${children.map((c) => c.componentName || c.id).join(', ')} -->`);
    children.forEach((child) => {
      const childTag = child.tagType || 'div';
      const childClass = child.componentName ? ` className="${child.componentName}"` : '';
      if (childTag === 'img') {
        lines.push(`  <${childTag}${childClass} src="..." alt="${child.componentName || child.id}" />`);
      } else if (childTag === 'button') {
        lines.push(`  <${childTag}${childClass} type="button">`);
        lines.push(`    ${child.componentName || child.id}`);
        lines.push(`  </${childTag}>`);
      } else {
        lines.push(`  <${childTag}${childClass}>`);
        lines.push(`    <!-- ${child.id} 内容区域 -->`);
        lines.push(`  </${childTag}>`);
      }
    });
  } else {
    lines.push(`  <!-- ${name} 内容区域 -->`);
  }

  lines.push(`</${tag}>`);
  return lines;
};
