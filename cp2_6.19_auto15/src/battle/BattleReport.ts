import { ShipEntity } from './AIController';
import { BattleEvent, BattleEngine } from './BattleEngine';
import { SHIP_PRESETS } from '../fleet/ShipConfig';

export interface ShipReportRow {
  id: string;
  team: 'player' | 'enemy';
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  destroyedAt: number | null;
  survived: boolean;
  survivalTime: number;
  damageDealt: number;
  damageTaken: number;
  kills: number;
  color: string;
}

export interface BattleReportData {
  events: BattleEvent[];
  shipRows: ShipReportRow[];
  totalTime: number;
  winner: 'player' | 'enemy' | 'draw';
  keyFrames: number[];
}

export class BattleReport {
  private report: BattleReportData | null = null;
  private container: HTMLElement | null = null;
  private onBackToFleet: (() => void) | null = null;
  private onPlayback: ((speed: number) => void) | null = null;
  private playbackSpeed: number = 1;

  setCallbacks(onBack: () => void, onPlayback: (speed: number) => void): void {
    this.onBackToFleet = onBack;
    this.onPlayback = onPlayback;
  }

  generate(ships: ShipEntity[], events: BattleEvent[], totalTime: number, winner: 'player' | 'enemy' | 'draw'): BattleReportData {
    const rows: ShipReportRow[] = ships.map(s => {
      const damageTaken = Math.max(0, s.maxHp - Math.max(0, s.hp) + (s.maxShield - Math.max(0, s.shield)));
      return {
        id: s.id,
        team: s.team,
        name: s.name,
        type: s.type,
        hp: s.hp,
        maxHp: s.maxHp,
        destroyedAt: s.destroyedAt,
        survived: s.alive,
        survivalTime: s.destroyedAt !== null ? s.destroyedAt : totalTime,
        damageDealt: Math.round(s.totalDamageDealt),
        damageTaken: Math.round(damageTaken),
        kills: s.kills,
        color: s.color
      };
    });
    const keyFrames: number[] = [];
    let lastKey = -Infinity;
    for (const e of events) {
      if ((e.type === 'destroy' || e.type === 'hit' || e.type === 'fire') && e.time - lastKey > 2) {
        keyFrames.push(e.time);
        lastKey = e.time;
      }
    }
    this.report = { events, shipRows: rows, totalTime, winner, keyFrames };
    return this.report;
  }

  getReport(): BattleReportData | null {
    return this.report;
  }

  render(container: HTMLElement): void {
    if (!this.report) return;
    this.container = container;
    container.innerHTML = '';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.animation = 'fadeIn 0.3s ease-out';

    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.style.cssText = `
      width:min(920px, 92vw);max-height:86vh;overflow:hidden;
      animation: slideInUp 0.3s ease-out;display:flex;flex-direction:column;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      padding:18px 24px;border-bottom:1px solid rgba(0,212,255,0.2);
      display:flex;align-items:center;justify-content:space-between;
      background:linear-gradient(180deg, rgba(0,212,255,0.1), transparent);
    `;
    const title = document.createElement('h2');
    title.style.cssText = 'font-size:22px;letter-spacing:4px;color:#00d4ff;text-shadow:0 0 12px rgba(0,212,255,0.6);';
    const winTxt = this.report.winner === 'player' ? '战报 · 胜利' : this.report.winner === 'enemy' ? '战报 · 失败' : '战报 · 平局';
    const winCol = this.report.winner === 'player' ? '#7aff9a' : this.report.winner === 'enemy' ? '#ff7a7a' : '#ffd166';
    title.innerHTML = `<span style="color:${winCol};">${winTxt}</span>`;
    const timeLbl = document.createElement('div');
    timeLbl.style.cssText = 'font-family:Orbitron,monospace;color:#889;letter-spacing:2px;font-size:13px;';
    timeLbl.textContent = `交战时长 ${this.formatTime(this.report.totalTime)}`;
    header.appendChild(title); header.appendChild(timeLbl);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:16px 24px;';

    body.appendChild(this.renderTimeline());

    body.appendChild(this.renderTeamSection('己方舰队', this.report.shipRows.filter(r => r.team === 'player'), '#7aff9a'));
    body.appendChild(this.renderTeamSection('敌方舰队', this.report.shipRows.filter(r => r.team === 'enemy'), '#ff7a7a'));

    body.appendChild(this.renderEventLog());

    panel.appendChild(body);

    const footer = document.createElement('div');
    footer.style.cssText = `
      padding:14px 24px;border-top:1px solid rgba(0,212,255,0.2);
      display:flex;gap:10px;justify-content:flex-end;align-items:center;flex-wrap:wrap;
      background:linear-gradient(0deg, rgba(0,212,255,0.08), transparent);
    `;

    const spdLabel = document.createElement('div');
    spdLabel.style.cssText = 'font-size:12px;color:#889;margin-right:4px;';
    spdLabel.textContent = '回放速度：';

    const s1 = document.createElement('button'); s1.textContent = '1x';
    const s2 = document.createElement('button'); s2.textContent = '2x';
    const s4 = document.createElement('button'); s4.textContent = '4x';
    const highlight = (v: number) => {
      [[s1, 1], [s2, 2], [s4, 4]].forEach(([b, vv]: [HTMLButtonElement, number]) => {
        if (vv === v) {
          b.style.background = 'rgba(0,212,255,0.3)';
          b.style.borderColor = '#00d4ff';
        } else {
          b.style.background = '';
          b.style.borderColor = '';
        }
      });
    };
    highlight(this.playbackSpeed);
    s1.onclick = () => { this.playbackSpeed = 1; highlight(1); };
    s2.onclick = () => { this.playbackSpeed = 2; highlight(2); };
    s4.onclick = () => { this.playbackSpeed = 4; highlight(4); };

    const replayBtn = document.createElement('button');
    replayBtn.textContent = '⏮ 重新回放';
    replayBtn.style.cssText = 'border-color:rgba(122,255,154,0.6);';
    replayBtn.onclick = () => {
      if (this.onPlayback) this.onPlayback(this.playbackSpeed);
    };

    const backBtn = document.createElement('button');
    backBtn.textContent = '返回编队';
    backBtn.style.cssText = 'border-color:rgba(0,212,255,0.7);background:rgba(0,212,255,0.15);';
    backBtn.onclick = () => { if (this.onBackToFleet) this.onBackToFleet(); };

    footer.appendChild(spdLabel);
    footer.appendChild(s1); footer.appendChild(s2); footer.appendChild(s4);
    footer.appendChild(replayBtn); footer.appendChild(backBtn);
    panel.appendChild(footer);

    overlay.appendChild(panel);
    container.appendChild(overlay);
  }

  private renderTimeline(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:20px;padding:14px;background:rgba(0,212,255,0.04);border:1px solid rgba(0,212,255,0.15);border-radius:4px;';
    const title = document.createElement('div');
    title.style.cssText = 'font-family:Orbitron,sans-serif;font-size:12px;color:#00d4ff;letter-spacing:2px;margin-bottom:8px;';
    title.textContent = '时间轴 · 关键帧';
    wrap.appendChild(title);

    const bar = document.createElement('div');
    bar.style.cssText = 'position:relative;height:22px;background:rgba(255,255,255,0.05);border-radius:3px;border:1px solid rgba(0,212,255,0.15);overflow:hidden;';

    const total = this.report!.totalTime || 1;
    for (const t of this.report!.keyFrames.slice(0, 40)) {
      const marker = document.createElement('div');
      marker.style.cssText = `
        position:absolute;top:3px;left:${(t / total) * 100}%;width:2px;height:16px;
        background:#00d4ff;opacity:0.7;
      `;
      marker.title = `关键事件 ${this.formatTime(t)}`;
      bar.appendChild(marker);
    }

    const destroys = this.report!.events.filter(e => e.type === 'destroy');
    for (const d of destroys) {
      const marker = document.createElement('div');
      marker.style.cssText = `
        position:absolute;top:0;left:${((d.time || 0) / total) * 100}%;width:4px;height:22px;
        background:#ff7070;opacity:0.85;
      `;
      marker.title = `击毁 ${this.formatTime(d.time || 0)}`;
      bar.appendChild(marker);
    }
    wrap.appendChild(bar);

    const labels = document.createElement('div');
    labels.style.cssText = 'display:flex;justify-content:space-between;margin-top:4px;font-family:monospace;font-size:10px;color:#778;';
    labels.innerHTML = `<span>00:00</span><span>${this.formatTime(total / 4)}</span><span>${this.formatTime(total / 2)}</span><span>${this.formatTime(total * 0.75)}</span><span>${this.formatTime(total)}</span>`;
    wrap.appendChild(labels);
    return wrap;
  }

  private renderTeamSection(title: string, rows: ShipReportRow[], color: string): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:20px;';
    const h = document.createElement('div');
    h.style.cssText = `font-family:Orbitron,sans-serif;font-size:13px;letter-spacing:2px;color:${color};margin-bottom:8px;padding:4px 0;border-bottom:1px solid ${color}33;`;
    const alive = rows.filter(r => r.survived).length;
    h.textContent = `${title}  ${alive}/${rows.length} 存活`;
    wrap.appendChild(h);

    const tbl = document.createElement('div');
    tbl.style.cssText = 'display:grid;grid-template-columns:46px 1.3fr repeat(5, 1fr) 70px;gap:4px 8px;font-size:12px;';
    const header = ['#', '舰船', '类型', '造成伤害', '承受伤害', '击毁', '存活时间', '状态'];
    header.forEach(t => {
      const c = document.createElement('div');
      c.style.cssText = 'color:#7a8ba8;font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1px;padding:4px 6px;border-bottom:1px solid rgba(0,212,255,0.1);';
      c.textContent = t;
      tbl.appendChild(c);
    });
    const sorted = [...rows].sort((a, b) => (a.destroyedAt ?? 1e9) - (b.destroyedAt ?? 1e9));
    sorted.forEach((r, i) => {
      const idx = document.createElement('div');
      idx.style.cssText = 'color:#556;padding:5px 6px;';
      idx.textContent = String(i + 1);

      const name = document.createElement('div');
      name.style.cssText = `color:${r.color};padding:5px 6px;font-family:Orbitron,sans-serif;font-size:11px;${r.survived ? '' : 'text-decoration:line-through;opacity:0.6;'} display:flex;align-items:center;gap:6px;`;
      name.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${r.color};box-shadow:0 0 5px ${r.color};"></span>${r.name}`;

      const type = document.createElement('div');
      type.style.cssText = 'color:#8a9;padding:5px 6px;font-size:11px;';
      const preset = (SHIP_PRESETS as any)[r.type];
      type.textContent = preset ? preset.name : r.type;

      const dmgD = this.statCell(r.damageDealt, '#7aff9a');
      const dmgT = this.statCell(r.damageTaken, '#ff9a7a');
      const kills = this.statCell(r.kills, '#ffd166');

      const time = document.createElement('div');
      time.style.cssText = 'color:#aab;padding:5px 6px;font-family:monospace;font-size:11px;';
      time.textContent = this.formatTime(r.survivalTime);

      const status = document.createElement('div');
      status.style.cssText = `padding:4px 6px;font-size:10px;font-family:Orbitron,sans-serif;text-align:center;border-radius:2px;${r.survived ? 'background:rgba(122,255,154,0.12);color:#7aff9a;border:1px solid rgba(122,255,154,0.3);' : 'background:rgba(255,100,100,0.12);color:#ff7a7a;border:1px solid rgba(255,100,100,0.3);'}`;
      status.textContent = r.survived ? '存活' : '击毁';

      tbl.appendChild(idx); tbl.appendChild(name); tbl.appendChild(type);
      tbl.appendChild(dmgD); tbl.appendChild(dmgT); tbl.appendChild(kills);
      tbl.appendChild(time); tbl.appendChild(status);
    });
    wrap.appendChild(tbl);
    return wrap;
  }

  private statCell(v: number, color: string): HTMLElement {
    const d = document.createElement('div');
    d.style.cssText = `color:${color};padding:5px 6px;font-family:Rajdhani,sans-serif;font-weight:600;`;
    d.textContent = String(v);
    return d;
  }

  private renderEventLog(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:16px;';
    const h = document.createElement('div');
    h.style.cssText = 'font-family:Orbitron,sans-serif;font-size:13px;letter-spacing:2px;color:#ffd166;margin-bottom:8px;padding:4px 0;border-bottom:1px solid rgba(255,209,102,0.2);';
    h.textContent = '· 事件日志';
    wrap.appendChild(h);

    const scroller = document.createElement('div');
    scroller.style.cssText = 'max-height:160px;overflow-y:auto;padding:8px 10px;background:rgba(0,0,0,0.25);border:1px solid rgba(0,212,255,0.08);border-radius:3px;font-family:monospace;font-size:11px;line-height:1.7;';
    const shipById = new Map(this.report!.shipRows.map(r => [r.id, r]));
    const destroys = this.report!.events.filter(e => e.type === 'destroy' || e.type === 'hit').slice(-80);
    for (const e of destroys) {
      const line = document.createElement('div');
      line.style.cssText = 'display:flex;gap:8px;align-items:baseline;';
      const t = document.createElement('span');
      t.style.cssText = 'color:#556;min-width:48px;';
      t.textContent = this.formatTime(e.time || 0);
      line.appendChild(t);

      const content = document.createElement('span');
      if (e.type === 'destroy') {
        const tgt = shipById.get(e.targetId || '');
        const atk = e.attackerId ? shipById.get(e.attackerId) : null;
        content.style.color = '#ff8a8a';
        content.innerHTML = `💥 <span style="color:${tgt?.color || '#fff'};">${tgt?.name || e.targetId}</span> 被 ${atk ? `<span style="color:${atk.color};">${atk.name}</span>` : '未知'} 击毁！`;
      } else if (e.type === 'hit') {
        const tgt = shipById.get(e.targetId || '');
        content.innerHTML = `⤳ <span style="color:${tgt?.color || '#fff'};">${tgt?.name || e.targetId}</span> 受到 <span style="color:#ffd166;">${e.damage?.toFixed(0)}</span> 点伤害`;
        content.style.color = '#aac';
      }
      line.appendChild(content);
      scroller.appendChild(line);
    }
    if (destroys.length === 0) {
      scroller.innerHTML = '<div style="color:#556;padding:20px;text-align:center;">暂无事件记录</div>';
    }
    wrap.appendChild(scroller);
    return wrap;
  }

  private formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
}
