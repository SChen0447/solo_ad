import React, { useState } from 'react';
import {
  MaterialType,
  EnvironmentPreset,
  LightingParams,
  GeometryMaterials,
  ENVIRONMENT_PRESETS,
  MATERIAL_LABELS
} from './types';

interface ControlPanelProps {
  materials: GeometryMaterials;
  environment: EnvironmentPreset;
  lighting: LightingParams;
  onMaterialChange: (geom: keyof GeometryMaterials, type: MaterialType) => void;
  onEnvironmentChange: (env: EnvironmentPreset) => void;
  onLightingChange: (params: Partial<LightingParams>) => void;
}

const GEOMETRY_LABELS: Record<keyof GeometryMaterials, string> = {
  sphere: '球体',
  cube: '立方体',
  torusKnot: '环面结'
};

const GEOMETRY_ICONS: Record<keyof GeometryMaterials, string> = {
  sphere: '●',
  cube: '■',
  torusKnot: '◈'
};

const ControlPanel: React.FC<ControlPanelProps> = ({
  materials,
  environment,
  lighting,
  onMaterialChange,
  onEnvironmentChange,
  onLightingChange
}) => {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [pressedBtn, setPressedBtn] = useState<string | null>(null);

  const materialTypes: MaterialType[] = [
    MaterialType.DIFFUSE,
    MaterialType.SPECULAR,
    MaterialType.TRANSPARENT,
    MaterialType.BUMP
  ];

  const envList = Object.values(ENVIRONMENT_PRESETS);

  const handleButtonPress = (id: string) => {
    setPressedBtn(id);
    setTimeout(() => setPressedBtn(null), 200);
  };

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>控制面板</h2>
        <div style={styles.panelDivider} />
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>材质选择</h3>
        {(Object.keys(GEOMETRY_LABELS) as Array<keyof GeometryMaterials>).map((geom) => (
          <div key={geom} style={styles.geometryGroup}>
            <div style={styles.geometryLabel}>
              <span style={{ ...styles.geometryIcon, color: ENVIRONMENT_PRESETS[environment].colorHex }}>
                {GEOMETRY_ICONS[geom]}
              </span>
              <span style={styles.geometryName}>{GEOMETRY_LABELS[geom]}</span>
            </div>
            <div style={styles.materialButtonGroup}>
              {materialTypes.map((type) => {
                const btnId = `mat-${geom}-${type}`;
                const isActive = materials[geom] === type;
                const isHovered = hoveredBtn === btnId;
                const isPressed = pressedBtn === btnId;
                return (
                  <button
                    key={type}
                    style={{
                      ...styles.materialButton,
                      ...(isActive ? styles.materialButtonActive : {}),
                      ...(isHovered || isActive ? {
                        boxShadow: `0 0 12px ${ENVIRONMENT_PRESETS[environment].colorHex}55`
                      } : {}),
                      transform: isPressed ? 'scale(0.92)' : (isHovered ? 'scale(1.05)' : 'scale(1)'),
                      transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                    onMouseEnter={() => setHoveredBtn(btnId)}
                    onMouseLeave={() => setHoveredBtn(null)}
                    onMouseDown={() => handleButtonPress(btnId)}
                    onClick={() => onMaterialChange(geom, type)}
                  >
                    {MATERIAL_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={styles.sectionDivider} />

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>光照环境</h3>
        <div style={styles.envGrid}>
          {envList.map((env) => {
            const btnId = `env-${env.id}`;
            const isActive = environment === env.id;
            const isHovered = hoveredBtn === btnId;
            const isPressed = pressedBtn === btnId;
            return (
              <button
                key={env.id}
                style={{
                  ...styles.envButton,
                  ...(isActive ? {
                    ...styles.envButtonActive,
                    borderColor: env.colorHex
                  } : {}),
                  ...(isHovered || isActive ? {
                    boxShadow: `0 0 16px ${env.colorHex}44, inset 0 0 20px ${env.colorHex}15`
                  } : {}),
                  transform: isPressed ? 'scale(0.94)' : (isHovered ? 'scale(1.03)' : 'scale(1)'),
                  transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
                onMouseEnter={() => setHoveredBtn(btnId)}
                onMouseLeave={() => setHoveredBtn(null)}
                onMouseDown={() => handleButtonPress(btnId)}
                onClick={() => onEnvironmentChange(env.id)}
              >
                <div style={{
                  ...styles.envColorDot,
                  background: `radial-gradient(circle at 30% 30%, ${env.colorHex}, ${env.colorHex}88)`,
                  boxShadow: isActive || isHovered ? `0 0 10px ${env.colorHex}` : 'none'
                }} />
                <div style={styles.envInfo}>
                  <span style={styles.envName}>{env.name}</span>
                  <span style={styles.envTemp}>{env.colorTemp}K</span>
                </div>
                {isActive && (
                  <div style={{
                    ...styles.envActiveBar,
                    background: env.colorHex,
                    boxShadow: `0 0 8px ${env.colorHex}`
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={styles.sectionDivider} />

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>自定义光照</h3>

        <div style={styles.sliderGroup}>
          <div style={styles.sliderLabelRow}>
            <span style={styles.sliderLabel}>水平角度</span>
            <span style={styles.sliderValue}>{lighting.horizontalAngle.toFixed(0)}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={lighting.horizontalAngle}
            onChange={(e) => onLightingChange({ horizontalAngle: Number(e.target.value) })}
            style={{
              ...styles.slider,
              accentColor: ENVIRONMENT_PRESETS[environment].colorHex
            }}
          />
        </div>

        <div style={styles.sliderGroup}>
          <div style={styles.sliderLabelRow}>
            <span style={styles.sliderLabel}>光源仰角</span>
            <span style={styles.sliderValue}>{lighting.elevationAngle.toFixed(0)}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="90"
            step="1"
            value={lighting.elevationAngle}
            onChange={(e) => onLightingChange({ elevationAngle: Number(e.target.value) })}
            style={{
              ...styles.slider,
              accentColor: ENVIRONMENT_PRESETS[environment].colorHex
            }}
          />
        </div>

        <div style={styles.sliderGroup}>
          <div style={styles.sliderLabelRow}>
            <span style={styles.sliderLabel}>光源强度</span>
            <span style={styles.sliderValue}>{lighting.lightIntensity.toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            step="1"
            value={lighting.lightIntensity}
            onChange={(e) => onLightingChange({ lightIntensity: Number(e.target.value) })}
            style={{
              ...styles.slider,
              accentColor: ENVIRONMENT_PRESETS[environment].colorHex
            }}
          />
        </div>

        <div style={styles.sliderGroup}>
          <div style={styles.sliderLabelRow}>
            <span style={styles.sliderLabel}>环境光强度</span>
            <span style={styles.sliderValue}>{lighting.ambientIntensity.toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={lighting.ambientIntensity}
            onChange={(e) => onLightingChange({ ambientIntensity: Number(e.target.value) })}
            style={{
              ...styles.slider,
              accentColor: ENVIRONMENT_PRESETS[environment].colorHex
            }}
          />
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '100%',
    height: '100%',
    padding: '24px 20px',
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    overflowX: 'hidden',
    color: '#d0d0d0'
  },
  panelHeader: {
    marginBottom: '8px'
  },
  panelTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#e8e8e8',
    letterSpacing: '0.5px',
    marginBottom: '12px'
  },
  panelDivider: {
    height: '1px',
    background: 'linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.02))',
    borderRadius: '1px'
  },
  section: {
    padding: '20px 0 4px'
  },
  sectionDivider: {
    height: '1px',
    background: 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02), rgba(255,255,255,0.08))',
    margin: '4px 0'
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#c0c0c0',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    marginBottom: '16px',
    opacity: 0.85
  },
  geometryGroup: {
    marginBottom: '18px'
  },
  geometryLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px'
  },
  geometryIcon: {
    fontSize: '16px',
    opacity: 0.9
  },
  geometryName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#d8d8d8'
  },
  materialButtonGroup: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px'
  },
  materialButton: {
    padding: '8px 10px',
    fontSize: '12.5px',
    fontWeight: 500,
    color: '#b0b0b0',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    cursor: 'pointer',
    outline: 'none',
    userSelect: 'none',
    textAlign: 'center'
  },
  materialButtonActive: {
    background: 'rgba(255, 255, 255, 0.12)',
    color: '#ffffff',
    borderColor: 'rgba(255, 255, 255, 0.25)'
  },
  envGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px'
  },
  envButton: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    cursor: 'pointer',
    outline: 'none',
    userSelect: 'none',
    overflow: 'hidden',
    textAlign: 'left'
  },
  envButtonActive: {
    background: 'rgba(255, 255, 255, 0.08)'
  },
  envColorDot: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    flexShrink: 0,
    transition: 'box-shadow 0.2s ease'
  },
  envInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0
  },
  envName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e0e0e0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  envTemp: {
    fontSize: '11px',
    color: '#888888'
  },
  envActiveBar: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '3px',
    height: '60%',
    borderRadius: '3px 0 0 3px'
  },
  sliderGroup: {
    marginBottom: '18px'
  },
  sliderLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  sliderLabel: {
    fontSize: '13px',
    color: '#c8c8c8'
  },
  sliderValue: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#ffffff',
    fontVariantNumeric: 'tabular-nums',
    padding: '2px 8px',
    background: 'rgba(255, 255, 255, 0.06)',
    borderRadius: '6px',
    minWidth: '48px',
    textAlign: 'center'
  },
  slider: {
    width: '100%',
    height: '4px',
    cursor: 'pointer',
    WebkitAppearance: 'none',
    appearance: 'none',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '2px',
    outline: 'none'
  }
};

export default ControlPanel;
