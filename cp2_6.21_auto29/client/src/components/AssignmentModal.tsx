import { useState, useRef, useCallback, useEffect } from 'react';
import type { Attachment } from '../types';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, attachments: Attachment[]) => void;
  lessonTitle: string;
}

const AssignmentModal = ({ isOpen, onClose, onSubmit, lessonTitle }: AssignmentModalProps) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setAttachments([]);
      setUploadProgress(null);
    }
  }, [isOpen]);

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const validExts = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];
    const validFiles = files.filter(file => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return validExts.includes(ext) && file.size <= 10 * 1024 * 1024;
    });

    validFiles.forEach((file) => {
      setUploadProgress(0);
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setUploadProgress(null);
          
          const newAttachment: Attachment = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            url: URL.createObjectURL(file),
            size: file.size,
            type: file.type
          };
          setAttachments(prev => [...prev, newAttachment]);
        } else {
          setUploadProgress(Math.round(progress));
        }
      }, 100);
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = () => {
    const htmlContent = editorRef.current?.innerHTML || '';
    onSubmit(htmlContent, attachments);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>提交作业 - {lessonTitle}</h2>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        <div style={bodyStyle}>
          <div style={editorContainerStyle}>
            <div style={toolbarStyle}>
              <button onClick={() => handleFormat('bold')} style={toolButtonStyle} title="加粗">
                <strong>B</strong>
              </button>
              <button onClick={() => handleFormat('italic')} style={toolButtonStyle} title="斜体">
                <em>I</em>
              </button>
              <div style={dividerStyle} />
              <button onClick={() => handleFormat('insertUnorderedList')} style={toolButtonStyle} title="无序列表">
                • 列表
              </button>
              <button onClick={() => handleFormat('insertOrderedList')} style={toolButtonStyle} title="有序列表">
                1. 列表
              </button>
              <div style={dividerStyle} />
              <button 
                onClick={() => {
                  const url = prompt('请输入图片链接');
                  if (url) handleFormat('insertImage', url);
                }} 
                style={toolButtonStyle} 
                title="插入图片"
              >
                🖼️
              </button>
            </div>
            <div
              ref={editorRef}
              contentEditable
              style={editorStyle}
            />
          </div>

          <div style={uploadSectionStyle}>
            <div
              style={{
                ...dropZoneStyle,
                borderColor: isDragging ? '#7C3AED' : '#E5E7EB',
                backgroundColor: isDragging ? '#F5F3FF' : '#FAFAFA'
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={uploadIconStyle}>📎</div>
              <p style={uploadTextStyle}>拖拽文件到此处或点击上传</p>
              <p style={uploadHintStyle}>支持 .pdf / .docx / .png / .jpg，单文件最大 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>

            {uploadProgress !== null && (
              <div style={progressContainerStyle}>
                <div style={progressBarStyle}>
                  <div style={{ ...progressFillStyle, width: `${uploadProgress}%` }} />
                </div>
                <span style={progressTextStyle}>{uploadProgress}%</span>
              </div>
            )}

            {attachments.length > 0 && (
              <div style={attachmentsListStyle}>
                {attachments.map(file => (
                  <div key={file.id} style={fileItemStyle}>
                    <span style={fileNameStyle}>📄 {file.name}</span>
                    <button onClick={() => removeAttachment(file.id)} style={removeButtonStyle}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={footerStyle}>
          <button onClick={onClose} style={cancelButtonStyle}>取消</button>
          <button onClick={handleSubmit} style={submitButtonStyle}>提交作业</button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  zIndex: 1000,
  animation: 'fadeIn 0.3s ease'
};

const modalStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '600px',
  maxHeight: '80vh',
  backgroundColor: '#FFFFFF',
  borderRadius: '16px 16px 0 0',
  display: 'flex',
  flexDirection: 'column',
  animation: 'slideInBottom 0.3s ease'
};

const headerStyle: React.CSSProperties = {
  padding: '20px 24px',
  borderBottom: '1px solid #E5E7EB',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
};

const titleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#1F2937'
};

const closeButtonStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: '#F3F4F6',
  cursor: 'pointer',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const bodyStyle: React.CSSProperties = {
  padding: '24px',
  overflowY: 'auto',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '24px'
};

const editorContainerStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  overflow: 'hidden'
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '8px 12px',
  backgroundColor: '#F9FAFB',
  borderBottom: '1px solid #E5E7EB'
};

const toolButtonStyle: React.CSSProperties = {
  padding: '6px 10px',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  borderRadius: '4px',
  fontSize: '14px',
  color: '#4B5563'
};

const dividerStyle: React.CSSProperties = {
  width: '1px',
  height: '20px',
  backgroundColor: '#E5E7EB',
  margin: '0 4px'
};

const editorStyle: React.CSSProperties = {
  minHeight: '150px',
  padding: '12px',
  outline: 'none',
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#1F2937'
};

const uploadSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
};

const dropZoneStyle: React.CSSProperties = {
  border: '2px dashed #E5E7EB',
  borderRadius: '8px',
  padding: '32px',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

const uploadIconStyle: React.CSSProperties = {
  fontSize: '32px',
  marginBottom: '8px'
};

const uploadTextStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#4B5563',
  marginBottom: '4px'
};

const uploadHintStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#9CA3AF'
};

const progressContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const progressBarStyle: React.CSSProperties = {
  flex: 1,
  height: '6px',
  backgroundColor: '#E5E7EB',
  borderRadius: '3px',
  overflow: 'hidden'
};

const progressFillStyle: React.CSSProperties = {
  height: '100%',
  backgroundColor: '#7C3AED',
  borderRadius: '3px',
  transition: 'width 0.2s ease'
};

const progressTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#6B7280',
  width: '40px',
  textAlign: 'right'
};

const attachmentsListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const fileItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px',
  backgroundColor: '#F9FAFB',
  borderRadius: '6px'
};

const fileNameStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#4B5563'
};

const removeButtonStyle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  fontSize: '12px',
  color: '#9CA3AF'
};

const footerStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderTop: '1px solid #E5E7EB',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px'
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '8px',
  border: '1px solid #E5E7EB',
  backgroundColor: '#FFFFFF',
  color: '#4B5563',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer'
};

const submitButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#7C3AED',
  color: '#FFFFFF',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer'
};

export default AssignmentModal;
