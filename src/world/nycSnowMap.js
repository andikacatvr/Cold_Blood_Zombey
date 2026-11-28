/* =========================================================================
   SNOWY LOW-POLY PS2 NYC TIMES SQUARE (Detailed Architecture & Atmosphere)
   - Detailed Brick/Stone Brownstones: Doors, Stoops, Multi-Pane Windows, Blinds, Fire Escapes
   - Detailed Grand Central Terminal: Classical Columns, Arched Entrances, Ornate Clock
   - One Times Square Vertical LED Stack + Walkable TKTS Red Stairs + Curved LED Screen
   - Authentic PS2 Cars (honda_civic_1985_ps2.glb + Detailed Wheel/Bumper/Windshield SUVs)
   ========================================================================= */

const THREE = window.THREE;

let nycGroup = null;
const nycColliders = [];
let civicTemplate = null;

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
    ctx.fillStyle = '#4e5864';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const v = 64 + Math.floor(Math.random() * 44);
        ctx.fillStyle = `rgb(${v},${v + 6},${v + 12})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
    // Single avenue dual tire tracks down the road (repeat.x = 1)
    [72, 96, 152, 176].forEach(tx => {
      ctx.fillStyle = 'rgba(20, 24, 30, 0.58)';
      ctx.fillRect(tx, 0, 14, h);
    });
    // Subtle center double yellow line peeking through snow
    ctx.fillStyle = 'rgba(195, 150, 42, 0.45)';
    ctx.fillRect(124, 0, 3, h);
    ctx.fillRect(129, 0, 3, h);
  });
}

function makePlazaTileTex() {
  return makeTex(128, 128, (ctx, w, h) => {
    // Snowy frosted Times Square stone tiles
    ctx.fillStyle = '#5c6978';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      for (let x = 0; x < w; x += 8) {
        const isSnowPatch = Math.random() > 0.42;
        const v = isSnowPatch ? (145 + Math.floor(Math.random() * 45)) : (58 + Math.floor(Math.random() * 28));
        ctx.fillStyle = `rgb(${v},${v + 8},${v + 16})`;
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

function makeWindowPaneTex(isLit = false) {
  return makeTex(64, 96, (ctx, w, h) => {
    ctx.fillStyle = isLit ? '#8a683a' : '#121820';
    ctx.fillRect(0, 0, w, h);
    // Venetian blinds slats (inspired by references/e2d61de...)
    ctx.fillStyle = isLit ? '#cfa45e' : '#242d38';
    for (let y = 6; y < 58; y += 5) {
      ctx.fillRect(4, y, w - 8, 2);
    }
    // Wooden/iron cross mullions
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
    // Upper glass window with posters
    ctx.fillStyle = '#3c4854';
    ctx.fillRect(10, 12, w - 20, 46);
    ctx.fillStyle = '#9c3228';
    ctx.fillRect(16, 22, 16, 22);
    ctx.fillStyle = '#d4b886';
    ctx.fillRect(36, 26, 12, 18);
    // Lower wood panel + brass handle
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

/**
 * Detailed PS2 Brownstone / Brick Building with Doors, Stoops, Multi-Pane Windows, Blinds & Fire Escapes
 */
function buildDetailedBrownstoneRow(group, colliders, sideX, startZ, count, dirZ, brickRed, brickCream, snowMat, doorMat, winDarkMat, winLitMat) {
  const facing = sideX < 0 ? 1 : -1;
  const trimMat = new THREE.MeshLambertMaterial({ color: 0x3a3430, flatShading: true });
  const ironMat = new THREE.MeshLambertMaterial({ color: 0x181a1e, flatShading: true });
  const awningMat = new THREE.MeshLambertMaterial({ color: 0x2f3842, flatShading: true });

  for (let i = 0; i < count; i++) {
    const bw = 12.0;
    const bd = 12.0;
    const floors = 3 + (i % 2);
    const bh = floors * 3.8;
    const bx = sideX;
    const bz = startZ + i * bd * dirZ;

    const b = new THREE.Group();
    b.position.set(bx, 0, bz);

    const wallMat = new THREE.MeshLambertMaterial({
      map: (i % 2 === 0) ? brickRed : brickCream,
      flatShading: true
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd - 0.15), wallMat);
    body.position.y = bh * 0.5;
    b.add(body);

    // Ground-floor Recessed Entrance Door + Concrete Stoop Steps + Transom Light
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.75, 1.75), trimMat);
    doorFrame.position.set(facing * (bw * 0.5 + 0.04), 1.48, 0);
    b.add(doorFrame);

    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.45, 1.40), doorMat);
    doorPanel.position.set(facing * (bw * 0.5 + 0.14), 1.42, 0);
    b.add(doorPanel);

    const stoop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 2.3), trimMat);
    stoop.position.set(facing * (bw * 0.5 + 0.55), 0.18, 0);
    b.add(stoop);

    // Shop / Cafe Windows flanking the door with sills & awnings
    [-3.6, 3.6].forEach(wz => {
      const wFrame = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.1, 2.2), trimMat);
      wFrame.position.set(facing * (bw * 0.5 + 0.04), 1.95, wz);
      b.add(wFrame);

      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.85, 1.95), (i % 2 === 0) ? winLitMat : winDarkMat);
      pane.position.set(facing * (bw * 0.5 + 0.13), 1.95, wz);
      b.add(pane);

      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 2.35), trimMat);
      sill.position.set(facing * (bw * 0.5 + 0.14), 0.88, wz);
      b.add(sill);
    });

    // Upper-Floor Multi-Pane Windows with Protruding Frames & Stone Sills
    for (let f = 1; f < floors; f++) {
      const wy = 2.1 + f * 3.8;
      [-3.6, 0, 3.6].forEach(wz => {
        const wFrame = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.95, 1.55), trimMat);
        wFrame.position.set(facing * (bw * 0.5 + 0.04), wy, wz);
        b.add(wFrame);

        const isLit = ((f + i + Math.round(wz)) % 5 === 0);
        const pane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.70, 1.30), isLit ? winLitMat : winDarkMat);
        pane.position.set(facing * (bw * 0.5 + 0.13), wy, wz);
        b.add(pane);

        const sill = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 1.72), trimMat);
        sill.position.set(facing * (bw * 0.5 + 0.14), wy - 0.98, wz);
        b.add(sill);
      });

      // Iron Fire-Escape Balcony on upper floors
      if (i % 2 === 1) {
        const balc = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 4.2), ironMat);
        balc.position.set(facing * (bw * 0.5 + 0.48), wy - 1.05, 0);
        b.add(balc);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 4.2), ironMat);
        rail.position.set(facing * (bw * 0.5 + 0.92), wy - 0.65, 0);
        b.add(rail);
      }
    }

    // Snowy Shop Awning above Ground Floor
    const awning = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.30, bd - 1.4), awningMat);
    awning.position.set(facing * (bw * 0.5 + 0.78), 3.35, 0);
    awning.rotation.z = facing * -0.24;
    b.add(awning);

    const awningSnow = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.14, bd - 1.5), snowMat);
    awningSnow.position.set(facing * (bw * 0.5 + 0.78), 3.54, 0);
    awningSnow.rotation.z = facing * -0.24;
    b.add(awningSnow);

    // Ornate Roof Cornice + Snow Cap + Chimney
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.6, 0.6, bd + 0.2), trimMat);
    cornice.position.y = bh + 0.22;
    b.add(cornice);

    const roofSnow = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.5, 0.24, bd + 0.1), snowMat);
    roofSnow.position.y = bh + 0.58;
    b.add(roofSnow);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 1.2), wallMat);
    chimney.position.set(-facing * 2.5, bh + 1.2, 2.2);
    b.add(chimney);

    group.add(b);
    addCol(colliders, bx - bw * 0.5 - 0.3, bx + bw * 0.5 + 0.3, bz - bd * 0.5, bz + bd * 0.5);
  }
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

  // 3D Vertical Structural Pilaster Ribs along facade (breaks up flat box silhouette)
  const ribSpacing = Math.max(4.0, w * 0.3);
  for (let rx = -w * 0.42; rx <= w * 0.42; rx += ribSpacing) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.45, h, d + 0.42), steelMat);
    rib.position.set(rx, h * 0.5, 0);
    g.add(rib);
  }
  for (let rz = -d * 0.42; rz <= d * 0.42; rz += ribSpacing) {
    const ribZ = new THREE.Mesh(new THREE.BoxGeometry(w + 0.42, h, 0.45), steelMat);
    ribZ.position.set(0, h * 0.5, rz);
    g.add(ribZ);
  }

  // 3D Horizontal Belt Ledges every 9m
  for (let ly = 4.6; ly < h - 2; ly += 9.0) {
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.65, 0.45, d + 0.65), trimMat);
    ledge.position.y = ly;
    g.add(ledge);
  }

  // Rooftop Parapet, Snow Rim & HVAC / Water Tower
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.9, d + 0.8), trimMat);
  parapet.position.y = h + 0.4;
  g.add(parapet);
  const roofSnow = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.22, d + 0.6), snowCapMat);
  roofSnow.position.y = h + 0.95;
  g.add(roofSnow);

  // Ground-Floor 3D Glass Storefront & Illuminated Marquee Canopy
  if (addStorefront) {
    const facing = (x < 0) ? 1 : -1;
    const storeGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 3.6, d - 2.4),
      new THREE.MeshBasicMaterial({ color: 0xffd284 })
    );
    storeGlass.position.set(facing * (w * 0.5 + 0.14), 1.9, 0);
    g.add(storeGlass);

    // Storefront Mullion Pillars
    for (let pz = -d * 0.4; pz <= d * 0.4; pz += 3.2) {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 0.35), steelMat);
      pil.position.set(facing * (w * 0.5 + 0.22), 2.1, pz);
      g.add(pil);
    }

    // Protruding Illuminated Theater / Shop Marquee Canopy
    const marquee = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, d - 3.0), trimMat);
    marquee.position.set(facing * (w * 0.5 + 1.05), 4.25, 0);
    g.add(marquee);
    const marqueeTrim = new THREE.Mesh(
      new THREE.BoxGeometry(2.26, 0.18, d - 2.9),
      new THREE.MeshBasicMaterial({ color: 0xffdd78 })
    );
    marqueeTrim.position.set(facing * (w * 0.5 + 1.05), 4.25, 0);
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
      new THREE.CylinderGeometry(0.15, 0.6, 16, 6),
      new THREE.MeshLambertMaterial({ color: 0x3b4452, flatShading: true })
    );
    mast.position.y = h + h * 0.22 + 8;
    g.add(mast);
  }

  group.add(g);
  if (colliders) {
    addCol(colliders, x - w * 0.5 - 0.3, x + w * 0.5 + 0.3, z - d * 0.5 - 0.3, z + d * 0.5 + 0.3);
  }
}

/**
 * Detailed PS2 Vehicle: uses authentic honda_civic_1985_ps2.glb when loaded,
 * or detailed multi-part PS2 vehicle with wheels, sloped hood/windshield, grille & bumpers!
 */
function buildDetailedPS2Vehicle(group, colliders, x, z, rotY, type = 'cab') {
  const v = new THREE.Group();
  v.position.set(x, 0, z);
  v.rotation.y = rotY;

  const col = type === 'cab' ? 0xd9a41a : (type === 'suv' ? 0x1b2028 : 0x626b75);
  const bodyMat = new THREE.MeshLambertMaterial({ color: col, flatShading: true });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x151e28, flatShading: true });
  const tireMat = new THREE.MeshLambertMaterial({ color: 0x141618, flatShading: true });
  const rimMat = new THREE.MeshLambertMaterial({ color: 0x8e96a0, flatShading: true });
  const chromeMat = new THREE.MeshLambertMaterial({ color: 0x555c64, flatShading: true });
  const snowMat = new THREE.MeshLambertMaterial({ color: 0xc2ceda, flatShading: true });

  const buildFallback = () => {
    const fb = new THREE.Group();
    // Lower body + sloped hood & trunk
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.58, 4.35), bodyMat);
    lower.position.y = 0.55;
    fb.add(lower);

    // Front & Rear Chrome Bumpers
    const fBump = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.20, 0.22), chromeMat);
    fBump.position.set(0, 0.36, 2.22);
    fb.add(fBump);
    const rBump = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.20, 0.22), chromeMat);
    rBump.position.set(0, 0.36, -2.22);
    fb.add(rBump);

    // Front Grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 0.08), tireMat);
    grille.position.set(0, 0.58, 2.18);
    fb.add(grille);

    // Sloped Cabin + Windshield + Side Windows
    const cabinLen = (type === 'suv') ? 2.6 : 1.95;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.58, cabinLen), bodyMat);
    cabin.position.set(0, 1.10, -0.22);
    fb.add(cabin);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.56, 0.12), glassMat);
    windshield.position.set(0, 1.08, (type === 'suv' ? 1.12 : 0.80));
    windshield.rotation.x = -0.48;
    fb.add(windshield);

    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.42, cabinLen - 0.25), glassMat);
    sideGlass.position.set(0, 1.12, -0.22);
    fb.add(sideGlass);

    // Snow cap on roof & hood
    const roofSnow = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.10, cabinLen - 0.2), snowMat);
    roofSnow.position.set(0, 1.42, -0.22);
    fb.add(roofSnow);

    // 4 Detailed Wheels + Hubcap Rims
    [-0.92, 0.92].forEach(wx => {
      [-1.35, 1.35].forEach(wz => {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 10), tireMat);
        tire.rotation.z = Math.PI * 0.5;
        tire.position.set(wx, 0.36, wz);
        fb.add(tire);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.28, 8), rimMat);
        rim.rotation.z = Math.PI * 0.5;
        rim.position.set(wx, 0.36, wz);
        fb.add(rim);
      });
    });

    // Headlights & Taillights
    [-0.68, 0.68].forEach(lx => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.08), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
      hl.position.set(lx, 0.58, 2.19);
      fb.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
      tl.position.set(lx, 0.62, -2.19);
      fb.add(tl);
    });
    return fb;
  };

  if (type === 'sedan' && typeof THREE.GLTFLoader !== 'undefined') {
    if (civicTemplate) {
      const clone = civicTemplate.clone(true);
      v.add(clone);
    } else {
      const loader = new THREE.GLTFLoader();
      loader.load('/models/honda_civic_1985_ps2.glb', (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z, 0.01);
        const scale = 4.4 / maxDim;
        model.scale.setScalar(scale);
        model.position.y = -box.min.y * scale;
        civicTemplate = model;
        v.add(model.clone(true));
      }, undefined, () => {
        v.add(buildFallback());
      });
    }
  } else {
    v.add(buildFallback());
  }

  group.add(v);
  const hw = Math.abs(Math.cos(rotY)) * 1.1 + Math.abs(Math.sin(rotY)) * 2.25;
  const hd = Math.abs(Math.sin(rotY)) * 1.1 + Math.abs(Math.cos(rotY)) * 2.25;
  addCol(colliders, x - hw, x + hw, z - hd, z + hd);
}

/**
 * Detailed Classical Grand Central Terminal Facade (Columns, Arched Glass Doors, Cornice, Clock)
 */
function buildGrandCentralFacade(group, colliders, stoneTex, snowMat) {
  const gc = new THREE.Group();
  gc.position.set(0, 0, 82);
  const stoneMat = new THREE.MeshLambertMaterial({ map: stoneTex, color: 0xa89b80, flatShading: true });
  const trimMat = new THREE.MeshLambertMaterial({ color: 0x6e6452, flatShading: true });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe099 });
  const ironMat = new THREE.MeshLambertMaterial({ color: 0x1e2228, flatShading: true });

  const main = new THREE.Mesh(new THREE.BoxGeometry(36, 17, 12), stoneMat);
  main.position.y = 8.5;
  gc.add(main);

  // Classical Pediment & Snow-Capped Roof Cornice
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(37.5, 1.2, 13.0), trimMat);
  cornice.position.y = 17.2;
  gc.add(cornice);
  const roofSnow = new THREE.Mesh(new THREE.BoxGeometry(37.4, 0.35, 12.8), snowMat);
  roofSnow.position.y = 17.95;
  gc.add(roofSnow);

  // 6 Classical Fluted Stone Columns across the front
  [-14, -6.5, -3.2, 3.2, 6.5, 14].forEach(cx => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.78, 14.5, 8), trimMat);
    col.position.set(cx, 7.25, -6.3);
    gc.add(col);
  });

  // 3 Recessed Arched Glowing Entrances + Iron Mullions
  [-10.2, 0, 10.2].forEach(ax => {
    const archGlass = new THREE.Mesh(new THREE.BoxGeometry(5.2, 11.2, 0.35), glowMat);
    archGlass.position.set(ax, 5.8, -6.05);
    gc.add(archGlass);
    // Mullion bars & entrance doors at bottom
    const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.22, 11.2, 0.45), ironMat);
    mullionV.position.set(ax, 5.8, -6.12);
    gc.add(mullionV);
    const doorBar = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.32, 0.45), ironMat);
    doorBar.position.set(ax, 3.2, -6.12);
    gc.add(doorBar);
  });

  // Ornate Glowing Grand Clock Dial + Sculpted Pediment Block
  const clockFrame = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.7, 12), trimMat);
  clockFrame.rotation.x = Math.PI * 0.5;
  clockFrame.position.set(0, 14.8, -6.2);
  gc.add(clockFrame);
  const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.78, 12), glowMat);
  clockFace.rotation.x = Math.PI * 0.5;
  clockFace.position.set(0, 14.8, -6.25);
  gc.add(clockFace);

  const gcLight = new THREE.PointLight(0xffd27a, 2.4, 40);
  gcLight.position.set(0, 8, -10);
  gc.add(gcLight);

  group.add(gc);
  addCol(colliders, -18.5, 18.5, 75.5, 88.5);
}

function buildStatueOfLibertySilhouette(group, x, z) {
  const lib = new THREE.Group();
  lib.position.set(x, 0, z);
  const copperMat = new THREE.MeshLambertMaterial({ color: 0x4b6e65, flatShading: true });
  const pedMat = new THREE.MeshLambertMaterial({ color: 0x45494e, flatShading: true });
  const torchMat = new THREE.MeshBasicMaterial({ color: 0xffd26a });

  // Star-shaped Pedestal Base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 9.0, 14, 8), pedMat);
  base.position.y = 7;
  lib.add(base);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(8.5, 12, 8.5), pedMat);
  ped.position.y = 20;
  lib.add(ped);

  // Robed Figure
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4.4, 22, 8), copperMat);
  robe.position.y = 37;
  lib.add(robe);

  // Head + 7-Spike Crown
  const head = new THREE.Mesh(new THREE.SphereGeometry(2.1, 8, 8), copperMat);
  head.position.y = 50;
  lib.add(head);
  for (let a = -0.9; a <= 0.9; a += 0.3) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.25, 2.2, 4), copperMat);
    spike.position.set(Math.sin(a) * 2.1, 51.8 + Math.cos(a) * 1.1, 0.4);
    spike.rotation.z = -a * 0.9;
    lib.add(spike);
  }

  // Raised Right Arm + Glowing Torch
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 13, 6), copperMat);
  arm.position.set(3.2, 51, 0);
  arm.rotation.z = -0.22;
  lib.add(arm);

  const flame = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.2, 6), torchMat);
  flame.position.set(4.6, 58.5, 0);
  lib.add(flame);

  const torchLight = new THREE.PointLight(0xffc966, 2.6, 45);
  torchLight.position.set(4.6, 59, 2);
  lib.add(torchLight);

  group.add(lib);
}

export function initNYCSnowMap(scene, colliders) {
  if (nycGroup) return nycGroup;

  nycGroup = new THREE.Group();
  nycGroup.name = 'NYC_Times_Square_Snow_Arena';

  const streetTex = makeSnowyStreetTex();
  streetTex.wrapS = streetTex.wrapT = THREE.RepeatWrapping;
  streetTex.repeat.set(1, 14); // 1x across road width so tire tracks align cleanly!

  const plazaTex = makePlazaTileTex();
  plazaTex.wrapS = plazaTex.wrapT = THREE.RepeatWrapping;
  plazaTex.repeat.set(12, 16);

  const brickRed = makeBrickTex(112, 48, 38);
  brickRed.wrapS = brickRed.wrapT = THREE.RepeatWrapping;
  brickRed.repeat.set(3, 3);

  const brickCream = makeBrickTex(124, 114, 98);
  brickCream.wrapS = brickCream.wrapT = THREE.RepeatWrapping;
  brickCream.repeat.set(3, 3);

  const doorMat = new THREE.MeshLambertMaterial({ map: makeDoorTex(), flatShading: true });
  const winDarkMat = new THREE.MeshLambertMaterial({ map: makeWindowPaneTex(false), flatShading: true });
  const winLitMat = new THREE.MeshLambertMaterial({ map: makeWindowPaneTex(true), emissive: 0x3b2a12, flatShading: true });

  const winGold = makeTowerWindowsTex('#ffde8f');
  const winBlue = makeTowerWindowsTex('#9fd8f5');
  const snowMat = new THREE.MeshLambertMaterial({ color: 0xc2ceda, flatShading: true });

  // 1. Full 260x260 Snowy NYC City Base (prevents any empty ground/void in side alleys!)
  const cityFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260),
    new THREE.MeshLambertMaterial({ color: 0x2a323c, flatShading: true })
  );
  cityFloor.rotation.x = -Math.PI / 2;
  cityFloor.position.set(0, 0.0, 10);
  cityFloor.receiveShadow = true;
  nycGroup.add(cityFloor);

  // Snowy Avenue & Wet Reflective Times Square Plaza
  const avenue = new THREE.Mesh(
  const avenue = new THREE.Mesh(
    new THREE.PlaneGeometry(32, 190),
    new THREE.MeshLambertMaterial({ map: streetTex, flatShading: true })
  );
  avenue.rotation.x = -Math.PI / 2;
  avenue.position.set(0, 0.01, 10);
  avenue.receiveShadow = true;
  nycGroup.add(avenue);

  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(32, 42),
    new THREE.MeshLambertMaterial({ map: plazaTex, flatShading: true })
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.02, -6);
  plaza.receiveShadow = true;
  nycGroup.add(plaza);

  [
    { x: -10, z: -8, col: 0xff6a2a },
    { x: 10, z: -10, col: 0xff2a9d },
    { x: 0, z: -20, col: 0x3898ff }
  ].forEach(ref => {
    const glowPool = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 14),
      new THREE.MeshBasicMaterial({ color: ref.col, transparent: true, opacity: 0.16, depthWrite: false })
    );
    glowPool.rotation.x = -Math.PI / 2;
    glowPool.position.set(ref.x, 0.025, ref.z);
    nycGroup.add(glowPool);
  });

  // Sidewalks + Snow Berms
  const swMat = new THREE.MeshLambertMaterial({ color: 0x3d444e, flatShading: true });
  [-19, 19].forEach(sx => {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(10, 0.16, 170), swMat);
    sw.position.set(sx, 0.08, 10);
    sw.receiveShadow = true;
    nycGroup.add(sw);

    for (let bz = -18; bz <= 58; bz += 18) {
      const berm = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.95, 5), snowMat);
      berm.scale.set(1.0, 1.0, 2.2);
      berm.position.set(sx < 0 ? -14.8 : 14.8, 0.35, bz);
      nycGroup.add(berm);
    }
  });

  // 2. ONE TIMES SQUARE TOWER + VERTICAL LED BILLBOARD STACK (shifted back so TKTS top deck is walkable!)
  const oneTS = new THREE.Group();
  oneTS.position.set(0, 0, -47);
  const towerBody = new THREE.Mesh(
    new THREE.BoxGeometry(13, 62, 12),
    new THREE.MeshLambertMaterial({ color: 0x1a2029, flatShading: true })
  );
  towerBody.position.y = 31;
  oneTS.add(towerBody);
  nycGroup.add(oneTS);
  addCol(colliders, -6.8, 6.8, -53.2, -40.8);

  const adPrudential = makeAdTex('PRUDENTIAL', 'RETIREMENT TRIVIA • NYC', '#0b2294', '#1638c4', '#ffffff');
  const adHSBC = makeAdTex('3.00% APY', 'HSBC DIRECT • NO MONTHLY FEES', '#111216', '#231618', '#ff6a2a');
  const adSamsung = makeAdTex('SAMSUNG', 'TIMES SQUARE LIVE HD', '#0640b8', '#00a8ff', '#ffffff', '#ffdf6b');
  const adCoke = makeAdTex('COCA-COLA', 'SHARE A COKE IN NYC', '#9e0b14', '#d91a24', '#ffffff');
  const adVerizon = makeAdTex('A GIFT AS THE', 'VERIZON • NYC WINTER', '#dce4ec', '#b6c6d6', '#182436');
  const adGatsby = makeAdTex('PHANTOM', 'THE MUSICAL • BROADWAY', '#0e1118', '#222836', '#e5c468', '#e5c468');
  const adDisney = makeAdTex('DISNEY', 'TIGER\'S APPRENTICE', '#c44a14', '#5c1488', '#ffd84d', '#38e8ff');
  const adSnap = makeAdTex('ONE LOVE', 'SNAP ON • TIMES SQUARE', '#a61472', '#f5189c', '#ffffff');

  addScreen(nycGroup, 0, 48.5, -40.8, 11.4, 7.2, 0, adPrudential, 0x3868ff);
  addScreen(nycGroup, 0, 40.2, -40.8, 11.4, 7.2, 0, adHSBC, 0xff5522);
  addScreen(nycGroup, 0, 31.6, -40.8, 11.4, 7.8, 0, adSamsung, 0x22aaff);
  addScreen(nycGroup, 0, 22.6, -40.8, 11.4, 8.2, 0, adCoke, 0xff2233);

  // Walkable TKTS Red Stairs -> Elevated Tactical Observation Deck (y = 3.36m)
  const redStepMat = new THREE.MeshLambertMaterial({ color: 0xa81822, flatShading: true });
  for (let i = 0; i < 12; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.35, 0.72), redStepMat);
    step.position.set(0, 0.18 + i * 0.28, -24.5 - i * 0.68);
    nycGroup.add(step);
  }
  // Top Observation Platform (z = -32.6 to -39.5, y = 3.36)
  const tktsDeck = new THREE.Mesh(new THREE.BoxGeometry(11.4, 3.36, 7.2), new THREE.MeshLambertMaterial({ color: 0x3b181d, flatShading: true }));
  tktsDeck.position.set(0, 1.68, -36.1);
  nycGroup.add(tktsDeck);
  const deckSnow = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.12, 6.8), snowMat);
  deckSnow.position.set(0, 3.40, -36.1);
  nycGroup.add(deckSnow);
  // Deck Side Railings +Glowing Supply Crate on Top
  [-5.5, 5.5].forEach(rx => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.0, 7.2), new THREE.MeshLambertMaterial({ color: 0x1c2026 }));
    rail.position.set(rx, 3.9, -36.1);
    nycGroup.add(rail);
  });
  [-6.2, 6.2].forEach(px => {
    const tkts = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.8, 1.1), redStepMat);
    tkts.position.set(px, 1.9, -24.2);
    nycGroup.add(tkts);
  });

  // 3. CURVED GIANT LED SCREENS ON BOTH CORNERS + MULTI-TIER BROADWAY BILLBOARD STACKS
  const curveGeo = new THREE.CylinderGeometry(9.5, 9.5, 16.0, 14, 1, true, 0.25, 1.35);
  const curveScreen = new THREE.Mesh(curveGeo, new THREE.MeshBasicMaterial({ map: adVerizon, side: THREE.DoubleSide }));
  curveScreen.position.set(-22.5, 17.5, -18.0);
  nycGroup.add(curveScreen);

  const curveScreenEast = new THREE.Mesh(
    new THREE.CylinderGeometry(9.5, 9.5, 14.0, 14, 1, true, -1.65, 1.35),
    new THREE.MeshBasicMaterial({ map: adSnap, side: THREE.DoubleSide })
  );
  curveScreenEast.position.set(22.5, 18.0, -18.0);
  nycGroup.add(curveScreenEast);

  buildSkyscraper(nycGroup, colliders, -28, -18, 16, 20, 46, winGold, false, true);
  buildSkyscraper(nycGroup, colliders, 28, -16, 16, 22, 52, winBlue, false, true);
  buildSkyscraper(nycGroup, colliders, 28, 6, 16, 20, 42, winGold, false, true);
  buildSkyscraper(nycGroup, colliders, -28, 6, 16, 20, 40, winBlue, false, true);

  // Close ALL Side-Alley Gaps & Surround All 360° Directions with Manhattan City Blocks!
  [-46, 46].forEach(bx => {
    [-36, -12, 12, 36, 60, 82].forEach((bz, idx) => {
      const h = 44 + ((idx * 11) % 34);
      buildSkyscraper(nycGroup, colliders, bx, bz, 18, 22, h, idx % 2 === 0 ? winGold : winBlue, idx === 1);
    });
  });
  // Fill North & South Perimeter Gaps behind One Times Square & Grand Central
  [-36, -18, 18, 36].forEach((nx, idx) => {
    buildSkyscraper(nycGroup, null, nx, -62, 17, 18, 64 + (idx % 2) * 14, idx % 2 === 0 ? winBlue : winGold, idx === 2);
    buildSkyscraper(nycGroup, null, nx, 98, 17, 18, 52 + (idx % 2) * 12, idx % 2 === 0 ? winGold : winBlue, false);
  });

  // Towering Manhattan Skyscraper Silhouettes & Statue of Liberty Looming in the Mist!
  buildSkyscraper(nycGroup, null, 24, -66, 22, 20, 78, winBlue, true, false);
  buildSkyscraper(nycGroup, null, -52, -62, 20, 20, 72, winGold, false, false);
  buildSkyscraper(nycGroup, null, 52, -56, 20, 20, 68, winGold, false, false);
  buildStatueOfLibertySilhouette(nycGroup, -26, -64);

  // Dense Multi-Tier Times Square LED Billboards & Neon Blade Signs
  const adShrek = makeAdTex('SHREK', 'THE MUSICAL • BROADWAY', '#2d6814', '#5ca822', '#fff275');
  const adChicago = makeAdTex('CHICAGO', 'BROADWAY HIT MUSICAL', '#8a0e18', '#141418', '#ffd24d', '#ff2a38');
  const adMarriott = makeAdTex('TIMES SQ', 'MARRIOTT • H&M NYC', '#121826', '#281422', '#ff3848', '#ffffff');
  const adDeli = makeAdTex('FAMOUS DELI', '24H PIZZA & COFFEE', '#d4a818', '#9e740c', '#111111');
  const adBlade = makeAdTex('PALACE', 'THEATRE', '#2a0814', '#5c0c22', '#ffdf6b', '#ffdf6b');

  // West Buildings LED Screens (3 tiers!)
  addScreen(nycGroup, -19.6, 10.5, 6, 14.5, 7.2, Math.PI / 2, adDisney, 0xff7722);
  addScreen(nycGroup, -19.6, 19.8, 6, 13.5, 6.8, Math.PI / 2, adChicago, 0xff2233);
  addScreen(nycGroup, -19.6, 29.5, 6, 12.0, 6.2, Math.PI / 2, adShrek, 0x66ff44);
  addScreen(nycGroup, -19.6, 10.0, -18, 13.0, 6.8, Math.PI / 2, adDeli);
  addScreen(nycGroup, -19.6, 30.0, -18, 13.0, 6.8, Math.PI / 2, adMarriott, 0xff3848);

  // East Buildings LED Screens (3 tiers!)
  addScreen(nycGroup, 19.6, 11.0, -16, 15.0, 7.6, -Math.PI / 2, adSnap, 0xff2a9d);
  addScreen(nycGroup, 19.6, 29.0, -16, 13.5, 6.8, -Math.PI / 2, adPrudential, 0x3868ff);
  addScreen(nycGroup, 19.6, 11.0, 6, 14.5, 7.2, -Math.PI / 2, adGatsby, 0xffd270);
  addScreen(nycGroup, 19.6, 20.2, 6, 13.5, 6.8, -Math.PI / 2, adSamsung, 0x22aaff);
  addScreen(nycGroup, 19.6, 29.8, 6, 12.5, 6.4, -Math.PI / 2, adCoke, 0xff2233);

  // Vertical Projecting Neon Blade Signs (sticking out over sidewalks like Ref 3)
  addScreen(nycGroup, -18.2, 13.5, 14.5, 2.2, 9.5, 0, adBlade, 0xffaa22);
  addScreen(nycGroup, 18.2, 13.5, 14.5, 2.2, 9.5, Math.PI, adBlade, 0xffaa22);
  addScreen(nycGroup, 18.2, 14.5, -7.0, 2.2, 9.5, Math.PI, adMarriott, 0xff3858);

  // 4. DETAILED SNOWY BRICK BROWNSTONE STREET (Doors, Stoops, Multi-pane Windows, Fire Escapes)
  buildDetailedBrownstoneRow(nycGroup, colliders, -23, 24, 4, 1, brickRed, brickCream, snowMat, doorMat, winDarkMat, winLitMat);
  buildDetailedBrownstoneRow(nycGroup, colliders, 23, 24, 4, 1, brickCream, brickRed, snowMat, doorMat, winDarkMat, winLitMat);

  // 5. DETAILED GRAND CENTRAL TERMINAL FACADE
  buildGrandCentralFacade(nycGroup, colliders, brickCream, snowMat);

  // 6. AUTHENTIC PS2 VEHICLES (honda_civic_1985_ps2.glb + Detailed SUVs & Yellow Cabs)
  buildDetailedPS2Vehicle(nycGroup, colliders, -10.0, 10.0, 0.05, 'cab');
  buildDetailedPS2Vehicle(nycGroup, colliders, 10.2, 2.0, Math.PI - 0.06, 'suv');
  buildDetailedPS2Vehicle(nycGroup, colliders, -10.5, 32.0, -0.05, 'sedan');
  buildDetailedPS2Vehicle(nycGroup, colliders, 10.5, 28.0, Math.PI + 0.04, 'cab');
  buildDetailedPS2Vehicle(nycGroup, colliders, -9.8, 52.0, 0.08, 'suv');

  // 7. STREETLAMPS & HANGING TRAFFIC SIGNALS
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x22262e, flatShading: true });
  [[-14.5, -14], [14.5, -14], [-14.5, 22], [14.5, 22], [-14.5, 48], [14.5, 48]].forEach(([px, pz]) => {
    const dir = px < 0 ? 1 : -1;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 6.4, 6), poleMat);
    pole.position.set(px, 3.2, pz);
    nycGroup.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 0.14), poleMat);
    arm.position.set(px + dir * 1.75, 6.2, pz);
    nycGroup.add(arm);

    const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.3), new THREE.MeshBasicMaterial({ color: 0xffe4aa }));
    lampHead.position.set(px + dir * 3.2, 6.1, pz);
    nycGroup.add(lampHead);

    const light = new THREE.PointLight(0xffd288, 1.9, 26);
    light.position.set(px + dir * 2.8, 5.6, pz);
    nycGroup.add(light);

    if (pz === -14 || pz === 22) {
      const sig = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.1, 0.45), poleMat);
      sig.position.set(px + dir * 2.1, 5.4, pz);
      nycGroup.add(sig);
      const amberDot = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.24, 0.50),
        new THREE.MeshBasicMaterial({ color: pz === -14 ? 0xffaa22 : 0xff2a2a })
      );
      amberDot.position.set(px + dir * 2.1, 5.4, pz);
      nycGroup.add(amberDot);
    }
  });

  nycGroup.visible = false;
  scene.add(nycGroup);
  return nycGroup;
}

export function setNYCSnowMapActive(active) {
  if (nycGroup) nycGroup.visible = !!active;
  nycColliders.forEach(c => { c.disabled = !active; });
}
