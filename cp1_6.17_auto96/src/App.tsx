import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import type { Annotation, Photo, Product, Message } from './types';
import { productApi } from './api';
import ImageAnnotator from './components/ImageAnnotator';
import NegotiationPanel from './components/NegotiationPanel';
import ProductCard from './components/ProductCard';

const CURRENT_USER = {
  id: 'user_demo',
  name: '演示用户',
  avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=demo',
};

const generateId = (prefix: string) =>
  prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const HEADER_STYLE: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderBottom: '1px solid #e8e8e8',
  padding: '0 24px',
  height: 56,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

const BTN_PRIMARY: React.CSSProperties = {
  padding: '8px 20px',
  backgroundColor: '#1890ff',
  color: '#ffffff',
  borderRadius: 4,
  fontSize: 14,
  fontWeight: 500,
};

const BTN_SECONDARY: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#ffffff',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  fontSize: 14,
  color: '#333',
};

function Header({ role, setRole }: { role: 'buyer' | 'seller'; setRole: (r: 'buyer' | 'seller') => void }) {
  const navigate = useNavigate();
  return (
    <header style={HEADER_STYLE}>
      <Link
        to="/"
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: '#1890ff',
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        标注式二手交易
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setRole('buyer')}
            style={{
              ...BTN_SECONDARY,
              backgroundColor: role === 'buyer' ? '#1890ff' : '#fff',
              color: role === 'buyer' ? '#fff' : '#333',
              border: role === 'buyer' ? '1px solid #1890ff' : '1px solid #d9d9d9',
              padding: '4px 12px',
            }}
          >
            买家
          </button>
          <button
            onClick={() => setRole('seller')}
            style={{
              ...BTN_SECONDARY,
              backgroundColor: role === 'seller' ? '#1890ff' : '#fff',
              color: role === 'seller' ? '#fff' : '#333',
              border: role === 'seller' ? '1px solid #1890ff' : '1px solid #d9d9d9',
              padding: '4px 12px',
            }}
          >
            卖家
          </button>
        </div>
        {role === 'seller' && (
          <button onClick={() => navigate('/publish')} style={BTN_PRIMARY}>
            + 发布商品
          </button>
        )}
        <img
          src={CURRENT_USER.avatar}
          alt={CURRENT_USER.name}
          style={{ width: 32, height: 32, borderRadius: '50%' }}
        />
      </div>
    </header>
  );
}

function HomePage({ role }: { role: 'buyer' | 'seller' }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productApi
      .getAllProducts()
      .then((data) => setProducts(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>
          {role === 'seller' ? '我发布的商品' : '浏览商品'}
        </h1>
        <p style={{ color: '#666', fontSize: 14 }}>
          {role === 'seller'
            ? '点击"发布商品"上传带标注的二手商品'
            : '点击商品查看带标注的详情和发起议价'}
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>加载中...</div>
      ) : products.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 80,
            backgroundColor: '#fff',
            borderRadius: 4,
            border: '1px solid #e8e8e8',
          }}
        >
          <p style={{ color: '#999', marginBottom: 16 }}>暂无商品</p>
          {role === 'seller' && (
            <Link to="/publish" style={BTN_PRIMARY} onClick={(e) => { Object.assign(e.currentTarget.style, { textDecoration: 'none' }); }}>
              立即发布
            </Link>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PublishPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentEditPhotoIndex, setCurrentEditPhotoIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    const remaining = 6 - photos.length;
    const toProcess = Array.from(files).slice(0, remaining);

    toProcess.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`图片 ${file.name} 超过5MB限制`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setPhotos((prev) => [
          ...prev,
          { id: generateId('photo'), url, name: file.name },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeletePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setAnnotations((prev) => prev.filter((a) => a.imageIndex !== index).map((a) =>
      a.imageIndex > index ? { ...a, imageIndex: a.imageIndex - 1 } : a
    ));
    if (currentEditPhotoIndex === index) setCurrentEditPhotoIndex(null);
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) return;
    const newPhotos = [...photos];
    const [moved] = newPhotos.splice(dragIndex, 1);
    newPhotos.splice(dropIndex, 0, moved);
    setPhotos(newPhotos);

    const newAnns = annotations.map((a) => {
      if (a.imageIndex === dragIndex) return { ...a, imageIndex: dropIndex };
      if (dragIndex < dropIndex && a.imageIndex > dragIndex && a.imageIndex <= dropIndex) {
        return { ...a, imageIndex: a.imageIndex - 1 };
      }
      if (dragIndex > dropIndex && a.imageIndex < dragIndex && a.imageIndex >= dropIndex) {
        return { ...a, imageIndex: a.imageIndex + 1 };
      }
      return a;
    });
    setAnnotations(newAnns);
    setDragIndex(null);
  };

  const handleAnnotationsChange = (imageAnns: Annotation[]) => {
    setAnnotations((prev) => [
      ...prev.filter((a) => a.imageIndex !== currentEditPhotoIndex),
      ...imageAnns,
    ]);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return alert('请输入标题');
    if (!originalPrice || parseInt(originalPrice) <= 0) return alert('请输入有效价格');
    if (photos.length === 0) return alert('请至少上传1张照片');

    setSubmitting(true);
    try {
      await productApi.createProduct({
        title: title.trim(),
        description: description.trim(),
        originalPrice: parseInt(originalPrice),
        photos,
        annotations,
      });
      navigate('/');
    } catch (e) {
      console.error(e);
      alert('发布失败，请确保后端已启动');
    } finally {
      setSubmitting(false);
    }
  };

  const editingPhoto =
    currentEditPhotoIndex !== null ? photos[currentEditPhotoIndex] : null;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 4,
          padding: 24,
          border: '1px solid #e8e8e8',
        }}
      >
        <h1 style={{ fontSize: 22, marginBottom: 20 }}>发布商品</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={labelStyle}>标题 *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入商品标题"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>原价（元）*</label>
            <input
              type="number"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="请输入商品原价"
              style={{ ...inputStyle, width: 200 }}
            />
          </div>
          <div>
            <label style={labelStyle}>商品描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述商品使用情况等"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={labelStyle}>
              商品照片 *（最多6张，每张不超过5MB，可拖拽排序）
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 12,
              }}
            >
              {photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(idx)}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    border: currentEditPhotoIndex === idx
                      ? '2px solid #1890ff'
                      : '1px solid #e8e8e8',
                    borderRadius: 4,
                    overflow: 'hidden',
                    cursor: 'move',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <img
                    src={photo.url}
                    alt={photo.name}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.3)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0)')
                    }
                  >
                    <button
                      onClick={() => setCurrentEditPhotoIndex(idx)}
                      style={{
                        margin: 4,
                        padding: '4px 8px',
                        backgroundColor: '#1890ff',
                        color: '#fff',
                        borderRadius: 4,
                        fontSize: 12,
                        opacity: 0,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      标注
                    </button>
                    <button
                      onClick={() => handleDeletePhoto(idx)}
                      style={{
                        margin: 4,
                        padding: '4px 8px',
                        backgroundColor: '#f5222d',
                        color: '#fff',
                        borderRadius: 4,
                        fontSize: 12,
                        opacity: 0,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      删除
                    </button>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      left: 4,
                      padding: '2px 6px',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      fontSize: 11,
                      borderRadius: 4,
                    }}
                  >
                    图{idx + 1}
                  </div>
                  {annotations.filter((a) => a.imageIndex === idx).length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        padding: '2px 6px',
                        backgroundColor: '#1890ff',
                        color: '#fff',
                        fontSize: 11,
                        borderRadius: 4,
                      }}
                    >
                      {annotations.filter((a) => a.imageIndex === idx).length}标
                    </div>
                  )}
                </div>
              ))}
              {photos.length < 6 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    aspectRatio: '1',
                    border: '2px dashed #d9d9d9',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#999',
                    fontSize: 32,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#1890ff';
                    e.currentTarget.style.color = '#1890ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d9d9d9';
                    e.currentTarget.style.color = '#999';
                  }}
                >
                  +
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </div>

          {editingPhoto && currentEditPhotoIndex !== null && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  正在标注：图{currentEditPhotoIndex + 1}
                </label>
                <button
                  onClick={() => setCurrentEditPhotoIndex(null)}
                  style={BTN_SECONDARY}
                >
                  完成标注
                </button>
              </div>
              <ImageAnnotator
                key={editingPhoto.id}
                imageUrl={editingPhoto.url}
                imageIndex={currentEditPhotoIndex}
                existingAnnotations={annotations}
                onAnnotationsChange={handleAnnotationsChange}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
            <button onClick={handleSubmit} disabled={submitting} style={BTN_PRIMARY}>
              {submitting ? '发布中...' : '发布商品'}
            </button>
            <button onClick={() => navigate('/')} style={BTN_SECONDARY}>
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 500,
  marginBottom: 8,
  color: '#333',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s',
};

function DetailPage({ role }: { role: 'buyer' | 'seller' }) {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [priceAnimate, setPriceAnimate] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    productApi
      .getProduct(id)
      .then((data) => setProduct(data))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePriceUpdate = (newPrice: number) => {
    setProduct((prev) => (prev ? { ...prev, currentPrice: newPrice } : prev));
    setPriceAnimate(true);
    setTimeout(() => setPriceAnimate(false), 500);
  };

  const handleMessagesUpdate = (_: Message[]) => {
    // Messages are managed inside NegotiationPanel
  };

  const handlePrevPhoto = () => {
    if (!product) return;
    setCurrentPhotoIndex((prev) =>
      prev === 0 ? product.photos.length - 1 : prev - 1
    );
    setSelectedAnnotationId(null);
  };

  const handleNextPhoto = () => {
    if (!product) return;
    setCurrentPhotoIndex((prev) =>
      prev === product.photos.length - 1 ? 0 : prev + 1
    );
    setSelectedAnnotationId(null);
  };

  if (loading || !product) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>
        {loading ? '加载中...' : '商品不存在'}
      </div>
    );
  }

  const currentPhoto = product.photos[currentPhotoIndex];
  const hasDiscount = product.currentPrice < product.originalPrice;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 4,
          border: '1px solid #e8e8e8',
          padding: 20,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>{product.title}</h1>
          {product.description && (
            <p style={{ color: '#666', fontSize: 14 }}>{product.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              className={priceAnimate ? 'price-animate' : ''}
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: hasDiscount ? '#f5222d' : '#333',
              }}
            >
              ¥{product.currentPrice}
            </span>
            {hasDiscount && (
              <span style={{ fontSize: 14, color: '#999', textDecoration: 'line-through' }}>
                ¥{product.originalPrice}
              </span>
            )}
          </div>
          {hasDiscount && (
            <span
              style={{
                padding: '2px 8px',
                backgroundColor: '#f6ffed',
                border: '1px solid #b7eb8f',
                color: '#52c41a',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              已降价
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          ...responsiveStyle(),
        }}
      >
        <div
          style={{
            flex: '0 0 60%',
            ...responsiveLeftStyle(),
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 4,
              border: '1px solid #e8e8e8',
              padding: 16,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 720,
                margin: '0 auto',
              }}
              onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
              onTouchEnd={(e) => {
                if (touchStartX.current === null) return;
                const dx = e.changedTouches[0].clientX - touchStartX.current;
                if (Math.abs(dx) > 50) {
                  if (dx > 0) handlePrevPhoto();
                  else handleNextPhoto();
                }
                touchStartX.current = null;
              }}
            >
              <button
                onClick={handlePrevPhoto}
                style={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  color: '#fff',
                  fontSize: 18,
                  zIndex: 10,
                  display: product.photos.length > 1 ? 'flex' : 'none',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ‹
              </button>
              <button
                onClick={handleNextPhoto}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  color: '#fff',
                  fontSize: 18,
                  zIndex: 10,
                  display: product.photos.length > 1 ? 'flex' : 'none',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ›
              </button>
              {currentPhoto && (
                <ImageAnnotator
                  key={currentPhoto.id + '_view'}
                  imageUrl={currentPhoto.url}
                  imageIndex={currentPhotoIndex}
                  existingAnnotations={product.annotations}
                  readonly
                  onAnnotationClick={(id) => setSelectedAnnotationId(id)}
                />
              )}
            </div>

            {product.photos.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 12,
                }}
              >
                {product.photos.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentPhotoIndex(idx);
                      setSelectedAnnotationId(null);
                    }}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: idx === currentPhotoIndex ? '#1890ff' : '#d9d9d9',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                  />
                ))}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 12,
                overflowX: 'auto',
                paddingBottom: 4,
              }}
            >
              {product.photos.map((photo, idx) => (
                <button
                  key={photo.id}
                  onClick={() => {
                    setCurrentPhotoIndex(idx);
                    setSelectedAnnotationId(null);
                  }}
                  style={{
                    flexShrink: 0,
                    width: 64,
                    height: 48,
                    padding: 0,
                    border:
                      idx === currentPhotoIndex
                        ? '2px solid #1890ff'
                        : '1px solid #e8e8e8',
                    borderRadius: 4,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    backgroundColor: '#fff',
                  }}
                >
                  <img
                    src={photo.url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            flex: '0 0 calc(40% - 16px)',
            ...responsiveRightStyle(),
          }}
        >
          <NegotiationPanel
            product={product}
            annotations={product.annotations}
            currentUserId={CURRENT_USER.id}
            currentUserName={CURRENT_USER.name}
            currentUserAvatar={CURRENT_USER.avatar}
            currentUserRole={role}
            selectedAnnotationId={selectedAnnotationId}
            onPriceUpdate={handlePriceUpdate}
            onMessagesUpdate={handleMessagesUpdate}
          />
        </div>
      </div>
    </div>
  );
}

function responsiveStyle(): React.CSSProperties {
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return { flexDirection: 'column' as const };
  }
  return {};
}

function responsiveLeftStyle(): React.CSSProperties {
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return { flex: '1 1 100%', minWidth: 0 };
  }
  return { minWidth: 0 };
}

function responsiveRightStyle(): React.CSSProperties {
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return { flex: '1 1 100%', minWidth: 0, height: '50vh' };
  }
  return { minWidth: 0, height: 'calc(100vh - 180px)', minHeight: 500 };
}

export default function App() {
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header role={role} setRole={setRole} />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<HomePage role={role} />} />
          <Route path="/publish" element={<PublishPage />} />
          <Route path="/product/:id" element={<DetailPage role={role} />} />
        </Routes>
      </main>
    </div>
  );
}
