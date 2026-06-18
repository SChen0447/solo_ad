import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import AnnotationCanvas from '../components/AnnotationCanvas';
import CommentPanel from '../components/CommentPanel';
import type { Annotation } from '../types';

export default function DesignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentDesign, fetchDesign, clearCurrentDesign, selectedAnnotationId } = useStore();

  useEffect(() => {
    if (id) {
      fetchDesign(id);
    }
    return () => {
      clearCurrentDesign();
    };
  }, [id, fetchDesign, clearCurrentDesign]);

  if (!currentDesign) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  const selectedAnnotation: Annotation | undefined = currentDesign.annotations.find(
    a => a.id === selectedAnnotationId
  );

  return (
    <div className="design-detail-page">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← 返回列表
        </button>
        <h1 className="detail-title">{currentDesign.name}</h1>
        <div className="header-info">
          <span>共 {currentDesign.annotations.length} 个标注</span>
        </div>
      </div>
      <div className="detail-content">
        <div className="canvas-container">
          <AnnotationCanvas
            imageUrl={currentDesign.imageData || ''}
            annotations={currentDesign.annotations}
            designId={currentDesign.id}
          />
        </div>
        <CommentPanel
          designId={currentDesign.id}
          annotation={selectedAnnotation || null}
        />
      </div>
    </div>
  );
}
