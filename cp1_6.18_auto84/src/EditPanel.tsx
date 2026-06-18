import React from 'react';
import { Variant, FIELD_LABELS, DiffField } from './types';
import { useStore } from './store';

interface EditPanelProps {
  variant: Variant | null;
}

export const EditPanel: React.FC<EditPanelProps> = React.memo(({ variant }) => {
  const updateVariant = useStore((state) => state.updateVariant);

  const handleChange = (field: DiffField, value: string | number) => {
    if (variant) {
      updateVariant(variant.id, { [field]: value });
    }
  };

  if (!variant) {
    return (
      <div className="edit-panel">
        <div className="edit-empty">请选择一个变体进行编辑</div>
      </div>
    );
  }

  return (
    <div className="edit-panel">
      <h3 className="edit-title">编辑属性 — {variant.name}</h3>

      <div className="form-group">
        <label htmlFor="title">{FIELD_LABELS.title}</label>
        <input
          type="text"
          id="title"
          value={variant.title}
          onChange={(e) => handleChange('title', e.target.value)}
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">{FIELD_LABELS.description}</label>
        <textarea
          id="description"
          value={variant.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className="form-textarea"
          rows={3}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="btnText">{FIELD_LABELS.btnText}</label>
          <input
            type="text"
            id="btnText"
            value={variant.btnText}
            onChange={(e) => handleChange('btnText', e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="btnColor">{FIELD_LABELS.btnColor}</label>
          <div className="color-input-wrapper">
            <input
              type="color"
              id="btnColor"
              value={variant.btnColor}
              onChange={(e) => handleChange('btnColor', e.target.value)}
              className="form-color"
            />
            <input
              type="text"
              value={variant.btnColor}
              onChange={(e) => handleChange('btnColor', e.target.value)}
              className="form-input color-text"
            />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="bgUrl">{FIELD_LABELS.bgUrl}</label>
        <input
          type="url"
          id="bgUrl"
          value={variant.bgUrl}
          onChange={(e) => handleChange('bgUrl', e.target.value)}
          className="form-input"
          placeholder="https://..."
        />
      </div>

      <div className="form-group">
        <label htmlFor="fontSize">
          {FIELD_LABELS.fontSize}: {variant.fontSize}px
        </label>
        <input
          type="range"
          id="fontSize"
          min="24"
          max="72"
          value={variant.fontSize}
          onChange={(e) => handleChange('fontSize', Number(e.target.value))}
          className="form-range"
        />
        <div className="range-labels">
          <span>24px</span>
          <span>72px</span>
        </div>
      </div>
    </div>
  );
});

EditPanel.displayName = 'EditPanel';
