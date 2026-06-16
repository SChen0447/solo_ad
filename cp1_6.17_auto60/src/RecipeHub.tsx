import { useState, useMemo, useRef } from 'react';
import type { Recipe, Ingredient } from './types';

interface RecipeHubProps {
  recipes: Recipe[];
  addRecipe: (recipe: Omit<Recipe, 'id' | 'dominantColor'>) => Promise<Recipe | null>;
}

const PRESET_TAGS = ['素食', '高蛋白', '快手', '健康', '低卡', '家常', '硬菜', '早餐', '下饭', '宴客', '海鲜', '川菜', '西餐', '养生'];

export default function RecipeHub({ recipes, addRecipe }: RecipeHubProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [collapseIngredients, setCollapseIngredients] = useState(true);
  const [collapseSteps, setCollapseSteps] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    recipes.forEach((r) => r.tags.forEach((t) => s.add(t)));
    PRESET_TAGS.forEach((t) => s.add(t));
    return Array.from(s);
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recipes.filter((r) => {
      const matchQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(q)) ||
        r.tags.some((t) => t.toLowerCase().includes(q));
      const matchTags =
        selectedTags.length === 0 || selectedTags.every((t) => r.tags.includes(t));
      return matchQuery && matchTags;
    });
  }, [recipes, searchQuery, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleCardClick = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setCollapseIngredients(true);
      setCollapseSteps(true);
    } else {
      setExpandedId(id);
      setCollapseIngredients(true);
      setCollapseSteps(true);
    }
  };

  const handleAddToPlan = (recipe: Recipe, e: React.MouseEvent) => {
    e.stopPropagation();
    showToast(`✅ 「${recipe.name}」已加入排餐计划候选！请前往「排餐计划」页面安排餐食。`);
  };

  return (
    <div ref={containerRef}>
      {toast && (
        <div style={toastStyle}>
          <span>{toast}</span>
        </div>
      )}

      <div style={toolbarStyle}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={searchBoxStyle}>
            <span style={{ marginRight: '8px' }}>🔍</span>
            <input
              type="text"
              placeholder="搜索食谱名、食材或标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={searchInputStyle}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={clearBtnStyle}>×</button>
            )}
          </div>
          <button className="coral-gradient-btn" onClick={() => setShowUpload(true)} style={{ whiteSpace: 'nowrap' }}>
            + 上传食谱
          </button>
        </div>
      </div>

      <div style={tagBarStyle}>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            style={{
              ...tagChipStyle,
              ...(selectedTags.includes(tag) ? tagChipActiveStyle : {}),
            }}
          >
            {tag}
          </button>
        ))}
        {selectedTags.length > 0 && (
          <button onClick={() => setSelectedTags([])} style={tagClearStyle}>
            清除筛选
          </button>
        )}
      </div>

      <div style={{ fontSize: '13px', color: '#888', marginTop: '8px', marginBottom: '16px' }}>
        共找到 <b style={{ color: '#ff7f50' }}>{filteredRecipes.length}</b> 个食谱
      </div>

      {filteredRecipes.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🍽️</div>
          <div style={{ fontSize: '18px', color: '#666', marginBottom: '8px' }}>暂无匹配的食谱</div>
          <div style={{ fontSize: '14px', color: '#999' }}>试试调整筛选条件或上传一个新食谱吧~</div>
        </div>
      ) : (
        <div style={masonryStyle}>
          {filteredRecipes.map((recipe) => (
            <div key={recipe.id} style={{ ...cardWrapperStyle }}>
              <div
                onClick={() => handleCardClick(recipe.id)}
                style={{
                  ...cardStyle,
                  ...(expandedId === recipe.id ? cardExpandedStyle : {}),
                }}
                className="fade-in"
              >
                <div style={imageContainerStyle}>
                  <img
                    src={recipe.coverUrl}
                    alt={recipe.name}
                    style={imageStyle}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        `https://placehold.co/400x300/${(recipe.dominantColor || '#ff7f50').replace('#', '')}/ffffff?text=${encodeURIComponent(recipe.name)}`;
                    }}
                  />
                  <div style={imageOverlayStyle} />
                  <div style={timeBadgeStyle}>
                    ⏱️ {recipe.prepTime + recipe.cookTime}分钟
                  </div>
                </div>

                <div style={cardContentStyle}>
                  <h3 style={cardTitleStyle}>{recipe.name}</h3>
                  <p style={cardDescStyle}>{recipe.description}</p>
                  <div style={cardTagsStyle}>
                    {recipe.tags.map((tag) => (
                      <span key={tag} style={cardTagStyle}>{tag}</span>
                    ))}
                  </div>

                  {expandedId === recipe.id && (
                    <div style={{ marginTop: '16px' }} className="fade-in">
                      <DetailsPanel
                        title={`🥕 食材清单 (${recipe.ingredients.length}项)`}
                        collapsed={collapseIngredients}
                        onToggle={() => setCollapseIngredients((v) => !v)}
                      >
                        <ul style={ingredientListStyle}>
                          {recipe.ingredients.map((ing, idx) => (
                            <li key={idx} style={ingredientItemStyle}>
                              <span style={{ flex: 1 }}>{ing.name}</span>
                              <span style={ingredientAmountStyle}>{ing.amount}</span>
                            </li>
                          ))}
                        </ul>
                      </DetailsPanel>

                      <DetailsPanel
                        title={`👨‍🍳 烹饪步骤 (${recipe.steps.length}步)`}
                        collapsed={collapseSteps}
                        onToggle={() => setCollapseSteps((v) => !v)}
                      >
                        <ol style={stepListStyle}>
                          {recipe.steps.map((step, idx) => (
                            <li key={idx} style={stepItemStyle}>
                              <span style={stepNumStyle}>{idx + 1}</span>
                              <span style={{ flex: 1 }}>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </DetailsPanel>

                      <div style={detailActionsStyle}>
                        <button
                          className="coral-gradient-btn"
                          onClick={(e) => handleAddToPlan(recipe, e)}
                          style={{ width: '100%' }}
                        >
                          📅 加入排餐计划
                        </button>
                      </div>
                    </div>
                  )}

                  {expandedId !== recipe.id && (
                    <div style={expandHintStyle}>点击查看详情 →</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSubmit={async (data) => {
            const res = await addRecipe(data);
            if (res) {
              setShowUpload(false);
              showToast(`🎉 食谱「${data.name}」上传成功！`);
            }
          }}
        />
      )}
    </div>
  );
}

function DetailsPanel({
  title,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={panelStyle}>
      <button onClick={onToggle} style={panelHeaderStyle}>
        <span style={{ fontWeight: 600, fontSize: '14px' }}>{title}</span>
        <span style={{
          transition: 'transform 0.3s ease',
          transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
        }}>▼</span>
      </button>
      {!collapsed && (
        <div style={panelBodyStyle} className="fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

function UploadModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: Omit<Recipe, 'id' | 'dominantColor'>) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    prepTime: 10,
    cookTime: 15,
    coverUrl: '',
    description: '',
  });
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', amount: '' },
    { name: '', amount: '' },
  ]);
  const [steps, setSteps] = useState<string[]>(['', '']);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const addIngredient = () =>
    setIngredients((prev) => [...prev, { name: '', amount: '' }]);
  const removeIngredient = (idx: number) =>
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  const updateIngredient = (idx: number, field: keyof Ingredient, value: string) =>
    setIngredients((prev) =>
      prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing))
    );

  const addStep = () => setSteps((prev) => [...prev, '']);
  const removeStep = (idx: number) =>
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  const updateStep = (idx: number, value: string) =>
    setSteps((prev) => prev.map((s, i) => (i === idx ? value : s)));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
      setTagInput('');
    }
  };
  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const canSubmit =
    form.name.trim() &&
    form.coverUrl.trim() &&
    ingredients.some((i) => i.name.trim() && i.amount.trim()) &&
    steps.some((s) => s.trim());

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#333' }}>📝 上传新食谱</h2>
          <button onClick={onClose} style={modalCloseStyle}>×</button>
        </div>

        <div style={{ overflowY: 'auto', maxHeight: '70vh', paddingRight: '4px' }}>
          <FormRow label="食谱名称" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例如：番茄炒蛋"
              style={textInputStyle}
            />
          </FormRow>

          <div style={formRowGridStyle}>
            <FormRow label="准备时间(分钟)">
              <input
                type="number"
                min={0}
                value={form.prepTime}
                onChange={(e) => setForm({ ...form, prepTime: parseInt(e.target.value) || 0 })}
                style={textInputStyle}
              />
            </FormRow>
            <FormRow label="烹饪时间(分钟)">
              <input
                type="number"
                min={0}
                value={form.cookTime}
                onChange={(e) => setForm({ ...form, cookTime: parseInt(e.target.value) || 0 })}
                style={textInputStyle}
              />
            </FormRow>
          </div>

          <FormRow label="封面图片URL" required>
            <input
              type="url"
              value={form.coverUrl}
              onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
              style={textInputStyle}
            />
            {form.coverUrl && (
              <img
                src={form.coverUrl}
                alt="预览"
                style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px' }}
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
              />
            )}
          </FormRow>

          <FormRow label="简短描述">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="一句话介绍这道菜..."
              rows={2}
              style={{ ...textInputStyle, resize: 'vertical' }}
            />
          </FormRow>

          <FormRow label="所需食材" required>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ingredients.map((ing, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                    placeholder="食材名"
                    style={{ ...textInputStyle, flex: 2 }}
                  />
                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(idx, 'amount', e.target.value)}
                    placeholder="份量，如 300克"
                    style={{ ...textInputStyle, flex: 1 }}
                  />
                  {ingredients.length > 1 && (
                    <button
                      onClick={() => removeIngredient(idx)}
                      style={iconRemoveBtnStyle}
                    >−</button>
                  )}
                </div>
              ))}
              <button onClick={addIngredient} style={addBtnStyle}>+ 添加食材</button>
            </div>
          </FormRow>

          <FormRow label="烹饪步骤" required>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {steps.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={stepNumBadgeStyle}>{idx + 1}</span>
                  <textarea
                    value={step}
                    onChange={(e) => updateStep(idx, e.target.value)}
                    placeholder="描述这一步的操作..."
                    rows={2}
                    style={{ ...textInputStyle, flex: 1, resize: 'vertical' }}
                  />
                  {steps.length > 1 && (
                    <button
                      onClick={() => removeStep(idx)}
                      style={iconRemoveBtnStyle}
                    >−</button>
                  )}
                </div>
              ))}
              <button onClick={addStep} style={addBtnStyle}>+ 添加步骤</button>
            </div>
          </FormRow>

          <FormRow label="标签">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="输入标签后回车添加"
                style={{ ...textInputStyle, flex: 1 }}
              />
              <button onClick={addTag} style={addBtnStyle}>添加</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {tags.map((t) => (
                <span key={t} style={selectedTagStyle}>
                  {t}
                  <button onClick={() => removeTag(t)} style={tagCloseStyle}>×</button>
                </span>
              ))}
              {PRESET_TAGS.map((t) => (
                !tags.includes(t) && (
                  <button
                    key={t}
                    onClick={() => setTags((prev) => [...prev, t])}
                    style={presetTagStyle}
                  >
                    + {t}
                  </button>
                )
              ))}
            </div>
          </FormRow>
        </div>

        <div style={modalFooterStyle}>
          <button onClick={onClose} style={cancelBtnStyle}>取消</button>
          <button
            className="coral-gradient-btn"
            disabled={!canSubmit}
            onClick={() =>
              canSubmit &&
              onSubmit({
                ...form,
                ingredients: ingredients.filter((i) => i.name.trim() && i.amount.trim()),
                steps: steps.filter((s) => s.trim()),
                tags,
              })
            }
            style={{ opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
          >
            🚀 发布食谱
          </button>
        </div>
      </div>
    </div>
  );
}

function FormRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={formLabelStyle}>
        {label}
        {required && <span style={{ color: '#ff4d4f', marginLeft: '2px' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const toastStyle: React.CSSProperties = {
  position: 'fixed',
  top: '80px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: '#fff',
  color: '#333',
  padding: '12px 24px',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  zIndex: 10000,
  fontSize: '14px',
  maxWidth: '90%',
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  marginBottom: '16px',
  flexWrap: 'wrap',
};

const searchBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  background: '#fff',
  borderRadius: '12px',
  padding: '0 14px',
  border: '2px solid #ffe4d6',
  height: '44px',
  minWidth: '280px',
  flex: 1,
  maxWidth: '480px',
  transition: 'border-color 0.2s',
};

const searchInputStyle: React.CSSProperties = {
  flex: 1,
  border: 'none',
  background: 'transparent',
  fontSize: '14px',
  height: '40px',
};

const clearBtnStyle: React.CSSProperties = {
  background: '#f0f0f0',
  color: '#999',
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '16px',
};

const tagBarStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginBottom: '8px',
};

const tagChipStyle: React.CSSProperties = {
  padding: '6px 14px',
  background: '#fff',
  border: '1.5px solid #ffe4d6',
  borderRadius: '20px',
  fontSize: '12px',
  color: '#666',
  transition: 'all 0.2s',
  cursor: 'pointer',
};

const tagChipActiveStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #ff7f50, #e66a3d)',
  color: '#fff',
  borderColor: 'transparent',
};

const tagClearStyle: React.CSSProperties = {
  padding: '6px 14px',
  background: 'transparent',
  color: '#ff7f50',
  fontSize: '12px',
  textDecoration: 'underline',
};

const emptyStateStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '80px 24px',
  background: '#fff',
  borderRadius: '16px',
};

const masonryStyle: React.CSSProperties = {
  columnCount: 4,
  columnGap: '20px',
  '@media (max-width: 1200px)': { columnCount: 3 },
  '@media (max-width: 900px)': { columnCount: 2 },
  '@media (max-width: 600px)': { columnCount: 1 },
} as any;

const cardWrapperStyle: React.CSSProperties = {
  breakInside: 'avoid',
  marginBottom: '20px',
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  cursor: 'pointer',
  display: 'inline-block',
  width: '100%',
};

const cardExpandedStyle: React.CSSProperties = {
  transform: 'translateY(-6px)',
  boxShadow: '0 12px 32px rgba(255,127,80,0.18)',
};

const imageContainerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  paddingTop: '66.67%',
  overflow: 'hidden',
};

const imageStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  transition: 'transform 0.4s ease',
};

const imageOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '60px',
  background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)',
};

const timeBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: '12px',
  right: '12px',
  background: 'rgba(0,0,0,0.65)',
  color: '#fff',
  padding: '4px 10px',
  borderRadius: '12px',
  fontSize: '12px',
  backdropFilter: 'blur(4px)',
};

const cardContentStyle: React.CSSProperties = {
  padding: '16px',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '17px',
  fontWeight: 700,
  color: '#333',
  margin: 0,
  marginBottom: '6px',
};

const cardDescStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#888',
  marginBottom: '10px',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  lineHeight: 1.5,
};

const cardTagsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
};

const cardTagStyle: React.CSSProperties = {
  padding: '3px 10px',
  background: '#fff5ef',
  color: '#ff7f50',
  borderRadius: '10px',
  fontSize: '11px',
  fontWeight: 500,
};

const expandHintStyle: React.CSSProperties = {
  marginTop: '12px',
  fontSize: '12px',
  color: '#ff7f50',
  textAlign: 'center',
  fontWeight: 500,
  paddingTop: '10px',
  borderTop: '1px dashed #ffe4d6',
};

const panelStyle: React.CSSProperties = {
  background: '#fafafa',
  borderRadius: '10px',
  marginBottom: '12px',
  overflow: 'hidden',
};

const panelHeaderStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 14px',
  background: 'transparent',
  color: '#333',
  fontSize: '14px',
};

const panelBodyStyle: React.CSSProperties = {
  padding: '0 14px 14px',
};

const ingredientListStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
};

const ingredientItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 0',
  borderBottom: '1px solid #f0f0f0',
  fontSize: '13px',
  color: '#555',
};

const ingredientAmountStyle: React.CSSProperties = {
  color: '#ff7f50',
  fontWeight: 600,
  fontSize: '12px',
  background: '#fff5ef',
  padding: '2px 10px',
  borderRadius: '10px',
};

const stepListStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
};

const stepItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  padding: '10px 0',
  borderBottom: '1px solid #f0f0f0',
  fontSize: '13px',
  color: '#555',
  lineHeight: 1.7,
};

const stepNumStyle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #ff7f50, #e66a3d)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  fontWeight: 700,
  flexShrink: 0,
  marginTop: '2px',
};

const detailActionsStyle: React.CSSProperties = {
  marginTop: '16px',
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px',
  backdropFilter: 'blur(4px)',
};

const modalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '20px',
  width: '100%',
  maxWidth: '640px',
  maxHeight: '90vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '20px 24px',
  borderBottom: '1px solid #f0f0f0',
  background: 'linear-gradient(135deg, #fffaf0, #fff0e6)',
};

const modalCloseStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: '#f0f0f0',
  color: '#666',
  fontSize: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
};

const modalFooterStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderTop: '1px solid #f0f0f0',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '10px 24px',
  background: '#f5f5f5',
  color: '#666',
  borderRadius: '8px',
  fontSize: '14px',
  transition: 'all 0.2s',
};

const textInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1.5px solid #eee',
  borderRadius: '10px',
  fontSize: '14px',
  transition: 'border-color 0.2s',
  background: '#fff',
  color: '#333',
};

const formLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#555',
  marginBottom: '6px',
};

const formRowGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
};

const iconRemoveBtnStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  background: '#fff1f0',
  color: '#ff4d4f',
  fontSize: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  alignSelf: 'flex-start',
  marginTop: '2px',
};

const addBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#fff5ef',
  color: '#ff7f50',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 500,
  alignSelf: 'flex-start',
};

const stepNumBadgeStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #ff7f50, #e66a3d)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '13px',
  fontWeight: 700,
  flexShrink: 0,
  marginTop: '2px',
};

const selectedTagStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  background: 'linear-gradient(135deg, #ff7f50, #e66a3d)',
  color: '#fff',
  borderRadius: '12px',
  fontSize: '12px',
};

const tagCloseStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.25)',
  color: '#fff',
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  fontSize: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
};

const presetTagStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: '#fff',
  border: '1px dashed #ffc2a8',
  color: '#ff7f50',
  borderRadius: '12px',
  fontSize: '12px',
};
