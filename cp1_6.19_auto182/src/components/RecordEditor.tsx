import { useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, Upload, X, Camera, CheckCircle } from 'lucide-react';
import type { MealType, Photo } from '../types';
import { MEAL_TYPE_LABELS } from '../types';

interface RecordEditorProps {
  onSave: () => void;
  onCancel: () => void;
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MEAL_BG_COLORS: Record<MealType, string> = {
  breakfast: 'bg-orange-100',
  lunch: 'bg-green-100',
  dinner: 'bg-orange-200',
  snack: 'bg-green-200',
};

const MEAL_SELECTED_COLORS: Record<MealType, string> = {
  breakfast: 'bg-orange-400 text-white',
  lunch: 'bg-green-500 text-white',
  dinner: 'bg-orange-500 text-white',
  snack: 'bg-green-400 text-white',
};

function RecordEditor({ onSave, onCancel }: RecordEditorProps) {
  const { date } = useParams<{ date: string }>();
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedMealIndex, setSelectedMealIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const commentLength = comment.length;
  const isOverLimit = commentLength > 200;

  const generateThumbnail = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 200;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          const endTime = performance.now();
          console.log(`Thumbnail generated in ${endTime - startTime}ms`);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const newPhotos: Photo[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const thumbnail = await generateThumbnail(file);
        
        newPhotos.push({
          id: uuidv4(),
          url: thumbnail,
          order: photos.length + i,
        });
        
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      
      setPhotos(prev => [...prev, ...newPhotos]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    } catch (err) {
      console.error('Failed to process images:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [photos.length, generateThumbnail]);

  const removePhoto = (photoId: string) => {
    setPhotos(prev => {
      const filtered = prev.filter(p => p.id !== photoId);
      return filtered.map((p, i) => ({ ...p, order: i }));
    });
  };

  const handleMealTypeSelect = (type: MealType, index: number) => {
    setMealType(type);
    setSelectedMealIndex(index);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (photos.length === 0) {
      alert('请至少上传一张食物照片');
      return;
    }
    
    if (isOverLimit) {
      alert('点评内容不能超过200字');
      return;
    }

    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          mealType,
          photos: photos.sort((a, b) => a.order - b.order),
          comment: comment.trim(),
        }),
      });
      
      if (res.ok) {
        onSave();
      } else {
        alert('保存失败，请重试');
      }
    } catch (err) {
      console.error('Failed to save record:', err);
      alert('保存失败，请重试');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <div className="min-h-screen bg-cream-100 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onCancel}
            className="p-2 bg-white rounded-xl shadow-sm border border-orange-100 hover-lift"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-serif font-bold text-gray-800">记录饮食</h1>
            <p className="text-sm text-gray-500">{date && formatDate(date)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-5">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              上传食物照片
            </label>
            
            {uploading && (
              <div className="flex items-center justify-center py-8">
                <div className="relative">
                  <svg className="progress-ring w-16 h-16" viewBox="0 0 100 100">
                    <circle
                      className="text-orange-100"
                      strokeWidth="8"
                      stroke="currentColor"
                      fill="transparent"
                      r="45"
                      cx="50"
                      cy="50"
                    />
                    <circle
                      className="progress-ring-circle animate text-orange-500"
                      strokeWidth="8"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="45"
                      cx="50"
                      cy="50"
                      style={{
                        strokeDashoffset: 283 - (283 * uploadProgress) / 100,
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-orange-500">
                      {uploadProgress}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {showSuccess && (
              <div className="flex items-center justify-center gap-2 py-4 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">上传成功！</span>
              </div>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {photos.map(photo => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-lg overflow-hidden group"
                  >
                    <img
                      src={photo.url}
                      alt="食物照片"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-1 right-1 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed border-orange-200 rounded-xl p-6
                text-center cursor-pointer transition-all
                hover:border-orange-400 hover:bg-orange-50
                ${uploading ? 'opacity-50 pointer-events-none' : ''}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  {photos.length > 0 ? (
                    <Camera className="w-6 h-6 text-orange-500" />
                  ) : (
                    <Upload className="w-6 h-6 text-orange-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {photos.length > 0 ? '继续添加照片' : '点击或拖拽上传照片'}
                </p>
                <p className="text-xs text-gray-400">支持 JPG、PNG 格式</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-5">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择餐次
            </label>
            <div className="grid grid-cols-4 gap-3">
              {MEAL_TYPES.map((type, index) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleMealTypeSelect(type, index)}
                  className={`
                    meal-tag relative py-3 px-4 rounded-xl text-sm font-medium
                    transition-all duration-200 z-0
                    ${mealType === type
                      ? `${MEAL_SELECTED_COLORS[type]} selected shadow-md`
                      : `${MEAL_BG_COLORS[type]} text-gray-700 hover-lift`
                    }
                  `}
                  style={{
                    animationDelay: mealType === type ? '0s' : undefined,
                  }}
                >
                  {MEAL_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-5">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              写一点点评
            </label>
            <div className="relative">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="记录一下这一餐的感受吧..."
                rows={4}
                className={`
                  w-full px-4 py-3 border-b-2 border-gray-200
                  focus:outline-none resize-none bg-transparent
                  transition-colors duration-200
                  ${isOverLimit ? 'border-blink' : 'focus:border-orange-400'}
                `}
                maxLength={250}
              />
              <div className="absolute bottom-2 right-0">
                <span className={`text-xs ${
                  isOverLimit ? 'text-red-500 font-bold' : 'text-gray-400'
                }`}>
                  {commentLength}/200
                </span>
              </div>
            </div>
            {isOverLimit && (
              <p className="text-xs text-red-500 mt-2">
                点评内容超过了200字，请精简一下
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-medium hover-lift"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={uploading || isOverLimit}
              className={`
                flex-1 py-3 rounded-xl font-medium transition-all
                ${uploading || isOverLimit
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-400 to-orange-500 text-white hover-lift shadow-md'
                }
              `}
            >
              保存记录
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RecordEditor;
