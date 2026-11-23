/* =========================================================================
   TACTICAL SURVIVAL MAP & MINIMAP RADAR SYSTEM
   - Fullscreen interactive survival tactical map (Toggle with [M] or HUD button)
   - Real-time player positioning, camera heading cone, companion markers (Kristin & Natalia)
   - Topographic landscape: North Waterfall, Sanctuary Farmhouse, Village,
     Winding River & Bridge, Golden Sand Beach, Wooden Fishing Pier, Ocean, and Quarantine Perimeter.
   - Real-time in-game HUD Minimap Radar with zone detection
   ========================================================================= */

import { playerPos, yaw, state } from '../core/player.js';
import { kristinModel } from '../entities/kristin.js';
import { nataliaModel } from '../entities/natalia.js';
import { zombies, currentBoss } from '../entities/enemies.js';
import { getRiverCenterX, getRiverWaterY, getTerrainHeight, MAP_LIMIT } from '../world/environment.js';
import { updateTouchControlsVisibility } from './touchControls.js';
import { getActiveObjective } from '../core/quest.js';
import { VILLAGE_NPCS } from '../entities/villager.js';

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

  // Sync active survivor objective in journal box
  const obj = getActiveObjective();
  if (obj) {
    const cEl = document.getElementById('map-journal-chapter');
    const tEl = document.getElementById('map-journal-title');
    const dEl = document.getElementById('map-journal-desc');
    const lEl = document.getElementById('map-journal-loc');
    if (cEl) cEl.textContent = obj.chapter;
    if (tEl) tEl.textContent = obj.title;
    if (dEl) dEl.textContent = `"${obj.journal}"`;
    if (lEl) lEl.textContent = `📍 Lokasi: ${obj.location}`;
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

  // 1. Clear background (Dark cold parchment tone)
  ctx.fillStyle = '#0f1412';
  ctx.fillRect(0, 0, w, h);

  // 2. Snowy Forest Background with subtle topography grid
  ctx.fillStyle = '#1c2621';
  ctx.fillRect(toCanvasX(-mapLim), toCanvasY(-mapLim), toCanvasX(mapLim) - toCanvasX(-mapLim), toCanvasY(mapLim) - toCanvasY(-mapLim));

  // Tactical Grid Lines
  ctx.strokeStyle = 'rgba(90, 40, 50, 0.25)';
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

  // 2b. Mountain Highway Asphalt Road & Coldbrook Village Road System
  const roadLeft = toCanvasX(-3.4);
  const roadRight = toCanvasX(3.4);
  const roadTop = toCanvasY(-145.0);
  const roadBottom = toCanvasY(28.0);
  ctx.fillStyle = '#262b30';
  ctx.fillRect(roadLeft, roadTop, roadRight - roadLeft, roadBottom - roadTop);
  ctx.strokeStyle = '#434a54';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(roadLeft, roadTop, roadRight - roadLeft, roadBottom - roadTop);

  // Center dashed yellow lane markings
  ctx.strokeStyle = '#d4aa33';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(toCanvasX(0), roadTop);
  ctx.lineTo(toCanvasX(0), roadBottom);
  ctx.stroke();
  ctx.setLineDash([]);

  // Highway Route Marker Label (Blackwood Moors Highway)
  ctx.fillStyle = '#8f9aa6';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('HIGHWAY (BLACKWOOD MOORS)', toCanvasX(0), toCanvasY(-70.0));

  // Coldbrook Village Entrance Archway Gate (z = 16)
  const gateY = toCanvasY(16.0);
  ctx.fillStyle = '#7a1f28';
  ctx.fillRect(toCanvasX(-5.0), gateY - 2.5, toCanvasX(5.0) - toCanvasX(-5.0), 5);
  ctx.strokeStyle = '#e63946';
  ctx.lineWidth = 1;
  ctx.strokeRect(toCanvasX(-5.0), gateY - 2.5, toCanvasX(5.0) - toCanvasX(-5.0), 5);

  // Village Dirt Walking Trails connecting points of interest
  ctx.strokeStyle = '#5a4231';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  // Trail to Wooden Bridge
  ctx.moveTo(toCanvasX(0), toCanvasY(8.0));
  ctx.lineTo(toCanvasX(getRiverCenterX(4.0)), toCanvasY(4.0));
  // Trail from Bridge to Sanctuary Farmhouse
  ctx.moveTo(toCanvasX(getRiverCenterX(4.0)), toCanvasY(4.0));
  ctx.lineTo(toCanvasX(-13.0), toCanvasY(-6.0));
  // Trail from Road to East Cabins / Darrell's Cabin
  ctx.moveTo(toCanvasX(0), toCanvasY(16.0));
  ctx.lineTo(toCanvasX(18.0), toCanvasY(6.0));
  ctx.lineTo(toCanvasX(22.0), toCanvasY(-20.0));
  // Trail to South Shore Beach & Pier
  ctx.moveTo(toCanvasX(0), toCanvasY(28.0));
  ctx.lineTo(toCanvasX(14.0), toCanvasY(76.0));
  ctx.lineTo(toCanvasX(14.0), toCanvasY(112.0));
  ctx.stroke();
  ctx.setLineDash([]);

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
  ctx.font = 'bold 12px "Redaction 70", serif';
  ctx.fillStyle = '#e8d4d8';
  ctx.fillText('AIR TERJUN UTARA', toCanvasX(42) + 12, toCanvasY(-58) + 4);
  ctx.fillText('TEROWONGAN BLACKWOOD', toCanvasX(0) - 85, toCanvasY(-46) - 8);
  ctx.fillText('GERBANG COLDBROOK', toCanvasX(0) + 12, toCanvasY(16) + 4);
  ctx.fillText('RUMAH AMAN (FARMHOUSE)', toCanvasX(-13) - 85, toCanvasY(-6) - 10);
  ctx.fillText('PONDOK DARRELL', toCanvasX(22) + 12, toCanvasY(-20) + 4);
  ctx.fillText('JEMBATAN KAYU', toCanvasX(brX) + 16, toCanvasY(4) + 4);
  ctx.fillText('PANTAI PASIR EMAS', toCanvasX(-60), toCanvasY(96));
  ctx.fillText('DERMAGA NELAYAN', toCanvasX(14) + 12, toCanvasY(128));
  ctx.fillText('PERAHU TERDAMPAR', toCanvasX(44) + 12, toCanvasY(116));
  ctx.fillText('LAUTAN SELATAN', toCanvasX(-45), toCanvasY(148));

  // Compass Rose (Top-Right)
  const compX = w - 42;
  const compY = 42;
  ctx.strokeStyle = '#e63946';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(compX, compY + 16);
  ctx.lineTo(compX, compY - 16);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(compX - 10, compY);
  ctx.lineTo(compX + 10, compY);
  ctx.stroke();
  // North arrow
  ctx.fillStyle = '#ff3344';
  ctx.beginPath();
  ctx.moveTo(compX, compY - 22);
  ctx.lineTo(compX - 6, compY - 14);
  ctx.lineTo(compX + 6, compY - 14);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('N', compX, compY - 26);
  ctx.textAlign = 'left';

  // 10b. Interactive Village NPCs
  if (state && (state.gameMode === 'story' || state.storyPhase)) {
    VILLAGE_NPCS.forEach(npc => {
      const nx = toCanvasX(npc.x);
      const nz = toCanvasY(npc.z);
      ctx.fillStyle = npc.talked ? '#7d525b' : '#ffd15c';
      ctx.beginPath();
      ctx.arc(nx, nz, npc.talked ? 3.5 : 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a060a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = npc.talked ? '#a88d92' : '#fff3a8';
      ctx.fillText(npc.name, nx + 7, nz + 3);
    });
  }

  // 10b. Active Objective Marker (Gold Pulsing Beacon)
  const actObj = getActiveObjective();
  if (actObj && actObj.marker) {
    const ox = toCanvasX(actObj.marker.x);
    const oz = toCanvasY(actObj.marker.z);
    const pulse = 7 + Math.sin(performance.now() * 0.007) * 2.5;

    ctx.fillStyle = 'rgba(255, 215, 0, 0.28)';
    ctx.beginPath();
    ctx.arc(ox, oz, pulse + 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(ox, oz, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.font = 'bold 12px "Redaction 70", serif';
    ctx.fillStyle = '#ffe066';
    ctx.fillText('★ ' + actObj.title, ox + 14, oz + 4);
  }

  // 11. Companions Markers
  // Kristin (Cyan Marker)
  if (kristinModel && kristinModel.root && kristinModel.root.visible) {
    const kx = toCanvasX(kristinModel.root.position.x);
    const kz = toCanvasY(kristinModel.root.position.z);
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
    ctx.fillText('BOSS: LADY MITHRILL', bx + 12, bz + 4);
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
  if (kristinModel && kristinModel.root && kristinModel.root.visible) {
    const kp = toRadar(kristinModel.root.position.x, kristinModel.root.position.z);
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

  // Active Objective (Gold Star dot on Radar)
  const actObj = getActiveObjective();
  if (actObj && actObj.marker) {
    const op = toRadar(actObj.marker.x, actObj.marker.z);
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(op.x, op.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
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

  // Backdrop click to close map
  const mapModal = document.getElementById('screen-tactical-map');
  if (mapModal) {
    mapModal.addEventListener('click', (e) => {
      if (e.target === mapModal) {
        closeMap(gameState);
      }
    });
  }
}

