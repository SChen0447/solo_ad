import { CellScene, Organelle, Mark } from './scene/CellScene';
import { CellController } from './control/CellController';

let cellScene: CellScene;
let cellController: CellController;
let currentTab: string = 'info';
let submenuOpen: boolean = false;
let mobileSidebarOpen: boolean = false;

function init(): void {
  const container = document.getElementById('canvas-container')!;
  cellScene = new CellScene(container);
  cellController = new CellController(cellScene, container);

  cellController.setOnMarksChange(() => {
    updateMarkLists();
    const focused = cellController.getFocusedOrganelle();
    if (focused) {
      updateOrganelleInfo(focused);
    }
  });
  cellController.setOnFocusChange(updateOrganelleInfo);

  bindSidebarEvents();
  bindTransportToggle();
  bindFloatingButton();
  bindSubmenuButtons();
  bindCanvasClick();

  handleMobileLayout();
  window.addEventListener('resize', handleMobileLayout);

  updateMarkLists();
  animate();
}

function bindSidebarEvents(): void {
  const tabs = document.querySelectorAll('.sidebar-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab')!;
      switchTab(tabName);

      if (isMobile()) {
        toggleMobileSidebar();
      }
    });
  });
}

function switchTab(tabName: string): void {
  const tabs = document.querySelectorAll('.sidebar-tab');
  tabs.forEach(tab => {
    const isActive = tab.getAttribute('data-tab') === tabName;
    tab.classList.toggle('active', isActive);
  });

  const panels = document.querySelectorAll('.sidebar-panel');
  const oldIndex = Array.from(panels).findIndex(p =>
    !p.classList.contains('hidden-left') && !p.classList.contains('hidden-right')
  );
  const newIndex = Array.from(panels).findIndex(p =>
    p.getAttribute('data-panel') === tabName
  );

  const direction = newIndex > oldIndex ? 'right' : 'left';

  panels.forEach(panel => {
    const panelName = panel.getAttribute('data-panel');
    if (panelName === tabName) {
      panel.classList.remove('hidden-left', 'hidden-right');
    } else {
      panel.classList.remove('hidden-left', 'hidden-right');
      if (direction === 'right') {
        panel.classList.add('hidden-left');
      } else {
        panel.classList.add('hidden-right');
      }
    }
  });

  currentTab = tabName;
}

function bindTransportToggle(): void {
  const btn = document.getElementById('transport-toggle')!;
  btn.addEventListener('click', () => {
    const isActive = cellController.isTransportActive();
    cellController.toggleTransport(!isActive);
    btn.classList.toggle('active', !isActive);
    btn.textContent = !isActive ? '■ 停止运输' : '▶ 物质运输';
  });
}

function bindFloatingButton(): void {
  const btn = document.getElementById('floating-btn')!;
  btn.addEventListener('click', (e) => {
    createRipple(btn, e);
    toggleSubmenu();
  });
}

function createRipple(btn: HTMLElement, e: MouseEvent): void {
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
  ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

function toggleSubmenu(): void {
  const submenu = document.getElementById('submenu')!;
  submenuOpen = !submenuOpen;
  submenu.classList.toggle('open', submenuOpen);
}

function bindSubmenuButtons(): void {
  const buttons = document.querySelectorAll('.submenu-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      handleSubmenuAction(action);
      if (submenuOpen) {
        toggleSubmenu();
      }
    });
  });
}

function handleSubmenuAction(action: string | null): void {
  switch (action) {
    case 'reset':
      cellController.resetView();
      break;
    case 'clearMarks':
      cellController.clearAllMarks();
      break;
    case 'toggleMode':
      cellController.toggleDisplayMode();
      const mode = cellController.getDisplayMode();
      showToast(`显示模式: ${mode === 'solid' ? '实体' : mode === 'wireframe' ? '线框' : '半透明'}`);
      break;
    case 'screenshot':
      cellController.screenshot();
      showToast('截图已保存');
      break;
  }
}

function showToast(message: string): void {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border-radius: 8px;
    font-size: 13px;
    z-index: 100;
    transition: opacity 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}

function bindCanvasClick(): void {
  const canvas = cellScene.renderer.domElement;
  canvas.addEventListener('click', (e) => {
    const selectedMRNA = cellController.getSelectedMRNA();
    if (!selectedMRNA) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedMRNA) {
      const vector = selectedMRNA.mesh.position.clone().project(cellScene.camera);
      const particleX = (vector.x * 0.5 + 0.5) * rect.width;
      const particleY = (-vector.y * 0.5 + 0.5) * rect.height;
      const dist = Math.sqrt((x - particleX) ** 2 + (y - particleY) ** 2);

      if (dist > 50) {
        cellController.hideMRNALabel();
        cellController.setSelectedMRNA(null);
      }
    }
  });

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('#particle-label') && !target.closest('canvas')) {
      const selectedMRNA = cellController.getSelectedMRNA();
      if (selectedMRNA) {
        cellController.hideMRNALabel();
        cellController.setSelectedMRNA(null);
      }
    }
  });
}

function updateOrganelleInfo(organelle: Organelle | null): void {
  const infoDiv = document.getElementById('organelle-info')!;

  if (!organelle) {
    infoDiv.innerHTML = `
      <div class="info-item">
        <div class="info-label">提示</div>
        <div class="info-value">双击任意细胞器查看详细信息</div>
      </div>
    `;
    return;
  }

  const existingMark = cellScene.marks.find(m => m.organelle === organelle);

  infoDiv.innerHTML = `
    <div class="info-item">
      <div class="info-label">名称</div>
      <div class="info-value">${organelle.name}</div>
    </div>
    <div class="info-item">
      <div class="info-label">功能描述</div>
      <div class="info-value">${organelle.description}</div>
    </div>
    <button class="mark-btn" id="mark-organelle-btn" ${existingMark ? 'disabled' : ''}>
      ${existingMark ? '✓ 已标记' : '+ 点击标记'}
    </button>
  `;

  const markBtn = document.getElementById('mark-organelle-btn')!;
  markBtn.addEventListener('click', () => {
    cellController.markFocusedOrganelle();
  });
}

function updateMarkLists(): void {
  const marks = cellController.getMarks();
  updateMarkList('sidebar-mark-list', marks);
  updateMarkList('right-mark-list', marks);
}

function updateMarkList(listId: string, marks: Mark[]): void {
  const listDiv = document.getElementById(listId)!;

  if (marks.length === 0) {
    listDiv.innerHTML = listId === 'sidebar-mark-list'
      ? `<div class="info-item"><div class="info-value" style="color: rgba(255,255,255,0.5); font-size: 12px;">暂无标记</div></div>`
      : `<div class="info-item" style="background: transparent; padding: 0;"><div class="info-value" style="color: rgba(255,255,255,0.5); font-size: 12px;">暂无标记</div></div>`;
    return;
  }

  listDiv.innerHTML = '';
  marks.forEach(mark => {
    const colorHex = cellScene.getMarkColorHex(mark);
    const item = document.createElement('div');
    item.className = 'mark-item';
    item.innerHTML = `
      <div class="mark-color-dot" style="background: ${colorHex}"></div>
      <span class="mark-name">${mark.name}</span>
      <button class="mark-delete">删除</button>
    `;

    item.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('mark-delete')) {
        cellController.removeMark(mark);
      } else {
        cellController.focusMark(mark);
      }
    });

    listDiv.appendChild(item);
  });
}

function isMobile(): boolean {
  return window.innerWidth < 768;
}

function handleMobileLayout(): void {
  const sidebar = document.getElementById('sidebar')!;
  const marksPanel = document.getElementById('marks-panel')!;

  if (isMobile()) {
    sidebar.classList.add('mobile');
    marksPanel.classList.add('mobile');
  } else {
    sidebar.classList.remove('mobile');
    marksPanel.classList.remove('mobile');
    const sidebarContent = document.querySelector('.sidebar-content')!;
    sidebarContent.classList.remove('mobile-open');
    mobileSidebarOpen = false;
  }
}

function toggleMobileSidebar(): void {
  if (!isMobile()) return;

  const sidebarContent = document.querySelector('.sidebar-content')!;
  mobileSidebarOpen = !mobileSidebarOpen;
  sidebarContent.classList.toggle('mobile-open', mobileSidebarOpen);
}

function animate(): void {
  requestAnimationFrame(animate);

  cellController.update();
  cellScene.update();
}

document.addEventListener('DOMContentLoaded', init);
