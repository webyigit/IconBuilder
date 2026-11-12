// 가상(내장) 생성기: 글리프 + 샘플 스타일 → SVG 문자열
import { matchGlyphs } from './glyphs.js';

const COLOR_WORDS = {
  '#e03131': ['red', '빨간', '빨강', '레드'], '#1c7ed6': ['blue', '파란', '파랑', '블루'],
  '#2f9e44': ['green', '초록', '녹색', '그린'], '#f59f00': ['yellow', '노란', '노랑', '옐로'],
  '#f76707': ['orange', '주황', '오렌지'], '#7048e8': ['purple', '보라', '퍼플'],
  '#d6336c': ['pink', '분홍', '핑크'], '#212529': ['black', '검정', '검은', '블랙'],
  '#868e96': ['gray', 'grey', '회색', '그레이'],
};

export function parseKeywords(keywordText, description = '') {
  const kw = keywordText.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean);
  const desc = description.split(/[\s,.!?]+/)
    .map(s => (s.length > 2 ? s.replace(/(으로|을|를|이|가|은|는|의|로|에|와|과)$/, '') : s.replace(/(을|를|은|는|의|에)$/, '')))
    .filter(s => s.length > 1 || /[가-힣]/.test(s));
  return { keywords: kw, all: [...kw, ...desc] };
}

export function colorFromText(text) {
  const tokens = text.toLowerCase().split(/[^a-z가-힣]+/).filter(Boolean);
  for (const [hex, words] of Object.entries(COLOR_WORDS)) {
    // 영문은 단어 전체 일치, 한글은 앞부분 일치(빨간색·파란색 등)
    if (tokens.some(t => words.some(w => (/^[a-z]+$/.test(w) ? t === w : t.startsWith(w))))) return hex;
  }
  return null;
}

export function generateCandidates({ keywordText, description, style }, count = 4) {
  const { all } = parseKeywords(keywordText, description);
  const { glyphs, matched } = matchGlyphs(all, count);
  const override = colorFromText(`${keywordText} ${description}`);
  const st = { ...style, primary: override || style.primary };
  return {
    matched,
    items: glyphs.map(g => ({ glyphId: g.id, name: g.id, style: { ...st }, svg: buildSvg(g, st) })),
  };
}

const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

export function buildSvg(glyph, s) {
  const primary = s.primary || '#3b5bdb';
  const secondary = s.secondary || '#ffffff';
  const sw = Number(s.strokeWidth) || 2;
  const style = s.style || 'outline';
  // 배지는 배경이 있어야 보이므로, 배경 없음이면 원으로 그린다
  const shape = style === 'badge' && (!s.shape || s.shape === 'none') ? 'circle' : (s.shape || 'none');
  const sub = glyph.d.split(/\s(?=M)/);
  const closed = sub.filter(p => /z\s*$/i.test(p));
  const open = sub.filter(p => !/z\s*$/i.test(p));
  const common = `stroke-linecap="round" stroke-linejoin="round"`;

  let bg = '';
  const bgFill = style === 'badge' ? primary : `${primary}`;
  const bgOpacity = style === 'badge' ? 1 : 0.14;
  if (shape !== 'none') {
    const r = shape === 'circle' ? 12 : shape === 'rounded' ? 5.5 : 1.5;
    bg = `<rect x="0" y="0" width="24" height="24" rx="${r}" fill="${esc(bgFill)}" fill-opacity="${bgOpacity}"/>`;
  }
  const scale = shape === 'none' ? 1 : 0.62;
  const t = scale === 1 ? '' : ` transform="translate(${12 - 12 * scale} ${12 - 12 * scale}) scale(${scale})"`;
  const swAdj = (sw / scale).toFixed(2);
  const ink = style === 'badge' ? secondary : primary;

  let g = '';
  if (style === 'outline' || style === 'badge') {
    g = `<path d="${glyph.d}" fill="none" stroke="${esc(ink)}" stroke-width="${swAdj}" ${common}/>`;
  } else if (style === 'solid') {
    g = (closed.length ? `<path d="${closed.join(' ')}" fill="${esc(ink)}" stroke="${esc(ink)}" stroke-width="${swAdj}" ${common}/>` : '')
      + (open.length ? `<path d="${open.join(' ')}" fill="none" stroke="${esc(ink)}" stroke-width="${swAdj}" ${common}/>` : '');
    // 면 스타일에서 내부 선이 묻히지 않도록, 닫힌 도형이 없으면 그냥 굵은 선
  } else { // duotone
    g = (closed.length ? `<path d="${closed.join(' ')}" fill="${esc(ink)}" fill-opacity="0.3" stroke="none"/>` : '')
      + `<path d="${glyph.d}" fill="none" stroke="${esc(ink)}" stroke-width="${swAdj}" ${common}/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">${bg}<g${t}>${g}</g></svg>`;
}

// 외부(AI·업로드) SVG 정리: 허용 목록 방식
const OK_TAGS = new Set(['svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'defs', 'lineargradient', 'radialgradient', 'stop', 'title', 'desc']);
const OK_ATTRS = new Set(['viewbox', 'xmlns', 'width', 'height', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'fill', 'fill-opacity', 'fill-rule', 'clip-rule', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'stroke-miterlimit', 'stroke-dasharray', 'opacity', 'transform', 'id', 'offset', 'stop-color', 'stop-opacity', 'gradientunits', 'gradienttransform', 'fx', 'fy', 'preserveaspectratio']);
export function sanitizeSvg(svg) {
  if (typeof svg !== 'string' || svg.length > 200000) return null;
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.localName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return null;
  const walk = el => {
    for (const child of [...el.children]) {
      if (!OK_TAGS.has(child.localName.toLowerCase())) { child.remove(); continue; }
      walk(child);
    }
    for (const a of [...el.attributes]) {
      const n = a.localName.toLowerCase(), v = a.value.trim();
      const ok = OK_ATTRS.has(n) && (a.namespaceURI === null || n === 'xmlns');
      // url()은 내부 참조(#id)만 허용
      const badUrl = /url\s*\(/i.test(v) && !/^url\(\s*#[\w-]+\s*\)$/i.test(v);
      if (!ok || badUrl || /javascript:|data:|@import|expression/i.test(v)) el.removeAttributeNode(a);
    }
  };
  walk(root);
  if (!root.getAttribute('viewBox')) {
    const w = parseFloat(root.getAttribute('width')) || 24, h = parseFloat(root.getAttribute('height')) || 24;
    root.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  const out = new XMLSerializer().serializeToString(root)
    .replace(/\sxmlns:[\w-]+="[^"]*"/g, '');
  return out.includes('xmlns=') ? out : out.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
}
