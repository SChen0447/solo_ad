import { MoleculeViewer } from './MoleculeViewer';

const container = document.getElementById('canvas-container')!;
const moleculeSelect = document.getElementById('moleculeSelect') as HTMLSelectElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

const viewer = new MoleculeViewer(container);

viewer.loadMolecule('water', false);

moleculeSelect.addEventListener('change', (e) => {
  const target = e.target as HTMLSelectElement;
  viewer.loadMolecule(target.value, true);
});

resetBtn.addEventListener('click', () => {
  viewer.resetCamera();
});

function animate(): void {
  requestAnimationFrame(animate);
  viewer.render();
}

animate();
