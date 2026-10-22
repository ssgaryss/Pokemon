import test from 'node:test';
import assert from 'node:assert/strict';
import { PocketGame, SPECIES, SAVE_KEY } from './dist/game.js';

const store = new Map();
globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
const context = new Proxy({ measureText: str => ({ width: [...str].length * 10 }) }, { get: (target, key) => key in target ? target[key] : () => {} });
const canvas = () => ({ getContext: () => context });
function fresh() { store.clear(); const game = new PocketGame(canvas()); game.dialog = null; return game; }
function finishMessages(game) { let limit = 50; while ((game.battle?.messages.length || game.dialog) && limit-- > 0) game.input('a'); assert.ok(limit > 0); }
function creature(id, level = 4) { const maxHp = SPECIES[id].base + (level - 5) * 3; return { id, name: SPECIES[id].name, type: SPECIES[id].type, level, maxHp, hp: maxHp, xp: 0 }; }

test('new game supplies a starter, resources and clear objective', () => {
  const game = fresh();
  assert.equal(game.getState().party[0].id, 'moss');
  assert.equal(game.getState().balls, 8);
  assert.equal(game.getState().potions, 4);
  assert.match(game.getState().objective, /0\/3/);
  game.render(1000);
});

test('map routes connect town, all encounter regions and warden', () => {
  const game = fresh();
  const queue = [[14, 26]], seen = new Set(['14,26']);
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
      if (!seen.has(key) && game.canWalk(nx, ny)) { seen.add(key); queue.push([nx, ny]); }
    }
  }
  for (const [x, y] of [[7,12],[19,14],[23,5],[25,23],[31,7],[8,24]]) assert.ok(seen.has(`${x},${y}`), `Unreachable ${x},${y}`);
  assert.ok(!game.canWalk(31, 18), 'Pond collision');
  assert.ok(!game.canWalk(6, 20), 'Building collision');
});

test('weakened captures collect unique species, join party and unlock quest', () => {
  const game = fresh();
  for (const id of ['moth', 'ember', 'bubble']) {
    const enemy = creature(id); enemy.hp = 1;
    game.startBattle(enemy, false); finishMessages(game);
    game.battleAction(2); finishMessages(game);
    assert.equal(game.battle, null);
  }
  assert.equal(game.data.party.length, 4);
  assert.deepEqual(game.data.caught, ['moth','ember','bubble']);
  assert.match(game.getState().objective, /挑战守林人/);
  assert.equal(game.data.balls, 5);
});

test('boss battle cannot be captured and winning grants persistent badge', () => {
  const game = fresh(); game.data.caught = ['moth','ember','bubble'];
  game.startBoss(); finishMessages(game);
  game.battleAction(2); assert.equal(game.data.balls, 8); finishMessages(game);
  game.battle.enemy.hp = 1;
  game.battleAction(0); finishMessages(game);
  assert.equal(game.data.badge, true);
  assert.equal(game.data.wins, 1);
  const restored = new PocketGame(canvas());
  assert.equal(restored.data.badge, true);
  assert.equal(restored.data.wins, 1);
});

test('a team loss recovers at clinic with health and supplies', () => {
  const game = fresh(); game.data.party[0].hp = 1; game.data.balls = 0; game.data.potions = 0;
  game.startBoss(); finishMessages(game);
  game.enemyTurn([]); finishMessages(game);
  assert.equal(game.battle, null);
  assert.equal(game.data.x, 8); assert.equal(game.data.y, 24);
  assert.equal(game.active.hp, game.active.maxHp);
  assert.equal(game.data.balls, 8); assert.equal(game.data.potions, 4);
});

test('party switching, potions, and skill exhaustion remain playable', () => {
  const game = fresh(); game.data.party.push(creature('ember'));
  game.startBattle(creature('stone', 8), false); finishMessages(game);
  game.battle.skills = 0; game.battleAction(1); finishMessages(game);
  assert.equal(game.battle.turn, 0);
  game.battleAction(4); game.input('down'); game.input('a'); finishMessages(game);
  assert.equal(game.active.id, 'ember');
  const before = game.data.potions; game.active.hp = 5;
  game.battleAction(3); finishMessages(game);
  assert.equal(game.data.potions, before - 1);
  assert.ok(game.active.hp > 5);
  game.battleAction(5); finishMessages(game);
  assert.equal(game.battle, null);
});

test('corrupt and malformed storage recovers to valid state', () => {
  store.set(SAVE_KEY, '{broken');
  assert.equal(new PocketGame(canvas()).active.id, 'moss');
  store.set(SAVE_KEY, JSON.stringify({ version: 1, data: { party: [{ id: 'moss', level: -100, hp: NaN }], x: 0, y: 0, balls: -9 } }));
  const game = new PocketGame(canvas());
  assert.equal(game.active.level, 2); assert.equal(game.data.balls, 0);
  assert.ok(game.canWalk(game.data.x, game.data.y));
  assert.ok(game.active.hp > 0);
});

test('all menus, dialogue, battle modes and pause render without errors', () => {
  const game = fresh();
  for (const type of ['menu','party','bag','collection','help']) { game.panel = { type, cursor: 0 }; game.render(1500); }
  game.panel = null; game.showDialog(['test']); game.render(1600); game.dialog = null;
  game.startBoss(); game.render(1700); finishMessages(game); game.render(1800);
  game.battle.choosingParty = true; game.render(1900);
  game.setPaused(true); game.render(2000); game.input('start'); assert.equal(game.paused, false);
});


test('repeat captures and full parties still register only unique species', () => {
  const game = fresh();
  game.data.party = Array.from({ length: 6 }, () => creature('moss'));
  for (const id of ['moth', 'moth', 'ember', 'bubble']) {
    const enemy = creature(id); enemy.hp = 1;
    game.startBattle(enemy, false); finishMessages(game);
    game.battleAction(2); finishMessages(game);
  }
  assert.equal(game.data.party.length, 6);
  assert.deepEqual(game.data.caught, ['moth', 'ember', 'bubble']);
  assert.equal(game.data.collection.length, 4);
});

test('saving midbattle resumes safely in the world with exact resources and health', () => {
  const game = fresh();
  game.data.x = 7; game.data.y = 12; game.active.hp = 13; game.data.balls = 3; game.data.potions = 2;
  game.startBattle(creature('moth'), false); finishMessages(game);
  assert.equal(game.save(), true);
  const restored = new PocketGame(canvas());
  assert.equal(restored.getState().mode, 'world');
  assert.equal(restored.data.x, 7); assert.equal(restored.data.y, 12);
  assert.equal(restored.active.hp, 13); assert.equal(restored.data.balls, 3); assert.equal(restored.data.potions, 2);
});

test('a fainted lead switches to a living teammate before the next turn', () => {
  const game = fresh(); game.data.party.push(creature('bubble')); game.active.hp = 1;
  game.startBattle(creature('stone', 8), false); finishMessages(game);
  game.enemyTurn([]); finishMessages(game);
  assert.equal(game.data.active, 1); assert.equal(game.active.id, 'bubble'); assert.ok(game.active.hp > 0);
  assert.ok(game.battle);
});

test('the three unique capture requirement prevents an early boss fight', () => {
  const game = fresh(); game.data.x = 31; game.data.y = 7; game.data.direction = 'up';
  game.interact(); assert.equal(game.battle, null); assert.ok(game.dialog); finishMessages(game);
  game.data.caught = ['moth', 'ember', 'bubble']; game.interact(); finishMessages(game);
  assert.equal(game.battle?.boss, true);
});
