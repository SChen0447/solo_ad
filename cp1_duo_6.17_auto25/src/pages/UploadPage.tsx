import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseDependencies } from '../utils/parseDependencies';
import { useGraphContext } from '../context/GraphContext';
import type { UploadedFile } from '../types';

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const formatDate = (date: Date): string => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { setGraphData } = useGraphContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      setError(null);

      const newFiles: UploadedFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.name.toLowerCase().endsWith('.zip')) {
          setError(`文件 "${file.name}" 不是 ZIP 格式，请上传 .zip 文件`);
          continue;
        }
        newFiles.push({
          name: file.name,
          size: file.size,
          lastModified: new Date(file.lastModified),
          file
        });
      }

      if (newFiles.length > 0) {
        setUploadedFiles((prev) => [...prev, ...newFiles]);
      }
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      e.target.value = '';
    },
    [handleFiles]
  );

  const removeFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleParse = useCallback(async () => {
    if (uploadedFiles.length === 0) return;

    setIsParsing(true);
    setParseProgress(0);
    setError(null);

    try {
      const allResults = await Promise.all(
        uploadedFiles.map(async (uploaded, index) => {
          const result = await parseDependencies(uploaded.file);
          setParseProgress(((index + 1) / uploadedFiles.length) * 100);
          return result;
        })
      );

      if (allResults.length > 0) {
        const combined = allResults[0];
        setGraphData(combined);
        navigate('/graph');
      }
    } catch (err) {
      setError(`解析失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsParsing(false);
      setParseProgress(0);
    }
  }, [uploadedFiles, setGraphData, navigate]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        backgroundColor: '#1e1e2e',
        color: '#e0e0e0',
        overflow: 'auto'
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          width: '100%',
          animation: 'fadeIn 0.5s ease-out'
        }}
      >
        <h1
          style={{
            fontSize: '36px',
            fontWeight: 700,
            marginBottom: '8px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #6c6cf0 0%, #4a9eff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          代码依赖关系可视化工具
        </h1>
        <p
          style={{
            color: '#a0a0b0',
            textAlign: 'center',
            marginBottom: '40px',
            fontSize: '16px'
          }}
        >
          上传项目 ZIP 包，自动解析代码文件间的导入依赖关系
        </p>

        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            position: 'relative',
            padding: '60px 40px',
            border: `2px dashed ${isDragging ? '#6c6cf0' : '#4a4a5e'}`,
            borderRadius: '16px',
            backgroundColor: isDragging ? 'rgba(108, 108, 240, 0.1)' : '#2a2a3e',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginBottom: '24px'
          }}
        >
          {isDragging && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(108, 108, 240, 0.2)',
                borderRadius: '16px',
                pointerEvents: 'none'
              }}
            />
          )}
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              backgroundColor: 'rgba(108, 108, 240, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6c6cf0"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            {isDragging ? '释放以上传文件' : '拖拽 ZIP 文件到此处'}
          </p>
          <p style={{ color: '#a0a0b0', fontSize: '14px' }}>
            或点击选择文件
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            multiple
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              marginBottom: '24px',
              animation: 'fadeIn 0.3s ease'
            }}
          >
            {error}
          </div>
        )}

        {uploadedFiles.length > 0 && (
          <div
            style={{
              backgroundColor: '#2a2a3e',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
                已上传文件 ({uploadedFiles.length})
              </h3>
              <button
                onClick={() => setUploadedFiles([])}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a0a0b0',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'color 0.3s ease'
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#ef4444')}
                onMouseOut={(e) => (e.currentTarget.style.color = '#a0a0b0')}
              >
                清空列表
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {uploadedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    backgroundColor: '#36364e',
                    borderRadius: '12px',
                    animation: 'fadeIn 0.2s ease-out',
                    animationDelay: `${index * 0.05}s`,
                    animationFillMode: 'both',
                    transition: 'background-color 0.3s ease'
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = '#40405a')
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = '#36364e')
                  }
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(249, 115, 22, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontWeight: 500, marginBottom: '2px' }}>
                        {file.name}
                      </p>
                      <p
                        style={{
                          color: '#a0a0b0',
                          fontSize: '13px'
                        }}
                      >
                        {formatFileSize(file.size)} · {formatDate(file.lastModified)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#a0a0b0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor =
                        'rgba(239, 68, 68, 0.2)';
                      e.currentTarget.style.color = '#ef4444';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#a0a0b0';
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isParsing && (
          <div
            style={{
              marginBottom: '24px',
              backgroundColor: '#2a2a3e',
              borderRadius: '12px',
              padding: '16px',
              animation: 'fadeIn 0.3s ease'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #6c6cf0',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}
              />
              <span>正在解析依赖关系...</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: '#36364e',
                borderRadius: '3px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #6c6cf0, #4a9eff)',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                  width: `${parseProgress}%`
                }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleParse}
          disabled={uploadedFiles.length === 0 || isParsing}
          style={{
            width: '100%',
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: 600,
            color: '#ffffff',
            backgroundColor:
              uploadedFiles.length === 0 || isParsing ? '#4a4a5e' : '#6c6cf0',
            border: 'none',
            borderRadius: '12px',
            cursor:
              uploadedFiles.length === 0 || isParsing ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => {
            if (uploadedFiles.length > 0 && !isParsing) {
              e.currentTarget.style.backgroundColor = '#8a8aff';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(108, 108, 240, 0.3)';
            }
          }}
          onMouseOut={(e) => {
            if (uploadedFiles.length > 0 && !isParsing) {
              e.currentTarget.style.backgroundColor = '#6c6cf0';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {isParsing ? (
            <>
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid #ffffff',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}
              />
              解析中...
            </>
          ) : (
            <>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              解析依赖关系
            </>
          )}
        </button>

        <div
          style={{
            marginTop: '32px',
            padding: '20px',
            backgroundColor: '#2a2a3e',
            borderRadius: '12px',
            border: '1px solid #36364e'
          }}
        >
          <h4
            style={{
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '12px',
              color: '#e0e0e0'
            }}
          >
            支持的文件类型
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px'
            }}
          >
            {[
              { label: '组件文件', color: '#4a9eff', ext: '.tsx, .jsx' },
              { label: '工具函数', color: '#4ade80', ext: '.ts, .js' },
              { label: '配置文件', color: '#f97316', ext: 'config.*' },
              { label: '样式文件', color: '#a855f7', ext: '.css, .scss' }
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: item.color
                  }}
                />
                <div>
                  <div style={{ fontSize: '13px', color: '#e0e0e0' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#a0a0b0' }}>
                    {item.ext}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
