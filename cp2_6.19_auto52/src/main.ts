import { SceneManager, BaseSelectionInfo } from './renderer/SceneManager';
import { GuiController } from './renderer/GuiController';
import { SequenceParser } from './data/SequenceParser';

class DNAExplorerApp {
  private sceneManager!: SceneManager;
  private guiController!: GuiController;
  private sequenceParser!: SequenceParser;
  private infoPanel!: HTMLElement;
  private closePanelBtn!: HTMLElement;

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

    this.sceneManager.start();
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
