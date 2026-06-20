import React from 'react'
import { motion } from 'framer-motion'

const PrimaryButton: React.FC = () => {
  return (
    <motion.button
      style={{
        width: '140px',
        height: '44px',
        borderRadius: '8px',
        backgroundColor: 'var(--color-primary)',
        color: '#ffffff',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 500,
      }}
      whileHover={{
        filter: 'brightness(1.1)',
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      主要按钮
    </motion.button>
  )
}

const SecondaryButton: React.FC = () => {
  return (
    <motion.button
      style={{
        width: '140px',
        height: '44px',
        borderRadius: '20px',
        backgroundColor: 'transparent',
        color: 'var(--color-primary)',
        border: '2px solid var(--color-primary)',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 500,
      }}
      whileHover={{
        backgroundColor: 'var(--color-primary-light)',
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      次要按钮
    </motion.button>
  )
}

const CardComponent: React.FC = () => {
  return (
    <motion.div
      style={{
        width: '240px',
        height: '180px',
        borderRadius: '16px',
        backgroundColor: 'var(--color-primary-light)',
        boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.06)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          backgroundColor: 'var(--color-primary)',
        }}
      />
      <div>
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#1a1a2e',
            marginBottom: '8px',
          }}
        >
          卡片标题
        </div>
        <div style={{ fontSize: '12px', color: '#6c757d' }}>
          这是一段卡片描述文字，用于展示卡片组件的效果。
        </div>
      </div>
    </motion.div>
  )
}

const FormInput: React.FC = () => {
  const [focused, setFocused] = React.useState(false)

  return (
    <motion.input
      type="text"
      placeholder="请输入内容..."
      style={{
        width: '260px',
        height: '42px',
        borderRadius: '6px',
        border: focused
          ? '2px solid var(--color-primary)'
          : '1px solid var(--color-gray)',
        padding: '0 12px',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: '#ffffff',
        transition: 'border-color 0.2s ease-out',
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

const Navbar: React.FC = () => {
  return (
    <div
      style={{
        height: '56px',
        backgroundColor: 'var(--color-primary-dark)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '24px',
        width: '100%',
      }}
    >
      <div style={{ fontSize: '18px', fontWeight: 600 }}>Logo</div>
      <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
        <span style={{ cursor: 'pointer', opacity: 0.9 }}>首页</span>
        <span style={{ cursor: 'pointer', opacity: 0.7 }}>产品</span>
        <span style={{ cursor: 'pointer', opacity: 0.7 }}>关于</span>
      </div>
    </div>
  )
}

const ProgressBar: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '12px',
        borderRadius: '6px',
        backgroundColor: 'var(--color-primary-light)',
        overflow: 'hidden',
      }}
    >
      <motion.div
        style={{
          height: '100%',
          width: '65%',
          backgroundColor: 'var(--color-primary)',
          borderRadius: '6px',
        }}
        initial={{ width: 0 }}
        animate={{ width: '65%' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  )
}

interface ComponentWrapperProps {
  name: string
  children: React.ReactNode
  darkMode?: boolean
}

const ComponentWrapper: React.FC<ComponentWrapperProps> = ({ name, children, darkMode }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <div
        style={{
          minHeight: '180px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
      <span
        style={{
          fontSize: '12px',
          color: darkMode ? '#adb5bd' : '#6c757d',
        }}
      >
        {name}
      </span>
    </div>
  )
}

interface ComponentRendererProps {
  darkMode?: boolean
}

const ComponentRenderer: React.FC<ComponentRendererProps> = ({ darkMode = false }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
      }}
    >
      <ComponentWrapper name="主按钮" darkMode={darkMode}>
        <PrimaryButton />
      </ComponentWrapper>
      <ComponentWrapper name="次按钮" darkMode={darkMode}>
        <SecondaryButton />
      </ComponentWrapper>
      <ComponentWrapper name="卡片" darkMode={darkMode}>
        <CardComponent />
      </ComponentWrapper>
      <ComponentWrapper name="输入框" darkMode={darkMode}>
        <FormInput />
      </ComponentWrapper>
      <ComponentWrapper name="导航栏" darkMode={darkMode}>
        <div style={{ width: '280px' }}>
          <Navbar />
        </div>
      </ComponentWrapper>
      <ComponentWrapper name="进度条" darkMode={darkMode}>
        <div style={{ width: '200px' }}>
          <ProgressBar />
        </div>
      </ComponentWrapper>
    </div>
  )
}

export default ComponentRenderer
