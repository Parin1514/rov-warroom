-- Backup lane + lane-bound comfort pool.
-- pool entries become "heroId@lane" (lane the player uses that hero in); bare
-- ids from older saves stay valid and fall back to the hero's own lane in the app.
begin;
alter table public.war_profiles
  add column lane2 text check (lane2 in ('slayer','jungle','mid','dragon','roam')),
  add constraint war_profiles_lane2_differs check (lane2 is null or lane2 <> lane);

drop function public.war_save_profile(uuid,integer,text,text,text[]);
create function public.war_save_profile(p_room uuid,p_slot integer,p_name text,p_lane text,p_lane2 text,p_pool text[]) returns void
 language plpgsql security definer set search_path = '' as $$
declare me uuid:=auth.uid();
begin
 if me is null then raise insufficient_privilege; end if;
 if p_name is null or length(btrim(p_name))>32 or p_lane is null or p_lane not in ('slayer','jungle','mid','dragon','roam')
    or (p_lane2 is not null and (p_lane2 not in ('slayer','jungle','mid','dragon','roam') or p_lane2=p_lane))
    or p_pool is null or cardinality(p_pool)>20
    or exists (select 1 from unnest(p_pool) as item(id) where item.id is null or item.id !~ '^[a-z0-9-]{1,40}(@(slayer|jungle|mid|dragon|roam))?$')
    or cardinality(p_pool)<>(select count(distinct id) from unnest(p_pool) as item(id))
 then raise exception 'ชื่อ เลน หรือรายชื่อฮีโร่ไม่ถูกต้อง'; end if;
 update public.war_profiles set name=btrim(p_name),lane=p_lane,lane2=p_lane2,pool=p_pool
  where room_id=p_room and slot=p_slot and (member_id=me or war_private.is_coach(p_room));
 if not found then raise insufficient_privilege; end if;
end $$;
revoke all on function public.war_save_profile(uuid,integer,text,text,text,text[]) from public, anon, authenticated;
grant execute on function public.war_save_profile(uuid,integer,text,text,text,text[]) to authenticated;
commit;
