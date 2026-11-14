begin;
create schema war_private;
revoke all on schema war_private from public, anon, authenticated;
grant usage on schema war_private to authenticated;

create table public.war_rooms (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(name) between 1 and 50),
 state jsonb not null default '{"blue":{},"red":{},"bans":{"blue":[],"red":[]},"opponents":{},"notes":"","startedAt":null,"objectives":{},"durations":{},"meta":null}',
 revision integer not null default 0 check (revision >= 0),
 created_at timestamptz not null default now()
);
create index war_rooms_owner_idx on public.war_rooms(owner_id);
create table public.war_profiles (
 room_id uuid not null references public.war_rooms(id) on delete cascade,
 slot smallint not null check (slot between 1 and 5),
 member_id uuid references auth.users(id) on delete set null,
 name text not null default '' check (length(name) <= 32),
 lane text not null check (lane in ('slayer','jungle','mid','dragon','roam')),
 pool text[] not null default '{}' check (cardinality(pool) <= 20),
 primary key (room_id,slot),
 unique (room_id,member_id)
);
create index war_profiles_member_idx on public.war_profiles(member_id);
create table war_private.invites (
 token_hash bytea primary key,
 room_id uuid not null,
 slot smallint not null,
 expires_at timestamptz not null,
 unique(room_id,slot),
 foreign key(room_id,slot) references public.war_profiles(room_id,slot) on delete cascade
);
create table war_private.ai_budget (
 actor uuid primary key references auth.users(id) on delete cascade,
 last_call timestamptz not null
);
create function war_private.is_coach(p_room uuid) returns boolean
 language sql stable security definer set search_path = ''
 as $$ select exists (select 1 from public.war_rooms r where r.id=p_room and r.owner_id=(select auth.uid())) $$;
create function war_private.has_room(p_room uuid) returns boolean
 language sql stable security definer set search_path = ''
 as $$ select war_private.is_coach(p_room) or exists (select 1 from public.war_profiles p where p.room_id=p_room and p.member_id=(select auth.uid())) $$;
revoke all on all functions in schema war_private from public, anon, authenticated;
grant execute on function war_private.has_room(uuid) to authenticated;

alter table public.war_rooms enable row level security;
alter table public.war_profiles enable row level security;
revoke all on public.war_rooms, public.war_profiles from public, anon, authenticated;
grant select on public.war_rooms, public.war_profiles to authenticated;
create policy war_rooms_read on public.war_rooms for select to authenticated using (war_private.has_room(id));
create policy war_profiles_read on public.war_profiles for select to authenticated using (war_private.has_room(room_id));

create function public.war_create_room(p_name text) returns uuid
 language plpgsql security definer set search_path = '' as $$
declare room uuid; me uuid := auth.uid();
begin
 if me is null then raise insufficient_privilege; end if;
 if coalesce(length(btrim(p_name)),0) not between 1 and 50 then raise exception 'กรอกชื่อห้อง 1–50 ตัวอักษร'; end if;
 perform pg_advisory_xact_lock(hashtextextended(me::text, 791));
 if (select count(*) from public.war_rooms where owner_id=me)>=20 then raise exception 'บัญชีนี้สร้างครบ 20 ห้องแล้ว'; end if;
 insert into public.war_rooms(owner_id,name) values(me,btrim(p_name)) returning id into room;
 insert into public.war_profiles(room_id,slot,lane) values
  (room,1,'slayer'),(room,2,'jungle'),(room,3,'mid'),(room,4,'dragon'),(room,5,'roam');
 return room;
end $$;

create function public.war_issue_invite(p_room uuid,p_slot integer) returns text
 language plpgsql security definer set search_path = '' as $$
declare token text; current_member uuid;
begin
 if not war_private.is_coach(p_room) then raise insufficient_privilege; end if;
 select p.member_id into current_member from public.war_profiles p where p.room_id=p_room and p.slot=p_slot for update;
 if not found or current_member is not null then raise exception 'ไม่พบช่องหรือช่องนี้มีผู้เล่นแล้ว'; end if;
 token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
 insert into war_private.invites(token_hash,room_id,slot,expires_at)
 values(sha256(convert_to(token,'UTF8')),p_room,p_slot,now()+interval '7 days')
 on conflict(room_id,slot) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at;
 return token;
end $$;

create function public.war_accept_invite(p_token text) returns uuid
 language plpgsql security definer set search_path = '' as $$
declare r war_private.invites%rowtype; me uuid:=auth.uid(); hash bytea;
begin
 if me is null then raise insufficient_privilege; end if;
 if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'ลิงก์เชิญไม่ถูกต้อง'; end if;
 hash:=sha256(convert_to(p_token,'UTF8'));
 select * into r from war_private.invites i where i.token_hash=hash and i.expires_at>now();
 if not found then raise exception 'ลิงก์เชิญหมดอายุหรือถูกใช้แล้ว'; end if;
 perform 1 from public.war_profiles where room_id=r.room_id and slot=r.slot for update;
 delete from war_private.invites i where i.token_hash=hash and i.expires_at>now();
 if not found then raise exception 'ลิงก์เชิญหมดอายุหรือถูกใช้แล้ว'; end if;
 update public.war_profiles set member_id=me where room_id=r.room_id and slot=r.slot and member_id is null;
 if not found then raise exception 'ช่องนี้มีผู้เล่นแล้ว'; end if;
 return r.room_id;
exception when unique_violation then raise exception 'บัญชีนี้มีช่องผู้เล่นในห้องอยู่แล้ว';
end $$;

create function public.war_save_profile(p_room uuid,p_slot integer,p_name text,p_lane text,p_pool text[]) returns void
 language plpgsql security definer set search_path = '' as $$
declare me uuid:=auth.uid();
begin
 if me is null then raise insufficient_privilege; end if;
 if p_name is null or length(btrim(p_name))>32 or p_lane is null or p_lane not in ('slayer','jungle','mid','dragon','roam')
    or p_pool is null or cardinality(p_pool)>20
    or exists (select 1 from unnest(p_pool) as item(id) where item.id is null or item.id !~ '^[a-z0-9-]{1,40}$')
    or cardinality(p_pool)<>(select count(distinct id) from unnest(p_pool) as item(id))
 then raise exception 'ชื่อ เลน หรือรายชื่อฮีโร่ไม่ถูกต้อง'; end if;
 update public.war_profiles set name=btrim(p_name),lane=p_lane,pool=p_pool
  where room_id=p_room and slot=p_slot and (member_id=me or war_private.is_coach(p_room));
 if not found then raise insufficient_privilege; end if;
end $$;

create function public.war_save_state(p_room uuid,p_state jsonb,p_revision integer) returns jsonb
 language plpgsql security definer set search_path = '' as $$
declare out_room public.war_rooms%rowtype; drafts text[]; pick text;
begin
 if not war_private.is_coach(p_room) then raise insufficient_privilege; end if;
 if p_state is null or jsonb_typeof(p_state) is distinct from 'object' or octet_length(p_state::text)>36000
    or not (p_state ?& array['blue','red','bans','opponents','notes','startedAt','objectives','durations','meta'])
    or jsonb_typeof(p_state->'blue') is distinct from 'object'
    or jsonb_typeof(p_state->'red') is distinct from 'object'
    or jsonb_typeof(p_state->'bans') is distinct from 'object'
    or jsonb_typeof(p_state->'bans'->'blue') is distinct from 'array'
    or jsonb_typeof(p_state->'bans'->'red') is distinct from 'array'
    or jsonb_typeof(p_state->'opponents') is distinct from 'object'
    or jsonb_typeof(p_state->'objectives') is distinct from 'object'
    or jsonb_typeof(p_state->'durations') is distinct from 'object'
    or jsonb_typeof(p_state->'notes') is distinct from 'string'
    or length(p_state->>'notes')>1500
 then raise exception 'รูปแบบข้อมูลห้องไม่ถูกต้อง'; end if;
 if exists(select 1 from jsonb_object_keys((p_state->'blue') || (p_state->'red')) as k(lane) where k.lane not in ('slayer','jungle','mid','dragon','roam'))
    or jsonb_array_length(p_state->'bans'->'blue')>6 or jsonb_array_length(p_state->'bans'->'red')>6
 then raise exception 'จำนวนช่องดราฟต์ไม่ถูกต้อง'; end if;
 select array_agg(case when h.id like 'flowborn-%' then 'flowborn' else h.id end) into drafts from (
   select value as id from jsonb_each_text(p_state->'blue') union all
   select value from jsonb_each_text(p_state->'red') union all
   select value from jsonb_array_elements_text(p_state->'bans'->'blue') union all
   select value from jsonb_array_elements_text(p_state->'bans'->'red')
 ) h;
 foreach pick in array coalesce(drafts,'{}') loop
   if pick is null or pick !~ '^[a-z0-9-]{1,40}$' then raise exception 'รหัสฮีโร่ไม่ถูกต้อง'; end if;
 end loop;
 if cardinality(drafts)<>(select count(distinct d) from unnest(drafts) as a(d)) then raise exception 'มีฮีโร่ซ้ำในกระดานดราฟต์'; end if;
 update public.war_rooms set state=p_state,revision=revision+1 where id=p_room and revision=p_revision returning * into out_room;
 if not found then raise exception using errcode='40001',message='Stale draft revision'; end if;
 return to_jsonb(out_room);
end $$;

create function public.war_use_ai_quota(p_room uuid) returns boolean
 language plpgsql security definer set search_path = '' as $$
declare me uuid:=auth.uid();
begin
 if me is null or not war_private.has_room(p_room) then raise insufficient_privilege; end if;
 insert into war_private.ai_budget(actor,last_call) values(me,now())
 on conflict(actor) do update set last_call=excluded.last_call where war_private.ai_budget.last_call<now()-interval '20 seconds';
 return found;
end $$;

revoke all on function public.war_create_room(text),public.war_issue_invite(uuid,integer),public.war_accept_invite(text),
 public.war_save_profile(uuid,integer,text,text,text[]),public.war_save_state(uuid,jsonb,integer),public.war_use_ai_quota(uuid) from public, anon, authenticated;
grant execute on function public.war_create_room(text),public.war_issue_invite(uuid,integer),public.war_accept_invite(text),
 public.war_save_profile(uuid,integer,text,text,text[]),public.war_save_state(uuid,jsonb,integer),public.war_use_ai_quota(uuid) to authenticated;

alter publication supabase_realtime add table public.war_rooms, public.war_profiles;
commit;
