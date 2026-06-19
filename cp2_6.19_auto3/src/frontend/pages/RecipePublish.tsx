import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function RecipePublish() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverImage(file);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !ingredients.trim() || !steps.trim()) {
      alert('请填写完整的食谱信息');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('ingredients', ingredients.trim());
      formData.append('steps', steps.trim());
      if (coverImage) {
        formData.append('coverImage', coverImage);
      }

      await axios.post('/api/recipes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      navigate('/');
    } catch (err) {
      console.error('发布失败', err);
      alert('发布失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="publish-page">
      <h1 className="publish-title">发布新食谱 📖</h1>
      <form className="publish-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">食谱名称</label>
          <input
            type="text"
            className="form-input"
            placeholder="给你的私房菜起个名字"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">食材清单</label>
          <textarea
            className="form-textarea"
            placeholder="每行一种食材，例如：&#10;牛腩 500g&#10;番茄 3个&#10;姜片 3片"
            rows={6}
            value={ingredients}
            onChange={e => setIngredients(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">烹饪步骤</label>
          <textarea
            className="form-textarea"
            placeholder="每行一个步骤，例如：&#10;牛腩切块冷水下锅焯水&#10;番茄去皮切块&#10;热锅下油爆香姜片"
            rows={8}
            value={steps}
            onChange={e => setSteps(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">封面图片</label>
          <div
            className="upload-area"
            onClick={() => fileRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="预览" className="upload-preview" />
            ) : (
              <div className="upload-placeholder">
                <span className="upload-icon">📷</span>
                <span>点击上传封面图片</span>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageChange}
            />
          </div>
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={submitting}
        >
          {submitting ? '发布中...' : '发布食谱 🚀'}
        </button>
      </form>
    </div>
  );
}
