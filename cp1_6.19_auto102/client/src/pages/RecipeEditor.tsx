import React, { useReducer, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useUser } from '../context/UserContext';
import './RecipeEditor.css';

interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
}

interface Step {
  id: string;
  title: string;
  description: string;
  image: string;
}

interface RecipeState {
  title: string;
  description: string;
  thumbnail: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  tags: string;
  ingredients: Ingredient[];
  steps: Step[];
}

type RecipeAction =
  | { type: 'SET_FIELD'; field: string; value: any }
  | { type: 'ADD_INGREDIENT' }
  | { type: 'UPDATE_INGREDIENT'; id: string; field: string; value: any }
  | { type: 'REMOVE_INGREDIENT'; id: string }
  | { type: 'REORDER_INGREDIENTS'; fromIndex: number; toIndex: number }
  | { type: 'ADD_STEP' }
  | { type: 'UPDATE_STEP'; id: string; field: string; value: any }
  | { type: 'REMOVE_STEP'; id: string }
  | { type: 'REORDER_STEPS'; fromIndex: number; toIndex: number }
  | { type: 'SET_RECIPE'; recipe: Partial<RecipeState> };

const initialState: RecipeState = {
  title: '',
  description: '',
  thumbnail: '',
  servings: 2,
  prepTime: 10,
  cookTime: 20,
  tags: '',
  ingredients: [
    { id: 'ing-1', name: '', amount: 0, unit: '克' },
  ],
  steps: [
    { id: 'step-1', title: '', description: '', image: '' },
  ],
};

function recipeReducer(state: RecipeState, action: RecipeAction): RecipeState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };

    case 'ADD_INGREDIENT':
      const newIng: Ingredient = {
        id: `ing-${Date.now()}`,
        name: '',
        amount: 0,
        unit: '克',
      };
      return { ...state, ingredients: [...state.ingredients, newIng] };

    case 'UPDATE_INGREDIENT':
      return {
        ...state,
        ingredients: state.ingredients.map((ing) =>
          ing.id === action.id ? { ...ing, [action.field]: action.value } : ing
        ),
      };

    case 'REMOVE_INGREDIENT':
      return {
        ...state,
        ingredients: state.ingredients.filter((ing) => ing.id !== action.id),
      };

    case 'REORDER_INGREDIENTS': {
      const result = Array.from(state.ingredients);
      const [removed] = result.splice(action.fromIndex, 1);
      result.splice(action.toIndex, 0, removed);
      return { ...state, ingredients: result };
    }

    case 'ADD_STEP':
      const newStep: Step = {
        id: `step-${Date.now()}`,
        title: '',
        description: '',
        image: '',
      };
      return { ...state, steps: [...state.steps, newStep] };

    case 'UPDATE_STEP':
      return {
        ...state,
        steps: state.steps.map((step) =>
          step.id === action.id ? { ...step, [action.field]: action.value } : step
        ),
      };

    case 'REMOVE_STEP':
      return {
        ...state,
        steps: state.steps.filter((step) => step.id !== action.id),
      };

    case 'REORDER_STEPS': {
      const result = Array.from(state.steps);
      const [removed] = result.splice(action.fromIndex, 1);
      result.splice(action.toIndex, 0, removed);
      return { ...state, steps: result };
    }

    case 'SET_RECIPE':
      return { ...state, ...action.recipe };

    default:
      return state;
  }
}

const RecipeEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useUser();
  const [state, dispatch] = useReducer(recipeReducer, initialState);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'ingredients' | 'steps'>('basic');

  useEffect(() => {
    if (id) {
      fetchRecipe();
    }
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const res = await fetch(`/api/recipes/${id}`);
      const data = await res.json();
      if (data.success) {
        const recipe = data.data;
        dispatch({
          type: 'SET_RECIPE',
          recipe: {
            title: recipe.title,
            description: recipe.description,
            thumbnail: recipe.thumbnail,
            servings: recipe.servings,
            prepTime: recipe.prep_time,
            cookTime: recipe.cook_time,
            tags: recipe.tags,
            ingredients: recipe.ingredients.map((ing: any) => ({
              id: `ing-${ing.id}`,
              name: ing.name,
              amount: ing.amount,
              unit: ing.unit,
            })),
            steps: recipe.steps.map((step: any) => ({
              id: `step-${step.id}`,
              title: step.title,
              description: step.description,
              image: step.image,
            })),
          },
        });
      }
    } catch (err) {
      console.error('获取菜谱失败', err);
    }
  };

  const handleIngredientDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    dispatch({
      type: 'REORDER_INGREDIENTS',
      fromIndex: result.source.index,
      toIndex: result.destination.index,
    });
  };

  const handleStepDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    dispatch({
      type: 'REORDER_STEPS',
      fromIndex: result.source.index,
      toIndex: result.destination.index,
    });
  };

  const handleSubmit = async () => {
    if (!state.title.trim()) {
      alert('请填写菜谱标题');
      return;
    }

    setSaving(true);
    try {
      const url = id ? `/api/recipes/${id}` : '/api/recipes';
      const method = id ? 'PUT' : 'POST';

      const payload = {
        title: state.title,
        description: state.description,
        thumbnail: state.thumbnail,
        servings: state.servings,
        prepTime: state.prepTime,
        cookTime: state.cookTime,
        tags: state.tags,
        ingredients: state.ingredients.map((ing, index) => ({
          ...ing,
          sort_order: index,
        })),
        steps: state.steps.map((step, index) => ({
          ...step,
          sort_order: index,
        })),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        navigate(id ? `/recipe/${id}` : `/recipe/${data.data.id}`);
      } else {
        alert(data.message || '保存失败');
      }
    } catch (err) {
      console.error('保存失败', err);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const estimateTime = () => {
    return (state.prepTime || 0) + (state.cookTime || 0);
  };

  return (
    <div className="recipe-editor-page">
      <div className="editor-header">
        <h1 className="editor-title">{id ? '编辑菜谱' : '创作新菜谱'}</h1>
        <div className="editor-actions">
          <button className="btn-cancel" onClick={() => navigate(-1)}>
            取消
          </button>
          <button
            className="btn-save"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? '保存中...' : '发布菜谱'}
          </button>
        </div>
      </div>

      <div className="editor-tabs">
        <button
          className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          📋 基本信息
        </button>
        <button
          className={`tab-btn ${activeTab === 'ingredients' ? 'active' : ''}`}
          onClick={() => setActiveTab('ingredients')}
        >
          🥗 食材清单
        </button>
        <button
          className={`tab-btn ${activeTab === 'steps' ? 'active' : ''}`}
          onClick={() => setActiveTab('steps')}
        >
          📝 制作步骤
        </button>
      </div>

      <div className="editor-content">
        {activeTab === 'basic' && (
          <div className="basic-info-section fade-in">
            <div className="form-group">
              <label>菜谱标题 *</label>
              <input
                type="text"
                value={state.title}
                onChange={(e) =>
                  dispatch({ type: 'SET_FIELD', field: 'title', value: e.target.value })
                }
                placeholder="给你的菜谱起个名字吧"
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label>菜谱简介</label>
              <textarea
                value={state.description}
                onChange={(e) =>
                  dispatch({ type: 'SET_FIELD', field: 'description', value: e.target.value })
                }
                placeholder="简单介绍一下这道菜的特色..."
                rows={3}
                maxLength={200}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>份量（人份）</label>
                <input
                  type="number"
                  value={state.servings}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_FIELD',
                      field: 'servings',
                      value: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  min="1"
                  max="20"
                />
              </div>
              <div className="form-group">
                <label>准备时间（分钟）</label>
                <input
                  type="number"
                  value={state.prepTime}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_FIELD',
                      field: 'prepTime',
                      value: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>烹饪时间（分钟）</label>
                <input
                  type="number"
                  value={state.cookTime}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_FIELD',
                      field: 'cookTime',
                      value: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  min="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label>预计总时长：{estimateTime()} 分钟</label>
            </div>

            <div className="form-group">
              <label>标签（用逗号分隔）</label>
              <input
                type="text"
                value={state.tags}
                onChange={(e) =>
                  dispatch({ type: 'SET_FIELD', field: 'tags', value: e.target.value })
                }
                placeholder="例如：中式,家常菜,快手菜"
              />
            </div>
          </div>
        )}

        {activeTab === 'ingredients' && (
          <div className="ingredients-section fade-in">
            <div className="section-header">
              <h3>食材清单</h3>
              <button className="btn-add" onClick={() => dispatch({ type: 'ADD_INGREDIENT' })}>
                + 添加食材
              </button>
            </div>

            <DragDropContext onDragEnd={handleIngredientDragEnd}>
              <Droppable droppableId="ingredients">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`ingredients-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  >
                    {state.ingredients.map((ingredient, index) => (
                      <Draggable
                        key={ingredient.id}
                        draggableId={ingredient.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`ingredient-item ${
                              snapshot.isDragging ? 'dragging' : ''
                            }`}
                            style={{ ...provided.draggableProps.style }}
                          >
                            <div {...provided.dragHandleProps} className="drag-handle">
                              ⋮⋮
                            </div>
                            <input
                              type="text"
                              className="ing-name"
                              value={ingredient.name}
                              onChange={(e) =>
                                dispatch({
                                  type: 'UPDATE_INGREDIENT',
                                  id: ingredient.id,
                                  field: 'name',
                                  value: e.target.value,
                                })
                              }
                              placeholder="食材名称"
                            />
                            <input
                              type="number"
                              className="ing-amount"
                              value={ingredient.amount}
                              onChange={(e) =>
                                dispatch({
                                  type: 'UPDATE_INGREDIENT',
                                  id: ingredient.id,
                                  field: 'amount',
                                  value: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="用量"
                            />
                            <input
                              type="text"
                              className="ing-unit"
                              value={ingredient.unit}
                              onChange={(e) =>
                                dispatch({
                                  type: 'UPDATE_INGREDIENT',
                                  id: ingredient.id,
                                  field: 'unit',
                                  value: e.target.value,
                                })
                              }
                              placeholder="单位"
                            />
                            <button
                              className="btn-remove"
                              onClick={() =>
                                dispatch({ type: 'REMOVE_INGREDIENT', id: ingredient.id })
                              }
                              disabled={state.ingredients.length <= 1}
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}

        {activeTab === 'steps' && (
          <div className="steps-section fade-in">
            <div className="section-header">
              <h3>制作步骤</h3>
              <button className="btn-add" onClick={() => dispatch({ type: 'ADD_STEP' })}>
                + 添加步骤
              </button>
            </div>

            <DragDropContext onDragEnd={handleStepDragEnd}>
              <Droppable droppableId="steps">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`steps-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  >
                    {state.steps.map((step, index) => (
                      <Draggable key={step.id} draggableId={step.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`step-editor-item ${
                              snapshot.isDragging ? 'dragging' : ''
                            }`}
                            style={{ ...provided.draggableProps.style }}
                          >
                            <div className="step-header">
                              <div {...provided.dragHandleProps} className="drag-handle">
                                ⋮⋮
                              </div>
                              <span className="step-number">步骤 {index + 1}</span>
                              <button
                                className="btn-remove"
                                onClick={() =>
                                  dispatch({ type: 'REMOVE_STEP', id: step.id })
                                }
                                disabled={state.steps.length <= 1}
                              >
                                删除
                              </button>
                            </div>
                            <div className="step-body">
                              <input
                                type="text"
                                className="step-title-input"
                                value={step.title}
                                onChange={(e) =>
                                  dispatch({
                                    type: 'UPDATE_STEP',
                                    id: step.id,
                                    field: 'title',
                                    value: e.target.value,
                                  })
                                }
                                placeholder="步骤标题（可选）"
                              />
                              <textarea
                                className="step-desc-input"
                                value={step.description}
                                onChange={(e) =>
                                  dispatch({
                                    type: 'UPDATE_STEP',
                                    id: step.id,
                                    field: 'description',
                                    value: e.target.value,
                                  })
                                }
                                placeholder="描述这个步骤的做法..."
                                rows={4}
                              />
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeEditor;
