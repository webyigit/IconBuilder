-- 아이콘 빌더 Supabase 스키마 (보안 보완판)
-- 사전 설정: Authentication > Sign In / Providers > "Allow anonymous sign-ins" 켜기 (+ CAPTCHA 권장)
-- 원칙: 사용자는 자기 데이터만 보고 고친다. 공용으로 편집되는 데이터는 없다.

-- ---------- 아이콘 ----------
create table if not exists public.icons (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) <= 80),
  keywords text[] not null default '{}' check (cardinality(keywords) <= 30),
  description text check (char_length(description) <= 1000),
  svg text not null check (
    char_length(svg) <= 100000
    and svg ~* '^\s*<svg[\s>]'
    and svg !~* '<\s*(script|foreignobject|iframe|object|embed|image|style|animate\w*|set|feimage|a)[\s>/]'
    and svg !~* '\son[a-z]+\s*='
    -- xmlns 선언을 뺀 나머지에 외부 참조·스크립트 URL이 없어야 함
    and regexp_replace(svg, 'xmlns(:[a-z]+)?\s*=\s*"http://www\.w3\.org/[^"]*"', '', 'gi') !~* '(javascript:|https?:|//|data:)'
  ),
  style jsonb,
  sample_path text,   -- 비공개 버킷 경로
  png_path text,      -- 비공개 버킷 경로
  created_at timestamptz not null default now()
);
create index if not exists icons_owner_idx on public.icons(owner, created_at desc);

alter table public.icons enable row level security;
create policy icons_select_own on public.icons for select to authenticated using (owner = auth.uid());
create policy icons_insert_own on public.icons for insert to authenticated with check (owner = auth.uid());
create policy icons_delete_own on public.icons for delete to authenticated using (owner = auth.uid());

-- 쓰기 쿼터: 사용자당 아이콘 300개, 하루 100개
create or replace function public.icons_quota() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.icons where owner = new.owner) >= 300 then
    raise exception 'quota: 아이콘은 사용자당 300개까지 저장할 수 있습니다';
  end if;
  if (select count(*) from public.icons where owner = new.owner and created_at > now() - interval '1 day') >= 100 then
    raise exception 'quota: 하루 100개까지 저장할 수 있습니다';
  end if;
  return new;
end $$;
drop trigger if exists icons_quota on public.icons;
create trigger icons_quota before insert on public.icons for each row execute function public.icons_quota();

-- ---------- 참고 사이트 (사용자별 목록) ----------
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) <= 40),
  url text not null check (char_length(url) <= 300 and url ~* '^https?://[^\s"<>]+$'),
  search text check (search is null or (char_length(search) <= 300 and search ~* '^https?://[^\s"<>]+$')),
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.sites enable row level security;
create policy sites_select_own on public.sites for select to authenticated using (owner = auth.uid());
create policy sites_insert_own on public.sites for insert to authenticated with check (owner = auth.uid());
create policy sites_update_own on public.sites for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy sites_delete_own on public.sites for delete to authenticated using (owner = auth.uid());

create or replace function public.sites_quota() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.sites where owner = new.owner) >= 50 then
    raise exception 'quota: 참고 사이트는 50개까지 등록할 수 있습니다';
  end if;
  return new;
end $$;
drop trigger if exists sites_quota on public.sites;
create trigger sites_quota before insert on public.sites for each row execute function public.sites_quota();
-- 기본 3개(Iconfinder, Font Awesome, Flaticon)는 앱이 사용자 첫 접속 때 본인 목록으로 복사한다.

-- ---------- AI 생성 사용량 (Edge Function 전용, 클라이언트 접근 불가) ----------
create table if not exists public.gen_usage (
  owner uuid not null,
  day date not null default current_date,
  count int not null default 0,
  primary key (owner, day)
);
alter table public.gen_usage enable row level security; -- 정책 없음 = 클라이언트 접근 차단

create or replace function public.consume_generation(p_owner uuid, p_user_limit int, p_global_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare used int; total int;
begin
  select coalesce(sum(count), 0) into total from public.gen_usage where day = current_date;
  if total >= p_global_limit then return false; end if;
  insert into public.gen_usage(owner, day, count) values (p_owner, current_date, 1)
    on conflict (owner, day) do update set count = public.gen_usage.count + 1
    returning count into used;
  if used > p_user_limit then
    update public.gen_usage set count = count - 1 where owner = p_owner and day = current_date;
    return false;
  end if;
  return true;
end $$;
revoke all on function public.consume_generation(uuid, int, int) from public, anon, authenticated;

-- ---------- 스토리지: 비공개 버킷, 본인 폴더(<uid>/...)만 ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('samples', 'samples', false, 2097152, array['image/png','image/jpeg','image/gif','image/webp']),
  ('icons',   'icons',   false, 1048576, array['image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy storage_select_own on storage.objects for select to authenticated
  using (bucket_id in ('samples','icons') and (storage.foldername(name))[1] = auth.uid()::text);
create policy storage_insert_own on storage.objects for insert to authenticated
  with check (bucket_id in ('samples','icons') and (storage.foldername(name))[1] = auth.uid()::text);
create policy storage_delete_own on storage.objects for delete to authenticated
  using (bucket_id in ('samples','icons') and (storage.foldername(name))[1] = auth.uid()::text);

-- 스토리지 쿼터: 사용자당 파일 600개
create or replace function public.storage_quota() returns trigger language plpgsql security definer set search_path = public, storage as $$
begin
  if new.bucket_id in ('samples','icons') and
     (select count(*) from storage.objects where bucket_id in ('samples','icons') and owner_id = new.owner_id) >= 600 then
    raise exception 'quota: 파일 저장 한도를 넘었습니다';
  end if;
  return new;
end $$;
drop trigger if exists storage_quota on storage.objects;
create trigger storage_quota before insert on storage.objects for each row execute function public.storage_quota();
