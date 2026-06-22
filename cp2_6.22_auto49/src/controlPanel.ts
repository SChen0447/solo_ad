import * as d3 from 'd3';
import { PlantData, PlantCategory, Season, getPlantsByCategory, getCategories } from './plantLibrary';
import { renderPlantThumbnail, getPlantColorHex } from './plantFactory';
import * as sceneManager from './sceneManager';
import * as seasonController from './seasonController';

type Mode = 'idle' | 'placing';

let currentMode: Mode = 'idle';
let selectedPlantData: PlantData | null = null;
let selectedCard: d3.Selection<HTMLDivElement, unknown, null, undefined> | null = null;
let snapshots: { dataUrl: string; state: { position: any; target: any } }[] = [];
const MAX_SNAPSHOTS = 5;

let onModeChange: ((mode: Mode) => void) | null = null;

export function init(): void {
  renderPlantLibrary();
  renderSeasonSlider();
  renderPlacedList();
  renderSnapshotArea();

  sceneManager.setOnPlantAdded(() => renderPlacedList());
  sceneManager.setOnPlantRemoved(() => renderPlacedList());
  sceneManager.setOnPlantSelected((instance) => {
    if (instance) {
      showPropertyPanel(instance.data, instance);
    } else {
      hidePropertyPanel();
    }
  });

  seasonController.setOnSeasonChange(() => {
    renderPlacedList();
    const selected = sceneManager.getSelectedInstance();
    if (selected) showPropertyPanel(selected.data, selected);
  });
}

function renderPlantLibrary(): void {
  const container = d3.select('#plant-library');
  container.selectAll('*').remove();

  const categories = getCategories();
  const categoryNames: Record<PlantCategory, string> = {
    tree: '乔木',
    shrub: '灌木',
    flower: '花卉',
  };

  categories.forEach((cat) => {
    const plants = getPlantsByCategory(cat);

    container.append('div').attr('class', 'category-label').text(categoryNames[cat]);

    const grid = container.append('div').style('display', 'flex').style('flex-wrap', 'wrap').style('gap', '2px').style('padding', '4px');

    const cards = grid.selectAll<HTMLDivElement, PlantData>('.plant-card').data(plants).enter().append('div').attr('class', 'plant-card').on('click', function (event, d) {
      event.stopPropagation();
      if (selectedCard && selectedCard.node() !== this) {
        selectedCard.classed('selected', false);
      }
      const isAlreadySelected = d3.select(this).classed('selected');
      d3.select(this).classed('selected', !isAlreadySelected);

      if (!isAlreadySelected) {
        selectedPlantData = d;
        selectedCard = d3.select(this);
        currentMode = 'placing';
        sceneManager.deselectPlant();
      } else {
        selectedPlantData = null;
        selectedCard = null;
        currentMode = 'idle';
      }

      if (onModeChange) onModeChange(currentMode);
    });

    cards.each(function (d) {
      const card = d3.select(this);
      const canvas = card.append('canvas').attr('width', 60).attr('height', 60).node()!;
      renderPlantThumbnail(d, canvas);
      card.append('span').text(d.name);
    });
  });
}

function renderSeasonSlider(): void {
  const container = d3.select('#season-control');
  container.selectAll('*').remove();

  const seasons = seasonController.getSeasons();
  const seasonNames: Record<Season, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

  const labelsDiv = container.append('div').attr('class', 'season-labels');
  seasons.forEach((s, i) => {
    labelsDiv.append('span').attr('data-season-index', i).classed('active', i === 0).text(seasonNames[s]);
  });

  const track = container.append('div').attr('class', 'season-track');
  const thumb = track.append('div').attr('class', 'season-thumb').style('left', '0%');

  let isDragging = false;

  function updateThumbPosition(index: number) {
    const pct = (index / 3) * 100;
    thumb.style('left', pct + '%');
    labelsDiv.selectAll('span').classed('active', false);
    labelsDiv.select(`[data-season-index="${index}"]`).classed('active', true);
  }

  function getSeasonIndex(clientX: number): number {
    const node = track.node()!;
    const rect = node.getBoundingClientRect();
    const pct = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(3, Math.round(pct * 3)));
  }

  thumb.on('mousedown', (event) => {
    event.preventDefault();
    isDragging = true;
    thumb.classed('dragging', true);

    function onMove(e: MouseEvent) {
      if (!isDragging) return;
      const idx = getSeasonIndex(e.clientX);
      updateThumbPosition(idx);
      seasonController.dispatchByIndex(idx);
    }

    function onUp() {
      isDragging = false;
      thumb.classed('dragging', false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });

  track.on('click', (event: MouseEvent) => {
    const idx = getSeasonIndex(event.clientX);
    updateThumbPosition(idx);
    seasonController.dispatchByIndex(idx);
  });

  labelsDiv.selectAll('span').on('click', function (event, d) {
    const idx = parseInt(d3.select(this).attr('data-season-index'));
    updateThumbPosition(idx);
    seasonController.dispatchByIndex(idx);
  });

  seasonController.setOnSeasonChange((season) => {
    const idx = seasons.indexOf(season);
    updateThumbPosition(idx);
  });
}

function renderPlacedList(): void {
  const container = d3.select('#placed-list');
  const label = container.select('.category-label');
  container.selectAll('*').remove();

  container.append('div').attr('class', 'category-label').text('已放置植物');

  const instances = sceneManager.getPlantedInstances();
  const season = sceneManager.getCurrentSeason();

  if (instances.length === 0) {
    container.append('div').style('padding', '12px').style('color', '#64748B').style('font-size', '13px').text('暂无放置的植物');
    return;
  }

  const items = container.selectAll<HTMLDivElement, typeof instances[0]>('.placed-item').data(instances, (d) => d.id).enter().append('div').attr('class', 'placed-item').attr('data-id', (d) => d.id);

  items.append('div').attr('class', 'icon').style('background', () => '#475569');

  items.append('div').attr('class', 'name').text((d) => d.data.name);

  items.append('button').attr('class', 'del-btn').html('×').on('click', function (event, d) {
    event.stopPropagation();
    const item = d3.select(this.parentNode as HTMLDivElement);
    item.classed('removing', true);
    setTimeout(() => {
      sceneManager.removePlant(d.id);
    }, 300);
  });

  items.on('click', (event, d) => {
    event.stopPropagation();
    sceneManager.selectPlant(d);
  });
}

function renderSnapshotArea(): void {
  const container = d3.select('#snapshot-area');
  container.selectAll('*').remove();

  container.append('div').attr('class', 'category-label').style('white-space', 'nowrap').text('视角快照 (空格键保存)');
}

export function addSnapshot(): void {
  if (snapshots.length >= MAX_SNAPSHOTS) {
    snapshots.shift();
  }

  const dataUrl = sceneManager.captureSnapshot();
  const state = sceneManager.saveCameraState();
  snapshots.push({ dataUrl, state });

  updateSnapshotDisplay();
}

function updateSnapshotDisplay(): void {
  const container = d3.select('#snapshot-area');
  container.selectAll('.snapshot-card').remove();

  snapshots.forEach((snap, i) => {
    container.append('div').attr('class', 'snapshot-card').on('click', () => {
      sceneManager.restoreCameraState(snap.state, 500);
    }).append('img').attr('src', snap.dataUrl).attr('alt', `快照 ${i + 1}`);
  });
}

function showPropertyPanel(data: PlantData, instance: any): void {
  const panel = document.getElementById('property-panel')!;
  const season = sceneManager.getCurrentSeason();
  const colorHex = getPlantColorHex(data, season);
  const crown = ((data.crownRange[0] + data.crownRange[1]) / 2 * data.seasons[season].foliageScale).toFixed(2);

  document.getElementById('prop-name')!.textContent = data.name;
  document.getElementById('prop-crown')!.textContent = crown + 'm';
  document.getElementById('prop-color')!.textContent = colorHex;
  (document.getElementById('prop-color') as any).style.color = colorHex;

  panel.classList.add('visible');

  const closeBtn = panel.querySelector('.close-btn') as HTMLElement | null;
  if (closeBtn) {
    closeBtn.onclick = () => {
      sceneManager.deselectPlant();
    };
  }
}

function hidePropertyPanel(): void {
  const panel = document.getElementById('property-panel')!;
  panel.classList.remove('visible');
}

export function getCurrentMode(): Mode {
  return currentMode;
}

export function getSelectedPlantData(): PlantData | null {
  return selectedPlantData;
}

export function clearSelection(): void {
  selectedPlantData = null;
  selectedCard = null;
  currentMode = 'idle';
  d3.selectAll('.plant-card').classed('selected', false);
  if (onModeChange) onModeChange(currentMode);
}

export function setOnModeChange(cb: (mode: Mode) => void): void {
  onModeChange = cb;
}

export function exportScreenshot(): void {
  const panel = document.getElementById('control-panel')!;
  const propPanel = document.getElementById('property-panel')!;
  const exportBtn = document.getElementById('export-btn')!;

  panel.style.display = 'none';
  propPanel.classList.remove('visible');
  exportBtn.style.display = 'none';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const dataUrl = sceneManager.captureScreenshot(1920, 1080);

      const link = document.createElement('a');
      link.href = dataUrl;
      link.target = '_blank';
      link.click();

      panel.style.display = '';
      exportBtn.style.display = '';
    });
  });
}
