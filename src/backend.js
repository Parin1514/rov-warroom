import {createClient} from '@supabase/supabase-js'
const env=import.meta.env
export const db=env.VITE_SUPABASE_URL&&env.VITE_SUPABASE_PUBLISHABLE_KEY?createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY):null
export const homeUrl=()=>new URL(window.location.pathname,window.location.origin).href
export async function rpc(name,params={}){
 const {data,error}=await db.rpc(name,params)
 if(error)throw Object.assign(new Error(error.message),{code:error.code})
 return data
}
export async function fetchRoom(id){
 const [room,players]=await Promise.all([
   db.from('war_rooms').select('id,name,owner_id,state,revision').eq('id',id).single(),
   db.from('war_profiles').select('slot,member_id,name,lane,pool').eq('room_id',id).order('slot')
 ])
 if(room.error)throw room.error
 if(players.error)throw players.error
 return {room:room.data,profiles:players.data}
}
