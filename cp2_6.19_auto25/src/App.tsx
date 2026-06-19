import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import DocumentArea from './DocumentArea';
import AnnotationPanel from './AnnotationPanel';
import {
  Annotation,
  AnnotationComment,
  FilterType,
  updateHighlightStyle,
} from './highlightUtils';

const STORAGE_KEY = 'doc-annotation-data';

const SAMPLE_DOCUMENT = `在数字化转型的浪潮中，团队协作的效率决定了项目的成败。传统的文档审阅流程往往依赖于邮件往来和口头沟通，这种方式不仅效率低下，而且容易出现信息遗漏和理解偏差。

在线文档批注与协作系统应运而生，它将讨论直接锚定在文档的具体内容上，让每一位团队成员都能精确地表达自己的观点。当你在文档中选中一段文字并添加批注时，你的反馈就有了明确的上下文，其他协作者可以立即理解你的意图。

批注系统支持多级讨论，团队成员可以在同一条批注下展开深入对话。当讨论达成共识后，可以将批注标记为已解决，这样既保留了讨论记录，又不会干扰后续的审阅工作。已解决的批注随时可以重新打开，确保灵活性。

良好的文档协作工具应该让沟通更加透明和高效。通过高亮标记、评论讨论和状态追踪，团队成员可以清晰地了解每一条反馈的处理进度，避免重复沟通和信息丢失。

文档协作的未来在于实时性和精准性。当每一位参与者都能在正确的时间、正确的位置发出自己的声音，整个团队的智慧就能得到最大化的发挥。这不仅是效率的提升，更是协作文化的进化。`;

function loadAnnotations(): Annotation[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {}
  return [];
}

function saveAnnotations(annotations: Annotation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
  } catch {}
}

export default function App() {
  const [annotations, setAnnotations] = useState<Annotation[]>(loadAnnotations);
  const [filterType, setFilterType] = useState<FilterType>('all');

  useEffect(() => {
    saveAnnotations(annotations);
  }, [annotations]);

  const handleCreateAnnotation = useCallback(
    (selectedText: string, startOffset: number, endOffset: number) => {
      const newAnnotation: Annotation = {
        id: uuidv4(),
        selectedText,
        startOffset,
        endOffset,
        resolved: false,
        createdAt: Date.now(),
        comments: [],
      };
      setAnnotations((prev) => [...prev, newAnnotation]);
      return newAnnotation;
    },
    []
  );

  const handleAddComment = useCallback(
    (annotationId: string, content: string) => {
      const newComment: AnnotationComment = {
        id: uuidv4(),
        author: '当前用户',
        content,
        createdAt: Date.now(),
      };
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === annotationId
            ? { ...a, comments: [...a.comments, newComment] }
            : a
        )
      );
    },
    []
  );

  const handleToggleResolved = useCallback((annotationId: string) => {
    setAnnotations((prev) =>
      prev.map((a) => {
        if (a.id === annotationId) {
          const resolved = !a.resolved;
          setTimeout(() => updateHighlightStyle(annotationId, resolved), 0);
          return { ...a, resolved };
        }
        return a;
      })
    );
  }, []);

  const filteredAnnotations = annotations.filter((a) => {
    if (filterType === 'unresolved') return !a.resolved;
    if (filterType === 'resolved') return a.resolved;
    return true;
  });

  const filteredCount = filteredAnnotations.length;

  return (
    <div style={styles.container}>
      <DocumentArea
        documentContent={SAMPLE_DOCUMENT}
        annotations={annotations}
        onCreateAnnotation={handleCreateAnnotation}
      />
      <AnnotationPanel
        annotations={filteredAnnotations}
        allAnnotations={annotations}
        filterType={filterType}
        filteredCount={filteredCount}
        onFilterChange={setFilterType}
        onAddComment={handleAddComment}
        onToggleResolved={handleToggleResolved}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    width: '100%',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
};
