import { TerrainEditor } from './TerrainEditor';

function initApp(): void {
  try {
    const editor = new TerrainEditor('canvas-container');

    window.addEventListener('beforeunload', () => {
      editor.dispose();
    });

    console.log('3D 像素沙盒地形编辑器已启动');
    console.log('快捷键: A=添加, D=移除, S=选取, Ctrl+Z=撤销, Ctrl+Shift+Z=重做');
    console.log('鼠标: 左键拖拽旋转, 滚轮缩放, 右键拖拽平移');
  } catch (error) {
    console.error('编辑器启动失败:', error);
    const container = document.getElementById('canvas-container');
    if (container) {
      container.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #ef4444;
          font-size: 18px;
        ">
          <p>编辑器启动失败</p>
          <p style="font-size: 14px; margin-top: 10px; color: #9ca3af;">
            ${(error as Error).message}
          </p>
        </div>
      `;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
