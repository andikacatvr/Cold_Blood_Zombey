const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function decodePNG(filePath) {
  const buf = fs.readFileSync(filePath);
  let pos = 8;
  let width = 0, height = 0, idatChunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IHDR') {
      width = buf.readUInt32BE(pos + 8);
      height = buf.readUInt32BE(pos + 12);
    } else if (type === 'IDAT') {
      idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = 4;
  const stride = width * bpp;
  const pixels = Buffer.alloc(width * height * 4);

  let srcPos = 0;
  for (let y = 0; y < height; y++) {
    const filter = decompressed[srcPos++];
    const lineStart = y * stride;
    const priorLineStart = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const raw = decompressed[srcPos++];
      const left = x >= bpp ? pixels[lineStart + x - bpp] : 0;
      const up = y > 0 ? pixels[priorLineStart + x] : 0;
      const upLeft = (y > 0 && x >= bpp) ? pixels[priorLineStart + x - bpp] : 0;

      let val = raw;
      if (filter === 1) { // Sub
        val = (raw + left) & 0xff;
      } else if (filter === 2) { // Up
        val = (raw + up) & 0xff;
      } else if (filter === 3) { // Average
        val = (raw + Math.floor((left + up) / 2)) & 0xff;
      } else if (filter === 4) { // Paeth
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        let pr;
        if (pa <= pb && pa <= pc) pr = left;
        else if (pb <= pc) pr = up;
        else pr = upLeft;
        val = (raw + pr) & 0xff;
      }
      pixels[lineStart + x] = val;
    }
  }

  return { width, height, pixels };
}

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT with filter 0 for all rows
  const rawIDAT = Buffer.alloc(height * (1 + width * 4));
  let destPos = 0;
  for (let y = 0; y < height; y++) {
    rawIDAT[destPos++] = 0; // filter None
    const srcRow = y * width * 4;
    rgbaBuffer.copy(rawIDAT, destPos, srcRow, srcRow + width * 4);
    destPos += width * 4;
  }
  const compressed = zlib.deflateSync(rawIDAT, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

function crop(src, cropX, cropY, cropW, cropH) {
  const out = Buffer.alloc(cropW * cropH * 4);
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcIdx = ((cropY + y) * src.width + (cropX + x)) * 4;
      const destIdx = (y * cropW + x) * 4;
      out[destIdx] = src.pixels[srcIdx];
      out[destIdx + 1] = src.pixels[srcIdx + 1];
      out[destIdx + 2] = src.pixels[srcIdx + 2];
      out[destIdx + 3] = src.pixels[srcIdx + 3];
    }
  }
  return { width: cropW, height: cropH, pixels: out };
}

// Execute cropping
const src = decodePNG('public/textures/andika_ref.png');
console.log('Decoded source image:', src.width, 'x', src.height);

// 1. Face (exact square crop centered on face)
// Center of face is around x: 341, y: 125
const faceCrop = crop(src, 275, 50, 132, 132);
fs.writeFileSync('public/textures/andika_face_hd.png', encodePNG(faceCrop.width, faceCrop.height, faceCrop.pixels));
console.log('Saved andika_face_hd.png');

// 2. Hair & Face combined (Head portrait with transparent alpha)
const headCrop = crop(src, 255, 45, 172, 290);
fs.writeFileSync('public/textures/andika_head_portrait.png', encodePNG(headCrop.width, headCrop.height, headCrop.pixels));
console.log('Saved andika_head_portrait.png');

// 3. Sweater Torso (Chest & horizontal stripes)
const sweaterCrop = crop(src, 250, 190, 182, 230);
fs.writeFileSync('public/textures/andika_sweater_hd.png', encodePNG(sweaterCrop.width, sweaterCrop.height, sweaterCrop.pixels));
console.log('Saved andika_sweater_hd.png');

// 4. Sleeve pattern
const sleeveCrop = crop(src, 120, 240, 140, 180);
fs.writeFileSync('public/textures/andika_sleeve_hd.png', encodePNG(sleeveCrop.width, sleeveCrop.height, sleeveCrop.pixels));
console.log('Saved andika_sleeve_hd.png');

// 5. Cargo pants with pocket & wallet chain
const cargoCrop = crop(src, 210, 420, 262, 490);
fs.writeFileSync('public/textures/andika_cargo_hd.png', encodePNG(cargoCrop.width, cargoCrop.height, cargoCrop.pixels));
console.log('Saved andika_cargo_hd.png');

// 6. Skate sneakers
const sneakerCrop = crop(src, 160, 910, 362, 85);
fs.writeFileSync('public/textures/andika_sneakers_hd.png', encodePNG(sneakerCrop.width, sneakerCrop.height, sneakerCrop.pixels));
console.log('Saved andika_sneakers_hd.png');

console.log('All HD textures generated successfully!');
