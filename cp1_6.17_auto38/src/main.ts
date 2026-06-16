import { Visualizer, type ScatterConfig } from './visualizer';
import { Controls } from './controls';
import { parseCSV, type ParsedData } from './dataLoader';

class App {
  private visualizer!: Visualizer;
  private controls!: Controls;
  private parsedData: ParsedData | null = null;
  private uploadPanel!: HTMLElement;
  private mappingPanel!: HTMLElement;
  private isCollapsed = false;

  init(): void {
    const container = document.getElementById('scene-container')!;
    this.visualizer = new Visualizer(container);
    this.controls = new Controls(this.visualizer);

    this.uploadPanel = document.getElementById('upload-panel')!;
    this.mappingPanel = document.getElementById('mapping-panel')!;

    this.setupUpload();
    this.setupCollapse();
    this.setupMapping();
  }

  private setupUpload(): void {
    const dropZone = document.getElementById('drop-zone')!;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer?.files[0];
      if (file && file.name.endsWith('.csv')) {
        this.handleFile(file);
      }
    });

    dropZone.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) {
        this.handleFile(file);
      }
    });
  }

  private setupCollapse(): void {
    const toggleBtn = document.getElementById('toggle-upload')!;
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isCollapsed = !this.isCollapsed;
      const body = document.getElementById('upload-body')!;
      if (this.isCollapsed) {
        body.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
      } else {
        body.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
      }
    });
  }

  private async handleFile(file: File): Promise<void> {
    try {
      this.parsedData = await parseCSV(file);
      this.populateSelectors();
      this.mappingPanel.style.display = 'block';

      const statusEl = document.getElementById('upload-status')!;
      statusEl.textContent = `✓ ${file.name} loaded (${this.parsedData.rows.length} rows)`;
      statusEl.style.color = '#81c784';

      if (!this.isCollapsed) {
        const toggleBtn = document.getElementById('toggle-upload')!;
        toggleBtn.click();
      }
    } catch (err) {
      const statusEl = document.getElementById('upload-status')!;
      statusEl.textContent = `✗ ${(err as Error).message}`;
      statusEl.style.color = '#e57373';
    }
  }

  private populateSelectors(): void {
    if (!this.parsedData) return;

    const xSel = document.getElementById('x-select') as HTMLSelectElement;
    const ySel = document.getElementById('y-select') as HTMLSelectElement;
    const zSel = document.getElementById('z-select') as HTMLSelectElement;
    const catSel = document.getElementById('cat-select') as HTMLSelectElement;

    [xSel, ySel, zSel].forEach((sel) => {
      sel.innerHTML = '';
      for (const col of this.parsedData!.numericColumns) {
        const opt = document.createElement('option');
        opt.value = col;
        opt.textContent = col;
        sel.appendChild(opt);
      }
    });

    if (this.parsedData.numericColumns.length >= 1) xSel.value = this.parsedData.numericColumns[0];
    if (this.parsedData.numericColumns.length >= 2) ySel.value = this.parsedData.numericColumns[1];
    if (this.parsedData.numericColumns.length >= 3) zSel.value = this.parsedData.numericColumns[2];

    catSel.innerHTML = '<option value="">None</option>';
    for (const col of this.parsedData.stringColumns) {
      const opt = document.createElement('option');
      opt.value = col;
      opt.textContent = col;
      catSel.appendChild(opt);
    }

    const numCols = this.parsedData.numericColumns;
    if (numCols.length >= 2) ySel.value = numCols[1];
    if (numCols.length >= 3) zSel.value = numCols[2];
  }

  private setupMapping(): void {
    const btn = document.getElementById('apply-mapping')!;
    btn.addEventListener('click', () => {
      if (!this.parsedData) return;

      const xCol = (document.getElementById('x-select') as HTMLSelectElement).value;
      const yCol = (document.getElementById('y-select') as HTMLSelectElement).value;
      const zCol = (document.getElementById('z-select') as HTMLSelectElement).value;
      const catCol = (document.getElementById('cat-select') as HTMLSelectElement).value;

      if (!xCol || !yCol || !zCol) {
        const statusEl = document.getElementById('upload-status')!;
        statusEl.textContent = '✗ Please select X, Y, Z columns';
        statusEl.style.color = '#e57373';
        return;
      }

      const config: ScatterConfig = {
        xColumn: xCol,
        yColumn: yCol,
        zColumn: zCol,
        categoryColumn: catCol || null,
      };

      this.visualizer.buildScatter(this.parsedData, config);
    });
  }
}

const app = new App();
app.init();
