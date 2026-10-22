import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(root, 'pocket-field', 'dist');
const read = name => fs.readFile(path.join(dir,name),'utf8');
const [html,css,sprites,game,audio,app] = await Promise.all(['index.html','style.css','sprites.js','game.js','audio.js','app.js'].map(read));
const license = await fs.readFile(path.join(root,'LICENSE'),'utf8');
const stripModule = source => source.replace(/^import .*;\r?\n/gm,'').replace(/^export \{[^}]+\};?\r?\n/gm,'').replace(/^export (?=(?:class|function|const|let)\b)/gm,'');
const js = [
  'const Sprites = (() => {', stripModule(sprites), 'return {PALETTE,drawTile,drawPlayer,drawCreature,drawNPC};})();',
  'const Game = (() => { const {PALETTE,drawTile,drawPlayer,drawCreature,drawNPC} = Sprites;', stripModule(game), 'return {PocketGame};})();',
  'const Audio = (() => {', stripModule(audio), 'return {PocketAudio};})();',
  'const {PocketGame} = Game; const {drawCreature} = Sprites; const {PocketAudio} = Audio;', stripModule(app),
].join('\n');
new vm.Script(js, {filename:'PocketField.inline.js'});
const standalone = html.replace('<!doctype html>',() => `<!doctype html>\n<!--\n${license}\n-->`).replace('href="./"','href="#"').replace('<link rel="stylesheet" href="./style.css">',() => `<style>${css.replace(/^@import .*;\r?\n/m,'')}</style>`).replace('<script type="module" src="./app.js"></script>',() => `<script type="module">${js.replace(/<\/script/gi,'<\\/script')}</script>`);
await fs.writeFile(path.join(root,'PocketField.html'),standalone);
await fs.writeFile(path.join(dir,'LICENSE'),license);
console.log('Offline game ready: '+path.join(root,'PocketField.html'));
