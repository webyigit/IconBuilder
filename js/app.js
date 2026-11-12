import { loadImage, analyzeImage, STYLE_LABEL, SHAPE_LABEL } from './analyzer.js';
import { generateCandidates, buildSvg, parseKeywords, sanitizeSvg } from './generator.js';
import { GLYPHS, glyphLabel } from './glyphs.js';
import { exportBlob, download, svgDataUrl, safeName } from './exporter.js';
import { getStore, getConfig, setConfig, fileToDataUrl, localStore } from './storage.js';

const $ = s => document.querySelector(s);
const MAX = 5 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'];

const state = {
  sample: null,          // { src, file?, url? }
  style: { style: 'outline', shape: 'none', primary: '#3b5bdb', secondary: '#ffffff', strokeWidth: 2 },
  candidates: [],
  sel: -1,
  sites: [],
};
let store = getStore();

// ---------- 공통 ----------
function toast(msg, err = false) {
  const t = $('#toast');
  const live = err ? $('#alert') : $('#status');
  live.textContent = '';
  setTimeout(() => { live.textContent = msg; }, 30);
  t.textContent = msg;
  t.className = 'toast show' + (err ? ' err' : '');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { t.className = 'toast'; }, err ? 5000 : 2500);
}
class UserError extends Error {}
const esc = s => String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
const isHttp = u => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; } catch { return false; } };

// 버튼을 disabled로 만들지 않는다(포커스 유지). 대신 aria-busy로 중복 실행만 막는다.
async function busy(btn, fn) {
  if (btn.getAttribute('aria-busy') === 'true') return;
  btn.setAttribute('aria-busy', 'true');
  try { return await fn(); } catch (e) {
    if (!(e instanceof UserError)) console.error(e);
    toast(e.message || String(e), true);
  } finally { btn.removeAttribute('aria-busy'); }
}

// ---------- 탭 ----------
const tabs = [...document.querySelectorAll('[role=tab]')];
function showTab(tab) {
  tabs.forEach(t => {
    const on = t === tab;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  });
  if (tab.id === 'tab-library') renderLibrary();
  if (tab.id === 'tab-sites') renderSites();
  if (tab.id === 'tab-settings') renderSettings();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => showTab(t));
  t.addEventListener('keydown', e => {
    const map = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const n = tabs[map[e.key]];
    n.focus(); showTab(n);
  });
});

const aiReady = () => getConfig().engine === 'claude' && !!store.generate;
function updateModeBadge() {
  const cfg = getConfig();
  const ai = aiReady();
  $('#modeBadge').textContent = `${store.name} · ${ai ? 'Claude AI' : '내장 생성기'}`;
  $('#engineHint').textContent = ai
    ? 'Claude AI가 샘플 이미지를 보고 새 아이콘을 그립니다.'
    : cfg.engine === 'claude'
      ? 'Claude AI는 Supabase 연결 후 쓸 수 있어요. 지금은 내장 생성기로 만듭니다.'
      : '내장 생성기: 키워드에 맞는 기본 도형에 샘플의 색·스타일을 입힙니다.';
}

// ---------- 샘플 입력 ----------
const drop = $('#drop'), fileInput = $('#file');
drop.addEventListener('click', () => fileInput.click());
drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', e => {
  e.preventDefault(); drop.classList.remove('over');
  const f = e.dataTransfer.files[0];
  if (f) useFile(f);
});
fileInput.addEventListener('change', () => { if (fileInput.files[0]) useFile(fileInput.files[0]); fileInput.value = ''; });

function useFile(f) {
  return busy(drop, async () => {
    if (!TYPES.includes(f.type)) throw new UserError('PNG·JPG·GIF·SVG·WEBP 파일만 올릴 수 있어요.');
    if (f.size > MAX) throw new UserError('5MB 이하 파일만 올릴 수 있어요.');
    const src = await fileToDataUrl(f);
    await setSample({ src, file: f, label: f.name });
  });
}

$('#loadUrl').addEventListener('click', e => busy(e.currentTarget, async () => {
  const u = $('#sampleUrl').value.trim();
  if (!isHttp(u)) throw new UserError('http(s)로 시작하는 이미지 주소를 넣어주세요.');
  await setSample({ src: u, url: u, label: u });
}));
$('#sampleUrl').addEventListener('keydown', e => { if (e.key === 'Enter') $('#loadUrl').click(); });

const DEFAULT_STYLE = { style: 'outline', shape: 'none', primary: '#3b5bdb', secondary: '#ffffff', strokeWidth: 2 };
function clearSample() {
  state.sample = null; state.analysis = null; state.img = null;
  Object.assign(state.style, DEFAULT_STYLE);
  const p = $('#samplePreview'); p.hidden = true; p.removeAttribute('src');
  $('#dropText').hidden = false;
  drop.setAttribute('aria-label', '샘플 이미지 파일 선택 또는 끌어다 놓기');
}

async function setSample(sample) {
  let img;
  try { img = await loadImage(sample.src); } catch {
    clearSample();
    $('#analysis').innerHTML = sample.url
      ? '<p class="warn">이미지를 불러오지 못했어요. 주소가 맞는지 확인하거나, 이미지를 내려받아 파일로 올려주세요. 기본 스타일로 생성됩니다.</p>'
      : '<p class="warn">이미지 파일이 손상됐거나 열 수 없어요. 다른 파일을 올려주세요.</p>';
    throw new UserError(sample.url ? '이미지 주소를 불러오지 못했어요.' : '이미지 파일을 열 수 없어요.');
  }
  state.sample = sample; state.img = img;
  showPreview(sample.src, sample.label);
  const a = analyzeImage(img);
  if (!a.ok) {
    state.analysis = null;
    Object.assign(state.style, DEFAULT_STYLE);
    $('#analysis').innerHTML = '<p class="warn">이미지는 보이지만, 외부 사이트 보안 설정(CORS) 때문에 색·스타일 분석은 못 했어요. 기본 스타일로 생성됩니다. 정확히 맞추려면 이미지를 내려받아 파일로 올려주세요.</p>';
    return;
  }
  state.analysis = a;
  Object.assign(state.style, { style: a.style, shape: a.shape, primary: a.primary, secondary: a.secondary, strokeWidth: a.strokeWidth });
  $('#analysis').innerHTML = `<dl>
    <dt>주요 색</dt><dd>${a.palette.map(c => `<span class="sw" style="background:${c}" title="${c}"></span>`).join('')} <small>${a.palette.join(' ')}</small></dd>
    <dt>스타일</dt><dd>${STYLE_LABEL[a.style]}</dd>
    <dt>배경</dt><dd>${SHAPE_LABEL[a.shape]}</dd>
    <dt>색이 차지하는 면적</dt><dd>${a.coverage}%</dd></dl>`;
  toast('샘플을 분석했어요.');
}

function showPreview(src, label = '') {
  const p = $('#samplePreview');
  p.src = src; p.alt = '샘플 아이콘'; p.hidden = false;
  $('#dropText').hidden = true;
  drop.setAttribute('aria-label', `샘플: ${label.slice(0, 60)}. 바꾸려면 누르세요`);
}

// ---------- 생성 ----------
$('#keywords').addEventListener('input', () => { $('#kwError').hidden = true; $('#keywords').removeAttribute('aria-invalid'); });
$('#generate').addEventListener('click', e => {
  const btn = e.currentTarget;
  busy(btn, async () => {
    const keywordText = $('#keywords').value.trim();
    const description = $('#desc').value.trim();
    if (!keywordText && !description) {
      $('#kwError').hidden = false; $('#keywords').setAttribute('aria-invalid', 'true'); $('#keywords').focus();
      throw new UserError('키워드나 설명을 하나 이상 넣어주세요.');
    }
    btn.textContent = '생성 중…';
    let notice = '';
    try {
      if (aiReady()) {
        state.candidates = await generateWithAI(keywordText, description);
      } else {
        const { items, matched } = generateCandidates({ keywordText, description, style: state.style });
        const first = parseKeywords(keywordText).keywords[0];
        state.candidates = items.map(it => {
          const label = glyphLabel(GLYPHS.find(g => g.id === it.glyphId));
          return { ...it, label, name: first || label };
        });
        if (!matched) notice = `'${keywordText || description}'에 딱 맞는 도형이 내장 목록에 없어서 비슷한 기본 도형을 보여드려요. 다른 낱말(예: 집, 사용자, 장바구니)을 써보거나 AI 생성을 연결하세요.`;
      }
    } finally { btn.textContent = '아이콘 생성'; }
    $('#genNotice').textContent = notice; $('#genNotice').hidden = !notice;
    renderCandidates();
    select(0);
    toast(`후보 ${state.candidates.length}개를 만들었어요.`);
  });
});

// 샘플을 256px PNG로 다시 그려 AI에 보낸다(크기 축소, SVG·외부 주소 공통 처리)
function sampleAsPng() {
  if (!state.img || !state.analysis) return null; // 분석 불가(CORS)면 이미지 없이 요청
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  c.getContext('2d').drawImage(state.img, 0, 0, 256, 256);
  try { return { type: 'base64', media_type: 'image/png', data: c.toDataURL('image/png').split(',')[1] }; } catch { return null; }
}

async function generateWithAI(keywordText, description) {
  const res = await store.generate({ image: sampleAsPng(), keywords: keywordText, description, analysis: state.analysis || null, count: 4 });
  const items = (res?.icons || []).map(i => ({ name: i.name || keywordText, label: i.name || 'AI', svg: sanitizeSvg(i.svg), ai: true })).filter(i => i.svg);
  if (!items.length) throw new UserError('AI가 올바른 아이콘을 만들지 못했어요. 다시 시도해 주세요.');
  return items;
}

function renderCandidates() {
  const box = $('#candidates');
  box.innerHTML = '';
  state.candidates.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'cand';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', 'false');
    b.setAttribute('aria-label', `후보 ${i + 1}: ${c.label || c.name}`);
    b.innerHTML = `<img alt="" src="${svgDataUrl(c.svg)}"><span>${esc(c.label || c.name)}</span>`;
    b.addEventListener('click', () => select(i));
    box.appendChild(b);
  });
}

function select(i) {
  state.sel = i;
  [...$('#candidates').children].forEach((el, j) => { el.setAttribute('aria-checked', j === i); el.tabIndex = j === i ? 0 : -1; });
  const c = state.candidates[i];
  if (!c) return;
  $('#editor').hidden = false;
  $('#optName').value = c.name || '';
  const s = c.style || state.style;
  $('#optStyle').value = s.style; $('#optShape').value = s.shape;
  $('#optPrimary').value = s.primary; $('#optSecondary').value = s.secondary;
  $('#optStroke').value = s.strokeWidth; $('#swOut').textContent = s.strokeWidth;
  document.querySelectorAll('.opts select:not(#fmt):not(#size), .opts input[type=color], #optStroke').forEach(el => { el.disabled = !!c.ai; });
  refreshPreview();
}
$('#candidates').addEventListener('keydown', e => {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key) || state.sel < 0) return;
  e.preventDefault();
  const n = (state.sel + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + state.candidates.length) % state.candidates.length;
  select(n); $('#candidates').children[n].focus();
});

function current() {
  const c = state.candidates[state.sel];
  if (!c) throw new UserError('먼저 아이콘을 생성하고 후보를 골라주세요.');
  return c;
}

['#optStyle', '#optShape', '#optPrimary', '#optSecondary', '#optStroke'].forEach(id => $(id).addEventListener('input', () => {
  const c = state.candidates[state.sel]; if (!c || c.ai) return;
  c.style = { style: $('#optStyle').value, shape: $('#optShape').value, primary: $('#optPrimary').value, secondary: $('#optSecondary').value, strokeWidth: Number($('#optStroke').value) };
  $('#swOut').textContent = c.style.strokeWidth;
  c.svg = buildSvg(GLYPHS.find(g => g.id === c.glyphId), c.style);
  $('#candidates').children[state.sel].querySelector('img').src = svgDataUrl(c.svg);
  refreshPreview();
}));
$('#optName').addEventListener('input', () => { const c = state.candidates[state.sel]; if (c) c.name = $('#optName').value; });

function refreshPreview() {
  const c = state.candidates[state.sel]; if (!c) return;
  const url = svgDataUrl(c.svg);
  $('#bigPreview').src = url;
  $('#sizeStrip').innerHTML = [16, 24, 32, 48].map(s => `<img src="${url}" width="${s}" height="${s}" alt="">`).join('');
}

// ---------- 내보내기·저장 ----------
const fname = (c, fmt, size) => `${safeName(c.name)}_${fmt === 'svg' ? 'vector' : size + 'px'}.${fmt}`;

$('#dl').addEventListener('click', e => busy(e.currentTarget, async () => {
  const c = current(); const fmt = $('#fmt').value, size = Number($('#size').value);
  download(await exportBlob(c.svg, fmt, size), fname(c, fmt, size));
}));
$('#dlAll').addEventListener('click', e => busy(e.currentTarget, async () => {
  const c = current(); const size = Number($('#size').value);
  for (const fmt of ['png', 'jpg', 'gif', 'svg']) {
    download(await exportBlob(c.svg, fmt, size), fname(c, fmt, size));
    await new Promise(r => setTimeout(r, 250));
  }
}));
$('#save').addEventListener('click', e => busy(e.currentTarget, async () => {
  const c = current();
  if (c.savedSvg === c.svg && !confirm('이 아이콘은 이미 저장했어요. 한 번 더 저장할까요?')) return;
  const remoteMode = store.name === 'Supabase';
  await store.saveIcon({
    name: (c.name || 'icon').slice(0, 80),
    keywords: parseKeywords($('#keywords').value).keywords.slice(0, 30),
    description: $('#desc').value.trim().slice(0, 1000),
    svg: sanitizeSvg(c.svg),
    style: c.style || null,
    sample_url: remoteMode ? undefined : (state.sample?.url || null),
    sampleFile: remoteMode ? state.sample?.file : undefined,
    pngBlob: remoteMode ? await exportBlob(c.svg, 'png', 256) : undefined,
  });
  c.savedSvg = c.svg;
  toast('보관함에 저장했어요. 상단 [보관함] 탭에서 볼 수 있어요.');
}));

// ---------- 보관함 ----------
$('#libSearch').addEventListener('input', () => renderLibrary());
async function renderLibrary() {
  const box = $('#library');
  let list;
  try { list = await store.listIcons(); } catch (e) { box.innerHTML = `<p class="warn">불러오기 실패: ${esc(e.message)}</p>`; return; }
  const q = $('#libSearch').value.trim().toLowerCase();
  const shown = q ? list.filter(i => `${i.name} ${(i.keywords || []).join(' ')} ${i.description || ''}`.toLowerCase().includes(q)) : list;
  $('#libCount').textContent = `${shown.length}개`;
  if (!shown.length) { box.innerHTML = `<p class="hint">${q ? '검색 결과가 없어요.' : '저장한 아이콘이 없어요. 만들기에서 <b>보관함 저장</b>을 눌러보세요.'}</p>`; return; }
  box.innerHTML = '';
  for (const it of shown) {
    const el = document.createElement('article');
    el.className = 'item';
    el.innerHTML = `<div class="thumb checker"><img alt="" src="${svgDataUrl(sanitizeSvg(it.svg) || '')}"></div>
      <h3 title="${esc(it.name)}">${esc(it.name)}</h3>
      <p>${esc((it.keywords || []).join(', ') || it.description || '')} · ${new Date(it.created_at).toLocaleDateString('ko-KR')}</p>
      <div class="btns">${['png', 'jpg', 'gif', 'svg'].map(f => `<button class="ghost" data-f="${f}" aria-label="${esc(it.name)} ${f.toUpperCase()} 다운로드">${f.toUpperCase()}</button>`).join('')}
      <button class="ghost danger" data-del aria-label="${esc(it.name)} 삭제">삭제</button></div>`;
    el.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => busy(b, async () => {
      const size = Number($('#libSize').value);
      download(await exportBlob(it.svg, b.dataset.f, size), fname(it, b.dataset.f, size));
    })));
    el.querySelector('[data-del]').addEventListener('click', ev => {
      if (!confirm(`'${it.name}'을(를) 삭제할까요?`)) return;
      busy(ev.currentTarget, async () => { await store.deleteIcon(it.id); toast('삭제했어요.'); renderLibrary(); });
    });
    box.appendChild(el);
  }
}

// ---------- 참고 사이트 ----------
async function loadSites() {
  try { state.sites = await store.listSites(); } catch (e) {
    if (store !== localStore) {
      // 클라우드 연결 실패 시 이 기기 저장으로 전환해 계속 쓸 수 있게 한다
      store = localStore;
      updateModeBadge();
      toast('클라우드에 연결하지 못해 이 기기에 저장하는 모드로 전환했어요. ' + e.message, true);
      try { state.sites = await store.listSites(); } catch { state.sites = []; }
    } else { state.sites = []; toast('참고 사이트 불러오기 실패: ' + e.message, true); }
  }
  renderRefLinks();
}
function searchUrl(site, q) {
  if (site.search && site.search.includes('{q}')) return site.search.replace('{q}', encodeURIComponent(q));
  return site.url;
}
function renderRefLinks() {
  const q = parseKeywords($('#keywords').value).keywords.join(' ');
  $('#refLinks').innerHTML = state.sites.filter(s => isHttp(s.url)).map(s =>
    `<a href="${esc(q ? searchUrl(s, q) : s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a>`).join('') || '<small>등록된 사이트가 없어요.</small>';
}
$('#keywords').addEventListener('input', renderRefLinks);

async function renderSites() {
  await loadSites();
  const tb = $('#siteRows');
  tb.innerHTML = state.sites.map(s => `<tr data-id="${esc(s.id)}">
    <td>${esc(s.name)}</td>
    <td>${isHttp(s.url) ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.url)}</a>` : esc(s.url)}</td>
    <td><small>${esc(s.search || '-')}</small></td>
    <td><button class="ghost" data-edit aria-label="${esc(s.name)} 수정">수정</button> <button class="ghost danger" data-del aria-label="${esc(s.name)} 삭제">삭제</button></td></tr>`).join('')
    || '<tr><td colspan="4"><small>등록된 사이트가 없어요.</small></td></tr>';
  tb.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
    const s = state.sites.find(x => x.id === b.closest('tr').dataset.id);
    $('#siteId').value = s.id; $('#siteName').value = s.name; $('#siteUrl').value = s.url; $('#siteSearch').value = s.search || '';
    $('#siteFormTitle').textContent = '사이트 수정'; $('#siteCancel').hidden = false; $('#siteName').focus();
  }));
  tb.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    const s = state.sites.find(x => x.id === b.closest('tr').dataset.id);
    if (!confirm(`'${s.name}'을(를) 목록에서 삭제할까요?`)) return;
    busy(b, async () => {
      await store.deleteSite(s.id);
      if ($('#siteId').value === s.id) resetSiteForm();
      toast('삭제했어요.'); renderSites();
    });
  }));
}
function resetSiteForm() {
  $('#siteForm').reset(); $('#siteId').value = '';
  $('#siteFormTitle').textContent = '사이트 추가'; $('#siteCancel').hidden = true;
}
$('#siteCancel').addEventListener('click', resetSiteForm);
$('#siteForm').addEventListener('submit', e => {
  e.preventDefault();
  const btn = e.submitter || $('#siteForm button[type=submit]');
  busy(btn, async () => {
    const name = $('#siteName').value.trim(), url = $('#siteUrl').value.trim(), search = $('#siteSearch').value.trim();
    if (!name) throw new UserError('이름을 넣어주세요.');
    if (!isHttp(url)) throw new UserError('주소는 http(s)로 시작해야 해요.');
    if (search && !isHttp(search.replace('{q}', 'x'))) throw new UserError('검색 주소는 http(s)로 시작해야 해요.');
    const id = $('#siteId').value;
    const prev = state.sites.find(s => s.id === id);
    if (id && !prev) { resetSiteForm(); throw new UserError('이미 삭제된 사이트예요. 새로 추가해 주세요.'); }
    await store.saveSite({ ...(prev || {}), id: id || undefined, name, url, search });
    toast(id ? '수정했어요.' : '추가했어요.');
    resetSiteForm(); renderSites();
  });
});
$('#resetSites').addEventListener('click', e => {
  if (!confirm('참고 사이트를 기본 3개(Iconfinder, Font Awesome, Flaticon)로 되돌릴까요?')) return;
  busy(e.currentTarget, async () => { await store.resetSites(); toast('기본값으로 복원했어요.'); renderSites(); });
});

// ---------- 설정 ----------
function renderSettings() {
  const cfg = getConfig();
  document.querySelector(`input[name=mode][value=${cfg.mode}]`).checked = true;
  document.querySelector(`input[name=engine][value=${cfg.engine}]`).checked = true;
  $('#cfgUrl').value = cfg.supabaseUrl || '';
  $('#cfgKey').value = cfg.supabaseKey || '';
  $('#cfgCode').value = cfg.accessCode || '';
}
$('#cfgForm').addEventListener('submit', e => {
  e.preventDefault();
  const mode = document.querySelector('input[name=mode]:checked').value;
  const engine = document.querySelector('input[name=engine]:checked').value;
  const supabaseUrl = $('#cfgUrl').value.trim();
  const supabaseKey = $('#cfgKey').value.trim().replace(/^["'\s]+|["'\s]+$/g, '').replace(/^Bearer\s+/i, '');
  const accessCode = $('#cfgCode').value.trim().slice(0, 100);
  if (mode === 'supabase' && (!/^https:\/\/[\w-]+\.supabase\.co\/?$/.test(supabaseUrl) || !supabaseKey)) {
    return toast('Supabase 주소(https://xxxx.supabase.co)와 공개 키를 넣어주세요.', true);
  }
  if (/service_role|sb_secret_/i.test(supabaseKey) || (/eyJ/.test(supabaseKey) && jwtRole(supabaseKey.slice(supabaseKey.indexOf('eyJ'))) !== 'anon')) {
    return toast('비밀 키(service_role)는 브라우저에 넣으면 안 돼요. 공개 키를 넣어주세요.', true);
  }
  setConfig({ mode, engine, supabaseUrl: supabaseUrl.replace(/\/$/, ''), supabaseKey, accessCode });
  location.reload();
});
function jwtRole(t) { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role; } catch { return null; } }

// ---------- 시작 ----------
updateModeBadge();
loadSites();
