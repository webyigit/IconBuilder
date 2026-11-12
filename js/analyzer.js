// 샘플 이미지 스타일 분석: 주요 색, 선/면, 배경 모양, 둥글기 추정

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
    img.src = src;
  });
}

const toHex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

export function analyzeImage(img) {
  const N = 64;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, N, N);
  let data;
  try {
    data = ctx.getImageData(0, 0, N, N).data;
  } catch {
    // 외부 URL의 CORS 제한으로 픽셀을 읽을 수 없음
    return { ok: false, reason: 'cors' };
  }

  const px = (x, y) => { const i = (y * N + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
  // 배경색 추정: 네 모서리 평균
  const corners = [px(1, 1), px(N - 2, 1), px(1, N - 2), px(N - 2, N - 2)];
  const transparentBg = corners.every(p => p[3] < 30);
  const bg = corners.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
  const dist = (p, q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);
  const isBg = p => p[3] < 30 || (!transparentBg && dist(p, bg) < 40);

  // 색 버킷(4비트 양자화)
  const buckets = new Map();
  let fg = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const p = px(x, y);
    if (isBg(p)) continue;
    fg++;
    const key = (p[0] >> 4) << 8 | (p[1] >> 4) << 4 | (p[2] >> 4);
    const b = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    b.n++; b.r += p[0]; b.g += p[1]; b.b += p[2];
    buckets.set(key, b);
  }
  const colors = [...buckets.values()].sort((a, b) => b.n - a.n)
    .map(b => [Math.round(b.r / b.n), Math.round(b.g / b.n), Math.round(b.b / b.n)]);
  // 비슷한 색 합치기
  const palette = [];
  for (const col of colors) {
    if (palette.every(p => dist(p, col) > 90)) palette.push(col);
    if (palette.length >= 4) break;
  }
  const coverage = fg / (N * N);

  // 배경 모양: 전경이 모서리 쪽까지 꽉 차 있으면 사각, 가장자리 중간만 차면 원/둥근
  const edgeMid = [px(N >> 1, 2), px(2, N >> 1), px(N - 3, N >> 1), px(N >> 1, N - 3)].filter(p => !isBg(p)).length;
  const nearCorner = [px(6, 6), px(N - 7, 6), px(6, N - 7), px(N - 7, N - 7)].filter(p => !isBg(p)).length;
  let shape = 'none';
  if (edgeMid >= 3 && coverage > 0.55) shape = nearCorner >= 3 ? 'rounded' : 'circle';
  if (edgeMid >= 3 && coverage > 0.85 && nearCorner === 4) shape = 'square';

  let style;
  if (shape !== 'none') style = palette.length > 1 && lightness(palette[1]) > 0.85 ? 'badge' : 'duotone';
  else style = coverage < 0.22 ? 'outline' : 'solid';

  const hex = palette.map(p => toHex(...p));
  return {
    ok: true,
    primary: hex[0] || '#3b5bdb',
    secondary: hex[1] || '#ffffff',
    palette: hex,
    coverage: Math.round(coverage * 100),
    shape,
    style,
    strokeWidth: shape !== 'none' ? 2 : coverage < 0.12 ? 1.5 : coverage < 0.22 ? 2 : 2.5,
  };
}

function lightness([r, g, b]) { return (Math.max(r, g, b) + Math.min(r, g, b)) / 510; }

export const STYLE_LABEL = { outline: '선(아웃라인)', solid: '면(솔리드)', badge: '배지(배경+흰 글리프)', duotone: '듀오톤' };
export const SHAPE_LABEL = { none: '배경 없음', circle: '원', rounded: '둥근 사각', square: '사각' };
