import { useState } from 'react';
import { Theme } from './componentData';

interface ComponentRenderProps {
  type: 'button' | 'card' | 'input' | 'modal';
  props: Record<string, any>;
  theme: Theme;
}

function ComponentRender({ type, props, theme }: ComponentRenderProps) {
  const [inputValue, setInputValue] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  switch (type) {
    case 'button': {
      const variant = props.variant || 'primary';
      let buttonStyle: React.CSSProperties = {
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        border: 'none',
        transition: 'all 0.2s ease'
      };

      if (variant === 'primary') {
        buttonStyle = {
          ...buttonStyle,
          backgroundColor: theme.primaryColor,
          color: '#ffffff'
        };
      } else if (variant === 'secondary') {
        buttonStyle = {
          ...buttonStyle,
          backgroundColor: theme.secondaryColor,
          color: '#ffffff'
        };
      } else if (variant === 'outline') {
        buttonStyle = {
          ...buttonStyle,
          backgroundColor: 'transparent',
          color: theme.primaryColor,
          border: `1.5px solid ${theme.primaryColor}`
        };
      }

      return (
        <button
          style={buttonStyle}
          onClick={() => {}}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {props.text || 'Button'}
        </button>
      );
    }

    case 'card': {
      return (
        <div
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(0,0,0,0.1)',
            backgroundColor: theme.bgColor,
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#1f2937',
              marginBottom: '4px'
            }}
          >
            {props.title || 'Card Title'}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.4 }}>
            {props.description || 'Card description goes here.'}
          </div>
        </div>
      );
    }

    case 'input': {
      return (
        <div style={{ width: '100%' }}>
          {props.label && (
            <div
              style={{
                fontSize: '12px',
                color: '#374151',
                marginBottom: '4px',
                fontWeight: 500
              }}
            >
              {props.label}
            </div>
          )}
          <input
            type={props.label?.toLowerCase().includes('password') ? 'password' : 'text'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={props.placeholder || 'Enter value...'}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: `1.5px solid ${theme.secondaryColor}40`,
              borderRadius: '6px',
              fontSize: '13px',
              boxSizing: 'border-box',
              outline: 'none',
              backgroundColor: theme.bgColor,
              color: '#1f2937',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.secondaryColor;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = `${theme.secondaryColor}40`;
            }}
          />
        </div>
      );
    }

    case 'modal': {
      return (
        <>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: theme.primaryColor,
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
          >
            Open Modal
          </button>
          {modalOpen && (
            <div className="modal-overlay" onClick={() => setModalOpen(false)}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ backgroundColor: theme.bgColor }}
              >
                <h3
                  style={{
                    margin: '0 0 12px 0',
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#1f2937'
                  }}
                >
                  {props.title || 'Modal Title'}
                </h3>
                <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '14px' }}>
                  {props.content || 'Modal content goes here.'}
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setModalOpen(false)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: `1.5px solid ${theme.primaryColor}`,
                      backgroundColor: 'transparent',
                      color: theme.primaryColor,
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setModalOpen(false)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: theme.primaryColor,
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                  >
                    {props.buttonText || 'OK'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }

    default:
      return null;
  }
}

export default ComponentRender;
