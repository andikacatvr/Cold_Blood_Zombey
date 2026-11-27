/* =========================================================================
   TIMES SQUARE, NEW YORK CITY — PLAYABLE SURVIVAL HORROR ARENA
   - Towering Manhattan Skyscrapers & Distant Twin-Tower / One-WTC Skyline
   - Glowing Broadway & Vice City LED Screens + 3D Corner Cube + Scrolling Ticker
   - Walkable Grand Central / 42nd St Subway Station (Green Globes, Stairs, Train)
   - NYC Yellow Cabs, Traffic Lights, Crosswalks, Red Bus Lanes & Streetlamps
   ========================================================================= */

const THREE = window.THREE;

let nycGroup = null;
let tickerTex = null;
let nycLights = [];
const nycColliders = [];

function createCanvasTex(w, h, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function makeAsphaltTex() {
  return createCanvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#181b20';
    ctx.fillRect(0, 0, w, h);
    // Heavy PS2/Source gritty aggregate noise
    for (let i = 0; i < 16000; i++) {
      const v = 12 + Math.floor(Math.random() * 34);
      ctx.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 2, 2 + Math.random() * 2);
    }
    // Oil stains, puddles & weathered cracks
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = `rgba(6, 8, 12, ${0.15 + Math.random() * 0.25})`;
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 10 + Math.random() * 28, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(8, 10, 14, 0.55)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      let cx = Math.random() * w;
      let cy = Math.random() * h;
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 5; s++) {
        cx += (Math.random() - 0.5) * 40;
        cy += (Math.random() - 0.5) * 40;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  });
}

function makeSidewalkTex() {
  return createCanvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#33363b';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) {
      const v = 35 + Math.floor(Math.random() * 30);
      ctx.fillStyle = `rgb(${v},${v},${v - 2})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.strokeStyle = '#15171b';
    ctx.lineWidth = 3;
    for (let x = 0; x <= w; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  });
}

function makeSkyscraperWindowsTex(tint = '#ffd98e') {
  return createCanvasTex(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#11141a';
    ctx.fillRect(0, 0, w, h);
    // Gritty concrete/brick facade noise
    for (let i = 0; i < 4000; i++) {
      const v = 14 + Math.floor(Math.random() * 20);
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    const cols = 10;
    const rows = 26;
    const cw = w / cols;
    const rh = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rnd = Math.random();
        if (rnd > 0.45) {
          if (rnd > 0.88) ctx.fillStyle = '#a8e6ff';
          else if (rnd > 0.72) ctx.fillStyle = '#ffe9b8';
          else ctx.fillStyle = tint;
          ctx.globalAlpha = 0.40 + Math.random() * 0.55;
        } else {
          ctx.fillStyle = '#151a24';
          ctx.globalAlpha = 0.92;
        }
        ctx.fillRect(c * cw + 3, r * rh + 3, cw - 6, rh - 6);
      }
    }
    ctx.globalAlpha = 1.0;
    // Baked bottom grime / ambient occlusion
    const ao = ctx.createLinearGradient(0, h * 0.75, 0, h);
    ao.addColorStop(0, 'rgba(0,0,0,0)');
    ao.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = ao;
    ctx.fillRect(0, h * 0.75, w, h * 0.25);
  });
}

function makeSubwayTileTex(withGraffiti = false) {
  return createCanvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#9a988b';
    ctx.fillRect(0, 0, w, h);
    // Heavy PS1/PS2 concrete & tile grime
    for (let i = 0; i < 12000; i++) {
      const v = 105 + Math.floor(Math.random() * 55);
      ctx.fillStyle = `rgb(${v},${v - 2},${v - 8})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
    ctx.strokeStyle = '#3c3b34';
    ctx.lineWidth = 3;
    for (let y = 0; y <= h; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let r = 0; r < 16; r++) {
      const off = (r % 2) * 32;
      for (let x = off; x <= w; x += 64) {
        ctx.beginPath(); ctx.moveTo(x, r * 32); ctx.lineTo(x, (r + 1) * 32); ctx.stroke();
      }
    }
    // Classic NYC subway green accent stripe + rust drips
    ctx.fillStyle = '#14492b';
    ctx.fillRect(0, 64, w, 26);
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = 'rgba(42, 30, 18, 0.28)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 6 + Math.random() * 14, 30 + Math.random() * 80);
    }
    if (withGraffiti) {
      ctx.save();
      ctx.font = 'bold 58px Impact, sans-serif';
      ctx.fillStyle = 'rgba(255, 70, 35, 0.78)';
      ctx.strokeStyle = 'rgba(15, 15, 20, 0.85)';
      ctx.lineWidth = 5;
      ctx.rotate(-0.08);
      ctx.strokeText('NYC 42', 45, 270);
      ctx.fillText('NYC 42', 45, 270);
      ctx.fillStyle = 'rgba(40, 210, 255, 0.72)';
      ctx.font = 'bold 44px Impact, sans-serif';
      ctx.fillText('NO ESCAPE', 210, 360);
      ctx.restore();
    }
  });
}

function makeBillboardTex(type) {
  return createCanvasTex(512, 256, (ctx, w, h) => {
    if (type === 'tulsa') {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#1e1410');
      g.addColorStop(1, '#5a220c');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#38e8ff';
      ctx.lineWidth = 10;
      ctx.strokeRect(6, 6, w - 12, h - 12);
      ctx.fillStyle = '#ff6a1a';
      ctx.font = 'bold 74px Impact, Arial Black, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TULSA KING', w / 2, 145);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.fillText('NEW SEASON • STREAMING NOW ON BROADWAY', w / 2, 196);
    } else if (type === 'vice') {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#461b7e');
      g.addColorStop(0.55, '#d93870');
      g.addColorStop(1, '#ff9d3b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Palm silhouettes
      ctx.fillStyle = '#190b28';
      ctx.fillRect(0, h - 42, w, 42);
      ctx.beginPath(); ctx.arc(85, 190, 45, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff5f8';
      ctx.font = 'bold 54px Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GRAND THEFT', w / 2 + 30, 92);
      ctx.fillStyle = '#ffdf6b';
      ctx.font = 'bold 64px Impact, sans-serif';
      ctx.fillText('VICE CITY VI', w / 2 + 30, 162);
      ctx.fillStyle = '#24e5ff';
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.fillText('I ♥ VICE CITY • TIMES SQUARE', w / 2 + 20, 205);
    } else if (type === 'gatsby') {
      ctx.fillStyle = '#0a1224';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#e5be5c';
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.strokeRect(20, 20, w - 40, h - 40);
      ctx.fillStyle = '#f5d276';
      ctx.font = 'bold 56px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('THE GREAT', w / 2, 105);
      ctx.font = 'bold 72px Georgia, serif';
      ctx.fillText('GATSBY', w / 2, 178);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px Arial, sans-serif';
      ctx.fillText('BROADWAY MUSICAL • 42ND STREET', w / 2, 215);
    } else if (type === 'mamma') {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, '#f5efe6');
      g.addColorStop(0.5, '#f5efe6');
      g.addColorStop(0.5, '#f4d348');
      g.addColorStop(1, '#f4d348');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#183a8a';
      ctx.font = 'bold 46px Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MAMMA MIA!', w * 0.25, 130);
      ctx.fillStyle = '#8b1a1a';
      ctx.font = 'bold 36px Impact, sans-serif';
      ctx.fillText('OPERATION', w * 0.75, 110);
      ctx.fillText('MINCEMEAT', w * 0.75, 155);
      ctx.fillStyle = '#111';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillText('WINTER GARDEN THEATRE', w * 0.25, 185);
      ctx.fillText('NEW BROADWAY HIT', w * 0.75, 200);
    } else {
      // Multi-tile 3D Corner Cube Display
      ctx.fillStyle = '#0e0b1a';
      ctx.fillRect(0, 0, w, h);
      const colors = ['#ff2a6d', '#05d9e8', '#ffc857', '#7b2cbf', '#ff6b35', '#00f5d4'];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          ctx.fillStyle = colors[(r * 3 + c) % colors.length];
          ctx.fillRect(10 + c * 166, 10 + r * 120, 154, 108);
          ctx.fillStyle = '#111';
          ctx.font = 'bold 26px Impact, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(['NYC', 'LIVE', 'BROADWAY', 'SUBWAY', '42ND ST', 'SURVIVE'][r * 3 + c], 87 + c * 166, 74 + r * 120);
        }
      }
    }
  });
}

function makeNeonSignTex(text, bg, fg, border) {
  return createCanvasTex(512, 128, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, w - 8, h - 8);
    }
    ctx.fillStyle = fg;
    ctx.font = 'bold 54px Impact, Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
  });
}

function makeSubwaySignTex() {
  return createCanvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#0c0e12';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 14, w, 4);
    ctx.font = 'bold 42px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Grand Central -', 26, 72);
    ctx.fillText('42 Street Station', 26, 122);

    const bullets = [
      { label: '4', col: '#00933c' },
      { label: '5', col: '#00933c' },
      { label: '6', col: '#00933c' },
      { label: '7', col: '#b933ad' },
      { label: 'S', col: '#808183' }
    ];
    bullets.forEach((b, i) => {
      const cx = 54 + i * 68;
      const cy = 188;
      ctx.fillStyle = b.col;
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, cx, cy + 2);
    });
  });
}

function makeSubwayArrivalTex() {
  return createCanvasTex(512, 192, (ctx, w, h) => {
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ff3870';
    ctx.fillRect(10, 10, w - 20, 78);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TIMES SQ • 42 ST LIVE', w / 2, 60);

    ctx.fillStyle = '#111622';
    ctx.fillRect(10, 96, w - 20, 86);
    ctx.fillStyle = '#38ff8c';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('6 Pelham Bay Park    2m', 24, 130);
    ctx.fillText('4 Woodlawn / 5 Bklyn 5m', 24, 164);
  });
}

function addNYCBoxCollider(colliders, minX, maxX, minZ, maxZ) {
  const c = { minX, maxX, minZ, maxZ, category: 'nyc', disabled: true };
  colliders.push(c);
  nycColliders.push(c);
}

function buildSkyscraper(group, colliders, x, z, w, d, h, windowTex, baseColor = 0x10141e) {
  const bGroup = new THREE.Group();
  bGroup.position.set(x, 0, z);

  const bodyMat = new THREE.MeshLambertMaterial({ map: windowTex, color: 0xffffff });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
  body.position.y = h * 0.5;
  bGroup.add(body);

  // Setback upper crown tier (classic Manhattan architecture)
  if (h > 36) {
    const crownH = h * 0.28;
    const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, crownH, d * 0.72), bodyMat);
    crown.position.y = h + crownH * 0.5;
    bGroup.add(crown);

    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.45, 12, 6),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    spire.position.y = h + crownH + 6;
    bGroup.add(spire);
  }

  // Ground-floor dark steel storefront fascia
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.3, 4.5, d + 0.3),
    new THREE.MeshLambertMaterial({ color: baseColor })
  );
  base.position.y = 2.25;
  bGroup.add(base);

  group.add(bGroup);
  addNYCBoxCollider(colliders, x - w * 0.5 - 0.3, x + w * 0.5 + 0.3, z - d * 0.5 - 0.3, z + d * 0.5 + 0.3);
  return bGroup;
}

function addLEDDisplay(group, x, y, z, w, h, rotY, tex, glowColor = null) {
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.5, h + 0.5, 0.35),
    new THREE.MeshBasicMaterial({ color: 0x080b12 })
  );
  frame.position.set(x, y, z);
  frame.rotation.y = rotY;

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  screen.position.z = 0.20;
  frame.add(screen);

  if (glowColor) {
    const light = new THREE.PointLight(glowColor, 1.4, 24);
    light.position.set(0, 0, 2.5);
    frame.add(light);
    nycLights.push(light);
  }

  group.add(frame);
  return frame;
}

function buildSubwayStation(group, colliders, tileTex, signTex, arrivalTex) {
  // Walkable Grand Central / 42nd St Subway Entrance at x = -19, z = -18 (facing +Z)
  const sub = new THREE.Group();
  const sx = -19.0;
  const sz = -18.0;
  sub.position.set(sx, 0, sz);

  const ironMat = new THREE.MeshLambertMaterial({ color: 0x161b18 });
  const tileMat = new THREE.MeshLambertMaterial({ map: tileTex });
  const stepMat = new THREE.MeshLambertMaterial({ color: 0x454952 });

  // Left & Right Cast-Iron Railings along stairwell (z = 0 down to z = -7)
  [-2.35, 2.35].forEach(rx => {
    const railWall = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.35, 7.2), ironMat);
    railWall.position.set(rx, 0.65, -3.5);
    sub.add(railWall);

    // Front Pillars with Iconic NYC Glowing Green Globe Lamps
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.8, 0.42), ironMat);
    post.position.set(rx, 1.4, 0.1);
    sub.add(post);

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x3dff8b })
    );
    globe.position.set(rx, 2.95, 0.1);
    sub.add(globe);
  });

  const greenGlow = new THREE.PointLight(0x28ff78, 2.4, 18);
  greenGlow.position.set(0, 3.1, 0.6);
  sub.add(greenGlow);
  nycLights.push(greenGlow);

  // Overhead Signboard ("Grand Central - 42 Street Station (4)(5)(6)(7)(S)")
  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(4.9, 1.45, 0.24),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  signBoard.position.set(0, 2.75, 0.05);
  sub.add(signBoard);

  // Digital Subway Arrival LED Screen mounted above the signboard
  const arrivalBoard = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 1.3, 0.20),
    new THREE.MeshBasicMaterial({ map: arrivalTex })
  );
  arrivalBoard.position.set(0, 4.25, 0.05);
  sub.add(arrivalBoard);

  // Walkable Staircase Steps (z = 0 to -7, y = 0 down to -3.4)
  const numSteps = 16;
  for (let i = 0; i < numSteps; i++) {
    const frac = (i + 0.5) / numSteps;
    const step = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.26, 7.0 / numSteps + 0.08), stepMat);
    step.position.set(0, -frac * 3.4 - 0.1, -frac * 7.0);
    sub.add(step);
  }

  // Underground Subway Platform Chamber (z = -7 to -19, y = -3.4)
  const platFloor = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.3, 13.0), stepMat);
  platFloor.position.set(0, -3.55, -13.0);
  sub.add(platFloor);

  // Yellow Platform Safety Edge
  const yellowEdge = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.04, 12.6),
    new THREE.MeshBasicMaterial({ color: 0xf2c229 })
  );
  yellowEdge.position.set(-4.6, -3.38, -13.0);
  sub.add(yellowEdge);

  // Tiled Underground Walls (with Graffiti, Fire Extinguisher, Green EXIT Sign, Blood Trail & Red Sneaker)
  const graffitiTileMat = new THREE.MeshLambertMaterial({ map: makeSubwayTileTex(true) });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(10.4, 4.2, 0.4), graffitiTileMat);
  backWall.position.set(0, -1.5, -19.2);
  sub.add(backWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 13.0), graffitiTileMat);
  rightWall.position.set(4.9, -1.5, -13.0);
  sub.add(rightWall);

  const exitSign = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.42, 0.08),
    new THREE.MeshBasicMaterial({ map: makeNeonSignTex('EXIT ->', '#155c2e', '#ffffff', '#b8e8c8') })
  );
  exitSign.position.set(2.2, -0.4, -18.95);
  sub.add(exitSign);

  const extCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.1, 0.14), new THREE.MeshLambertMaterial({ color: 0xb88618 }));
  extCabinet.position.set(0.4, -1.5, -18.95);
  sub.add(extCabinet);

  const extTank = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.65, 8), new THREE.MeshLambertMaterial({ color: 0xb81818 }));
  extTank.position.set(0.4, -1.55, -18.85);
  sub.add(extTank);

  const bloodStreak = new THREE.Mesh(
    new THREE.PlaneGeometry(0.65, 4.2),
    new THREE.MeshBasicMaterial({ color: 0x450508, transparent: true, opacity: 0.85, depthWrite: false })
  );
  bloodStreak.rotation.x = -Math.PI * 0.36;
  bloodStreak.rotation.z = 0.08;
  bloodStreak.position.set(0.2, -1.45, -3.2);
  sub.add(bloodStreak);

  const redSneaker = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.44), new THREE.MeshLambertMaterial({ color: 0xc41a1a }));
  redSneaker.position.set(-1.35, -0.42, -0.9);
  redSneaker.rotation.y = 0.45;
  sub.add(redSneaker);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.3, 13.0), ironMat);
  ceiling.position.set(0, 0.35, -13.0);
  sub.add(ceiling);

  // Fluorescent Subway Ceiling Tubes
  [-9.5, -14.5].forEach(lz => {
    const tube = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.1, 0.22),
      new THREE.MeshBasicMaterial({ color: 0xe6f8ff })
    );
    tube.position.set(0, 0.15, lz);
    sub.add(tube);
  });
  const subLight = new THREE.PointLight(0xc8f0ff, 2.2, 18);
  subLight.position.set(0, -0.6, -12.5);
  sub.add(subLight);
  nycLights.push(subLight);

  // Enterable NYC Subway Train Car on Track (Orange Vinyl Seats & Vertical Steel Poles)
  const trainCar = new THREE.Group();
  trainCar.position.set(-6.8, -2.0, -13.0);
  const steelMat = new THREE.MeshLambertMaterial({ color: 0x76808e });
  const trainFloor = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 13.5), new THREE.MeshLambertMaterial({ color: 0x262930 }));
  trainFloor.position.y = -1.35;
  trainCar.add(trainFloor);
  const trainRoof = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 13.5), steelMat);
  trainRoof.position.y = 1.45;
  trainCar.add(trainRoof);
  const trainBack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.8, 13.5), steelMat);
  trainBack.position.x = -1.42;
  trainCar.add(trainBack);
  [-4.6, 0, 4.6].forEach(szWall => {
    const wallSeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.8, 2.5), steelMat);
    wallSeg.position.set(1.42, 0.05, szWall);
    trainCar.add(wallSeg);
  });
  const orangeSeatMat = new THREE.MeshLambertMaterial({ color: 0xc95a1e });
  [-1.05, 1.05].forEach(sxSeat => {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 11.2), orangeSeatMat);
    bench.position.set(sxSeat, -0.95, 0);
    trainCar.add(bench);
  });
  for (let pz = -4.0; pz <= 4.0; pz += 2.6) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.75, 6), new THREE.MeshLambertMaterial({ color: 0xc2cbd6 }));
    pole.position.set(0, 0.05, pz);
    trainCar.add(pole);
  }
  const trainTube = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 10.0), new THREE.MeshBasicMaterial({ color: 0xfff0cc }));
  trainTube.position.set(0, 1.30, 0);
  trainCar.add(trainTube);
  sub.add(trainCar);

  // Colliders for Subway side walls & back wall (staircase, platform & train doorway stay walkable!)
  addNYCBoxCollider(colliders, sx - 2.6, sx - 2.1, sz - 7.2, sz + 0.4);
  addNYCBoxCollider(colliders, sx + 2.1, sx + 2.6, sz - 7.2, sz + 0.4);
  addNYCBoxCollider(colliders, sx - 8.4, sx + 5.2, sz - 19.6, sz - 18.8);
  addNYCBoxCollider(colliders, sx + 4.5, sx + 5.2, sz - 19.2, sz - 6.8);
  addNYCBoxCollider(colliders, sx - 8.4, sx - 8.0, sz - 19.2, sz - 6.8);

  group.add(sub);
}

function buildNYCTaxi(group, colliders, x, z, rotY, isCab = true) {
  const car = new THREE.Group();
  car.position.set(x, 0, z);
  car.rotation.y = rotY;

  const bodyMat = new THREE.MeshLambertMaterial({ color: isCab ? 0xf5b81d : 0x161922 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1e2b3c });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.72, 4.4), bodyMat);
  chassis.position.y = 0.56;
  car.add(chassis);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.64, 2.3), glassMat);
  cabin.position.set(0, 1.2, -0.1);
  car.add(cabin);

  if (isCab) {
    const roofSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.22, 0.32),
      new THREE.MeshBasicMaterial({ color: 0xffe484 })
    );
    roofSign.position.set(0, 1.62, 0.1);
    car.add(roofSign);
  }

  // Headlights & Taillights
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
  asphaltTex.repeat.set(28, 28);

  const sidewalkTex = makeSidewalkTex();
  sidewalkTex.wrapS = sidewalkTex.wrapT = THREE.RepeatWrapping;
  sidewalkTex.repeat.set(16, 40);

  const winGold = makeSkyscraperWindowsTex('#ffd67a');
  const winCyan = makeSkyscraperWindowsTex('#8ce2ff');
  const tileTex = makeSubwayTileTex();
  tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
  tileTex.repeat.set(4, 2);

  // 1. Ground Asphalt Plane (leaving stairwell cutout at x:[-21.5,-16.5], z:[-18,-36] via 4 tiles)
  const asphaltMat = new THREE.MeshLambertMaterial({ map: asphaltTex });
  const addGroundTile = (minX, maxX, minZ, maxZ) => {
    const w = maxX - minX;
    const d = maxZ - minZ;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), asphaltMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((minX + maxX) * 0.5, 0.01, (minZ + maxZ) * 0.5);
    m.receiveShadow = true;
    nycGroup.add(m);
  };
  addGroundTile(-160, 160, -18.0, 160);    // South half (player spawn + Times Square main plaza)
  addGroundTile(-160, -21.5, -160, -18.0); // West of subway
  addGroundTile(-16.5, 160, -160, -18.0);  // East of subway
  addGroundTile(-21.5, -16.5, -160, -37.2); // North of subway chamber

  // Road Markings: Yellow Centerlines, White Crosswalks, & Red Bus Lanes
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

  // 2. Towering Times Square Skyscrapers
  buildSkyscraper(nycGroup, colliders, -34, -8, 18, 22, 58, winGold);
  buildSkyscraper(nycGroup, colliders, -34, 22, 18, 22, 72, winCyan);
  buildSkyscraper(nycGroup, colliders, -36, 52, 20, 20, 48, winGold);
  buildSkyscraper(nycGroup, colliders, -34, -44, 18, 22, 64, winCyan);

  buildSkyscraper(nycGroup, colliders, 34, -10, 18, 24, 68, winCyan);
  buildSkyscraper(nycGroup, colliders, 34, 24, 18, 22, 54, winGold);
  buildSkyscraper(nycGroup, colliders, 36, 54, 20, 20, 76, winCyan);
  buildSkyscraper(nycGroup, colliders, 34, -44, 18, 22, 62, winGold);

  // Iconic Central North Times Square Wedge Tower (One Times Square)
  buildSkyscraper(nycGroup, colliders, 0, -56, 22, 18, 86, winGold, 0x0b0e18);

  // Distant Manhattan Skyline & Illuminated Twin Towers Silhouette (from ref photo 3)
  [-18, 18].forEach(tx => {
    const twin = new THREE.Mesh(
      new THREE.BoxGeometry(16, 115, 16),
      new THREE.MeshBasicMaterial({ map: winGold, color: 0xffe4a0 })
    );
    twin.position.set(tx - 42, 57.5, -122);
    nycGroup.add(twin);
  });
  const skylineSpire = new THREE.Mesh(
    new THREE.BoxGeometry(14, 96, 14),
    new THREE.MeshBasicMaterial({ map: winCyan, color: 0xa2f2ff })
  );
  skylineSpire.position.set(52, 48, -118);
  nycGroup.add(skylineSpire);

  // 3. Massive Glowing LED Screens & 3D Corner Cube Billboards
  const texTulsa = makeBillboardTex('tulsa');
  const texVice = makeBillboardTex('vice');
  const texGatsby = makeBillboardTex('gatsby');
  const texMamma = makeBillboardTex('mamma');
  const texCube = makeBillboardTex('cube');

  // West Tower LED Screens (facing East into Times Square)
  addLEDDisplay(nycGroup, -24.6, 14.5, -8, 17, 9, Math.PI / 2, texTulsa, 0xff6a2a);
  addLEDDisplay(nycGroup, -24.6, 13.5, 22, 17, 9.5, Math.PI / 2, texMamma, 0xffe066);
  addLEDDisplay(nycGroup, -24.6, 26.5, 22, 14, 11, Math.PI / 2, texGatsby, 0xffd270);

  // East Tower LED Screens (facing West into Times Square)
  addLEDDisplay(nycGroup, 24.6, 14.0, -10, 18, 9.5, -Math.PI / 2, texVice, 0xff3898);
  addLEDDisplay(nycGroup, 24.6, 26.0, -10, 13, 10, -Math.PI / 2, texTulsa, 0x38e8ff);
  addLEDDisplay(nycGroup, 24.6, 14.0, 24, 17, 9.5, -Math.PI / 2, texGatsby, 0xffc857);

  // Central One Times Square Giant Stack + 3D Corner Cube (facing South toward player)
  addLEDDisplay(nycGroup, 0, 15.0, -46.6, 19, 10.5, 0, texVice, 0xff3b9a);
  addLEDDisplay(nycGroup, 0, 28.5, -46.6, 16, 11, 0, texCube, 0x24e5ff);
  addLEDDisplay(nycGroup, 0, 41.0, -46.6, 14, 9, 0, texTulsa, 0xff7722);

  // 3D Corner Wrap-Around LED Cube on East-South Corner
  addLEDDisplay(nycGroup, 16.5, 11.5, -36.0, 8.5, 8.5, -Math.PI / 4, texCube, 0x00f5d4);

  // Ground-Floor Storefront Neon Signs
  addLEDDisplay(nycGroup, -24.6, 4.2, 22, 12, 2.6, Math.PI / 2, makeNeonSignTex('GIFTS • LUGGAGE • NYC', '#0a1430', '#ffd84d', '#ffffff'));
  addLEDDisplay(nycGroup, 24.6, 4.2, -10, 12, 2.6, -Math.PI / 2, makeNeonSignTex('BURGER MAN • RAY\'S PIZZA', '#1a0608', '#ff3b3b', '#ffaa22'));
  addLEDDisplay(nycGroup, 24.6, 4.2, 24, 11, 2.6, -Math.PI / 2, makeNeonSignTex('DISNEY • BROADWAY', '#081838', '#ff4d88', '#38e8ff'));
  addLEDDisplay(nycGroup, 0, 4.4, -46.6, 16, 2.8, 0, makeNeonSignTex('I ♥ VICE CITY', '#280a48', '#ffffff', '#ff3b9a'));

  // Animated Scrolling LED News Ticker
  tickerTex = createCanvasTex(1024, 64, (ctx, w, h) => {
    ctx.fillStyle = '#050812';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ff2a4b';
    ctx.font = 'bold 34px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText('BREAKING: TIMES SQUARE LOCKDOWN • SUBWAY 4/5/6/7 SUSPENDED • SURVIVE THE HORDE • ', 12, h / 2);
  });
  tickerTex.wrapS = THREE.RepeatWrapping;
  addLEDDisplay(nycGroup, 0, 8.0, -46.6, 21.5, 1.4, 0, tickerTex);

  // 4. Walkable Grand Central / 42nd Street Subway Station
  buildSubwayStation(nycGroup, colliders, tileTex, makeSubwaySignTex(), makeSubwayArrivalTex());

  // 5. NYC Yellow Cabs, SUVs & Streetlamps
  buildNYCTaxi(nycGroup, colliders, -10.5, 2.0, 0.12, true);
  buildNYCTaxi(nycGroup, colliders, 11.0, 18.0, Math.PI - 0.15, true);
  buildNYCTaxi(nycGroup, colliders, 10.2, -16.0, Math.PI + 0.08, false);
  buildNYCTaxi(nycGroup, colliders, -11.5, 34.0, -0.18, true);

  // Warm NYC Streetlamps lining the sidewalks
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x1a1e26 });
  [[-16.2, 6], [-16.2, 28], [16.2, -6], [16.2, 24]].forEach(([lx, lz]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.2, 8), poleMat);
    pole.position.set(lx, 3.1, lz);
    nycGroup.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe4a8 }));
    bulb.position.set(lx, 6.2, lz);
    nycGroup.add(bulb);
  });

  nycGroup.visible = false;
  scene.add(nycGroup);
  return nycGroup;
}

export function setTimesSquareActive(active) {
  if (nycGroup) {
    nycGroup.visible = !!active;
  }
  nycColliders.forEach(c => {
    c.disabled = !active;
  });
}

export function updateTimesSquareEffects(dt) {
  if (!nycGroup || !nycGroup.visible) return;
  if (tickerTex) {
    tickerTex.offset.x = (tickerTex.offset.x + dt * 0.22) % 1.0;
  }
}
