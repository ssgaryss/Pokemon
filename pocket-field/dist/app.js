import { PocketGame } from './game.js';
import { drawCreature } from './sprites.js';
import { PocketAudio } from './audio.js';

const $ = id => document.getElementById(id);
const screen = $('game-screen');
const audio = new PocketAudio();
const species = ['moss', 'ember', 'bubble', 'spark', 'moth', 'stone'];
const names = {moss:'苔芽兽',ember:'炭尾狐',bubble:'泡泡獭',spark:'闪电鼠',moth:'月翅蛾',stone:'岩团龟'};
let previousParty = '', previousCollection = '';
let toastTimer;
function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2300);
}
function creatureCanvas(id, size = 48) {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawCreature(ctx, id, Math.floor((size - 32) / 2), Math.floor((size - 32) / 2), 1);
  return canvas;
}
function updateJournal(state) {
  const party = state.party || [];
  const collected = state.collection || party.map(p => p.id);
  const ids = collected.map(item => typeof item === 'string' ? item : item.id);
  const unique = new Set(ids);
  const caught = new Set(state.caught || []);
  $('ball-count').textContent = String(state.balls ?? 8).padStart(2,'0');
  $('potion-count').textContent = String(state.potions ?? 4).padStart(2,'0');
  $('location-name').textContent = state.zone || '苔原镇';
  $('objective').textContent = state.objective || '和你的伙伴一起，踏入第一片草丛。';
  $('collection-count').textContent = String(unique.size).padStart(2,'0');
  $('party-count').textContent = String(party.length).padStart(2,'0');
  $('progress-label').textContent = state.badge ? '挑战完成 ✓' : `${String(Math.min(caught.size,3)).padStart(2,'0')} / 03`;
  $('progress-fill').style.width = `${Math.min(caught.size / 3,1) * 100}%`;
  $('badge-display').classList.toggle('earned',!!state.badge);
  $('badge-display').title = state.badge ? '已获得原野徽章！' : '完成原野挑战获得徽章';
  $('game-status').textContent = state.paused ? '休息一下，冒险还在' : state.badge ? '原野徽章已获得' : state.mode === 'battle' ? '一场新的相遇' : '冒险进行中';
  const partyKey = JSON.stringify(party.map(p=>[p.id,p.name,p.level,p.hp,p.maxHp]));
  if (partyKey !== previousParty) {
    previousParty = partyKey;
    $('party-list').replaceChildren(...party.map(mon => {
      const row = document.createElement('div'); row.className = 'partner';
      const portrait = document.createElement('div'); portrait.className = 'partner-portrait';
      portrait.append(creatureCanvas(mon.id));
      const info = document.createElement('div'); info.className = 'partner-info';
      const name = document.createElement('div'); name.className = 'partner-name';
      const label = document.createElement('span'); label.textContent = mon.name || names[mon.id] || '小精灵';
      const level = document.createElement('small'); level.textContent = `LV.${String(mon.level || 5).padStart(2,'0')}`;
      name.append(label,level);
      const hp = document.createElement('div'); hp.className = 'partner-hp';
      const track = document.createElement('div'); track.className = 'hp-track';
      const fill = document.createElement('i'); fill.style.width = `${Math.max(0,(mon.hp / mon.maxHp) * 100)}%`;
      if(mon.hp / mon.maxHp < .25) fill.style.background = '#a27c66';
      track.append(fill);
      const value = document.createElement('span'); value.className='hp-value'; value.textContent=`${mon.hp}/${mon.maxHp}`;
      hp.append(track,value); info.append(name,hp); row.append(portrait,info); return row;
    }));
  }
  const collectionKey = [...unique].sort().join(',');
  if (collectionKey !== previousCollection || !$('collection-grid').childElementCount) {
    previousCollection = collectionKey;
    $('collection-grid').replaceChildren(...species.map((id,index) => {
      const cell = document.createElement('div'); cell.className = `dex-slot ${unique.has(id) ? 'caught' : 'unknown'}`;
      cell.dataset.number = String(index+1).padStart(3,'0');
      if(unique.has(id)) {cell.append(creatureCanvas(id)); cell.title=names[id]; cell.setAttribute('aria-label',`${names[id]}，已发现`);}
      else {cell.textContent='?';cell.title='等待你去发现';cell.setAttribute('aria-label',`图鉴 ${index+1}，尚未发现`);}
      return cell;
    }));
  }
}
const game = new PocketGame(screen, { onUpdate: updateJournal, onSound: name => audio.play(name) });
// Keep a read-only public status available to accessibility tools and local QA.
window.pocketField = { getState: () => game.getState() };
updateJournal(game.getState());

const keyMap = {ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right',z:'a',' ':'a',x:'b',Escape:'b',Enter:'start',Shift:'select'};
const buttons = [...document.querySelectorAll('[data-action]')];
const help = $('help-dialog');
const pressed = new Set();
const pointerHolds = new Map();
function releaseHolds() {for(const value of pointerHolds.values()){clearTimeout(value.timeout);clearInterval(value.interval);}pointerHolds.clear();buttons.forEach(b=>b.classList.remove('pressed'));pressed.clear();}
function dispatch(action) {game.input(action);}
window.addEventListener('keydown', event => {
  if (help.open || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
  const control = event.target.closest?.('button,a,summary');
  if (control && (!control.matches('[data-action]') || event.key === 'Enter' || event.key === ' ')) return;
  const action=keyMap[event.key] || keyMap[event.key.toLowerCase()];
  if(!action)return;
  event.preventDefault();
  if(event.repeat && !['up','down','left','right'].includes(action))return;
  if(!event.repeat) pressed.add(event.code);
  dispatch(action); buttons.filter(b=>b.dataset.action===action).forEach(b=>b.classList.add('pressed'));
});
window.addEventListener('keyup', event => {
  pressed.delete(event.code);
  const action=keyMap[event.key] || keyMap[event.key.toLowerCase()];
  buttons.filter(b=>b.dataset.action===action).forEach(b=>b.classList.remove('pressed'));
});
buttons.forEach(button => {
  const release = event => {const hold=pointerHolds.get(button);if(hold){clearTimeout(hold.timeout);clearInterval(hold.interval);pointerHolds.delete(button);}button.classList.remove('pressed');};
  button.addEventListener('pointerdown',event=>{
    event.preventDefault();button.setPointerCapture(event.pointerId);button.classList.add('pressed');dispatch(button.dataset.action);
    if(['up','down','left','right'].includes(button.dataset.action)){
      const hold={timeout:null,interval:null};hold.timeout=setTimeout(()=>{hold.interval=setInterval(()=>dispatch(button.dataset.action),140);},300);pointerHolds.set(button,hold);
    }
  });
  button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  button.addEventListener('click',event=>{if(event.detail===0)dispatch(button.dataset.action);});
});
window.addEventListener('blur',releaseHolds);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseHolds();});
$('sound-toggle').addEventListener('click', async () => {
  try {const enabled=await audio.toggle();$('sound-toggle').setAttribute('aria-pressed',String(enabled));$('sound-toggle').querySelector('span').textContent=enabled?'声音开启':'声音关闭';if(enabled)audio.play('confirm');else if(!window.AudioContext&&!window.webkitAudioContext)toast('当前浏览器暂不支持声音');}
  catch {toast('声音暂时无法开启，请再试一次');}
});
$('save-button').addEventListener('click',()=>{const saved=game.save();toast(saved===false?'浏览器未允许存档，请检查隐私设置':'进度已保存，下次在这里继续。');audio.play('confirm');});
$('help-open').addEventListener('click',()=>{releaseHolds();help.showModal();audio.play('confirm');});
document.querySelectorAll('.dialog-close').forEach(button=>button.addEventListener('click',()=>help.close()));
help.addEventListener('click',event=>{if(event.target===help){const rect=help.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)help.close();}});
help.addEventListener('close',()=>screen.focus({preventScroll:true}));
$('fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('play-zone').requestFullscreen)await $('play-zone').requestFullscreen();else toast('此浏览器不支持全屏，可横屏游玩');}catch{toast('此浏览器暂不支持全屏');}});
document.addEventListener('fullscreenchange',()=>{$('fullscreen-button').querySelector('span').textContent=document.fullscreenElement?'退出':'全屏';});
window.addEventListener('pagehide',()=>{releaseHolds();game.save();});
