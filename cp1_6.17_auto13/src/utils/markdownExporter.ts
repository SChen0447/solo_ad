export interface Snippet {
  id: string;
  code: string;
  startLine: number;
  endLine: number;
  timestamp: Date;
  language: string;
}

export interface Annotation {
  id: string;
  type: 'TODO' | 'FIXME' | 'HACK';
  content: string;
  line: number;
  rawText: string;
}

export function generateMarkdownReport(
  snippets: Snippet[],
  annotations: Annotation[],
  language: string = 'javascript'
): string {
  const lines: string[] = [];

  lines.push('# 代码片段与标注报告');
  lines.push('');
  lines.push(`_生成时间: ${new Date().toLocaleString()}_`);
  lines.push('');

  lines.push('## 📝 代码片段');
  lines.push('');

  if (snippets.length === 0) {
    lines.push('> 暂无保存的代码片段');
    lines.push('');
  } else {
    snippets.forEach((snippet, index) => {
      const timeStr = new Date(snippet.timestamp).toLocaleString();
      lines.push(`### 片段 ${index + 1} (第 ${snippet.startLine}-${snippet.endLine} 行)`);
      lines.push(`> ${timeStr}`);
      lines.push('');
      lines.push('```' + language);
      lines.push(snippet.code);
      lines.push('```');
      lines.push('');
    });
  }

  const groupedAnnotations: Record<string, Annotation[]> = {
    TODO: [],
    FIXME: [],
    HACK: []
  };

  annotations.forEach(ann => {
    groupedAnnotations[ann.type].push(ann);
  });

  lines.push('## 📌 标注汇总');
  lines.push('');

  const totalCount = annotations.length;
  lines.push(`共 ${totalCount} 条标注：TODO ${groupedAnnotations.TODO.length} 条 | FIXME ${groupedAnnotations.FIXME.length} 条 | HACK ${groupedAnnotations.HACK.length} 条`);
  lines.push('');

  lines.push('### ✅ TODO (待办事项)');
  lines.push('');
  if (groupedAnnotations.TODO.length === 0) {
    lines.push('> 暂无 TODO 标注');
  } else {
    groupedAnnotations.TODO.forEach(ann => {
      lines.push(`- **[第 ${ann.line} 行]** ${ann.content}`);
    });
  }
  lines.push('');

  lines.push('### 🔧 FIXME (需要修复)');
  lines.push('');
  if (groupedAnnotations.FIXME.length === 0) {
    lines.push('> 暂无 FIXME 标注');
  } else {
    groupedAnnotations.FIXME.forEach(ann => {
      lines.push(`- **[第 ${ann.line} 行]** ${ann.content}`);
    });
  }
  lines.push('');

  lines.push('### ⚠️ HACK (临时解决方案)');
  lines.push('');
  if (groupedAnnotations.HACK.length === 0) {
    lines.push('> 暂无 HACK 标注');
  } else {
    groupedAnnotations.HACK.forEach(ann => {
      lines.push(`- **[第 ${ann.line} 行]** ${ann.content}`);
    });
  }
  lines.push('');

  return lines.join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }
}

export function parseAnnotations(code: string): Annotation[] {
  const annotations: Annotation[] = [];
  const lines = code.split('\n');
  const pattern = /^\s*\/\/\s*(TODO|FIXME|HACK)[:\s]*(.*)$/i;

  lines.forEach((line, index) => {
    const match = line.match(pattern);
    if (match) {
      const type = match[1].toUpperCase() as 'TODO' | 'FIXME' | 'HACK';
      annotations.push({
        id: `ann-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        content: match[2].trim() || '(无内容)',
        line: index + 1,
        rawText: line.trim()
      });
    }
  });

  return annotations;
}
