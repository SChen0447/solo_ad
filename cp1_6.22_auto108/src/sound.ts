export class SoundManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('AudioContext not supported');
    }
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'square', volume: number = 0.3): void {
    if (!this.audioContext || !this.masterGain) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playShoot(): void {
    this.playTone(440, 0.08, 'square', 0.2);
  }

  playHit(): void {
    if (!this.audioContext || !this.masterGain) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.15);
  }

  playSkill(): void {
    if (!this.audioContext || !this.masterGain) return;
    
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.playTone(300 + i * 100, 0.1, 'sine', 0.3);
      }, i * 50);
    }
  }

  playPickup(): void {
    if (!this.audioContext || !this.masterGain) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime);
    oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.08);
    oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.16);
    
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }

  playDeath(): void {
    if (!this.audioContext || !this.masterGain) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.8);
    
    gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.8);
  }

  playShake(): void {
    this.playTone(80, 0.1, 'triangle', 0.2);
  }
}

export const soundManager = new SoundManager();
