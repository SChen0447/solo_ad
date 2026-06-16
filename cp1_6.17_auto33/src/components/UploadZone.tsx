import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { Invoice, OCRResponse } from '../types/invoice';
import { generateId } from '../utils/exportHelper';

interface UploadZoneProps {
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUploadStart, onUploadEnd }) => {
  const addInvoice = useInvoiceStore((s) => s.addInvoice);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      for (const file of acceptedFiles) {
        setIsProcessing(true);
        onUploadStart?.();
        setProgress(0);

        try {
          const reader = new FileReader();
          reader.onload = () => {
            setPreviewImage(reader.result as string);
          };
          reader.readAsDataURL(file);

          const formData = new FormData();
          formData.append('file', file);

          setProgress(30);

          const response = await axios.post<OCRResponse>('/api/ocr', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percent = Math.round(
                  (progressEvent.loaded / progressEvent.total) * 50
                );
                setProgress(percent);
              }
            },
          });

          setProgress(100);

          if (response.data.success) {
            const fileReader = new FileReader();
            fileReader.onload = () => {
              const invoice: Invoice = {
                id: generateId(),
                ...response.data.data,
                thumbnail: fileReader.result as string,
                original_image: fileReader.result as string,
                file_name: file.name,
                created_at: Date.now(),
              };
              addInvoice(invoice);
            };
            fileReader.readAsDataURL(file);
          }
        } catch (error) {
          console.error('OCR failed:', error);
          alert('识别失败，请重试');
        } finally {
          setTimeout(() => {
            setIsProcessing(false);
            setProgress(0);
            onUploadEnd?.();
          }, 500);
        }
      }
    },
    [addInvoice, onUploadStart, onUploadEnd]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf'],
    },
    multiple: true,
  });

  const getBorderColor = () => {
    if (isDragReject) return '#e74c3c';
    if (isDragActive || isDragAccept) return '#1abc9c';
    return '#bdc3c7';
  };

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px ${isDragActive ? 'solid' : 'dashed'} ${getBorderColor()}`,
        borderRadius: '12px',
        padding: '40px 20px',
        textAlign: 'center',
        backgroundColor: isDragActive ? 'rgba(26, 188, 156, 0.05)' : '#fff',
        cursor: 'pointer',
        transition: 'all 200ms ease',
        transform: isDragActive ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <input {...getInputProps()} />
      
      {isProcessing ? (
        <div style={{ color: '#7f8c8d' }}>
          <div
            style={{
              fontSize: '40px',
              marginBottom: '12px',
              animation: 'spin 1s linear infinite',
            }}
          >
            ⏳
          </div>
          <p style={{ fontSize: '16px', fontWeight: 500, color: '#2c3e50' }}>
            正在识别中...
          </p>
          <div
            style={{
              width: '100%',
              maxWidth: '200px',
              height: '6px',
              backgroundColor: '#ecf0f1',
              borderRadius: '3px',
              margin: '12px auto 0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#1abc9c',
                transition: 'width 300ms ease',
              }}
            />
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
          <p style={{ fontSize: '16px', fontWeight: 500, color: '#2c3e50' }}>
            拖拽发票图片到此处，或点击上传
          </p>
          <p style={{ fontSize: '13px', color: '#95a5a6', marginTop: '8px' }}>
            支持 JPG、PNG、PDF 格式
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default UploadZone;
