import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { bookApi, type BookUploadData, type ValuationResult } from '../api/bookApi';
import { CONDITION_DESCRIPTIONS, type BookCondition, type Book } from '@/types';

interface FormErrors {
  title?: string;
  author?: string;
  isbn?: string;
  publishYear?: string;
  condition?: string;
  coverImage?: string;
}

function validateISBN(isbn: string): boolean {
  const digits = isbn.replace(/[\s-]/g, '');
  if (!/^\d{9}[\dX]$/.test(digits) && !/^\d{13}$/.test(digits)) {
    return false;
  }
  if (digits.length === 10) {
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    const check = digits[9] === 'X' ? 10 : parseInt(digits[9]);
    return (sum + check) % 11 === 0;
  }
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return sum % 10 === 0;
}

export default function BookEntryPage() {
  const navigate = useNavigate();
  const { addBook, addToast, addOperationLog, currentUser, updateBook } = useAppStore();

  const [formData, setFormData] = useState<BookUploadData>({
    title: '',
    author: '',
    isbn: '',
    publishYear: new Date().getFullYear(),
    condition: 3
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [valuation, setValuation] = useState<ValuationResult | null>(null);
  const [showValuation, setShowValuation] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateField = useCallback((field: keyof FormErrors, value: any): string | undefined => {
    switch (field) {
      case 'title':
        if (!value || value.trim().length === 0) return '请输入书名';
        if (value.length > 200) return '书名不能超过200个字符';
        return undefined;
      case 'author':
        if (!value || value.trim().length === 0) return '请输入作者';
        if (value.length > 100) return '作者名不能超过100个字符';
        return undefined;
      case 'isbn':
        if (!value || value.trim().length === 0) return '请输入ISBN';
        if (!validateISBN(value)) return 'ISBN格式不正确（需10位或13位有效ISBN）';
        return undefined;
      case 'publishYear':
        if (!value) return '请输入出版年份';
        const year = parseInt(value);
        const currentYear = new Date().getFullYear();
        if (isNaN(year) || year < 1800 || year > currentYear) {
          return `出版年份应在1800-${currentYear}之间`;
        }
        return undefined;
      case 'condition':
        if (!value || value < 1 || value > 5) return '请选择品相等级';
        return undefined;
      case 'coverImage':
        if (coverFile) {
          if (coverFile.size > 5 * 1024 * 1024) return '图片大小不能超过5MB';
          if (!/^image\/(jpeg|jpg|png)$/.test(coverFile.type)) return '仅支持JPG/PNG格式';
        }
        return undefined;
      default:
        return undefined;
    }
  }, [coverFile]);

  const validateAll = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    (Object.keys(formData) as (keyof BookUploadData)[]).forEach(key => {
      if (key !== 'coverImage') {
        const err = validateField(key, formData[key]);
        if (err) newErrors[key as keyof FormErrors] = err;
      }
    });
    const coverErr = validateField('coverImage', coverFile);
    if (coverErr) newErrors.coverImage = coverErr;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, coverFile, validateField]);

  const handleChange = (field: keyof BookUploadData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    const fieldErr = field === 'coverImage' ? validateField('coverImage', value) : validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: fieldErr
    }));
  };

  const handleConditionBlur = async () => {
    if (formData.isbn && formData.publishYear && formData.condition) {
      try {
        const result = await bookApi.calculateValuation({
          isbn: formData.isbn,
          publishYear: formData.publishYear,
          condition: formData.condition
        });
        setValuation(result);
        setShowValuation(true);
      } catch (e) {
        // 如果后端不可用，用前端计算
        const baseValue = 30 + formData.condition * 20;
        const yearFactor = Math.max(0.6, Math.min(1.4, 1 + (2000 - formData.publishYear) / 100));
        const rarityFactor = 1 + (formData.isbn.length % 5) * 0.1;
        setValuation({
          valuationMin: Math.round(baseValue * 0.8 * yearFactor * rarityFactor * 100) / 100,
          valuationMax: Math.round(baseValue * 1.2 * yearFactor * rarityFactor * 100) / 100,
          rarity: (formData.isbn.length % 5) + 1,
          factors: { condition: formData.condition, rarity: (formData.isbn.length % 5) + 1, age: Math.round(yearFactor * 100) }
        });
        setShowValuation(true);
      }
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, coverImage: '图片大小不能超过5MB' }));
      return;
    }
    if (!/^image\/(jpeg|jpg|png)$/.test(file.type)) {
      setErrors(prev => ({ ...prev, coverImage: '仅支持JPG/PNG格式' }));
      return;
    }
    setCoverFile(file);
    setErrors(prev => ({ ...prev, coverImage: undefined }));
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) {
      addToast('error', '请检查表单中的错误');
      return;
    }

    setIsSubmitting(true);
    try {
      let book: Book;
      try {
        book = await bookApi.uploadBook(
          { ...formData, coverImage: coverFile || undefined },
          (percent) => setUploadProgress(percent)
        );
      } catch (err) {
        const newBook: Book = {
          id: `book-${Date.now()}`,
          title: formData.title,
          author: formData.author,
          isbn: formData.isbn.replace(/[\s-]/g, ''),
          publishYear: formData.publishYear,
          condition: formData.condition,
          conditionDesc: CONDITION_DESCRIPTIONS[formData.condition],
          coverImage: coverPreview || undefined,
          status: '待估值',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rarity: valuation?.rarity
        };
        book = newBook;
      }

      if (valuation) {
        book.valuationMin = valuation.valuationMin;
        book.valuationMax = valuation.valuationMax;
        book.status = '竞标中';
      }

      addBook(book);
      updateBook(book.id, {
        valuationMin: book.valuationMin,
        valuationMax: book.valuationMax,
        status: valuation ? '竞标中' : '待估值'
      });

      addOperationLog({
        id: `log-${Date.now()}`,
        action: '上传了书籍',
        targetType: 'book',
        targetId: book.id,
        targetName: book.title,
        operatorName: currentUser?.name || '管理员',
        timestamp: new Date().toISOString()
      });

      addToast('success', `《${book.title}》上传成功！`);

      setTimeout(() => {
        navigate(`/books/${book.id}`);
      }, 300);
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || '上传失败，请重试');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">书籍录入</h1>
        <p className="page-subtitle">上传旧书信息，系统将根据品相和稀有度自动估值</p>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="form-container"
        onSubmit={handleSubmit}
      >
        <div className="form-group">
          <label className="form-label">书名 *</label>
          <input
            type="text"
            className={`form-input ${errors.title ? 'error' : ''}`}
            placeholder="请输入书名"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            onBlur={() => handleChange('title', formData.title)}
            maxLength={200}
          />
          <div className="form-error">{errors.title}</div>
        </div>

        <div className="form-group">
          <label className="form-label">作者 *</label>
          <input
            type="text"
            className={`form-input ${errors.author ? 'error' : ''}`}
            placeholder="请输入作者名"
            value={formData.author}
            onChange={(e) => handleChange('author', e.target.value)}
            onBlur={() => handleChange('author', formData.author)}
            maxLength={100}
          />
          <div className="form-error">{errors.author}</div>
        </div>

        <div className="form-group">
          <label className="form-label">ISBN编号 *</label>
          <input
            type="text"
            className={`form-input ${errors.isbn ? 'error' : ''}`}
            placeholder="请输入10位或13位ISBN"
            value={formData.isbn}
            onChange={(e) => handleChange('isbn', e.target.value)}
            onBlur={() => {
              handleChange('isbn', formData.isbn);
              handleConditionBlur();
            }}
            maxLength={17}
          />
          <div className="form-error">{errors.isbn}</div>
        </div>

        <div className="form-group">
          <label className="form-label">出版年份 *</label>
          <input
            type="number"
            className={`form-input ${errors.publishYear ? 'error' : ''}`}
            placeholder="请输入出版年份"
            value={formData.publishYear}
            onChange={(e) => handleChange('publishYear', parseInt(e.target.value) || 0)}
            onBlur={() => {
              handleChange('publishYear', formData.publishYear);
              handleConditionBlur();
            }}
            min={1800}
            max={new Date().getFullYear()}
          />
          <div className="form-error">{errors.publishYear}</div>
        </div>

        <div className="form-group">
          <label className="form-label">品相等级 *</label>
          <select
            className={`form-select ${errors.condition ? 'error' : ''}`}
            value={formData.condition}
            onChange={(e) => handleChange('condition', parseInt(e.target.value) as BookCondition)}
            onBlur={() => {
              handleChange('condition', formData.condition);
              handleConditionBlur();
            }}
          >
            <option value={1}>1级 - 破损严重</option>
            <option value={2}>2级 - 品相较差</option>
            <option value={3}>3级 - 品相一般</option>
            <option value={4}>4级 - 品相良好</option>
            <option value={5}>5级 - 品相极佳</option>
          </select>
          <div className="condition-desc">
            {CONDITION_DESCRIPTIONS[formData.condition]}
          </div>
          <div className="form-error">{errors.condition}</div>
        </div>

        <AnimatePresence>
          {showValuation && valuation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="valuation-range"
              style={{ marginBottom: 20 }}
            >
              <div className="valuation-label">📊 系统预估价格（品相×稀有度×年代）</div>
              <div className="valuation-value">
                ¥{valuation.valuationMin.toFixed(2)} ~ ¥{valuation.valuationMax.toFixed(2)}
                <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 12, color: '#666' }}>
                  稀有度：{'⭐'.repeat(valuation.rarity)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="form-group">
          <label className="form-label">封面图片（JPG/PNG，≤5MB）</label>
          {!coverPreview ? (
            <div
              className={`upload-area ${isDragging ? 'dragging' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="upload-icon">🖼️</div>
              <div className="upload-text">点击或拖拽图片到此区域上传</div>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>支持 JPG、PNG 格式，单张不超过 5MB</div>
            </div>
          ) : (
            <div className="upload-preview">
              <img src={coverPreview} alt="封面预览" />
              <button
                type="button"
                className="upload-remove"
                onClick={handleRemoveCover}
              >
                ×
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          <div className="form-error">{errors.coverImage}</div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', marginTop: 32 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ minWidth: 140 }}
          >
            {isSubmitting ? (
              <>
                <span className="loading-spinner" />
                <span>上传中...</span>
              </>
            ) : (
              '提交录入'
            )}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
