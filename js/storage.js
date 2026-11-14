// 저장소: 브라우저(IndexedDB) / Supabase 두 가지. 같은 인터페이스.
import { APP_CONFIG } from './config.js';

export const DEFAULT_SITES = [
  { name: 'Iconfinder', url: 'https://www.iconfinder.com', search: 'https://www.iconfinder.com/search?q={q}' },
  { name: 'Font Awesome', url: 'https://fontawesome.com/icons', search: 'https://fontawesome.com/search?q={q}' },
  { name: 'Flaticon', url: 'https://www.flaticon.com', search: 'https://www.flaticon.com/search?word={q}' },
];

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

// ---------- 설정 ----------
const CFG_KEY = 'iconbuilder.config';
export function getConfig() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch { /* 저장 불가 환경 */ }
  return { mode: 'local', engine: 'mock', supabaseUrl: '', supabaseKey: '', ...APP_CONFIG, ...saved };
}
export function setConfig(cfg) {
  try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch { /* 무시 */ }
}

// ---------- IndexedDB ----------
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('iconbuilder', 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      db.createObjectStore('icons', { keyPath: 'id' });
      db.createObjectStore('sites', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(store, mode, fn) {
  const db = await idb();
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    Promise.resolve(fn(s)).then(v => { out = v; });
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
  });
}
const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

const local = {
  name: '브라우저 저장',
  async listIcons() {
    const all = await tx('icons', 'readonly', s => reqP(s.getAll()));
    return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async saveIcon(icon) {
    const row = { id: uid(), created_at: new Date().toISOString(), ...icon };
    await tx('icons', 'readwrite', s => reqP(s.put(row)));
    return row;
  },
  async deleteIcon(id) { await tx('icons', 'readwrite', s => reqP(s.delete(id))); },
  async listSites() {
    let all = await tx('sites', 'readonly', s => reqP(s.getAll()));
    if (!all.length && !localFlag('sitesSeeded')) {
      for (const [i, s] of DEFAULT_SITES.entries()) await this.saveSite({ ...s, sort: i });
      localFlag('sitesSeeded', true);
      all = await tx('sites', 'readonly', s => reqP(s.getAll()));
    }
    return all.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  },
  async saveSite(site) {
    const row = { id: site.id || uid(), sort: site.sort ?? Date.now(), ...site };
    if (!row.id) row.id = uid();
    await tx('sites', 'readwrite', s => reqP(s.put(row)));
    return row;
  },
  async deleteSite(id) { await tx('sites', 'readwrite', s => reqP(s.delete(id))); },
  async resetSites() {
    await tx('sites', 'readwrite', s => reqP(s.clear()));
    for (const [i, s] of DEFAULT_SITES.entries()) await this.saveSite({ ...s, sort: i });
  },
  async uploadSample(file) {
    return fileToDataUrl(file); // 브라우저 모드: 데이터 URL로 보관
  },
};

function localFlag(k, v) {
  try {
    if (v === undefined) return localStorage.getItem('iconbuilder.' + k) === '1';
    localStorage.setItem('iconbuilder.' + k, v ? '1' : '0');
  } catch { return false; }
}

export const fileToDataUrl = file => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = () => rej(r.error);
  r.readAsDataURL(file);
});

// ---------- Supabase ----------
let sbClient = null;
async function sb(cfg) {
  if (sbClient) return sbClient;
  if (!window.supabase) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'vendor/supabase.js';
      s.onload = res; s.onerror = () => rej(new Error('Supabase 라이브러리 로드 실패'));
      document.head.appendChild(s);
    });
  }
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  // 익명 로그인: 사용자별 소유권(RLS)용. 성공했을 때만 연결을 재사용한다.
  try {
    const { data } = await client.auth.getSession();
    if (!data.session) {
      const { error } = await client.auth.signInAnonymously();
      if (error) throw error;
    }
  } catch (e) {
    if (/anonymous/i.test(e?.message || '') || e?.code === 'anonymous_provider_disabled') {
      throw new Error('Supabase의 익명 로그인(Anonymous sign-ins)이 꺼져 있어요. 관리자가 Authentication → Sign In / Providers에서 켜야 해요.');
    }
    throw new Error('Supabase에 연결하지 못했어요. 설정의 주소·키와 네트워크를 확인해 주세요.');
  }
  sbClient = client;
  return sbClient;
}

function remote(cfg) {
  const must = (r) => {
    if (r.error) throw new Error(/fetch/i.test(r.error.message) ? '네트워크 오류로 Supabase에 연결하지 못했어요.' : r.error.message);
    return r.data;
  };
  const me = async c => (await c.auth.getUser()).data.user.id;
  return {
    name: 'Supabase',
    async listIcons() { const c = await sb(cfg); return must(await c.from('icons').select('*').order('created_at', { ascending: false }).limit(300)); },
    async saveIcon(icon) {
      const c = await sb(cfg);
      const { pngBlob, sampleFile, ...row } = icon;
      const uidv = await me(c);
      const uploaded = [];
      try {
        if (sampleFile && sampleFile.type !== 'image/svg+xml') {
          const ext = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' })[sampleFile.type] || 'png';
          const p = `${uidv}/${uid()}.${ext}`;
          must(await c.storage.from('samples').upload(p, sampleFile, { contentType: sampleFile.type }));
          uploaded.push(['samples', p]); row.sample_path = p;
        }
        if (pngBlob) {
          const p = `${uidv}/${uid()}.png`;
          must(await c.storage.from('icons').upload(p, pngBlob, { contentType: 'image/png' }));
          uploaded.push(['icons', p]); row.png_path = p;
        }
        delete row.sample_url;
        return must(await c.from('icons').insert(row).select().single());
      } catch (e) {
        // 실패 시 올린 파일 정리(고아 객체 방지)
        for (const [b, p] of uploaded) await c.storage.from(b).remove([p]);
        throw new Error(/quota/.test(e.message) ? e.message.replace(/^.*quota:\s*/, '') : '저장 실패: ' + e.message);
      }
    },
    async deleteIcon(id) {
      const c = await sb(cfg);
      const rows = must(await c.from('icons').delete().eq('id', id).select());
      if (!rows.length) throw new Error('삭제할 수 없는 아이콘이에요.');
      const r = rows[0];
      if (r.sample_path) await c.storage.from('samples').remove([r.sample_path]);
      if (r.png_path) await c.storage.from('icons').remove([r.png_path]);
    },
    async listSites() {
      const c = await sb(cfg);
      let rows = must(await c.from('sites').select('*').order('sort'));
      if (!rows.length && !localFlag('sitesSeeded.' + await me(c))) {
        await this.resetSites();
        localFlag('sitesSeeded.' + await me(c), true);
        rows = must(await c.from('sites').select('*').order('sort'));
      }
      return rows;
    },
    async saveSite(site) {
      const c = await sb(cfg);
      const row = { name: site.name, url: site.url, search: site.search || null, sort: site.sort ?? Math.floor(Date.now() / 1000) };
      if (site.id) {
        const r = must(await c.from('sites').update(row).eq('id', site.id).select());
        if (!r.length) throw new Error('수정할 수 없는 항목이에요.');
        return r[0];
      }
      return must(await c.from('sites').insert(row).select().single());
    },
    async deleteSite(id) {
      const c = await sb(cfg);
      const r = must(await c.from('sites').delete().eq('id', id).select());
      if (!r.length) throw new Error('삭제할 수 없는 항목이에요.');
    },
    async resetSites() {
      const c = await sb(cfg);
      must(await c.from('sites').delete().eq('owner', await me(c)));
      must(await c.from('sites').insert(DEFAULT_SITES.map((s, i) => ({ ...s, sort: i }))));
    },
    async generate(payload) {
      const c = await sb(cfg);
      const headers = cfg.accessCode ? { 'x-access-code': cfg.accessCode } : {};
      const r = await c.functions.invoke('generate-icon', { body: payload, headers });
      if (r.error) {
        let msg = r.error.message;
        try { msg = (await r.error.context.json()).error || msg; } catch { /* 본문 없음 */ }
        throw new Error('AI 생성 실패: ' + msg);
      }
      return r.data;
    },
  };
}

export const localStore = local;

export function getStore() {
  const cfg = getConfig();
  if (cfg.mode === 'supabase' && cfg.supabaseUrl && cfg.supabaseKey) return remote(cfg);
  return local;
}
