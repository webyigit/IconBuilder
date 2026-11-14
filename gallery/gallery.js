/* 오픈소스 아이콘 갤러리 — 정적 페이지, 외부 요청 없음 */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const CATS = [['all', '전체'], ['ui', 'UI'], ['material', 'Material'], ['color', '컬러'], ['emoji', '이모지'], ['brand', '브랜드별'], ['logo', '로고 세트'], ['theme', '테마']];
  const state = { index: [], cat: 'all', filter: '', style: null, data: null, q: '', color: null, size: 32, cache: new Map(), current: null };

  // ---------- SVG 만들기 ----------
  function svgString(vb, body, { color, size } = {}) {
    let b = body;
    if (color) b = b.replace(/currentColor/g, color);
    const wh = size ? ` width="${size}" height="${size}"` : ' width="24" height="24"';
    return `<svg xmlns="http://www.w3.org/2000/svg"${wh} viewBox="${vb}">${b}</svg>`;
  }
  const dataUri = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const inkColor = () => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#1a1d29';
  const iconColor = () => state.color || inkColor();
  const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n);
  const popText = (pop) => [pop.stars && `★ ${pop.stars}`, pop.weekly && `주간 ${fmt(pop.weekly)}`].filter(Boolean).join(' · ');
  const fileBase = (name) => `${state.style.id}-${name}`.replace(/[^a-z0-9_-]+/gi, '-');

  // ---------- 알림 ----------
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1800);
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  function toPng(svg, px) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = px;
        const ctx = c.getContext('2d');
        const r = img.naturalWidth / img.naturalHeight || 1;
        const w = r >= 1 ? px : px * r, h = r >= 1 ? px / r : px;
        ctx.drawImage(img, (px - w) / 2, (px - h) / 2, w, h);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG 변환 실패'))), 'image/png');
      };
      img.onerror = () => reject(new Error('이미지 로드 실패'));
      img.src = dataUri(svg);
    });
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
      ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
    }
  }

  // ---------- 데이터 ----------
  async function loadJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(url + ' ' + r.status);
    return r.json();
  }
  async function loadStyle(id) {
    if (!state.cache.has(id)) state.cache.set(id, loadJSON(`data/${id}.json`));
    return state.cache.get(id);
  }

  // ---------- 스타일 목록 ----------
  function visibleStyles() {
    const f = state.filter.toLowerCase();
    return state.index.filter((m) => (state.cat === 'all' || m.cat === state.cat) &&
      (!f || (m.name + ' ' + m.set + ' ' + m.id + ' ' + m.license + ' ' + (m.pop.repo || '') + ' ' + (m.pop.npm || '')).toLowerCase().includes(f)));
  }

  function renderCats() {
    const box = $('#cats'); box.innerHTML = '';
    for (const [k, label] of CATS) {
      const n = k === 'all' ? state.index.length : state.index.filter((m) => m.cat === k).length;
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = `${label} ${n}`; b.setAttribute('aria-pressed', String(state.cat === k));
      b.onclick = () => { state.cat = k; renderCats(); renderStyles(); };
      box.appendChild(b);
    }
  }

  function renderStyles() {
    const list = $('#styles'), sel = $('#styleSelect');
    list.innerHTML = ''; sel.innerHTML = '';
    const ink = inkColor();
    for (const m of visibleStyles()) {
      const li = document.createElement('li');
      li.setAttribute('role', 'option'); li.tabIndex = 0; li.dataset.id = m.id;
      li.setAttribute('aria-selected', String(state.style && state.style.id === m.id));
      const txt = document.createElement('div');
      const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = m.name;
      const sub = document.createElement('div'); sub.className = 'sub'; sub.textContent = m.cat === 'brand' ? `로고 ${m.count}종 · ${m.official ? '공식 자료 링크' : '공식 자료 [확인 필요]'}` : `${m.license} · ${popText(m.pop)}`;
      txt.append(nm, sub);
      const smp = document.createElement('div'); smp.className = 'smp';
      for (const [, vb, body] of m.sample) {
        const im = document.createElement('img'); im.alt = ''; im.loading = 'lazy';
        im.src = dataUri(svgString(vb, body, { color: ink })); smp.appendChild(im);
      }
      li.append(txt, smp);
      li.onclick = () => selectStyle(m.id);
      li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectStyle(m.id); } };
      list.appendChild(li);
      const o = document.createElement('option'); o.value = m.id; o.textContent = `${m.name} (${m.license})`;
      sel.appendChild(o);
    }
    if (!list.children.length) {
      const li = document.createElement('li'); li.textContent = '맞는 스타일이 없습니다'; li.className = 'sub'; list.appendChild(li);
    }
    if (state.style) sel.value = state.style.id;
  }

  async function selectStyle(id) {
    const m = state.index.find((x) => x.id === id) || state.index[0];
    state.style = m;
    history.replaceState(null, '', '#' + m.id);
    document.querySelectorAll('#styles li').forEach((li) => li.setAttribute('aria-selected', String(li.dataset.id === m.id)));
    $('#styleSelect').value = m.id;
    renderInfo(m);
    $('#grid').innerHTML = '<li class="empty">불러오는 중…</li>';
    try {
      const d = await loadStyle(m.id);
      if (state.style !== m) return;
      state.data = d; renderGrid();
    } catch (e) {
      $('#grid').innerHTML = '<li class="empty">불러오지 못했습니다. 새로고침해 주세요.</li>';
    }
  }

  function renderBrandInfo(m) {
    const box = $('#info'); box.innerHTML = '';
    const h = document.createElement('h2'); h.textContent = `${m.name} 로고 모음`;
    const bd = document.createElement('span'); bd.className = 'badge'; bd.textContent = `${m.count}종`; h.appendChild(bd);
    const p = document.createElement('p');
    p.append(`오픈소스 세트에서 모은 ${m.name} 로고입니다 (${m.sources.join(', ')}). 아이콘마다 출처·라이선스가 다르니 상세 화면에서 확인하세요.`);
    const p2 = document.createElement('p'); p2.className = 'pop';
    p2.append('공식 브랜드 자료: ');
    if (m.official) { const a = document.createElement('a'); a.href = m.official; a.target = '_blank'; a.rel = 'noopener'; a.textContent = m.officialNote || m.official; p2.append(a); }
    else p2.append('[확인 필요]');
    p2.append(' · 로고는 각 회사의 상표입니다. 공식 원본은 재배포가 제한될 수 있어 링크만 둡니다.');
    box.append(h, p, p2);
    $('#color').disabled = false;
  }

  function renderInfo(m) {
    if (m.cat === 'brand') return renderBrandInfo(m);
    const box = $('#info'); box.innerHTML = '';
    const h = document.createElement('h2'); h.textContent = m.name;
    const bd = document.createElement('span'); bd.className = 'badge'; bd.textContent = m.color ? '컬러' : '단색'; h.appendChild(bd);
    const p = document.createElement('p');
    const a1 = document.createElement('a'); a1.href = m.url || '#'; a1.target = '_blank'; a1.rel = 'noopener'; a1.textContent = m.set;
    const a2 = document.createElement('a'); a2.href = m.licenseUrl || '#'; a2.target = '_blank'; a2.rel = 'noopener'; a2.textContent = m.license;
    p.append('세트 ', a1, ` · 제작 ${m.author || '-'} · 라이선스 `, a2, ` · v${m.version}`);
    if (m.spdx && m.spdx.startsWith('CC-BY')) p.append(' · 사용 시 출처 표기 필요');
    if (m.cat === 'logo') p.append(' · 브랜드 로고는 각 회사 상표입니다');
    const p2 = document.createElement('p'); p2.className = 'pop'; p2.append('신뢰 지표: ');
    if (m.pop.repo) { const a = document.createElement('a'); a.href = 'https://github.com/' + m.pop.repo; a.target = '_blank'; a.rel = 'noopener'; a.textContent = `GitHub ★ ${m.pop.stars}`; p2.append(a); }
    if (m.pop.npm) { if (m.pop.repo) p2.append(' · '); const a = document.createElement('a'); a.href = 'https://www.npmjs.com/package/' + m.pop.npm; a.target = '_blank'; a.rel = 'noopener'; a.textContent = `npm ${m.pop.npm} 주간 ${m.pop.weekly.toLocaleString()}회`; p2.append(a); }
    p2.append(' (2026-11-14 조회)');
    box.append(h, p, p2);
    $('#color').disabled = m.color;
  }

  function renderGrid() {
    const grid = $('#grid'); grid.innerHTML = '';
    const q = state.q.trim().toLowerCase();
    const icons = state.data.icons.filter(([n, , , src]) => !q || n.includes(q) || (src && src.toLowerCase().includes(q)));
    const color = state.style.color ? null : iconColor();
    const frag = document.createDocumentFragment();
    for (const ic of icons) {
      const [name, vb, body] = ic;
      const li = document.createElement('li');
      const b = document.createElement('button'); b.type = 'button'; b.title = name + ' — 클릭해서 복사·다운로드';
      const im = document.createElement('img'); im.alt = ''; im.src = dataUri(svgString(vb, body, { color }));
      const sp = document.createElement('span'); sp.textContent = ic[3] ? ic[3].split(' · ')[0] : name;
      b.append(im, sp); b.onclick = () => openIcon(ic); li.appendChild(b); frag.appendChild(li);
    }
    grid.appendChild(frag);
    if (!icons.length) grid.innerHTML = '<li class="empty">검색 결과가 없습니다</li>';
    $('#count').textContent = `${icons.length} / ${state.data.icons.length}개 · 아이콘을 누르면 SVG 복사·PNG 다운로드`;
  }

  // ---------- 상세 ----------
  function currentSvg(px) {
    const [, vb, body] = state.current;
    return svgString(vb, body, { color: state.style.color ? null : iconColor(), size: px || 24 });
  }
  function openIcon(ic) {
    state.current = ic;
    const svg = currentSvg();
    $('#dlgTitle').textContent = ic[0];
    $('#dlgMeta').textContent = ic[3] ? `${state.style.name} · ${ic[3]}` : `${state.style.name} · ${state.style.license}`;
    $('#pv').innerHTML = ''; const im = document.createElement('img'); im.alt = ic[0]; im.src = dataUri(svg); $('#pv').appendChild(im);
    $('#code').value = svg;
    const d = $('#dlg'); if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }

  async function onCopySvg() { toast((await copyText(currentSvg())) ? 'SVG 코드를 복사했습니다' : '복사 실패: 코드 칸에서 직접 복사해 주세요'); }
  async function onCopyPng() {
    const px = +$('#pngSize').value;
    try {
      if (!window.ClipboardItem) throw new Error();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': toPng(currentSvg(px), px) })]);
      toast(`PNG ${px}px 이미지를 복사했습니다`);
    } catch { toast('이 브라우저는 이미지 복사를 지원하지 않습니다. PNG 다운로드를 이용해 주세요'); }
  }
  function onDlSvg() { download(new Blob([currentSvg()], { type: 'image/svg+xml' }), fileBase(state.current[0]) + '.svg'); }
  async function onDlPng() {
    const px = +$('#pngSize').value;
    try { download(await toPng(currentSvg(px), px), `${fileBase(state.current[0])}-${px}.png`); }
    catch (e) { toast(e.message); }
  }

  // ---------- ZIP ----------
  function licenseText(m, icons) {
    if (m.cat === 'brand') return [`${m.name} 로고 모음 (아이콘 갤러리)`, `공식 브랜드 자료: ${m.official || '[확인 필요]'}`, '', '파일별 출처·라이선스:',
      ...(icons || []).map((i) => `${i[0]}.svg — ${i[3]}`), '', '※ 로고는 각 회사의 상표입니다. 파일 라이선스와 별개로 상표 사용 규정을 따르세요.',
      '※ CC BY 파일(Font Awesome 등)은 사용 시 제작자·라이선스 표기 필요.'].join('\n');
    return [`${m.name}`, `세트: ${m.set} (v${m.version})`, `제작: ${m.author || '-'}`, `홈페이지: ${m.url || '-'}`,
      `라이선스: ${m.license} (${m.spdx})`, `라이선스 전문: ${m.licenseUrl || '-'}`,
      `신뢰 지표(2026-11-14 조회): ${popText(m.pop)}${m.pop.repo ? ' — github.com/' + m.pop.repo : ''}${m.pop.npm ? ' — npm ' + m.pop.npm : ''}`, '',
      m.spdx && m.spdx.startsWith('CC-BY') ? '※ CC BY 라이선스: 사용 시 제작자와 라이선스를 표기해야 합니다.' : '',
      m.cat === 'logo' ? '※ 브랜드 로고는 각 회사의 상표입니다. 상표 사용 규정을 따르세요.' : '',
      '출처: Iconify 아이콘 데이터(@iconify-json/' + m.prefix + ')에서 추출'].filter((x) => x !== '').join('\n');
  }
  async function onZip() {
    if (!window.JSZip) return toast('ZIP 모듈을 불러오지 못했습니다');
    const btn = $('#zipBtn'); btn.disabled = true; const label = btn.textContent; btn.textContent = '만드는 중…';
    try {
      const m = state.style, d = await loadStyle(m.id);
      const color = m.color ? null : (state.color || 'currentColor');
      const zip = new JSZip(); const dir = zip.folder(m.id);
      for (const [name, vb, body] of d.icons) dir.file(`${name}.svg`, svgString(vb, body, { color: color === 'currentColor' ? null : color }));
      dir.file('LICENSE.txt', licenseText(m, d.icons));
      download(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), `${m.id}-svg.zip`);
      toast(`${d.icons.length}개 SVG를 ZIP으로 받았습니다`);
    } catch (e) { toast('ZIP 생성 실패'); }
    finally { btn.disabled = false; btn.textContent = label; }
  }

  async function onZipAll() {
    if (!window.JSZip) return toast('ZIP 모듈을 불러오지 못했습니다');
    const btn = $('#zipAllBtn'); btn.disabled = true; const label = btn.textContent;
    try {
      const zip = new JSZip(); let n = 0, i = 0;
      for (const m of state.index) {
        btn.textContent = `만드는 중 ${++i}/${state.index.length}`;
        const d = await loadStyle(m.id); const dir = zip.folder(m.id);
        for (const [name, vb, body] of d.icons) { dir.file(`${name}.svg`, svgString(vb, body)); n++; }
        dir.file('LICENSE.txt', licenseText(m, d.icons));
      }
      btn.textContent = '압축 중…';
      download(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), 'icon-gallery-all-svg.zip');
      toast(`${state.index.length}개 스타일, ${n.toLocaleString()}개 SVG를 받았습니다`);
    } catch (e) { toast('ZIP 생성 실패'); }
    finally { btn.disabled = false; btn.textContent = label; }
  }

  // ---------- 시작 ----------
  async function init() {
    try { state.index = await loadJSON('data/index.json'); }
    catch { $('#grid').innerHTML = '<li class="empty">목록을 불러오지 못했습니다</li>'; return; }
    const total = state.index.reduce((s, m) => s + m.count, 0);
    const nb = state.index.filter((m) => m.cat === 'brand').length;
    $('#stat').textContent = `${state.index.length - nb}개 스타일 + 브랜드 ${nb}곳 · 아이콘 ${total.toLocaleString()}개 · 상업 이용 가능 라이선스`;
    $('#color').value = /^#[0-9a-f]{6}$/i.test(inkColor()) ? inkColor() : '#1a1d29';
    renderCats(); renderStyles();
    const want = decodeURIComponent(location.hash.slice(1));
    selectStyle(state.index.some((m) => m.id === want) ? want : state.index[0].id);

    $('#styleSearch').oninput = (e) => { state.filter = e.target.value; renderStyles(); };
    $('#styleSelect').onchange = (e) => selectStyle(e.target.value);
    let qT; $('#q').oninput = (e) => { clearTimeout(qT); qT = setTimeout(() => { state.q = e.target.value; if (state.data) renderGrid(); }, 120); };
    $('#color').oninput = (e) => { state.color = e.target.value; if (state.data) renderGrid(); };
    $('#size').oninput = (e) => document.documentElement.style.setProperty('--isz', e.target.value + 'px');
    $('#zipBtn').onclick = onZip; $('#zipAllBtn').onclick = onZipAll;
    $('#copySvg').onclick = onCopySvg; $('#copyPng').onclick = onCopyPng;
    $('#dlSvg').onclick = onDlSvg; $('#dlPng').onclick = onDlPng;
    $('#code').onfocus = (e) => e.target.select();
    $('#dlg').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
    window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (id && (!state.style || id !== state.style.id)) selectStyle(id); });
  }
  init();
})();
