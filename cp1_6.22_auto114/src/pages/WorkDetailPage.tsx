import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Work, Review } from '../types';
import { fetchWorkById, fetchReviews, submitCustomOrder, submitReview } from '../api/works';
import { Skeleton } from '../components/Skeleton';
import StarRating from '../components/StarRating';
import RippleButton from '../components/RippleButton';
import { useToast } from '../components/Toast';

const WorkDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [work, setWork] = useState<Work | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [engraving, setEngraving] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [workData, reviewsData] = await Promise.all([
          fetchWorkById(id),
          fetchReviews(id),
        ]);
        setWork(workData);
        setReviews(reviewsData);
        if (workData.availableSizes.length > 0) {
          setSelectedSize(workData.availableSizes[0]);
        }
        if (workData.availableColors.length > 0) {
          setSelectedColor(workData.availableColors[0]);
        }
      } catch (error) {
        showToast('加载作品详情失败', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, showToast]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!work || !selectedSize || !selectedColor) return;

    try {
      setSubmitting(true);
      await submitCustomOrder({
        workId: work.id,
        size: selectedSize,
        color: selectedColor,
        engraving,
        price: work.price,
      });
      showToast('订单提交成功！');
      navigate('/orders');
    } catch (error) {
      showToast('提交订单失败，请稍后重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + reviewImages.length > 3) {
      showToast('最多只能上传3张图片', 'error');
      return;
    }

    const newFiles = [...reviewImages, ...files].slice(0, 3);
    setReviewImages(newFiles);

    const newPreviewUrls = newFiles.map((file) => URL.createObjectURL(file));
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls(newPreviewUrls);
  };

  const removeImage = (index: number) => {
    const newFiles = reviewImages.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    URL.revokeObjectURL(previewUrls[index]);
    setReviewImages(newFiles);
    setPreviewUrls(newUrls);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!work || reviewComment.trim() === '') return;

    try {
      setSubmittingReview(true);
      const newReview = await submitReview({
        workId: work.id,
        userName: userName.trim() || '匿名用户',
        rating: reviewRating,
        comment: reviewComment,
        images: reviewImages,
      });
      setReviews((prev) => [newReview, ...prev]);
      setReviewComment('');
      setReviewImages([]);
      setPreviewUrls([]);
      setUserName('');
      setReviewRating(5);
      showToast('评价提交成功！');
    } catch (error) {
      showToast('提交评价失败，请稍后重试', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getContrastColor = (hexColor: string): string => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
            <div>
              <Skeleton height={400} style={{ borderRadius: '16px', marginBottom: '16px' }} />
              <div style={{ display: 'flex', gap: '12px' }}>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} width={80} height={80} style={{ borderRadius: '8px' }} />
                ))}
              </div>
            </div>
            <div>
              <Skeleton height={32} style={{ marginBottom: '12px' }} />
              <Skeleton width="40%" height={24} style={{ marginBottom: '16px' }} />
              <Skeleton width="30%" height={20} style={{ marginBottom: '16px' }} />
              <Skeleton height={80} style={{ marginBottom: '16px' }} />
              <Skeleton height={40} style={{ marginBottom: '12px' }} />
              <Skeleton height={40} style={{ marginBottom: '12px' }} />
              <Skeleton height={40} style={{ marginBottom: '24px' }} />
              <Skeleton height={48} style={{ borderRadius: '8px' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!work) {
    return (
      <div className="main-content">
        <div className="container empty-state">
          <div className="empty-state-icon">❓</div>
          <p>作品不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="work-detail">
        <div className="work-detail-header">
          <div className="work-detail-images">
            <div className="work-detail-main-image">
              <img
                src={work.images[selectedImage] || work.thumbnail}
                alt={work.title}
              />
            </div>
            <div className="work-detail-thumbnails">
              {work.images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`${work.title} ${index + 1}`}
                  className={selectedImage === index ? 'active' : ''}
                  onClick={() => setSelectedImage(index)}
                />
              ))}
            </div>
          </div>

          <div className="work-detail-info">
            <h1>{work.title}</h1>
            <p className="price">¥{work.price}</p>
            <span className="production-tag">制作周期: {work.productionDays}天</span>
            <p className="materials">材料: {work.materials}</p>
            <p className="description">{work.description}</p>
            <p className="artisan">匠人: {work.artisan}</p>

            <form className="custom-form" onSubmit={handleSubmitOrder}>
              <h2>定制您的作品</h2>

              <div className="form-group">
                <label>尺寸</label>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                >
                  {work.availableSizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>颜色</label>
                <div className="color-picker">
                  {work.availableColors.map((color) => (
                    <div
                      key={color}
                      className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                      title={color}
                    />
                  ))}
                </div>
                {selectedColor && (
                  <div
                    className="color-preview"
                    style={{
                      backgroundColor: selectedColor,
                      color: getContrastColor(selectedColor),
                    }}
                  >
                    预览颜色效果
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>刻字（最多10个字符）</label>
                <input
                  type="text"
                  value={engraving}
                  onChange={(e) => setEngraving(e.target.value.slice(0, 10))}
                  placeholder="请输入刻字内容"
                  maxLength={10}
                />
                <p className={`char-count ${engraving.length === 10 ? 'warning' : ''}`}>
                  {engraving.length}/10
                </p>
              </div>

              <RippleButton
                type="submit"
                className="submit-btn"
                disabled={submitting || !selectedSize || !selectedColor}
              >
                {submitting ? '提交中...' : `提交定制订单 ¥${work.price}`}
              </RippleButton>
            </form>
          </div>
        </div>

        <div className="reviews-section">
          <h2>买家评价 ({reviews.length})</h2>

          <form className="review-form" onSubmit={handleSubmitReview}>
            <h3>发表您的评价</h3>

            <div className="form-group">
              <label>您的昵称</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="请输入昵称（选填）"
                maxLength={20}
              />
            </div>

            <div className="form-group">
              <label>评分</label>
              <StarRating
                rating={reviewRating}
                interactive
                onChange={setReviewRating}
              />
            </div>

            <div className="form-group">
              <label>评价内容</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="分享您的使用体验..."
                maxLength={500}
              />
              <p className="char-count">
                {reviewComment.length}/500
              </p>
            </div>

            <div className="form-group">
              <label>上传买家秀（最多3张）</label>
              <label className="image-upload">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                />
                <div>
                  <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📷</span>
                  <span>点击上传图片 ({reviewImages.length}/3)</span>
                </div>
              </label>
              {previewUrls.length > 0 && (
                <div className="preview-images">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="preview-image">
                      <img src={url} alt={`preview-${index}`} />
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeImage(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <RippleButton
              type="submit"
              className="submit-btn"
              disabled={submittingReview || reviewComment.trim() === ''}
            >
              {submittingReview ? '提交中...' : '提交评价'}
            </RippleButton>
          </form>

          {reviews.length > 0 ? (
            <div className="reviews-grid">
              {reviews.map((review) => (
                <div key={review.id} className="review-card">
                  <div className="review-header">
                    <div className="review-avatar">
                      {review.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="review-username">{review.userName}</div>
                      <div style={{ fontSize: '12px', color: '#a0aec0' }}>
                        {new Date(review.createdAt).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                  </div>
                  <StarRating rating={review.rating} />
                  <p className="review-comment">{review.comment}</p>
                  {review.images.length > 0 && (
                    <div className="review-images">
                      {review.images.map((img, index) => (
                        <img
                          key={index}
                          src={img.startsWith('/') ? `http://localhost:3002${img}` : img}
                          alt={`review-${index}`}
                          className="review-image"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <p>暂无评价，快来发表第一条评价吧！</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkDetailPage;
