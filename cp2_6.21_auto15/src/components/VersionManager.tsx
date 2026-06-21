import React, { useRef, useCallback } from 'react';
import { Upload, Plus } from 'lucide-react';
import type { VersionItem } from '../types';

interface Props {
  versionList: VersionItem[];
  selectedIds: [string, string];
  onSelectVersion: (id: string, slot: 0 | 1) => void;
  onUpload: (files: FileList) => void;
}

const VersionManager: React.FC<Props> = ({ versionList, selectedIds, onSelectVersion, onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging = true;
    startX = e.pageX - (scrollRef.current?.scrollLeft || 0);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    const x = e.pageX - startX;
    scrollRef.current.scrollLeft = x;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging = false;
  }, []);

  const handleNodeClick = useCallback((id: string) => {
    if (selectedIds[0] === id || selectedIds[1] === id) return;
    if (!selectedIds[0]) {
      onSelectVersion(id, 0);
    } else if (!selectedIds[1]) {
      onSelectVersion(id, 1);
    } else {
      onSelectVersion(id, 1);
    }
  }, [selectedIds, onSelectVersion]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      e.target.value = '';
    }
  };

  const formatDate = (date: Date) => {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${m}/${d}`;
  };

  let touchStartX = 0;
  let touchScrollLeft = 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.touches[0].pageX;
    touchScrollLeft = scrollRef.current?.scrollLeft || 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!scrollRef.current) return;
    const dx = e.touches[0].pageX - touchStartX;
    scrollRef.current.scrollLeft = touchScrollLeft - dx;
  };

  return (
    <div className="timeline-area">
      <div
        ref={scrollRef}
        className="timeline-scroll"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div className="upload-zone" onClick={handleUploadClick}>
          <Plus size={20} />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {versionList.map((v, i) => {
          const isActive = selectedIds.includes(v.id);
          return (
            <React.Fragment key={v.id}>
              {i > 0 && <div className="timeline-connector" />}
              <div
                className={`timeline-node${isActive ? ' active' : ''}`}
                onClick={() => handleNodeClick(v.id)}
              >
                <div className="timeline-thumb">
                  <img src={v.thumbnailUrl} alt={v.versionNumber} draggable={false} />
                </div>
                <div className="timeline-info">
                  <div className="timeline-version">{v.versionNumber}</div>
                  <div className="timeline-date">{formatDate(v.uploadTime)}</div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default VersionManager;
