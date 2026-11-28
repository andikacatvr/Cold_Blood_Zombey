/* =========================================================================
   OPEN-CITY MANHATTAN (GTA SA / SPIDER-MAN GRID SCALE: 440m x 440m)
   - 3 North-South Avenues + 5 East-West Cross Streets + Raised Sidewalks
   - Midtown Times Square (One TS, TKTS Red Stairs/Deck, Curved & Multi-Tier LEDs)
   - Walkable Underground Subway (42nd St Concourse, Graffiti, Fire Ext, Train Interior)
   - Central Park Winter (Frozen Lake, Snowy Trees, Benches, Park Lamps)
   - Hell's Kitchen Brownstones + Financial District + Empire State & One WTC + Liberty
   - Streetlights with Swirling Golden "Kunang-Kunang" Light-Sparks + Traffic Lights
   ========================================================================= */

const THREE = window.THREE;

let nycGroup = null;
const nycColliders = [];
let civicTemplate = null;
let civicLoading = false;
const pendingCarSlots = [];
const glbBuildingTemplates = {};
const glbBuildingLoading = {};
const pendingBuildingSlots = {};
let lampFireflies = null;
let fireflyBasePos = null;
let expressSubwayTrain = null;

function placeModularNYCBuilding(group, colliders, url, x, z, rotY = 0, sx = 1, sy = 1, sz = 1, colHalfW = 0, colHalfD = 0) {
  const slotGroup = new THREE.Group();
  slotGroup.position.set(x, 0, z);
  slotGroup.rotation.y = rotY;
  slotGroup.scale.set(sx, sy, sz);
  group.add(slotGroup);

  if (colliders && colHalfW > 0 && colHalfD > 0) {
    const hw = Math.abs(Math.cos(rotY)) * colHalfW + Math.abs(Math.sin(rotY)) * colHalfD;
    const hd = Math.abs(Math.sin(rotY)) * colHalfW + Math.abs(Math.cos(rotY)) * colHalfD;
    addCol(colliders, x - hw, x + hw, z - hd, z + hd);
  }

  const spawnClone = (tpl) => {
    const clone = tpl.clone(true);
    slotGroup.add(clone);
  };

  if (glbBuildingTemplates[url]) {
    spawnClone(glbBuildingTemplates[url]);
    return slotGroup;
  }

  if (!pendingBuildingSlots[url]) pendingBuildingSlots[url] = [];
  pendingBuildingSlots[url].push(slotGroup);

  if (!glbBuildingLoading[url] && typeof THREE.GLTFLoader !== 'undefined') {
    glbBuildingLoading[url] = true;
    const loader = new THREE.GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        glbBuildingTemplates[url] = model;
        (pendingBuildingSlots[url] || []).forEach((sg) => sg.add(model.clone(true)));
        pendingBuildingSlots[url] = [];
      },
      undefined,
      (err) => console.warn(`[NYC MAP] Failed loading ${url}:`, err)
    );
  }
  return slotGroup;
}

function makeTex(w, h, drawFn) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  drawFn(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function makeSnowyStreetTex() {
  return makeTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#48525e';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const v = 58 + Math.floor(Math.random() * 44);
        ctx.fillStyle = `rgb(${v},${v + 6},${v + 12})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
    [72, 96, 152, 176].forEach(tx => {
      ctx.fillStyle = 'rgba(18, 22, 28, 0.58)';
      ctx.fillRect(tx, 0, 14, h);
    });
    ctx.fillStyle = 'rgba(195, 150, 42, 0.45)';
    ctx.fillRect(124, 0, 3, h);
    ctx.fillRect(129, 0, 3, h);
  });
}

function makePlazaTileTex() {
  return makeTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#586472';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      for (let x = 0; x < w; x += 8) {
        const isSnow = Math.random() > 0.45;
        const v = isSnow ? (142 + Math.floor(Math.random() * 42)) : (54 + Math.floor(Math.random() * 26));
        ctx.fillStyle = `rgb(${v},${v + 7},${v + 14})`;
        ctx.fillRect(x + 1, y + 1, 6, 6);
      }
    }
  });
}

function makeBrickTex(r, g, b) {
  return makeTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#221e1c';
    ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 16; row++) {
      const off = (row % 2) * 8;
      for (let col = -1; col < 9; col++) {
        const j = Math.floor((Math.random() - 0.5) * 28);
        ctx.fillStyle = `rgb(${r + j},${g + j},${b + j})`;
        ctx.fillRect(col * 16 + off + 1, row * 8 + 1, 14, 6);
      }
    }
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = 'rgba(10, 12, 14, 0.25)';
      ctx.fillRect(Math.floor(Math.random() * 128), Math.floor(Math.random() * 128), 2, 2);
    }
    const ao = ctx.createLinearGradient(0, 80, 0, 128);
    ao.addColorStop(0, 'rgba(0,0,0,0)');
    ao.addColorStop(1, 'rgba(8,10,12,0.68)');
    ctx.fillStyle = ao;
    ctx.fillRect(0, 80, 128, 48);
  });
}

function makeSubwayGridTileTex(withGraffiti = false) {
  return makeTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8b8c82';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4500; i++) {
      const v = 96 + Math.floor(Math.random() * 60);
      ctx.fillStyle = `rgb(${v},${v},${v - 8})`;
      ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 2, 2);
    }
    ctx.strokeStyle = '#252622';
    ctx.lineWidth = 3;
    for (let x = 0; x <= w; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
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
      ctx.font = 'bold 22px Impact, sans-serif';
      ctx.fillText('NO WAY OUT', 105, 185);
      ctx.restore();
    }
  });
}

function makeWindowPaneTex(isLit = false) {
  return makeTex(64, 96, (ctx, w, h) => {
    ctx.fillStyle = isLit ? '#8a683a' : '#121820';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = isLit ? '#cfa45e' : '#242d38';
    for (let y = 6; y < 58; y += 5) ctx.fillRect(4, y, w - 8, 2);
    ctx.fillStyle = '#181412';
    ctx.fillRect(w * 0.5 - 2, 0, 4, h);
    ctx.fillRect(0, h * 0.5 - 2, w, 4);
    ctx.strokeStyle = '#2e2926';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
  });
}

function makeDoorTex() {
  return makeTex(64, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2d1e17';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3c4854';
    ctx.fillRect(10, 12, w - 20, 46);
    ctx.fillStyle = '#9c3228';
    ctx.fillRect(16, 22, 16, 22);
    ctx.fillStyle = '#d4b886';
    ctx.fillRect(36, 26, 12, 18);
    ctx.fillStyle = '#1c120d';
    ctx.fillRect(10, 68, w - 20, 48);
    ctx.fillStyle = '#c8a858';
    ctx.fillRect(w - 15, 62, 5, 12);
    ctx.strokeStyle = '#14100e';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
  });
}

function makeTowerWindowsTex(tint = '#ffe39e') {
  return makeTex(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#181e28';
    ctx.fillRect(0, 0, w, h);
    const cols = 8, rows = 22;
    const cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rnd = Math.random();
        ctx.fillStyle = rnd > 0.55 ? (rnd > 0.85 ? '#a8dcf5' : tint) : '#10151c';
        ctx.globalAlpha = rnd > 0.55 ? (0.45 + Math.random() * 0.5) : 0.92;
        ctx.fillRect(c * cw + 2, r * rh + 2, cw - 4, rh - 4);
      }
    }
    ctx.globalAlpha = 1.0;
  });
}

function makeAdTex(title, sub, bg1, bg2, fg = '#ffffff', border = null) {
  return makeTex(256, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, bg1);
    g.addColorStop(1, bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, w - 6, h - 6);
    }
    ctx.fillStyle = fg;
    ctx.font = 'bold 34px Impact, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, 64);
    if (sub) {
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.fillText(sub, w / 2, 96);
    }
  });
}

function makeSubwaySignTex() {
  return makeTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#0c0e12';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 8, w, 2);
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Times Sq -', 14, 38);
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

function addCol(colliders, minX, maxX, minZ, maxZ) {
  const c = { minX, maxX, minZ, maxZ, category: 'nyc', disabled: true };
  colliders.push(c);
  nycColliders.push(c);
}

function addScreen(group, x, y, z, w, h, rotY, tex, glowCol = null) {
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.4, h + 0.4, 0.3),
    new THREE.MeshBasicMaterial({ color: 0x0b0e14 })
  );
  frame.position.set(x, y, z);
  frame.rotation.y = rotY;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  plane.position.z = 0.17;
  frame.add(plane);
  if (glowCol) {
    const l = new THREE.PointLight(glowCol, 1.3, 24);
    l.position.set(0, 0, 2.5);
    frame.add(l);
  }
  group.add(frame);
}

function buildSkyscraper(group, colliders, x, z, w, d, h, winTex, spire = false, addStorefront = false) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const trimMat = new THREE.MeshLambertMaterial({ color: 0x262d38, flatShading: true });
  const steelMat = new THREE.MeshLambertMaterial({ color: 0x161b22, flatShading: true });
  const snowCapMat = new THREE.MeshLambertMaterial({ color: 0xc2ceda, flatShading: true });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ map: winTex, flatShading: true })
  );
  body.position.y = h * 0.5;
  g.add(body);

  // 3D Vertical Pilaster Ribs + Horizontal Belt Ledges
  const ribSpacing = Math.max(5.0, w * 0.34);
  for (let rx = -w * 0.4; rx <= w * 0.4; rx += ribSpacing) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.45, h, d + 0.42), steelMat);
    rib.position.set(rx, h * 0.5, 0);
    g.add(rib);
  }
  for (let ly = 4.6; ly < h - 2; ly += 10.0) {
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.45, d + 0.6), trimMat);
    ledge.position.y = ly;
    g.add(ledge);
  }

  const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.85, d + 0.7), trimMat);
  parapet.position.y = h + 0.4;
  g.add(parapet);
  const roofSnow = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.22, d + 0.5), snowCapMat);
  roofSnow.position.y = h + 0.92;
  g.add(roofSnow);

  if (addStorefront) {
    const facing = (x < 0) ? 1 : -1;
    const storeGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 3.6, d - 2.4),
      new THREE.MeshBasicMaterial({ color: 0xffd284 })
    );
    storeGlass.position.set(facing * (w * 0.5 + 0.14), 1.9, 0);
    g.add(storeGlass);

    const marquee = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, d - 3.0), trimMat);
    marquee.position.set(facing * (w * 0.5 + 1.05), 4.2, 0);
    g.add(marquee);
    const marqueeTrim = new THREE.Mesh(
      new THREE.BoxGeometry(2.26, 0.16, d - 2.9),
      new THREE.MeshBasicMaterial({ color: 0xffdd78 })
    );
    marqueeTrim.position.set(facing * (w * 0.5 + 1.05), 4.2, 0);
    g.add(marqueeTrim);
  }

  if (spire) {
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.65, h * 0.22, d * 0.65),
      new THREE.MeshLambertMaterial({ map: winTex, flatShading: true })
    );
    crown.position.y = h + h * 0.11;
    g.add(crown);
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.7, 22, 6),
      new THREE.MeshLambertMaterial({ color: 0x455060, flatShading: true })
    );
    mast.position.y = h + h * 0.22 + 11;
    g.add(mast);
  }

  group.add(g);
  if (colliders) {
    addCol(colliders, x - w * 0.5 - 0.3, x + w * 0.5 + 0.3, z - d * 0.5 - 0.3, z + d * 0.5 + 0.3);
  }
}

function buildDetailedBrownstone(group, colliders, bx, bz, bw, bd, floors, facingX, wallTex, snowMat, doorMat, winDarkMat, winLitMat) {
  const trimMat = new THREE.MeshLambertMaterial({ color: 0x3a3430, flatShading: true });
  const ironMat = new THREE.MeshLambertMaterial({ color: 0x181a1e, flatShading: true });
  const awningMat = new THREE.MeshLambertMaterial({ color: 0x2f3842, flatShading: true });
  const bh = floors * 3.8;

  const b = new THREE.Group();
  b.position.set(bx, 0, bz);

  const wallMat = new THREE.MeshLambertMaterial({ map: wallTex, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd - 0.15), wallMat);
  body.position.y = bh * 0.5;
  b.add(body);

  // Door + Stoop
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.75, 1.75), trimMat);
  doorFrame.position.set(facingX * (bw * 0.5 + 0.04), 1.48, 0);
  b.add(doorFrame);
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.45, 1.40), doorMat);
  doorPanel.position.set(facingX * (bw * 0.5 + 0.14), 1.42, 0);
  b.add(doorPanel);
  const stoop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 2.3), trimMat);
  stoop.position.set(facingX * (bw * 0.5 + 0.55), 0.18, 0);
  b.add(stoop);

  // Multi-pane windows + sills + fire escape
  for (let f = 0; f < floors; f++) {
    const wy = 2.05 + f * 3.8;
    [-3.4, 3.4].forEach(wz => {
      const wFrame = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.95, 1.55), trimMat);
      wFrame.position.set(facingX * (bw * 0.5 + 0.04), wy, wz);
      b.add(wFrame);
      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.70, 1.30), f === 0 ? winLitMat : winDarkMat);
      pane.position.set(facingX * (bw * 0.5 + 0.13), wy, wz);
      b.add(pane);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 1.72), trimMat);
      sill.position.set(facingX * (bw * 0.5 + 0.14), wy - 0.98, wz);
      b.add(sill);
    });
    if (f >= 1) {
      const balc = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 4.0), ironMat);
      balc.position.set(facingX * (bw * 0.5 + 0.48), wy - 1.05, 0);
      b.add(balc);
    }
  }

  const awning = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.28, bd - 1.4), awningMat);
  awning.position.set(facingX * (bw * 0.5 + 0.75), 3.35, 0);
  awning.rotation.z = facingX * -0.24;
  b.add(awning);
  const awningSnow = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.14, bd - 1.5), snowMat);
  awningSnow.position.set(facingX * (bw * 0.5 + 0.75), 3.52, 0);
  awningSnow.rotation.z = facingX * -0.24;
  b.add(awningSnow);

  const cornice = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.5, 0.55, bd + 0.2), trimMat);
  cornice.position.y = bh + 0.2;
  b.add(cornice);
  const roofSnow = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.4, 0.22, bd + 0.1), snowMat);
  roofSnow.position.y = bh + 0.54;
  b.add(roofSnow);

  group.add(b);
  addCol(colliders, bx - bw * 0.5 - 0.3, bx + bw * 0.5 + 0.3, bz - bd * 0.5, bz + bd * 0.5);
}

function buildSubwayStation(group, colliders, concTex, gridTileTex, graffitiTileTex, signTex, arrivalTex) {
  // Walkable Underground 42nd St Subway at x = -21.0, z = -10.0 (facing +Z)
  const sub = new THREE.Group();
  const sx = -21.0;
  const sz = -10.0;
  sub.position.set(sx, 0, sz);

  const ironMat = new THREE.MeshLambertMaterial({ color: 0x161b18, flatShading: true });
  const concMat = new THREE.MeshLambertMaterial({ map: concTex, flatShading: true });
  const tileMat = new THREE.MeshLambertMaterial({ map: gridTileTex, flatShading: true });
  const grafMat = new THREE.MeshLambertMaterial({ map: graffitiTileTex, flatShading: true });
  const floorTileMat = new THREE.MeshLambertMaterial({ map: makeBrickTex(82, 58, 46), flatShading: true });

  // Priority 2 GLB: Iconic NYC Street-Level Subway Entrance (railings, twin emerald globes, 42 ST marquee)
  placeModularNYCBuilding(sub, null, '/models/nyc_subway_entrance.glb', 0, 0, 0, 1.0, 1.0, 1.0);

  const greenGlow = new THREE.PointLight(0x28ff78, 2.4, 18);
  greenGlow.position.set(0, 3.0, 0.6);
  sub.add(greenGlow);

  const arrivalBoard = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.25, 0.18), new THREE.MeshBasicMaterial({ map: arrivalTex }));
  arrivalBoard.position.set(0, 4.2, 0.05);
  sub.add(arrivalBoard);

  // Flight 1 (z = 0 to -6, y = 0 to -2.2)
  for (let i = 0; i < 12; i++) {
    const frac = (i + 0.5) / 12;
    const step = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.24, 6.0 / 12 + 0.08), concMat);
    step.position.set(0, -frac * 2.2 - 0.1, -frac * 6.0);
    sub.add(step);
  }
  [-2.35, 2.35].forEach(wx => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.6, 9.2), concMat);
    wall.position.set(wx, -1.2, -4.6);
    sub.add(wall);
    const handrail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 6.5, 6), ironMat);
    handrail.rotation.x = Math.PI * 0.5 - 0.35;
    handrail.position.set(wx * 0.86, -0.35, -3.0);
    sub.add(handrail);
  });
  const midLanding = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.3, 3.2), concMat);
  midLanding.position.set(0, -2.35, -7.5);
  sub.add(midLanding);

  // Flight 2 (z = -9 to -12.5, y = -2.2 to -3.4)
  for (let i = 0; i < 8; i++) {
    const frac = (i + 0.5) / 8;
    const step = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.22, 3.5 / 8 + 0.08), floorTileMat);
    step.position.set(0, -2.2 - frac * 1.2 - 0.1, -9.0 - frac * 3.5);
    sub.add(step);
  }

  // Concourse & Enterable Subway Train (z = -12.5 to -24.5, y = -3.4)
  const platFloor = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.3, 12.6), floorTileMat);
  platFloor.position.set(0, -3.55, -18.5);
  sub.add(platFloor);
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(10.8, 4.2, 0.4), grafMat);
  backWall.position.set(0, -1.5, -24.6);
  sub.add(backWall);
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 12.6), tileMat);
  rightWall.position.set(5.1, -1.5, -18.5);
  sub.add(rightWall);
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.3, 15.6), ironMat);
  ceiling.position.set(0, 0.35, -17.0);
  sub.add(ceiling);

  [-14.5, -18.5, -22.0].forEach(lz => {
    const tube = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.22), new THREE.MeshBasicMaterial({ color: 0xe6f8ee }));
    tube.position.set(0, 0.15, lz);
    sub.add(tube);
  });
  const subLight = new THREE.PointLight(0xd8f0dc, 2.8, 24);
  subLight.position.set(0, -0.5, -18.5);
  sub.add(subLight);

  // Priority 2 GLB: Enterable MTA Stainless Subway Train Car & Concourse Turnstiles
  const trainSlot = placeModularNYCBuilding(sub, null, '/models/nyc_subway_train.glb', -7.0, -18.5, 0, 1.0, 1.0, 1.0);
  trainSlot.position.y = -3.42;

  const turnstileSlot = placeModularNYCBuilding(sub, null, '/models/nyc_subway_turnstile.glb', 2.8, -14.2, 0, 1.0, 1.0, 1.0);
  turnstileSlot.position.y = -3.40;
  addCol(colliders, sx + 1.4, sx + 4.2, sz - 14.7, sz - 13.7);

  addCol(colliders, sx - 2.6, sx - 2.1, sz - 12.6, sz + 0.4);
  addCol(colliders, sx + 2.1, sx + 2.6, sz - 12.6, sz + 0.4);
  addCol(colliders, sx + 4.7, sx + 5.4, sz - 24.6, sz - 12.2);
  addCol(colliders, sx - 8.8, sx - 8.2, sz - 24.6, sz - 12.2);

  // Inter-City Underground Subway Tunnel (z = -35.2 to -108.5) + North Midtown Station (z = -121.0)
  const tunnelLen = 73.3;
  const tunnelMidZ = -71.85;
  const tunFloor = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.3, tunnelLen), floorTileMat);
  tunFloor.position.set(0, -3.55, tunnelMidZ - sz);
  sub.add(tunFloor);
  const tunCeil = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.3, tunnelLen), ironMat);
  tunCeil.position.set(-1.5, 0.35, tunnelMidZ - sz);
  sub.add(tunCeil);
  const tunRight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, tunnelLen), tileMat);
  tunRight.position.set(4.1, -1.5, tunnelMidZ - sz);
  sub.add(tunRight);
  const tunLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, tunnelLen), grafMat);
  tunLeft.position.set(-8.5, -1.5, tunnelMidZ - sz);
  sub.add(tunLeft);
  for (let lz = -38; lz >= -106; lz -= 8) {
    const tube = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.22), new THREE.MeshBasicMaterial({ color: 0xe6f8ee }));
    tube.position.set(0, 0.15, lz - sz);
    sub.add(tube);
  }
  addCol(colliders, sx + 3.8, sx + 4.5, -108.5, -35.2);
  addCol(colliders, sx - 8.8, sx - 8.2, -108.5, -35.2);

  // North Station Entrance & Stairs (z = -121.0 -> -108.5)
  const northEntrance = placeModularNYCBuilding(sub, null, '/models/nyc_subway_entrance.glb', 0, -121.0 - sz, Math.PI, 1.0, 1.0, 1.0);
  northEntrance.position.y = 0;
  for (let i = 0; i < 12; i++) {
    const frac = (i + 0.5) / 12;
    const step = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.24, 6.0 / 12 + 0.08), concMat);
    step.position.set(0, -frac * 2.2 - 0.1, (-121.0 + frac * 6.0) - sz);
    sub.add(step);
  }
  const northMid = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.3, 3.2), concMat);
  northMid.position.set(0, -2.35, -113.5 - sz);
  sub.add(northMid);
  for (let i = 0; i < 8; i++) {
    const frac = (i + 0.5) / 8;
    const step = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.22, 3.5 / 8 + 0.08), floorTileMat);
    step.position.set(0, -2.2 - frac * 1.2 - 0.1, (-112.0 + frac * 3.5) - sz);
    sub.add(step);
  }
  addCol(colliders, sx - 2.6, sx - 2.1, -121.4, -108.5);
  addCol(colliders, sx + 2.1, sx + 2.6, -121.4, -108.5);

  // Animated Moving Inter-City Express Subway Train gliding on adjacent underground track (x = -25.4)
  expressSubwayTrain = placeModularNYCBuilding(sub, null, '/models/nyc_subway_train.glb', -4.4, -68.0 - sz, 0, 0.95, 0.95, 0.95);
  expressSubwayTrain.position.y = -3.42;

  group.add(sub);
}

function spawnCivicIntoSlot(slot) {
  if (!civicTemplate || !slot || slot.filled) return;
  slot.filled = true;
  const clone = civicTemplate.clone(true);
  const paintColor = slot.type === 'cab' ? 0xe5a918 : (slot.type === 'suv' ? 0x202630 : 0x76808c);
  clone.traverse((c) => {
    if (c.isMesh && c.material) {
      const mName = (c.material.name || '').toLowerCase();
      const nName = (c.name || '').toLowerCase();
      if (!mName.includes('glass') && !mName.includes('tire') && !mName.includes('wheel') &&
          !mName.includes('chrome') && !mName.includes('light') && !nName.includes('glass') &&
          !nName.includes('wheel') && !nName.includes('tire')) {
        c.material = c.material.clone();
        c.material.color.setHex(paintColor);
      }
    }
  });
  slot.group.add(clone);
  if (slot.type === 'cab') {
    const taxiSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.20, 0.30),
      new THREE.MeshBasicMaterial({ color: 0xffe066 })
    );
    taxiSign.position.set(0, 1.98, 0.1);
    slot.group.add(taxiSign);
  }
}

function buildDetailedPS2Vehicle(group, colliders, x, z, rotY, type = 'cab') {
  const v = new THREE.Group();
  v.position.set(x, 0, z);
  v.rotation.y = rotY;
  group.add(v);

  const slot = { group: v, type, filled: false };
  pendingCarSlots.push(slot);

  if (civicTemplate) {
    spawnCivicIntoSlot(slot);
  } else if (!civicLoading && typeof THREE.GLTFLoader !== 'undefined') {
    civicLoading = true;
    const loader = new THREE.GLTFLoader();
    loader.load('/models/honda_civic_1985_ps2.glb', (gltf) => {
      const model = gltf.scene;
      model.scale.set(1.58, 1.58, 1.58);
      const box = new THREE.Box3().setFromObject(model);
      model.position.y = -box.min.y;
      civicTemplate = model;
      pendingCarSlots.forEach(s => spawnCivicIntoSlot(s));
    });
  }

  const hw = Math.abs(Math.cos(rotY)) * 1.15 + Math.abs(Math.sin(rotY)) * 2.35;
  const hd = Math.abs(Math.sin(rotY)) * 1.15 + Math.abs(Math.cos(rotY)) * 2.35;
  addCol(colliders, x - hw, x + hw, z - hd, z + hd);
}

function buildCentralParkWinter(group, colliders, snowMat) {
  // Hutan Kota Manhattan / Snowy Central Park Forest (East-North District: x: +72..+208, z: -120..+24)
  const parkLawn = new THREE.Mesh(
    new THREE.PlaneGeometry(136, 144),
    new THREE.MeshLambertMaterial({ color: 0xa4b4c4, flatShading: true })
  );
  parkLawn.rotation.x = -Math.PI / 2;
  parkLawn.position.set(140, 0.04, -48);
  group.add(parkLawn);

  // Winding Park Trails (North-South & East-West gravel/snow paths)
  const pathMat = new THREE.MeshLambertMaterial({ color: 0x5c636c, flatShading: true });
  const nsPath = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 136), pathMat);
  nsPath.rotation.x = -Math.PI / 2;
  nsPath.position.set(104, 0.055, -48);
  group.add(nsPath);
  const ewPath = new THREE.Mesh(new THREE.PlaneGeometry(128, 5.2), pathMat);
  ewPath.rotation.x = -Math.PI / 2;
  ewPath.position.set(138, 0.055, -36);
  group.add(ewPath);

  // Low Stone Park Perimeter Wall along East Ave (x = +72.5) with arched openings
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x6b665c, flatShading: true });
  [[-118, -44], [-28, 20]].forEach(([z0, z1]) => {
    const len = z1 - z0;
    const wMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.15, len), wallMat);
    wMesh.position.set(72.5, 0.58, (z0 + z1) * 0.5);
    group.add(wMesh);
    addCol(colliders, 71.9, 73.1, z0, z1);
  });

  // Frozen Central Park Lake / Reservoir
  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(18, 20),
    new THREE.MeshLambertMaterial({ color: 0x4f7490, flatShading: true })
  );
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(138, 0.06, -56);
  group.add(pond);

  // Wooden Footbridge & Gazebo Edge over Frozen Pond
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x4f3524, flatShading: true });
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(12, 0.35, 3.2), woodMat);
  bridge.position.set(122, 0.25, -56);
  group.add(bridge);

  // Dense City Forest: 68 Layered Snowy Evergreen Trees (winter_tree.glb)
  for (let i = 0; i < 68; i++) {
    const tx = 77 + ((i * 29) % 124);
    const tz = -114 + ((i * 23) % 132);
    // Keep frozen lake & main walking trails clear
    if (Math.hypot(tx - 138, tz + 56) < 20.5) continue;
    if (Math.abs(tx - 104) < 4.2 || Math.abs(tz + 36) < 4.0) continue;
    const s = 0.85 + (i % 5) * 0.14;
    placeModularNYCBuilding(group, colliders, '/models/winter_tree.glb', tx, tz, (i * 1.17) % (Math.PI * 2), s, s, s, 0.65, 0.65);
  }

  // Snowy Forest Boulders
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x5c646d, flatShading: true });
  [[92, -62, 2.2], [116, -24, 1.8], [164, -84, 2.6], [156, -12, 2.0]].forEach(([rx, rz, rs]) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rs, 0), rockMat);
    rock.position.set(rx, rs * 0.45, rz);
    rock.scale.set(1.3, 0.7, 1.1);
    group.add(rock);
    addCol(colliders, rx - rs, rx + rs, rz - rs, rz + rs);
  });

  // Park Benches & Warm Forest Lanterns along the Trails
  [[100, -56, Math.PI / 2], [100, -16, Math.PI / 2], [118, -32, 0], [152, -32, 0], [128, -74, Math.PI]].forEach(([bx, bz, rot]) => {
    placeModularNYCBuilding(group, colliders, '/models/nyc_park_bench.glb', bx, bz, rot, 1.0, 1.0, 1.0, 1.25, 0.45);
  });
  [[100, -76], [100, -36], [100, 4], [138, -32]].forEach(([lx, lz]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.6, 6), new THREE.MeshLambertMaterial({ color: 0x18221c }));
    pole.position.set(lx, 1.8, lz);
    group.add(pole);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffdf9a }));
    lantern.position.set(lx, 3.75, lz);
    group.add(lantern);
  });
}

function buildGrandCentralAndLiberty(group, colliders, stoneTex, snowMat) {
  // Grand Central Terminal at South Broadway (z = +132)
  const gc = new THREE.Group();
  gc.position.set(0, 0, 132);
  const stoneMat = new THREE.MeshLambertMaterial({ map: stoneTex, color: 0xa89b80, flatShading: true });
  const trimMat = new THREE.MeshLambertMaterial({ color: 0x6e6452, flatShading: true });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe099 });
  const ironMat = new THREE.MeshLambertMaterial({ color: 0x1e2228, flatShading: true });

  const main = new THREE.Mesh(new THREE.BoxGeometry(36, 17, 12), stoneMat);
  main.position.y = 8.5;
  gc.add(main);
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(37.5, 1.2, 13.0), trimMat);
  cornice.position.y = 17.2;
  gc.add(cornice);
  const roofSnow = new THREE.Mesh(new THREE.BoxGeometry(37.4, 0.35, 12.8), snowMat);
  roofSnow.position.y = 17.95;
  gc.add(roofSnow);

  [-14, -6.5, -3.2, 3.2, 6.5, 14].forEach(cx => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.78, 14.5, 8), trimMat);
    col.position.set(cx, 7.25, -6.3);
    gc.add(col);
  });
  [-10.2, 0, 10.2].forEach(ax => {
    const archGlass = new THREE.Mesh(new THREE.BoxGeometry(5.2, 11.2, 0.35), glowMat);
    archGlass.position.set(ax, 5.8, -6.05);
    gc.add(archGlass);
    const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.22, 11.2, 0.45), ironMat);
    mullionV.position.set(ax, 5.8, -6.12);
    gc.add(mullionV);
  });
  const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.78, 12), glowMat);
  clockFace.rotation.x = Math.PI * 0.5;
  clockFace.position.set(0, 14.8, -6.25);
  gc.add(clockFace);
  group.add(gc);
  addCol(colliders, -18.5, 18.5, 125.5, 138.5);

  // Battery Park Waterfront Seawall (z = +152) + New York Harbor Sea + Liberty Island
  const seawall = new THREE.Mesh(
    new THREE.BoxGeometry(480, 1.4, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x555b62, flatShading: true })
  );
  seawall.position.set(0, 0.45, 152.0);
  group.add(seawall);
  addCol(colliders, -240, 240, 150.8, 153.2);

  // Dark Icy New York Harbor Ocean Water (z = +153 to +320)
  const harborSea = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 170),
    new THREE.MeshLambertMaterial({ color: 0x162b3c, flatShading: true })
  );
  harborSea.rotation.x = -Math.PI / 2;
  harborSea.position.set(0, -0.35, 238);
  group.add(harborSea);

  // Liberty Island in the Middle of the Sea (z = +198, x = -22)
  const libertyIsland = new THREE.Mesh(
    new THREE.CylinderGeometry(16, 19, 1.6, 12),
    new THREE.MeshLambertMaterial({ color: 0x5d6268, flatShading: true })
  );
  libertyIsland.position.set(-22, -0.1, 198);
  group.add(libertyIsland);
  const islandSnow = new THREE.Mesh(
    new THREE.CylinderGeometry(15.2, 15.8, 0.22, 12),
    snowMat
  );
  islandSnow.position.set(-22, 0.72, 198);
  group.add(islandSnow);

  // Priority 4 GLB: Statue of Liberty standing on Liberty Island in the Sea (facing North toward Manhattan)
  placeModularNYCBuilding(group, null, '/models/statue_of_liberty.glb', -22, 198, Math.PI, 1.45, 1.60, 1.45);

  // Walkable Brooklyn / Harbor Suspension Bridge spanning across NY Harbor Sea (x: 27..37, z: 140..222)
  const bridge = new THREE.Group();
  const deckMat = new THREE.MeshLambertMaterial({ color: 0x3b424c, flatShading: true });
  const steelMat = new THREE.MeshLambertMaterial({ color: 0x252b34, flatShading: true });
  const cableMat = new THREE.MeshLambertMaterial({ color: 0x7a8594, flatShading: true });

  // Approach Ramp (z = 140 -> 156, y = 0 -> 5.2)
  const rampLen = Math.hypot(16.0, 5.2);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.45, rampLen), deckMat);
  ramp.position.set(32, 2.45, 148.0);
  ramp.rotation.x = -Math.atan2(5.2, 16.0);
  bridge.add(ramp);

  // Main Bridge Deck & Outer Harbor Pier Overlook (z = 156 -> 222, y = 5.2)
  const mainDeck = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.55, 66.0), deckMat);
  mainDeck.position.set(32, 4.95, 189.0);
  bridge.add(mainDeck);

  // Bridge Guardrails (left & right) + Colliders
  [27.0, 37.0].forEach((rx) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 66.0), steelMat);
    rail.position.set(rx, 5.7, 189.0);
    bridge.add(rail);
  });
  addCol(colliders, 26.5, 27.3, 140.0, 222.0);
  addCol(colliders, 36.7, 37.5, 140.0, 222.0);
  addCol(colliders, 27.0, 37.0, 221.5, 222.5);

  // Twin Gothic Stone Suspension Towers (z = 158 and z = 200)
  [158, 200].forEach((tz) => {
    [27.2, 36.8].forEach((tx) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(1.8, 26.0, 2.2), trimMat);
      col.position.set(tx, 13.0, tz);
      bridge.add(col);
    });
    const arch = new THREE.Mesh(new THREE.BoxGeometry(11.4, 3.2, 2.0), trimMat);
    arch.position.set(32, 22.5, tz);
    bridge.add(arch);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(11.8, 1.2, 2.4), snowMat);
    crown.position.set(32, 26.2, tz);
    bridge.add(crown);
  });

  // Suspension Cables & Vertical Suspender Ropes
  [27.2, 36.8].forEach((cx) => {
    for (let z = 158; z < 200; z += 4) {
      const t0 = (z - 158) / 42;
      const t1 = (z + 4 - 158) / 42;
      const y0 = 24.5 - Math.sin(t0 * Math.PI) * 14.5;
      const y1 = 24.5 - Math.sin(t1 * Math.PI) * 14.5;
      const segLen = Math.hypot(4, y1 - y0);
      const cable = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, segLen), cableMat);
      cable.position.set(cx, (y0 + y1) * 0.5, z + 2);
      cable.rotation.x = Math.atan2(y0 - y1, 4);
      bridge.add(cable);

      const suspH = Math.max(0.5, y0 - 5.2);
      const susp = new THREE.Mesh(new THREE.BoxGeometry(0.08, suspH, 0.08), cableMat);
      susp.position.set(cx, 5.2 + suspH * 0.5, z);
      bridge.add(susp);
    }
  });

  // Bridge Warm Streetlamps
  for (let lz = 160; lz <= 216; lz += 14) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6), glowMat);
    lamp.position.set(27.5, 7.6, lz);
    bridge.add(lamp);
    const lampR = lamp.clone();
    lampR.position.set(36.5, 7.6, lz);
    bridge.add(lampR);
  }
  group.add(bridge);
}

export function initNYCSnowMap(scene, colliders) {
  if (nycGroup) return nycGroup;

  nycGroup = new THREE.Group();
  nycGroup.name = 'OpenCity_Manhattan_440m';

  const streetTex = makeSnowyStreetTex();
  streetTex.wrapS = streetTex.wrapT = THREE.RepeatWrapping;
  streetTex.repeat.set(1, 28);

  const crossTex = makeSnowyStreetTex();
  crossTex.wrapS = crossTex.wrapT = THREE.RepeatWrapping;
  crossTex.repeat.set(1, 26);

  const plazaTex = makePlazaTileTex();
  plazaTex.wrapS = plazaTex.wrapT = THREE.RepeatWrapping;
  plazaTex.repeat.set(12, 16);

  const brickRed = makeBrickTex(112, 48, 38);
  brickRed.wrapS = brickRed.wrapT = THREE.RepeatWrapping;
  brickRed.repeat.set(3, 3);

  const brickCream = makeBrickTex(124, 114, 98);
  brickCream.wrapS = brickCream.wrapT = THREE.RepeatWrapping;
  brickCream.repeat.set(3, 3);

  const concTex = makeBrickTex(88, 90, 82);
  concTex.wrapS = concTex.wrapT = THREE.RepeatWrapping;
  concTex.repeat.set(3, 3);

  const gridTileTex = makeSubwayGridTileTex(false);
  gridTileTex.wrapS = gridTileTex.wrapT = THREE.RepeatWrapping;
  gridTileTex.repeat.set(3, 1.5);

  const doorMat = new THREE.MeshLambertMaterial({ map: makeDoorTex(), flatShading: true });
  const winDarkMat = new THREE.MeshLambertMaterial({ map: makeWindowPaneTex(false), flatShading: true });
  const winLitMat = new THREE.MeshLambertMaterial({ map: makeWindowPaneTex(true), emissive: 0x3b2a12, flatShading: true });

  const winGold = makeTowerWindowsTex('#ffde8f');
  const winBlue = makeTowerWindowsTex('#9fd8f5');
  const snowMat = new THREE.MeshLambertMaterial({ color: 0xc2ceda, flatShading: true });

  // 1. Full 480x480 Manhattan Ground Base (with cutout for Subway stairwell x:[-23.5,-18.5], z:[-10,-35.2])
  const baseMat = new THREE.MeshLambertMaterial({ color: 0x2e3640, flatShading: true });
  const addFloorTile = (minX, maxX, minZ, maxZ) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX, maxZ - minZ), baseMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((minX + maxX) * 0.5, 0.0, (minZ + maxZ) * 0.5);
    m.receiveShadow = true;
    nycGroup.add(m);
  };
  addFloorTile(-240, 240, -10.0, 152.0);
  addFloorTile(-240, -23.5, -240, -10.0);
  addFloorTile(-18.5, 240, -240, -10.0);
  addFloorTile(-23.5, -18.5, -108.5, -35.2);
  addFloorTile(-23.5, -18.5, -240, -121.0);

  // 3 North-South Avenues (West -56, Central Broadway 0, East +56, ending at Battery Park Seawall z = +152)
  [-56, 0, 56].forEach(ax => {
    const ave = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 332),
      new THREE.MeshLambertMaterial({ map: streetTex, flatShading: true })
    );
    ave.rotation.x = -Math.PI / 2;
    ave.position.set(ax, 0.015, -14.0);
    ave.receiveShadow = true;
    nycGroup.add(ave);
  });

  // 5 East-West Cross Streets (z = -84, -36, +12, +60, +108)
  [-84, -36, 12, 60, 108].forEach(cz => {
    const cs = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 340),
      new THREE.MeshLambertMaterial({ map: crossTex, flatShading: true })
    );
    cs.rotation.x = -Math.PI / 2;
    cs.rotation.z = Math.PI * 0.5;
    cs.position.set(0, 0.012, cz);
    cs.receiveShadow = true;
    nycGroup.add(cs);
  });

  // Raised Sidewalks along avenues (cut cleanly around Subway at x:[-23.5,-18.5], z:[-10,-35.2])
  const swMat = new THREE.MeshLambertMaterial({ color: 0x3d444e, flatShading: true });
  const addSW = (minX, maxX, minZ, maxZ) => {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, 0.14, maxZ - minZ), swMat);
    sw.position.set((minX + maxX) * 0.5, 0.07, (minZ + maxZ) * 0.5);
    sw.receiveShadow = true;
    nycGroup.add(sw);
  };
  addSW(14, 42, -72, -48);
  addSW(14, 42, -24, 0);
  addSW(14, 42, 24, 48);
  addSW(14, 42, 72, 96);
  addSW(-42, -14, -72, -48);
  addSW(-42, -14, 24, 48);
  addSW(-42, -14, 72, 96);
  addSW(70, 98, 24, 48);
  addSW(70, 98, 72, 96);
  addSW(-98, -70, -72, -48);
  addSW(-98, -70, -24, 0);
  addSW(-98, -70, 24, 48);
  addSW(-98, -70, 72, 96);
  // West Times Square Sidewalk cleanly cut around Subway entrance
  addSW(-42, -14, -10.0, 0.0);
  addSW(-42, -23.5, -24.0, -10.0);
  addSW(-18.5, -14, -24.0, -10.0);

  // Times Square Wet Snowy Plaza
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 36),
    new THREE.MeshLambertMaterial({ map: plazaTex, flatShading: true })
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.025, -6);
  nycGroup.add(plaza);

  // 2. ONE TIMES SQUARE + WALKABLE TKTS RED STAIRS & DECK (z = -24 to -52)
  const oneTS = new THREE.Group();
  oneTS.position.set(0, 0, -49);
  const towerBody = new THREE.Mesh(new THREE.BoxGeometry(13, 66, 12), new THREE.MeshLambertMaterial({ color: 0x1a2029, flatShading: true }));
  towerBody.position.y = 33;
  oneTS.add(towerBody);
  nycGroup.add(oneTS);
  addCol(colliders, -6.8, 6.8, -55.2, -42.8);

  const adPrud = makeAdTex('PRUDENTIAL', 'RETIREMENT TRIVIA • NYC', '#0b2294', '#1638c4');
  const adHSBC = makeAdTex('3.00% APY', 'HSBC DIRECT • NYC', '#111216', '#231618', '#ff6a2a');
  const adSams = makeAdTex('SAMSUNG', 'TIMES SQUARE LIVE HD', '#0640b8', '#00a8ff', '#ffffff', '#ffdf6b');
  const adCoke = makeAdTex('COCA-COLA', 'SHARE A COKE IN NYC', '#9e0b14', '#d91a24');
  const adVeri = makeAdTex('A GIFT AS THE', 'VERIZON • NYC WINTER', '#dce4ec', '#b6c6d6', '#182436');
  const adSnap = makeAdTex('ONE LOVE', 'SNAP ON • TIMES SQUARE', '#a61472', '#f5189c');
  const adChic = makeAdTex('CHICAGO', 'BROADWAY MUSICAL', '#8a0e18', '#141418', '#ffd24d', '#ff2a38');
  const adDisn = makeAdTex('DISNEY', 'TIGER\'S APPRENTICE', '#c44a14', '#5c1488', '#ffd84d', '#38e8ff');

  addScreen(nycGroup, 0, 50.5, -42.8, 11.4, 7.2, 0, adPrud, 0x3868ff);
  addScreen(nycGroup, 0, 42.2, -42.8, 11.4, 7.2, 0, adHSBC, 0xff5522);
  addScreen(nycGroup, 0, 33.6, -42.8, 11.4, 7.8, 0, adSams, 0x22aaff);
  addScreen(nycGroup, 0, 24.6, -42.8, 11.4, 8.2, 0, adCoke, 0xff2233);

  const redStepMat = new THREE.MeshLambertMaterial({ color: 0xa81822, flatShading: true });
  for (let i = 0; i < 12; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.35, 0.72), redStepMat);
    step.position.set(0, 0.18 + i * 0.28, -24.5 - i * 0.68);
    nycGroup.add(step);
  }
  const tktsDeck = new THREE.Mesh(new THREE.BoxGeometry(11.4, 3.36, 7.2), new THREE.MeshLambertMaterial({ color: 0x3b181d, flatShading: true }));
  tktsDeck.position.set(0, 1.68, -36.1);
  nycGroup.add(tktsDeck);
  const deckSnow = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.12, 6.8), snowMat);
  deckSnow.position.set(0, 3.40, -36.1);
  nycGroup.add(deckSnow);

  // Curved LEDs
  const curveWest = new THREE.Mesh(
    new THREE.CylinderGeometry(8.5, 8.5, 15.0, 12, 1, true, 0.25, 1.35),
    new THREE.MeshBasicMaterial({ map: adVeri, side: THREE.DoubleSide })
  );
  curveWest.position.set(-28, 17, -14);
  nycGroup.add(curveWest);

  // 3. WALKABLE UNDERGROUND 42ND ST SUBWAY
  buildSubwayStation(nycGroup, colliders, concTex, gridTileTex, makeSubwayGridTileTex(true), makeSubwaySignTex(), makeAdTex('42 ST LIVE', 'PELHAM 2m • BKLYN 5m', '#050811', '#141a28', '#38ff8c'));

  // 4. MIDTOWN & FINANCIAL DISTRICT SKYSCRAPERS & BRICK APARTMENTS (Priority 1 GLB Modular Kit)
  const blockCenters = [
    [-28, -60, 58, true], [28, -60, 68, true], [-28, -14, 46, false], [28, -14, 52, false],
    [28, 36, 48, false], [-28, 84, 54, false], [28, 84, 62, true],
    [-86, -60, 52, false], [-86, -14, 48, false], [-86, 84, 60, true],
    [86, 36, 56, false], [86, 84, 72, true]
  ];
  blockCenters.forEach(([bx, bz, bh, hasSpire], idx) => {
    const faceAvenueRot = bx < 0 ? Math.PI / 2 : -Math.PI / 2;
    if (hasSpire || Math.abs(bx) === 28 && bz < 0) {
      // High-rise glass curtain-wall skyscraper (18x18x65m base)
      const sy = bh / 58.0;
      placeModularNYCBuilding(nycGroup, colliders, '/models/nyc_skyscraper_glass.glb', bx, bz, faceAvenueRot, 1.15, sy, 1.10, 10.6, 10.2);
    } else if (idx % 3 === 1) {
      // Corner storefront building + mid-rise brick apartment pair
      placeModularNYCBuilding(nycGroup, colliders, '/models/nyc_storefront_corner.glb', bx, bz - 4.5, faceAvenueRot, 1.45, 1.25, 1.15, 9.0, 7.0);
      placeModularNYCBuilding(nycGroup, colliders, '/models/nyc_apartment_brick.glb', bx, bz + 6.5, faceAvenueRot, 1.25, 1.15, 1.0, 9.0, 6.2);
    } else {
      // Detailed NYC brick apartment with fire escape & rooftop water tower
      placeModularNYCBuilding(nycGroup, colliders, '/models/nyc_apartment_brick.glb', bx, bz, faceAvenueRot, 1.45, bh / 24.0, 1.45, 10.4, 9.0);
    }
    if (Math.abs(bx) === 28 && bz >= -60 && bz <= 84) {
      const rot = bx < 0 ? Math.PI / 2 : -Math.PI / 2;
      const sx = bx < 0 ? bx + 10.8 : bx - 10.8;
      addScreen(nycGroup, sx, 10.5, bz, 15, 7.5, rot, idx % 2 === 0 ? adDisn : adSnap, 0xff5599);
      addScreen(nycGroup, sx, 19.5, bz, 14, 7.0, rot, idx % 2 === 0 ? adChic : adSams, 0x38aaff);
      addScreen(nycGroup, sx, 28.5, bz, 12, 6.0, rot, idx % 2 === 0 ? adVeri : adDisn, 0xffd055);
      // Broadway-facing corner LED ticker
      const faceZ = bz < 0 ? bz + 10.6 : bz - 10.6;
      const rotZ = bz < 0 ? 0 : Math.PI;
      addScreen(nycGroup, bx, 13.0, faceZ, 12, 6.0, rotZ, idx % 2 === 0 ? adSams : adVeri, 0x55ffaa);
    }
  });

  // Towering Empire State & One WTC Silhouettes in Distant Snowy Fog (Full Skyline Ring)
  [
    [-20, -118, 0, 1.45, 1.85, 1.40],
    [34, -124, Math.PI / 2, 1.40, 1.95, 1.40],
    [-88, -116, 0, 1.30, 1.35, 1.25],
    [88, -120, Math.PI, 1.35, 1.55, 1.30],
    [-132, -72, Math.PI / 2, 1.30, 1.30, 1.30],
    [-132, 36, Math.PI / 2, 1.25, 1.20, 1.25],
    [132, 84, -Math.PI / 2, 1.35, 1.45, 1.35],
    [-46, 132, 0, 1.30, 1.25, 1.25],
    [46, 132, 0, 1.30, 1.35, 1.25]
  ].forEach(([sx, sz, srot, scx, scy, scz]) => {
    placeModularNYCBuilding(nycGroup, null, '/models/nyc_skyscraper_glass.glb', sx, sz, srot, scx, scy, scz);
  });

  // 5. HELL'S KITCHEN BROWNSTONE, APARTMENT & CORNER STOREFRONT DISTRICTS (Expanded Dense City Blocks)
  [-28, -86].forEach((bx) => {
    const rot = bx < 0 ? Math.PI / 2 : -Math.PI / 2;
    placeModularNYCBuilding(nycGroup, colliders, '/models/nyc_brownstone.glb', bx, 28, rot, 1.35, 1.15, 1.20, 7.0, 6.2);
    placeModularNYCBuilding(nycGroup, colliders, '/models/nyc_brownstone.glb', bx, 40, rot, 1.35, 1.25, 1.20, 7.0, 6.2);
    placeModularNYCBuilding(nycGroup, colliders, '/models/nyc_storefront_corner.glb', bx, 53, rot, 1.20, 1.10, 1.10, 7.4, 6.8);
  });

  // Additional Outer Avenue Apartment, Brownstone & Corner Blocks (x = ±118, ±86, ±28)
  [
    [-118, -60, '/models/nyc_apartment_brick.glb', Math.PI / 2, 1.35, 1.25, 1.35, 9.6, 8.2],
    [-118, -14, '/models/nyc_brownstone.glb', Math.PI / 2, 1.35, 1.20, 1.25, 7.0, 6.4],
    [-118, 36, '/models/nyc_storefront_corner.glb', Math.PI / 2, 1.25, 1.15, 1.20, 7.6, 7.2],
    [-118, 84, '/models/nyc_apartment_brick.glb', Math.PI / 2, 1.35, 1.30, 1.35, 9.6, 8.2],
    [118, 36, '/models/nyc_apartment_brick.glb', -Math.PI / 2, 1.35, 1.20, 1.35, 9.6, 8.2],
    [118, 84, '/models/nyc_storefront_corner.glb', -Math.PI / 2, 1.25, 1.15, 1.20, 7.6, 7.2],
    [86, -112, '/models/nyc_apartment_brick.glb', 0, 1.40, 1.35, 1.35, 9.8, 8.2],
    [-86, 118, '/models/nyc_apartment_brick.glb', Math.PI, 1.40, 1.25, 1.35, 9.8, 8.2],
    [86, 118, '/models/nyc_brownstone.glb', Math.PI, 1.35, 1.20, 1.25, 7.0, 6.4]
  ].forEach(([bx, bz, url, rot, scx, scy, scz, hw, hd]) => {
    placeModularNYCBuilding(nycGroup, colliders, url, bx, bz, rot, scx, scy, scz, hw, hd);
  });

  // 6. CENTRAL PARK WINTER (East-North)
  buildCentralParkWinter(nycGroup, colliders, snowMat);

  // 7. GRAND CENTRAL & STATUE OF LIBERTY
  buildGrandCentralAndLiberty(nycGroup, colliders, brickCream, snowMat);

  // 8. AUTHENTIC NYC TAXIS, NYPD CRUISERS & PS2 CARS ALONG ALL 3 AVENUES
  [
    [-8, 6, 0.05, 'cab'], [8, -4, Math.PI - 0.05, 'police'],
    [-8, 34, -0.05, 'sedan'], [8, 42, Math.PI + 0.04, 'cab'],
    [-50, 22, 0.04, 'police'], [-62, -24, Math.PI, 'cab'],
    [50, 26, 0.06, 'cab'], [62, 68, Math.PI - 0.04, 'police'],
    [-8, -54, 0.03, 'cab'], [8, 76, Math.PI, 'suv']
  ].forEach(([cx, cz, crot, ctype]) => {
    if (ctype === 'cab') {
      placeModularNYCBuilding(nycGroup, colliders, '/models/nyc_taxi_cab.glb', cx, cz, crot, 1.05, 1.05, 1.05, 1.15, 2.35);
    } else if (ctype === 'police') {
      placeModularNYCBuilding(nycGroup, colliders, '/models/nyc_police_car.glb', cx, cz, crot, 1.05, 1.05, 1.05, 1.15, 2.35);
    } else {
      buildDetailedPS2Vehicle(nycGroup, colliders, cx, cz, crot, ctype);
    }
  });

  // 9. STREETLAMPS, TRAFFIC LIGHTS, SIDEWALK PROPS & SWIRLING GOLDEN "KUNANG-KUNANG" LIGHT-SPARKS
  const lampPositions = [
    [-14.5, -24], [14.5, -24], [-14.5, 4], [14.5, 4],
    [-14.5, 32], [14.5, 32], [-14.5, 78], [14.5, 78],
    [-42.5, -14], [-42.5, 34], [42.5, -14], [42.5, 34]
  ];
  const fireflyCountPerLamp = 14;
  const totalFireflies = lampPositions.length * fireflyCountPerLamp;
  const ffPos = new Float32Array(totalFireflies * 3);
  fireflyBasePos = new Float32Array(totalFireflies * 3);
  let ffIdx = 0;

  lampPositions.forEach(([px, pz], lIdx) => {
    const dir = (px < 0 && px > -20) || px < -40 ? 1 : -1;
    // Priority 3 GLB: NYC Traffic Lamp (fluted post, mast arm, cobra head, yellow 3-aspect signal)
    placeModularNYCBuilding(nycGroup, colliders, '/models/nyc_traffic_lamp.glb', px, pz, dir === 1 ? 0 : Math.PI, 1.0, 1.0, 1.0, 0.25, 0.25);

    const hx = px + dir * 3.0;
    const hy = 6.1;

    // Localized light pool
    if (lIdx < 8) {
      const light = new THREE.PointLight(0xffd288, 1.8, 28);
      light.position.set(hx, 5.6, pz);
      nycGroup.add(light);
    }

    // Priority 3 GLB: Sidewalk Props (Hydrant, Wire Trash Bin, USPS Mailbox) at street corners
    if (lIdx % 2 === 0) {
      placeModularNYCBuilding(nycGroup, colliders, '/models/nyc_street_props.glb', px - dir * 1.1, pz + 1.8, Math.PI * 0.5, 1.0, 1.0, 1.0, 0.45, 1.2);
    } else if (lIdx < 6) {
      placeModularNYCBuilding(nycGroup, colliders, '/models/nyc_park_bench.glb', px - dir * 1.3, pz + 2.2, dir === 1 ? Math.PI * 0.5 : -Math.PI * 0.5, 0.9, 0.9, 0.9, 0.45, 1.15);
    }

    // Seed glowing "Kunang-Kunang" light-sparks swirling around each lamp head
    for (let k = 0; k < fireflyCountPerLamp; k++) {
      const bx = hx + (Math.random() - 0.5) * 2.2;
      const by = hy - 0.8 + Math.random() * 1.6;
      const bz = pz + (Math.random() - 0.5) * 2.2;
      ffPos[ffIdx * 3] = bx;
      ffPos[ffIdx * 3 + 1] = by;
      ffPos[ffIdx * 3 + 2] = bz;
      fireflyBasePos[ffIdx * 3] = bx;
      fireflyBasePos[ffIdx * 3 + 1] = by;
      fireflyBasePos[ffIdx * 3 + 2] = bz;
      ffIdx++;
    }
  });

  const ffGeo = new THREE.BufferGeometry();
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const ffMat = new THREE.PointsMaterial({
    color: 0xffe699,
    size: 0.24,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  lampFireflies = new THREE.Points(ffGeo, ffMat);
  nycGroup.add(lampFireflies);

  nycGroup.visible = false;
  scene.add(nycGroup);
  return nycGroup;
}

export function setNYCSnowMapActive(active) {
  if (nycGroup) nycGroup.visible = !!active;
  nycColliders.forEach(c => { c.disabled = !active; });
}

export function updateNYCSnowMapEffects(timeSec) {
  if (!nycGroup || !nycGroup.visible) return;
  if (lampFireflies && fireflyBasePos) {
    const posAttr = lampFireflies.geometry.attributes.position;
    const arr = posAttr.array;
    const count = posAttr.count;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = timeSec * 2.2 + i * 1.37;
      arr[i3] = fireflyBasePos[i3] + Math.sin(phase) * 0.45;
      arr[i3 + 1] = fireflyBasePos[i3 + 1] + Math.cos(phase * 1.3) * 0.32;
      arr[i3 + 2] = fireflyBasePos[i3 + 2] + Math.cos(phase * 0.9) * 0.45;
    }
    posAttr.needsUpdate = true;
  }
  // Animate Inter-City Express Subway Train gliding between 42nd St (z=-35) & North Midtown (z=-105)
  if (expressSubwayTrain) {
    const worldZ = -66 + Math.sin(timeSec * 0.45) * 34;
    expressSubwayTrain.position.z = worldZ - (-10.0);
  }
}
