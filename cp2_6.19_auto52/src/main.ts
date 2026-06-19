import { SceneManager, BaseSelectionInfo } from './renderer/SceneManager';
import { GuiController } from './renderer/GuiController';
import { SequenceParser } from './data/SequenceParser';

class DNAExplorerApp {
  private sceneManager!: SceneManager;
  private guiController!: GuiController;
  private sequenceParser!: SequenceParser;
  private infoPanel!: HTMLElement;
  private closePanelBtn!: HTMLElement;

  private sequenceInput: HTMLInputElement | null = null;
  private validationIcon: HTMLElement | null = null;
  private statusIndicator: HTMLElement | null = null;
  private statusHideTimer: number | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) {
      console.error('Canvas container not found');
      return;
    }

    this.infoPanel = document.getElementById('info-panel') as HTMLElement;
    this.closePanelBtn = document.getElementById('close-panel') as HTMLElement;

    if (this.closePanelBtn) {
      this.closePanelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeInfoPanel();
      });
    }

    this.sequenceParser = new SequenceParser();
    this.sceneManager = new SceneManager(canvasContainer);
    this.guiController = new GuiController(this.getGuiCallbacks());

    this.sceneManager.setBaseSelectionCallback((info: BaseSelectionInfo) => {
      this.showBaseInfo(info);
    });

    this.sceneManager.setPanelCloseCallback(() => {
      this.closeInfoPanel();
    });

    const defaultSequence = this.guiController.params.sequence;
    this.sceneManager.updateSequence(defaultSequence);
    this.guiController.updateHighlightRange(defaultSequence.length - 1);

    this.setupSequenceUIEnhancements();

    this.sceneManager.start();
  }

  private setupSequenceUIEnhancements(): void {
    const setup = () => {
      this.sequenceInput = this.guiController.getSequenceInputElement();
      const sequenceRow = this.guiController.getSequenceRowElement();
      const updateButton = this.guiController.getUpdateButtonElement();

      if (!this.sequenceInput || !sequenceRow) {
        setTimeout(setup, 50);
        return;
      }

      this.injectValidationIcon(this.sequenceInput);
      this.injectStatusIndicator(sequenceRow, updateButton);
      this.attachInputListeners(this.sequenceInput);

      this.updateValidationState(this.sequenceInput.value);
    };

    setTimeout(setup, 100);
  }

  private injectValidationIcon(input: HTMLInputElement): void {
    const parent = input.parentElement;
    if (!parent) return;

    parent.style.position = 'relative';
    parent.classList.add('sequence-input-wrapper');

    const icon = document.createElement('div');
    icon.className = 'validation-icon';
    icon.textContent = '!';
    icon.setAttribute('role', 'alert');

    const tooltip = document.createElement('span');
    tooltip.className = 'validation-tooltip';
    tooltip.textContent = '仅允许A、T、C、G四种碱基字符';
    icon.appendChild(tooltip);

    parent.appendChild(icon);
    this.validationIcon = icon;
  }

  private injectStatusIndicator(sequenceRow: HTMLElement, _updateButton: HTMLElement | null): void {
    const status = document.createElement('div');
    status.className = 'sequence-status';
    status.textContent = '✓ 序列已更新';

    if (sequenceRow.parentNode) {
      sequenceRow.parentNode.insertBefore(status, sequenceRow.nextSibling);
    }
    this.statusIndicator = status;
  }

  private attachInputListeners(input: HTMLInputElement): void {
    input.addEventListener('input', () => {
      this.updateValidationState(input.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleSequenceUpdateClick();
      }
    });
  }

  private updateValidationState(value: string): void {
    const hasInvalid = SequenceParser.hasInvalidCharacters(value);
    if (this.validationIcon) {
      if (hasInvalid) {
        this.validationIcon.classList.add('visible');
        const invalidChars = SequenceParser.getInvalidCharacters(value);
        const tooltip = this.validationIcon.querySelector('.validation-tooltip');
        if (tooltip && invalidChars) {
          tooltip.textContent = `仅允许A、T、C、G四种碱基字符。无效字符: ${invalidChars}`;
        }
      } else {
        this.validationIcon.classList.remove('visible');
      }
    }
  }

  private handleSequenceUpdateClick(): void {
    if (!this.sequenceInput) return;

    const seq = this.sequenceInput.value.toUpperCase().replace(/[^ATCG]/g, '');
    const finalSeq = seq.length > 64 ? seq.substring(0, 64) : seq;
    this.sequenceInput.value = finalSeq;

    this.guiController.updateSequenceDisplay(finalSeq);
    this.sceneManager.updateSequence(finalSeq);
    this.guiController.updateHighlightRange(Math.max(0, finalSeq.length - 1));
    this.closeInfoPanel();

    this.updateValidationState(finalSeq);
    this.showStatusIndicator();
  }

  private showStatusIndicator(): void {
    if (!this.statusIndicator) return;

    if (this.statusHideTimer !== null) {
      window.clearTimeout(this.statusHideTimer);
      this.statusHideTimer = null;
      this.statusIndicator.classList.remove('visible');
      void this.statusIndicator.offsetWidth;
    }

    this.statusIndicator.classList.add('visible');

    this.statusHideTimer = window.setTimeout(() => {
      this.statusIndicator?.classList.remove('visible');
      this.statusHideTimer = null;
    }, 2000);
  }

  private getGuiCallbacks() {
    return {
      onRotateSpeedChange: (speed: number) => {
        this.sceneManager.setRotateSpeed(speed);
      },
      onAutoRotateToggle: (enabled: boolean) => {
        this.sceneManager.setAutoRotate(enabled);
      },
      onBackboneRadiusChange: (value: number) => {
        this.sceneManager.setBackboneRadius(value);
      },
      onBaseRadiusChange: (value: number) => {
        this.sceneManager.setHelixRadius(value);
      },
      onBaseHeightChange: (value: number) => {
        this.sceneManager.setBaseHeight(value);
      },
      onHelixPitchChange: (value: number) => {
        this.sceneManager.setHelixPitch(value);
      },
      onHelixRadiusChange: (value: number) => {
        this.sceneManager.setHelixRadius(value);
      },
      onSequenceUpdate: (sequence: string) => {
        const validation = this.sequenceParser.validate(sequence);
        const sanitized = validation.sanitized;

        if (!validation.valid) {
          console.warn(validation.message);
        }

        this.guiController.updateSequenceDisplay(sanitized);
        this.sceneManager.updateSequence(sanitized);
        this.guiController.updateHighlightRange(Math.max(0, sanitized.length - 1));
        this.closeInfoPanel();

        this.updateValidationState(sanitized);
        this.showStatusIndicator();
      },
      onHighlight: (start: number, end: number) => {
        this.sceneManager.applyHighlight(start, end);
      },
      onResetHighlight: () => {
        this.sceneManager.resetHighlight(true);
      }
    };
  }

  private showBaseInfo(info: BaseSelectionInfo): void {
    const baseNameEl = document.getElementById('base-name');
    const baseSymbolEl = document.getElementById('base-symbol');
    const baseIndexEl = document.getElementById('base-index');
    const basePairEl = document.getElementById('base-pair');
    const baseHydrogenEl = document.getElementById('base-hydrogen');

    if (baseNameEl) {
      baseNameEl.textContent = info.baseName;
    }
    if (baseSymbolEl) {
      const hex = '#' + info.color.toString(16).padStart(6, '0');
      baseSymbolEl.innerHTML = `${info.baseSymbol}<span class="base-color" style="background-color: ${hex}; color: ${hex};"></span>`;
    }
    if (baseIndexEl) {
      baseIndexEl.textContent = `#${info.index + 1} (0-based: ${info.index})`;
    }
    if (basePairEl) {
      basePairEl.textContent = info.pairName;
    }
    if (baseHydrogenEl) {
      baseHydrogenEl.textContent = `${info.hydrogenBonds} 个`;
    }

    if (this.infoPanel) {
      this.infoPanel.classList.add('open');
    }
  }

  private closeInfoPanel(): void {
    if (this.infoPanel && this.infoPanel.classList.contains('open')) {
      this.infoPanel.classList.remove('open');
    }
  }
}

let app: DNAExplorerApp | null = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app = new DNAExplorerApp();
  });
} else {
  app = new DNAExplorerApp();
}
