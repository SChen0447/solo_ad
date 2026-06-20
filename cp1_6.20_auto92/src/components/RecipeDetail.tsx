import { useState } from 'react';
import { useRecipeContext } from '../App';
import { formatMinutes } from '../utils';
import './RecipeDetail.css';

function RecipeDetail() {
  const {
    currentRecipe,
    setViewMode,
    addStep,
    updateStep,
    deleteStep,
    reorderSteps,
    updateRecipe,
    setCurrentStepIndex,
  } = useRecipeContext();

  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const [newStep, setNewStep] = useState({
    name: '',
    description: '',
    duration: 1,
    hasTimer: false,
  });

  const [editStep, setEditStep] = useState({
    name: '',
    description: '',
    duration: 1,
    hasTimer: false,
  });

  if (!currentRecipe) return null;

  const handleStartCooking = () => {
    if (currentRecipe.steps.length === 0) {
      alert('请先添加步骤');
      return;
    }
    setCurrentStepIndex(0);
    setViewMode('cooking');
  };

  const handleAddStep = () => {
    if (!newStep.name.trim()) return;

    addStep(currentRecipe.id, {
      name: newStep.name.trim(),
      description: newStep.description.trim(),
      duration: newStep.duration,
      hasTimer: newStep.hasTimer,
    });

    setNewStep({ name: '', description: '', duration: 1, hasTimer: false });
    setIsAddingStep(false);
  };

  const handleStartEditStep = (stepId: string) => {
    const step = currentRecipe.steps.find((s) => s.id === stepId);
    if (!step) return;

    setEditStep({
      name: step.name,
      description: step.description,
      duration: step.duration,
      hasTimer: step.hasTimer,
    });
    setEditingStepId(stepId);
  };

  const handleSaveEditStep = () => {
    if (!editingStepId || !editStep.name.trim()) return;

    updateStep(currentRecipe.id, editingStepId, {
      name: editStep.name.trim(),
      description: editStep.description.trim(),
      duration: editStep.duration,
      hasTimer: editStep.hasTimer,
    });

    setEditingStepId(null);
  };

  const handleStartEditRecipe = () => {
    setEditName(currentRecipe.name);
    setEditDesc(currentRecipe.description);
    setIsEditingRecipe(true);
  };

  const handleSaveRecipe = () => {
    if (!editName.trim()) return;

    updateRecipe(currentRecipe.id, {
      name: editName.trim(),
      description: editDesc.trim(),
    });

    setIsEditingRecipe(false);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === toIndex) return;

    reorderSteps(currentRecipe.id, dragIndex, toIndex);
    setDragIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const totalDuration = currentRecipe.steps.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="recipe-detail">
      <div className="detail-header">
        {isEditingRecipe ? (
          <div className="edit-recipe-form">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="recipe-input recipe-name-input"
              autoFocus
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="recipe-textarea"
              rows={2}
              placeholder="食谱描述"
            />
            <div className="form-actions">
              <button className="btn btn-sm btn-primary" onClick={handleSaveRecipe}>
                保存
              </button>
              <button className="btn btn-sm" onClick={() => setIsEditingRecipe(false)}>
                取消
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="detail-title-section">
              <h2 className="detail-title">{currentRecipe.name}</h2>
              <button className="btn btn-sm edit-btn" onClick={handleStartEditRecipe}>
                编辑
              </button>
            </div>
            {currentRecipe.description && (
              <p className="detail-description">{currentRecipe.description}</p>
            )}
            <div className="detail-meta">
              <span>{currentRecipe.steps.length} 个步骤</span>
              <span>·</span>
              <span>总时长约 {formatMinutes(totalDuration)}</span>
            </div>
          </>
        )}
      </div>

      <div className="detail-actions">
        <button className="btn btn-primary start-cooking-btn" onClick={handleStartCooking}>
          🍳 开始烹饪
        </button>
      </div>

      <div className="steps-section">
        <div className="steps-header">
          <h3 className="steps-title">烹饪步骤</h3>
          <button className="btn btn-sm" onClick={() => setIsAddingStep(true)}>
            + 添加步骤
          </button>
        </div>

        {isAddingStep && (
          <div className="step-form">
            <input
              type="text"
              placeholder="步骤名称"
              value={newStep.name}
              onChange={(e) => setNewStep({ ...newStep, name: e.target.value })}
              className="recipe-input"
              autoFocus
            />
            <textarea
              placeholder="步骤描述（可选）"
              value={newStep.description}
              onChange={(e) => setNewStep({ ...newStep, description: e.target.value })}
              className="recipe-textarea"
              rows={2}
            />
            <div className="step-form-row">
              <div className="duration-input">
                <label>时长（分钟）：</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={newStep.duration}
                  onChange={(e) => setNewStep({ ...newStep, duration: parseFloat(e.target.value) || 0 })}
                  className="recipe-input small-input"
                />
              </div>
              <label className="timer-checkbox">
                <input
                  type="checkbox"
                  checked={newStep.hasTimer}
                  onChange={(e) => setNewStep({ ...newStep, hasTimer: e.target.checked })}
                />
                启用定时器提醒
              </label>
            </div>
            <div className="form-actions">
              <button className="btn btn-sm btn-primary" onClick={handleAddStep}>
                添加
              </button>
              <button className="btn btn-sm" onClick={() => setIsAddingStep(false)}>
                取消
              </button>
            </div>
          </div>
        )}

        <div className="steps-list">
          {currentRecipe.steps.map((step, index) => (
            <div
              key={step.id}
              className={`step-item ${dragIndex === index ? 'dragging' : ''}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {editingStepId === step.id ? (
                <div className="step-edit-form">
                  <input
                    type="text"
                    value={editStep.name}
                    onChange={(e) => setEditStep({ ...editStep, name: e.target.value })}
                    className="recipe-input"
                    autoFocus
                  />
                  <textarea
                    value={editStep.description}
                    onChange={(e) => setEditStep({ ...editStep, description: e.target.value })}
                    className="recipe-textarea"
                    rows={2}
                  />
                  <div className="step-form-row">
                    <div className="duration-input">
                      <label>时长（分钟）：</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={editStep.duration}
                        onChange={(e) =>
                          setEditStep({ ...editStep, duration: parseFloat(e.target.value) || 0 })
                        }
                        className="recipe-input small-input"
                      />
                    </div>
                    <label className="timer-checkbox">
                      <input
                        type="checkbox"
                        checked={editStep.hasTimer}
                        onChange={(e) => setEditStep({ ...editStep, hasTimer: e.target.checked })}
                      />
                      启用定时器提醒
                    </label>
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-sm btn-primary" onClick={handleSaveEditStep}>
                      保存
                    </button>
                    <button className="btn btn-sm" onClick={() => setEditingStepId(null)}>
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="step-number">{index + 1}</div>
                  <div className="step-content">
                    <div className="step-header">
                      <h4 className="step-name">{step.name}</h4>
                      <div className="step-duration">
                        {step.hasTimer && <span className="timer-icon">⏱</span>}
                        {formatMinutes(step.duration)}
                      </div>
                    </div>
                    {step.description && (
                      <p className="step-description">{step.description}</p>
                    )}
                  </div>
                  <div className="step-actions">
                    <button
                      className="btn btn-sm"
                      onClick={() => handleStartEditStep(step.id)}
                    >
                      编辑
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        if (confirm(`确定要删除步骤"${step.name}"吗？`)) {
                          deleteStep(currentRecipe.id, step.id);
                        }
                      }}
                    >
                      删除
                    </button>
                  </div>
                  <div className="drag-handle" title="拖拽排序">
                    ⋮⋮
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {currentRecipe.steps.length === 0 && !isAddingStep && (
          <div className="empty-steps">
            <p>还没有步骤</p>
            <p className="empty-hint">点击上方"添加步骤"按钮开始创建</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecipeDetail;
