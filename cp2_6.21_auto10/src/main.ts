import { LevelEditor } from './editor/editor';
import { UIPanel } from './editor/uiPanel';

function main(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('找不到 #app 容器');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  app.appendChild(canvas);

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    editor.resize(canvas.width, canvas.height);
  };

  const keys = new Set<string>();
  let spacePressed = false;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;

  let uiPanel: UIPanel | null = null;

  const editor = new LevelEditor(canvas, {
    onToolChange: (_tool) => {},
    onModeChange: (playing) => {
      uiPanel?.setModeLabel(playing);
    },
    onLevelComplete: () => {
      uiPanel?.showLevelCompleteToast();
    },
    onPlayerFormChange: (form) => {
      uiPanel?.setFormLabel(form);
    }
  });

  uiPanel = new UIPanel(editor);
  uiPanel.mount(document.body);

  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      if (!keys.has('Space')) {
        spacePressed = true;
      }
      keys.add('Space');
      e.preventDefault();
    } else {
      keys.add(e.key);
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      keys.delete('Space');
    } else {
      keys.delete(e.key);
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      mouseDown = true;
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      mouseDown = false;
    }
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const inputTick = () => {
    editor.handleInput({
      keys,
      mouseX,
      mouseY,
      mouseDown,
      spacePressed
    });
    spacePressed = false;
    requestAnimationFrame(inputTick);
  };

  editor.start();
  requestAnimationFrame(inputTick);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
