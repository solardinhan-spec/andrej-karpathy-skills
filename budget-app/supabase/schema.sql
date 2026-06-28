-- =====================================================================
--  우리집 가계부 — Supabase 스키마
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 한 번 실행하세요.
-- =====================================================================

-- 1) 테이블 ------------------------------------------------------------
create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '우리집 가계부',
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.entries (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  month        text not null,                 -- 'YYYY-MM'
  type         text not null check (type in ('income','expense','savings')),
  owner        text,                          -- 이현 / 혜원 / 기타 / 공동
  kind         text,                          -- 고정 / 변동 (expense only)
  cat          text,                          -- 생활 / 공과금 ... (fixed expense)
  title        text not null default '',
  amount       bigint not null default 0,
  memo         text default '',
  created_at   timestamptz not null default now()
);
create index if not exists entries_household_month_idx on public.entries (household_id, month);

create table if not exists public.savings_cards (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  month        text not null,
  key          text not null,                 -- 저축 / 투자 / 청약통장 / 비상예비금
  prev         bigint not null default 0,
  curr         bigint not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists savings_cards_household_month_idx on public.savings_cards (household_id, month);

-- 2) 멤버십 확인 헬퍼 ---------------------------------------------------
create or replace function public.is_member(h uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.household_members
    where household_id = h and user_id = auth.uid()
  );
$$;

-- 3) RLS ---------------------------------------------------------------
alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.entries           enable row level security;
alter table public.savings_cards     enable row level security;

drop policy if exists households_select on public.households;
create policy households_select on public.households
  for select using (public.is_member(id));

drop policy if exists members_select on public.household_members;
create policy members_select on public.household_members
  for select using (user_id = auth.uid() or public.is_member(household_id));

drop policy if exists entries_all on public.entries;
create policy entries_all on public.entries
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));

drop policy if exists cards_all on public.savings_cards;
create policy cards_all on public.savings_cards
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));

-- 4) 가계부 생성 / 참여 RPC -------------------------------------------
create or replace function public.create_household(p_name text)
returns public.households language plpgsql security definer set search_path = public as $$
declare
  h public.households;
  code text;
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 헷갈리는 글자(0,O,1,I,L) 제외
  i int;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  -- 6자리 영숫자 초대 코드 (pgcrypto 의존 없이 random()으로 생성)
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;
  insert into public.households (name, invite_code) values (coalesce(nullif(p_name,''),'우리집 가계부'), code)
    returning * into h;
  insert into public.household_members (household_id, user_id) values (h.id, auth.uid());
  return h;
end;
$$;

create or replace function public.join_household(p_code text)
returns public.households language plpgsql security definer set search_path = public as $$
declare
  h public.households;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select * into h from public.households where invite_code = upper(p_code);
  if h.id is null then return null; end if;
  insert into public.household_members (household_id, user_id)
    values (h.id, auth.uid()) on conflict do nothing;
  return h;
end;
$$;

grant execute on function public.create_household(text) to authenticated, anon;
grant execute on function public.join_household(text)   to authenticated, anon;

-- 5) 실시간 동기화 활성화 (재실행해도 안전하도록 멱등 처리) -----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'entries'
  ) then
    alter publication supabase_realtime add table public.entries;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'savings_cards'
  ) then
    alter publication supabase_realtime add table public.savings_cards;
  end if;
end $$;

-- 6) 구성원 이름 (이현/혜원 슬롯의 표시 이름) ------------------------
alter table public.households add column if not exists m1_name text default '이현';
alter table public.households add column if not exists m2_name text default '혜원';

create or replace function public.set_member_names(p_m1 text, p_m2 text)
returns void language plpgsql security definer set search_path = public as $$
declare
  hid uuid;
begin
  select household_id into hid from public.household_members where user_id = auth.uid() limit 1;
  if hid is null or not public.is_member(hid) then raise exception 'not a member'; end if;
  update public.households
    set m1_name = coalesce(nullif(p_m1, ''), '이현'),
        m2_name = coalesce(nullif(p_m2, ''), '혜원')
  where id = hid;
end;
$$;

grant execute on function public.set_member_names(text, text) to authenticated, anon;
