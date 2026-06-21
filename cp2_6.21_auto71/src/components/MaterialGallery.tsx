import React, { useState, useRef } from 'react';
import type { MaterialInfo } from '../App';

interface Props {
  materials: MaterialInfo[];
  selectedId: string | null;
  onUpload: (file: File, name: string) => void;
  onSelect: (id: string) => void;
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const MaterialGallery: React.FC<Props> = ({ materials, selectedId, onUpload, onSelect }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('仅支持 PNG 和 GIF 格式');
      return;
    }

    const defaultName = file.name.replace(/\.(png|gif)$/i, '');
    const name = prompt('请输入素材名称：', defaultName);
    if (name === null) return;
    onUpload(file, name || defaultName);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#181825',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #313244'
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#CDD6F4', marginBottom: '4px' }}>
            🎮 Pixel Vault
          </h1>
          <p style={{ fontSize: '12px', color: '#6C7086' }}>
            共 {materials.length} 个素材
          </p>
        </div>
        <div>
          <button
            onClick={handleUploadClick}
            style={{
              width: '160px',
              height: '44px',
              borderRadius: '22px',
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            }}
          >
            <span>⬆</span> 上传素材
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/gif"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px'
        }}
      >
        {materials.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6C7086'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🖼️</div>
            <p style={{ fontSize: '14px' }}>暂无素材，点击右上角按钮上传</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 240px)',
              gap: '16px',
              justifyContent: 'flex-start'
            }}
          >
            {materials.map((m) => {
              const isSelected = selectedId === m.id;
              const isHovered = hoveredId === m.id;
              const tagColor = m.type === 'PNG' ? '#4ADE80' : '#FACC15';
              const tagTextColor = m.type === 'PNG' ? '#000' : '#000';

              return (
                <div
                  key={m.id}
                  onClick={() => onSelect(m.id)}
                  onMouseEnter={() => setHoveredId(m.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    width: '240px',
                    borderRadius: '8px',
                    background: 'linear-gradient(180deg, #1E1E2E 0%, #2D2D3F 100%)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    border: isSelected ? '2px solid #A78BFA' : '2px solid transparent',
                    transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                    boxShadow: isHovered
                      ? '0 8px 24px rgba(0,0,0,0.3)'
                      : '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out, border-color 0.2s ease'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      zIndex: 2,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: tagColor,
                      color: tagTextColor
                    }}
                  >
                    {m.type}
                  </div>

                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      background: '#11111B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      imageRendering: 'pixelated'
                    }}
                  >
                    <MaterialThumbnail id={m.id} />
                  </div>

                  <div style={{ padding: '12px' }}>
                    <div
                      style={{
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 500,
                        marginBottom: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {m.name}
                    </div>
                    <div
                      style={{
                        color: '#6C7086',
                        fontSize: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    >
                      <span>{formatDate(m.uploadedAt)}</span>
                      {m.annotationCount > 0 && (
                        <span style={{ color: '#A78BFA' }}>
                          📍 {m.annotationCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const MaterialThumbnail: React.FC<{ id: string }> = ({ id }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    fetch(`/api/materials/${id}`)
      .then(r => r.json())
      .then(d => {
        if (mounted) setDataUrl(d.dataUrl);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [id]);

  if (!dataUrl) {
    return (
      <div style={{ color: '#45475A', fontSize: '12px' }}>加载中...</div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt=""
      style={{
        maxWidth: '85%',
        maxHeight: '85%',
        imageRendering: 'pixelated',
        objectFit: 'contain'
      }}
    />
  );
};

export default MaterialGallery;
