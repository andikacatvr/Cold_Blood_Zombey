/* =========================================================================
   TIMES SQUARE & UNDERGROUND SUBWAY — DETAILED LOW-POLY PS1/PS2 ARENA
   Faithfully combines all 5 atmospheric zones:
   1. Gritty Concrete Multi-Level Stairwell (Cry of Fear / Silent Hill)
   2. Weathered Red-Brick & Stone Snowy District (Silent Hill 1/2)
   3. Dense Overhead Neon Truss Alley, Chainlink Fence, Box Truck & Red Bus
   4. Dirty Grid-Tiled Subway Concourse (Graffiti, Posters, Fire Extinguishers)
   5. Enterable Subway Train Interior (Orange Seats, Poles, Straps, AC Grilles)
   ========================================================================= */

const THREE = window.THREE;

let nycGroup = null;
let tickerTex = null;
let nycLights = [];
const nycColliders = [];

function createCanvasTex(w, h, drawFn, crispRetro = true) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  if (crispRetro) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
  }
  tex.needsUpdate = true;
  return tex;
}

function makeAsphaltTex() {
  return createCanvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#1b1e24';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3400; i++) {
      const v = 14 + Math.floor(Math.random() * 34);
      ctx.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
      ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
    }
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = `rgba(6, 8, 12, ${0.22 + Math.random() * 0.25})`;
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 5 + Math.random() * 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(6, 8, 10, 0.7)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      let cx = Math.random() * w, cy = Math.random() * h;
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 4; s++) {
        cx += (Math.random() - 0.5) * 20;
        cy += (Math.random() - 0.5) * 20;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  });
}

function makeSidewalkTex() {
  return createCanvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#383b40';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      const v = 38 + Math.floor(Math.random() * 30);
      ctx.fillStyle = `rgb(${v},${v},${v - 2})`;
      ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
    }
    ctx.strokeStyle = '#15171b';
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  });
}

function makeMottledConcreteTex() {
  return createCanvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#5a5c53';
    ctx.fillRect(0, 0, w, h);
    // Cry of Fear / PS1 mottled olive-grey concrete texels
    for (let i = 0; i < 4500; i++) {
      const v = 52 + Math.floor(Math.random() * 58);
      ctx.fillStyle = `rgb(${v},${v + 2},${v - 8})`;
      ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 2, 2);
    }
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = 'rgba(22, 24, 18, 0.28)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 4 + Math.random() * 12, 8 + Math.random() * 26);
    }
  });
}

function makeBrickTex(baseR = 112, baseG = 46, baseB = 34) {
  return createCanvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#332d29';
    ctx.fillRect(0, 0, w, h);
    const bh = 8, bw = 16;
    for (let r = 0; r < h / bh; r++) {
      const off = (r % 2) * (bw / 2);
      for (let c = -1; c < w / bw + 1; c++) {
        const j = Math.floor((Math.random() - 0.5) * 26);
        ctx.fillStyle = `rgb(${Math.max(20, baseR + j)},${Math.max(15, baseG + j)},${Math.max(12, baseB + j)})`;
        ctx.fillRect(c * bw + off + 1, r * bh + 1, bw - 2, bh - 2);
      }
    }
    // Weathered grime overlay
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = 'rgba(12, 12, 10, 0.22)';
      ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 2, 2);
    }
  });
}

function makeSubwayGridTileTex(withGraffiti = false) {
  return createCanvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8b8c82';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 6500; i++) {
      const v = 96 + Math.floor(Math.random() * 64);
      ctx.fillStyle = `rgb(${v},${v},${v - 8})`;
      ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 2, 2);
    }
    // Square grid tiles with deep dark grout (like Image 4)
    ctx.strokeStyle = '#252622';
    ctx.lineWidth = 3;
    for (let x = 0; x <= w; x += 24) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += 24) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = 'rgba(28, 22, 14, 0.30)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 8 + Math.random() * 14, 24 + Math.random() * 60);
    }
    if (withGraffiti) {
      ctx.save();
      ctx.font = 'bold 34px Impact, sans-serif';
      ctx.fillStyle = 'rgba(255, 115, 25, 0.85)';
      ctx.strokeStyle = 'rgba(10, 10, 15, 0.9)';
      ctx.lineWidth = 4;
      ctx.rotate(-0.08);
      ctx.strokeText('NYC 42', 22, 118);
      ctx.fillText('NYC 42', 22, 118);
      ctx.fillStyle = 'rgba(220, 220, 230, 0.72)';
      ctx.font = 'bold 24px Impact, sans-serif';
      ctx.fillText('NO WAY OUT', 110, 185);
      ctx.restore();
    }
  });
}

function makeChainlinkTex() {
  return createCanvasTex(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#7e8792';
    ctx.lineWidth = 2;
    for (let i = -w; i < w * 2; i += 14) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + w, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + w, 0); ctx.lineTo(i, h); ctx.stroke();
    }
  });
}

function makeSkyscraperWindowsTex(tint = '#ffd98e') {
  return createCanvasTex(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#12151c';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      const v = 14 + Math.floor(Math.random() * 20);
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
      ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
    }
    const cols = 8, rows = 20;
    const cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rnd = Math.random();
        if (rnd > 0.45) {
          ctx.fillStyle = rnd > 0.85 ? '#a8e6ff' : (rnd > 0.68 ? '#ffeab5' : tint);
          ctx.globalAlpha = 0.45 + Math.random() * 0.55;
        } else {
          ctx.fillStyle = '#161b26';
          ctx.globalAlpha = 0.92;
        }
        ctx.fillRect(c * cw + 2, r * rh + 2, cw - 4, rh - 4);
      }
    }
    ctx.globalAlpha = 1.0;
  });
}

function makeBillboardTex(type) {
  return createCanvasTex(256, 128, (ctx, w, h) => {
    if (type === 'tulsa') {
      ctx.fillStyle = '#2d1208';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#38e8ff';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, w - 6, h - 6);
      ctx.fillStyle = '#ff6a1a';
      ctx.font = 'bold 38px Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TULSA KING', w / 2, 74);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillText('BROADWAY • TIMES SQUARE', w / 2, 102);
    } else if (type === 'vice') {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#461b7e');
      g.addColorStop(0.55, '#d93870');
      g.addColorStop(1, '#ff9d3b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#190b28';
      ctx.fillRect(0, h - 22, w, 22);
      ctx.fillStyle = '#ffdf6b';
      ctx.font = 'bold 32px Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VICE CITY VI', w / 2, 68);
      ctx.fillStyle = '#24e5ff';
      ctx.font = 'bold 13px Arial, sans-serif';
      ctx.fillText('I ♥ VICE CITY • NYC', w / 2, 96);
    } else if (type === 'gatsby') {
      ctx.fillStyle = '#0a1224';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#e5be5c';
      ctx.lineWidth = 5;
      ctx.strokeRect(6, 6, w - 12, h - 12);
      ctx.fillStyle = '#f5d276';
      ctx.font = 'bold 30px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('THE GREAT', w / 2, 54);
      ctx.font = 'bold 36px Georgia, serif';
      ctx.fillText('GATSBY', w / 2, 92);
    } else if (type === 'hongkong1') {
      ctx.fillStyle = '#b81428';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#ffdf6b';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LOON HOI HOTEL', w / 2, 62);
      ctx.fillStyle = '#ffdf6b';
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.fillText('24H OPEN • 42ND ST', w / 2, 94);
    } else if (type === 'hongkong2') {
      ctx.fillStyle = '#0c3b2e';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#38ff8c';
      ctx.lineWidth = 5;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.fillStyle = '#ffd24d';
      ctx.font = 'bold 28px Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SEAFOOD & NOODLE', w / 2, 62);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Arial, sans-serif';
      ctx.fillText('SUN SUN JEWELL • NYC', w / 2, 96);
    } else {
      ctx.fillStyle = '#0e0b1a';
      ctx.fillRect(0, 0, w, h);
      const colors = ['#ff2a6d', '#05d9e8', '#ffc857', '#7b2cbf', '#ff6b35', '#00f5d4'];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          ctx.fillStyle = colors[(r * 3 + c) % colors.length];
          ctx.fillRect(6 + c * 82, 6 + r * 60, 76, 54);
          ctx.fillStyle = '#111';
          ctx.font = 'bold 14px Impact, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(['NYC', 'LIVE', 'BROADWAY', 'SUBWAY', '42ND ST', 'SURVIVE'][r * 3 + c], 44 + c * 82, 38 + r * 60);
        }
      }
    }
  });
}

function makeNeonSignTex(text, bg, fg, border) {
  return createCanvasTex(256, 64, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, w - 4, h - 4);
    }
    ctx.fillStyle = fg;
    ctx.font = 'bold 28px Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 1);
  });
}

function makeSubwaySignTex() {
  return createCanvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#0c0e12';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 8, w, 2);
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Grand Central -', 14, 38);
    ctx.fillText('42 Street Station', 14, 62);
    const bullets = [
      { label: '4', col: '#00933c' },
      { label: '5', col: '#00933c' },
      { label: '6', col: '#00933c' },
      { label: '7', col: '#b933ad' },
      { label: 'S', col: '#808183' }
    ];
    bullets.forEach((b, i) => {
      const cx = 28 + i * 34, cy = 96;
      ctx.fillStyle = b.col;
      ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, cx, cy + 1);
    });
  });
}

function makePosterTex(title, bg, accent) {
  return createCanvasTex(64, 96, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3b2818';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.fillStyle = accent;
    ctx.fillRect(10, 18, w - 20, 42);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, 78);
  });
}

function addNYCBoxCollider(colliders, minX, maxX, minZ, maxZ) {
  const c = { minX, maxX, minZ, maxZ, category: 'nyc', disabled: true };
  colliders.push(c);
  nycColliders.push(c);
}

/**
 * Detailed Low-Poly Skyscraper with 3D cornices, recessed window bays, & storefront awning
 */
function buildDetailedSkyscraper(group, colliders, x, z, w, d, h, windowTex, trimColor = 0x1e2430) {
  const bGroup = new THREE.Group();
  bGroup.position.set(x, 0, z);

  const bodyMat = new THREE.MeshLambertMaterial({ map: windowTex, color: 0xffffff });
  const trimMat = new THREE.MeshLambertMaterial({ color: trimColor });

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
  body.position.y = h * 0.5;
  bGroup.add(body);

  // 3D Low-Poly Floor Ledges / Cornices every 12m
  for (let ly = 5.0; ly < h; ly += 12.0) {
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.55, d + 0.6), trimMat);
    ledge.position.y = ly;
    bGroup.add(ledge);
  }

  // Rooftop Parapet & HVAC Units
  const roofRim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 1.1, d + 0.9), trimMat);
  roofRim.position.y = h + 0.4;
  bGroup.add(roofRim);

  if (h > 36) {
    const crownH = h * 0.25;
    const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, crownH, d * 0.72), bodyMat);
    crown.position.y = h + crownH * 0.5;
    bGroup.add(crown);

    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.42, 11, 6),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    spire.position.y = h + crownH + 5.5;
    bGroup.add(spire);
  }

  // Ground-floor Storefront Awning & Steel Pillars
  const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 4.6, d + 0.4), trimMat);
  base.position.y = 2.3;
  bGroup.add(base);

  group.add(bGroup);
  addNYCBoxCollider(colliders, x - w * 0.5 - 0.3, x + w * 0.5 + 0.3, z - d * 0.5 - 0.3, z + d * 0.5 + 0.3);
  return bGroup;
}

/**
 * Detailed Low-Poly Brick/Stone Mid-Rise Building (Image 2: Silent Hill Snowy Urban Street)
 */
function buildBrickMidRise(group, colliders, x, z, w, d, floors, brickTex, corniceColor = 0x5c3a28, snowRoof = true) {
  const bGroup = new THREE.Group();
  bGroup.position.set(x, 0, z);
  const h = floors * 3.8;

  const wallMat = new THREE.MeshLambertMaterial({ map: brickTex });
  const trimMat = new THREE.MeshLambertMaterial({ color: corniceColor });
  const winMat = new THREE.MeshLambertMaterial({ color: 0x11161e });
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x262422 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h * 0.5;
  bGroup.add(body);

  // 3D Recessed Dark Windows with Stone Sills on both X faces
  const sideDir = (x < 0) ? 1 : -1;
  for (let f = 0; f < floors; f++) {
    const wy = 2.2 + f * 3.8;
    for (let wz = -d * 0.32; wz <= d * 0.32; wz += d * 0.32) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.85, 1.45), frameMat);
      frame.position.set(sideDir * (w * 0.5 + 0.04), wy, wz);
      bGroup.add(frame);

      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.55, 1.15), winMat);
      pane.position.set(sideDir * (w * 0.5 + 0.11), wy, wz);
      bGroup.add(pane);

      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 1.6), trimMat);
      sill.position.set(sideDir * (w * 0.5 + 0.12), wy - 0.95, wz);
      bGroup.add(sill);
    }
  }

  // Ornate Rooftop Cornice + Optional Snow Cap
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.65, d + 0.7), trimMat);
  cornice.position.y = h + 0.25;
  bGroup.add(cornice);

  if (snowRoof) {
    const snowCap = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.5, 0.22, d + 0.5),
      new THREE.MeshLambertMaterial({ color: 0xd5dee6 })
    );
    snowCap.position.y = h + 0.65;
    bGroup.add(snowCap);
  }

  group.add(bGroup);
  addNYCBoxCollider(colliders, x - w * 0.5 - 0.3, x + w * 0.5 + 0.3, z - d * 0.5 - 0.3, z + d * 0.5 + 0.3);
}

function addLEDDisplay(group, x, y, z, w, h, rotY, tex, glowColor = null) {
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.45, h + 0.45, 0.32),
    new THREE.MeshBasicMaterial({ color: 0x080b12 })
  );
  frame.position.set(x, y, z);
  frame.rotation.y = rotY;

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  screen.position.z = 0.18;
  frame.add(screen);

  if (glowColor) {
    const light = new THREE.PointLight(glowColor, 1.35, 22);
    light.position.set(0, 0, 2.5);
    frame.add(light);
    nycLights.push(light);
  }
  group.add(frame);
  return frame;
}

/**
 * Overhead Steel Truss Rack with Stacked Neon Signs (Image 3)
 */
function buildOverheadNeonTruss(group, z, texA, texB, texC, texD) {
  const trussMat = new THREE.MeshLambertMaterial({ color: 0x1c2028 });
  const rack = new THREE.Group();
  rack.position.set(0, 0, z);

  // Left & Right Steel Truss Towers
  [-15.5, 15.5].forEach(tx => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.45, 13.5, 0.45), trussMat);
    col.position.set(tx, 6.75, 0);
    rack.add(col);
  });

  // Horizontal Crossbeams
  [7.2, 11.2].forEach(by => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(31.5, 0.32, 0.32), trussMat);
    beam.position.set(0, by, 0);
    rack.add(beam);
  });

  // Stacked Overlapping Neon Signs
  addLEDDisplay(rack, -8.2, 9.4, 0.2, 9.5, 3.8, 0, texA, 0x00ff99);
  addLEDDisplay(rack, 1.8, 10.6, -0.2, 8.2, 3.4, 0, texB, 0xff2a55);
  addLEDDisplay(rack, 9.5, 8.6, 0.25, 8.8, 3.6, 0, texC, 0xffd24d);
  addLEDDisplay(rack, -3.5, 6.6, 0.3, 7.2, 2.5, 0, texD);

  group.add(rack);
}

/**
 * Multi-Level Subway Complex:
 * - Level 1: Mottled Concrete Switchback Stairwell (Image 1)
 * - Level 2: Dirty Grid-Tiled Concourse with Graffiti, Posters & Fire Extinguishers (Image 4)
 * - Level 3: Enterable Subway Train Interior with Orange Seats, Poles & Straps (Image 5)
 */
function buildSubwayComplex(group, colliders, concreteTex, gridTileTex, graffitiTileTex, signTex, arrivalTex) {
  const sub = new THREE.Group();
  const sx = -19.0;
  const sz = -18.0;
  sub.position.set(sx, 0, sz);

  const ironMat = new THREE.MeshLambertMaterial({ color: 0x161b18 });
  const greenRailMat = new THREE.MeshLambertMaterial({ color: 0x1b472b });
  const concMat = new THREE.MeshLambertMaterial({ map: concreteTex });
  const tileMat = new THREE.MeshLambertMaterial({ map: gridTileTex });
  const grafMat = new THREE.MeshLambertMaterial({ map: graffitiTileTex });
  const floorTileMat = new THREE.MeshLambertMaterial({ map: makeBrickTex(82, 58, 46) });

  // Entrance Green Globe Pillars & Signboards
  [-2.35, 2.35].forEach(rx => {
    const railWall = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.3, 6.5), ironMat);
    railWall.position.set(rx, 0.65, -3.1);
    sub.add(railWall);

    const post = new THREE.Mesh(new THREE.BoxGeometry(0.40, 2.8, 0.40), ironMat);
    post.position.set(rx, 1.4, 0.1);
    sub.add(post);

    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), new THREE.MeshBasicMaterial({ color: 0x3dff8b }));
    globe.position.set(rx, 2.95, 0.1);
    sub.add(globe);
  });

  const greenGlow = new THREE.PointLight(0x28ff78, 2.2, 16);
  greenGlow.position.set(0, 3.0, 0.6);
  sub.add(greenGlow);
  nycLights.push(greenGlow);

  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(4.9, 1.4, 0.22), new THREE.MeshBasicMaterial({ map: signTex }));
  signBoard.position.set(0, 2.75, 0.05);
  sub.add(signBoard);

  const arrivalBoard = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.25, 0.18), new THREE.MeshBasicMaterial({ map: arrivalTex }));
  arrivalBoard.position.set(0, 4.2, 0.05);
  sub.add(arrivalBoard);

  // --- FLIGHT 1: Cry of Fear Concrete Stairwell (z = 0 to -6, y = 0 to -2.2) ---
  for (let i = 0; i < 12; i++) {
    const frac = (i + 0.5) / 12;
    const step = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.24, 6.0 / 12 + 0.08), concMat);
    step.position.set(0, -frac * 2.2 - 0.1, -frac * 6.0);
    sub.add(step);
  }
  // Stairwell Concrete Side Walls & Pipe Handrails
  [-2.35, 2.35].forEach(wx => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.6, 9.2), concMat);
    wall.position.set(wx, -1.2, -4.6);
    sub.add(wall);

    const handrail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 6.5, 6), ironMat);
    handrail.rotation.x = Math.PI * 0.5 - 0.35;
    handrail.position.set(wx * 0.86, -0.35, -3.0);
    sub.add(handrail);
  });
  // Blood Streak & Abandoned Red Sneaker (Image 1)
  const bloodStreak = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 3.8),
    new THREE.MeshBasicMaterial({ color: 0x450508, transparent: true, opacity: 0.88, depthWrite: false })
  );
  bloodStreak.rotation.x = -Math.PI * 0.38;
  bloodStreak.position.set(0.25, -1.0, -2.8);
  sub.add(bloodStreak);

  const redSneaker = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.44), new THREE.MeshLambertMaterial({ color: 0xc81a1a }));
  redSneaker.position.set(-1.35, -0.35, -0.9);
  redSneaker.rotation.y = 0.45;
  sub.add(redSneaker);

  // Mid-Landing (z = -6 to -9, y = -2.2)
  const midLanding = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.3, 3.2), concMat);
  midLanding.position.set(0, -2.35, -7.5);
  sub.add(midLanding);

  // --- FLIGHT 2: Down to Concourse (z = -9 to -12.5, y = -2.2 to -3.4) ---
  for (let i = 0; i < 8; i++) {
    const frac = (i + 0.5) / 8;
    const step = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.22, 3.5 / 8 + 0.08), floorTileMat);
    step.position.set(0, -2.2 - frac * 1.2 - 0.1, -9.0 - frac * 3.5);
    sub.add(step);
  }

  // --- LEVEL 2: Dirty Grid-Tiled Subway Concourse (z = -12.5 to -24.5, y = -3.4) ---
  const platFloor = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.3, 12.6), floorTileMat);
  platFloor.position.set(0, -3.55, -18.5);
  sub.add(platFloor);

  const yellowEdge = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 12.2), new THREE.MeshBasicMaterial({ color: 0xf2c229 }));
  yellowEdge.position.set(-4.8, -3.38, -18.5);
  sub.add(yellowEdge);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(10.8, 4.2, 0.4), grafMat);
  backWall.position.set(0, -1.5, -24.6);
  sub.add(backWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 12.6), tileMat);
  rightWall.position.set(5.1, -1.5, -18.5);
  sub.add(rightWall);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.3, 15.6), ironMat);
  ceiling.position.set(0, 0.35, -17.0);
  sub.add(ceiling);

  // Image 4 Props: Green EXIT -> Sign, Fire Extinguisher Box, Framed Posters & Green Handrails
  const exitSign = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.42, 0.08),
    new THREE.MeshBasicMaterial({ map: makeNeonSignTex('EXIT ->', '#155c2e', '#ffffff', '#b8e8c8') })
  );
  exitSign.position.set(2.4, -0.35, -24.35);
  sub.add(exitSign);

  const extCab = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.15, 0.14), new THREE.MeshLambertMaterial({ color: 0xc29018 }));
  extCab.position.set(0.4, -1.5, -24.35);
  sub.add(extCab);
  [-0.22, 0.22].forEach(tx => {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.65, 8), new THREE.MeshLambertMaterial({ color: 0xc21818 }));
    tank.position.set(0.4 + tx, -1.55, -24.25);
    sub.add(tank);
  });

  // Framed Posters along Concourse Wall
  const pTex1 = makePosterTex('DIEAZE', '#1a0a0c', '#9e1c24');
  const pTex2 = makePosterTex('NYC 42', '#101c28', '#38a8c8');
  [-1.8, -3.2].forEach((px, idx) => {
    const poster = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.35, 0.06), new THREE.MeshLambertMaterial({ map: idx === 0 ? pTex1 : pTex2 }));
    poster.position.set(px, -1.45, -24.35);
    sub.add(poster);
  });

  const wallRail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 11.5, 6), greenRailMat);
  wallRail.rotation.x = Math.PI * 0.5;
  wallRail.position.set(4.78, -2.2, -18.5);
  sub.add(wallRail);

  // Fluorescent Ceiling Light Tubes
  [-14.5, -18.5, -22.0].forEach(lz => {
    const tube = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.22), new THREE.MeshBasicMaterial({ color: 0xe6f8ee }));
    tube.position.set(0, 0.15, lz);
    sub.add(tube);
  });
  const subLight = new THREE.PointLight(0xd8f0dc, 2.4, 22);
  subLight.position.set(0, -0.5, -18.5);
  sub.add(subLight);
  nycLights.push(subLight);

  // --- LEVEL 3: Detailed Enterable Subway Train Interior (Image 5) ---
  const trainCar = new THREE.Group();
  trainCar.position.set(-7.0, -2.0, -18.5);
  const steelMat = new THREE.MeshLambertMaterial({ color: 0x76808e });
  const darkMetalMat = new THREE.MeshLambertMaterial({ color: 0x3b4048 });
  const orangeSeatMat = new THREE.MeshLambertMaterial({ color: 0xd05c1c });

  const trainFloor = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 12.6), new THREE.MeshLambertMaterial({ map: concreteTex }));
  trainFloor.position.y = -1.35;
  trainCar.add(trainFloor);

  const trainRoof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 12.6), steelMat);
  trainRoof.position.y = 1.45;
  trainCar.add(trainRoof);

  // Ceiling AC Grilles
  [-3.2, 0, 3.2].forEach(gz => {
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 1.4), darkMetalMat);
    grille.position.set(0, 1.34, gz);
    trainCar.add(grille);
  });

  const trainBack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.8, 12.6), grafMat);
  trainBack.position.x = -1.52;
  trainCar.add(trainBack);

  // Side Wall with Open Sliding Doorways & Double-Window Doors
  [-4.4, 0, 4.4].forEach(szWall => {
    const wallSeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.8, 2.4), steelMat);
    wallSeg.position.set(1.52, 0.05, szWall);
    trainCar.add(wallSeg);
  });

  // Orange Vinyl Bench Seats + Metal Armrests
  [-1.12, 1.12].forEach(sxSeat => {
    const benchBase = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.35, 10.6), orangeSeatMat);
    benchBase.position.set(sxSeat, -1.05, 0);
    trainCar.add(benchBase);
    const benchBack = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 10.6), orangeSeatMat);
    benchBack.position.set(sxSeat + (sxSeat < 0 ? -0.22 : 0.22), -0.65, 0);
    trainCar.add(benchBack);
  });

  // Vertical Steel Grab Poles & Overhead Hanging Hand Straps
  for (let pz = -4.2; pz <= 4.2; pz += 2.8) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.75, 6), new THREE.MeshLambertMaterial({ color: 0xc8d0da }));
    pole.position.set(0, 0.05, pz);
    trainCar.add(pole);
  }
  [-0.75, 0.75].forEach(rx => {
    const strapRail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 11.0, 6), darkMetalMat);
    strapRail.rotation.x = Math.PI * 0.5;
    strapRail.position.set(rx, 1.18, 0);
    trainCar.add(strapRail);
    for (let szStrap = -4.5; szStrap <= 4.5; szStrap += 1.5) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 4, 8), darkMetalMat);
      strap.position.set(rx, 1.05, szStrap);
      trainCar.add(strap);
    }
  });

  const trainTube = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 10.0), new THREE.MeshBasicMaterial({ color: 0xfff0cc }));
  trainTube.position.set(0, 1.32, 0);
  trainCar.add(trainTube);
  const trainLight = new THREE.PointLight(0xffe6b8, 1.8, 14);
  trainLight.position.set(0, 0.7, 0);
  trainCar.add(trainLight);
  nycLights.push(trainLight);

  sub.add(trainCar);

  // Colliders for Subway walls (stairwell, concourse & train doorway stay open & walkable!)
  addNYCBoxCollider(colliders, sx - 2.6, sx - 2.1, sz - 12.6, sz + 0.4);
  addNYCBoxCollider(colliders, sx + 2.1, sx + 2.6, sz - 12.6, sz + 0.4);
  addNYCBoxCollider(colliders, sx - 8.8, sx + 5.3, sz - 25.0, sz - 24.2);
  addNYCBoxCollider(colliders, sx + 4.7, sx + 5.4, sz - 24.6, sz - 12.2);
  addNYCBoxCollider(colliders, sx - 8.8, sx - 8.2, sz - 24.6, sz - 12.2);

  group.add(sub);
}

/**
 * White Box Truck (Image 3: ISUZU) & Red Double-Decker Bus
 */
function buildBoxTruck(group, colliders, x, z, rotY) {
  const t = new THREE.Group();
  t.position.set(x, 0, z);
  t.rotation.y = rotY;
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xd9dde2 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1e2228 });

  const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.3, 4.4), whiteMat);
  cargo.position.set(0, 1.75, -0.7);
  t.add(cargo);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.8, 1.8), whiteMat);
  cab.position.set(0, 1.3, 2.2);
  t.add(cab);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 0.1), darkMat);
  windshield.position.set(0, 1.65, 3.11);
  t.add(windshield);
  [-0.95, 0.95].forEach(wx => {
    [-1.6, 2.1].forEach(wz => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), darkMat);
      wheel.rotation.z = Math.PI * 0.5;
      wheel.position.set(wx, 0.42, wz);
      t.add(wheel);
    });
  });

  group.add(t);
  addNYCBoxCollider(colliders, x - 1.4, x + 1.4, z - 3.1, z + 3.2);
}

function buildDoubleDeckerBus(group, colliders, x, z, rotY) {
  const b = new THREE.Group();
  b.position.set(x, 0, z);
  b.rotation.y = rotY;
  const redMat = new THREE.MeshLambertMaterial({ color: 0xb81d24 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x18202c });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.7, 4.1, 9.2), redMat);
  body.position.y = 2.45;
  b.add(body);
  [1.7, 3.4].forEach(wy => {
    const winStrip = new THREE.Mesh(new THREE.BoxGeometry(2.76, 0.85, 8.2), glassMat);
    winStrip.position.y = wy;
    b.add(winStrip);
  });

  group.add(b);
  addNYCBoxCollider(colliders, x - 1.6, x + 1.6, z - 4.8, z + 4.8);
}

function buildNYCTaxi(group, colliders, x, z, rotY, isCab = true, snowyRoof = false) {
  const car = new THREE.Group();
  car.position.set(x, 0, z);
  car.rotation.y = rotY;

  const bodyMat = new THREE.MeshLambertMaterial({ color: isCab ? 0xf5b81d : 0x1b1e26 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1e2b3c });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.72, 4.4), bodyMat);
  chassis.position.y = 0.56;
  car.add(chassis);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.64, 2.3), glassMat);
  cabin.position.set(0, 1.2, -0.1);
  car.add(cabin);

  if (snowyRoof) {
    const snowTop = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.12, 2.1), new THREE.MeshLambertMaterial({ color: 0xd8e1ea }));
    snowTop.position.set(0, 1.56, -0.1);
    car.add(snowTop);
  } else if (isCab) {
    const roofSign = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.22, 0.32), new THREE.MeshBasicMaterial({ color: 0xffe484 }));
    roofSign.position.set(0, 1.62, 0.1);
    car.add(roofSign);
  }

  [-0.65, 0.65].forEach(lx => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.08), new THREE.MeshBasicMaterial({ color: 0xfff7d6 }));
    hl.position.set(lx, 0.58, 2.22);
    car.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.08), new THREE.MeshBasicMaterial({ color: 0xff1e2d }));
    tl.position.set(lx, 0.62, -2.22);
    car.add(tl);
  });

  group.add(car);
  const hw = Math.abs(Math.cos(rotY)) * 1.1 + Math.abs(Math.sin(rotY)) * 2.25;
  const hd = Math.abs(Math.sin(rotY)) * 1.1 + Math.abs(Math.cos(rotY)) * 2.25;
  addNYCBoxCollider(colliders, x - hw, x + hw, z - hd, z + hd);
}

export function initTimesSquareWorld(scene, colliders) {
  if (nycGroup) return nycGroup;

  nycGroup = new THREE.Group();
  nycGroup.name = 'Times_Square_NYC_Arena';

  const asphaltTex = makeAsphaltTex();
  asphaltTex.wrapS = asphaltTex.wrapT = THREE.RepeatWrapping;
  asphaltTex.repeat.set(32, 32);

  const sidewalkTex = makeSidewalkTex();
  sidewalkTex.wrapS = sidewalkTex.wrapT = THREE.RepeatWrapping;
  sidewalkTex.repeat.set(16, 40);

  const concreteTex = makeMottledConcreteTex();
  concreteTex.wrapS = concreteTex.wrapT = THREE.RepeatWrapping;
  concreteTex.repeat.set(4, 4);

  const redBrickTex = makeBrickTex(118, 46, 34);
  redBrickTex.wrapS = redBrickTex.wrapT = THREE.RepeatWrapping;
  redBrickTex.repeat.set(4, 4);

  const creamStoneTex = makeBrickTex(138, 128, 112);
  creamStoneTex.wrapS = creamStoneTex.wrapT = THREE.RepeatWrapping;
  creamStoneTex.repeat.set(4, 4);

  const gridTileTex = makeSubwayGridTileTex(false);
  gridTileTex.wrapS = gridTileTex.wrapT = THREE.RepeatWrapping;
  gridTileTex.repeat.set(3, 1.5);

  const graffitiTileTex = makeSubwayGridTileTex(true);

  const winGold = makeSkyscraperWindowsTex('#ffd67a');
  const winCyan = makeSkyscraperWindowsTex('#8ce2ff');

  // 1. Ground Asphalt Plane (with cutout for multi-level Subway at x:[-21.5,-16.5], z:[-18,-43])
  const asphaltMat = new THREE.MeshLambertMaterial({ map: asphaltTex });
  const addGroundTile = (minX, maxX, minZ, maxZ) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX, maxZ - minZ), asphaltMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((minX + maxX) * 0.5, 0.01, (minZ + maxZ) * 0.5);
    m.receiveShadow = true;
    nycGroup.add(m);
  };
  addGroundTile(-160, 160, -18.0, 160);
  addGroundTile(-160, -21.5, -160, -18.0);
  addGroundTile(-16.5, 160, -160, -18.0);
  addGroundTile(-21.5, -16.5, -160, -43.2);

  // Road Markings & Crosswalks
  const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xe6b422 });
  const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xdbe2eb });
  const redLaneMat = new THREE.MeshBasicMaterial({ color: 0x7a1c1c });

  [-7.5, 7.5].forEach(lx => {
    const busLane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 130), redLaneMat);
    busLane.rotation.x = -Math.PI / 2;
    busLane.position.set(lx, 0.02, 10);
    nycGroup.add(busLane);
  });
  [-0.22, 0.22].forEach(cx => {
    const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 140), yellowLineMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.set(cx, 0.025, 10);
    nycGroup.add(centerLine);
  });
  [-10, 26].forEach(cz => {
    for (let sx = -12; sx <= 12; sx += 2.2) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.6), whiteLineMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(sx, 0.025, cz);
      nycGroup.add(stripe);
    }
  });

  // Sidewalks
  const swMat = new THREE.MeshLambertMaterial({ map: sidewalkTex });
  [-24, 24].forEach(sx => {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(16, 0.14, 140), swMat);
    sw.position.set(sx, 0.07, 10);
    sw.receiveShadow = true;
    nycGroup.add(sw);
  });

  // 2. ZONA A: Detailed Low-Poly Times Square Skyscrapers (North & Mid Plaza)
  buildDetailedSkyscraper(nycGroup, colliders, -34, -8, 18, 22, 58, winGold);
  buildDetailedSkyscraper(nycGroup, colliders, -34, -44, 18, 22, 64, winCyan);
  buildDetailedSkyscraper(nycGroup, colliders, 34, -10, 18, 24, 68, winCyan);
  buildDetailedSkyscraper(nycGroup, colliders, 34, -44, 18, 22, 62, winGold);
  buildDetailedSkyscraper(nycGroup, colliders, 0, -58, 22, 18, 86, winGold, 0x0b0e18);

  // 2b. ZONA B: Weathered Red-Brick & Cream-Stone Mid-Rise Buildings (Image 2: Silent Hill Urban Street)
  buildBrickMidRise(nycGroup, colliders, -28, 22, 12, 16, 3, redBrickTex, 0x5c3a28, true);
  buildBrickMidRise(nycGroup, colliders, -28, 46, 12, 18, 4, creamStoneTex, 0x6b6458, true);
  buildBrickMidRise(nycGroup, colliders, 28, 24, 12, 16, 4, creamStoneTex, 0x6b6458, true);
  buildBrickMidRise(nycGroup, colliders, 28, 48, 12, 16, 3, redBrickTex, 0x5c3a28, true);

  // Distant Manhattan Twin Towers Skyline Silhouette
  [-18, 18].forEach(tx => {
    const twin = new THREE.Mesh(
      new THREE.BoxGeometry(16, 115, 16),
      new THREE.MeshBasicMaterial({ map: winGold, color: 0xffe4a0 })
    );
    twin.position.set(tx - 42, 57.5, -122);
    nycGroup.add(twin);
  });

  // 3. LED Screens, Overhead Steel Truss Neon Racks & Chainlink Fence (Image 3)
  const texTulsa = makeBillboardTex('tulsa');
  const texVice = makeBillboardTex('vice');
  const texGatsby = makeBillboardTex('gatsby');
  const texCube = makeBillboardTex('cube');
  const texHK1 = makeBillboardTex('hongkong1');
  const texHK2 = makeBillboardTex('hongkong2');

  addLEDDisplay(nycGroup, -24.6, 14.5, -8, 17, 9, Math.PI / 2, texTulsa, 0xff6a2a);
  addLEDDisplay(nycGroup, 24.6, 14.0, -10, 18, 9.5, -Math.PI / 2, texVice, 0xff3898);
  addLEDDisplay(nycGroup, 24.6, 26.0, -10, 13, 10, -Math.PI / 2, texGatsby, 0x38e8ff);

  addLEDDisplay(nycGroup, 0, 15.0, -48.6, 19, 10.5, 0, texVice, 0xff3b9a);
  addLEDDisplay(nycGroup, 0, 28.5, -48.6, 16, 11, 0, texCube, 0x24e5ff);
  addLEDDisplay(nycGroup, 0, 41.0, -48.6, 14, 9, 0, texTulsa, 0xff7722);

  // Overhead Steel Truss Neon Racks (Image 3)
  buildOverheadNeonTruss(nycGroup, -36, texHK1, texHK2, texTulsa, makeNeonSignTex('SEAFOOD • 24H', '#f5f0e6', '#d62828', '#111'));
  buildOverheadNeonTruss(nycGroup, -6, texHK2, texVice, texHK1, makeNeonSignTex('I ♥ VICE CITY', '#280a48', '#ffffff', '#ff3b9a'));

  // Chainlink Fence across North Alley Perimeter (Image 3)
  const chainTex = makeChainlinkTex();
  chainTex.wrapS = chainTex.wrapT = THREE.RepeatWrapping;
  chainTex.repeat.set(12, 2);
  const fence = new THREE.Mesh(
    new THREE.PlaneGeometry(31, 3.4),
    new THREE.MeshLambertMaterial({ map: chainTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide })
  );
  fence.position.set(0, 1.7, -42.0);
  nycGroup.add(fence);
  addNYCBoxCollider(colliders, -15.5, 15.5, -42.4, -41.6);

  // Animated Scrolling LED Ticker
  tickerTex = createCanvasTex(512, 32, (ctx, w, h) => {
    ctx.fillStyle = '#050812';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ff2a4b';
    ctx.font = 'bold 18px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText('TIMES SQUARE LOCKDOWN • SUBWAY 4/5/6/7 SUSPENDED • SURVIVE THE HORDE • ', 6, h / 2);
  });
  tickerTex.wrapS = THREE.RepeatWrapping;
  addLEDDisplay(nycGroup, 0, 8.0, -48.6, 21.5, 1.4, 0, tickerTex);

  // 4. Multi-Level Subway Complex (Image 1 -> Image 4 -> Image 5)
  buildSubwayComplex(nycGroup, colliders, concreteTex, gridTileTex, graffitiTileTex, makeSubwaySignTex(), makeNeonSignTex('TIMES SQ 42 ST • 2m', '#050811', '#38ff8c', '#ff3870'));

  // 5. Vehicles: White Box Truck, Red Double-Decker Bus, & Snowy/NYC Cabs
  buildBoxTruck(nycGroup, colliders, -9.5, 2.0, 0.14);
  buildDoubleDeckerBus(nycGroup, colliders, 11.0, 12.0, Math.PI - 0.08);
  buildNYCTaxi(nycGroup, colliders, 10.2, -16.0, Math.PI + 0.08, false, false);
  buildNYCTaxi(nycGroup, colliders, -10.5, 34.0, -0.15, true, true);
  buildNYCTaxi(nycGroup, colliders, 9.5, 42.0, Math.PI + 0.1, false, true);

  // 6. Slender L-Shaped Streetlamps casting warm sodium light pools (Image 2)
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3b4048 });
  [[-16.2, 6], [-16.2, 30], [16.2, -6], [16.2, 26]].forEach(([lx, lz]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 6.4, 6), poleMat);
    pole.position.set(lx, 3.2, lz);
    nycGroup.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.18), poleMat);
    arm.position.set(lx + (lx < 0 ? 0.65 : -0.65), 6.35, lz);
    nycGroup.add(arm);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 0.24), new THREE.MeshBasicMaterial({ color: 0xffe4b5 }));
    bulb.position.set(lx + (lx < 0 ? 1.0 : -1.0), 6.26, lz);
    nycGroup.add(bulb);
    const lampLight = new THREE.PointLight(0xffcf82, 1.9, 22);
    lampLight.position.set(lx + (lx < 0 ? 1.0 : -1.0), 5.8, lz);
    nycGroup.add(lampLight);
    nycLights.push(lampLight);
  });

  nycGroup.visible = false;
  scene.add(nycGroup);
  return nycGroup;
}

export function setTimesSquareActive(active) {
  if (nycGroup) nycGroup.visible = !!active;
  nycColliders.forEach(c => { c.disabled = !active; });
}

export function updateTimesSquareEffects(dt) {
  if (!nycGroup || !nycGroup.visible) return;
  if (tickerTex) tickerTex.offset.x = (tickerTex.offset.x + dt * 0.22) % 1.0;
}
