import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ThemeVars, ThemeSide } from './themeTypes';

interface ComponentPreviewProps {
  vars: ThemeVars;
  side: ThemeSide;
}

interface ThemeStyleProps {
  vars: ThemeVars;
}

const getCardStyle = (vars: ThemeVars): React.CSSProperties => ({
  width: '240px',
  height: '160px',
  borderRadius: `${12 * vars['--radius']}px`,
  border: '1px solid rgba(0,0,0,0.1)',
  boxShadow: `inset 0 0 ${8 * vars['--shadow']}px rgba(0,0,0,0.06)`,
  backgroundColor: vars['--bg'],
  color: vars['--text'],
  padding: '16px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  transition: 'all 0.2s ease',
});

const PrimaryButton: React.FC<{ vars: ThemeVars; label: string }> = ({ vars, label }) => (
  <motion.button
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    style={{
      width: '120px',
      height: '40px',
      borderRadius: `${8 * vars['--radius']}px`,
      backgroundColor: vars['--primary'],
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
      transition: 'background-color 0.2s ease',
    }}
  >
    {label}
  </motion.button>
);

const SecondaryButton: React.FC<{ vars: ThemeVars; label: string }> = ({ vars, label }) => (
  <motion.button
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    style={{
      padding: '8px 20px',
      height: '40px',
      borderRadius: '20px',
      backgroundColor: 'transparent',
      color: vars['--primary'],
      border: `1.5px solid ${vars['--primary']}`,
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
      transition: 'all 0.2s ease',
    }}
  >
    {label}
  </motion.button>
);

const CardComponent: React.FC<ThemeStyleProps> = ({ vars }) => (
  <div style={getCardStyle(vars)}>
    <div>
      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: vars['--text'] }}>
        卡片标题
      </h3>
      <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: vars['--text'], opacity: 0.7 }}>
        这是卡片组件的描述文本
      </p>
    </div>
    <div style={{ display: 'flex', gap: '8px' }}>
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: vars['--primary'],
        }}
      />
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: vars['--secondary'],
        }}
      />
    </div>
  </div>
);

const NavbarComponent: React.FC<ThemeStyleProps> = ({ vars }) => {
  const [active, setActive] = useState(0);
  const items = ['首页', '产品', '关于', '联系'];

  return (
    <div
      style={{
        height: '56px',
        padding: '0 24px',
        backgroundColor: vars['--bg'],
        borderBottom: `1px solid rgba(0,0,0,0.08)`,
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        boxShadow: `0 ${2 * vars['--shadow']}px ${8 * vars['--shadow']}px rgba(0,0,0,0.04)`,
        borderRadius: `${8 * vars['--radius']}px`,
        transition: 'all 0.2s ease',
      }}
    >
      <span style={{ fontWeight: 700, color: vars['--primary'], fontSize: '18px' }}>
        Logo
      </span>
      <div style={{ display: 'flex', gap: '24px', marginLeft: '16px' }}>
        {items.map((item, index) => (
          <button
            key={item}
            onClick={() => setActive(index)}
            style={{
              position: 'relative',
              padding: '4px 0',
              border: 'none',
              backgroundColor: 'transparent',
              color: active === index ? vars['--primary'] : vars['--text'],
              fontSize: '14px',
              fontWeight: active === index ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {item}
            {active === index && (
              <motion.div
                layoutId="nav-indicator"
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: vars['--primary'],
                  borderRadius: '1px',
                }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const FormInputComponent: React.FC<ThemeStyleProps> = ({ vars }) => {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState('');

  return (
    <div style={{ width: '280px' }}>
      <label
        style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: vars['--text'],
          marginBottom: '6px',
          transition: 'color 0.2s ease',
        }}
      >
        用户名
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="请输入用户名"
          style={{
            width: '100%',
            height: '40px',
            padding: '0 12px',
            borderRadius: `${8 * vars['--radius']}px`,
            border: `1.5px solid ${focused ? vars['--primary'] : '#d1d5db'}`,
            backgroundColor: vars['--bg'],
            color: vars['--text'],
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            boxShadow: focused
              ? `0 0 0 3px ${vars['--primary']}20`
              : 'none',
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: focused ? 1 : 0, y: focused ? 0 : -4 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute',
            top: '50%',
            right: '12px',
            transform: 'translateY(-50%)',
            fontSize: '12px',
            color: vars['--primary'],
          }}
        >
          正在输入...
        </motion.div>
      </div>
    </div>
  );
};

const ProgressBarComponent: React.FC<ThemeStyleProps> = ({ vars }) => {
  const [progress] = useState(65);

  return (
    <div style={{ width: '280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', color: vars['--text'], fontWeight: 500 }}>
          加载进度
        </span>
        <span style={{ fontSize: '13px', color: vars['--primary'], fontWeight: 600 }}>
          {progress}%
        </span>
      </div>
      <div
        style={{
          height: '12px',
          borderRadius: '6px',
          backgroundColor: 'rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            height: '100%',
            borderRadius: '6px',
            background: `linear-gradient(90deg, ${vars['--primary']}, ${vars['--secondary']})`,
            boxShadow: `0 0 ${6 * vars['--shadow']}px ${vars['--primary']}40`,
          }}
        />
      </div>
    </div>
  );
};

const ComponentPreview: React.FC<ComponentPreviewProps> = ({ vars, side }) => {
  const componentCount = 50;

  const cards = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => (
        <CardComponent key={`card-${i}`} vars={vars} />
      )),
    [vars]
  );

  const buttons = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => (
        <div key={`btn-row-${i}`} style={{ display: 'flex', gap: '12px' }}>
          <PrimaryButton vars={vars} label={`主按钮 ${i + 1}`} />
          <SecondaryButton vars={vars} label={`次按钮 ${i + 1}`} />
        </div>
      )),
    [vars]
  );

  const navbars = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => (
        <NavbarComponent key={`nav-${i}`} vars={vars} />
      )),
    [vars]
  );

  const inputs = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => (
        <FormInputComponent key={`input-${i}`} vars={vars} />
      )),
    [vars]
  );

  const progressBars = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => (
        <ProgressBarComponent key={`prog-${i}`} vars={vars} />
      )),
    [vars]
  );

  return (
    <div
      style={{
        backgroundColor: vars['--bg'],
        borderRadius: `${12 * vars['--radius']}px`,
        padding: '20px',
        minHeight: '100%',
        boxSizing: 'border-box',
        transition: 'background-color 0.2s ease',
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', color: vars['--text'] }}>
        {side === 'left' ? '左侧主题' : '右侧主题'}
      </h2>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', color: vars['--text'], opacity: 0.6, marginBottom: '12px' }}>
          卡片组件
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>{cards}</div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', color: vars['--text'], opacity: 0.6, marginBottom: '12px' }}>
          导航栏组件
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{navbars}</div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', color: vars['--text'], opacity: 0.6, marginBottom: '12px' }}>
          按钮组件
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{buttons}</div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', color: vars['--text'], opacity: 0.6, marginBottom: '12px' }}>
          表单输入框组件
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>{inputs}</div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', color: vars['--text'], opacity: 0.6, marginBottom: '12px' }}>
          进度条组件
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>{progressBars}</div>
      </div>
    </div>
  );
};

export default ComponentPreview;
