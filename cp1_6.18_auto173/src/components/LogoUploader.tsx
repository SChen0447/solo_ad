import { useRef, useState, useCallback } from 'react';
import { useDesignStore } from '../store/designStore';
import { extractColorsFromImage } from '../utils/colorUtils';

const LogoUploader = () => {
  const { logoImage, setLogoImage, setRecommendedColors, setPrimaryColor } = useDesignStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isFadingIn, setIsFadingIn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'].includes(file.type)) {
      alert('请上传 PNG、JPG 或 SVG 格式的图片');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      
      const img = new Image();
      img.onload = async () => {
        const colors = await extractColorsFromImage(img, 5);
        if (colors.length > 0) {
          setRecommendedColors(colors);
          setPrimaryColor(colors[0]);
        }
      };
      img.src = result;

      setIsFadingIn(true);
      setLogoImage(result);
      setTimeout(() => setIsFadingIn(false), 300);
    };
    reader.readAsDataURL(file);
  }, [setLogoImage, setRecommendedColors, setPrimaryColor]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="logo-uploader">
      <h3 className="section-title">Logo 上传</h3>
      <div
        className={`upload-area ${isDragging ? 'dragging' : ''} ${logoImage ? 'has-logo' : ''}`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {logoImage ? (
          <div className={`logo-preview ${isFadingIn ? 'fade-in' : ''}`}>
            <img src={logoImage} alt="Logo preview" />
            <div className="upload-hint">点击更换Logo</div>
          </div>
        ) : (
          <div className="upload-placeholder">
            <div className="upload-icon">📁</div>
            <p className="upload-text">点击或拖拽上传Logo</p>
            <p className="upload-hint">支持 PNG / JPG / SVG，最大 5MB</p>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default LogoUploader;
