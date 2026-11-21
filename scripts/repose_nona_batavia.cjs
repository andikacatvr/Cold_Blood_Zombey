const fs = require('fs');
const path = require('path');

function reposeNonaBatavia() {
  const modelPath = path.join(__dirname, '../public/models/nona_batavia.glb');
  const backupPath = path.join(__dirname, '../public/models/nona_batavia_backup.glb');

  const buf = fs.readFileSync(modelPath);
  if (!fs.existsSync(backupPath)) {
    fs.writeFileSync(backupPath, buf);
    console.log('[BACKUP] Created backup at', backupPath);
  }

  // Parse GLB Header
  const magic = buf.readUInt32LE(0);
  const version = buf.readUInt32LE(4);
  const totalLength = buf.readUInt32LE(8);

  // Read JSON chunk
  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonChunkType = buf.readUInt32LE(16);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonChunkLen);
  const gltf = JSON.parse(jsonStr);

  const binChunkHeaderOffset = 20 + jsonChunkLen;
  const binChunkLen = buf.readUInt32LE(binChunkHeaderOffset);
  const binChunkType = buf.readUInt32LE(binChunkHeaderOffset + 4);
  const binChunkOffset = binChunkHeaderOffset + 8;

  const binBuffer = Buffer.from(buf.subarray(binChunkOffset, binChunkOffset + binChunkLen));

  // Accessors
  const posAcc = gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION];
  const normAcc = gltf.accessors[gltf.meshes[0].primitives[0].attributes.NORMAL];

  const posBv = gltf.bufferViews[posAcc.bufferView];
  const normBv = gltf.bufferViews[normAcc.bufferView];

  const posOffset = (posBv.byteOffset || 0) + (posAcc.byteOffset || 0);
  const normOffset = (normBv.byteOffset || 0) + (normAcc.byteOffset || 0);

  const posData = new Float32Array(binBuffer.buffer, binBuffer.byteOffset + posOffset, posAcc.count * 3);
  const normData = new Float32Array(binBuffer.buffer, binBuffer.byteOffset + normOffset, normAcc.count * 3);

  console.log(`Processing ${posAcc.count} vertices for Nona Batavia...`);

  const pY = 1.340;
  const elbowDist = 0.174;
  const angleDown = 70 * (Math.PI / 180); // Lower arms down 70 degrees from T-pose
  const angleFwd = 7 * (Math.PI / 180);  // Slight natural forward rest angle
  const fAngleDown = 75 * (Math.PI / 180);
  const fAngleFwd = 18 * (Math.PI / 180);

  let modifiedCount = 0;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let i = 0; i < posAcc.count; i++) {
    let x = posData[i * 3 + 0];
    let y = posData[i * 3 + 1];
    let z = posData[i * 3 + 2];

    let nx = normData[i * 3 + 0];
    let ny = normData[i * 3 + 1];
    let nz = normData[i * 3 + 2];

    // Identify arm vertices: |x| >= 0.145 and y in upper torso/arm height [0.85, 1.45]
    if (Math.abs(x) >= 0.145 && y >= 0.85 && y <= 1.45) {
      modifiedCount++;
      const isLeft = x < 0;
      const sign = isLeft ? -1 : 1;
      const pX = sign * 0.155;

      const dx_orig = (x - pX) * sign;
      const dy = y - pY;
      const dz = z;

      let rx, ry, rz;
      let rnx, rny, rnz;

      if (dx_orig <= elbowDist) {
        // Upper arm segment
        const x1 = dx_orig * Math.cos(-angleDown) - dy * Math.sin(-angleDown);
        const y1 = dx_orig * Math.sin(-angleDown) + dy * Math.cos(-angleDown);
        const z1 = dz;

        rx = x1 * Math.cos(angleFwd) - z1 * Math.sin(angleFwd);
        ry = y1;
        rz = x1 * Math.sin(angleFwd) + z1 * Math.cos(angleFwd);

        // Normal rotation
        const nx1 = (nx * sign) * Math.cos(-angleDown) - ny * Math.sin(-angleDown);
        const ny1 = (nx * sign) * Math.sin(-angleDown) + ny * Math.cos(-angleDown);
        const nz1 = nz;

        rnx = (nx1 * Math.cos(angleFwd) - nz1 * Math.sin(angleFwd)) * sign;
        rny = ny1;
        rnz = nx1 * Math.sin(angleFwd) + nz1 * Math.cos(angleFwd);
      } else {
        // Elbow position
        const ex1 = elbowDist * Math.cos(-angleDown);
        const ey1 = elbowDist * Math.sin(-angleDown);
        const ex = ex1 * Math.cos(angleFwd);
        const ey = ey1;
        const ez = ex1 * Math.sin(angleFwd);

        // Forearm segment relative to elbow
        const fdx = dx_orig - elbowDist;
        const fx1 = fdx * Math.cos(-fAngleDown) - dy * Math.sin(-fAngleDown);
        const fy1 = fdx * Math.sin(-fAngleDown) + dy * Math.cos(-fAngleDown);
        const fz1 = dz;

        const fx2 = fx1 * Math.cos(fAngleFwd) - fz1 * Math.sin(fAngleFwd);
        const fy2 = fy1;
        const fz2 = fx1 * Math.sin(fAngleFwd) + fz1 * Math.cos(fAngleFwd);

        rx = ex + fx2;
        ry = ey + fy2;
        rz = ez + fz2;

        // Normal rotation
        const fnx1 = (nx * sign) * Math.cos(-fAngleDown) - ny * Math.sin(-fAngleDown);
        const fny1 = (nx * sign) * Math.sin(-fAngleDown) + ny * Math.cos(-fAngleDown);
        const fnz1 = nz;

        rnx = (fnx1 * Math.cos(fAngleFwd) - fnz1 * Math.sin(fAngleFwd)) * sign;
        rny = fny1;
        rnz = fnx1 * Math.sin(fAngleFwd) + fnz1 * Math.cos(fAngleFwd);
      }

      // Smoothstep blending at shoulder socket (x in [0.145, 0.185])
      let w = 1.0;
      if (dx_orig < 0.030) {
        const t = Math.max(0, Math.min(1, (dx_orig + 0.010) / 0.040));
        w = t * t * (3 - 2 * t);
      }

      x = pX + sign * (dx_orig * (1 - w) + rx * w);
      y = pY + (dy * (1 - w) + ry * w);
      z = (dz * (1 - w) + rz * w);

      // Blend normal and re-normalize
      nx = nx * (1 - w) + rnx * w;
      ny = ny * (1 - w) + rny * w;
      nz = nz * (1 - w) + rnz * w;
      const nLen = Math.hypot(nx, ny, nz) || 1.0;
      nx /= nLen;
      ny /= nLen;
      nz /= nLen;

      posData[i * 3 + 0] = x;
      posData[i * 3 + 1] = y;
      posData[i * 3 + 2] = z;

      normData[i * 3 + 0] = nx;
      normData[i * 3 + 1] = ny;
      normData[i * 3 + 2] = nz;
    }

    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }

  console.log(`Transformed ${modifiedCount} arm vertices successfully!`);
  console.log(`New Bounds: X [${minX.toFixed(3)}, ${maxX.toFixed(3)}], Y [${minY.toFixed(3)}, ${maxY.toFixed(3)}], Z [${minZ.toFixed(3)}, ${maxZ.toFixed(3)}]`);

  // Update Accessor min/max
  posAcc.min = [minX, minY, minZ];
  posAcc.max = [maxX, maxY, maxZ];

  // Re-encode JSON chunk with padding (4-byte alignment)
  let newJsonStr = JSON.stringify(gltf);
  while (Buffer.byteLength(newJsonStr, 'utf8') % 4 !== 0) {
    newJsonStr += ' ';
  }
  const newJsonChunkLen = Buffer.byteLength(newJsonStr, 'utf8');
  const newJsonChunkBuffer = Buffer.from(newJsonStr, 'utf8');

  // Binary chunk padding
  let newBinChunkLen = binBuffer.length;
  let padLen = (4 - (newBinChunkLen % 4)) % 4;
  const newBinChunkBuffer = Buffer.concat([binBuffer, Buffer.alloc(padLen)]);
  newBinChunkLen = newBinChunkBuffer.length;

  // New total GLB length
  const newTotalLen = 12 + 8 + newJsonChunkLen + 8 + newBinChunkLen;

  // Assemble GLB
  const outBuf = Buffer.alloc(newTotalLen);
  outBuf.writeUInt32LE(0x46546C67, 0); // Magic: glTF
  outBuf.writeUInt32LE(2, 4);          // Version: 2
  outBuf.writeUInt32LE(newTotalLen, 8); // Total Length

  // JSON Chunk header
  outBuf.writeUInt32LE(newJsonChunkLen, 12);
  outBuf.writeUInt32LE(0x4E4F534A, 16); // ChunkType: JSON
  newJsonChunkBuffer.copy(outBuf, 20);

  // BIN Chunk header
  const outBinHeaderOffset = 20 + newJsonChunkLen;
  outBuf.writeUInt32LE(newBinChunkLen, outBinHeaderOffset);
  outBuf.writeUInt32LE(0x004E4942, outBinHeaderOffset + 4); // ChunkType: BIN
  newBinChunkBuffer.copy(outBuf, outBinHeaderOffset + 8);

  // Write to destination files
  const destinations = [
    'public/models/nona_batavia.glb',
    'public/models/nonabatavia_glommy.glb',
    'dist/models/nona_batavia.glb',
    'dist/models/nonabatavia_glommy.glb'
  ];

  destinations.forEach(dest => {
    const fullDest = path.join(__dirname, '..', dest);
    const dir = path.dirname(fullDest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullDest, outBuf);
    console.log(`[SAVED] ${dest} (${outBuf.length} bytes)`);
  });

  console.log('[SUCCESS] Nona Batavia arms lowered and model updated in all locations!');
}

reposeNonaBatavia();
