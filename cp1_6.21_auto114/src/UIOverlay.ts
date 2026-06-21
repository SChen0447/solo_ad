import { ElementType, ELEMENT_INFO, PLACEABLE_ELEMENTS } from './type';

export class UIOverlay {
  private toolbar: HTMLDivElement;
  private statusBar: HTMLDivElement;
  private selectedElement: ElementType = ElementType.SAND;
  private elementButtons: Map<ElementType, HTMLDivElement> = new Map();
  private fpsDisplay: HTMLSpanElement;
  private countsContainer: HTMLDivElement;
  private onElementSelect: (type: ElementType) => void;

  constructor(onElementSelect: (type: ElementType) => void) {
    this.onElementSelect = onElementSelect;
    this.toolbar = this.createToolbar();
    this.statusBar = this.createStatusBar();
    this.fpsDisplay = this.statusBar.querySelector('.fps') as HTMLSpanElement;
    this.countsContainer = this.statusBar.querySelector('.counts') as HTMLDivElement;
    this.setupKeyboardControls();
    this.setupResponsiveLayout();
    this.injectStyles();
  }

  private createToolbar(): HTMLDivElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'sandbox-toolbar';

    PLACEABLE_ELEMENTS.forEach((type, index) => {
      const button = this.createElementButton(type, index + 1);
      this.elementButtons.set(type, button);
      toolbar.appendChild(button);
    });

    const clearBtn = this.createClearButton();
    toolbar.appendChild(clearBtn);

    document.body.appendChild(toolbar);
    return toolbar;
  }

  private createElementButton(type: ElementType, keyNum: number): HTMLDivElement {
    const info = ELEMENT_INFO[type];
    const button = document.createElement('div');
    button.className = 'element-button';
    button.dataset.type = type;

    const icon = document.createElement('div');
    icon.className = 'element-icon';
    icon.style.backgroundColor = info.color;

    const label = document.createElement('span');
    label.className = 'element-label';
    label.textContent = info.name;

    const keyHint = document.createElement('span');
    keyHint.className = 'key-hint';
    keyHint.textContent = keyNum.toString();

    button.appendChild(icon);
    button.appendChild(label);
    button.appendChild(keyHint);

    button.addEventListener('click', () => this.selectElement(type));

    if (type === this.selectedElement) {
      button.classList.add('selected');
    }

    return button;
  }

  private createClearButton(): HTMLDivElement {
    const button = document.createElement('div');
    button.className = 'element-button clear-button';

    const icon = document.createElement('div');
    icon.className = 'element-icon clear-icon';
    icon.textContent = '×';

    const label = document.createElement('span');
    label.className = 'element-label';
    label.textContent = '清空';

    const keyHint = document.createElement('span');
    keyHint.className = 'key-hint';
    keyHint.textContent = 'C';

    button.appendChild(icon);
    button.appendChild(label);
    button.appendChild(keyHint);

    button.addEventListener('click', () => {
      if (this.onElementSelect) {
        this.onElementSelect(ElementType.EMPTY);
      }
    });

    return button;
  }

  private createStatusBar(): HTMLDivElement {
    const statusBar = document.createElement('div');
    statusBar.className = 'sandbox-statusbar';

    const fpsContainer = document.createElement('div');
    fpsContainer.className = 'status-item';
    fpsContainer.innerHTML = 'FPS: <span class="fps">60</span>';

    this.countsContainer = document.createElement('div');
    this.countsContainer.className = 'counts';

    PLACEABLE_ELEMENTS.forEach(type => {
      const item = document.createElement('div');
      item.className = 'count-item';
      const info = ELEMENT_INFO[type];
      item.innerHTML = `<span class="count-dot" style="background-color: ${info.color}"></span>${info.name}: <span class="count-value" data-type="${type}">0</span>`;
      this.countsContainer.appendChild(item);
    });

    statusBar.appendChild(fpsContainer);
    statusBar.appendChild(this.countsContainer);

    document.body.appendChild(statusBar);
    return statusBar;
  }

  private selectElement(type: ElementType): void {
    this.selectedElement = type;
    this.elementButtons.forEach((btn, t) => {
      if (t === type) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
    this.onElementSelect(type);
  }

  private setupKeyboardControls(): void {
    document.addEventListener('keydown', (e) => {
      const keyMap: Record<string, ElementType> = {
        '1': ElementType.WATER,
        '2': ElementType.SAND,
        '3': ElementType.WOOD,
        '4': ElementType.FIRE,
        '5': ElementType.SMOKE
      };

      if (keyMap[e.key]) {
        this.selectElement(keyMap[e.key]);
      }
      if (e.key.toLowerCase() === 'c') {
        this.onElementSelect(ElementType.EMPTY);
      }
    });
  }

  private setupResponsiveLayout(): void {
    const updateLayout = () => {
      if (window.innerWidth < 600) {
        this.toolbar.classList.add('horizontal');
      } else {
        this.toolbar.classList.remove('horizontal');
      }
    };

    window.addEventListener('resize', updateLayout);
    updateLayout();
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .sandbox-toolbar {
        position: fixed;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px 12px;
        background: rgba(20, 20, 30, 0.7);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 1000;
      }

      .sandbox-toolbar.horizontal {
        left: 50%;
        top: auto;
        bottom: 16px;
        transform: translateX(-50%);
        flex-direction: row;
        padding: 12px 16px;
      }

      .element-button {
        position: relative;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: transparent;
        border: 2px solid transparent;
        min-width: 80px;
      }

      .element-button:hover {
        transform: scale(1.1);
        background: rgba(255, 255, 255, 0.1);
      }

      .element-button.selected {
        animation: pulse-glow 2s ease-in-out infinite;
      }

      .element-button.selected .element-icon {
        box-shadow: 0 0 15px currentColor;
      }

      @keyframes pulse-glow {
        0%, 100% {
          box-shadow: 0 0 10px currentColor, inset 0 0 5px currentColor;
          border-color: currentColor;
        }
        50% {
          box-shadow: 0 0 25px currentColor, inset 0 0 10px currentColor;
          border-color: currentColor;
        }
      }

      .element-icon {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        flex-shrink: 0;
      }

      .element-icon.clear-icon {
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 20px;
        font-weight: bold;
      }

      .element-label {
        color: white;
        font-size: 13px;
        font-family: 'Segoe UI', system-ui, sans-serif;
        user-select: none;
      }

      .key-hint {
        position: absolute;
        top: 4px;
        right: 6px;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        font-family: monospace;
      }

      .element-button[data-type="water"].selected {
        color: #3498db;
      }

      .element-button[data-type="sand"].selected {
        color: #f1c40f;
      }

      .element-button[data-type="wood"].selected {
        color: #8b4513;
      }

      .element-button[data-type="fire"].selected {
        color: #e74c3c;
      }

      .element-button[data-type="smoke"].selected {
        color: #95a5a6;
      }

      .element-button[data-type="water"]:hover {
        background: rgba(52, 152, 219, 0.3);
      }

      .element-button[data-type="sand"]:hover {
        background: rgba(241, 196, 15, 0.3);
      }

      .element-button[data-type="wood"]:hover {
        background: rgba(139, 69, 19, 0.3);
      }

      .element-button[data-type="fire"]:hover {
        background: rgba(231, 76, 60, 0.3);
      }

      .element-button[data-type="smoke"]:hover {
        background: rgba(149, 165, 166, 0.3);
      }

      .clear-button:hover {
        background: rgba(255, 100, 100, 0.3) !important;
      }

      .sandbox-statusbar {
        position: fixed;
        right: 16px;
        bottom: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px 16px;
        background: rgba(20, 20, 30, 0.7);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        font-family: 'Segoe UI', system-ui, sans-serif;
        color: white;
        font-size: 12px;
        z-index: 1000;
        min-width: 160px;
      }

      .status-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .fps {
        color: #2ecc71;
        font-weight: bold;
        font-family: monospace;
        font-size: 14px;
      }

      .counts {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .count-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .count-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      .count-value {
        font-family: monospace;
        color: #bdc3c7;
      }

      @media (max-width: 600px) {
        .sandbox-statusbar {
          right: 8px;
          bottom: 80px;
          min-width: 120px;
          padding: 8px 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  public getSelectedElement(): ElementType {
    return this.selectedElement;
  }

  public updateFPS(fps: number): void {
    this.fpsDisplay.textContent = Math.round(fps).toString();
    if (fps >= 55) {
      this.fpsDisplay.style.color = '#2ecc71';
    } else if (fps >= 30) {
      this.fpsDisplay.style.color = '#f39c12';
    } else {
      this.fpsDisplay.style.color = '#e74c3c';
    }
  }

  public updateCounts(counts: Record<ElementType, number>): void {
    PLACEABLE_ELEMENTS.forEach(type => {
      const el = this.countsContainer.querySelector(`[data-type="${type}"]`);
      if (el) {
        el.textContent = counts[type].toString();
      }
    });
  }

  public destroy(): void {
    this.toolbar.remove();
    this.statusBar.remove();
  }
}
