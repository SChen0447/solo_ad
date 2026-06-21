import React, { useState, useEffect, useCallback, useRef } from 'react';
import MaterialGallery from './components/MaterialGallery';
import PixelPreview from './components/PixelPreview';

export interface MaterialInfo {
  id: string;
  name: string;
  type: 'PNG' | 'GIF';
  size: number;
  uploadedAt: string;
  annotationCount: number;
}

export interface MaterialDetail extends MaterialInfo {
  dataUrl: string;
  annotations: Annotation[];
}

export interface Annotation {
  id: string;
  x: number;
  y: number;
  text: string;
  createdAt: string;
}

const App: React.FC = () => {
  const [materials, setMaterials] = useState<MaterialInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialDetail | null>(null);
  const [leftWidth, setLeftWidth] = useState<number>(55);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch('/api/materials');
      const data = await res.json();
      setMaterials(data);
    } catch (e) {
      console.error('获取素材列表失败:', e);
    }
  }, []);

  const fetchMaterialDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/materials/${id}`);
      const data = await res.json();
      setSelectedMaterial(data);
    } catch (e) {
      console.error('获取素材详情失败:', e);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    if (selectedId) {
      fetchMaterialDetail(selectedId);
    } else {
      setSelectedMaterial(null);
    }
  }, [selectedId, fetchMaterialDetail]);

  const handleUpload = async (file: File, name: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    try {
      const res = await fetch('/api/materials/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setMaterials(prev => [data, ...prev]);
      setSelectedId(data.id);
    } catch (e) {
      console.error('上传失败:', e);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleAddAnnotation = async (x: number, y: number, text: string) => {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/materials/${selectedId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y, text })
      });
      const annotation: Annotation = await res.json();
      setSelectedMaterial(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          annotations: [...prev.annotations, annotation]
        };
      });
      setMaterials(prev =>
        prev.map(m =>
          m.id === selectedId
            ? { ...m, annotationCount: m.annotationCount + 1 }
            : m
        )
      );
    } catch (e) {
      console.error('保存标注失败:', e);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(85, Math.max(20, newWidth)));
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        background: '#181825'
      }}
    >
      <div
        style={{
          width: `${leftWidth}%`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <MaterialGallery
          materials={materials}
          selectedId={selectedId}
          onUpload={handleUpload}
          onSelect={handleSelect}
        />
      </div>

      <div
        onMouseDown={handleMouseDown}
        style={{
          width: isDragging ? '6px' : '4px',
          cursor: 'col-resize',
          background: isDragging ? '#CBA6F7' : '#45475A',
          transition: 'background 0.2s ease, width 0.2s ease',
          flexShrink: 0,
          zIndex: 10
        }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            (e.currentTarget as HTMLDivElement).style.background = '#A78BFA';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            (e.currentTarget as HTMLDivElement).style.background = '#45475A';
          }
        }}
      />

      <div
        style={{
          width: `calc(${100 - leftWidth}% - ${isDragging ? '6px' : '4px'})`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <PixelPreview
          material={selectedMaterial}
          onAddAnnotation={handleAddAnnotation}
        />
      </div>
    </div>
  );
};

export default App;
