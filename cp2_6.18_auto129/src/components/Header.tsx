import React from 'react';

export default function Header() {
  return (
    <nav
      style={{
        height: 60,
        background: '#1e40af',
        color: '#fff',
        fontSize: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <span style={{ fontWeight: 700, letterSpacing: 1 }}>仓储库存管理系统</span>
      <span style={{ opacity: 0.85, fontSize: 14 }}>当前用户：仓库管理员</span>
    </nav>
  );
}
