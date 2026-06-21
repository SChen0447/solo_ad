import { LevelEditor, EditorTool } from './editor';

interface ButtonConfig {
  id: string;
  label: string;
  icon: string;
  tool: EditorTool;
  gradientFrom: string;
  gradientTo: string;
}

export class UIPanel {
  private container: HTMLDivElement;
  private editor: LevelEditor;
  private buttons: Map<string, HTMLButtonElement> = new Map();
  private activeButtonId: string | null = null;
  private panelWidth: number = 280;

  constructor(editor: LevelEditor) {
    this.editor = editor;
    this.container = document.createElement('div');
    this.setupStyles();
    this.buildPanel();
  }

  private setupStyles(): void {
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: ${this.panelWidth}px;
      height: 100vh;
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: rgba(26, 26, 46, 0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-left: 2px solid transparent;
      border-image: linear-gradient(to bottom, #FFD700, #4A0080) 1;
      border-radius: 10px 0 0 10px;
      box-sizing: border-box;
      z-index: 100;
      font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
      overflow-y: auto;
    `;
  }

  private buildPanel(): void {
    const title = document.createElement('div');
    title.innerHTML = `
      <div style="font-size: 22px; font-weight: bold; background: linear-gradient(135deg, #FFD700, #4A0080); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 4px;">
        光与影 · 关卡编辑器
      </div>
      <div style="font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 4px;">
        Light & Shadow Level Editor
      </div>
    `;
    this.container.appendChild(title);

    const statusBar = document.createElement('div');
    statusBar.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      margin-bottom: 4px;
    `;
    statusBar.innerHTML = `
      <div>
        <div style="font-size: 10px; color: rgba(255,255,255,0.4);">当前模式</div>
        <div id="mode-label" style="font-size: 13px; font-weight: 600; color: #FFD700;">✏ 编辑模式</div>
      </div>
      <div>
        <div style="font-size: 10px; color: rgba(255,255,255,0.4);">小球形态</div>
        <div id="form-label" style="font-size: 13px; font-weight: 600; color: #FFD700;">☀ 光明</div>
      </div>
    `;
    this.container.appendChild(statusBar);

    const sectionTitle = (text: string) => {
      const div = document.createElement('div');
      div.style.cssText = `
        font-size: 11px;
        color: rgba(255,255,255,0.5);
        letter-spacing: 1.5px;
        text-transform: uppercase;
        font-weight: 600;
        margin-top: 6px;
        padding: 0 4px;
      `;
      div.textContent = text;
      return div;
    };

    this.container.appendChild(sectionTitle('🛠 放置元素'));

    const toolButtons: ButtonConfig[] = [
      { id: 'lightSource', label: '添加光源', icon: '💡', tool: 'lightSource', gradientFrom: '#FFD700', gradientTo: '#FFA500' },
      { id: 'shadowBlock', label: '添加影块', icon: '⬛', tool: 'shadowBlock', gradientFrom: '#6A5ACD', gradientTo: '#4A0080' },
      { id: 'brick', label: '添加砖块', icon: '🧱', tool: 'brick', gradientFrom: '#CD853F', gradientTo: '#8B4513' },
    ];

    for (const cfg of toolButtons) {
      const btn = this.createButton(cfg);
      this.buttons.set(cfg.id, btn);
      this.container.appendChild(btn);
    }

    this.container.appendChild(sectionTitle('⚙ 操作'));

    const clearBtn = this.createActionButton(
      'clear',
      '清空关卡',
      '🗑',
      '#FF6B6B',
      '#C92A2A',
      () => {
        if (confirm('确定要清空当前关卡吗？此操作无法撤销。')) {
          this.editor.clearLevel();
          this.setActiveButton(null);
        }
      }
    );
    this.buttons.set('clear', clearBtn);
    this.container.appendChild(clearBtn);

    const spacer = document.createElement('div');
    spacer.style.flexGrow = '1';
    this.container.appendChild(spacer);

    const helpBox = document.createElement('div');
    helpBox.style.cssText = `
      padding: 10px 12px;
      background: rgba(255,255,255,0.04);
      border-radius: 8px;
      border-left: 3px solid #FFD700;
      font-size: 11px;
      line-height: 1.7;
      color: rgba(255,255,255,0.6);
    `;
    helpBox.innerHTML = `
      <div style="font-weight: 600; color: #FFD700; margin-bottom: 6px;">📖 操作说明</div>
      <div><b style="color: #FFD700;">WASD</b>：移动小球</div>
      <div><b style="color: #FFD700;">空格</b>：切换光/暗形态</div>
      <div><b style="color: #FFD700;">鼠标左键</b>：放置选中元素</div>
      <div style="margin-top: 4px; color: rgba(150,50,200,0.8);">💡 黑暗形态可粉碎被光照亮的砖块</div>
    `;
    this.container.appendChild(helpBox);

    const playBtn = document.createElement('button');
    playBtn.textContent = '▶ 运行测试';
    playBtn.style.cssText = `
      width: 100%;
      padding: 14px 16px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      cursor: pointer;
      background: linear-gradient(135deg, #FFD700, #4A0080);
      box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3), 0 4px 15px rgba(74, 0, 128, 0.3);
      transition: all 0.15s ease;
      letter-spacing: 1px;
      margin-top: 6px;
    `;
    playBtn.onmouseenter = () => {
      playBtn.style.transform = 'scale(0.95)';
      playBtn.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.4), 0 6px 20px rgba(74, 0, 128, 0.4)';
    };
    playBtn.onmouseleave = () => {
      playBtn.style.transform = 'scale(1)';
      playBtn.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.3), 0 4px 15px rgba(74, 0, 128, 0.3)';
    };
    playBtn.onmousedown = () => {
      playBtn.style.transform = 'scale(0.93) translateY(1px)';
    };
    playBtn.onmouseup = () => {
      playBtn.style.transform = playBtn.matches(':hover') ? 'scale(0.95)' : 'scale(1)';
    };
    playBtn.onclick = () => this.togglePlayMode(playBtn);
    this.buttons.set('play', playBtn);
    this.container.appendChild(playBtn);
  }

  private createButton(cfg: ButtonConfig): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.innerHTML = `<span style="font-size: 18px; margin-right: 8px;">${cfg.icon}</span>${cfg.label}`;
    btn.style.cssText = `
      width: 100%;
      padding: 12px 14px;
      border: 2px solid transparent;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      cursor: pointer;
      background: linear-gradient(135deg, ${cfg.gradientFrom}, ${cfg.gradientTo});
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    let shakeTimer: number | null = null;
    btn.onmouseenter = () => {
      btn.style.transform = 'scale(0.95)';
      btn.style.boxShadow = '0 5px 14px rgba(0, 0, 0, 0.4)';
    };
    btn.onmouseleave = () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.3)';
    };
    btn.onmousedown = () => {
      if (shakeTimer) clearInterval(shakeTimer);
      let t = 0;
      shakeTimer = window.setInterval(() => {
        const intensity = 1 - t / 6;
        if (intensity <= 0) {
          clearInterval(shakeTimer!);
          btn.style.transform = btn.matches(':hover') ? 'scale(0.95)' : 'scale(1)';
          return;
        }
        const sx = (Math.random() - 0.5) * intensity * 2;
        const sy = (Math.random() - 0.5) * intensity * 2;
        btn.style.transform = `scale(0.93) translate(${sx}px, ${sy}px)`;
        t++;
      }, 30);
    };
    btn.onmouseup = () => {
      if (shakeTimer) {
        clearInterval(shakeTimer);
        shakeTimer = null;
      }
      btn.style.transform = btn.matches(':hover') ? 'scale(0.95)' : 'scale(1)';
    };

    btn.onclick = () => {
      if (this.editor.isPlaying()) return;
      if (this.activeButtonId === cfg.id) {
        this.setActiveButton(null);
        this.editor.setTool(null);
      } else {
        this.setActiveButton(cfg.id);
        this.editor.setTool(cfg.tool);
      }
    };

    return btn;
  }

  private createActionButton(
    _id: string,
    label: string,
    icon: string,
    from: string,
    to: string,
    onClick: () => void
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.innerHTML = `<span style="font-size: 18px; margin-right: 8px;">${icon}</span>${label}`;
    btn.style.cssText = `
      width: 100%;
      padding: 11px 14px;
      border: 2px solid transparent;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      cursor: pointer;
      background: linear-gradient(135deg, ${from}, ${to});
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    let shakeTimer: number | null = null;
    btn.onmouseenter = () => {
      btn.style.transform = 'scale(0.95)';
      btn.style.boxShadow = '0 5px 14px rgba(0, 0, 0, 0.4)';
    };
    btn.onmouseleave = () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.3)';
    };
    btn.onmousedown = () => {
      if (shakeTimer) clearInterval(shakeTimer);
      let t = 0;
      shakeTimer = window.setInterval(() => {
        const intensity = 1 - t / 6;
        if (intensity <= 0) {
          clearInterval(shakeTimer!);
          btn.style.transform = btn.matches(':hover') ? 'scale(0.95)' : 'scale(1)';
          return;
        }
        const sx = (Math.random() - 0.5) * intensity * 2;
        const sy = (Math.random() - 0.5) * intensity * 2;
        btn.style.transform = `scale(0.93) translate(${sx}px, ${sy}px)`;
        t++;
      }, 30);
    };
    btn.onmouseup = () => {
      if (shakeTimer) {
        clearInterval(shakeTimer);
        shakeTimer = null;
      }
      btn.style.transform = btn.matches(':hover') ? 'scale(0.95)' : 'scale(1)';
    };
    btn.onclick = onClick;

    return btn;
  }

  private togglePlayMode(btn: HTMLButtonElement): void {
    if (this.editor.isPlaying()) {
      this.editor.stopPlayMode();
      btn.textContent = '▶ 运行测试';
      btn.style.background = 'linear-gradient(135deg, #FFD700, #4A0080)';
    } else {
      this.editor.startPlayMode();
      btn.textContent = '◀ 返回编辑';
      btn.style.background = 'linear-gradient(135deg, #4A0080, #FFD700)';
      this.setActiveButton(null);
    }
  }

  public setActiveButton(id: string | null): void {
    this.activeButtonId = id;
    for (const [bid, btn] of this.buttons) {
      if (bid === 'play' || bid === 'clear') continue;
      if (bid === id) {
        btn.style.borderColor = '#FFFFFF';
        btn.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.2), 0 5px 14px rgba(0,0,0,0.4)';
      } else {
        btn.style.borderColor = 'transparent';
        btn.style.boxShadow = btn.matches(':hover')
          ? '0 5px 14px rgba(0,0,0,0.4)'
          : '0 3px 10px rgba(0,0,0,0.3)';
      }
    }
  }

  public setModeLabel(playing: boolean): void {
    const label = this.container.querySelector('#mode-label') as HTMLDivElement;
    if (label) {
      if (playing) {
        label.innerHTML = '▶ 试玩模式';
        label.style.color = '#9B59B6';
      } else {
        label.innerHTML = '✏ 编辑模式';
        label.style.color = '#FFD700';
      }
    }
  }

  public setFormLabel(form: string): void {
    const label = this.container.querySelector('#form-label') as HTMLDivElement;
    if (label) {
      if (form === 'light') {
        label.innerHTML = '☀ 光明';
        label.style.color = '#FFD700';
      } else {
        label.innerHTML = '🌙 黑暗';
        label.style.color = '#9B59B6';
      }
    }
    this.updateCursor(form);
  }

  private updateCursor(form: string): void {
    const color = form === 'light' ? '#FFD700' : '#4A0080';
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, color);
    grad.addColorStop(0.6, color + 'CC');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 4, 0, Math.PI * 2);
    ctx.fill();

    const url = canvas.toDataURL('image/png');
    document.body.style.cursor = `url(${url}) ${size / 2} ${size / 2}, auto`;
  }

  public showLevelCompleteToast(): void {
    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="font-size: 28px; margin-bottom: 8px;">🎉</div>
      <div style="font-size: 18px; font-weight: 700; background: linear-gradient(135deg, #FFD700, #4A0080); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
        关卡完成！
      </div>
      <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 6px;">
        点击"返回编辑"继续创作
      </div>
    `;
    toast.style.cssText = `
      position: fixed;
      top: 50%;
      left: calc(50% - ${this.panelWidth / 2}px);
      transform: translate(-50%, -50%) scale(0.5);
      padding: 30px 50px;
      background: rgba(26, 26, 46, 0.95);
      backdrop-filter: blur(20px);
      border: 2px solid transparent;
      border-image: linear-gradient(135deg, #FFD700, #4A0080) 1;
      border-radius: 16px;
      text-align: center;
      z-index: 1000;
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      pointer-events: none;
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, -50%) scale(0.8)';
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  }

  public mount(parent: HTMLElement): void {
    parent.appendChild(this.container);
    this.updateCursor('light');
  }

  public getPanelWidth(): number {
    return this.panelWidth;
  }
}
