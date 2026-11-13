/* =========================================================================
   TACTICAL SURVIVAL MAP & MINIMAP RADAR SYSTEM
   - Fullscreen interactive survival tactical map (Toggle with [M] or HUD button)
   - Real-time player positioning, camera heading cone, companion markers (Kristin & Natalia)
   - Topographic landscape: North Waterfall, Sanctuary Farmhouse, Village,
     Winding River & Bridge, Golden Sand Beach, Wooden Fishing Pier, Ocean, and Quarantine Perimeter.
   - Real-time in-game HUD Minimap Radar with zone detection
   ========================================================================= */

import { playerPos, yaw, state } from '../core/player.js';
import { andikaModel } from '../entities/kristin.js';
import { nataliaModel } from '../entities/natalia.js';
import { zombies, currentBoss } from '../entities/enemies.js';
import { getRiverCenterX, getRiverWaterY, getTerrainHeight, MAP_LIMIT } from '../world/environment.js';
import { updateTouchControlsVisibility } from './touchControls.js';

export let isMapOpen = false;
let mapAnimId = null;
let minimapCanvas = null;
let minimapCtx = null;
let fullMapCanvas = null;
let fullMapCtx = null;

// Biome / Zone naming based on player coordinates
export function getPlayerZoneName(x, z) {
  if (z > 125.5) return 'LAUTAN SELATAN (OPEN OCEAN)';
  if (z >= 76.0) {
    if (x >= 10.0 && x <= 18.0 && z >= 112.0 && z <= 138.0) return 'DERMAGA NELAYAN (FISHING PIER)';
    if (Math.abs(x - 44.0) < 9.0 && Math.abs(z - 116.0) < 8.0) return 'PERAHU TERDAMPAR (BEACHED BOAT)';
    if (Math.abs(x - getRiverCenterX(z)) < 9.0) return 'DELTA MUARA SUNGAI (RIVER ESTUARY)';
    return 'PANTAI PASIR EMAS (GOLDEN SAND BEACH)';
  }
  if (z <= -55.0 && Math.abs(x - 42.0) < 32.0) return 'AIR TERJUN UTARA (WATERFALL CANYON)';
  if (Math.hypot(x - (-13), z - (-6)) < 15.0) return 'RUMAH AMAN (SANCTUARY FARMHOUSE)';
  if (Math.abs(z - 4.0) < 4.0 && Math.abs(x - getRiverCenterX(4.0)) < 8.0) return 'JEMBATAN KAYU (WOODEN BRIDGE)';
  if (Math.abs(x - getRiverCenterX(z)) < 6.5) return 'LEMBAH SUNGAI (ALPINE RIVER)';
  if ((Math.hypot(x - 18, z - 6) < 14.0) || (Math.hypot(x - 22, z - (-20)) < 14.0) || (Math.hypot(x - 16, z - 28) < 14.0)) {
    return 'DESA KABIN (VILLAGE CABINS)';
  }
  return 'HUTAN SALJU (DENSE SNOW FOREST)';
}

export function openMap(gameState) {
  if (isMapOpen) return;
  isMapOpen = true;

  if (gameState && gameState.running) {
    if (document.pointerLockElement === document.body && document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  const mapScreen = document.getElementById('screen-tactical-map');
  if (mapScreen) {
    mapScreen.style.display = 'flex';
  }

  updateTouchControlsVisibility();
  startMapRenderLoop();
}

export function closeMap(gameState) {
  if (!isMapOpen) return;
  isMapOpen = false;

  const mapScreen = document.getElementById('screen-tactical-map');
  if (mapScreen) {
    mapScreen.style.display = 'none';
  }

  if (mapAnimId) {
    cancelAnimationFrame(mapAnimId);
    mapAnimId = null;
  }

  if (gameState && gameState.running && !gameState.isPaused && gameState.player && gameState.player.lives > 0) {
    try {
      document.body.requestPointerLock?.();
    } catch (err) {}
  }

  updateTouchControlsVisibility();
}

export function toggleMap(gameState) {
  if (isMapOpen) {
    closeMap(gameState);
  } else {
    openMap(gameState);
  }
}

function startMapRenderLoop() {
  function renderFrame() {
    if (!isMapOpen) return;
    drawFullTacticalMap();
    mapAnimId = requestAnimationFrame(renderFrame);
  }
  renderFrame();
}

/**
 * Draw Fullscreen Interactive Tactical Map
 */
function drawFullTacticalMap() {
  if (!fullMapCanvas) {
    fullMapCanvas = document.getElementById('tactical-map-canvas');
    if (!fullMapCanvas) return;
    fullMapCtx = fullMapCanvas.getContext('2d');
  }

  const ctx = fullMapCtx;
  const w = fullMapCanvas.width;
  const h = fullMapCanvas.height;

  // Coordinate conversion: World (-150 to 150) -> Canvas (0 to w, 0 to h)
  const mapLim = MAP_LIMIT || 150;
  const worldMinX = -mapLim;
  const worldMaxX = mapLim;
  const worldMinZ = -100;
  const worldMaxZ = 160;

  function toCanvasX(wx) {
    return ((wx - worldMinX) / (worldMaxX - worldMinX)) * w;
  }
  function toCanvasY(wz) {
    return ((wz - worldMinZ) / (worldMaxZ - worldMinZ)) * h;
  }

  // 1. Clear background (Dark military parchment tone)
  ctx.fillStyle = '#101715';
  ctx.fillRect(0, 0, w, h);

  // 2. Snowy Forest Background with subtle topography grid
  ctx.fillStyle = '#22322b';
  ctx.fillRect(toCanvasX(-mapLim), toCanvasY(-mapLim), toCanvasX(mapLim) - toCanvasX(-mapLim), toCanvasY(mapLim) - toCanvasY(-mapLim));

  // Tactical Grid Lines
  ctx.strokeStyle = 'rgba(74, 130, 91, 0.22)';
  ctx.lineWidth = 1;
  const gridStep = 25; // every 25m
  for (let gx = -mapLim; gx <= mapLim; gx += gridStep) {
    const cx = toCanvasX(gx);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();
  }
  for (let gz = worldMinZ; gz <= worldMaxZ; gz += gridStep) {
    const cy = toCanvasY(gz);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
  }

  // 3. Ocean Water Area (z >= 125.5)
  const oceanTopY = toCanvasY(125.5);
  ctx.fillStyle = '#14384a';
  ctx.fillRect(0, oceanTopY, w, h - oceanTopY);

  // Ocean wave lines
  ctx.strokeStyle = 'rgba(100, 185, 220, 0.35)';
  ctx.lineWidth = 1.5;
  for (let oz = 132; oz <= worldMaxZ; oz += 8) {
    const cy = toCanvasY(oz);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    for (let cx = 0; cx <= w; cx += 20) {
      const wy = cy + Math.sin(cx * 0.08 + performance.now() * 0.003) * 3;
      if (cx === 0) ctx.moveTo(cx, wy);
      else ctx.lineTo(cx, wy);
    }
    ctx.stroke();
  }

  // 4. Golden Sand Beach Area (z: 76 to 126)
  ctx.beginPath();
  const beachStartY = toCanvasY(76.0);
  ctx.moveTo(0, beachStartY);
  for (let cx = 0; cx <= w; cx += 15) {
    const wx = worldMinX + (cx / w) * (worldMaxX - worldMinX);
    const edgeWave = Math.sin(wx * 0.075) * 5.2 + Math.cos(wx * 0.13) * 2.8;
    const wy = toCanvasY(76.0 + edgeWave);
    ctx.lineTo(cx, wy);
  }
  ctx.lineTo(w, oceanTopY);
  ctx.lineTo(0, oceanTopY);
  ctx.closePath();
  ctx.fillStyle = '#b89d6e'; // Rich golden sand tone
  ctx.fill();

  // Wet Sand Ribbon
  ctx.fillStyle = 'rgba(120, 95, 62, 0.85)';
  ctx.fillRect(0, toCanvasY(123.0), w, toCanvasY(126.0) - toCanvasY(123.0));

  // Shoreline Surf Foam Line
  ctx.strokeStyle = 'rgba(235, 248, 255, 0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let cx = 0; cx <= w; cx += 10) {
    const cy = oceanTopY + Math.sin(cx * 0.1 + performance.now() * 0.0025) * 2.0;
    if (cx === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();

  // 5. River Drawing (Upper feeder stream & Winding Alpine river)
  // A. Upper Stream
  ctx.strokeStyle = '#3d88b0';
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (let rz = -92; rz <= -58; rz += 2) {
    const rx = 42.0 + Math.sin((rz - (-58.6)) * 0.075) * 2.2;
    const cx = toCanvasX(rx);
    const cy = toCanvasY(rz);
    if (rz === -92) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();

  // Waterfall Cliff Crest Line
  ctx.strokeStyle = '#dcf2fc';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(toCanvasX(36), toCanvasY(-58));
  ctx.lineTo(toCanvasX(48), toCanvasY(-58));
  ctx.stroke();

  // B. Lower Winding River down to Beach Estuary (z: -58 to 126)
  ctx.beginPath();
  for (let rz = -58; rz <= 126; rz += 2) {
    const rx = getRiverCenterX(rz);
    const widen = (rz > 78.0) ? (1.0 + (rz - 78.0) * 0.024) : 1.0;
    const halfW = 5.25 * widen;
    const cx = toCanvasX(rx);
    const cy = toCanvasY(rz);
    const pxW = (halfW / (worldMaxX - worldMinX)) * w * 2;
    ctx.lineWidth = Math.max(7, pxW);
    if (rz === -58) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.strokeStyle = '#2b6e94';
  ctx.stroke();

  // 6. Wooden Bridge (z = 4.0)
  const brX = getRiverCenterX(4.0);
  ctx.fillStyle = '#6e492f';
  ctx.fillRect(toCanvasX(brX - 6.5), toCanvasY(3.0), toCanvasX(brX + 6.5) - toCanvasX(brX - 6.5), toCanvasY(5.0) - toCanvasY(3.0));
  ctx.strokeStyle = '#996f4e';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(toCanvasX(brX - 6.5), toCanvasY(3.0), toCanvasX(brX + 6.5) - toCanvasX(brX - 6.5), toCanvasY(5.0) - toCanvasY(3.0));

  // 7. Wooden Fishing Pier (x: 14.0, z: 112 to 138)
  const pierLeft = toCanvasX(12.3);
  const pierRight = toCanvasX(15.7);
  const pierTop = toCanvasY(112.0);
  const pierBottom = toCanvasY(138.0);
  ctx.fillStyle = '#5c3e29';
  ctx.fillRect(pierLeft, pierTop, pierRight - pierLeft, pierBottom - pierTop);
  ctx.strokeStyle = '#a67b53';
  ctx.lineWidth = 2;
  ctx.strokeRect(pierLeft, pierTop, pierRight - pierLeft, pierBottom - pierTop);

  // Pier Pier-end Lanterns
  ctx.fillStyle = '#ffbb44';
  ctx.beginPath();
  ctx.arc(pierLeft + 3, pierBottom - 3, 3.5, 0, Math.PI * 2);
  ctx.arc(pierRight - 3, pierBottom - 3, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 8. Landmarks & Buildings
  // Sanctuary White Farmhouse (-13, -6)
  ctx.fillStyle = '#d2e4ea';
  ctx.fillRect(toCanvasX(-13 - 5.5), toCanvasY(-6 - 4.5), toCanvasX(-13 + 5.5) - toCanvasX(-13 - 5.5), toCanvasY(-6 + 4.5) - toCanvasY(-6 - 4.5));
  ctx.strokeStyle = '#537d8d';
  ctx.lineWidth = 2;
  ctx.strokeRect(toCanvasX(-13 - 5.5), toCanvasY(-6 - 4.5), toCanvasX(-13 + 5.5) - toCanvasX(-13 - 5.5), toCanvasY(-6 + 4.5) - toCanvasY(-6 - 4.5));

  // Cabins & Shacks
  const cabins = [
    { x: 18, z: 6, w: 4.5, d: 3.5 },
    { x: 22, z: -20, w: 4.8, d: 4.0 },
    { x: -22, z: 22, w: 4.2, d: 3.8 },
    { x: 16, z: 28, w: 3.8, d: 3.2 }
  ];
  cabins.forEach(c => {
    ctx.fillStyle = '#8f7762';
    ctx.fillRect(toCanvasX(c.x - c.w), toCanvasY(c.z - c.d), toCanvasX(c.x + c.w) - toCanvasX(c.x - c.w), toCanvasY(c.z + c.d) - toCanvasY(c.z - c.d));
    ctx.strokeStyle = '#c4ab95';
    ctx.lineWidth = 1;
    ctx.strokeRect(toCanvasX(c.x - c.w), toCanvasY(c.z - c.d), toCanvasX(c.x + c.w) - toCanvasX(c.x - c.w), toCanvasY(c.z + c.d) - toCanvasY(c.z - c.d));
  });

  // Beached Boat (44, 116)
  ctx.fillStyle = '#4a382c';
  ctx.beginPath();
  ctx.ellipse(toCanvasX(44), toCanvasY(116), 7, 4, 0.35, 0, Math.PI * 2);
  ctx.fill();

  // 9. Perimeter Fence Boundary (limit: ±150m)
  ctx.strokeStyle = '#e65151';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(toCanvasX(-mapLim), toCanvasY(-mapLim), toCanvasX(mapLim) - toCanvasX(-mapLim), toCanvasY(mapLim) - toCanvasY(-mapLim));
  ctx.setLineDash([]);

  // 10. Landmark Text Labels
  ctx.font = 'bold 12px "VT323", monospace';
  ctx.fillStyle = '#d2e4ea';
  ctx.fillText('AIR TERJUN', toCanvasX(42) + 12, toCanvasY(-58) + 4);
  ctx.fillText('RUMAH AMAN', toCanvasX(-13) - 65, toCanvasY(-6));
  ctx.fillText('JEMBATAN', toCanvasX(brX) + 16, toCanvasY(4) + 4);
  ctx.fillText('PANTAI PASIR EMAS', toCanvasX(-60), toCanvasY(96));
  ctx.fillText('DERMAGA', toCanvasX(14) + 12, toCanvasY(128));
  ctx.fillText('PERAHU', toCanvasX(44) + 12, toCanvasY(116));
  ctx.fillText('LAUTAN SELATAN', toCanvasX(-45), toCanvasY(148));

  // 11. Companions Markers
  // Kristin (Cyan Marker)
  if (andikaModel && andikaModel.root) {
    const kx = toCanvasX(andikaModel.root.position.x);
    const kz = toCanvasY(andikaModel.root.position.z);
    ctx.fillStyle = '#2de8a0';
    ctx.beginPath();
    ctx.arc(kx, kz, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#9de8b7';
    ctx.fillText('KRISTIN', kx + 8, kz + 4);
  }

  // Agent Natalia (Gold Marker)
  if (state.nataliaSpawned && nataliaModel && nataliaModel.root && nataliaModel.root.visible) {
    const nx = toCanvasX(nataliaModel.root.position.x);
    const nz = toCanvasY(nataliaModel.root.position.z);
    ctx.fillStyle = '#ffbb33';
    ctx.beginPath();
    ctx.arc(nx, nz, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#ffd15c';
    ctx.fillText('AGENT NATALIA', nx + 8, nz + 4);
  }

  // Active Boss Marker (Crimson pulsing skull/circle)
  if (currentBoss && !currentBoss.isDead && currentBoss.model && currentBoss.model.root) {
    const bx = toCanvasX(currentBoss.x);
    const bz = toCanvasY(currentBoss.z);
    const pulse = 6 + Math.sin(performance.now() * 0.008) * 2.5;

    ctx.fillStyle = 'rgba(255, 30, 50, 0.35)';
    ctx.beginPath();
    ctx.arc(bx, bz, pulse + 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff2233';
    ctx.beginPath();
    ctx.arc(bx, bz, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#ff6677';
    ctx.fillText('BOSS: NONA BATAVIA', bx + 12, bz + 4);
  }

  // 12. Player Marker (Blinking Pin with Directional View Cone)
  const px = playerPos ? playerPos.x : 0;
  const pz = playerPos ? playerPos.z : 14;
  const pcx = toCanvasX(px);
  const pcz = toCanvasY(pz);

  // Vision / View Direction Cone
  const coneLen = 28;
  const fovAngle = 0.55; // ~32 degrees half-angle
  // Note: in 3D, forward is -cos(yaw), -sin(yaw)
  const heading = yaw; // angle in rad
  const leftAngle = heading - Math.PI / 2 - fovAngle;
  const rightAngle = heading - Math.PI / 2 + fovAngle;

  ctx.fillStyle = 'rgba(255, 235, 80, 0.28)';
  ctx.beginPath();
  ctx.moveTo(pcx, pcz);
  ctx.lineTo(pcx - Math.sin(heading - fovAngle) * coneLen, pcz - Math.cos(heading - fovAngle) * coneLen);
  ctx.lineTo(pcx - Math.sin(heading + fovAngle) * coneLen, pcz - Math.cos(heading + fovAngle) * coneLen);
  ctx.closePath();
  ctx.fill();

  // Pulsing Player Pin
  const pPulse = 5.5 + Math.sin(performance.now() * 0.007) * 1.5;
  ctx.fillStyle = 'rgba(255, 60, 60, 0.4)';
  ctx.beginPath();
  ctx.arc(pcx, pcz, pPulse + 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffdd33';
  ctx.beginPath();
  ctx.arc(pcx, pcz, pPulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Player Label
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('📍 YOU (KAMU)', pcx + 10, pcz - 8);

  // 13. Update Header Info Readout
  const infoEl = document.getElementById('map-coords-info');
  if (infoEl) {
    const curElev = getTerrainHeight(px, pz).toFixed(1);
    const zone = getPlayerZoneName(px, pz);
    infoEl.innerHTML = `<span>POSISI: <strong>X: ${px.toFixed(1)}</strong>, <strong>Z: ${pz.toFixed(1)}</strong></span> &bull; <span>ELEV: <strong>${curElev}m</strong></span> &bull; <span style="color:#ffd15c;">ZONA: <strong>${zone}</strong></span>`;
  }
}

/**
 * Update In-Game HUD Circular Minimap Radar
 */
export function updateMinimapRadar() {
  if (!minimapCanvas) {
    minimapCanvas = document.getElementById('hud-minimap-canvas');
    if (!minimapCanvas) return;
    minimapCtx = minimapCanvas.getContext('2d');
  }

  const ctx = minimapCtx;
  const size = minimapCanvas.width; // e.g. 140
  const center = size / 2;
  const radius = center - 4;

  ctx.clearRect(0, 0, size, size);

  // Circular Clip
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.clip();

  // Radar Background
  ctx.fillStyle = 'rgba(12, 22, 17, 0.92)';
  ctx.fillRect(0, 0, size, size);

  // Range: 50 meters from player
  const radarRange = 50.0;
  const px = playerPos ? playerPos.x : 0;
  const pz = playerPos ? playerPos.z : 14;

  function toRadar(wx, wz) {
    // Relative to player
    const dx = wx - px;
    const dz = wz - pz;
    // Rotate relative to player heading (so forward is up on the radar)
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const rx = dx * cosY - dz * sinY;
    const rz = dx * sinY + dz * cosY;

    const ix = center + (rx / radarRange) * (radius - 8);
    const iy = center + (rz / radarRange) * (radius - 8);
    return { x: ix, y: iy };
  }

  // Draw River Ribbon if within range
  ctx.strokeStyle = 'rgba(45, 120, 175, 0.65)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  let riverStarted = false;
  for (let rz = Math.max(-58, pz - radarRange); rz <= Math.min(126, pz + radarRange); rz += 4) {
    const rx = getRiverCenterX(rz);
    const p = toRadar(rx, rz);
    if (!riverStarted) {
      ctx.moveTo(p.x, p.y);
      riverStarted = true;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  if (riverStarted) ctx.stroke();

  // Draw Beach & Ocean boundary if within range
  if (pz + radarRange >= 76) {
    ctx.fillStyle = 'rgba(184, 157, 110, 0.35)';
    ctx.fillRect(0, toRadar(0, 76).y, size, size);
  }
  if (pz + radarRange >= 125.5) {
    ctx.fillStyle = 'rgba(20, 56, 74, 0.75)';
    ctx.fillRect(0, toRadar(0, 125.5).y, size, size);
  }

  // Range rings (25m and 50m)
  ctx.strokeStyle = 'rgba(74, 130, 91, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(center, center, (radius - 8) * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(center, center, radius - 8, 0, Math.PI * 2);
  ctx.stroke();

  // Crosshairs
  ctx.beginPath();
  ctx.moveTo(center, center - (radius - 8));
  ctx.lineTo(center, center + (radius - 8));
  ctx.moveTo(center - (radius - 8), center);
  ctx.lineTo(center + (radius - 8), center);
  ctx.stroke();

  // Nearby Zombies (Red Dots)
  if (zombies && zombies.length) {
    ctx.fillStyle = '#ff3344';
    for (let i = 0; i < zombies.length; i++) {
      const z = zombies[i];
      if (z.isDead) continue;
      const dist = Math.hypot(z.x - px, z.z - pz);
      if (dist < radarRange) {
        const zp = toRadar(z.x, z.z);
        ctx.beginPath();
        ctx.arc(zp.x, zp.y, z.isBoss ? 5.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Kristin (Cyan dot)
  if (andikaModel && andikaModel.root) {
    const kp = toRadar(andikaModel.root.position.x, andikaModel.root.position.z);
    ctx.fillStyle = '#2de8a0';
    ctx.beginPath();
    ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Natalia (Gold dot)
  if (state.nataliaSpawned && nataliaModel && nataliaModel.root && nataliaModel.root.visible) {
    const np = toRadar(nataliaModel.root.position.x, nataliaModel.root.position.z);
    ctx.fillStyle = '#ffbb33';
    ctx.beginPath();
    ctx.arc(np.x, np.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player at Center (Facing UP on radar)
  ctx.fillStyle = '#ffee44';
  ctx.beginPath();
  ctx.moveTo(center, center - 6);
  ctx.lineTo(center - 5, center + 5);
  ctx.lineTo(center, center + 2);
  ctx.lineTo(center + 5, center + 5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Radar Ring Frame & Compass North
  ctx.strokeStyle = '#4a825b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.stroke();

  // North Indicator letter (N)
  const nAngle = -yaw - Math.PI / 2;
  const nx = center + Math.cos(nAngle) * (radius - 8);
  const ny = center + Math.sin(nAngle) * (radius - 8);
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#ff4444';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', nx, ny);

  // Update current zone badge in minimap label
  const zoneLabel = document.getElementById('minimap-zone-badge');
  if (zoneLabel) {
    zoneLabel.textContent = getPlayerZoneName(px, pz);
  }
}

/**
 * Setup Click & Keyboard Listeners for Tactical Map
 */
export function setupMapListeners(gameState) {
  // HUD map button
  const hudMapBtn = document.getElementById('hud-map-btn');
  if (hudMapBtn) {
    hudMapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMap(gameState);
    });
  }

  // Minimap container click -> opens map
  const minimapCont = document.getElementById('hud-minimap');
  if (minimapCont) {
    minimapCont.addEventListener('click', (e) => {
      e.stopPropagation();
      openMap(gameState);
    });
  }

  // Close map button on modal
  const closeBtn = document.getElementById('btn-close-map');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMap(gameState);
    });
  }
  const closeX = document.getElementById('btn-close-map-x');
  if (closeX) {
    closeX.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMap(gameState);
    });
  }

  // Mobile Touch Map button
  const touchMapBtn = document.getElementById('btn-touch-map');
  if (touchMapBtn) {
    touchMapBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMap(gameState);
    });
    touchMapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMap(gameState);
    });
  }
}

