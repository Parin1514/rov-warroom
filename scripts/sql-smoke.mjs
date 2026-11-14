import {pathToFileURL} from 'node:url'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const {PGlite}=await import(process.env.PGLITE_MODULE?pathToFileURL(process.env.PGLITE_MODULE):'@electric-sql/pglite')
const db=new PGlite()
const owner='10000000-0000-4000-8000-000000000001', player='10000000-0000-4000-8000-000000000002', outsider='10000000-0000-4000-8000-000000000003'
await db.exec(`
 create role anon; create role authenticated;
 create schema auth; create table auth.users(id uuid primary key);
 grant usage on schema auth to authenticated;
 create function auth.uid() returns uuid language sql stable as $func$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
 $func$;
 create publication supabase_realtime;
 insert into auth.users values ('${owner}'),('${player}'),('${outsider}');
`)
await db.exec(readFileSync(new URL('../supabase/migrations/202611130001_war_room.sql',import.meta.url),'utf8'))
async function who(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated')}
const sql=(t,a=[])=>db.query(t,a).then(x=>x.rows)
await who(owner)
const [{id}]=await sql("select public.war_create_room('Test squad') id")
assert.equal((await sql('select * from public.war_profiles')).length,5)
const [{token}]=await sql('select public.war_issue_invite($1,1) token',[id])
const [{token:t2}]=await sql('select public.war_issue_invite($1,2) token',[id])
assert.notEqual(token,t2)
await who(outsider)
assert.equal((await sql('select * from public.war_rooms')).length,0)
assert.equal((await sql('select * from public.war_profiles')).length,0)
await assert.rejects(()=>sql("select public.war_issue_invite($1,1)",[id]),e=>e.code==='42501')
await assert.rejects(()=>sql("select public.war_save_state($1,'{}',0)",[id]),e=>e.code==='42501')
await who(player)
assert.equal((await sql('select public.war_accept_invite($1) id',[token]))[0].id,id)
assert.equal((await sql('select * from public.war_rooms')).length,1)
await assert.rejects(()=>sql("select public.war_accept_invite($1)",[token]))
await assert.rejects(()=>sql("select public.war_accept_invite($1)",[t2]))
await sql("select public.war_save_profile($1,1,'ผู้เล่น','mid',array['yue'])",[id])
assert.equal((await sql("select * from public.war_profiles where slot=1"))[0].pool[0],'yue')
await assert.rejects(()=>sql("select public.war_save_profile($1,2,'Wrong','mid',array['yue'])",[id]),e=>e.code==='42501')
await assert.rejects(()=>sql("select public.war_save_state($1,'{}',0)",[id]),e=>e.code==='42501')
assert.equal((await sql('select public.war_use_ai_quota($1) ok',[id]))[0].ok,true)
assert.equal((await sql('select public.war_use_ai_quota($1) ok',[id]))[0].ok,false)
await who(owner)
const [{state}]=await sql('select state from public.war_rooms where id=$1',[id])
state.blue.mid='yue';state.red.mid='yue'
await assert.rejects(()=>sql("select public.war_save_state($1,$2,0)",[id,JSON.stringify(state)]))
state.red.mid='aleister'
assert.equal((await sql("select public.war_save_state($1,$2,0) result",[id,JSON.stringify(state)]))[0].result.revision,1)
await assert.rejects(()=>sql("select public.war_save_state($1,$2,0)",[id,JSON.stringify(state)]),e=>e.code==='40001')
console.log('SQL smoke passed: room, RLS isolation, invites, profile ownership, duplicate validation, conflict, AI quota')
await db.close()
