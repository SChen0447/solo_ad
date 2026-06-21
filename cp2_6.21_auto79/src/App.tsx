import { useState, useEffect, useRef, useCallback } from 'react';
import MaterialGallery from './components/MaterialGallery';
import PixelPreview from './components/PixelPreview';
import type { Material, Annotation } from './types';

const DEFAULT_USERNAME = '匿名';

export default function App() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [leftWidth, setLeftWidth] = useState(55);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (selectedMaterial) {
      fetchAnnotations(selectedMaterial.id);
    } else {
      setAnnotations([]);
    }
  }, [selectedMaterial?.id]);

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/materials');
      const data = await res.json();
      setMaterials(data);
      if (selectedMaterial) {
        const stillExists = data.find((m: Material) => m.id === selectedMaterial.id);
        if (!stillExists) {
          setSelectedMaterial(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch materials:', err);
    }
  };

  const fetchAnnotations = async (materialId: string) => {
    try {
      const res = await fetch(`/api/materials/${materialId}/annotations`);
      const data = await res.json();
      setAnnotations(data);
    } catch (err) {
      console.error('Failed to fetch annotations:', err);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = prompt('请输入素材名称：', file.name.replace(/\.[^/.]+$/, ''));
    if (!name) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);

    try {
      const res = await fetch('/api/materials', {
        method: 'POST',
        body: formData,
      });
      const newMaterial = await res.json();
      setMaterials(prev => [...prev, newMaterial]);
      setSelectedMaterial(newMaterial);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('上传失败，请确保是 PNG 或 GIF 文件');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSelectMaterial = useCallback((material: Material) => {
    setSelectedMaterial(material);
  }, []);

  const handleSaveAnnotation = useCallback(async (x: number, y: number, color: string, text: string) => {
    if (!selectedMaterial) return null;

    try {
      const res = await fetch(`/api/materials/${selectedMaterial.id}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x,
          y,
          color,
          text,
          author: DEFAULT_USERNAME,
        }),
      });
      const newAnnotation: Annotation = await res.json();
      setAnnotations(prev => [...prev, newAnnotation]);
      await fetchMaterials();
      return newAnnotation;
    } catch (err) {
      console.error('Save annotation failed:', err);
      return null;
    }
  }, [selectedMaterial]);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.max(30, Math.min(75, newWidth)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#181825',
      }}
    >
      <div style={{
        height: 60,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #313244',
        backgroundColor: '#1E1E2E',
      }}>
        <h1 style={{
          fontSize: 20,
          fontWeight: 600,
          color: '#CDD6F4',
        }}>
          🎮 像素素材管理台
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#9399B2' }}>
            当前用户：{DEFAULT_USERNAME}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div
          style={{
            width: `${leftWidth}%`,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid #313244',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 16, fontWeight: 500 }}>
              素材库 <span style={{ color: '#9399B2', fontSize: 13 }}>({materials.length})</span>
            </span>
            <button
              onClick={handleUploadClick}
              style={{
                width: 160,
                height: 44,
                borderRadius: 22,
                background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
                transition: 'transform 0.2s ease-out',
                transform: 'scale(1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
            >
              + 上传素材
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/gif"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
          <MaterialGallery
            materials={materials}
            selectedId={selectedMaterial?.id || null}
            onSelect={handleSelectMaterial}
          />
        </div>

        <div
          onMouseDown={handleDragStart}
          style={{
            width: isDragging ? 6 : 4,
            cursor: 'col-resize',
            backgroundColor: isDragging ? '#CBA6F7' : '#45475A',
            transition: 'background-color 0.2s, width 0.2s',
            flexShrink: 0,
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.backgroundColor = '#A78BFA';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.backgroundColor = '#45475A';
            }
          }}
        />

        <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
          <PixelPreview
            material={selectedMaterial}
            annotations={annotations}
            currentUser={DEFAULT_USERNAME}
            onSaveAnnotation={handleSaveAnnotation}
          />
        </div>
      </div>
    </div>
  );
}
