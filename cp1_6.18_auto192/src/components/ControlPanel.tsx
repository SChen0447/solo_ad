import { useState, useRef } from 'react';
import { useWebRTCStore, VirtualBackground } from '../store/webrtcStore';

const PRESET_BACKGROUNDS = [
  { key: 'beach', label: '海滩', gradient: 'linear-gradient(180deg, #0077b6 0%, #00b4d8 40%, #caf0f8 100%)' },
  { key: 'office', label: '办公室', gradient: 'linear-gradient(180deg, #495057 0%, #6c757d 50%, #adb5bd 100%)' },
  { key: 'stars', label: '星空', gradient: 'linear-gradient(180deg, #03071e 0%, #14213d 50%, #3a0ca3 100%)' },
  { key: 'blur', label: '模糊', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
];

export function ControlPanel() {
  const {
    virtualBackground,
    setVirtualBackground,
    blurIntensity,
    updateBlurIntensity,
    isBlurEnabled,
    setIsBlurEnabled,
    toggleShareScreen,
    isScreenSharing,
    remoteStreams,
  } = useWebRTCStore();

  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePresetSelect = (preset: typeof PRESET_BACKGROUNDS[number]) => {
    if (preset.key === 'blur') {
      setIsBlurEnabled(true);
      setVirtualBackground({ type: 'blur', blurIntensity });
    } else {
      setIsBlurEnabled(false);
      setVirtualBackground({ type: 'preset', presetKey: preset.key, imageUrl: preset.gradient });
    }
  };

  const handleClearBackground = () => {
    setVirtualBackground({ type: 'none' });
    setIsBlurEnabled(false);
    setCustomPreview(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('仅支持 JPG 或 PNG 格式');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCustomPreview(result);
      setIsBlurEnabled(false);
      setVirtualBackground({ type: 'custom', imageUrl: result });
    };
    reader.readAsDataURL(file);
  };

  const handleBlurIntensityChange = (value: number) => {
    updateBlurIntensity(value);
    if (isBlurEnabled) {
      setVirtualBackground({ type: 'blur', blurIntensity: value });
    }
  };

  const handleToggleBlur = () => {
    const newEnabled = !isBlurEnabled;
    setIsBlurEnabled(newEnabled);
    if (newEnabled) {
      setVirtualBackground({ type: 'blur', blurIntensity });
    } else {
      setVirtualBackground({ type: 'none' });
    }
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '24px',
  };

  const sectionTitleStyle: React.CSSProperties = {
    color: '#e2e8f0',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  };

  const buttonBaseStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: '#ffffff',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    width: '100%',
  };

  const isPresetSelected = (bg: VirtualBackground, key: string) =>
    bg.type === 'preset' && bg.presetKey === key;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#1e293b',
        padding: '20px',
        boxSizing: 'border-box',
        overflowY: 'auto' as const,
      }}
    >
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>虚拟背景</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
          }}
        >
          {PRESET_BACKGROUNDS.map((preset) => (
            <div
              key={preset.key}
              onClick={() => handlePresetSelect(preset)}
              style={{
                width: '100%',
                height: '72px',
                borderRadius: '8px',
                background: preset.gradient,
                cursor: 'pointer',
                position: 'relative',
                border: (virtualBackground.type === 'blur' && preset.key === 'blur') ||
                  isPresetSelected(virtualBackground, preset.key)
                  ? '3px solid #3b82f6'
                  : '3px solid transparent',
                transition: 'border-color 0.2s ease, transform 0.2s ease',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.filter = 'brightness(1.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '0',
                  right: '0',
                  padding: '4px 8px',
                  fontSize: '11px',
                  color: '#ffffff',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  textAlign: 'center' as const,
                }}
              >
                {preset.label}
              </div>
            </div>
          ))}

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              height: '72px',
              borderRadius: '8px',
              background: customPreview
                ? `url(${customPreview}) center/cover no-repeat`
                : '#334155',
              cursor: 'pointer',
              position: 'relative',
              border: virtualBackground.type === 'custom'
                ? '3px solid #3b82f6'
                : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color 0.2s ease, transform 0.2s ease',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.filter = 'brightness(1.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            {!customPreview && (
              <span style={{ color: '#94a3b8', fontSize: '24px' }}>+</span>
            )}
            <div
              style={{
                position: 'absolute',
                bottom: '0',
                left: '0',
                right: '0',
                padding: '4px 8px',
                fontSize: '11px',
                color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                textAlign: 'center' as const,
              }}
            >
              {customPreview ? '自定义' : '上传'}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>

        <button
          onClick={handleClearBackground}
          style={{
            ...buttonBaseStyle,
            marginTop: '12px',
            width: '100%',
            background: '#475569',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.filter = 'brightness(1.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.filter = 'brightness(1)';
          }}
        >
          清除背景
        </button>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>背景模糊</div>
        <button
          onClick={handleToggleBlur}
          style={{
            ...buttonBaseStyle,
            width: '100%',
            marginBottom: '12px',
            background: isBlurEnabled
              ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
              : '#475569',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.filter = 'brightness(1.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.filter = 'brightness(1)';
          }}
        >
          {isBlurEnabled ? '已启用模糊' : '启用背景模糊'}
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#cbd5e1',
            fontSize: '13px',
          }}
        >
          <span>1</span>
          <input
            type="range"
            min="1"
            max="10"
            value={blurIntensity}
            onChange={(e) => handleBlurIntensityChange(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#8b5cf6' }}
          />
          <span>10</span>
        </div>
        <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px', textAlign: 'center' }}>
          强度: {blurIntensity}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>屏幕共享</div>
        <button
          onClick={toggleShareScreen}
          style={{
            ...primaryButtonStyle,
            background: isScreenSharing
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.filter = 'brightness(1.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.filter = 'brightness(1)';
          }}
        >
          {isScreenSharing ? '停止共享' : '共享屏幕'}
        </button>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>参会者 ({remoteStreams.length + 1})</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px',
              backgroundColor: '#334155',
              borderRadius: '6px',
              color: '#e2e8f0',
              fontSize: '13px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                marginRight: '8px',
              }}
            />
            {useWebRTCStore.getState().nickname || '我'} (主持)
          </div>
          {remoteStreams.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                backgroundColor: '#334155',
                borderRadius: '6px',
                color: '#e2e8f0',
                fontSize: '13px',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  marginRight: '8px',
                }}
              />
              {p.nickname}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
