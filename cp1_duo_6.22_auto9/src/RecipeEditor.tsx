import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Recipe,
  Ingredient,
  IngredientCategory,
  Step,
  CATEGORY_LABELS,
} from './types';

interface Props {
  recipe: Recipe;
  onSave: (recipe: Recipe, note: string) => void;
  onBack: () => void;
}

const DRAFT_KEY = 'recipe_collab_draft_';
const AUTOSAVE_DELAY = 1000;

const UNIT_OPTIONS = ['个', '克', '千克', '毫升', '升', '小把', '根', '颗', '瓣', '勺', '茶匙', '汤匙', '杯', '片', '适量'];

function deepCloneRecipe(r: Recipe): Recipe {
  return JSON.parse(JSON.stringify(r));
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RecipeEditor({ recipe, onSave, onBack }: Props) {
  const [draft, setDraft] = useState<Recipe>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY + recipe.id);
      if (saved) {
        const parsed = JSON.parse(saved) as Recipe;
        if (parsed.updatedAt > recipe.updatedAt) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return deepCloneRecipe(recipe);
  });

  const [saveNote, setSaveNote] = useState('');
  const [isSaved, setIsSaved] = useState(true);
  const [lastDraftTime, setLastDraftTime] = useState<number | null>(null);
  const autosaveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }
    setIsSaved(false);
    autosaveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY + recipe.id, JSON.stringify(draft));
        setLastDraftTime(Date.now());
        setIsSaved(true);
      } catch {
        /* ignore */
      }
    }, AUTOSAVE_DELAY);

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [draft, recipe.id]);

  const updateTitle = useCallback((title: string) => {
    setDraft((prev) => ({ ...prev, title }));
  }, []);

  const addIngredient = useCallback(() => {
    const newIng: Ingredient = {
      id: uuidv4(),
      name: '',
      quantity: '',
      unit: '克',
      substitute: '',
      category: 'other',
    };
    setDraft((prev) => ({ ...prev, ingredients: [...prev.ingredients, newIng] }));
  }, []);

  const updateIngredient = useCallback((id: string, patch: Partial<Ingredient>) => {
    setDraft((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing) =>
        ing.id === id ? { ...ing, ...patch } : ing
      ),
    }));
  }, []);

  const removeIngredient = useCallback((id: string) => {
    setDraft((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((ing) => ing.id !== id),
    }));
  }, []);

  const addStep = useCallback(() => {
    const newStep: Step = {
      id: uuidv4(),
      description: '',
      imageUrl: null,
    };
    setDraft((prev) => ({ ...prev, steps: [...prev.steps, newStep] }));
  }, []);

  const updateStep = useCallback((id: string, patch: Partial<Step>) => {
    setDraft((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }, []);

  const removeStep = useCallback((id: string) => {
    setDraft((prev) => {
      if (prev.steps.length <= 1) return prev;
      return { ...prev, steps: prev.steps.filter((s) => s.id !== id) };
    });
  }, []);

  const handleImageUpload = useCallback((stepId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      updateStep(stepId, { imageUrl: url });
    };
    reader.readAsDataURL(file);
  }, [updateStep]);

  const handleSave = useCallback(() => {
    onSave(draft, saveNote);
    localStorage.removeItem(DRAFT_KEY + recipe.id);
  }, [draft, saveNote, onSave, recipe.id]);

  const categoryOptions = useMemo(
    () =>
      (Object.keys(CATEGORY_LABELS) as IngredientCategory[]).map((k) => ({
        value: k,
        label: CATEGORY_LABELS[k],
      })),
    []
  );

  return (
    <div className="page-fade editor-container">
      <div className="editor-header">
        <div style={{ flex: 1, minWidth: 250 }}>
          <button
            className="btn btn-sm btn-secondary"
            style={{ marginBottom: 12 }}
            onClick={onBack}
          >
            ← 返回列表
          </button>
          <input
            type="text"
            className="editor-title-input"
            value={draft.title}
            onChange={(e) => updateTitle(e.target.value)}
            placeholder="输入菜谱标题..."
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
          <div className={`save-status ${isSaved ? 'saved' : ''}`}>
            <span className="save-indicator"></span>
            {isSaved
              ? lastDraftTime
                ? `草稿已保存 ${formatDate(lastDraftTime)}`
                : '已保存'
              : '正在保存...'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="input"
              style={{ width: 200 }}
              placeholder="版本备注（可选）"
              value={saveNote}
              onChange={(e) => setSaveNote(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleSave}>
              💾 保存版本
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="editor-section">
          <h3 className="section-title">🥕 食材列表</h3>
          <div className="ingredient-list">
            {draft.ingredients.length === 0 && (
              <div className="help-text" style={{ textAlign: 'center', padding: '16px 0' }}>
                还没有食材，点击下方按钮添加
              </div>
            )}
            {draft.ingredients.map((ing) => (
              <div key={ing.id} className="ingredient-row">
                <input
                  type="text"
                  className="input"
                  placeholder="食材名称"
                  value={ing.name}
                  onChange={(e) => updateIngredient(ing.id, { name: e.target.value })}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="数量"
                  value={ing.quantity}
                  onChange={(e) => updateIngredient(ing.id, { quantity: e.target.value })}
                />
                <select
                  className="select"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(ing.id, { unit: e.target.value })}
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <select
                  className="select"
                  value={ing.category}
                  onChange={(e) => updateIngredient(ing.id, { category: e.target.value as IngredientCategory })}
                >
                  {categoryOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <div className="ingredient-row-remove">
                  <button
                    className="btn btn-icon"
                    onClick={() => removeIngredient(ing.id)}
                    title="删除食材"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            <div className="add-row">
              <button className="btn btn-secondary btn-sm" onClick={addIngredient}>
                + 添加食材
              </button>
            </div>
            <div className="help-text" style={{ textAlign: 'center' }}>
              💡 提示：可为每种食材设置替代选项，方便用户替换
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="editor-section">
          <h3 className="section-title">👨‍🍳 分步做法</h3>
          <div className="step-list">
            {draft.steps.map((step, idx) => (
              <div key={step.id} className="step-item">
                <div className="step-header">
                  <span className="step-number">{idx + 1}</span>
                  <button
                    className="btn btn-icon"
                    onClick={() => removeStep(step.id)}
                    disabled={draft.steps.length <= 1}
                    title="删除步骤"
                    style={draft.steps.length <= 1 ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  className="textarea"
                  placeholder="描述这一步的做法..."
                  value={step.description}
                  onChange={(e) => updateStep(step.id, { description: e.target.value })}
                  rows={3}
                />
                {step.imageUrl ? (
                  <div className="step-image-preview">
                    <img src={step.imageUrl} alt={`步骤${idx + 1}`} />
                    <button
                      className="step-image-remove"
                      onClick={() => updateStep(step.id, { imageUrl: null })}
                      title="移除图片"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="step-image-upload">
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(step.id, file);
                      }}
                    />
                    <div style={{ fontSize: 14, color: 'var(--color-text-light)' }}>
                      📷 点击上传步骤图片
                    </div>
                    <div className="help-text">支持 JPG、PNG 等格式</div>
                  </label>
                )}
              </div>
            ))}
            <div className="add-row">
              <button className="btn btn-secondary btn-sm" onClick={addStep}>
                + 添加步骤
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
