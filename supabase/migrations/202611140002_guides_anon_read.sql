-- Fix: anon has no USAGE on war_private, and Postgres checks EXECUTE on
-- has_room() at plan time even when room_id is null short-circuits, so the
-- shared policy denied anon every row. Split by role: anon sees global rule
-- rows only; signed-in users also see coach notes for rooms they belong to.
begin;
drop policy war_counter_guides_read on public.war_counter_guides;
create policy war_counter_guides_read_anon on public.war_counter_guides for select to anon
  using (room_id is null);
create policy war_counter_guides_read_member on public.war_counter_guides for select to authenticated
  using (room_id is null or war_private.has_room(room_id));
commit;
