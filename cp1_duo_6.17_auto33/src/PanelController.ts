import * as THREE from 'three';
import { CurveSurface } from './CurveSurface';
import { LightController, EnvMapType } from './LightController';

export class PanelController {
    private curveSurface: CurveSurface;
    private lightController: LightController;
    private camera: THREE.PerspectiveCamera;
    private selectedPanels: Set<number>;
    private selectedPointIndex: number | null;
    private isDraggingDial: boolean;
    private minimapCanvas: HTMLCanvasElement;
    private minimapCtx: CanvasRenderingContext2D;
    private onPanelSelectChange: ((indices: number[]) => void) | null;

    constructor(
        curveSurface: CurveSurface,
        lightController: LightController,
        camera: THREE.PerspectiveCamera
    ) {
        this.curveSurface = curveSurface;
        this.lightController = lightController;
        this.camera = camera;
        this.selectedPanels = new Set();
        this.selectedPointIndex = null;
        this.isDraggingDial = false;
        this.onPanelSelectChange = null;

        const canvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
        this.minimapCanvas = canvas;
        this.minimapCtx = canvas.getContext('2d')!;

        this.init();
    }

    private init(): void {
        this.setupSections();
        this.setupControlPointList();
        this.setupMaterialControls();
        this.setupLightDial();
        this.setupEnvPresets();
        this.setupHamburgerMenu();
        this.updateMinimap();
    }

    private setupSections(): void {
        const titles = document.querySelectorAll('.section-title');
        titles.forEach(title => {
            title.addEventListener('click', () => {
                const sectionName = title.getAttribute('data-section');
                const content = document.getElementById(`section-${sectionName}`);

                title.classList.toggle('collapsed');
                content?.classList.toggle('collapsed');

                if (content && !content.classList.contains('collapsed')) {
                    content.style.maxHeight = content.scrollHeight + 'px';
                }
            });
        });

        document.querySelectorAll('.section-content').forEach(content => {
            if (!content.classList.contains('collapsed')) {
                (content as HTMLElement).style.maxHeight = (content as HTMLElement).scrollHeight + 'px';
            }
        });
    }

    private setupControlPointList(): void {
        this.updatePointList();
    }

    private updatePointList(): void {
        const list = document.getElementById('point-list');
        if (!list) return;

        const points = this.curveSurface.getControlPoints();
        list.innerHTML = '';

        points.forEach((point, index) => {
            const item = document.createElement('div');
            item.className = 'point-item';
            if (this.selectedPointIndex === index) {
                item.classList.add('selected');
            }

            const dot = document.createElement('span');
            dot.className = 'point-dot';

            const coords = document.createElement('span');
            coords.className = 'point-coords';
            coords.textContent = `P${index}: (${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)})`;

            item.appendChild(dot);
            item.appendChild(coords);

            item.addEventListener('click', () => {
                this.selectedPointIndex = index;
                this.updatePointList();
            });

            list.appendChild(item);
        });
    }

    private setupMaterialControls(): void {
        const colorInput = document.getElementById('material-color') as HTMLInputElement;
        const colorHex = document.getElementById('color-hex');
        const opacitySlider = document.getElementById('material-opacity') as HTMLInputElement;
        const opacityValue = document.getElementById('opacity-value');
        const metalnessSlider = document.getElementById('material-metalness') as HTMLInputElement;
        const metalnessValue = document.getElementById('metalness-value');
        const roughnessSlider = document.getElementById('material-roughness') as HTMLInputElement;
        const roughnessValue = document.getElementById('roughness-value');

        colorInput?.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            if (colorHex) colorHex.textContent = target.value.toUpperCase();
            this.applyMaterialChange({ color: target.value });
        });

        opacitySlider?.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            if (opacityValue) opacityValue.textContent = parseFloat(target.value).toFixed(2);
            this.applyMaterialChange({ opacity: parseFloat(target.value) });
        });

        metalnessSlider?.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            if (metalnessValue) metalnessValue.textContent = parseFloat(target.value).toFixed(2);
            this.applyMaterialChange({ metalness: parseFloat(target.value) });
        });

        roughnessSlider?.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            if (roughnessValue) roughnessValue.textContent = parseFloat(target.value).toFixed(2);
            this.applyMaterialChange({ roughness: parseFloat(target.value) });
        });
    }

    private applyMaterialChange(params: {
        color?: string;
        opacity?: number;
        metalness?: number;
        roughness?: number;
    }): void {
        const indices = Array.from(this.selectedPanels);
        if (indices.length === 0) {
            const allIndices = Array.from({ length: this.curveSurface.getPanelCount() }, (_, i) => i);
            this.curveSurface.setPanelMaterial(allIndices, params);
        } else {
            this.curveSurface.setPanelMaterial(indices, params);
        }
    }

    private setupLightDial(): void {
        const dial = document.getElementById('sun-dial');
        const markersContainer = document.getElementById('dial-markers');

        if (markersContainer) {
            for (let i = 0; i < 12; i++) {
                const marker = document.createElement('div');
                marker.className = 'dial-marker';
                const angle = (i * 30) * Math.PI / 180;
                const radius = 52;
                const x = Math.sin(angle) * radius;
                const y = -Math.cos(angle) * radius;
                marker.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${i * 30}deg)`;
                markersContainer.appendChild(marker);
            }
        }

        this.updateSunIconPosition();

        if (dial) {
            const handleStart = (e: MouseEvent | TouchEvent) => {
                this.isDraggingDial = true;
                dial.classList.add('active');
                this.handleDialDrag(e);
                e.preventDefault();
            };

            const handleMove = (e: MouseEvent | TouchEvent) => {
                if (!this.isDraggingDial) return;
                this.handleDialDrag(e);
            };

            const handleEnd = () => {
                this.isDraggingDial = false;
                dial.classList.remove('active');
            };

            dial.addEventListener('mousedown', handleStart);
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleEnd);

            dial.addEventListener('touchstart', handleStart, { passive: false });
            document.addEventListener('touchmove', handleMove, { passive: false });
            document.addEventListener('touchend', handleEnd);
        }
    }

    private handleDialDrag(e: MouseEvent | TouchEvent): void {
        const dial = document.getElementById('sun-dial');
        if (!dial) return;

        const rect = dial.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let clientX: number, clientY: number;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const dx = clientX - centerX;
        const dy = clientY - centerY;

        let azimuth = Math.atan2(dx, -dy) * 180 / Math.PI;
        if (azimuth < 0) azimuth += 360;

        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDist = rect.width / 2 - 15;
        let altitude = 90 - (distance / maxDist) * 90;
        altitude = Math.max(0, Math.min(90, altitude));

        this.lightController.setSunAngle(azimuth, altitude);
        this.updateSunIconPosition();
        this.updateAngleDisplay();
    }

    private updateSunIconPosition(): void {
        const sunIcon = document.getElementById('sun-icon');
        const dial = document.getElementById('sun-dial');
        if (!sunIcon || !dial) return;

        const azRad = THREE.MathUtils.degToRad(this.lightController.getSunAzimuth());
        const altFactor = 1 - this.lightController.getSunAltitude() / 90;
        const maxDist = dial.offsetWidth / 2 - 15;
        const distance = altFactor * maxDist;

        const x = Math.sin(azRad) * distance;
        const y = -Math.cos(azRad) * distance;

        sunIcon.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }

    private updateAngleDisplay(): void {
        const azimuthEl = document.getElementById('azimuth-value');
        const altitudeEl = document.getElementById('altitude-value');

        if (azimuthEl) {
            azimuthEl.textContent = `${Math.round(this.lightController.getSunAzimuth())}°`;
        }
        if (altitudeEl) {
            altitudeEl.textContent = `${Math.round(this.lightController.getSunAltitude())}°`;
        }
    }

    private setupEnvPresets(): void {
        const buttons = document.querySelectorAll('.env-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const envType = btn.getAttribute('data-env') as EnvMapType;
                if (envType) {
                    buttons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.lightController.setEnvMap(envType);
                }
            });
        });
    }

    private setupHamburgerMenu(): void {
        const toggle = document.getElementById('menu-toggle');
        const panel = document.getElementById('side-panel');

        if (toggle && panel) {
            toggle.addEventListener('click', () => {
                toggle.classList.toggle('active');
                panel.classList.toggle('open');
            });
        }
    }

    public updateMinimap(): void {
        const ctx = this.minimapCtx;
        const w = this.minimapCanvas.width;
        const h = this.minimapCanvas.height;

        ctx.clearRect(0, 0, w, h);

        const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gradient.addColorStop(0, 'rgba(68, 136, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(30, 30, 50, 0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const pos = (i / 4) * w;
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, h);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(w, pos);
            ctx.stroke();
        }

        const points = this.curveSurface.getControlPoints();
        const scale = 12;
        const offsetX = w / 2;
        const offsetY = h / 2;

        if (points.length >= 2) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
            ctx.lineWidth = 1.5;
            points.forEach((p, i) => {
                const x = offsetX + p.x * scale;
                const y = offsetY + p.z * scale;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        }

        points.forEach((p, i) => {
            const x = offsetX + p.x * scale;
            const y = offsetY + p.z * scale;

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#d4af37';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '9px Consolas, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${i}`, x, y - 8);
        });

        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);
        const camX = offsetX + this.camera.position.x * scale * 0.3;
        const camY = offsetY + this.camera.position.z * scale * 0.3;
        const angle = Math.atan2(camDir.x, camDir.z);

        ctx.save();
        ctx.translate(camX, camY);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(-5, 6);
        ctx.lineTo(5, 6);
        ctx.closePath();
        ctx.fillStyle = '#4488ff';
        ctx.fill();
        ctx.strokeStyle = 'rgba(68, 136, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }

    public selectPanel(index: number, multiSelect: boolean = false): void {
        if (multiSelect) {
            if (this.selectedPanels.has(index)) {
                this.selectedPanels.delete(index);
            } else {
                this.selectedPanels.add(index);
            }
        } else {
            this.selectedPanels.clear();
            this.selectedPanels.add(index);
        }

        this.curveSurface.selectPanels(Array.from(this.selectedPanels));
        this.updateSelectionCount();

        if (this.onPanelSelectChange) {
            this.onPanelSelectChange(Array.from(this.selectedPanels));
        }
    }

    public clearSelection(): void {
        this.selectedPanels.clear();
        this.curveSurface.selectPanels([]);
        this.updateSelectionCount();
    }

    private updateSelectionCount(): void {
        const countEl = document.getElementById('selection-count');
        if (countEl) {
            countEl.textContent = this.selectedPanels.size.toString();
        }
    }

    public selectAllPanels(): void {
        for (let i = 0; i < this.curveSurface.getPanelCount(); i++) {
            this.selectedPanels.add(i);
        }
        this.curveSurface.selectPanels(Array.from(this.selectedPanels));
        this.updateSelectionCount();
    }

    public getSelectedPanels(): number[] {
        return Array.from(this.selectedPanels);
    }

    public setOnPanelSelectChange(callback: (indices: number[]) => void): void {
        this.onPanelSelectChange = callback;
    }

    public updateControlPointDisplay(): void {
        this.updatePointList();
        this.updateMinimap();
    }

    public setMinimapInteracting(interacting: boolean): void {
        const minimap = document.getElementById('mini-map');
        if (minimap) {
            minimap.classList.toggle('interacting', interacting);
        }
    }
}
