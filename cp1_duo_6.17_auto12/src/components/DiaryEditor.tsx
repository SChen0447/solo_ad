import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { MusicResult, UploadedMedia, UploadProgress, CreateDiaryRequest } from '../types';
import { musicApi } from '../api/musicApi';
import { diaryApi } from '../api/diaryApi';

interface DiaryEditorProps {
  onSave: (data: CreateDiaryRequest) => void;
  onClose: () => void;
  initialDate?: Date;
}

const MAX_TEXT_LENGTH = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_DURATION = 30;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

const emojiList = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '⭐', '🌟', '✨', '💫', '🎵', '🎶', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎬', '🎭', '🎨', '🎰', '🎲', '🎯', '🎳', '🎮', '🎰'];

export const DiaryEditor: React.FC<DiaryEditorProps> = ({ onSave, onClose, initialDate }) => {
  const [date, setDate] = useState<Date>(initialDate || new Date());
  const [text, setText] = useState('');
  const [textLength, setTextLength] = useState(0);
  const [selectedMusic, setSelectedMusic] = useState<MusicResult | null>(null);
  const [mediaList, setMediaList] = useState<UploadedMedia[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  
  const [musicSearchQuery, setMusicSearchQuery] = useState('');
  const [musicResults, setMusicResults] = useState<MusicResult[]>([]);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [showMusicResults, setShowMusicResults] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const quillRef = useRef<ReactQuill>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const isTextTooLong = textLength > MAX_TEXT_LENGTH;

  const handleTextChange = (content: string) => {
    setText(content);
    const plainText = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    setTextLength(plainText.length);
  };

  const handleMusicSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setMusicResults([]);
      setShowMusicResults(false);
      return;
    }
    
    setIsSearchingMusic(true);
    try {
      const results = await musicApi.searchSongs(query);
      setMusicResults(results);
      setShowMusicResults(true);
    } catch (error) {
      console.error('Music search error:', error);
    } finally {
      setIsSearchingMusic(false);
    }
  }, []);

  const handleMusicSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setMusicSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      handleMusicSearch(query);
    }, 300);
  };

  const selectMusic = (music: MusicResult) => {
    setSelectedMusic(music);
    setShowMusicResults(false);
    setMusicSearchQuery('');
    setMusicResults([]);
  };

  const removeMusic = () => {
    setSelectedMusic(null);
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return '文件大小不能超过5MB';
    }
    
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !file.type.startsWith('video/')) {
      return '不支持的文件格式';
    }
    
    return null;
  };

  const handleFileSelect = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const error = validateFile(file);
      
      if (error) {
        alert(error);
        continue;
      }
      
      try {
        const media = await diaryApi.uploadFile(file, (progress) => {
          setUploadProgress(progress);
        });
        
        setMediaList(prev => [...prev, media]);
      } catch (error) {
        console.error('Upload failed:', error);
        alert('上传失败，请重试');
      } finally {
        setUploadProgress(null);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeMedia = (id: string) => {
    setMediaList(prev => prev.filter(m => m.id !== id));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      videoChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        const videoFile = new File([videoBlob], `recording_${Date.now()}.webm`, { type: 'video/webm' });
        
        const videoUrl = URL.createObjectURL(videoBlob);
        const thumbnailUrl = await generateVideoThumbnail(videoUrl);
        
        try {
          const media = await diaryApi.uploadFile(videoFile, (progress) => {
            setUploadProgress(progress);
          });
          
          setMediaList(prev => [...prev, {
            ...media,
            thumbnailUrl
          }]);
        } catch (error) {
          console.error('Video upload failed:', error);
          alert('视频上传失败');
        } finally {
          setUploadProgress(null);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_VIDEO_DURATION) {
            stopRecording();
            return MAX_VIDEO_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('无法访问摄像头，请检查权限设置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    setIsRecording(false);
  };

  const generateVideoThumbnail = (videoUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      
      video.onloadeddata = () => {
        video.currentTime = 1;
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve('');
        }
      };
      
      video.onerror = () => resolve('');
    });
  };

  const insertEmoji = (emoji: string) => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection();
      
      if (range) {
        quill.insertText(range.index, emoji);
        quill.setSelection(range.index + emoji.length);
      } else {
        quill.insertText(quill.getLength(), emoji);
      }
    }
    setShowEmojiPicker(false);
  };

  const handleSubmit = () => {
    if (isTextTooLong) {
      alert(`文字内容不能超过${MAX_TEXT_LENGTH}字`);
      return;
    }
    
    const data: CreateDiaryRequest = {
      date: date.toISOString().split('T')[0],
      text,
      musicInfo: selectedMusic,
      mediaPaths: mediaList
    };
    
    onSave(data);
  };

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const modules = {
    toolbar: [
      ['bold', 'italic'],
      ['clean']
    ]
  };

  const formats = ['bold', 'italic'];

  return (
    <div 
      className="editor-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.3s ease-out',
        padding: '20px'
      }}
    >
      <div 
        className="editor-modal"
        style={{
          backgroundColor: '#1E1E1E',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'slideUp 0.3s ease-out',
          position: 'relative'
        }}
      >
        <div 
          className="editor-header"
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h2 style={{ color: '#E0E0E0', fontSize: '20px', fontWeight: 600 }}>
            记录音乐时光
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px 12px',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
        </div>

        <div className="editor-content" style={{ padding: '24px' }}>
          <div className="date-picker-section" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '14px' }}>
              日期
            </label>
            <DatePicker
              selected={date}
              onChange={(date: Date | null) => date && setDate(date)}
              dateFormat="yyyy年MM月dd日"
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '8px',
                color: '#E0E0E0',
                fontSize: '14px',
                backdropFilter: 'blur(10px)',
                outline: 'none',
                transition: 'all 0.2s'
              }}
            />
          </div>

          <div className="music-search-section" style={{ marginBottom: '24px', position: 'relative' }}>
            <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '14px' }}>
              配乐
            </label>
            
            {selectedMusic ? (
              <div 
                className="selected-music"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <img 
                  src={selectedMusic.coverUrl} 
                  alt={selectedMusic.title}
                  style={{ width: '48px', height: '48px', borderRadius: '6px' }}
                />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ color: '#E0E0E0', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedMusic.title}
                  </div>
                  <div style={{ color: '#888', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedMusic.artist}
                  </div>
                </div>
                <button
                  onClick={removeMusic}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="music-search-input-wrapper">
                <input
                  type="text"
                  value={musicSearchQuery}
                  onChange={handleMusicSearchInput}
                  onFocus={() => musicResults.length > 0 && setShowMusicResults(true)}
                  placeholder="搜索歌曲或歌手..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '8px',
                    color: '#E0E0E0',
                    fontSize: '14px',
                    backdropFilter: 'blur(10px)',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#64B5F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(100, 181, 246, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                
                {isSearchingMusic && (
                  <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    border: '2px solid #333',
                    borderTopColor: '#64B5F6',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                )}
                
                {showMusicResults && musicResults.length > 0 && (
                  <div 
                    className="music-results"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      maxHeight: '300px',
                      overflowY: 'auto',
                      backgroundColor: '#2A2A2A',
                      borderRadius: '8px',
                      marginTop: '4px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                      zIndex: 100,
                      animation: 'fadeIn 0.2s ease-out'
                    }}
                  >
                    {musicResults.map((music) => (
                      <div
                        key={music.id}
                        className="music-result-item"
                        onClick={() => selectMusic(music)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <img 
                          src={music.coverUrl} 
                          alt={music.title}
                          style={{ width: '40px', height: '40px', borderRadius: '4px' }}
                        />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ color: '#E0E0E0', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {music.title}
                          </div>
                          <div style={{ color: '#888', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {music.artist}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-editor-section" style={{ marginBottom: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ color: '#888', fontSize: '14px' }}>
                记录内容
              </label>
              <span style={{ 
                color: isTextTooLong ? '#EF5350' : '#888',
                fontSize: '12px'
              }}>
                {textLength}/{MAX_TEXT_LENGTH}
              </span>
            </div>
            
            <div style={{ position: 'relative' }}>
              <ReactQuill
                ref={quillRef}
                value={text}
                onChange={handleTextChange}
                modules={modules}
                formats={formats}
                placeholder="今天的心情是怎样的？"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: `1px solid ${isTextTooLong ? '#EF5350' : 'rgba(255, 255, 255, 0.18)'}`,
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s'
                }}
              />
              
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  bottom: '12px',
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                😊
              </button>
              
              {showEmojiPicker && (
                <div 
                  className="emoji-picker"
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    width: '300px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    backgroundColor: '#2A2A2A',
                    borderRadius: '8px',
                    padding: '8px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gap: '4px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    zIndex: 100,
                    marginBottom: '8px',
                    animation: 'fadeIn 0.2s ease-out'
                  }}
                >
                  {emojiList.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => insertEmoji(emoji)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="media-upload-section" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '14px' }}>
              图片 / 视频
            </label>
            
            <div 
              className="upload-area"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? '#64B5F6' : 'rgba(255, 255, 255, 0.2)'}`,
                borderRadius: '8px',
                padding: '32px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragging ? 'rgba(100, 181, 246, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                transition: 'all 0.2s',
                marginBottom: '16px'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
              <div style={{ color: '#888', fontSize: '14px' }}>
                拖动或点击上传图片
              </div>
              <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                支持 JPG、PNG、GIF，最大 5MB
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                style={{ display: 'none' }}
              />
            </div>
            
            {uploadProgress && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '60px',
                  height: '60px',
                  margin: '0 auto'
                }}>
                  <svg width="60" height="60" viewBox="0 0 60 60">
                    <circle
                      cx="30"
                      cy="30"
                      r="25"
                      fill="none"
                      stroke="#333"
                      strokeWidth="4"
                    />
                    <circle
                      cx="30"
                      cy="30"
                      r="25"
                      fill="none"
                      stroke="#64B5F6"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${uploadProgress.progress * 1.57} 157`}
                      transform="rotate(-90 30 30)"
                      style={{ transition: 'stroke-dasharray 0.3s' }}
                    />
                  </svg>
                  <span style={{ 
                    position: 'absolute', 
                    color: '#64B5F6', 
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {uploadProgress.progress}%
                  </span>
                </div>
                <div style={{ 
                  color: '#888', 
                  fontSize: '12px', 
                  textAlign: 'center',
                  marginTop: '8px'
                }}>
                  {uploadProgress.filename}
                </div>
              </div>
            )}
            
            <div 
              className="video-record-section"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '16px'
              }}
            >
              <button
                onClick={isRecording ? stopRecording : startRecording}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: isRecording ? '#EF5350' : 'rgba(255, 255, 255, 0.06)',
                  border: `1px solid ${isRecording ? '#EF5350' : 'rgba(255, 255, 255, 0.18)'}`,
                  borderRadius: '8px',
                  color: isRecording ? '#fff' : '#E0E0E0',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
              >
                <div 
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: isRecording ? '2px' : '50%',
                    backgroundColor: isRecording ? '#fff' : '#EF5350',
                    animation: isRecording ? 'pulse 1s infinite' : 'none'
                  }}
                />
                {isRecording ? `停止录制 (${MAX_VIDEO_DURATION - recordingTime}s)` : '录制视频'}
              </button>
              
              {isRecording && (
                <div style={{
                  width: `${(recordingTime / MAX_VIDEO_DURATION) * 100}%`,
                  height: '4px',
                  backgroundColor: '#64B5F6',
                  borderRadius: '2px',
                  transition: 'width 0.3s'
                }} />
              )}
            </div>
            
            {mediaList.length > 0 && (
              <div 
                className="media-preview-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: '12px'
                }}
              >
                {mediaList.map((media) => (
                  <div 
                    key={media.id}
                    className="media-preview-item"
                    style={{
                      position: 'relative',
                      paddingTop: '100%',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      animation: 'fadeIn 0.3s ease-out'
                    }}
                  >
                    <img 
                      src={media.thumbnailUrl || media.url} 
                      alt={media.filename}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    {media.type === 'video' && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: 0,
                          height: 0,
                          borderLeft: '8px solid white',
                          borderTop: '5px solid transparent',
                          borderBottom: '5px solid transparent',
                          marginLeft: '2px'
                        }} />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMedia(media.id);
                      }}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div 
          className="editor-footer"
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#888',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isTextTooLong || (!text.trim() && !selectedMusic && mediaList.length === 0)}
            style={{
              padding: '10px 24px',
              backgroundColor: isTextTooLong || (!text.trim() && !selectedMusic && mediaList.length === 0) 
                ? '#333' 
                : '#64B5F6',
              border: 'none',
              borderRadius: '8px',
              color: isTextTooLong || (!text.trim() && !selectedMusic && mediaList.length === 0) 
                ? '#666' 
                : 'white',
              cursor: isTextTooLong || (!text.trim() && !selectedMusic && mediaList.length === 0) 
                ? 'not-allowed' 
                : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!isTextTooLong && (text.trim() || selectedMusic || mediaList.length > 0)) {
                e.currentTarget.style.backgroundColor = '#42A5F5';
              }
            }}
            onMouseLeave={(e) => {
              if (!isTextTooLong && (text.trim() || selectedMusic || mediaList.length > 0)) {
                e.currentTarget.style.backgroundColor = '#64B5F6';
              }
            }}
          >
            保存
          </button>
        </div>
      </div>

      <style>{`
        .quill {
          color: #E0E0E0;
        }
        .quill .ql-editor {
          min-height: 120px;
          font-size: 14px;
          color: #E0E0E0;
        }
        .quill .ql-editor.ql-blank::before {
          color: #555;
          font-style: normal;
        }
        .quill .ql-toolbar {
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          background-color: transparent !important;
        }
        .quill .ql-toolbar .ql-stroke {
          stroke: #888;
        }
        .quill .ql-toolbar .ql-fill {
          fill: #888;
        }
        .quill .ql-toolbar .ql-active .ql-stroke {
          stroke: #64B5F6;
        }
        .quill .ql-toolbar .ql-active .ql-fill {
          fill: #64B5F6;
        }
        .quill .ql-container {
          border: none !important;
        }
        .quill strong {
          color: #fff;
        }
        .quill em {
          color: #B0BEC5;
        }
        
        .react-datepicker-wrapper {
          width: 100%;
        }
        .react-datepicker__input-container input {
          width: 100%;
          padding: 12px 16px;
          background-color: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          color: #E0E0E0;
          font-size: 14px;
          backdrop-filter: blur(10px);
          outline: none;
        }
        .react-datepicker__input-container input:focus {
          border-color: #64B5F6;
          box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.2);
        }
        .react-datepicker {
          background-color: #2A2A2A !important;
          border: none !important;
          border-radius: 8px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
        }
        .react-datepicker__header {
          background-color: #333 !important;
          border-bottom: none !important;
        }
        .react-datepicker__current-month,
        .react-datepicker__day-name {
          color: #E0E0E0 !important;
        }
        .react-datepicker__day {
          color: #888 !important;
        }
        .react-datepicker__day:hover {
          background-color: rgba(100, 181, 246, 0.2) !important;
        }
        .react-datepicker__day--selected {
          background-color: #64B5F6 !important;
          color: white !important;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @media (max-width: 768px) {
          .editor-overlay {
            padding: 0 !important;
          }
          .editor-modal {
            max-height: 100vh;
            border-radius: 16px 16px 0 0;
          }
        }
      `}</style>
    </div>
  );
};
