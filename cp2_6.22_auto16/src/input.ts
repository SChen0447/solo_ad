import { WeaponType } from './weapons';
import { SystemState, switchWeapon, fireWeapon, setWeaponHover } from './system';
import { getWeaponPanelRects } from './render';

export function setupInputHandlers(
  canvas: HTMLCanvasElement,
  state: SystemState
): () => void {
  const getCanvasCoords = (e: MouseEvent): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const onMouseMove = (e: MouseEvent): void => {
    const coords = getCanvasCoords(e);
    state.mouseX = coords.x;
    state.mouseY = coords.y;

    const rects = getWeaponPanelRects();
    for (const [type, rect] of Object.entries(rects)) {
      const hovered =
        coords.x >= rect.x && coords.x <= rect.x + rect.w &&
        coords.y >= rect.y && coords.y <= rect.y + rect.h;
      setWeaponHover(state, type as WeaponType, hovered);
    }
  };

  const onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;

    const coords = getCanvasCoords(e);
    const rects = getWeaponPanelRects();

    let clickedPanel = false;
    for (const [type, rect] of Object.entries(rects)) {
      if (
        coords.x >= rect.x && coords.x <= rect.x + rect.w &&
        coords.y >= rect.y && coords.y <= rect.y + rect.h
      ) {
        switchWeapon(state, type as WeaponType);
        clickedPanel = true;
        break;
      }
    }

    if (!clickedPanel) {
      fireWeapon(state);
    }
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case '1':
        switchWeapon(state, 'energy');
        break;
      case '2':
        switchWeapon(state, 'missile');
        break;
      case '3':
        switchWeapon(state, 'shotgun');
        break;
    }
  };

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('keydown', onKeyDown);

  return () => {
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('keydown', onKeyDown);
  };
}
