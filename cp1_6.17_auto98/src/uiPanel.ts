import { CurveData, TubeParams } from './types';

type SelectHandler = (id: string) => void;
type DeleteHandler = (id: string) => void;
type RenameHandler = (id: string, name: string) => void;
type ParamChangeHandler = (id: string, params: Partial<TubeParams>) => void;
type ActionHandler = () => void;

export class UIPanel {
  private listContainer: HTMLElement;
  private paramsContainer: HTMLElement;
  private countEl: HTMLElement;
  private tooltipEl: HTMLElement;

  private onSelect: SelectHandler;
  private onDelete: DeleteHandler;
  private onRename: RenameHandler;
  private onParamChange: ParamChangeHandler;
  private onExport: ActionHandler;
  private onImport: ActionHandler;

  private debounceTimers: Map<string, number> = new Map();
  private currentSelectedId: string | null = null;

  constructor(
    listContainer: HTMLElement,
    paramsContainer: HTMLElement,
    countEl: HTMLElement,
    tooltipEl: HTMLElement,
    handlers: {
      onSelect: SelectHandler;
      onDelete: DeleteHandler;
      onRename: RenameHandler;
      onParamChange: ParamChangeHandler;
      onExport: ActionHandler;
      onImport: ActionHandler;
    }
  ) {
    this.listContainer = listContainer;
    this.paramsContainer = paramsContainer;
    this.countEl = countEl;
    this.tooltipEl = tooltipEl;
    this.onSelect = handlers.onSelect;
    this.onDelete = handlers.onDelete;
    this.onRename = handlers.onRename;
    this.onParamChange = handlers.onParamChange;
    this.onExport = handlers.onExport;
    this.onImport = handlers.onImport;

    this.bindGlobal();
  }

  private bindGlobal() {
    document.getElementById('btn-export')?.addEventListener('click', () => this.onExport());
    document.getElementById('btn-import')?.addEventListener('click', () => {
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.click();
    });
  }

  bindFileInput(onFileSelected: (file: File) => void) {
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (!fileInput) return;
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (file) onFileSelected(file);
      fileInput.value = '';
    });
  }

  render(curves: CurveData[], selectedId: string | null) {
    this.currentSelectedId = selectedId;
    this.renderList(curves, selectedId);
    this.renderParams(curves, selectedId);
    this.countEl.textContent = curves.length.toString();
  }

  private renderList(curves: CurveData[], selectedId: string | null) {
    this.listContainer.innerHTML = '';

    if (curves.length === 0) {
      this.listContainer.innerHTML = `
        <div class="empty-tip">
          <div class="empty-tip-icon">🌌</div>
          <div>场景中暂无曲线</div>
          <div style="margin-top:8px;font-size:12px;opacity:0.7;">在场景中按住左键拖拽绘制</div>
        </div>
      `;
      return;
    }

    curves.forEach(data => {
      const item = document.createElement('div');
      item.className = `curve-item ${data.id === selectedId ? 'selected' : ''}`;
      item.dataset.id = data.id;

      item.innerHTML = `
        <div class="color-swatch" style="background:${data.params.color};"></div>
        <div class="curve-info">
          <div class="curve-name" data-name-target="${data.id}">${this.escapeHtml(data.name)}</div>
          <div class="curve-meta">${data.controlPoints.length} 控制点 · R ${data.params.radius.toFixed(1)}</div>
        </div>
        <button class="delete-btn" data-delete-id="${data.id}" title="删除">×</button>
      `;

      item.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.dataset.deleteId) return;
        if (target.closest('[data-name-target]')) return;
        this.onSelect(data.id);
      });

      const deleteBtn = item.querySelector('[data-delete-id]') as HTMLElement;
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onDelete(data.id);
      });

      const nameEl = item.querySelector('[data-name-target]') as HTMLElement;
      nameEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.startRename(nameEl, data.id, data.name);
      });

      this.listContainer.appendChild(item);
    });
  }

  private startRename(nameEl: HTMLElement, id: string, currentName: string) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'curve-name-input';
    input.value = currentName;
    input.maxLength = 20;

    nameEl.replaceWith(input);
    input.focus();
    input.select();

    const finish = (commit: boolean) => {
      const newName = commit && input.value.trim() ? input.value.trim() : currentName;
      const el = document.createElement('div');
      el.className = 'curve-name';
      el.dataset.nameTarget = id;
      el.textContent = newName;
      input.replaceWith(el);

      el.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.startRename(el, id, newName);
      });

      if (commit && newName !== currentName) {
        this.onRename(id, newName);
      }
    };

    input.addEventListener('blur', () => finish(true));
    input.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        (e.target as HTMLElement).blur();
      } else if ((e as KeyboardEvent).key === 'Escape') {
        input.value = currentName;
        finish(false);
      }
    });
    input.addEventListener('click', (e) => e.stopPropagation());
  }

  private renderParams(curves: CurveData[], selectedId: string | null) {
    this.paramsContainer.innerHTML = '';

    if (!selectedId) {
      this.paramsContainer.innerHTML = `
        <div class="params-disabled-mask">
          <div class="icon">🎯</div>
          <div>请选择一条曲线</div>
          <div style="margin-top:8px;font-size:12px;opacity:0.7;">在左侧列表或场景中点击模型</div>
        </div>
      `;
      return;
    }

    const data = curves.find(c => c.id === selectedId);
    if (!data) return;

    this.paramsContainer.innerHTML = `
      <div style="padding:8px 4px 16px;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:16px;">
        <div style="font-size:14px;font-weight:600;color:#fff;">${this.escapeHtml(data.name)}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">ID: ${data.id.slice(0, 12)}...</div>
      </div>

      <div class="param-group">
        <div class="param-label">
          <span>管道半径</span>
          <span class="param-value" data-value="radius">${data.params.radius.toFixed(1)}</span>
        </div>
        <input type="range" data-param="radius" min="0.1" max="2.0" step="0.1" value="${data.params.radius}" />
      </div>

      <div class="param-group">
        <div class="param-label">
          <span>分段数</span>
          <span class="param-value" data-value="tubularSegments">${data.params.tubularSegments}</span>
        </div>
        <input type="range" data-param="tubularSegments" min="6" max="32" step="1" value="${data.params.tubularSegments}" />
      </div>

      <div class="param-group">
        <div class="param-label"><span>材质颜色</span></div>
        <div class="color-row">
          <input type="color" data-param="color" value="${data.params.color}" />
          <span class="color-hex" data-value="color">${data.params.color.toUpperCase()}</span>
        </div>
      </div>

      <div class="param-group">
        <div class="param-label">
          <span>UV 平铺次数</span>
          <span class="param-value" data-value="uvTiling">${data.params.uvTiling}</span>
        </div>
        <input type="range" data-param="uvTiling" min="1" max="10" step="1" value="${data.params.uvTiling}" />
      </div>
    `;

    this.paramsContainer.querySelectorAll('input[type="range"], input[type="color"]').forEach(el => {
      const param = (el as HTMLElement).dataset.param as keyof TubeParams;
      if (!param) return;

      el.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.handleParamInput(selectedId, param, target.value);
      });
    });
  }

  private handleParamInput(id: string, param: keyof TubeParams, rawValue: string) {
    let value: number | string = rawValue;
    if (param !== 'color') {
      value = parseFloat(rawValue);
      if (isNaN(value)) return;
    }

    this.updateValueDisplay(param, value);

    const key = `${id}_${param}`;
    const existing = this.debounceTimers.get(key);
    if (existing) window.clearTimeout(existing);

    const timer = window.setTimeout(() => {
      this.onParamChange(id, { [param]: value } as Partial<TubeParams>);
      this.debounceTimers.delete(key);
    }, 300);
    this.debounceTimers.set(key, timer);
  }

  private updateValueDisplay(param: keyof TubeParams, value: string | number) {
    const el = this.paramsContainer.querySelector(`[data-value="${param}"]`);
    if (!el) return;

    if (param === 'radius') {
      el.textContent = (value as number).toFixed(1);
    } else if (param === 'color') {
      el.textContent = (value as string).toUpperCase();
    } else {
      el.textContent = value.toString();
    }
  }

  showTooltip(x: number, y: number, data: { name: string; radius: number; segments: number }) {
    this.tooltipEl.innerHTML = `
      <div class="tooltip-row">
        <span class="tooltip-label">名称</span>
        <span class="tooltip-value">${this.escapeHtml(data.name)}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">管道半径</span>
        <span class="tooltip-value">${data.radius.toFixed(1)}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">分段数</span>
        <span class="tooltip-value">${data.segments}</span>
      </div>
    `;
    this.tooltipEl.style.left = `${x + 16}px`;
    this.tooltipEl.style.top = `${y + 16}px`;
    this.tooltipEl.classList.add('visible');
  }

  hideTooltip() {
    this.tooltipEl.classList.remove('visible');
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
