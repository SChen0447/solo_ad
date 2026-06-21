export interface ComboRule {
  id: number;
  name: string;
  damage: number;
  sequence: string;
  probability: number;
}

export class ComboEditor {
  private rules: ComboRule[] = [];
  private nextId = 1;
  private comboListEl: HTMLElement;
  private modalOverlay: HTMLElement;
  private inputName: HTMLInputElement;
  private inputDamage: HTMLInputElement;
  private inputSeq: HTMLInputElement;
  private hintName: HTMLElement;
  private hintSeq: HTMLElement;
  private valDamage: HTMLElement;
  private btnConfirm: HTMLElement;
  private btnCancel: HTMLElement;
  private btnAdd: HTMLElement;
  private btnSandbox: HTMLElement;
  private onEnterSandbox: (() => void) | null = null;
  private onRulesChanged: ((rules: ComboRule[]) => void) | null = null;

  constructor() {
    this.comboListEl = document.getElementById('combo-list')!;
    this.modalOverlay = document.getElementById('modal-overlay')!;
    this.inputName = document.getElementById('input-name') as HTMLInputElement;
    this.inputDamage = document.getElementById('input-damage') as HTMLInputElement;
    this.inputSeq = document.getElementById('input-seq') as HTMLInputElement;
    this.hintName = document.getElementById('hint-name')!;
    this.hintSeq = document.getElementById('hint-seq')!;
    this.valDamage = document.getElementById('val-damage')!;
    this.btnConfirm = document.getElementById('btn-confirm-add')!;
    this.btnCancel = document.getElementById('btn-cancel-add')!;
    this.btnAdd = document.getElementById('btn-add-combo')!;
    this.btnSandbox = document.getElementById('btn-enter-sandbox')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.btnAdd.addEventListener('click', () => this.openModal());
    this.btnCancel.addEventListener('click', () => this.closeModal());
    this.btnConfirm.addEventListener('click', () => this.confirmAdd());
    this.btnSandbox.addEventListener('click', () => {
      if (this.onEnterSandbox) this.onEnterSandbox();
    });

    this.inputDamage.addEventListener('input', () => {
      this.valDamage.textContent = this.inputDamage.value;
    });

    this.inputName.addEventListener('input', () => this.validateName());
    this.inputSeq.addEventListener('input', () => this.validateSeq());

    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) this.closeModal();
    });
  }

  setOnEnterSandbox(cb: () => void): void {
    this.onEnterSandbox = cb;
  }

  setOnRulesChanged(cb: (rules: ComboRule[]) => void): void {
    this.onRulesChanged = cb;
  }

  getRules(): ComboRule[] {
    return this.rules;
  }

  private openModal(): void {
    if (this.rules.length >= 8) return;
    this.inputName.value = '';
    this.inputSeq.value = '';
    this.inputDamage.value = '50';
    this.valDamage.textContent = '50';
    this.hintName.textContent = '';
    this.hintSeq.textContent = '';
    this.inputName.classList.remove('valid', 'invalid');
    this.inputSeq.classList.remove('valid', 'invalid');
    this.modalOverlay.classList.add('active');
    this.inputName.focus();
  }

  private closeModal(): void {
    this.modalOverlay.classList.remove('active');
  }

  private validateName(): boolean {
    const val = this.inputName.value.trim();
    if (val.length === 0) {
      this.inputName.classList.remove('valid', 'invalid');
      this.hintName.textContent = '';
      return false;
    }
    if (val.length > 10) {
      this.inputName.classList.remove('valid');
      this.inputName.classList.add('invalid');
      this.hintName.textContent = '名称不能超过10字符';
      this.hintName.className = 'hint red';
      return false;
    }
    const dup = this.rules.some(r => r.name === val);
    if (dup) {
      this.inputName.classList.remove('valid');
      this.inputName.classList.add('invalid');
      this.hintName.textContent = '名称已存在';
      this.hintName.className = 'hint red';
      return false;
    }
    this.inputName.classList.remove('invalid');
    this.inputName.classList.add('valid');
    this.hintName.textContent = '✓';
    this.hintName.className = 'hint green';
    return true;
  }

  private validateSeq(): boolean {
    const raw = this.inputSeq.value.toUpperCase().replace(/[^AB]/g, '');
    this.inputSeq.value = raw;
    if (raw.length === 0) {
      this.inputSeq.classList.remove('valid', 'invalid');
      this.hintSeq.textContent = '';
      return false;
    }
    if (raw.length > 5) {
      this.inputSeq.value = raw.slice(0, 5);
      this.inputSeq.classList.remove('valid');
      this.inputSeq.classList.add('invalid');
      this.hintSeq.textContent = '最多5个按键';
      this.hintSeq.className = 'hint red';
      return false;
    }
    if (raw.length < 3) {
      this.inputSeq.classList.remove('valid');
      this.inputSeq.classList.add('invalid');
      this.hintSeq.textContent = '至少3个按键';
      this.hintSeq.className = 'hint red';
      return false;
    }
    const dup = this.rules.some(r => r.sequence === raw);
    if (dup) {
      this.inputSeq.classList.remove('valid');
      this.inputSeq.classList.add('invalid');
      this.hintSeq.textContent = '按键序列已存在';
      this.hintSeq.className = 'hint red';
      return false;
    }
    this.inputSeq.classList.remove('invalid');
    this.inputSeq.classList.add('valid');
    this.hintSeq.textContent = '✓';
    this.hintSeq.className = 'hint green';
    return true;
  }

  private calcProbability(seq: string): number {
    const len = seq.length;
    const recoveryTime = len * 0.15;
    const baseProb = 1 / Math.pow(2, len - 2);
    const penalty = recoveryTime * 0.1;
    return Math.round((baseProb - penalty) * 1000) / 1000;
  }

  private confirmAdd(): void {
    const nameOk = this.validateName();
    const seqOk = this.validateSeq();
    if (!nameOk || !seqOk) return;
    if (this.rules.length >= 8) return;

    const name = this.inputName.value.trim();
    const damage = parseInt(this.inputDamage.value, 10);
    const sequence = this.inputSeq.value.toUpperCase();
    const probability = this.calcProbability(sequence);

    const rule: ComboRule = {
      id: this.nextId++,
      name,
      damage,
      sequence,
      probability,
    };
    this.rules.push(rule);
    this.recalcProbabilities();
    this.renderList();
    this.closeModal();
    if (this.onRulesChanged) this.onRulesChanged(this.rules);
  }

  private recalcProbabilities(): void {
    for (const r of this.rules) {
      r.probability = this.calcProbability(r.sequence);
    }
  }

  deleteRule(id: number): void {
    this.rules = this.rules.filter(r => r.id !== id);
    this.recalcProbabilities();
    this.renderList();
    if (this.onRulesChanged) this.onRulesChanged(this.rules);
  }

  private renderList(): void {
    this.comboListEl.innerHTML = '';
    for (const r of this.rules) {
      const card = document.createElement('div');
      card.className = 'combo-card';
      card.innerHTML = `
        <button class="btn-delete" data-id="${r.id}">✕</button>
        <div class="combo-name">${this.escapeHtml(r.name)}</div>
        <div class="combo-seq">${r.sequence.split('').join(' ')}</div>
        <div class="combo-info">
          <span class="combo-prob">触发概率: ${(r.probability * 100).toFixed(1)}%</span>
          <span class="combo-dmg">伤害: ${r.damage}</span>
        </div>
      `;
      card.querySelector('.btn-delete')!.addEventListener('click', () => {
        this.deleteRule(r.id);
      });
      this.comboListEl.appendChild(card);
    }
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  exportJSON(): string {
    const obj: Record<string, { sequence: string; damage: number }> = {};
    for (const r of this.rules) {
      obj[r.name] = { sequence: r.sequence, damage: r.damage };
    }
    return JSON.stringify(obj, null, 2);
  }
}
