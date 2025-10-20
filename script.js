// Rangoli Generator – Canvas drawing with animated diya
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

// Controls
const layersInput = document.getElementById('layers');
const petalsInput = document.getElementById('petals');
const paletteSelect = document.getElementById('palette');
const designSelect = document.getElementById('design');
const seedInput = document.getElementById('seed');
const diyaPlacementSelect = document.getElementById('diyaPlacement');
const diyaCountInput = document.getElementById('diyaCount');
const nameInput = document.getElementById('nameInput');
const animateCheckbox = document.getElementById('animate');
const randomizeBtn = document.getElementById('randomizeBtn');
const renderBtn = document.getElementById('renderBtn');
const downloadBtn = document.getElementById('downloadBtn');

// Resize for crispness
function resizeCanvas() {
  const wrap = canvas.parentElement;
  const size = Math.floor(Math.min(wrap.clientWidth || 900, 900));
  canvas.width = Math.floor(size * dpr);
  canvas.height = Math.floor(size * dpr);
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); draw(); });

// Palettes
const PALETTES = {
  vivid: ['#ff6b00','#ffd000','#00d084','#00b0ff','#7b61ff','#ff3d7a'],
  warm: ['#ff7b54','#ffb26b','#ffd56b','#939b62','#5d3a00','#e36414'],
  cool: ['#00bcd4','#26c6da','#29b6f6','#7e57c2','#26a69a','#66bb6a'],
  pastel: ['#ffd1dc','#ffe4a7','#c2f0fc','#d0e6a5','#f7b2ad','#c4b7f2']
};

// Utilities
function pick(arr, i) { return arr[i % arr.length]; }
function seededRandom(seed) {
  // xorshift32
  let x = 0;
  if (typeof seed === 'number') x = seed|0; else {
    const s = String(seed || 'rng');
    for (let i = 0; i < s.length; i++) x = ((x << 5) - x + s.charCodeAt(i)) | 0;
  }
  if (x === 0) x = 123456789;
  return function() { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x>>>0) / 0xFFFFFFFF); };
}
function hsla(h,s,l,a) { return `hsla(${h},${s}%,${l}%,${a})`; }

// Petal path (rounded tear shape)
function petalPath(rInner, rOuter, widthFactor) {
  const path = new Path2D();
  const w = (rOuter - rInner) * widthFactor;
  path.moveTo(0, -rOuter);
  path.bezierCurveTo(w, -rOuter * 0.7, w, -rInner * 0.6, 0, -rInner);
  path.bezierCurveTo(-w, -rInner * 0.6, -w, -rOuter * 0.7, 0, -rOuter);
  return path;
}

// Draw one ring of petals
function drawPetalRing(cx, cy, rInner, rOuter, count, color, strokeColor, rng, rotateOffset=0, jitter=0) {
  ctx.save();
  ctx.translate(cx, cy);
  const path = petalPath(rInner, rOuter, 0.85);
  const step = (Math.PI * 2) / count;
  for (let i = 0; i < count; i++) {
    ctx.save();
    const off = (rng ? (rng()-0.5) * jitter : 0);
    ctx.rotate(i * step + rotateOffset + off);
    ctx.fillStyle = color;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.max(1, (rOuter - rInner) * 0.05);
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = (rOuter - rInner) * 0.12;
    ctx.fill(path);
    ctx.stroke(path);
    ctx.restore();
  }
  ctx.restore();
}

// Center plate and diya
function drawDiya(cx, cy, baseR, t) {
  // Plate
  const rg = ctx.createRadialGradient(cx, cy, baseR*0.2, cx, cy, baseR*1.05);
  rg.addColorStop(0, '#3b2a1d');
  rg.addColorStop(1, '#20140d');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
  ctx.fill();

  // Bowl
  ctx.save();
  ctx.translate(cx, cy + baseR*0.05);
  ctx.scale(1, 0.85);
  ctx.fillStyle = '#7a4a2b';
  ctx.strokeStyle = '#d9a066';
  ctx.lineWidth = baseR * 0.06;
  ctx.beginPath();
  ctx.arc(0, 0, baseR*0.55, Math.PI*0.15, Math.PI*0.85);
  ctx.quadraticCurveTo(0, baseR*0.55, -baseR*0.55, Math.PI*0.15);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Flame
  const flicker = animateCheckbox.checked ? (Math.sin(t*7)+Math.sin(t*5+1.7))*0.02 : 0;
  const fh = baseR * (0.85 + flicker);
  const fw = baseR * 0.22;
  const fx = cx;
  const fy = cy - baseR*0.15;
  const flame = new Path2D();
  flame.moveTo(fx, fy - fh*0.55);
  flame.quadraticCurveTo(fx + fw, fy - fh*0.15, fx, fy + fh*0.2);
  flame.quadraticCurveTo(fx - fw, fy - fh*0.15, fx, fy - fh*0.55);
  const g = ctx.createRadialGradient(fx, fy, 2, fx, fy - fh*0.25, fh);
  g.addColorStop(0, 'rgba(255,255,180,1)');
  g.addColorStop(0.5, 'rgba(255,200,80,0.9)');
  g.addColorStop(1, 'rgba(255,120,0,0.0)');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(255,180,50,0.9)';
  ctx.shadowBlur = baseR * 0.6;
  ctx.fill(flame);
}

function drawBackgroundGradient() {
  const W = canvas.width / dpr, H = canvas.height / dpr;
  const bg = ctx.createRadialGradient(W*0.5, H*0.6, Math.min(W,H)*0.1, W*0.5, H*0.6, Math.max(W,H)*0.7);
  bg.addColorStop(0, '#1b0f21');
  bg.addColorStop(1, '#0a0912');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
}

// Main draw
function draw(timeMs=0) {
  const t = (timeMs||0) / 1000;
  const W = canvas.width / dpr, H = canvas.height / dpr;
  ctx.clearRect(0, 0, W, H);
  drawBackgroundGradient();

  // Heading text at the top
  const username = ((nameInput && nameInput.value) || '').trim();
  const heading = `Happy Diwali ${username || ''}`.trim();
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `800 ${Math.floor(W * 0.06)}px Poppins, sans-serif`;
  ctx.fillStyle = '#ffb300';
  ctx.shadowColor = '#ffb300';
  ctx.shadowBlur = 28;
  ctx.fillText(heading, W/2, Math.max(16, Math.floor(H * 0.03)));
  ctx.restore();

  const L = Math.max(3, Math.min(12, parseInt(layersInput.value || '8', 10)));
  const P = Math.max(6, Math.min(24, parseInt(petalsInput.value || '16', 10)));
  const palette = PALETTES[paletteSelect.value] || PALETTES.vivid;
  const rng = seededRandom(seedInput.value || Math.random());
  const design = (designSelect && designSelect.value) || 'classic';

  const cx = W/2, cy = H/2;
  const maxR = Math.min(W, H) * 0.45;

  // Choose algorithm
  if (design === 'classic') {
    for (let i = 0; i < L; i++) {
      const frac = (i + 1) / (L + 1);
      const rOuter = maxR * frac;
      const rInner = rOuter * (0.58 + (i%2?0.02:-0.02));
      const petals = P + Math.floor((i%2?1:-1) * P * 0.1);
      const base = pick(palette, i);
      const stroke = 'rgba(0,0,0,0.35)';
      const rot = (i%2?0.5:0) * (Math.PI*2/petals);
      drawPetalRing(cx, cy, rInner, rOuter, petals, base, stroke, rng, rot, 0.1);
      // inner rim
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = Math.max(1, (rOuter - rInner) * 0.2);
      ctx.beginPath();
      ctx.arc(cx, cy, rInner * 0.98, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
  } else if (design === 'starburst') {
    // Spiky triangles outward
    const spikes = P;
    for (let i = 0; i < L; i++) {
      const frac = (i + 1) / (L + 1);
      const r = maxR * frac;
      const inner = r * 0.6;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(i * 0.12);
      ctx.fillStyle = pick(palette, i);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = Math.max(1, r*0.04);
      ctx.beginPath();
      for (let k = 0; k < spikes; k++) {
        const a = (k / spikes) * Math.PI*2;
        const r1 = inner * (0.95 + rng()*0.1);
        const r2 = r * (0.95 + rng()*0.1);
        const mid = a + (Math.PI*2/spikes)/2;
        if (k === 0) ctx.moveTo(Math.cos(a)*r1, Math.sin(a)*r1);
        ctx.lineTo(Math.cos(mid)*r2, Math.sin(mid)*r2);
        ctx.lineTo(Math.cos(a + Math.PI*2/spikes)*r1, Math.sin(a + Math.PI*2/spikes)*r1);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else if (design === 'geometric') {
    // Concentric diamond tiles
    for (let i = 0; i < L; i++) {
      const r = maxR * ((i+1)/(L+1));
      const tiles = P + i*2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(i * 0.05);
      for (let k = 0; k < tiles; k++) {
        const a = (k/tiles) * Math.PI*2;
        const sz = r * 0.18;
        const x = Math.cos(a) * r * 0.82;
        const y = Math.sin(a) * r * 0.82;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + Math.PI/4);
        ctx.fillStyle = pick(palette, i+k);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = sz * 0.15;
        ctx.beginPath();
        ctx.moveTo(0, -sz);
        ctx.lineTo(sz, 0);
        ctx.lineTo(0, sz);
        ctx.lineTo(-sz, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  } else if (design === 'lotus') {
    // Few large overlapping lotus layers
    const lotusLayers = Math.min(L, 6);
    for (let i = 0; i < lotusLayers; i++) {
      const frac = (i + 1) / (lotusLayers + 1);
      const rOuter = maxR * frac * 1.05;
      const rInner = rOuter * 0.35;
      const petals = Math.max(6, Math.floor(P * 0.6));
      const base = pick(palette, i);
      const stroke = 'rgba(0,0,0,0.45)';
      drawPetalRing(cx, cy, rInner, rOuter, petals, base, stroke, rng, 0, 0.05);
    }
  }

  // center mandala rings
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.arc(cx, cy, maxR*(0.08 + k*0.04), 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = maxR*0.01;
    ctx.stroke();
  }

  // Diyas
  const placement = (diyaPlacementSelect && diyaPlacementSelect.value) || 'center';
  const count = Math.max(1, Math.min(24, parseInt(diyaCountInput.value || '5', 10)));
  if (placement === 'center') {
    drawDiya(cx, cy, maxR*0.22, t);
  } else if (placement === 'ring') {
    const r = maxR * 0.78;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI*2;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a + Math.PI/2);
      ctx.translate(-px, -py);
      drawDiya(px, py, maxR*0.12, t);
      ctx.restore();
    }
  } else if (placement === 'corners') {
    const offs = maxR * 0.85;
    const pts = [
      [cx - offs, cy - offs],
      [cx + offs, cy - offs],
      [cx + offs, cy + offs],
      [cx - offs, cy + offs]
    ];
    for (let i = 0; i < Math.min(count, pts.length); i++) {
      const [px, py] = pts[i];
      drawDiya(px, py, maxR*0.12, t);
    }
  }

  if (animateCheckbox.checked) requestAnimationFrame(draw);
}

// Actions
function randomize() {
  layersInput.value = Math.floor(6 + Math.random()*5);
  petalsInput.value = Math.floor(10 + Math.random()*10);
  const keys = Object.keys(PALETTES);
  paletteSelect.value = keys[Math.floor(Math.random()*keys.length)];
  const designs = ['classic','starburst','geometric','lotus'];
  designSelect.value = designs[Math.floor(Math.random()*designs.length)];
  seedInput.value = Math.random().toString(36).slice(2, 10);
  const placements = ['center','ring','corners'];
  diyaPlacementSelect.value = placements[Math.floor(Math.random()*placements.length)];
  diyaCountInput.value = Math.floor(4 + Math.random()*12);
  draw();
}

randomizeBtn.addEventListener('click', randomize);
renderBtn.addEventListener('click', draw);
downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'rangoli.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// initial: wait for name before drawing
function tryInitialDraw() {
  const v = (nameInput && nameInput.value || '').trim();
  if (!v) return; // wait until user enters name
  draw();
}

if (nameInput) {
  nameInput.addEventListener('change', tryInitialDraw);
  nameInput.addEventListener('input', () => {});
}

// Also bind Regenerate to force draw even if name empty
renderBtn.addEventListener('click', () => draw());

// Prompt the user visibly by focusing name field
if (nameInput) nameInput.focus();
#   g e n e r a t o r _ r a n g o o l i  
 