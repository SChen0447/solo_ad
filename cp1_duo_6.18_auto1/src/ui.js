import { Vector } from './engine';
export class UIManager {
    ctx;
    canvas;
    eventBus;
    engine;
    panelWidth = 220;
    panelX = 20;
    panelY = 20;
    isDragging = false;
    isSliderDragging = false;
    mousePos = new Vector(0, 0);
    gravitySlider;
    resetButton;
    playAgainButton;
    passedRings = 0;
    totalRings = 0;
    constructor(canvas, eventBus, engine) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('Failed to get 2D context');
        this.ctx = ctx;
        this.eventBus = eventBus;
        this.engine = engine;
        const panelContentX = this.panelX + 20;
        this.gravitySlider = {
            x: panelContentX,
            y: this.panelY + 80,
            width: this.panelWidth - 40,
            height: 6,
            min: 0.001,
            max: 0.05,
            step: 0.001,
            value: engine.getGravityConstant(),
            handleX: 0,
            handleWidth: 16
        };
        this.updateSliderHandle();
        this.resetButton = {
            x: panelContentX,
            y: this.panelY + 140,
            width: this.panelWidth - 40,
            height: 36,
            hover: false
        };
        this.playAgainButton = {
            x: 0,
            y: 0,
            width: 160,
            height: 50,
            hover: false,
            visible: false
        };
        this.setupEventListeners();
        this.setupBusListeners();
    }
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
    setupBusListeners() {
        this.eventBus.on('ringPassed', (payload) => {
            if (payload.ringPassed) {
                this.passedRings = payload.ringPassed.index;
                this.totalRings = payload.ringPassed.total;
            }
        });
        this.eventBus.on('gameWin', () => {
            this.playAgainButton.visible = true;
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2 + 40;
            this.playAgainButton.x = centerX - this.playAgainButton.width / 2;
            this.playAgainButton.y = centerY - this.playAgainButton.height / 2;
        });
        this.eventBus.on('gameReset', () => {
            this.passedRings = 0;
            this.totalRings = this.engine.totalRings;
            this.playAgainButton.visible = false;
        });
    }
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return new Vector((e.clientX - rect.left) * (this.canvas.width / rect.width), (e.clientY - rect.top) * (this.canvas.height / rect.height));
    }
    handleMouseDown(e) {
        this.mousePos = this.getMousePos(e);
        if (this.engine.isGameWon && this.isPointInButton(this.mousePos, this.playAgainButton)) {
            this.eventBus.emit('gameReset');
            return;
        }
        if (this.isPointInSlider(this.mousePos)) {
            this.isSliderDragging = true;
            this.updateSliderValue(this.mousePos.x);
            return;
        }
        if (this.isPointInButton(this.mousePos, this.resetButton)) {
            this.eventBus.emit('gameReset');
            return;
        }
        if (this.isPointInPanel(this.mousePos)) {
            return;
        }
        this.isDragging = true;
        this.eventBus.emit('chargeStart', {
            chargeStart: { x: this.mousePos.x, y: this.mousePos.y }
        });
    }
    handleMouseMove(e) {
        this.mousePos = this.getMousePos(e);
        this.resetButton.hover = this.isPointInButton(this.mousePos, this.resetButton);
        this.playAgainButton.hover = this.isPointInButton(this.mousePos, this.playAgainButton);
        if (this.isSliderDragging) {
            this.updateSliderValue(this.mousePos.x);
            return;
        }
        if (this.isDragging) {
            const startPos = this.engine.energyBall.chargeStart;
            if (startPos) {
                const distance = this.mousePos.distance(startPos);
                this.eventBus.emit('chargeUpdate', {
                    chargeUpdate: { x: this.mousePos.x, y: this.mousePos.y, distance: distance }
                });
            }
        }
    }
    handleMouseUp(e) {
        if (this.isSliderDragging) {
            this.isSliderDragging = false;
            return;
        }
        if (this.isDragging) {
            this.isDragging = false;
            const startPos = this.engine.energyBall.chargeStart;
            if (startPos) {
                const dragVector = new Vector(this.mousePos.x - startPos.x, this.mousePos.y - startPos.y);
                const distance = dragVector.length();
                const maxDistance = 200;
                const power = Math.min(distance / maxDistance, 1);
                const maxSpeed = 15;
                if (distance > 10) {
                    const direction = dragVector.normalize().mul(-1);
                    const velocity = direction.mul(power * maxSpeed);
                    this.eventBus.emit('chargeRelease', {
                        chargeRelease: { vx: velocity.x, vy: velocity.y }
                    });
                }
            }
        }
    }
    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY };
            this.handleMouseDown(mouseEvent);
        }
    }
    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY };
            this.handleMouseMove(mouseEvent);
        }
    }
    handleTouchEnd(e) {
        if (e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY };
            this.handleMouseUp(mouseEvent);
        }
    }
    isPointInPanel(point) {
        return (point.x >= this.panelX &&
            point.x <= this.panelX + this.panelWidth &&
            point.y >= this.panelY &&
            point.y <= this.panelY + 200);
    }
    isPointInSlider(point) {
        const sliderHitbox = {
            x: this.gravitySlider.x - this.gravitySlider.handleWidth / 2,
            y: this.gravitySlider.y - 10,
            width: this.gravitySlider.width + this.gravitySlider.handleWidth,
            height: this.gravitySlider.height + 20
        };
        return (point.x >= sliderHitbox.x &&
            point.x <= sliderHitbox.x + sliderHitbox.width &&
            point.y >= sliderHitbox.y &&
            point.y <= sliderHitbox.y + sliderHitbox.height);
    }
    isPointInButton(point, button) {
        return (point.x >= button.x &&
            point.x <= button.x + button.width &&
            point.y >= button.y &&
            point.y <= button.y + button.height);
    }
    updateSliderHandle() {
        const range = this.gravitySlider.max - this.gravitySlider.min;
        const percent = (this.gravitySlider.value - this.gravitySlider.min) / range;
        this.gravitySlider.handleX = this.gravitySlider.x + percent * this.gravitySlider.width;
    }
    updateSliderValue(mouseX) {
        const percent = Math.max(0, Math.min(1, (mouseX - this.gravitySlider.x) / this.gravitySlider.width));
        const rawValue = this.gravitySlider.min + percent * (this.gravitySlider.max - this.gravitySlider.min);
        const steppedValue = Math.round(rawValue / this.gravitySlider.step) * this.gravitySlider.step;
        this.gravitySlider.value = steppedValue;
        this.updateSliderHandle();
        this.eventBus.emit('gravityChange', {
            gravityChange: { value: this.gravitySlider.value }
        });
    }
    render() {
        this.drawPanel();
        this.drawGravitySlider();
        this.drawResetButton();
        this.drawProgress();
        if (this.playAgainButton.visible) {
            this.drawPlayAgainButton();
        }
    }
    drawPanel() {
        this.ctx.save();
        const panelHeight = 200;
        const radius = 12;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.roundRect(this.panelX, this.panelY, this.panelWidth, panelHeight, radius);
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        this.roundRect(this.panelX, this.panelY, this.panelWidth, panelHeight, radius);
        this.ctx.stroke();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText('控制面板', this.panelX + 20, this.panelY + 20);
        this.ctx.restore();
    }
    drawGravitySlider() {
        this.ctx.save();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(`重力强度: ${this.gravitySlider.value.toFixed(3)}`, this.gravitySlider.x, this.gravitySlider.y - 25);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.roundRect(this.gravitySlider.x, this.gravitySlider.y, this.gravitySlider.width, this.gravitySlider.height, 3);
        this.ctx.fill();
        const fillWidth = this.gravitySlider.handleX - this.gravitySlider.x;
        const gradient = this.ctx.createLinearGradient(this.gravitySlider.x, 0, this.gravitySlider.handleX, 0);
        gradient.addColorStop(0, '#4a90d9');
        gradient.addColorStop(1, '#7b68ee');
        this.ctx.fillStyle = gradient;
        this.roundRect(this.gravitySlider.x, this.gravitySlider.y, fillWidth, this.gravitySlider.height, 3);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(this.gravitySlider.handleX, this.gravitySlider.y + this.gravitySlider.height / 2, this.gravitySlider.handleWidth / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();
    }
    drawResetButton() {
        this.ctx.save();
        const btn = this.resetButton;
        const radius = 8;
        const bgColor = btn.hover ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.15)';
        this.ctx.fillStyle = bgColor;
        this.roundRect(btn.x, btn.y, btn.width, btn.height, radius);
        this.ctx.fill();
        this.ctx.strokeStyle = btn.hover ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        this.roundRect(btn.x, btn.y, btn.width, btn.height, radius);
        this.ctx.stroke();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('重置游戏', btn.x + btn.width / 2, btn.y + btn.height / 2);
        this.ctx.restore();
    }
    drawProgress() {
        this.ctx.save();
        const y = this.panelY + 200;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(`当前进度`, this.panelX + 20, this.resetButton.y + this.resetButton.height + 20);
        const progressBarX = this.panelX + 20;
        const progressBarY = this.resetButton.y + this.resetButton.height + 45;
        const progressBarWidth = this.panelWidth - 40;
        const progressBarHeight = 8;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.roundRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 4);
        this.ctx.fill();
        const total = this.totalRings || 1;
        const progress = this.passedRings / total;
        const progressGradient = this.ctx.createLinearGradient(progressBarX, 0, progressBarX + progressBarWidth * progress, 0);
        progressGradient.addColorStop(0, '#00ff88');
        progressGradient.addColorStop(1, '#00ccff');
        this.ctx.fillStyle = progressGradient;
        this.roundRect(progressBarX, progressBarY, progressBarWidth * progress, progressBarHeight, 4);
        this.ctx.fill();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`已通过 ${this.passedRings}/${this.totalRings || 0} 个光环`, progressBarX, progressBarY + progressBarHeight + 10);
        this.ctx.restore();
    }
    drawPlayAgainButton() {
        this.ctx.save();
        const btn = this.playAgainButton;
        const radius = 10;
        const bgGradient = this.ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.height);
        if (btn.hover) {
            bgGradient.addColorStop(0, '#ffd700');
            bgGradient.addColorStop(1, '#ffaa00');
        }
        else {
            bgGradient.addColorStop(0, '#ffc107');
            bgGradient.addColorStop(1, '#ff9800');
        }
        this.ctx.fillStyle = bgGradient;
        this.roundRect(btn.x, btn.y, btn.width, btn.height, radius);
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.roundRect(btn.x, btn.y, btn.width, btn.height, radius);
        this.ctx.stroke();
        this.ctx.fillStyle = '#8b4513';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('再玩一次', btn.x + btn.width / 2, btn.y + btn.height / 2);
        this.ctx.restore();
    }
    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }
    resize() {
        if (this.playAgainButton.visible) {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2 + 40;
            this.playAgainButton.x = centerX - this.playAgainButton.width / 2;
            this.playAgainButton.y = centerY - this.playAgainButton.height / 2;
        }
    }
}
