// 배포 기본값. Supabase 공개(publishable) 키만 넣는다. 공개 키는 브라우저용으로 설계된 값이며 RLS로 보호된다.
// 비밀 키(service_role / sb_secret_)와 AI 키는 절대 넣지 않는다.
export const APP_CONFIG = {
  mode: 'supabase',
  supabaseUrl: 'https://kcfgzznbgbmohjofsjsq.supabase.co',
  supabaseKey: 'sb_publishable_lNTux_tp4nNLFukrMB7bkg_uPH0YhAY',
  engine: 'claude',
};
