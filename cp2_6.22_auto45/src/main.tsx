/**
 * main.tsx — React 应用入口
 *
 * 数据流起点（完整调用链）：
 *
 *   index.html
 *     ↓ <div id="root"></div>
 *   main.tsx ←── (本文件)
 *     ├─ import App from './App'           → React 根组件（全局状态中心）
 *     └─ import './styles.css'             → 全局样式 / 响应式 / 动画
 *       ↓
 *   ReactDOM.createRoot().render(
 *     <React.StrictMode>
 *       <App />                            → 挂载 App，开始渲染三栏布局
 *     </React.StrictMode>
 *   )
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
