/* =========================================================================
   SNOWY LOW-POLY NYC TIMES SQUARE (Inspired by maps_reference)
   - One Times Square Vertical Billboard Stack + Walkable TKTS Red Stairs
   - Curved Times Square LED Screen + Wet Plaza with Neon Reflections
   - Snowy Brick Brownstones with Awnings, Snow Berms & Tire-Track Avenue
   - Grand Central Terminal Facade + Hanging Traffic Lights + Yellow Cabs
   ========================================================================= */

const THREE = window.THREE;

let nycGroup = null;
const nycColliders = [];

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
  return makeTex(128, 128, (ctx, w, h) => {
    // Pixelated snowy cobblestone/asphalt with dark tire-track ruts (Ref 1 & 2)
    ctx.fillStyle = '#6f7c8a';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const v = 96 + Math.floor(Math.random() * 44);
        ctx.fillStyle = `rgb(${v},${v + 8},${v + 16})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
    // Dual tire track ruts
    [34, 48, 80, 94].forEach(tx => {
      ctx.fillStyle = 'rgba(28, 34, 42, 0.52)';
      ctx.fillRect(tx, 0, 8, h);
    });
  });
}

function makePlazaTileTex() {
  return makeTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#303842';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      for (let x = 0; x < w; x += 8) {
        const v = 38 + Math.floor(Math.random() * 24);
        ctx.fillStyle = `rgb(${v},${v + 5},${v + 12})`;
        ctx.fillRect(x + 1, y + 1, 6, 6);
      }
    }
  });
}

function makeBrickTex(r, g, b) {
  return makeTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2c2826';
    ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 16; row++) {
      const off = (row % 2) * 8;
      for (let col = -1; col < 9; col++) {
        const j = Math.floor((Math.random() - 0.5) * 26);
        ctx.fillStyle = `rgb(${r + j},${g + j},${b + j})`;
        ctx.fillRect(col * 16 + off + 1, row * 8 + 1, 14, 6);
      }
    }
    // Bottom grime
    const ao = ctx.createLinearGradient(0, 88, 0, 128);
    ao.addColorStop(0, 'rgba(0,0,0,0)');
    ao.addColorStop(1, 'rgba(12,14,18,0.55)');
    ctx.fillStyle = ao;
    ctx.fillRect(0, 88, 128, 40);
  });
}

function makeTowerWindowsTex(tint = '#ffe39e') {
  return makeTex(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#202833';
    ctx.fillRect(0, 0, w, h);
    const cols = 8, rows = 22;
    const cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rnd = Math.random();
        ctx.fillStyle = rnd > 0.55 ? (rnd > 0.85 ? '#a8dcf5' : tint) : '#141a22';
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

function buildBrownstoneRow(group, colliders, sideX, startZ, count, dirZ, brickRed, brickCream, snowMat) {
  const facing = sideX < 0 ? 1 : -1;
  const winMat = new THREE.MeshLambertMaterial({ color: 0x161c24, flatShading: true });
  const warmWinMat = new THREE.MeshBasicMaterial({ color: 0xffc66e });
  const awningMat = new THREE.MeshLambertMaterial({ color: 0x3b4450, flatShading: true });
  const trimMat = new THREE.MeshLambertMaterial({ color: 0x4b433e, flatShading: true });

  for (let i = 0; i < count; i++) {
    const bw = 12.0;
    const bd = 11.5;
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

    // 3D Windows & Cornice
    for (let f = 0; f < floors; f++) {
      const wy = 2.2 + f * 3.8;
      for (let wz = -3.4; wz <= 3.4; wz += 3.4) {
        const isLit = (f === 0 && (i + Math.round(wz)) % 2 === 0);
        const pane = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 1.75, 1.35),
          isLit ? warmWinMat : winMat
        );
        pane.position.set(facing * (bw * 0.5 + 0.04), wy, wz);
        b.add(pane);
      }
    }

    // Snowy Shop Awning on Ground Floor (Ref 1)
    const awning = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.35, bd - 1.2), awningMat);
    awning.position.set(facing * (bw * 0.5 + 0.75), 3.4, 0);
    awning.rotation.z = facing * -0.25;
    b.add(awning);

    const awningSnow = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.14, bd - 1.3), snowMat);
    awningSnow.position.set(facing * (bw * 0.5 + 0.75), 3.60, 0);
    awningSnow.rotation.z = facing * -0.25;
    b.add(awningSnow);

    // Roof Cornice + Snow Cap
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.5, 0.55, bd + 0.2), trimMat);
    cornice.position.y = bh + 0.2;
    b.add(cornice);

    const roofSnow = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.4, 0.25, bd + 0.1), snowMat);
    roofSnow.position.y = bh + 0.55;
    b.add(roofSnow);

    group.add(b);
    addCol(colliders, bx - bw * 0.5 - 0.3, bx + bw * 0.5 + 0.3, bz - bd * 0.5, bz + bd * 0.5);
  }
}

function buildSkyscraper(group, colliders, x, z, w, d, h, winTex, spire = false) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ map: winTex, flatShading: true })
  );
  body.position.y = h * 0.5;
  g.add(body);

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

function buildVehicle(group, colliders, x, z, rotY, type = 'cab') {
  const v = new THREE.Group();
  v.position.set(x, 0, z);
  v.rotation.y = rotY;
  const col = type === 'cab' ? 0xeab318 : (type === 'suv' ? 0x1b2028 : 0x7b8490);
  const bodyMat = new THREE.MeshLambertMaterial({ color: col, flatShading: true });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1c2530, flatShading: true });
  const snowMat = new THREE.MeshLambertMaterial({ color: 0xc8d4df, flatShading: true });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.72, 4.4), bodyMat);
  chassis.position.y = 0.54;
  v.add(chassis);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.65, type === 'suv' ? 2.9 : 2.2), glassMat);
  cabin.position.set(0, 1.18, -0.1);
  v.add(cabin);

  // Snow dust on vehicle roof (Ref 1 & 2)
  const roofSnow = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.12, type === 'suv' ? 2.6 : 1.9), snowMat);
  roofSnow.position.set(0, 1.54, -0.1);
  v.add(roofSnow);

  [-0.65, 0.65].forEach(lx => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.08), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
    hl.position.set(lx, 0.56, 2.22);
    v.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.08), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    tl.position.set(lx, 0.58, -2.22);
    v.add(tl);
  });

  group.add(v);
  const hw = Math.abs(Math.cos(rotY)) * 1.1 + Math.abs(Math.sin(rotY)) * 2.25;
  const hd = Math.abs(Math.sin(rotY)) * 1.1 + Math.abs(Math.cos(rotY)) * 2.25;
  addCol(colliders, x - hw, x + hw, z - hd, z + hd);
}

function buildGrandCentralFacade(group, colliders) {
  // Glowing Golden Grand Central Terminal at South end of Avenue (z = +78, Ref 4)
  const gc = new THREE.Group();
  gc.position.set(0, 0, 82);
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x8f8266, flatShading: true });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe099 });

  const main = new THREE.Mesh(new THREE.BoxGeometry(34, 16, 12), stoneMat);
  main.position.y = 8;
  gc.add(main);

  // 3 Iconic Arched Glowing Windows
  [-9, 0, 9].forEach(ax => {
    const arch = new THREE.Mesh(new THREE.BoxGeometry(5.6, 10.5, 0.4), glowMat);
    arch.position.set(ax, 6.2, -6.1);
    gc.add(arch);
  });

  // Grand Clock Pediment
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.6, 12), glowMat);
  clock.rotation.x = Math.PI * 0.5;
  clock.position.set(0, 14.2, -6.2);
  gc.add(clock);

  const gcLight = new THREE.PointLight(0xffd27a, 2.2, 38);
  gcLight.position.set(0, 8, -10);
  gc.add(gcLight);

  group.add(gc);
  addCol(colliders, -17.5, 17.5, 75.5, 88.5);
}

export function initNYCSnowMap(scene, colliders) {
  if (nycGroup) return nycGroup;

  nycGroup = new THREE.Group();
  nycGroup.name = 'NYC_Times_Square_Snow_Arena';

  const streetTex = makeSnowyStreetTex();
  streetTex.wrapS = streetTex.wrapT = THREE.RepeatWrapping;
  streetTex.repeat.set(16, 40);

  const plazaTex = makePlazaTileTex();
  plazaTex.wrapS = plazaTex.wrapT = THREE.RepeatWrapping;
  plazaTex.repeat.set(14, 18);

  const brickRed = makeBrickTex(112, 48, 38);
  brickRed.wrapS = brickRed.wrapT = THREE.RepeatWrapping;
  brickRed.repeat.set(3, 3);

  const brickCream = makeBrickTex(124, 114, 98);
  brickCream.wrapS = brickCream.wrapT = THREE.RepeatWrapping;
  brickCream.repeat.set(3, 3);

  const winGold = makeTowerWindowsTex('#ffde8f');
  const winBlue = makeTowerWindowsTex('#9fd8f5');
  const snowMat = new THREE.MeshLambertMaterial({ color: 0xcfd9e3, flatShading: true });

  // 1. Snowy Avenue & Wet Reflective Times Square Plaza (Ref 1, 2, 5)
  const avenue = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 190),
    new THREE.MeshLambertMaterial({ map: streetTex, flatShading: true })
  );
  avenue.rotation.x = -Math.PI / 2;
  avenue.position.set(0, 0.01, 10);
  avenue.receiveShadow = true;
  nycGroup.add(avenue);

  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 42),
    new THREE.MeshLambertMaterial({ map: plazaTex, flatShading: true })
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.02, -6);
  plaza.receiveShadow = true;
  nycGroup.add(plaza);

  // Subtle Colored Neon Reflection Pools on Wet Plaza (Ref 5)
  [
    { x: -10, z: -8, col: 0xff6a2a },
    { x: 10, z: -10, col: 0xff2a9d },
    { x: 0, z: -20, col: 0x3898ff }
  ].forEach(ref => {
    const glowPool = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 14),
      new THREE.MeshBasicMaterial({ color: ref.col, transparent: true, opacity: 0.18, depthWrite: false })
    );
    glowPool.rotation.x = -Math.PI / 2;
    glowPool.position.set(ref.x, 0.025, ref.z);
    nycGroup.add(glowPool);
  });

  // Sidewalks + Low-Poly Plowed Snow Berms along Curbs (Ref 2)
  const swMat = new THREE.MeshLambertMaterial({ color: 0x454d58, flatShading: true });
  [-19, 19].forEach(sx => {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(10, 0.16, 170), swMat);
    sw.position.set(sx, 0.08, 10);
    sw.receiveShadow = true;
    nycGroup.add(sw);

    for (let bz = -20; bz <= 55; bz += 16) {
      const berm = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.1, 5), snowMat);
      berm.scale.set(1.0, 1.0, 2.2);
      berm.position.set(sx < 0 ? -14.8 : 14.8, 0.4, bz);
      nycGroup.add(berm);
    }
  });

  // 2. ONE TIMES SQUARE TOWER + VERTICAL LED BILLBOARD STACK (Ref 3)
  const oneTS = new THREE.Group();
  oneTS.position.set(0, 0, -40);
  const towerBody = new THREE.Mesh(
    new THREE.BoxGeometry(13, 52, 12),
    new THREE.MeshLambertMaterial({ color: 0x1a2029, flatShading: true })
  );
  towerBody.position.y = 26;
  oneTS.add(towerBody);
  nycGroup.add(oneTS);
  addCol(colliders, -6.8, 6.8, -46.2, -33.8);

  const adPrudential = makeAdTex('PRUDENTIAL', 'RETIREMENT TRIVIA • NYC', '#0b2294', '#1638c4', '#ffffff');
  const adHSBC = makeAdTex('3.00% APY', 'HSBC DIRECT • NO MONTHLY FEES', '#111216', '#231618', '#ff6a2a');
  const adSamsung = makeAdTex('SAMSUNG', 'TIMES SQUARE LIVE HD', '#0640b8', '#00a8ff', '#ffffff', '#ffdf6b');
  const adCoke = makeAdTex('COCA-COLA', 'SHARE A COKE IN NYC', '#9e0b14', '#d91a24', '#ffffff');
  const adVerizon = makeAdTex('A GIFT AS THE', 'VERIZON • NYC WINTER', '#dce4ec', '#b6c6d6', '#182436');
  const adGatsby = makeAdTex('PHANTOM', 'THE MUSICAL • BROADWAY', '#0e1118', '#222836', '#e5c468', '#e5c468');
  const adDisney = makeAdTex('DISNEY', 'TIGER\'S APPRENTICE', '#c44a14', '#5c1488', '#ffd84d', '#38e8ff');
  const adSnap = makeAdTex('ONE LOVE', 'SNAP ON • TIMES SQUARE', '#a61472', '#f5189c', '#ffffff');

  addScreen(nycGroup, 0, 44.5, -33.8, 11.4, 7.2, 0, adPrudential, 0x3868ff);
  addScreen(nycGroup, 0, 36.2, -33.8, 11.4, 7.2, 0, adHSBC, 0xff5522);
  addScreen(nycGroup, 0, 27.6, -33.8, 11.4, 7.8, 0, adSamsung, 0x22aaff);
  addScreen(nycGroup, 0, 18.6, -33.8, 11.4, 8.2, 0, adCoke, 0xff2233);

  // Walkable TKTS Red Stairs directly in front of One Times Square (Ref 3)
  const redStepMat = new THREE.MeshLambertMaterial({ color: 0xa81822, flatShading: true });
  for (let i = 0; i < 12; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.35, 0.72), redStepMat);
    step.position.set(0, 0.18 + i * 0.28, -24.5 - i * 0.68);
    nycGroup.add(step);
  }
  [-6.2, 6.2].forEach(px => {
    const tkts = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.8, 1.1), redStepMat);
    tkts.position.set(px, 1.9, -24.2);
    nycGroup.add(tkts);
  });

  // 3. CURVED GIANT LED SCREEN ON WEST CORNER (Ref 2)
  const curveGeo = new THREE.CylinderGeometry(9.5, 9.5, 16.0, 14, 1, true, 0.25, 1.35);
  const curveScreen = new THREE.Mesh(
    curveGeo,
    new THREE.MeshBasicMaterial({ map: adVerizon, side: THREE.DoubleSide })
  );
  curveScreen.position.set(-22.5, 17.5, -18.0);
  nycGroup.add(curveScreen);
  const curveLight = new THREE.PointLight(0xd8ecff, 1.8, 30);
  curveLight.position.set(-14, 16, -14);
  nycGroup.add(curveLight);

  // Side Skyscrapers & Bright Broadway Billboards (Ref 3 & 5)
  buildSkyscraper(nycGroup, colliders, -28, -18, 16, 18, 44, winGold);
  buildSkyscraper(nycGroup, colliders, 28, -16, 16, 20, 48, winBlue);
  buildSkyscraper(nycGroup, colliders, 28, 6, 16, 18, 40, winGold);
  buildSkyscraper(nycGroup, colliders, -28, 6, 16, 18, 38, winBlue);

  // Distant Misty Empire State & Skyline Silhouettes (Ref 1 & 3)
  buildSkyscraper(nycGroup, null, -12, -88, 22, 22, 92, winGold, true);
  buildSkyscraper(nycGroup, null, 24, -84, 24, 22, 76, winBlue, false);
  buildSkyscraper(nycGroup, null, -48, -76, 20, 20, 66, winBlue, false);

  addScreen(nycGroup, -19.8, 11.5, 6, 14, 7.5, Math.PI / 2, adDisney, 0xff7722);
  addScreen(nycGroup, 19.8, 12.5, -16, 15, 8.0, -Math.PI / 2, adSnap, 0xff2a9d);
  addScreen(nycGroup, 19.8, 12.0, 6, 14, 7.5, -Math.PI / 2, adGatsby, 0xffd270);

  // 4. SNOWY BRICK BROWNSTONE STREET DISTRICT (Ref 1)
  buildBrownstoneRow(nycGroup, colliders, -23, 24, 4, 1, brickRed, brickCream, snowMat);
  buildBrownstoneRow(nycGroup, colliders, 23, 24, 4, 1, brickCream, brickRed, snowMat);

  // 5. GRAND CENTRAL TERMINAL FACADE (Ref 4)
  buildGrandCentralFacade(nycGroup, colliders);

  // 6. YELLOW NYC CABS, SNOWY SUVs & HANGING TRAFFIC LIGHTS (Ref 1, 2, 3)
  buildVehicle(nycGroup, colliders, -10.0, 10.0, 0.05, 'cab');
  buildVehicle(nycGroup, colliders, 10.2, 2.0, Math.PI - 0.06, 'suv');
  buildVehicle(nycGroup, colliders, -10.5, 32.0, -0.05, 'suv');
  buildVehicle(nycGroup, colliders, 10.5, 28.0, Math.PI + 0.04, 'cab');
  buildVehicle(nycGroup, colliders, -9.8, 52.0, 0.08, 'cab');

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

    const light = new THREE.PointLight(0xffd288, 1.8, 28);
    light.position.set(px + dir * 2.8, 5.6, pz);
    nycGroup.add(light);

    // Hanging Traffic Signal Box (Ref 2)
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
