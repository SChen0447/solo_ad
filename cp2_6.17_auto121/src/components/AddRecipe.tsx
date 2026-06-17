import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, Plus, Trash2, GripVertical, ChefHat, ListOrdered, Image as ImageIcon } from 'lucide-react';
import type { Ingredient, RecipeStep, Recipe } from '@/types';
import { useRecipeStore } from '@/store/recipeStore';
import { useNavigate } from 'react-router-dom';

interface AddRecipeProps {
  onClose: () => void;
}

const AddRecipe: React.FC<AddRecipeProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const addRecipe = useRecipeStore(state => state.addRecipe);

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [cookingTime, setCookingTime] = useState(30);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', amount: '' },
    { name: '', amount: '' },
    { name: '', amount: '' },
  ]);
  const [steps, setSteps] = useState<RecipeStep[]>([
    { order: 1, description: '' },
    { order: 2, description: '' },
    { order: 3, description: '' },
  ]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const touchStartY = useRef<number>(0);
  const touchDraggedIndex = useRef<number | null>(null);
  const touchItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    touchStartY.current = e.touches[0].clientY;
    touchDraggedIndex.current = index;
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchDraggedIndex.current === null) return;
    e.preventDefault();
    const currentY = e.touches[0].clientY;
    const refs = touchItemRefs.current.filter(Boolean) as HTMLDivElement[];
    for (let i = 0; i < refs.length; i++) {
      const rect = refs[i].getBoundingClientRect();
      if (currentY >= rect.top && currentY <= rect.bottom) {
        if (i !== touchDraggedIndex.current) {
          setDragOverIndex(i);
        }
        break;
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchDraggedIndex.current !== null && dragOverIndex !== null && touchDraggedIndex.current !== dragOverIndex) {
      const next = [...steps];
      const [removed] = next.splice(touchDraggedIndex.current, 1);
      next.splice(dragOverIndex, 0, removed);
      const reordered = next.map((s, i) => ({ ...s, order: i + 1 }));
      setSteps(reordered);
    }
    touchDraggedIndex.current = null;
    touchStartY.current = 0;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: '' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: 'name' | 'amount', value: string) => {
    const next = [...ingredients];
    next[index][field] = value;
    setIngredients(next);
  };

  const addStep = () => {
    setSteps([...steps, { order: steps.length + 1, description: '' }]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    const next = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }));
    setSteps(next);
  };

  const updateStepDescription = (index: number, value: string) => {
    const next = [...steps];
    next[index].description = value;
    setSteps(next);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const next = [...steps];
    const [removed] = next.splice(draggedIndex, 1);
    next.splice(dropIndex, 0, removed);
    const reordered = next.map((s, i) => ({ ...s, order: i + 1 }));
    setSteps(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const canGoNext = () => {
    if (step === 1) return title.trim() !== '';
    if (step === 2) return ingredients.some(ing => ing.name.trim() !== '');
    if (step === 3) return steps.some(s => s.description.trim() !== '');
    return true;
  };

  const handleSubmit = () => {
    const filteredIngs = ingredients.filter(ing => ing.name.trim() !== '');
    const filteredSteps = steps
      .filter(s => s.description.trim() !== '')
      .map((s, i) => ({ ...s, order: i + 1 }));

    const recipe: Recipe = {
      id: uuidv4(),
      title: title.trim(),
      image: imageUrl.trim() || `https://picsum.photos/seed/${uuidv4()}/240/160`,
      cookingTime: Number(cookingTime) || 30,
      ingredients: filteredIngs,
      steps: filteredSteps,
      isFavorite: false,
    };

    addRecipe(recipe);
    navigate('/');
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <button
        onClick={onClose}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          color: '#3b82f6',
          fontSize: 15,
          cursor: 'pointer',
          marginBottom: 20,
          fontWeight: 500,
        }}
      >
        <ArrowLeft size={18} /> 取消
      </button>

      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
        新增食谱
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '24px 0 32px' }}>
        {[1, 2, 3].map(n => (
          <React.Fragment key={n}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: step >= n ? '#3b82f6' : '#e5e7eb',
                color: step >= n ? '#fff' : '#9ca3af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 600,
                transition: 'all 0.3s',
              }}
            >
              {n === 1 && <ChefHat size={16} />}
              {n === 2 && <ListOrdered size={16} />}
              {n === 3 && <ImageIcon size={16} />}
            </div>
            {n < 3 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: step > n ? '#3b82f6' : '#e5e7eb',
                  transition: 'background 0.3s',
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
              食谱名称 *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例如：番茄意大利面"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                fontSize: 15,
                color: '#1f2937',
                outline: 'none',
                transition: 'border-color 0.2s',
                background: '#fff',
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#3b82f6'; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#e5e7eb'; }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
              烹饪时间（分钟）
            </label>
            <input
              type="number"
              value={cookingTime}
              onChange={e => setCookingTime(Number(e.target.value))}
              min={1}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                fontSize: 15,
                color: '#1f2937',
                outline: 'none',
                transition: 'border-color 0.2s',
                background: '#fff',
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#3b82f6'; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#e5e7eb'; }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
              封面图片 URL
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="留空将使用随机图片"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                fontSize: 15,
                color: '#1f2937',
                outline: 'none',
                transition: 'border-color 0.2s',
                background: '#fff',
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#3b82f6'; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#e5e7eb'; }}
            />
            {imageUrl && (
              <div style={{ marginTop: 12, borderRadius: 12, overflow: 'hidden', width: '100%', height: 180, background: '#f3f4f6' }}>
                <img src={imageUrl} alt="预览" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
            添加食谱的食材清单
          </p>
          {ingredients.map((ing, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                padding: 10,
                borderRadius: 12,
                background: '#fff',
                border: '1px solid #e5e7eb',
              }}
            >
              <span style={{ width: 24, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                {i + 1}.
              </span>
              <input
                type="text"
                value={ing.name}
                onChange={e => updateIngredient(i, 'name', e.target.value)}
                placeholder="食材名称"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 14,
                  outline: 'none',
                }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#3b82f6'; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#e5e7eb'; }}
              />
              <input
                type="text"
                value={ing.amount}
                onChange={e => updateIngredient(i, 'amount', e.target.value)}
                placeholder="用量"
                style={{
                  width: 100,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 14,
                  outline: 'none',
                }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#3b82f6'; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#e5e7eb'; }}
              />
              <button
                onClick={() => removeIngredient(i)}
                disabled={ingredients.length <= 1}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'none',
                  border: 'none',
                  cursor: ingredients.length <= 1 ? 'not-allowed' : 'pointer',
                  color: ingredients.length <= 1 ? '#d1d5db' : '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            onClick={addIngredient}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '10px',
              borderRadius: 12,
              border: '1px dashed #d1d5db',
              background: '#f9fafb',
              color: '#6b7280',
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#3b82f6';
              (e.currentTarget as HTMLButtonElement).style.color = '#3b82f6';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#d1d5db';
              (e.currentTarget as HTMLButtonElement).style.color = '#6b7280';
            }}
          >
            <Plus size={16} /> 添加食材
          </button>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
            添加烹饪步骤，可拖拽排序
          </p>
          {steps.map((stepItem, i) => (
            <div
              key={i}
              ref={el => { touchItemRefs.current[i] = el; }}
              draggable
              onDragStart={e => handleDragStart(e, i)}
              onDragOver={e => handleDragOver(e, i)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
              onTouchStart={e => handleTouchStart(e, i)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                padding: 10,
                borderRadius: 12,
                background: dragOverIndex === i ? '#eff6ff' : '#fff',
                border: `1px solid ${dragOverIndex === i ? '#3b82f6' : '#e5e7eb'}`,
                opacity: draggedIndex === i ? 0.5 : 1,
                transition: 'background 0.2s, border-color 0.2s',
                touchAction: 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  paddingTop: 8,
                  cursor: 'grab',
                  color: '#9ca3af',
                }}
              >
                <GripVertical size={16} />
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#3b82f6',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {stepItem.order}
                </span>
              </div>
              <textarea
                value={stepItem.description}
                onChange={e => updateStepDescription(i, e.target.value)}
                placeholder="描述这一步怎么做..."
                rows={3}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: 60,
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                }}
                onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#3b82f6'; }}
                onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#e5e7eb'; }}
              />
              <button
                onClick={() => removeStep(i)}
                disabled={steps.length <= 1}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'none',
                  border: 'none',
                  cursor: steps.length <= 1 ? 'not-allowed' : 'pointer',
                  color: steps.length <= 1 ? '#d1d5db' : '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            onClick={addStep}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '10px',
              borderRadius: 12,
              border: '1px dashed #d1d5db',
              background: '#f9fafb',
              color: '#6b7280',
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#3b82f6';
              (e.currentTarget as HTMLButtonElement).style.color = '#3b82f6';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#d1d5db';
              (e.currentTarget as HTMLButtonElement).style.color = '#6b7280';
            }}
          >
            <Plus size={16} /> 添加步骤
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40 }}>
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
          style={{
            padding: '12px 28px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: '#fff',
            color: '#374151',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#fff';
          }}
        >
          {step > 1 ? '上一步' : '取消'}
        </button>
        <button
          onClick={() => {
            if (step < 3) setStep(step + 1);
            else handleSubmit();
          }}
          disabled={!canGoNext()}
          style={{
            padding: '12px 32px',
            borderRadius: 12,
            border: 'none',
            background: canGoNext() ? '#3b82f6' : '#93c5fd',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            cursor: canGoNext() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            if (canGoNext()) {
              (e.currentTarget as HTMLButtonElement).style.background = '#2563eb';
            }
          }}
          onMouseLeave={e => {
            if (canGoNext()) {
              (e.currentTarget as HTMLButtonElement).style.background = '#3b82f6';
            }
          }}
        >
          {step < 3 ? '下一步' : '保存食谱'}
        </button>
      </div>
    </div>
  );
};

export default AddRecipe;
