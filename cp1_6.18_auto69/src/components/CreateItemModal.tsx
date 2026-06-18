import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface CreateItemModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreateItemModal = ({ open, onClose }: CreateItemModalProps) => {
  const user = useStore((s) => s.user);
  const addItem = useStore((s) => s.addItem);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleImage = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      toast.error('仅支持 JPG/PNG 格式图片');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs: Record<string, boolean> = {};
    if (!title.trim() || title.length > 20) errs.title = true;
    if (!description.trim() || description.length > 300) errs.description = true;
    const price = parseInt(startingPrice);
    if (!Number.isInteger(price) || price <= 0) errs.startingPrice = true;
    if (!image) errs.image = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('请检查表单填写');
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      const item = await api.createItem({
        title: title.trim(),
        description: description.trim(),
        startingPrice: parseInt(startingPrice),
        image,
        artistId: user.id,
        artistName: user.username,
      });
      addItem(item);
      toast.success('拍品发布成功！');
      onClose();
      setTitle('');
      setDescription('');
      setStartingPrice('');
      setImage('');
    } catch (err: any) {
      toast.error(err.message || '发布失败');
    } finally {
      setLoading(false);
    }
  };

  const errorStyle = (key: string) => ({
    borderColor: errors[key] ? '#ef4444' : 'rgba(255, 255, 255, 0.12)',
    animation: errors[key] ? 'shakeInput 0.35s' : undefined,
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(26, 26, 46, 0.6)',
        backdropFilter: 'blur(10px)',
        padding: '20px',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '36px 32px',
          borderRadius: '20px',
          background: 'rgba(22, 33, 62, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          animation: 'modalIn 0.3s ease-out',
        }}
      >
        <h2 style={{ color: '#fff', fontSize: '24px', margin: 0, marginBottom: '24px' }}>发布新拍品</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>画作标题</span>
              <span style={{ color: title.length > 20 ? '#ef4444' : '#888' }}>{title.length}/20</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="20字以内"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
                ...errorStyle('title'),
              }}
            />
          </div>
          <div>
            <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>作品描述</span>
              <span style={{ color: description.length > 300 ? '#ef4444' : '#888' }}>{description.length}/300</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="300字以内描述作品"
              rows={4}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                ...errorStyle('description'),
              }}
            />
          </div>
          <div>
            <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>起拍价（￥）</label>
            <input
              type="number"
              value={startingPrice}
              onChange={(e) => setStartingPrice(e.target.value)}
              placeholder="正整数"
              min={1}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
                ...errorStyle('startingPrice'),
              }}
            />
          </div>
          <div>
            <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>作品图片（JPG/PNG，5MB以内）</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                minHeight: '160px',
                borderRadius: '10px',
                border: `2px dashed ${errors.image ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'}`,
                background: 'rgba(255, 255, 255, 0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
              onMouseOver={(e) => {
                if (!image) e.currentTarget.style.borderColor = '#f0a500';
              }}
              onMouseOut={(e) => {
                if (!image) e.currentTarget.style.borderColor = errors.image ? '#ef4444' : 'rgba(255, 255, 255, 0.2)';
              }}
            >
              {image ? (
                <img src={image} alt="预览" style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>🖼️</div>
                  <div style={{ fontSize: '13px' }}>点击上传图片</div>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImage(f);
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '13px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'transparent',
                color: '#ccc',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '13px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #f0a500, #e89000)',
                color: '#1a1a2e',
                fontSize: '15px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? '发布中...' : '发布拍品'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
