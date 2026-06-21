import type { GameElement } from '../types';

export interface ExportConfig {
  title: string;
  author: string;
  elements: GameElement[];
}

export class ExportManager {
  static generateHTML(config: ExportConfig): string {
    const data = JSON.stringify(config.elements);
    const encoded = btoa(unescape(encodeURIComponent(data)));

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${this.escapeHtml(config.title || '我的游戏')}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
html,body{width:100%;height:100%;background:#121212;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden;display:flex;align-items:center;justify-content:center;}
#landing{width:60%;max-width:600px;border-radius:16px;background:linear-gradient(135deg,#1E1E2E,#2D2D44);border:2px solid #4A90D9;padding:40px;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,0.5);}
#landing h1{font-size:28px;margin-bottom:8px;text-align:center;}
#landing .author{text-align:center;color:#888;margin-bottom:32px;font-size:14px;}
#landing label{display:block;margin-bottom:16px;font-size:14px;color:#ccc;}
#landing input{width:100%;padding:10px 14px;border-radius:8px;border:1px solid #3A3A3A;background:#1A1A2E;color:#fff;font-size:14px;margin-top:6px;outline:none;transition:border-color 0.2s;}
#landing input:focus{border-color:#4A90D9;}
#landing button{display:block;width:100%;padding:14px;border-radius:8px;background:#3B82F6;color:#fff;border:none;font-size:16px;font-weight:600;cursor:pointer;transition:filter 0.2s;margin-top:24px;}
#landing button:hover{filter:brightness(1.15);}
#gameWrap{display:none;width:100%;height:100%;position:relative;}
canvas{display:block;background:#E0E0E0;}
#hud{position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.6);color:#fff;padding:6px 10px;border-radius:4px;font-family:monospace;font-size:14px;}
#score{position:absolute;top:12px;left:12px;background:rgba(0,0,0,0.6);color:#fff;padding:6px 14px;border-radius:4px;font-size:16px;font-weight:bold;}
#overlay{position:absolute;inset:0;background:rgba(0,0,0,0.3);display:none;align-items:center;justify-content:center;color:#fff;font-size:48px;font-weight:bold;}
#tip{position:absolute;bottom:16px;width:100%;text-align:center;color:#888;font-size:12px;}
</style>
</head>
<body>
<div id="landing">
  <h1>${this.escapeHtml(config.title || '我的游戏')}</h1>
  <div class="author">作者: ${this.escapeHtml(config.author || '匿名')}</div>
  <label>游戏标题<input id="t" type="text" value="${this.escapeHtml(config.title || '我的游戏')}"/></label>
  <label>作者名<input id="a" type="text" value="${this.escapeHtml(config.author || '匿名')}"/></label>
  <button id="startBtn">开始游戏</button>
  <button id="dlBtn" style="background:#8B5CF6;margin-top:12px;">下载HTML文件</button>
</div>
<div id="gameWrap">
  <canvas id="canvas"></canvas>
  <div id="hud">0 FPS</div>
  <div id="score">得分: 0</div>
  <div id="overlay">已暂停</div>
  <div id="tip">空格键暂停/继续 · ESC返回</div>
</div>
<script>
const ELEMENTS_DATA = '${encoded}';
function dec(s){try{return JSON.parse(decodeURIComponent(escape(atob(s))));}catch(e){return [];}}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

const state = {
  elements: dec(ELEMENTS_DATA).map(e => ({...e, physics:{...e.physics}})),
  running:false, paused:false, score:0, fps:0,
  ctx:null, canvas:null, cw:0, ch:0, lastT:0, fc:0, fT:0, contexts:new Map()
};

function aabb(el){
  if(el.type==='circle')return{minX:el.x-el.radius,minY:el.y-el.radius,maxX:el.x+el.radius,maxY:el.y+el.radius};
  return{minX:el.x-el.width/2,minY:el.y-el.height/2,maxX:el.x+el.width/2,maxY:el.y+el.height/2};
}
function intersect(a,b){return a.minX<b.maxX&&a.maxX>b.minX&&a.minY<b.maxY&&a.maxY>b.minY;}
function resolve(a,b){
  const ba=aabb(a),bb=aabb(b);
  const ox=Math.min(ba.maxX-bb.minX,bb.maxX-ba.minX);
  const oy=Math.min(ba.maxY-bb.minY,bb.maxY-ba.minY);
  if(ox<oy)return{dx:ba.minX<bb.minX?-ox/2:ox/2,dy:0};
  return{dx:0,dy:ba.minY<bb.minY?-oy/2:oy/2};
}

function step(delta){
  const dt = delta*60;
  for(const el of state.elements){
    const ctx = state.contexts.get(el.id)||{t:0};
    ctx.t+=delta; state.contexts.set(el.id,ctx);
    if(el.physics.enabled&&!el.physics.isStatic){
      el.physics.vy+=el.physics.gravity*dt;
      el.physics.vx*=1-el.physics.friction*dt;
      el.x+=el.physics.vx*dt; el.y+=el.physics.vy*dt;
    }
    if(el.script&&el.script.trim()){
      try{
        new Function('element','ctx','engine','delta','"use strict";\\n'+el.script)(el,ctx,{
          addScore:n=>state.score+=n, setScore:n=>state.score=n, getScore:()=>state.score,
          getElement:id=>state.elements.find(e=>e.id===id), getAllElements:()=>state.elements,
          canvasWidth:state.cw, canvasHeight:state.ch
        },delta);
      }catch(e){}
    }
  }
  for(let i=0;i<state.elements.length;i++)for(let j=i+1;j<state.elements.length;j++){
    const a=state.elements[i],b=state.elements[j];
    if(!a.physics.enabled||!b.physics.enabled)continue;
    if(a.physics.isStatic&&b.physics.isStatic)continue;
    if(intersect(aabb(a),aabb(b))){
      const {dx,dy}=resolve(a,b);
      if(!a.physics.isStatic){
        a.x-=dx*2;a.y-=dy*2;
        if(dx!==0)a.physics.vx=-a.physics.vx*a.physics.bounciness;
        if(dy!==0)a.physics.vy=-a.physics.vy*a.physics.bounciness;
      }
      if(!b.physics.isStatic){
        b.x+=dx*2;b.y+=dy*2;
        if(dx!==0)b.physics.vx=-b.physics.vx*b.physics.bounciness;
        if(dy!==0)b.physics.vy=-b.physics.vy*b.physics.bounciness;
      }
    }
  }
  for(const el of state.elements){
    if(!el.physics.enabled||el.physics.isStatic)continue;
    const b=aabb(el);
    if(b.minX<0){el.x+=-b.minX;el.physics.vx=-el.physics.vx*el.physics.bounciness;}
    if(b.maxX>state.cw){el.x-=b.maxX-state.cw;el.physics.vx=-el.physics.vx*el.physics.bounciness;}
    if(b.minY<0){el.y+=-b.minY;el.physics.vy=-el.physics.vy*el.physics.bounciness;}
    if(b.maxY>state.ch){el.y-=b.maxY-state.ch;el.physics.vy=-el.physics.vy*el.physics.bounciness;}
  }
}

function render(){
  const {ctx}=state;
  ctx.clearRect(0,0,state.cw,state.ch);
  ctx.fillStyle='#E0E0E0'; ctx.fillRect(0,0,state.cw,state.ch);
  const sorted=[...state.elements].sort((a,b)=>a.zIndex-b.zIndex);
  for(const el of sorted){
    ctx.save(); ctx.translate(el.x,el.y);
    ctx.rotate(el.rotation*Math.PI/180);
    if(el.type==='rect'){ctx.fillStyle=el.color;ctx.fillRect(-el.width/2,-el.height/2,el.width,el.height);}
    else if(el.type==='circle'){ctx.fillStyle=el.color;ctx.beginPath();ctx.arc(0,0,el.radius,0,Math.PI*2);ctx.fill();}
    else if(el.type==='text'){ctx.fillStyle=el.color;ctx.font=(el.fontSize||24)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(el.textContent||'',0,0);}
    ctx.restore();
  }
  document.getElementById('hud').textContent=state.fps+' FPS';
  document.getElementById('score').textContent='得分: '+state.score;
  document.getElementById('overlay').style.display=state.paused?'flex':'none';
}

function loop(t){
  if(!state.running)return;
  requestAnimationFrame(loop);
  const delta=Math.min((t-state.lastT)/1000,0.05);
  state.lastT=t;
  state.fc++; state.fT+=delta;
  if(state.fT>=0.5){state.fps=Math.round(state.fc/state.fT);state.fc=0;state.fT=0;}
  if(!state.paused)step(delta);
  render();
}

function startGame(){
  document.getElementById('landing').style.display='none';
  document.getElementById('gameWrap').style.display='block';
  state.canvas=document.getElementById('canvas');
  state.ctx=state.canvas.getContext('2d');
  state.cw=window.innerWidth; state.ch=window.innerHeight;
  state.canvas.width=state.cw; state.canvas.height=state.ch;
  state.running=true; state.paused=false; state.score=0;
  state.lastT=performance.now();
  state.elements.forEach(e=>state.contexts.set(e.id,{t:0}));
  requestAnimationFrame(loop);
}

document.getElementById('startBtn').onclick=startGame;
document.getElementById('dlBtn').onclick=()=>{
  const t=document.getElementById('t').value;
  const a=document.getElementById('a').value;
  const html=document.documentElement.outerHTML
    .replace(/<h1>[^<]*<\\/h1>/,'<h1>'+escapeHtml(t)+'</h1>')
    .replace(/作者: [^<]*</,'作者: '+escapeHtml(a)+'<')
    .replace(/value="[^"]*"/,(m,i)=>i<2000?('value="'+escapeHtml(t)+'"'):('value="'+escapeHtml(a)+'"'));
  const blob=new Blob([html],{type:'text/html'});
  const url=URL.createObjectURL(blob);
  const x=document.createElement('a');
  x.href=url; x.download=(t||'game')+'.html'; x.click();
  URL.revokeObjectURL(url);
};

window.addEventListener('keydown',e=>{
  if(e.code==='Space'&&state.running){e.preventDefault();state.paused=!state.paused;}
  if(e.code==='Escape'&&state.running){
    state.running=false;
    document.getElementById('gameWrap').style.display='none';
    document.getElementById('landing').style.display='block';
  }
});
window.addEventListener('resize',()=>{
  if(!state.canvas)return;
  state.cw=window.innerWidth; state.ch=window.innerHeight;
  state.canvas.width=state.cw; state.canvas.height=state.ch;
});
</script>
</body>
</html>`;
  }

  static generateShareURL(elements: GameElement[], baseUrl?: string): string {
    const data = JSON.stringify(elements);
    const encoded = btoa(unescape(encodeURIComponent(data)));
    const base = baseUrl || (window.location.origin + window.location.pathname);
    return `${base}#game=${encoded}`;
  }

  static parseShareURL(hash: string): GameElement[] | null {
    const m = hash.match(/#game=(.+)/);
    if (!m) return null;
    try {
      return JSON.parse(decodeURIComponent(escape(atob(m[1]))));
    } catch (e) {
      return null;
    }
  }

  private static escapeHtml(s: string): string {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c] || c)
    );
  }
}
