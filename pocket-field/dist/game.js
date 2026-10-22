import { PALETTE, drawTile, drawPlayer, drawCreature, drawNPC } from './sprites.js';

const SAVE_KEY = 'pocket-field-save-v1';
const VERSION = 1;
const W = 40;
const H = 32;
const TILE = 16;
const COLORS = [...PALETTE].reverse();
const SPECIES = {
  moss: { name: '苔芽兽', type: '草', base: 28, power: 6, skill: '飞叶斩', strong: '水', weak: '火' },
  ember: { name: '炭尾狐', type: '火', base: 27, power: 7, skill: '星火燎原', strong: '草', weak: '水' },
  bubble: { name: '泡泡獭', type: '水', base: 30, power: 6, skill: '涌浪拍击', strong: '火', weak: '电' },
  spark: { name: '闪电鼠', type: '电', base: 25, power: 8, skill: '雷光一闪', strong: '水', weak: '岩' },
  moth: { name: '月翅蛾', type: '风', base: 26, power: 7, skill: '月影旋风', strong: '草', weak: '电' },
  stone: { name: '岩团龟', type: '岩', base: 34, power: 6, skill: '滚石冲撞', strong: '电', weak: '水' },
};
const IDS = Object.keys(SPECIES);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const validInt = (n, fallback, lo = 0, hi = 9999) => Number.isFinite(n) ? clamp(Math.floor(n), lo, hi) : fallback;
const makeCreature = (id, level) => {
  const item = SPECIES[id] || SPECIES.moss;
  const maxHp = item.base + (level - 5) * 3;
  return { id: SPECIES[id] ? id : 'moss', name: item.name, type: item.type, level, hp: maxHp, maxHp, xp: 0 };
};

function makeMap() {
  const map = Array.from({ length: H }, () => Array(W).fill('grass'));
  const set = (x, y, tile) => { if (x >= 0 && y >= 0 && x < W && y < H) map[y][x] = tile; };
  const rect = (x, y, w, h, tile) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, tile); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) set(x, y, 'tree');
    else if ((x * 13 + y * 7) % 49 === 0) set(x, y, 'flowers');
  }
  rect(5, 11, 8, 8, 'tallGrass');
  rect(18, 12, 8, 8, 'tallGrass');
  rect(20, 3, 9, 6, 'tallGrass');
  rect(24, 22, 5, 4, 'tallGrass');
  rect(3, 20, 21, 10, 'grass');
  rect(4, 25, 31, 2, 'path');
  rect(14, 5, 2, 22, 'path');
  rect(14, 9, 19, 2, 'path');
  rect(31, 6, 2, 5, 'path');
  rect(4, 20, 2, 7, 'flowers');
  rect(22, 21, 1, 4, 'flowers');
  for (let y = 14; y <= 23; y++) for (let x = 27; x <= 36; x++) {
    if (((x - 31.5) / 5) ** 2 + ((y - 18.5) / 5) ** 2 < 1) set(x, y, 'water');
  }
  rect(28, 24, 7, 1, 'flowers');
  rect(3, 4, 7, 3, 'tree');
  rect(3, 8, 3, 2, 'tree');
  rect(17, 3, 1, 6, 'tree');
  rect(35, 3, 3, 10, 'tree');
  rect(3, 28, 19, 1, 'fence');
  set(14, 28, 'path'); set(15, 28, 'path');
  const building = (x, y, width, clinic) => {
    rect(x, y, width, 1, 'roof');
    rect(x, y + 1, width, 2, 'wall');
    set(x + Math.floor(width / 2), y + 1, clinic ? 'clinic' : 'window');
    set(x + Math.floor(width / 2), y + 2, 'door');
  };
  building(6, 20, 5, true);
  building(17, 21, 5, false);
  rect(7, 23, 3, 2, 'path');
  rect(19, 24, 1, 2, 'path');
  rect(29, 4, 6, 1, 'fence');
  rect(29, 4, 1, 4, 'fence');
  rect(34, 4, 1, 4, 'fence');
  rect(30, 5, 4, 3, 'path');
  set(11, 25, 'sign'); set(16, 17, 'sign'); set(30, 9, 'sign'); set(26, 24, 'sign');
  [[7,9],[10,7],[24,10],[27,11],[33,12],[9,19],[18,7],[36,27],[25,28]].forEach(([x,y]) => set(x,y,'stone'));
  return map;
}

export class PocketGame {
  constructor(canvas, { onUpdate = () => {}, onSound = () => {} } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = 320;
    canvas.height = 288;
    this.ctx.imageSmoothingEnabled = false;
    this.onUpdate = onUpdate;
    this.onSound = onSound;
    this.map = makeMap();
    this.npcs = [
      { x: 8, y: 23, kind: 'healer', name: '护理员' },
      { x: 14, y: 24, kind: 'professor', name: '林间博士' },
      { x: 31, y: 6, kind: 'warden', name: '守林人' },
      { x: 18, y: 26, kind: 'villager', name: '旅行者' },
    ];
    this.raf = null;
    this.destroyed = false;
    this.lastMove = -1000;
    this.lastUpdate = 0;
    this.sessionStarted = Date.now();
    this.paused = false;
    this.dialog = null;
    this.battle = null;
    this.panel = null;
    this.restore();
    this.publish();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    if (!this.loaded) this.showDialog([
      '欢迎来到苔野镇！你的苔芽兽已经准备好出发。',
      '方向键移动，A 键交谈。走进高草，寻找并捕获 3 种野生精灵。',
      '北方守林人等待你的挑战。镇上十字诊所可免费治疗、补充道具。',
    ]);
  }

  defaultData() {
    return { x: 14, y: 26, direction: 'up', party: [makeCreature('moss', 5)], active: 0,
      balls: 8, potions: 4, collection: ['moss'], caught: [], wins: 0, badge: false,
      steps: 0, grassSteps: 0, playTime: 0 };
  }

  restore() {
    this.data = this.defaultData();
    this.loaded = false;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || saved.version !== VERSION || !saved.data || !Array.isArray(saved.data.party)) return;
      const d = saved.data;
      const party = d.party.filter(p => p && IDS.includes(p.id)).slice(0, 6).map(p => {
        const level = validInt(p.level, 5, 2, 30);
        const next = makeCreature(p.id, level);
        next.hp = validInt(p.hp, next.maxHp, 0, next.maxHp);
        next.xp = validInt(p.xp, 0, 0, level * 3 - 1);
        return next;
      });
      if (!party.length) return;
      this.data = {
        x: validInt(d.x, 14, 2, W - 3), y: validInt(d.y, 26, 2, H - 3),
        direction: ['up', 'down', 'left', 'right'].includes(d.direction) ? d.direction : 'up',
        party, active: validInt(d.active, 0, 0, party.length - 1),
        balls: validInt(d.balls, 8, 0, 99), potions: validInt(d.potions, 4, 0, 99),
        collection: [...new Set(['moss', ...party.map(p => p.id), ...(Array.isArray(d.collection) ? d.collection.filter(id => IDS.includes(id)) : [])])],
        caught: [...new Set(Array.isArray(d.caught) ? d.caught.filter(id => IDS.includes(id)) : [])],
        wins: validInt(d.wins, 0), badge: d.badge === true, steps: validInt(d.steps, 0, 0, 999999),
        grassSteps: 0, playTime: validInt(d.playTime, 0, 0, 9999999),
      };
      if (!this.canWalk(this.data.x, this.data.y)) { this.data.x = 14; this.data.y = 26; }
      if (!party.some(p => p.hp > 0)) {
        this.data.party.forEach(p => p.hp = p.maxHp);
        this.data.x = 14; this.data.y = 26;
      }
      if (!this.data.party[this.data.active].hp) this.data.active = party.findIndex(p => p.hp > 0);
      this.loaded = true;
    } catch { /* A corrupt or unavailable save starts a fresh, playable game. */ }
  }

  get playTime() { return this.data.playTime + Math.floor((Date.now() - this.sessionStarted) / 1000); }
  get active() { return this.data.party[this.data.active]; }
  get zone() {
    const { x, y } = this.data;
    if (y >= 20 && x < 24) return '苔野镇';
    if (y <= 8 && x >= 29) return '守林高台';
    if (y < 10) return '月影林地';
    if (x >= 24) return '涟漪湖畔';
    if (x >= 17) return '微光草原';
    return '青苔小径';
  }
  getState() {
    return { party: this.data.party.map(p => ({ ...p })), zone: this.zone,
      objective: this.data.badge ? '徽章已获得 · 继续收集全部 6 种精灵' : this.data.caught.length >= 3 ? '前往东北高台，挑战守林人' : `捕获 3 种野生精灵 · ${this.data.caught.length}/3`,
      balls: this.data.balls, potions: this.data.potions, collection: [...this.data.collection],
      wins: this.data.wins, badge: this.data.badge, steps: this.data.steps,
      paused: this.paused, mode: this.paused ? 'paused' : this.battle ? 'battle' : this.dialog ? 'dialogue' : this.panel ? this.panel.type : 'world',
      playTime: this.playTime, caught: [...this.data.caught], active: this.data.active,
    };
  }
  publish() { if (!this.destroyed) this.onUpdate(this.getState()); }
  sound(name) { try { this.onSound(name); } catch { /* Sound never blocks gameplay. */ } }
  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ version: VERSION, data: { ...this.data, playTime: this.playTime } }));
      this.publish();
      return true;
    } catch { return false; }
  }
  newGame() {
    this.data = this.defaultData(); this.sessionStarted = Date.now(); this.battle = null; this.panel = null;
    this.dialog = null; this.paused = false; this.save();
    this.showDialog(['新的旅程开始了！高草中藏着野生精灵。', '先捕获 3 种精灵，再到东北方挑战守林人。']);
  }
  setPaused(paused) { this.paused = Boolean(paused); this.publish(); this.render(); }
  destroy() { this.save(); this.destroyed = true; if (this.raf !== null) cancelAnimationFrame(this.raf); }

  showDialog(pages, after = null) {
    this.dialog = { pages: Array.isArray(pages) ? [...pages] : [pages], after };
    this.publish();
  }
  input(action) {
    if (this.destroyed || !['up','down','left','right','a','b','start','select'].includes(action)) return;
    if (this.paused) { if (action === 'start' || action === 'a' || action === 'b') this.setPaused(false); return; }
    if (this.dialog) {
      if (action === 'a' || action === 'b' || action === 'start') {
        this.sound('confirm');
        this.dialog.pages.shift();
        if (!this.dialog.pages.length) { const after = this.dialog.after; this.dialog = null; if (after) after(); }
        this.publish();
      }
      return;
    }
    if (this.battle) { this.battleInput(action); return; }
    if (this.panel) { this.panelInput(action); return; }
    if (action === 'start') { this.panel = { type: 'menu', cursor: 0 }; this.sound('confirm'); this.publish(); return; }
    if (action === 'select') { this.panel = { type: 'collection', cursor: 0 }; this.sound('confirm'); this.publish(); return; }
    if (action === 'a') { this.interact(); return; }
    if (action === 'b') { this.showDialog(['当前目标：' + this.getState().objective, '镇上诊所在西边。沿中央小径向北，再向东，可到守林高台。']); return; }
    this.move(action);
  }

  canWalk(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    if (['tree','water','roof','wall','clinic','window','fence','stone','sign'].includes(this.map[y][x])) return false;
    return !this.npcs.some(n => n.x === x && n.y === y);
  }
  move(direction) {
    const now = performance.now();
    if (now - this.lastMove < 90) return;
    this.lastMove = now;
    const delta = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] }[direction];
    this.data.direction = direction;
    const x = this.data.x + delta[0], y = this.data.y + delta[1];
    if (!this.canWalk(x, y)) { this.publish(); return; }
    this.data.x = x; this.data.y = y; this.data.steps++;
    if (this.data.steps % 2 === 0) this.sound('move');
    if (this.map[y][x] === 'tallGrass') {
      this.data.grassSteps++;
      if (this.data.grassSteps >= 10 || (this.data.grassSteps >= 3 && Math.random() < .27)) {
        this.data.grassSteps = 0; this.startWild();
      }
    }
    if (this.data.steps % 12 === 0) this.save();
    this.publish();
  }
  interact() {
    const [dx,dy] = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] }[this.data.direction];
    const x = this.data.x + dx, y = this.data.y + dy;
    let npc = this.npcs.find(n => n.x === x && n.y === y);
    if (!npc) npc = this.npcs.find(n => Math.abs(n.x - this.data.x) + Math.abs(n.y - this.data.y) === 1);
    this.sound('confirm');
    if (npc?.kind === 'healer' || (this.map[y]?.[x] === 'door' && x === 8)) { this.heal(); return; }
    if (npc?.kind === 'professor' || (this.map[y]?.[x] === 'door' && x === 19)) {
      this.showDialog(this.data.badge ? ['你获得了苔野徽章！这片林地永远欢迎你。', `精灵图鉴：${this.data.collection.length}/6。湖畔有泡泡獭，月影林地有岩团龟。`] : ['观察、战斗、捕获，成为伙伴！先把野生精灵的体力削弱，再投精灵球。', `已捕获 ${this.data.caught.length}/3 种野生精灵。中央路向北，再向东，通往守林高台。`, '草克水，水克火，火克草。切换伙伴可以扭转战局。']); return;
    }
    if (npc?.kind === 'warden') {
      if (this.data.caught.length < 3) this.showDialog([`想要挑战我，需要先捕获 3 种野生精灵。你已经完成 ${this.data.caught.length}/3。`, '青苔小径、微光草原和涟漪湖畔，都有不同的伙伴。']);
      else this.showDialog(this.data.badge ? ['又见面了，苔野徽章持有者！来一场友谊赛吧。'] : ['你与精灵的默契，已经传遍林地。', '让我看看你们的力量！赢得挑战，即可获得苔野徽章。'], () => this.startBoss());
      return;
    }
    if (npc) { this.showDialog(['诊所会免费补满体力，并补足 8 个球、4 瓶药水。', '按 START 查看队伍和背包；SELECT 打开图鉴。战斗时 A 确认，B 返回。']); return; }
    if (this.map[y]?.[x] === 'sign') {
      if (x === 11) this.showDialog(['苔野镇 · MOSSVALE', '← 诊所　↑ 青苔小径　→ 涟漪湖畔']);
      else if (x === 16) this.showDialog(['原野告示：高草中会遇到野生精灵。', '西侧：苔芽兽、月翅蛾。东侧：炭尾狐、闪电鼠。']);
      else if (x === 30) this.showDialog(['守林高台 · WARDEN', '完成 3 种野生精灵捕获后，可挑战苔野徽章。']);
      else this.showDialog(['涟漪湖畔 · RIPPLE LAKE', '水边的高草里，常常能发现泡泡獭。']);
      return;
    }
    this.showDialog(['附近没有可以交谈的人。面向人物或告示牌，按 A 互动。']);
  }
  heal() {
    this.data.party.forEach(p => p.hp = p.maxHp);
    this.data.balls = Math.max(8, this.data.balls); this.data.potions = Math.max(4, this.data.potions);
    this.data.active = 0;
    this.sound('heal'); this.save();
    this.showDialog(['欢迎来到苔野诊所！所有伙伴的体力已经恢复。', '精灵球补足到 8 个，药水补足到 4 瓶。继续你的冒险吧！']);
  }

  panelInput(action) {
    const p = this.panel;
    if (action === 'b' || action === 'start' || (action === 'select' && p.type === 'collection')) {
      this.panel = null; this.sound('confirm'); this.publish(); return;
    }
    const max = p.type === 'menu' ? 5 : p.type === 'party' ? this.data.party.length : 0;
    if (['up','down'].includes(action) && max) { p.cursor = (p.cursor + (action === 'up' ? -1 : 1) + max) % max; this.sound('cursor'); }
    if (action === 'a') {
      this.sound('confirm');
      if (p.type === 'menu') {
        if (p.cursor === 0) this.panel = { type: 'party', cursor: this.data.active };
        if (p.cursor === 1) this.panel = { type: 'bag', cursor: 0 };
        if (p.cursor === 2) this.panel = { type: 'collection', cursor: 0 };
        if (p.cursor === 3) { const ok = this.save(); this.panel = null; this.showDialog([ok ? '记录已保存。下次打开将继续旅程。' : '浏览器暂时无法保存记录，当前旅程仍可继续。']); }
        if (p.cursor === 4) this.panel = { type: 'help', cursor: 0 };
      } else if (p.type === 'party') {
        if (this.data.party[p.cursor].hp > 0) { this.data.active = p.cursor; this.save(); }
      } else if (p.type === 'bag') {
        if (this.data.potions > 0 && this.active.hp < this.active.maxHp && this.active.hp > 0) {
          this.data.potions--; this.active.hp = Math.min(this.active.maxHp, this.active.hp + 24);
          this.sound('heal'); this.save();
        }
      }
    }
    this.publish();
  }

  startWild() {
    const { x, y } = this.data;
    let choices = x >= 24 && y >= 20 ? ['bubble','bubble','spark'] : y < 10 ? ['stone','moth','spark'] : x >= 17 ? ['ember','spark','ember'] : ['moss','moth','moss'];
    const id = choices[Math.floor(Math.random() * choices.length)];
    const level = y < 10 ? 6 : 3 + Math.floor(Math.random() * 3);
    this.startBattle(makeCreature(id, level), false);
  }
  startBoss() { this.startBattle(makeCreature('stone', 8), true); }
  startBattle(enemy, boss) {
    if (!this.active.hp) this.data.active = this.data.party.findIndex(p => p.hp > 0);
    if (this.data.active < 0) { this.recover(); return; }
    this.battle = { enemy, boss, cursor: 0, messages: [], after: null, skills: 3, turn: 0, choosingParty: false, partyCursor: this.data.active, flashUntil: 0 };
    this.sound('encounter');
    this.sayBattle([boss ? '守林人派出了岩团龟！' : `野生的${enemy.name}出现了！`]);
    this.publish();
  }
  sayBattle(messages, after = null) { this.battle.messages = [...messages]; this.battle.after = after; }
  battleInput(action) {
    const battle = this.battle;
    if (battle.messages.length) {
      if (action === 'a' || action === 'b') {
        battle.messages.shift(); this.sound('confirm');
        if (!battle.messages.length) { const after = battle.after; battle.after = null; if (after) after(); }
        this.publish();
      }
      return;
    }
    if (battle.choosingParty) {
      if (action === 'b') battle.choosingParty = false;
      if (action === 'up' || action === 'down') battle.partyCursor = (battle.partyCursor + (action === 'up' ? -1 : 1) + this.data.party.length) % this.data.party.length;
      if (action === 'a') {
        const target = this.data.party[battle.partyCursor];
        if (target.hp <= 0) this.sayBattle(['这位伙伴需要先去诊所恢复。']);
        else if (battle.partyCursor === this.data.active) { battle.choosingParty = false; }
        else { this.data.active = battle.partyCursor; battle.choosingParty = false; this.enemyTurn([`去吧，${this.active.name}！`]); }
      }
      this.publish(); return;
    }
    if (action === 'left') battle.cursor = (battle.cursor + 5) % 6;
    if (action === 'right') battle.cursor = (battle.cursor + 1) % 6;
    if (action === 'up' || action === 'down') battle.cursor = (battle.cursor + 3) % 6;
    if (action === 'b') battle.cursor = 5;
    if (action === 'a') this.battleAction(battle.cursor);
    else if (['left','right','up','down'].includes(action)) this.sound('cursor');
    this.publish();
  }
  damage(attacker, defender, skill = false) {
    const info = SPECIES[attacker.id];
    const multiplier = info.strong === defender.type ? 1.5 : info.weak === defender.type ? .7 : 1;
    return { amount: Math.max(2, Math.floor((info.power + attacker.level * .7 + (skill ? 5 : 0) + Math.random() * 3 - 2) * multiplier)), multiplier };
  }
  battleAction(action) {
    const b = this.battle;
    if (action === 0 || action === 1) {
      const skill = action === 1;
      if (skill && b.skills <= 0) { this.sayBattle(['本场特技次数已用完。普通攻击仍可使用！']); return; }
      if (skill) b.skills--;
      const hit = this.damage(this.active, b.enemy, skill);
      b.enemy.hp = Math.max(0, b.enemy.hp - hit.amount);
      this.sound('hit'); b.flashUntil = performance.now() + 180;
      const messages = [`${this.active.name}使出${skill ? SPECIES[this.active.id].skill : '撞击'}！造成 ${hit.amount} 点伤害。`];
      if (hit.multiplier > 1) messages.push('属性克制，效果出众！');
      if (b.enemy.hp <= 0) { this.winBattle(messages); return; }
      this.enemyTurn(messages); return;
    }
    if (action === 2) { this.throwBall(); return; }
    if (action === 3) {
      if (this.data.potions <= 0) { this.sayBattle(['药水用完了。镇上诊所可以免费补给。']); return; }
      if (this.active.hp === this.active.maxHp) { this.sayBattle(['当前伙伴体力充足，暂时不需要药水。']); return; }
      this.data.potions--; const before = this.active.hp;
      this.active.hp = Math.min(this.active.maxHp, this.active.hp + 24); this.sound('heal');
      this.enemyTurn([`${this.active.name}恢复了 ${this.active.hp - before} 点体力。`]); return;
    }
    if (action === 4) { b.choosingParty = true; b.partyCursor = this.data.active; return; }
    this.sound('confirm');
    this.sayBattle([b.boss ? '你暂时退出了挑战。准备好后，随时再来！' : '成功离开了战斗。'], () => this.endBattle());
  }
  throwBall() {
    const b = this.battle;
    if (b.boss) { this.sayBattle(['守林人的伙伴不能捕获。用你的伙伴赢得挑战吧！']); return; }
    if (this.data.balls <= 0) { this.sayBattle(['精灵球用完了。返回镇上诊所可以补给。']); return; }
    this.data.balls--; this.sound('throw');
    const hpRatio = b.enemy.hp / b.enemy.maxHp;
    const chance = hpRatio <= .35 ? 1 : hpRatio <= .6 ? .85 : .42;
    if (Math.random() < chance) {
      const enemy = { ...b.enemy };
      const isNew = !this.data.caught.includes(enemy.id);
      if (!this.data.collection.includes(enemy.id)) this.data.collection.push(enemy.id);
      if (isNew) this.data.caught.push(enemy.id);
      const messages = [`摇晃……叮！成功捕获${enemy.name}！`];
      if (this.data.party.length < 6) { enemy.hp = enemy.maxHp; this.data.party.push(enemy); messages.push(`${enemy.name}加入队伍。体力已恢复！`); }
      else messages.push('队伍已满，这位伙伴已记录在精灵图鉴中。');
      messages.push(isNew ? `野生精灵收集进度：${this.data.caught.length}/3。` : '再次遇到老朋友！图鉴记录已更新。');
      if (isNew && this.data.caught.length === 3 && !this.data.badge) messages.push('挑战条件达成！沿小径向北、再向东，寻找守林人。');
      this.sound('catch'); this.save(); this.sayBattle(messages, () => this.endBattle());
    } else this.enemyTurn([`${b.enemy.name}挣脱了！削弱体力后更容易捕获。`]);
  }
  enemyTurn(messages) {
    const b = this.battle;
    b.turn++;
    const hit = this.damage(b.enemy, this.active, b.boss && b.turn % 3 === 0);
    const damage = b.boss ? hit.amount : Math.max(2, Math.floor(hit.amount * .7));
    this.active.hp = Math.max(0, this.active.hp - damage);
    messages.push(`${b.enemy.name}反击，${this.active.name}受到 ${damage} 点伤害。`);
    if (!this.active.hp) {
      messages.push(`${this.active.name}暂时失去了战斗能力。`);
      const next = this.data.party.findIndex(p => p.hp > 0);
      if (next < 0) {
        this.sayBattle([...messages, '伙伴们需要休息了。护理员送你回到诊所。'], () => this.recover());
      } else {
        this.data.active = next;
        messages.push(`接下来交给${this.active.name}！`);
        this.sayBattle(messages);
      }
    } else this.sayBattle(messages);
    this.save();
  }
  winBattle(messages) {
    const b = this.battle;
    this.data.wins++;
    messages.push(`${b.enemy.name}失去了战斗能力。你获胜了！`);
    this.active.xp += b.boss ? 15 : 7;
    while (this.active.xp >= this.active.level * 3 && this.active.level < 30) {
      this.active.xp -= this.active.level * 3;
      this.active.level++; this.active.maxHp += 3; this.active.hp = Math.min(this.active.maxHp, this.active.hp + 9);
      messages.push(`${this.active.name}升到了 Lv.${this.active.level}！体力与力量提升。`);
    }
    if (b.boss) {
      if (!this.data.badge) {
        this.data.badge = true;
        messages.push('守林人：这就是伙伴之间的信任。苔野徽章属于你！', '冒险目标完成！你仍可以探索原野，收集全部 6 种精灵。');
      } else messages.push('守林人：精彩的对战！欢迎随时再来。');
      this.data.party.forEach(p => p.hp = p.maxHp);
      this.data.balls += 3; this.data.potions += 2;
    }
    this.sound('win'); this.save(); this.sayBattle(messages, () => this.endBattle());
  }
  recover() {
    this.battle = null; this.data.x = 8; this.data.y = 24; this.data.direction = 'up';
    this.data.party.forEach(p => p.hp = p.maxHp); this.data.active = 0;
    this.data.balls = Math.max(this.data.balls, 8); this.data.potions = Math.max(this.data.potions, 4);
    this.save(); this.showDialog(['伙伴们已经完全恢复，道具也补充好了。', '旅行中遇到挫折很正常。换个伙伴、巧用药水，再试一次吧！']);
  }
  endBattle() { this.battle = null; this.lastMove = performance.now(); this.save(); this.publish(); }

  loop(time) {
    if (this.destroyed) return;
    this.render(time);
    if (time - this.lastUpdate > 1000) { this.lastUpdate = time; this.publish(); }
    this.raf = requestAnimationFrame(this.loop);
  }
  text(text, x, y, size = 12, color = 3, align = 'left') {
    const ctx = this.ctx;
    ctx.font = `${size}px "Zpix", "Microsoft YaHei", "PingFang SC", monospace`;
    ctx.fillStyle = COLORS[color]; ctx.textAlign = align; ctx.textBaseline = 'top';
    ctx.fillText(text, Math.round(x), Math.round(y));
    ctx.textAlign = 'left';
  }
  box(x, y, width, height, fill = 0) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS[3]; ctx.fillRect(x, y, width, height);
    ctx.fillStyle = COLORS[fill]; ctx.fillRect(x + 2, y + 2, width - 4, height - 4);
    ctx.strokeStyle = COLORS[2]; ctx.lineWidth = 1; ctx.strokeRect(x + 4.5, y + 4.5, width - 9, height - 9);
  }
  wrapped(text, x, y, width, size = 12, lineHeight = 18, maxLines = 10) {
    let line = '', row = 0;
    for (const ch of String(text)) {
      const candidate = line + ch;
      this.ctx.font = `${size}px "Zpix", "Microsoft YaHei", "PingFang SC", monospace`;
      if (ch === '\n' || this.ctx.measureText(candidate).width > width) {
        this.text(line, x, y + row * lineHeight, size); row++; line = ch === '\n' ? '' : ch;
        if (row >= maxLines) return;
      } else line = candidate;
    }
    if (row < maxLines) this.text(line, x, y + row * lineHeight, size);
  }
  hpBar(x, y, width, hp, maxHp) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS[3]; ctx.fillRect(x, y, width, 5);
    ctx.fillStyle = COLORS[0]; ctx.fillRect(x + 1, y + 1, width - 2, 3);
    ctx.fillStyle = COLORS[hp / maxHp > .3 ? 2 : 3]; ctx.fillRect(x + 1, y + 1, Math.ceil((width - 2) * hp / maxHp), 3);
  }
  render(time = performance.now()) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS[0]; ctx.fillRect(0, 0, 320, 288);
    if (this.battle) this.renderBattle(time); else this.renderWorld(time);
    if (this.panel) this.renderPanel(time);
    if (this.dialog) {
      this.box(5, 200, 310, 83);
      this.wrapped(this.dialog.pages[0], 16, 212, 286, 12, 18, 3);
      this.text('A 继续  ▾', 302, 265, 10, 2, 'right');
    }
    if (this.paused) {
      ctx.fillStyle = COLORS[3]; ctx.fillRect(0, 0, 320, 288);
      this.box(38, 95, 244, 94);
      this.text('PAUSED', 160, 112, 20, 3, 'center');
      this.text('按 START / A 继续冒险', 160, 153, 11, 2, 'center');
    }
  }
  renderWorld(time) {
    const ctx = this.ctx;
    const frame = Math.floor(time / 220);
    const left = clamp(this.data.x - 10, 0, W - 20);
    const top = clamp(this.data.y - 7, 0, H - 14);
    for (let row = 0; row < 14; row++) for (let col = 0; col < 20; col++) {
      drawTile(ctx, this.map[top + row][left + col], col * TILE, 24 + row * TILE, TILE, frame);
    }
    for (const npc of this.npcs) {
      if (npc.x >= left && npc.x < left + 20 && npc.y >= top && npc.y < top + 14) {
        drawNPC(ctx, (npc.x - left) * TILE, 24 + (npc.y - top) * TILE, TILE, npc.kind, frame);
        if (npc.kind === 'warden' && this.data.caught.length >= 3 && !this.data.badge) this.text('!', (npc.x - left) * TILE + 6, 13 + (npc.y - top) * TILE, 12);
        if (npc.kind === 'healer') { this.text('+', (npc.x - left) * TILE + 5, 15 + (npc.y - top) * TILE, 9); }
      }
    }
    drawPlayer(ctx, (this.data.x - left) * TILE, 24 + (this.data.y - top) * TILE, TILE, this.data.direction, this.data.steps % 2);
    ctx.fillStyle = COLORS[3]; ctx.fillRect(0, 0, 320, 24);
    this.text(this.zone, 10, 6, 12, 0);
    this.text(this.data.badge ? '◆ 苔野徽章' : `FIELD ${this.data.caught.length}/3`, 310, 7, 10, 0, 'right');
    ctx.fillStyle = COLORS[0]; ctx.fillRect(0, 248, 320, 40);
    ctx.fillStyle = COLORS[3]; ctx.fillRect(0, 248, 320, 2);
    this.text('A 交谈   START 菜单   SELECT 图鉴', 10, 256, 10, 3);
    this.text(this.getState().objective, 10, 273, 9, 2);
  }
  renderBattle(time) {
    const ctx = this.ctx, b = this.battle, p = this.active, e = b.enemy;
    const frame = Math.floor(time / 250);
    ctx.fillStyle = COLORS[3]; ctx.fillRect(0, 0, 320, 24);
    this.text(b.boss ? 'WARDEN · 守林挑战' : 'WILD · 原野遭遇', 10, 7, 11, 0);
    this.text(b.boss ? '◆' : '◇', 306, 5, 14, 0, 'right');
    ctx.fillStyle = COLORS[1];
    ctx.beginPath(); ctx.ellipse(249, 118, 57, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(72, 196, 66, 12, 0, 0, Math.PI * 2); ctx.fill();
    drawCreature(ctx, e.id, 216, 50 + (frame % 2), 2, false, frame);
    drawCreature(ctx, p.id, 34, 127 + (frame % 2), 2, true, frame);
    this.box(8, 38, 172, 62);
    this.text(e.name, 18, 48, 13);
    this.text(`Lv.${e.level} ${e.type}`, 166, 50, 10, 2, 'right');
    this.text('HP', 18, 76, 9, 2); this.hpBar(40, 77, 124, e.hp, e.maxHp);
    this.box(151, 135, 161, 64);
    this.text(p.name, 161, 145, 12); this.text(`Lv.${p.level}`, 300, 147, 10, 2, 'right');
    this.hpBar(162, 168, 136, p.hp, p.maxHp);
    this.text(`${p.hp}/${p.maxHp}`, 299, 181, 10, 2, 'right');
    if (b.messages.length) {
      this.box(5, 207, 310, 76);
      this.wrapped(b.messages[0], 16, 218, 286, 12, 18, 3);
      this.text('A 继续 ▾', 302, 267, 10, 2, 'right');
      return;
    }
    if (b.choosingParty) {
      this.box(5, 207, 310, 76);
      const pick = this.data.party[b.partyCursor];
      this.text(`‹ ${pick.name} Lv.${pick.level} ›`, 160, 218, 12, 3, 'center');
      this.text(`HP ${pick.hp}/${pick.maxHp}   ${pick.type}属性`, 160, 240, 11, 2, 'center');
      this.text('↑↓ 选择    A 换上    B 返回', 160, 264, 10, 2, 'center');
      return;
    }
    const labels = ['撞击', `特技 ${b.skills}/3`, `精灵球 ×${this.data.balls}`, `药水 ×${this.data.potions}`, '切换伙伴', '离开战斗'];
    this.box(5, 207, 310, 76);
    for (let i = 0; i < 6; i++) {
      const x = 13 + (i % 3) * 102, y = 216 + Math.floor(i / 3) * 26;
      if (b.cursor === i) { ctx.fillStyle = COLORS[3]; ctx.fillRect(x - 2, y - 2, 97, 23); }
      this.text((b.cursor === i ? '› ' : '  ') + labels[i], x, y + 3, 10, b.cursor === i ? 0 : 3);
    }
    this.text('方向键选择 · A 确认 · B 逃离', 160, 270, 9, 2, 'center');
  }
  renderPanel(time) {
    const p = this.panel, ctx = this.ctx;
    ctx.fillStyle = COLORS[3]; ctx.fillRect(0, 24, 320, 264);
    this.box(16, 34, 288, 240);
    const titles = { menu: '旅人手册 / FIELD NOTES', party: '伙伴队伍 / PARTY', bag: '旅行背包 / BAG', collection: '精灵图鉴 / FIELD GUIDE', help: '操作指南 / HOW TO PLAY' };
    this.text(titles[p.type], 30, 49, 12);
    ctx.fillStyle = COLORS[2]; ctx.fillRect(30, 71, 260, 1);
    if (p.type === 'menu') {
      ['伙伴队伍', '旅行背包', '精灵图鉴', '保存记录', '操作指南'].forEach((name, i) => {
        if (i === p.cursor) { ctx.fillStyle = COLORS[1]; ctx.fillRect(29, 84 + i * 29, 262, 25); }
        this.text((i === p.cursor ? '› ' : '  ') + name, 42, 89 + i * 29, 13);
      });
    } else if (p.type === 'party') {
      this.data.party.forEach((item, i) => {
        const y = 80 + i * 27;
        if (i === p.cursor) { ctx.fillStyle = COLORS[1]; ctx.fillRect(29, y, 262, 25); }
        this.text(i === this.data.active ? '◆' : '◇', 35, y + 5, 10);
        this.text(item.name, 54, y + 5, 12);
        this.text(`L${item.level}`, 142, y + 7, 9, 2);
        this.hpBar(173, y + 6, 53, item.hp, item.maxHp);
        this.text(`${item.hp}/${item.maxHp}`, 282, y + 5, 10, 2, 'right');
      });
      this.text('↑↓ 选择  A 设为首发  B 返回', 160, 249, 10, 2, 'center');
    } else if (p.type === 'bag') {
      this.text(`精灵球       × ${this.data.balls}`, 44, 91, 15);
      this.wrapped('战斗中使用，体力越低越容易捕获。', 44, 121, 232, 11, 17);
      this.text(`恢复药水     × ${this.data.potions}`, 44, 166, 15);
      this.wrapped('恢复 24 点体力。按 A 给首发伙伴使用。', 44, 195, 232, 11, 17);
      this.text('诊所可免费补充道具。  B 返回', 160, 250, 10, 2, 'center');
    } else if (p.type === 'collection') {
      IDS.forEach((id, i) => {
        const x = 31 + (i % 3) * 89, y = 83 + Math.floor(i / 3) * 78;
        const found = this.data.collection.includes(id);
        if (found) drawCreature(ctx, id, x + 24, y, 1, false, Math.floor(time / 400));
        else this.text('?', x + 40, y + 4, 29, 2, 'center');
        this.text(found ? SPECIES[id].name : '未发现', x + 40, y + 42, 10, found ? 3 : 2, 'center');
        this.text(found ? SPECIES[id].type + '属性' : '???', x + 40, y + 57, 8, 2, 'center');
      });
      this.text(`已记录 ${this.data.collection.length}/6    SELECT / B 返回`, 160, 250, 10, 2, 'center');
    } else {
      const lines = ['方向键：移动 / 选择', 'A：交谈 / 确认    B：返回', 'START：菜单    SELECT：图鉴', '', '高草遇敌，削弱后投球。', '捕获 3 种，再挑战东北守林人。', '诊所：免费治疗并补充道具。', '战斗失败会安全回到镇上。'];
      lines.forEach((line, i) => this.text(line, 33, 85 + i * 19, 11, i > 3 ? 2 : 3));
      this.text('B 返回 · 旅程会自动保存', 160, 250, 10, 2, 'center');
    }
    if (p.type === 'menu') this.text('↑↓ 选择   A 确认   B 返回', 160, 250, 10, 2, 'center');
  }
}

export { SPECIES, SAVE_KEY };


