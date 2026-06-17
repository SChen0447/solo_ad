import { useState, useCallback, useRef } from 'react';

interface UploadZoneProps {
  onFileSelect: (base64DataUrl: string) => void;
  loading: boolean;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function UploadZone({ onFileSelect, loading }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSend = useCallback(
    async (file: File) => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('仅支持 JPG、PNG、WebP 格式');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过 10MB');
        return;
      }
      const base64 = await fileToBase64(file);
      onFileSelect(base64);
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndSend(file);
    },
    [validateAndSend]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSend(file);
    },
    [validateAndSend]
  );

  return (
    <div
      style={{
        ...styles.zone,
        borderColor: dragging ? '#64ffda' : '#555',
        borderStyle: dragging ? 'solid' : 'dashed',
        background: dragging ? 'rgba(100, 255, 218, 0.05)' : 'transparent',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      {loading ? (
        <div style={styles.loadingText}>提取中...</div>
      ) : (
        <>
          <div style={styles.icon}>📁</div>
          <div style={styles.mainText}>拖拽或点击上传图片</div>
          <div style={styles.subText}>支持 JPG / PNG / WebP，最大 10MB</div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  zone: {
    width: '100%',
    minHeight: '200px',
    borderRadius: '12px',
    borderWidth: '2px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    gap: '8px',
  },
  icon: {
    fontSize: '40px',
    marginBottom: '4px',
  },
  mainText: {
    fontSize: '16px',
    color: '#e0e0e0',
  },
  subText: {
    fontSize: '13px',
    color: '#9e9e9e',
  },
  loadingText: {
    fontSize: '16px',
    color: '#64ffda',
  },
};
