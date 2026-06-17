import React, { useState, useEffect, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import {
  useColorStore,
  ColorRole,
  getAvailableRoles,
} from '../stores/colorStore';
import { hexToHSL } from '../utils/colorUtils';

const ALL_ROLES: ColorRole[] = ['主色', '辅色', '强调色', '中性色'];

export const ColorPickerPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempColor, setTempColor] = useState<string>('#3B82F6');
  const [selectedRole, setSelectedRole] = useState<ColorRole>('主色');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const coreColors = useColorStore((state) => state.coreColors);
  const addCoreColor = useColorStore((state) => state.addCoreColor);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const available = getAvailableRoles(coreColors);
      if (available.length > 0) {
        setSelectedRole(available[0]);
      } else if (ALL_ROLES.length > 0) {
        setSelectedRole(ALL_ROLES[0]);
      }
    }
  }, [isOpen, coreColors]);

  const handleConfirm = () => {
    addCoreColor(selectedRole, tempColor);
    setIsOpen(false);
  };

  const hsl = hexToHSL(tempColor);

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: '#3B82F6',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = '#2563EB')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = '#3B82F6')
        }
      >
        + 添加核心色
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 1000,
            width: '300px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
            padding: '20px',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              选择颜色角色
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
              }}
            >
              {ALL_ROLES.map((role) => {
                const isUsed = coreColors.some((c) => c.role === role);
                const isSelected = selectedRole === role;
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    style={{
                      padding: '8px 12px',
                      border: `2px solid ${isSelected ? '#3B82F6' : '#E5E7EB'}`,
                      borderRadius: '6px',
                      backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                      color: isSelected ? '#1D4ED8' : isUsed ? '#9CA3AF' : '#374151',
                      fontSize: '13px',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {role}
                    {isUsed && !isSelected && (
                      <span
                        style={{
                          display: 'block',
                          fontSize: '10px',
                          color: '#9CA3AF',
                          marginTop: '2px',
                        }}
                      >
                        将覆盖
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              拾取颜色
            </label>
            <HexColorPicker
              color={tempColor}
              onChange={setTempColor}
              style={{ width: '100%', borderRadius: '8px' }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                backgroundColor: tempColor,
                border: '2px solid #E5E7EB',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, fontSize: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                }}
              >
                <span style={{ color: '#6B7280' }}>HEX:</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: '#111827',
                  }}
                >
                  {tempColor.toUpperCase()}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ color: '#6B7280' }}>HSL:</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    color: '#374151',
                  }}
                >
                  {hsl.h}° {hsl.s}% {hsl.l}%
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
            }}
          >
            <button
              onClick={() => setIsOpen(false)}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#F3F4F6',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = '#E5E7EB')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = '#F3F4F6')
              }
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = '#2563EB')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = '#3B82F6')
              }
            >
              确认添加
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPickerPanel;
