-- Counter guides: "how to beat hero X" — per-matchup playbook the team can edit.
-- Seed rows are rule-derived from verified skill tags (source='rule'); coaches can
-- add or overwrite with field notes (source='coach'). No win rates are stored.
begin;

create table public.war_counter_guides (
  id bigint generated always as identity primary key,
  hero_id text not null check (hero_id ~ '^[a-z0-9-]{1,40}$'),          -- the hero you play
  enemy_id text not null check (enemy_id ~ '^[a-z0-9-]{1,40}$'),         -- the hero you face
  room_id uuid references public.war_rooms(id) on delete cascade,        -- null = global (rule seed)
  source text not null default 'rule' check (source in ('rule','coach')),
  score smallint not null default 0 check (score between -99 and 99),   -- rule-derived, not a win rate
  band text not null default 'even' check (band in ('win','good','even','lose','bad')),
  edges text[] not null default '{}' check (cardinality(edges) <= 8),   -- matched rule ids
  phases jsonb not null default '{}'::jsonb check (jsonb_typeof(phases)='object' and octet_length(phases::text) <= 6000),
  items text[] not null default '{}' check (cardinality(items) <= 6),
  note text not null default '' check (length(note) <= 1200),
  author_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (hero_id <> enemy_id),
  check ((source='rule' and room_id is null) or (source='coach' and room_id is not null))
);
-- One rule row per pair, one coach row per pair per room.
create unique index war_counter_guides_rule_uq on public.war_counter_guides(hero_id,enemy_id) where source='rule';
create unique index war_counter_guides_room_uq on public.war_counter_guides(room_id,hero_id,enemy_id) where source='coach';
create index war_counter_guides_enemy_idx on public.war_counter_guides(enemy_id,score desc);

alter table public.war_counter_guides enable row level security;
revoke all on public.war_counter_guides from public, anon, authenticated;
grant select on public.war_counter_guides to anon, authenticated;
-- Rule rows are public reference data; coach rows are visible to room members only.
create policy war_counter_guides_read on public.war_counter_guides for select to anon, authenticated
  using (room_id is null or war_private.has_room(room_id));

-- Coach notes go through one guarded function; rule rows are never writable from the client.
create function public.war_save_guide(p_room uuid,p_hero text,p_enemy text,p_phases jsonb,p_items text[],p_note text) returns bigint
 language plpgsql security definer set search_path = '' as $$
declare out_id bigint;
begin
 if not war_private.is_coach(p_room) then raise insufficient_privilege; end if;
 if p_hero is null or p_hero !~ '^[a-z0-9-]{1,40}$' or p_enemy is null or p_enemy !~ '^[a-z0-9-]{1,40}$' or p_hero=p_enemy
 then raise exception 'รหัสฮีโร่ไม่ถูกต้อง'; end if;
 if p_phases is null or jsonb_typeof(p_phases) is distinct from 'object' or octet_length(p_phases::text)>6000
    or exists(select 1 from jsonb_object_keys(p_phases) k where k not in ('early','mid','late','fight','avoid'))
 then raise exception 'รูปแบบแผนไม่ถูกต้อง'; end if;
 if p_items is null or cardinality(p_items)>6 or coalesce(length(p_note),0)>1200
 then raise exception 'ไอเทมหรือโน้ตยาวเกินกำหนด'; end if;
 insert into public.war_counter_guides(hero_id,enemy_id,room_id,source,phases,items,note,author_id,updated_at)
 values(p_hero,p_enemy,p_room,'coach',p_phases,p_items,coalesce(p_note,''),auth.uid(),now())
 on conflict (room_id,hero_id,enemy_id) where source='coach'
 do update set phases=excluded.phases,items=excluded.items,note=excluded.note,author_id=excluded.author_id,updated_at=now()
 returning id into out_id;
 return out_id;
end $$;
revoke all on function public.war_save_guide(uuid,text,text,jsonb,text[],text) from public, anon, authenticated;
grant execute on function public.war_save_guide(uuid,text,text,jsonb,text[],text) to authenticated;

-- Live match feed for the overlay companion: coach/observer pushes events, team reads.
create table public.war_match_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.war_rooms(id) on delete cascade,
  kind text not null check (kind in ('objective','spell','ult','item','call','note')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload)='object' and octet_length(payload::text) <= 1000),
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index war_match_events_room_idx on public.war_match_events(room_id,created_at desc);
alter table public.war_match_events enable row level security;
revoke all on public.war_match_events from public, anon, authenticated;
grant select, insert on public.war_match_events to authenticated;
create policy war_match_events_read on public.war_match_events for select to authenticated using (war_private.has_room(room_id));
create policy war_match_events_write on public.war_match_events for insert to authenticated
  with check (war_private.has_room(room_id) and author_id = (select auth.uid()));

alter publication supabase_realtime add table public.war_match_events, public.war_counter_guides;
commit;
