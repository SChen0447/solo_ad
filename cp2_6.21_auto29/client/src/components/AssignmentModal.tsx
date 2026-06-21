import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import type { Attachment, Assignment } from '../types';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (assignment: Assignment) => void;
  lessonTitle: string;
  courseId: string;
  lessonId: number;
}

const AssignmentModal = ({ 
  isOpen, 
  onClose, 
  onSubmitSuccess, 
  lessonTitle, 
  courseId, 
  lessonId 
}: AssignmentModalProps) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setAttachments([]);
      setUploadProgress({});
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const validateFile = (file: File): string | null => {
    const validExts = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExts.includes(ext)) {
      return `不支持的文件类型: ${file.name}。仅支持 .pdf, .docx, .png, .jpg`;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      return `文件过大: ${file.name}。最大支持 10MB`;
    }
    
    return null;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File): Promise<Attachment> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(prev => ({
            ...prev,
            [tempId]: progress
          }));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('服务器响应解析失败'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || `上传失败: ${xhr.status}`));
          } catch (e) {
            reject(new Error(`上传失败: ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('网络错误，请检查网络连接'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('上传已取消'));
      });

      formData.append('files', file);
      formData.append('lessonId', String(lessonId));
      formData.append('lessonTitle', lessonTitle);
      
      xhr.open('POST', `/api/assignments/${courseId}/upload`);
      xhr.send(formData);
    });
  };

  const handleFiles = async (files: File[]) => {
    setError(null);
    
    const validationErrors: string[] = [];
    const validFiles: File[] = [];
    
    files.forEach(file => {
      const validationError = validateFile(file);
      if (validationError) {
        validationErrors.push(validationError);
      } else {
        validFiles.push(file);
      }
    });

    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
    }

    for (const file of validFiles) {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const tempAttachment: Attachment = {
        id: tempId,
        name: file.name,
        url: URL.createObjectURL(file),
        size: file.size,
        type: file.type
      };
      
      setAttachments(prev => [...prev, tempAttachment]);
      setUploadProgress(prev => ({ ...prev, [tempId]: 0 }));

      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(prev => ({
                ...prev,
                [tempId]: progress
              }));
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                setAttachments(prev => 
                  prev.map(a => a.id === tempId 
                    ? { ...a, id: response.id || tempId, url: response.url || a.url }
                    : a
                  )
                );
                setUploadProgress(prev => {
                  const newProgress = { ...prev };
                  delete newProgress[tempId];
                  return newProgress;
                });
                resolve();
              } catch (e) {
                reject(new Error('服务器响应解析失败'));
              }
            } else {
              try {
                const error = JSON.parse(xhr.responseText);
                reject(new Error(error.error || `上传失败: ${xhr.status}`));
              } catch (e) {
                reject(new Error(`上传失败: ${xhr.status}`));
              }
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('网络错误，请检查网络连接'));
          });

          formData.append('file', file);
          xhr.open('POST', `/api/assignments/${courseId}/upload`);
          xhr.send(formData);
        });
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : '文件上传失败');
        setAttachments(prev => prev.filter(a => a.id !== tempId));
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[tempId];
          return newProgress;
        });
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[id];
      return newProgress;
    });
  };

  const handleSubmit = async () => {
    const content = editorRef.current?.innerHTML || '';
    
    if (!content.trim() && attachments.length === 0) {
      setError('请填写作业内容或上传附件');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const assignment = await api.submitAssignmentWithFiles({
        courseId,
        lessonId,
        lessonTitle,
        content,
        attachments,
        onProgress: (progress) => {
          setUploadProgress({ submit: progress });
        }
      });

      setUploadProgress({});
      onSubmitSuccess?.(assignment);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>提交作业 - {lessonTitle}</h2>
          <button onClick={onClose} style={closeButtonStyle} disabled={isSubmitting}>✕</button>
        </div>

        <div style={bodyStyle}>
          {error && (
            <div style={errorBoxStyle}>
              <span style={{ marginRight: '8px' }}>⚠️</span>
              <span style={{ whiteSpace: 'pre-line' }}>{error}</span>
            </div>
          )}

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
              placeholder="请输入作业内容..."
            />
          </div>

          <div style={uploadSectionStyle}>
            <div
              ref={dropZoneRef}
              style={{
                ...dropZoneStyle,
                borderColor: isDragging ? '#7C3AED' : '#E5E7EB',
                backgroundColor: isDragging ? '#F5F3FF' : '#FAFAFA'
              }}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
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

            {Object.keys(uploadProgress).length > 0 && (
              <div style={progressSectionStyle}>
                {Object.entries(uploadProgress).map(([id, progress]) => (
                  <div key={id} style={progressItemStyle}>
                    <div style={progressBarContainerStyle}>
                      <div style={progressBarStyle}>
                        <div style={{ ...progressFillStyle, width: `${progress}%` }} />
                      </div>
                      <span style={progressTextStyle}>{progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {attachments.length > 0 && (
              <div style={attachmentsListStyle}>
                {attachments.map(file => (
                  <div key={file.id} style={fileItemStyle}>
                    <div style={fileInfoStyle}>
                      <span style={fileNameStyle}>📄 {file.name}</span>
                      <span style={fileSizeStyle}>({formatFileSize(file.size)})</span>
                    </div>
                    <button 
                      onClick={() => removeAttachment(file.id)} 
                      style={removeButtonStyle}
                      disabled={uploadProgress[file.id] !== undefined}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={footerStyle}>
          <button onClick={onClose} style={cancelButtonStyle} disabled={isSubmitting}>取消</button>
          <button onClick={handleSubmit} style={submitButtonStyle} disabled={isSubmitting}>
            {isSubmitting ? '提交中...' : '提交作业'}
          </button>
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
  gap: '16px'
};

const errorBoxStyle: React.CSSProperties = {
  padding: '12px 16px',
  backgroundColor: '#FEF2F2',
  border: '1px solid #FECACA',
  borderRadius: '8px',
  fontSize: '13px',
  color: '#991B1B',
  display: 'flex',
  alignItems: 'flex-start'
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

const progressSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const progressItemStyle: React.CSSProperties = {
  width: '100%'
};

const progressBarContainerStyle: React.CSSProperties = {
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
  textAlign: 'right',
  flexShrink: 0
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

const fileInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

const fileNameStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#4B5563'
};

const fileSizeStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#9CA3AF'
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
