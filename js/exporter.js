// SVG → PNG / JPG / GIF / SVG 변환과 다운로드
import { sanitizeSvg } from './generator.js';

export const svgDataUrl = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

function sized(svg, size) {
  return svg.replace(/<svg([^>]*?)\swidth="[^"]*"/, '<svg$1').replace(/<svg([^>]*?)\sheight="[^"]*"/, '<svg$1')
    .replace('<svg', `<svg width="${size}" height="${size}"`);
}

export async function svgToCanvas(svg, size, background) {
  const img = new Image();
  img.src = svgDataUrl(sized(svg, size));
  await img.decode();
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, size, size); }
  ctx.drawImage(img, 0, 0, size, size);
  return c;
}

export async function exportBlob(rawSvg, format, size = 256, jpgBg = '#ffffff') {
  const svg = sanitizeSvg(rawSvg);
  if (!svg) throw new Error('아이콘 데이터가 올바르지 않아 내보낼 수 없어요.');
  if (format === 'svg') return new Blob([sized(svg, size)], { type: 'image/svg+xml' });
  if (format === 'png') return toBlob(await svgToCanvas(svg, size), 'image/png');
  if (format === 'jpg') return toBlob(await svgToCanvas(svg, size, jpgBg), 'image/jpeg', 0.92);
  if (format === 'gif') {
    const c = await svgToCanvas(svg, size);
    const { data } = c.getContext('2d').getImageData(0, 0, size, size);
    return new Blob([encodeGif(data, size, size)], { type: 'image/gif' });
  }
  throw new Error('지원하지 않는 형식: ' + format);
}

const toBlob = (c, type, q) => new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('변환 실패')), type, q));

export function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export const safeName = s => (s || 'icon').replace(/[^\w가-힣-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'icon';

// ---- 단일 프레임 GIF89a 인코더 (투명 지원) ----
export function encodeGif(src, w, h) {
  // GIF는 반투명을 못 담으므로: 거의 투명(알파<8)은 투명, 나머지는 흰 배경에 합성해 불투명으로
  const rgba = new Uint8ClampedArray(src);
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3];
    if (a < 8) { rgba[i + 3] = 0; continue; }
    if (a < 255) {
      const t = a / 255;
      rgba[i] = rgba[i] * t + 255 * (1 - t); rgba[i + 1] = rgba[i + 1] * t + 255 * (1 - t); rgba[i + 2] = rgba[i + 2] * t + 255 * (1 - t);
    }
    rgba[i + 3] = 255;
  }
  // 1) 팔레트: 색이 255개 이하이면 그대로, 많으면 6x6x6 균등 팔레트
  const TRANSPARENT = 0;
  const colorIndex = new Map();
  const palette = [[0, 0, 0]]; // 0번 = 투명
  const idx = new Uint8Array(w * h);
  const q5 = v => v >> 3;
  let overflow = false;
  for (let i = 0; i < w * h; i++) {
    const a = rgba[i * 4 + 3];
    if (a < 128) continue;
    const key = (q5(rgba[i * 4]) << 10) | (q5(rgba[i * 4 + 1]) << 5) | q5(rgba[i * 4 + 2]);
    if (!colorIndex.has(key)) {
      if (palette.length >= 256) { overflow = true; break; }
      colorIndex.set(key, palette.length);
      palette.push([rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]]);
    }
  }
  if (overflow) {
    palette.length = 1;
    for (let r = 0; r < 6; r++) for (let g = 0; g < 6; g++) for (let b = 0; b < 6; b++) palette.push([r * 51, g * 51, b * 51]);
  }
  for (let i = 0; i < w * h; i++) {
    if (rgba[i * 4 + 3] < 128) { idx[i] = TRANSPARENT; continue; }
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    idx[i] = overflow
      ? 1 + Math.round(r / 51) * 36 + Math.round(g / 51) * 6 + Math.round(b / 51)
      : colorIndex.get((q5(r) << 10) | (q5(g) << 5) | q5(b));
  }
  let bitsPow = 1;
  while ((1 << bitsPow) < palette.length) bitsPow++;
  const tableSize = 1 << bitsPow;

  const out = [];
  const push = (...b) => out.push(...b);
  const u16 = v => push(v & 255, (v >> 8) & 255);
  push(...'GIF89a'.split('').map(c => c.charCodeAt(0)));
  u16(w); u16(h);
  push(0x80 | (7 << 4) | (bitsPow - 1), 0, 0);
  for (let i = 0; i < tableSize; i++) { const p = palette[i] || [0, 0, 0]; push(p[0], p[1], p[2]); }
  push(0x21, 0xf9, 0x04, 0x01, 0, 0, TRANSPARENT, 0); // 그래픽 제어 확장(투명)
  push(0x2c); u16(0); u16(0); u16(w); u16(h); push(0);
  const minCode = Math.max(2, bitsPow);
  push(minCode);
  const lzw = lzwEncode(idx, minCode);
  for (let i = 0; i < lzw.length; i += 255) {
    const chunk = lzw.slice(i, i + 255);
    push(chunk.length, ...chunk);
  }
  push(0, 0x3b);
  return new Uint8Array(out);
}

function lzwEncode(indices, minCodeSize) {
  const clear = 1 << minCodeSize, eoi = clear + 1;
  let codeSize = minCodeSize + 1, next = eoi + 1;
  let dict = new Map();
  const out = [];
  let cur = 0, bits = 0;
  const write = code => {
    cur |= code << bits; bits += codeSize;
    while (bits >= 8) { out.push(cur & 255); cur >>>= 8; bits -= 8; }
  };
  write(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = prefix * 256 + k;
    const c = dict.get(key);
    if (c !== undefined) { prefix = c; continue; }
    write(prefix);
    if (next < 4096) {
      dict.set(key, next++);
      if (next > (1 << codeSize) && codeSize < 12) codeSize++;
    } else {
      write(clear);
      dict = new Map(); codeSize = minCodeSize + 1; next = eoi + 1;
    }
    prefix = k;
  }
  write(prefix);
  write(eoi);
  if (bits > 0) out.push(cur & 255);
  return out;
}
