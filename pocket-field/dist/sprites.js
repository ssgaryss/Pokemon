// Original four-ink pixel art for Pocket Field. Every mark lands on a pixel.
export const PALETTE = ['#263b28', '#526b36', '#91a65a', '#c4d18a'];

const INK = PALETTE;
const creatureCache = new Map();

function raster(width = 32, height = 32) {
  const pixels = new Int8Array(width * height).fill(-1);
  const put = (x, y, c) => {
    x |= 0; y |= 0;
    if (x >= 0 && y >= 0 && x < width && y < height) pixels[y * width + x] = c;
  };
  const rect = (x, y, w, h, c) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, c);
  };
  const ellipse = (x, y, w, h, c) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      const dx = (xx + .5 - x - w / 2) / (w / 2);
      const dy = (yy + .5 - y - h / 2) / (h / 2);
      if (dx * dx + dy * dy <= 1) put(xx, yy, c);
    }
  };
  const poly = (points, c) => {
    const minX = Math.floor(Math.min(...points.map(p => p[0])));
    const maxX = Math.ceil(Math.max(...points.map(p => p[0])));
    const minY = Math.floor(Math.min(...points.map(p => p[1])));
    const maxY = Math.ceil(Math.max(...points.map(p => p[1])));
    for (let yy = minY; yy <= maxY; yy++) for (let xx = minX; xx <= maxX; xx++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i]; const [xj, yj] = points[j];
        if ((yi > yy + .5) !== (yj > yy + .5) && xx + .5 < (xj - xi) * (yy + .5 - yi) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) put(xx, yy, c);
    }
  };
  const outline = () => {
    const copy = pixels.slice();
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (copy[y * width + x] !== -1) continue;
      if ((x > 0 && copy[y * width + x - 1] >= 0) || (x + 1 < width && copy[y * width + x + 1] >= 0) ||
          (y > 0 && copy[(y - 1) * width + x] >= 0) || (y + 1 < height && copy[(y + 1) * width + x] >= 0)) put(x, y, 0);
    }
  };
  return { width, height, pixels, put, rect, ellipse, poly, outline };
}

function paintRaster(ctx, art) {
  for (let c = 0; c < 4; c++) {
    ctx.fillStyle = INK[c];
    for (let y = 0; y < art.height; y++) {
      let x = 0;
      while (x < art.width) {
        if (art.pixels[y * art.width + x] !== c) { x++; continue; }
        const start = x;
        while (x < art.width && art.pixels[y * art.width + x] === c) x++;
        ctx.fillRect(start, y, x - start, 1);
      }
    }
  }
}

function makeCreature(id, back) {
  const a = raster();
  const { rect: r, ellipse: e, poly: p, put } = a;
  if (id === 'ember') {
    // A little fire fox with a lantern-shaped, cream-tipped tail.
    p([[23, 22], [26, 17], [25, 13], [28, 16], [29, 12], [31, 19], [29, 25], [23, 27]], 1);
    p([[26, 19], [27, 16], [29, 18], [30, 16], [30, 21], [27, 23]], 3);
    e(7, 16, 18, 12, 2); e(9, 21, 14, 8, 1);
    r(8, 26, 6, 3, 2); r(19, 26, 5, 3, 2); r(9, 28, 4, 1, 0); r(19, 28, 4, 1, 0);
    p([[6, 13], [5, 3], [8, 3], [13, 9]], 2); p([[19, 9], [24, 3], [26, 4], [25, 14]], 2);
    p([[7, 5], [8, 10], [11, 10]], 0); p([[24, 5], [21, 10], [24, 10]], 0);
    e(6, 8, 20, 16, 2); p([[7, 16], [13, 19], [16, 18], [20, 19], [25, 16], [23, 22], [17, 25], [10, 23]], 3);
    r(10, 11, 4, 2, 3); r(20, 10, 3, 2, 3);
    r(10, 15, 3, 3, 0); r(21, 15, 3, 3, 0); put(10, 15, 3); put(21, 15, 3);
    r(15, 20, 3, 2, 0); r(16, 22, 1, 1, 1);
    p([[13, 24], [17, 26], [20, 24], [18, 28], [15, 28]], 3);
    if (back) { e(8, 10, 16, 13, 2); r(12, 12, 9, 2, 3); p([[11, 21], [16, 25], [21, 21], [19, 25], [13, 25]], 1); }
  } else if (id === 'bubble') {
    // A pond newt with round cheek gills and a curled paddle tail.
    p([[21, 22], [27, 20], [29, 15], [30, 17], [30, 24], [26, 27], [20, 27]], 1);
    p([[27, 22], [29, 20], [28, 25], [25, 26], [24, 24]], 3);
    e(7, 17, 18, 11, 2); e(11, 20, 11, 8, 3);
    e(5, 25, 8, 4, 1); e(20, 25, 7, 4, 1); r(6, 27, 5, 1, 2); r(22, 27, 4, 1, 2);
    p([[8, 10], [4, 6], [3, 9], [6, 13], [2, 13], [3, 16], [7, 18]], 1);
    p([[24, 10], [28, 6], [29, 9], [26, 13], [30, 13], [29, 16], [25, 18]], 1);
    r(4, 8, 2, 2, 3); r(3, 14, 3, 1, 2); r(27, 8, 2, 2, 3); r(27, 14, 3, 1, 2);
    e(6, 7, 21, 16, 2); e(10, 8, 12, 5, 3); e(8, 15, 17, 7, 3);
    r(9, 13, 3, 4, 0); r(21, 13, 3, 4, 0); put(9, 13, 3); put(21, 13, 3);
    r(14, 19, 6, 1, 1); put(13, 18, 1); put(20, 18, 1);
    r(13, 5, 7, 2, 1); r(15, 3, 3, 2, 2); put(16, 3, 3);
    if (back) { e(8, 9, 17, 12, 2); e(12, 10, 9, 4, 3); r(13, 18, 7, 2, 1); r(15, 21, 3, 3, 1); }
  } else if (id === 'spark') {
    // A rabbit with forked, ink-tipped ears and a lightning tail.
    p([[23, 21], [27, 17], [25, 15], [29, 12], [28, 18], [30, 20], [25, 26]], 2);
    r(26, 18, 2, 2, 3);
    e(7, 17, 19, 12, 2); e(12, 20, 10, 8, 3);
    e(6, 26, 8, 4, 1); e(20, 26, 8, 4, 1); r(8, 27, 4, 1, 2); r(22, 27, 4, 1, 2);
    p([[8, 13], [6, 5], [7, 2], [10, 2], [14, 12]], 2);
    p([[18, 12], [20, 2], [23, 1], [25, 3], [23, 13]], 2);
    r(7, 2, 3, 4, 0); r(21, 1, 3, 4, 0); r(9, 6, 2, 5, 3); r(21, 6, 2, 5, 3);
    e(6, 10, 21, 15, 2); e(10, 11, 12, 5, 3);
    r(9, 16, 3, 3, 0); r(21, 16, 3, 3, 0); put(9, 16, 3); put(21, 16, 3);
    r(7, 20, 4, 2, 1); r(23, 20, 3, 2, 1); r(15, 20, 3, 1, 0); put(16, 22, 0);
    p([[15, 25], [19, 24], [17, 27], [20, 27], [15, 29], [16, 26]], 1);
    if (back) { e(8, 12, 17, 11, 2); e(12, 12, 9, 4, 3); p([[15, 18], [19, 18], [17, 21], [20, 21], [15, 25], [16, 21], [13, 21]], 1); }
  } else if (id === 'moth') {
    // Broad patterned wings, small fuzzy body, and fern antennae.
    p([[13, 13], [9, 5], [4, 3], [1, 6], [2, 14], [7, 19], [12, 20]], 2);
    p([[19, 13], [23, 5], [28, 3], [31, 6], [30, 14], [25, 19], [20, 20]], 2);
    p([[12, 18], [6, 17], [3, 22], [5, 28], [10, 29], [15, 23]], 1);
    p([[20, 18], [26, 17], [29, 22], [27, 28], [22, 29], [17, 23]], 1);
    p([[4, 6], [7, 6], [11, 13], [9, 17], [5, 13]], 3);
    p([[28, 6], [25, 6], [21, 13], [23, 17], [27, 13]], 3);
    e(5, 9, 5, 6, 0); e(22, 9, 5, 6, 0); r(6, 10, 2, 3, 2); r(23, 10, 2, 3, 2);
    p([[7, 20], [11, 20], [12, 23], [8, 27], [6, 25]], 2);
    p([[25, 20], [21, 20], [20, 23], [24, 27], [26, 25]], 2);
    r(8, 22, 2, 2, 3); r(22, 22, 2, 2, 3);
    e(12, 10, 8, 17, 1); e(13, 10, 6, 8, 3); r(14, 19, 4, 2, 2); r(14, 23, 4, 1, 2);
    r(13, 13, 2, 3, 0); r(17, 13, 2, 3, 0); put(13, 13, 3); put(17, 13, 3);
    r(13, 7, 1, 4, 1); r(12, 5, 2, 2, 0); r(18, 7, 1, 4, 1); r(18, 5, 2, 2, 0);
    if (back) { e(13, 11, 6, 15, 1); r(14, 12, 4, 3, 2); r(14, 19, 4, 2, 2); }
  } else if (id === 'stone') {
    // A gentle pebble bear with a crystal ridge and faceted shoulders.
    p([[7, 17], [4, 21], [3, 27], [8, 28], [12, 22]], 1);
    p([[24, 17], [28, 21], [29, 27], [24, 28], [20, 22]], 1);
    p([[8, 15], [13, 12], [23, 15], [26, 22], [23, 29], [9, 29], [6, 23]], 2);
    p([[8, 21], [13, 24], [23, 22], [22, 27], [17, 29], [10, 27]], 1);
    r(8, 27, 6, 3, 1); r(19, 27, 6, 3, 1); r(9, 28, 4, 1, 3); r(20, 28, 4, 1, 3);
    e(6, 5, 8, 8, 1); e(20, 5, 8, 8, 1); e(8, 7, 4, 4, 3); e(22, 7, 4, 4, 3);
    p([[7, 11], [11, 7], [22, 7], [27, 12], [26, 20], [21, 24], [12, 24], [7, 19]], 2);
    p([[9, 11], [13, 9], [22, 9], [23, 12], [17, 14], [10, 14]], 3);
    p([[24, 13], [26, 14], [24, 20], [21, 22], [19, 19]], 1);
    r(10, 15, 3, 3, 0); r(21, 15, 3, 3, 0); put(10, 15, 3); put(21, 15, 3);
    e(12, 18, 10, 5, 3); r(15, 19, 4, 2, 0); r(16, 21, 1, 1, 1);
    p([[12, 7], [13, 3], [16, 1], [18, 5], [21, 3], [22, 8]], 1); p([[14, 4], [16, 3], [17, 7], [14, 7]], 3);
    r(9, 22, 2, 2, 3); r(24, 23, 2, 2, 3); r(5, 23, 2, 2, 2);
    if (back) { p([[8, 12], [13, 9], [22, 9], [26, 13], [24, 21], [18, 24], [11, 21]], 2); p([[11, 12], [16, 10], [22, 11], [20, 15], [13, 16]], 3); p([[12, 18], [17, 16], [23, 18], [20, 22], [14, 22]], 1); }
  } else {
    // Sprig-shaped ears, a layered leaf crown, and a plump woodland body.
    p([[8, 19], [3, 17], [2, 13], [7, 13], [11, 18]], 1);
    p([[23, 19], [28, 17], [30, 13], [25, 13], [21, 18]], 1);
    e(7, 16, 18, 13, 2); e(11, 20, 11, 8, 3);
    e(6, 26, 8, 4, 1); e(19, 26, 8, 4, 1); r(7, 27, 4, 1, 2); r(22, 27, 3, 1, 2);
    p([[9, 10], [5, 8], [3, 3], [7, 3], [13, 9]], 2);
    p([[20, 9], [25, 3], [29, 3], [27, 8], [23, 11]], 2);
    p([[5, 4], [9, 7], [11, 10], [8, 8]], 3); p([[27, 4], [23, 8], [22, 10], [25, 8]], 3);
    e(6, 8, 21, 16, 2); e(10, 10, 13, 6, 3);
    p([[7, 11], [10, 6], [14, 6], [16, 3], [20, 6], [25, 7], [26, 11], [21, 14], [17, 11], [13, 14]], 1);
    p([[9, 10], [12, 7], [15, 8], [17, 5], [19, 8], [23, 8], [21, 11], [17, 9], [13, 11]], 2);
    r(10, 16, 3, 4, 0); r(21, 16, 3, 4, 0); put(10, 16, 3); put(21, 16, 3);
    r(8, 20, 3, 1, 1); r(23, 20, 3, 1, 1); r(15, 21, 4, 1, 0); put(14, 20, 0); put(19, 20, 0);
    p([[13, 25], [17, 24], [21, 25], [17, 28]], 1); r(16, 25, 1, 3, 2);
    if (back) { e(8, 13, 17, 10, 2); e(11, 14, 11, 4, 3); p([[11, 20], [16, 18], [22, 20], [17, 25]], 1); p([[13, 20], [17, 20], [17, 23]], 2); }
  }
  a.outline();
  return a;
}

export function drawCreature(ctx, id, x, y, scale = 1, back = false, frame = 0) {
  const key = id + (back ? ':back' : ':front');
  if (!creatureCache.has(key)) creatureCache.set(key, makeCreature(id, back));
  const bounce = Math.floor(frame / 18) % 2;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y - bounce * scale));
  ctx.scale(scale, scale);
  paintRaster(ctx, creatureCache.get(key));
  ctx.restore();
}

// A tile is always contained in its cell; adjoining tiles create larger scenes.
export function drawTile(ctx, type, x, y, size = 16, frame = 0) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(size / 16, size / 16);
  const r = (x1, y1, w, h, c) => { ctx.fillStyle = INK[c]; ctx.fillRect(x1, y1, w, h); };
  const grass = () => { r(0, 0, 16, 16, 2); r(3, 3, 1, 1, 1); r(11, 10, 1, 1, 1); r(7, 14, 2, 1, 3); r(14, 5, 1, 1, 3); };
  const ground = () => { r(0, 0, 16, 16, 3); r(2, 6, 1, 1, 2); r(11, 12, 2, 1, 2); r(14, 3, 1, 1, 2); };
  switch (type) {
    case 'tallgrass': case 'tall_grass': case 'tallGrass': {
      grass();
      for (const [gx, gy] of [[1, 3], [8, 1], [5, 9], [12, 8]]) {
        r(gx, gy + 3, 5, 3, 1); r(gx, gy, 1, 3, 0); r(gx + 2, gy + 1, 1, 3, 0); r(gx + 4, gy - 1, 1, 5, 0);
        r(gx + 1, gy + 3, 1, 2, 3); r(gx + 3, gy + 3, 1, 2, 2); r(gx + 1, gy + 5, 4, 1, 2);
      }
      break;
    }
    case 'path': case 'sand': ground(); break;
    case 'brick': case 'plaza':
      ground(); r(0, 0, 16, 1, 2); r(0, 8, 16, 1, 2); r(0, 0, 1, 8, 2); r(8, 8, 1, 8, 2); break;
    case 'tree':
      grass(); r(6, 11, 4, 5, 0); r(7, 12, 2, 4, 1); r(3, 12, 10, 2, 1);
      r(4, 1, 8, 1, 0); r(2, 2, 12, 2, 0); r(1, 4, 14, 7, 0); r(3, 11, 10, 2, 0);
      r(4, 2, 8, 2, 1); r(2, 4, 12, 6, 1); r(4, 10, 8, 2, 1);
      r(5, 3, 6, 2, 2); r(3, 5, 10, 3, 2); r(5, 8, 3, 2, 2); r(10, 8, 3, 1, 2);
      r(6, 3, 4, 1, 3); r(4, 5, 3, 1, 3); r(10, 5, 1, 1, 3); r(2, 8, 2, 1, 0); r(8, 9, 2, 1, 0); r(12, 7, 2, 1, 0); break;
    case 'water': {
      r(0, 0, 16, 16, 1); const offset = Math.floor(frame / 24) % 2;
      r(1 + offset, 3, 5, 1, 2); r(2 + offset, 4, 3, 1, 2); r(10 - offset, 10, 5, 1, 2); r(11 - offset, 11, 3, 1, 2);
      r(4 + offset, 3, 2, 1, 3); r(13 - offset, 10, 2, 1, 3); r(8, 15, 2, 1, 0); break;
    }
    case 'flowers':
      grass();
      for (const [fx, fy] of [[3, 4], [11, 9], [3, 13]]) {
        r(fx, fy, 1, 3, 0); r(fx - 1, fy + 1, 1, 1, 1); r(fx - 1, fy - 2, 3, 3, 3); r(fx - 2, fy - 1, 5, 1, 3); r(fx, fy - 1, 1, 1, 0);
      }
      break;
    case 'fence':
      grass(); r(0, 5, 16, 2, 0); r(0, 10, 16, 2, 0); r(0, 5, 16, 1, 3); r(0, 10, 16, 1, 3);
      for (const fx of [2, 11]) { r(fx, 3, 3, 11, 0); r(fx + 1, 2, 1, 1, 0); r(fx + 1, 4, 1, 9, 3); }
      break;
    case 'fenceV':
      grass(); r(7, 0, 3, 16, 0); r(8, 0, 1, 16, 3); r(5, 4, 7, 3, 0); r(6, 4, 5, 1, 3); break;
    case 'sign':
      grass(); r(7, 9, 2, 6, 0); r(2, 3, 12, 8, 0); r(3, 4, 10, 6, 3); r(4, 5, 8, 1, 1); r(4, 7, 5, 1, 1); r(11, 8, 1, 1, 2); break;
    case 'roof': case 'roofLeft': case 'roofRight':
      r(0, 0, 16, 16, 1); r(0, 1, 16, 1, 0); r(0, 5, 16, 1, 0); r(0, 9, 16, 1, 0); r(0, 13, 16, 1, 0);
      r(0, 2, 16, 1, 2); r(0, 6, 16, 1, 2); r(0, 10, 16, 1, 2); r(0, 14, 16, 1, 2);
      r(3, 2, 1, 3, 0); r(11, 2, 1, 3, 0); r(7, 6, 1, 3, 0); r(3, 10, 1, 3, 0); r(11, 10, 1, 3, 0); r(7, 14, 1, 2, 0);
      if (type === 'roofLeft') { r(0, 0, 2, 16, 0); r(2, 0, 1, 16, 3); }
      if (type === 'roofRight') { r(14, 0, 2, 16, 0); r(13, 0, 1, 16, 3); }
      break;
    case 'wall': case 'wallLeft': case 'wallRight':
      r(0, 0, 16, 16, 3); r(0, 0, 16, 2, 1); r(0, 13, 16, 3, 1); r(0, 13, 16, 1, 0); r(0, 6, 16, 1, 2); r(0, 11, 16, 1, 2);
      r(4, 2, 1, 4, 2); r(12, 7, 1, 4, 2);
      if (type === 'wallLeft') r(0, 0, 1, 16, 0);
      if (type === 'wallRight') r(15, 0, 1, 16, 0);
      break;
    case 'window':
      r(0, 0, 16, 16, 3); r(2, 2, 12, 11, 0); r(3, 3, 10, 8, 1); r(4, 4, 3, 6, 2); r(9, 4, 3, 6, 2); r(4, 4, 2, 2, 3); r(9, 4, 2, 2, 3); r(1, 13, 14, 2, 1); break;
    case 'door':
      r(0, 0, 16, 16, 3); r(2, 0, 12, 16, 0); r(3, 1, 10, 14, 1); r(4, 2, 8, 6, 2); r(5, 3, 3, 4, 3); r(10, 10, 2, 1, 3); r(1, 15, 14, 1, 2); break;
    case 'clinic': case 'heal':
      r(0, 0, 16, 16, 3); r(0, 0, 16, 2, 1); r(2, 2, 12, 12, 0); r(3, 3, 10, 10, 3); r(6, 4, 4, 8, 1); r(4, 6, 8, 4, 1); r(0, 14, 16, 2, 1); break;
    case 'bridge':
      r(0, 0, 16, 16, 1); r(1, 0, 14, 16, 2); r(2, 0, 1, 16, 3); r(13, 0, 1, 16, 0);
      for (let by = 1; by < 16; by += 4) { r(3, by, 10, 1, 0); r(3, by + 1, 10, 1, 3); }
      r(0, 0, 2, 16, 0); r(14, 0, 2, 16, 0); break;
    case 'stone': case 'rock':
      grass(); r(3, 12, 10, 2, 1); r(5, 4, 6, 1, 0); r(3, 5, 10, 7, 0); r(4, 12, 8, 1, 0); r(5, 5, 6, 1, 3); r(4, 6, 8, 5, 2); r(4, 6, 5, 2, 3); r(10, 8, 2, 3, 1); r(6, 11, 5, 1, 1); break;
    case 'stump':
      grass(); r(4, 5, 8, 9, 0); r(5, 6, 6, 7, 1); r(3, 5, 10, 5, 0); r(4, 5, 8, 4, 3); r(6, 6, 4, 2, 1); r(7, 7, 2, 1, 3); r(6, 10, 1, 3, 2); break;
    default: grass();
  }
  ctx.restore();
}

function makePerson(direction, frame, kind) {
  const a = raster(16, 16);
  const { rect: r, put } = a;
  const step = frame % 2;
  const isNPC = kind !== 'player';
  // Boots and trouser legs remain legible at the native 16-pixel grid.
  r(5, 12, 2, 3 - step, 0); r(9, 12, 2, 2 + step, 0);
  r(4, 15 - step, 3, 1, 0); r(9, 14 + step, 3, 1, 0);
  r(4, 8, 8, 5, 0); r(5, 8, 6, 4, isNPC ? 1 : 2); r(6, 12, 4, 1, 1);
  r(3, 9, 1, 3, 0); r(12, 9, 1, 3, 0); r(3, 11, 1, 1, 3); r(12, 11, 1, 1, 3);
  r(5, 3, 7, 5, 0); r(6, 4, 5, 4, 3);
  if (kind === 'nurse' || kind === 'healer') {
    r(4, 2, 8, 3, 0); r(5, 1, 6, 3, 3); r(7, 1, 2, 3, 1); r(6, 2, 4, 1, 1); r(6, 9, 4, 3, 3);
  } else if (isNPC) {
    r(5, 2, 6, 2, 0); r(4, 3, 2, 5, 0); r(11, 3, 1, 5, 0); r(6, 2, 4, 1, 1); r(6, 9, 4, 1, 3);
  } else {
    r(5, 1, 6, 1, 0); r(4, 2, 8, 3, 0); r(5, 2, 6, 2, 2); r(6, 2, 3, 1, 3); r(3, 4, 9, 1, 0); r(5, 5, 1, 2, 1);
    r(5, 9, 1, 3, 3); r(10, 9, 1, 3, 3);
  }
  if (direction === 'up') {
    r(5, 4, 7, 4, 0); r(6, 5, 5, 2, isNPC ? 1 : 2); r(6, 8, 4, 4, 0); r(7, 9, 3, 2, 2); put(9, 9, 3);
  } else if (direction === 'left') {
    r(5, 5, 6, 3, 3); r(5, 5, 1, 1, 0); r(4, 6, 1, 1, 3); r(10, 5, 2, 3, 1); r(9, 8, 3, 4, 0); r(10, 9, 2, 2, 2);
  } else if (direction === 'right') {
    r(6, 5, 6, 3, 3); r(11, 5, 1, 1, 0); r(12, 6, 1, 1, 3); r(5, 5, 2, 3, 1); r(4, 8, 3, 4, 0); r(4, 9, 2, 2, 2);
  } else {
    r(6, 5, 1, 1, 0); r(10, 5, 1, 1, 0); put(8, 7, 1);
  }
  return a;
}

export function drawPlayer(ctx, x, y, size = 16, direction = 'down', frame = 0) {
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y)); ctx.scale(size / 16, size / 16);
  paintRaster(ctx, makePerson(direction, Math.floor(frame), 'player'));
  ctx.restore();
}

export function drawNPC(ctx, x, y, size = 16, kind = 'villager', frame = 0) {
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y)); ctx.scale(size / 16, size / 16);
  paintRaster(ctx, makePerson('down', Math.floor(frame), kind));
  ctx.restore();
}
