import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

const fontOptions: { label: string; value: string }[] = [
  { label: 'Playfair Display', value: "'Playfair Display', serif" },
  { label: 'Fraunces', value: "'Fraunces', serif" },
  { label: 'Lora', value: "'Lora', serif" },
  { label: 'DM Sans', value: "'DM Sans', sans-serif" }
];

const colorPresets: string[] = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6'
];

const patternPreviews: string[] = [
  `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 60 60'><g fill='currentColor' fill-opacity='0.5'><path d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/></g></svg>`,
  `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 56 56'><g fill='currentColor' fill-opacity='0.5'><path d='M28 0L0 28l28 28 28-28L28 0zm0 8.5L47.5 28 28 47.5 8.5 28 28 8.5z'/></g></svg>`,
  `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 48 48'><g fill='currentColor' fill-opacity='0.5'><circle cx='24' cy='24' r='3'/><circle cx='8' cy='8' r='2'/><circle cx='40' cy='8' r='2'/><circle cx='8' cy='40' r='2'/><circle cx='40' cy='40' r='2'/></g></svg>`,
  `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 72 72'><g fill='currentColor' fill-opacity='0.5'><path d='M36 0L72 36l-36 36L0 36 36 0zm0 8L64 36 36 64 8 36 36 8z'/><circle cx='36' cy='36' r='6'/></g></svg>`,
  `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 80 80'><g stroke='currentColor' stroke-opacity='0.5' stroke-width='1.5' fill='none'><path d='M0 40h80M40 0v80'/><circle cx='40' cy='40' r='12'/><circle cx='40' cy='40' r='28'/></g></svg>`,
  `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 64 64'><g fill='currentColor' fill-opacity='0.5'><rect x='0' y='0' width='8' height='8'/><rect x='16' y='16' width='8' height='8'/><rect x='32' y='0' width='8' height='8'/><rect x='48' y='16' width='8' height='8'/><rect x='0' y='32' width='8' height='8'/><rect x='16' y='48' width='8' height='8'/><rect x='32' y='32' width='8' height='8'/><rect x='48' y='48' width='8' height='8'/></g></svg>`
];

@customElement('theme-panel')
export class ThemePanel extends LitElement {
  @property({ type: Boolean, reflect: true })
  open = false;

  @property({ type: String, attribute: 'primary-color' })
  primaryColor = '#6366f1';

  @property({ type: String, attribute: 'font-family' })
  fontFamily = "'Playfair Display', serif";

  @property({ type: Number, attribute: 'card-gap' })
  cardGap = 24;

  @property({ type: Number, attribute: 'background-pattern' })
  backgroundPattern = 0;

  @state()
  private isRendered = false;

  firstUpdated() {
    requestAnimationFrame(() => {
      this.isRendered = true;
    });
  }

  private emitChange(detail: Record<string, unknown>) {
    document.dispatchEvent(new CustomEvent('theme-change', { detail }));
  }

  private handleColorChange(e: Event) {
    const target = e.target as HTMLInputElement;
    this.primaryColor = target.value;
    this.emitChange({ primaryColor: target.value });
  }

  private handlePresetClick(color: string) {
    this.primaryColor = color;
    this.emitChange({ primaryColor: color });
  }

  private handleFontChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    this.fontFamily = target.value;
    this.emitChange({ fontFamily: target.value });
  }

  private handleGapChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = parseInt(target.value, 10);
    this.cardGap = value;
    this.emitChange({ cardGap: value });
  }

  private handlePatternClick(index: number) {
    this.backgroundPattern = index;
    this.emitChange({ backgroundPattern: index });
  }

  private handleClose() {
    document.dispatchEvent(new CustomEvent('close-panel'));
  }

  private handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      this.handleClose();
    }
  }

  static styles = css`
    :host {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0);
      z-index: 200;
      opacity: 0;
      pointer-events: none;
      transition: background-color var(--transition-standard), opacity var(--transition-standard);
    }

    :host([open]) .overlay {
      background-color: rgba(0, 0, 0, 0.4);
      opacity: 1;
      pointer-events: auto;
    }

    .panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 380px;
      max-width: 100vw;
      background-color: #1a1a22;
      color: #f0f0f4;
      z-index: 201;
      transform: translateX(100%);
      transition: transform 400ms var(--ease-spring);
      display: flex;
      flex-direction: column;
      box-shadow: -8px 0 32px rgba(0, 0, 0, 0.3);
    }

    :host([open]) .panel {
      transform: translateX(0);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 24px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .panel-title {
      font-family: var(--font-heading);
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .close-btn {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background-color: rgba(255, 255, 255, 0.06);
      cursor: pointer;
      border-radius: 999px;
      color: #f0f0f4;
      transition: background-color var(--transition-fast), transform var(--transition-fast);
    }

    .close-btn:hover {
      background-color: rgba(255, 255, 255, 0.12);
      transform: scale(1.05);
    }

    .close-btn svg {
      width: 18px;
      height: 18px;
    }

    .panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.5);
      margin-bottom: 16px;
    }

    .color-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .color-input-wrapper {
      position: relative;
      width: 52px;
      height: 52px;
      border-radius: 14px;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .color-input-wrapper input[type='color'] {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      border: none;
    }

    .color-preview {
      width: 100%;
      height: 100%;
      border-radius: 14px;
      transition: background-color var(--transition-standard);
    }

    .color-value {
      flex: 1;
      font-size: 14px;
      font-family: 'SF Mono', 'Consolas', monospace;
      color: rgba(255, 255, 255, 0.7);
      padding: 14px 16px;
      background-color: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      text-transform: uppercase;
    }

    .color-presets {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .color-preset {
      width: 100%;
      aspect-ratio: 1;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      position: relative;
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);
    }

    .color-preset:hover {
      transform: scale(1.08);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }

    .color-preset.active::after {
      content: '';
      position: absolute;
      inset: 3px;
      border: 2px solid rgba(255, 255, 255, 0.9);
      border-radius: 10px;
    }

    .font-select {
      width: 100%;
      padding: 14px 16px;
      font-size: 15px;
      background-color: rgba(255, 255, 255, 0.05);
      color: #f0f0f4;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      cursor: pointer;
      transition: background-color var(--transition-fast), border-color var(--transition-fast);
      outline: none;
    }

    .font-select:hover {
      background-color: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .font-select:focus {
      border-color: var(--primary);
    }

    .font-select option {
      background-color: #1a1a22;
      color: #f0f0f4;
    }

    .gap-control {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .gap-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .gap-label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
    }

    .gap-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--primary);
      font-family: 'SF Mono', 'Consolas', monospace;
    }

    .gap-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 6px;
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      outline: none;
    }

    .gap-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      background-color: var(--primary);
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      transition: transform var(--transition-fast);
    }

    .gap-slider::-webkit-slider-thumb:hover {
      transform: scale(1.15);
    }

    .gap-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      background-color: var(--primary);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    .pattern-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .pattern-item {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(255, 255, 255, 0.04);
      border: 2px solid transparent;
      border-radius: 12px;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.6);
      transition: background-color var(--transition-fast), border-color var(--transition-fast),
        transform var(--transition-fast);
    }

    .pattern-item:hover {
      background-color: rgba(255, 255, 255, 0.08);
      transform: scale(1.04);
    }

    .pattern-item.active {
      border-color: var(--primary);
      background-color: rgba(var(--primary-rgb), 0.12);
      color: var(--primary);
    }

    .pattern-item svg {
      width: 32px;
      height: 32px;
    }

    .panel-footer {
      padding: 20px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .hint-text {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
      text-align: center;
      line-height: 1.6;
    }

    @media (max-width: 480px) {
      .panel {
        width: 100%;
      }
    }
  `;

  render() {
    return html`
      <div class="overlay" @click=${this.handleOverlayClick}></div>
      <aside class="panel" role="dialog" aria-label="主题定制面板">
        <div class="panel-header">
          <h2 class="panel-title">自定义主题</h2>
          <button class="close-btn" @click=${this.handleClose} aria-label="关闭面板">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="panel-body">
          <div class="section">
            <div class="section-title">主题色</div>
            <div class="color-row">
              <div class="color-input-wrapper">
                <input
                  type="color"
                  .value=${this.primaryColor}
                  @input=${this.handleColorChange}
                />
                <div class="color-preview" style="background-color: ${this.primaryColor}"></div>
              </div>
              <div class="color-value">${this.primaryColor}</div>
            </div>
            <div class="color-presets">
              ${colorPresets.map(
                (color) => html`
                  <button
                    class="color-preset ${this.primaryColor === color ? 'active' : ''}"
                    style="background-color: ${color}"
                    @click=${() => this.handlePresetClick(color)}
                    aria-label="选择主题色 ${color}"
                  ></button>
                `
              )}
            </div>
          </div>

          <div class="section">
            <div class="section-title">标题字体</div>
            <select class="font-select" .value=${this.fontFamily} @change=${this.handleFontChange}>
              ${fontOptions.map(
                (opt) => html`
                  <option value=${opt.value} style="font-family: ${opt.value}">${opt.label}</option>
                `
              )}
            </select>
          </div>

          <div class="section">
            <div class="section-title">卡片间距</div>
            <div class="gap-control">
              <div class="gap-header">
                <span class="gap-label">网格间距</span>
                <span class="gap-value">${this.cardGap}px</span>
              </div>
              <input
                type="range"
                class="gap-slider"
                min="8"
                max="48"
                step="4"
                .value=${String(this.cardGap)}
                @input=${this.handleGapChange}
              />
            </div>
          </div>

          <div class="section">
            <div class="section-title">背景图案</div>
            <div class="pattern-grid">
              ${patternPreviews.map(
                (svg, index) => html`
                  <button
                    class="pattern-item ${this.backgroundPattern === index ? 'active' : ''}"
                    @click=${() => this.handlePatternClick(index)}
                    aria-label="选择背景图案 ${index + 1}"
                  >
                    ${svg}
                  </button>
                `
              )}
            </div>
          </div>
        </div>

        <div class="panel-footer">
          <p class="hint-text">所有修改实时生效<br/>配置通过 CSS 变量同步到全局</p>
        </div>
      </aside>
    `;
  }
}
