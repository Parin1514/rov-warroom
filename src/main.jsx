import React,{useEffect,useMemo,useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {Activity,ArrowDown,ArrowRight,ArrowUpRight,ChartNoAxesCombined,Check,Crosshair,Flame,Link2,Map,Plus,Shield,Sparkles,Swords,Users,Waves,Wind,X} from 'lucide-react'
import {BattleMap} from './map.jsx'
import {DraftBoard,HeroCatalog,DraftAnalysis,HeroSheet,targetName} from './draft.jsx'
import {CounterPick} from './matchup.jsx'
import {HeroIntel} from './hero-intel.jsx'
import {db,homeUrl,rpc,fetchRoom} from './backend.js'
import rawHeroes from './heroes.json'
import {LANES,SOURCE,PATCH,UPCOMING,defaultProfiles,fresh,occupied,selectHero,analyze,parseMeta,withMeta} from './domain.mjs'
import './styles.css'
const ICONS={slayer:Shield,jungle:Flame,mid:Sparkles,dragon:Crosshair,roam:Waves}
const allHeroes=rawHeroes
const tabs=[['draft','ดราฟต์',Swords],['counter','เคาน์เตอร์',Crosshair],['team','ผู้เล่น',Users],['map','แผนที่',Map],['meta','เมต้า',ChartNoAxesCombined]]
const read=(key,alt)=>{try{return JSON.parse(localStorage.getItem(key))??alt}catch{return alt}}
const store=(key,value)=>localStorage.setItem(key,JSON.stringify(value))
const asDate=d=>new Intl.DateTimeFormat('th-TH',{year:'numeric',month:'short',day:'numeric',timeZone:'Asia/Bangkok'}).format(new Date(d+'T12:00:00+07:00'))
const display=h=>h?h.name+(h.variant?' · '+h.variant:''):'ฮีโร่ไม่ทราบชื่อ'
function Portrait({hero,size='md'}){
 const [bad,setBad]=useState(false)
 useEffect(()=>setBad(false),[hero?.id])
 return <span className={'portrait '+size}>{hero?.portrait&&!bad?<img src={hero.localPortrait?'/portraits/'+hero.id+'.webp':hero.portrait} alt="" loading="lazy" onError={()=>setBad(true)}/>:hero?<span>{hero.name.slice(0,2).toUpperCase()}</span>:<Plus size={size==='sm'?14:19}/>}</span>
}
function App(){
 const params=new URLSearchParams(location.search)
 const [page,setPage]=useState('draft'),[practice,setPractice]=useState(()=>read('rw-state-1',fresh())),[practicePlayers,setPracticePlayers]=useState(()=>read('rw-players-1',defaultProfiles()))
 const [session,setSession]=useState(null),[room,setRoom]=useState(null),[profiles,setProfiles]=useState([])
 const [roomId,setRoomId]=useState(params.get('room')||null),[invite,setInvite]=useState(params.get('invite')||null)
 const [online,setOnline]=useState(false),[peers,setPeers]=useState(0),[notice,setNotice]=useState(null),[roomOpen,setRoomOpen]=useState(false)
 const [target,setTarget]=useState({side:'blue',lane:'slayer',ban:false}),[filter,setFilter]=useState('slayer'),[search,setSearch]=useState(''),[focus,setFocus]=useState(null),[preview,setPreview]=useState(null)
 const [editSlot,setEditSlot]=useState(1),[motion,setMotion]=useState(()=>read('rw-motion',true))
 const [pending,setPending]=useState(false),[ai,setAi]=useState(null),[aiBusy,setAiBusy]=useState(false)
 const [sheetOpen,setSheetOpen]=useState(false),[sheetStage,setSheetStage]=useState('catalog'),[bannerVisible,setBannerVisible]=useState(true)
 const [intelHero,setIntelHero]=useState(null)
 const [sort,setSort]=useState('ban'),[metaInput,setMetaInput]=useState(false),[metaBusy,setMetaBusy]=useState(false)
 const catalogHeading=useRef(null),banner=useRef(null),pickerTrigger=useRef(null),authDialog=useRef(null),busy=useRef(false),roomRef=useRef(null),aiRequest=useRef(0)
 const tell=(message,error=false)=>setNotice({message,error,id:Date.now()})
 const state=room?.state??practice
 const players=room?profiles:practicePlayers
 const coach=!room||room.owner_id===session?.user.id
 const heroes=useMemo(()=>withMeta(allHeroes,state.meta),[state.meta])
 const byId=useMemo(()=>new globalThis.Map(heroes.map(h=>[h.id,h])),[heroes])
 const currentPick=!target.ban?state[target.side]?.[target.lane]:null
 const selected=preview||focus||currentPick||null
 const previewState=useMemo(()=>{
   if(!preview||target.ban||!coach)return state
   if(occupied(state,preview,target))return state
   return selectHero(state,target,preview)
 },[state,preview,target,coach])
 const perspective=target.ban||(!preview&&focus&&focus!==currentPick)?undefined:target.side
 const analysis=useMemo(()=>analyze(previewState,selected,heroes,perspective),[previewState,selected,heroes,perspective])
 const stamp=state.meta||SOURCE
 const slotPlayer=target.side==='blue'&&!target.ban?players.find(p=>p.lane===target.lane):null
 const unavailable=preview&&occupied(state,preview,target.ban?null:target)
 const samePick=preview&&preview===currentPick
 const bansFull=target.ban&&state.bans[target.side].length>=6
 const confirmLabel=target.ban?'ยืนยันแบน':'ยืนยันเลือก'
 const blocked=unavailable?'ฮีโร่นี้ถูกเลือกหรือแบนในดราฟต์แล้ว':samePick?'ฮีโร่นี้อยู่ในช่องนี้แล้ว':bansFull?'ช่องแบนของฝั่งนี้เต็มแล้ว':null
 const sorted=useMemo(()=>heroes.filter(h=>h[sort]!=null).slice().sort((a,b)=>b[sort]-a[sort]),[heroes,sort])
 useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(null),5400);return()=>clearTimeout(id)},[notice])
 useEffect(()=>{if(!db)return;let mounted=true;db.auth.getSession().then(({data})=>{if(mounted)setSession(data.session)});const {data}=db.auth.onAuthStateChange((_,s)=>setSession(s));return()=>{mounted=false;data.subscription.unsubscribe()}},[])
 function setFreshRoom(next){if(!roomRef.current||roomRef.current.id!==next.id||next.revision>=roomRef.current.revision){roomRef.current=next;setRoom(next)}}
 async function load(id){const d=await fetchRoom(id);setFreshRoom(d.room);setProfiles(d.profiles);return d}
 useEffect(()=>{
    if(!db||!session||!roomId||invite)return
    let current=true
    load(roomId).catch(()=>{if(current)tell('เปิดห้องไม่ได้ โปรดตรวจว่าลงชื่อเข้าใช้บัญชีที่ได้รับเชิญ',true)})
    const reload=()=>{if(current)load(roomId).catch(()=>{if(current)setOnline(false)})}
    const channel=db.channel('war-room-'+roomId,{config:{presence:{key:session.user.id}}})
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'war_rooms',filter:'id=eq.'+roomId},reload)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'war_profiles',filter:'room_id=eq.'+roomId},reload)
      .on('presence',{event:'sync'},()=>{if(current)setPeers(Object.keys(channel.presenceState()).length)})
      .subscribe(status=>{
        if(!current)return
        setOnline(status==='SUBSCRIBED')
        if(status==='SUBSCRIBED'){reload();channel.track({at:new Date().toISOString()})}
      })
    const poll=setInterval(reload,12000)
    return()=>{current=false;clearInterval(poll);db.removeChannel(channel);setPeers(0)}
  },[roomId,session?.user.id,invite])
 useEffect(()=>{if(!session||!invite||!db)return;setRoomOpen(true)},[session,invite])
 useEffect(()=>{if(roomOpen&&!authDialog.current?.open)authDialog.current?.showModal();if(!roomOpen&&authDialog.current?.open)authDialog.current.close()},[roomOpen])
 useEffect(()=>{aiRequest.current++;setAi(null);setAiBusy(false)},[selected,state.blue,state.red,state.bans,state.meta])
 useEffect(()=>{
   const query=window.matchMedia('(max-width: 900px)')
   const resize=()=>{if(!query.matches)setSheetOpen(false)}
   query.addEventListener('change',resize)
   return()=>query.removeEventListener('change',resize)
 },[])
 useEffect(()=>{
   if(!banner.current||!('IntersectionObserver' in window))return
   let seen=true
   const update=()=>setBannerVisible(seen&&!document.hidden)
   const observer=new IntersectionObserver(([entry])=>{seen=entry.isIntersecting;update()})
   observer.observe(banner.current)
   document.addEventListener('visibilitychange',update)
   return()=>{observer.disconnect();document.removeEventListener('visibilitychange',update)}
 },[])
 async function apply(fn){
   if(busy.current)return false
   try{
    if(!room){const next=fn(practice);store('rw-state-1',next);setPractice(next);return true}
    if(!coach)throw new Error('ให้โค้ชเป็นผู้แก้ไขดราฟต์และจับเวลา')
    busy.current=true;setPending(true)
    const base=roomRef.current, next=fn(base.state)
    const updated=await rpc('war_save_state',{p_room:base.id,p_state:next,p_revision:base.revision})
    setFreshRoom(updated)
    return true
   }catch(e){if(e.code==='40001'){await load(room.id).catch(()=>{});tell('ดราฟต์เปลี่ยนจากอีกเครื่องแล้ว ลองทำรายการเดิมอีกครั้ง',true)}else tell(e.message||'บันทึกไม่สำเร็จ',true);return false}
   finally{busy.current=false;setPending(false)}
 }
 function closePicker(restore=true){
   setSheetOpen(false)
   if(restore&&pickerTrigger.current){const trigger=pickerTrigger.current;requestAnimationFrame(()=>trigger.focus({preventScroll:true}))}
 }
 function openPicker(trigger){
   pickerTrigger.current=trigger
   if(window.matchMedia('(max-width: 900px)').matches){setSheetStage('catalog');setSheetOpen(true)}
   else catalogHeading.current?.focus({preventScroll:true})
 }
 function previewHero(id){setPreview(id);if(sheetOpen)setSheetStage('review')}
 async function confirmPick(){
   if(!preview||!coach||blocked||pending)return
   const id=preview
   if(await apply(s=>selectHero(s,target,id))){
     setFocus(id);setPreview(null);setSearch('')
     if(sheetOpen)closePicker()
     else catalogHeading.current?.focus({preventScroll:true})
     tell((target.ban?'แบน ':'ล็อก ')+display(byId.get(id))+' · '+targetName(target))
   }
 }
 function chooseSlot(side,lane,trigger){
   setTarget({side,lane,ban:false});setFocus(state[side][lane]||null);setPreview(null);setFilter(lane);setSearch('')
   if(coach)openPicker(trigger)
   else if(state[side][lane]&&window.matchMedia('(max-width: 900px)').matches){pickerTrigger.current=trigger;setSheetStage('review');setSheetOpen(true)}
 }
 function clearSlot(side,lane){
   const id=state[side][lane]
   if(focus===id)setFocus(null)
   apply(s=>{const sidePicks={...s[side]};delete sidePicks[lane];return {...s,[side]:sidePicks}})
 }
 function startBan(side,trigger){
   setTarget({side,ban:true,lane:null});setPreview(null);setFocus(null);setFilter('all');setSearch('');openPicker(trigger)
 }
 function unban(side,id){
   if(focus===id)setFocus(null)
   apply(s=>({...s,bans:{...s.bans,[side]:s.bans[side].filter(x=>x!==id)}}))
 }
 async function demo(){
   if(!window.confirm('โหลดดราฟต์ตัวอย่างทับตัวเลือกและแบนปัจจุบันหรือไม่?'))return
   if(await apply(s=>({...s,blue:{slayer:'florentino',jungle:'nakroth',mid:'yue',dragon:'hayate',roam:'annette'},red:{slayer:'omen',jungle:'aoi',mid:'aleister',dragon:'capheny',roam:'thane'},bans:{blue:['arum','zip'],red:['zata','tamyn']}}))){setFocus('hayate');setPreview(null);setTarget({side:'blue',lane:'dragon',ban:false});setFilter('dragon');setSearch('')}
 }
 async function saveProfile(payload){
   try{
    if(room){await rpc('war_save_profile',{p_room:room.id,p_slot:payload.slot,p_name:payload.name,p_lane:payload.lane,p_pool:payload.pool});await load(room.id)}
    else {const next=practicePlayers.map(p=>p.slot===payload.slot?payload:p);store('rw-players-1',next);setPracticePlayers(next)}
    tell('บันทึกโปรไฟล์แล้ว')
   }catch(e){tell(e.message,true)}
 }
 async function copyLink(url){
   try{await navigator.clipboard.writeText(url);tell('คัดลอกลิงก์แล้ว')}catch{tell('คัดลอกอัตโนมัติไม่ได้ ใช้ลิงก์ที่แสดงด้านล่าง',true)}
 }
 async function createInvite(slot){
   const token=await rpc('war_issue_invite',{p_room:room.id,p_slot:slot})
   const url=new URL(homeUrl());url.searchParams.set('invite',token);return url.href
 }
 async function emailLogin(email){
   const redirect=new URL(homeUrl())
   if(invite)redirect.searchParams.set('invite',invite)
   else if(roomId)redirect.searchParams.set('room',roomId)
   const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:redirect.href}})
   if(error)throw error
   tell('ส่งลิงก์ลงชื่อเข้าใช้แล้ว ตรวจอีเมลของคุณ')
 }
 function setRoomAddress(id){
   const u=new URL(homeUrl());u.searchParams.set('room',id);history.replaceState({},'',u);setRoomId(id);setInvite(null)
 }
 async function makeRoom(name){
   const id=await rpc('war_create_room',{p_name:name})
   await load(id);setRoomAddress(id);setRoomOpen(false);tell('สร้างห้องแล้ว เปิดแท็บผู้เล่นเพื่อเชิญทีม')
 }
 async function joinRoom(){
   const id=await rpc('war_accept_invite',{p_token:invite})
   await load(id);setRoomAddress(id);setRoomOpen(false);setPage('team');tell('เข้าห้องแล้ว เลือกฮีโร่ถนัดในโปรไฟล์ของคุณ')
 }
 async function refreshMeta(){
   setMetaBusy(true)
   try{
    const res=await fetch('/api/meta')
    const payload=await res.json()
    if(!res.ok)throw new Error(payload.error||'ดึงข้อมูลใหม่ไม่สำเร็จ')
    const meta=parseMeta(JSON.stringify(payload),allHeroes)
    if(meta.date<stamp.date){tell('แหล่งนี้มีข้อมูลเก่ากว่าชุดที่ใช้อยู่');return}
    if(meta.date===stamp.date&&meta.url===stamp.url){tell('ยังไม่มีสถิติชุดใหม่จากแหล่งนี้');return}
    if(await apply(s=>({...s,meta})))tell('อัปเดตสถิติแล้ว · '+asDate(meta.date))
   }catch(e){tell(e instanceof SyntaxError?'ปุ่มดึงสถิติใช้บน Vercel หรือ vercel dev และยังนำเข้า JSON ได้':e.message,true)}
   finally{setMetaBusy(false)}
 }
 async function requestAi(){
   if(!room||!session){tell('ต้องเข้าห้องออนไลน์ก่อนใช้ 9Router',true);return}
   const request=++aiRequest.current
   setAiBusy(true);setAi(null)
   try{
    const r=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({roomId:room.id,focus:selected})})
    const payload=await r.json()
    if(!r.ok)throw new Error(payload.error||'ติดต่อ 9Router ไม่สำเร็จ')
    if(request===aiRequest.current)setAi(payload.text)
   }catch(e){if(request===aiRequest.current)tell(e instanceof SyntaxError?'ยังไม่มี API 9Router ในสภาพแวดล้อมนี้':e.message,true)}finally{if(request===aiRequest.current)setAiBusy(false)}
 }
 const showIntel=id=>{if(byId.has(id))setIntelHero(id)}
 const intelGroups=useMemo(()=>intelHero?analyze(intelHero===selected?previewState:state,intelHero,heroes,intelHero===selected?perspective:undefined):null,[intelHero,selected,previewState,state,heroes,perspective])
 const catalogProps={heroes,state,target,coach,filter,setFilter,search,setSearch,focused:selected,player:slotPlayer,onPreview:previewHero,onIntel:showIntel,Portrait,display}
 const analysisProps={hero:byId.get(selected),groups:analysis,stamp,coach,pending,canConfirm:!!preview&&!blocked,blocked,confirmLabel:currentPick&&!samePick&&!target.ban?'ยืนยันเปลี่ยนตัว':confirmLabel,confirmed:!!selected&&!preview&&occupied(state,selected),preview,ai,aiBusy,room,onIntel:showIntel,onConfirm:confirmPick,onAi:requestAi,byId,Portrait,display,asDate}
 return <div className={'app'+(!motion?' reduce-motion':'')}>
   <header className="top"><div className="top-inner"><a className="wordmark" href={homeUrl()}><span className="brand-icon"><Swords size={20}/></span><span>RoV <b>WAR ROOM</b></span></a><nav aria-label="หน้าหลัก">{tabs.map(([id,name,Icon])=><button key={id} type="button" aria-current={page===id?'page':undefined} onClick={()=>{if(id!==page){setSheetOpen(false);setPreview(null);setPage(id)}}}><Icon size={17}/>{name}</button>)}</nav><button className="btn room-button" onClick={()=>setRoomOpen(true)}><Link2 size={16}/><span>{room?'ห้องทีม':'ห้องออนไลน์'}</span></button></div></header>
   <main>
    <div ref={banner} className={'battle-banner'+(page==='draft'?' drafting':'')+(!bannerVisible?' motion-paused':'')}>
     <div className="banner-art" aria-hidden="true"/><div className="banner-light" aria-hidden="true"/><div className="banner-fog" aria-hidden="true"/><div className="banner-scrim" aria-hidden="true"/>
     <div className="banner-copy"><h1>{room?.name||'ห้องวางแผนทีม RoV'}</h1><p>จัดดราฟต์ทั้งสองฝั่ง เลือกตัวที่ทีมถนัด และนัดจังหวะชิงเป้าหมาย</p><div className="banner-tags"><span><i className={room&&online?'connected':''}/>{room?(online?'ห้องทีม · ซิงก์สด':'ห้องทีม · ตรวจการเชื่อมต่อ'):'โหมดซ้อม · บันทึกในเครื่อง'}</span><a href={PATCH.url} rel="noreferrer" target="_blank">{PATCH.name}<ArrowUpRight size={13}/></a></div></div>
     <button className="motion btn icon" aria-label="ลดการเคลื่อนไหว" title={motion?'ลดการเคลื่อนไหว':'เปิดการเคลื่อนไหว'} aria-pressed={!motion} onClick={()=>{setMotion(!motion);store('rw-motion',!motion)}}><Wind size={19}/></button>
    </div>
    {page==='draft'&&<>
      <div className="workspace draft-workspace">
       <DraftBoard state={state} players={players} byId={byId} target={target} coach={coach} pending={pending} onChoose={chooseSlot} onClear={clearSlot} onStartBan={startBan} onUnban={unban} onOpen={openPicker} onDemo={demo} onPatch={apply} Portrait={Portrait} display={display}/>
       <HeroCatalog {...catalogProps} headingRef={catalogHeading}/>
       <DraftAnalysis {...analysisProps}/>
      </div>
      <HeroSheet open={sheetOpen} stage={sheetStage} context={targetName(target)} side={target.side} onClose={()=>closePicker()} onBack={()=>setSheetStage('catalog')} renderCatalog={()=> <HeroCatalog {...catalogProps} compact/>} renderAnalysis={headingRef=> <DraftAnalysis {...analysisProps} compact headingRef={headingRef}/>}/>
    </>}
    {page==='counter'&&<CounterPick heroes={heroes} state={state} byId={byId} Portrait={Portrait} display={display} onIntel={showIntel} stamp={stamp} asDate={asDate} room={room} online={online} peers={peers} profiles={profiles}/>}
    {page==='team'&&<Team players={players} heroes={heroes} byId={byId} save={saveProfile} coach={coach} session={session} room={room} slot={editSlot} setSlot={setEditSlot} makeInvite={createInvite} copy={copyLink} tell={tell}/>}
    {page==='map'&&<BattleMap state={state} apply={apply} coach={coach&&!pending}/>}
    {page==='meta'&&<section className="panel meta-panel">
       <header className="section-head"><div><h2><ChartNoAxesCombined/> เมต้าแรงก์ไทย</h2><p><a href={stamp.url} rel="noreferrer" target="_blank">{stamp.name}</a> · สถิติ ณ {asDate(stamp.date)} · ไม่ใช่ข้อมูลสด</p></div>{coach&&<div className="meta-actions"><button className="btn" disabled={metaBusy||pending} onClick={refreshMeta}>{metaBusy?'กำลังดึง…':'ตรวจสถิติใหม่'}</button><button className="btn" onClick={()=>setMetaInput(!metaInput)}>{metaInput?'ปิดการนำเข้า':'นำเข้าสถิติ JSON'}</button></div>}</header>
       <div className="patch-notes"><div><b>แพตช์อ้างอิง</b><a href={PATCH.url} target="_blank" rel="noreferrer">{PATCH.name} <ArrowUpRight size={15}/></a></div><div><b>ประกาศล่วงหน้า</b><a href={UPCOMING.url} target="_blank" rel="noreferrer">{UPCOMING.name} <ArrowUpRight size={15}/></a></div><div><b>สถิติคนละช่วงกับแพตช์</b><span>อัตราชนะไม่บอกผลของ Hotfix โดยตรง</span></div></div>
       {metaInput&&<form className="import-form" onSubmit={async e=>{e.preventDefault();const input=new FormData(e.currentTarget).get('data');try{const meta=parseMeta(input,allHeroes);if(await apply(s=>({...s,meta})))tell('นำเข้าสถิติใหม่แล้ว')}catch(err){tell(err.message,true)}}}><label>ข้อมูล JSON<textarea name="data" maxLength="32000" rows="5" required placeholder={'{"date":"2026-10-19","url":"https://example.com/meta","stats":[{"id":"yue","win":49.33,"pick":14.01,"ban":61.12}]}'}/></label><div className="row-actions"><button className="btn primary" disabled={pending}>นำเข้า</button>{state.meta&&<button type="button" className="btn" onClick={()=>apply(s=>({...s,meta:null}))}>กลับชุดตั้งต้น</button>}<a download="rov-meta-2026-10-19.json" href={'data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify({...SOURCE,stats:allHeroes.filter(h=>h.ban!=null).map(({id,win,pick,ban})=>({id,win,pick,ban}))},null,2))}>โหลดไฟล์ตัวอย่าง</a></div></form>}
       <div className="table-wrap"><table><thead><tr><th scope="col">ฮีโร่</th><th scope="col">เลน</th>{[['win','ชนะ'],['pick','เลือก'],['ban','แบน']].map(([id,t])=><th scope="col" key={id} aria-sort={sort===id?'descending':'none'}><button onClick={()=>setSort(id)}>{t} {sort===id&&<ArrowDown size={13}/>}</button></th>)}</tr></thead><tbody>{sorted.map(h=><tr key={h.id}><td><button className="table-hero" onClick={()=>{setPreview(null);setFocus(h.id);setPage('draft');if(window.matchMedia('(max-width: 900px)').matches){pickerTrigger.current=null;setSheetStage('review');setSheetOpen(true)}}}><Portrait hero={h} size="sm"/>{display(h)}</button></td><td>{LANES.find(l=>l.id===h.lane).label}</td>{['win','pick','ban'].map(k=><td key={k}>{h[k]!=null?h[k].toFixed(2)+'%':'—'}</td>)}</tr>)}</tbody></table></div>
    </section>}
    <footer><span>RoV War Room · เครื่องมือวางแผนทีม ไม่ใช่บริการทางการของ Garena</span><a href="https://www.rov.in.th/patch-notes/beta55" rel="noreferrer" target="_blank">ภาพและแพตช์อ้างอิง <ArrowUpRight size={13}/></a></footer>
   </main>
   <HeroIntel hero={byId.get(intelHero)} onClose={()=>setIntelHero(null)} onBrowse={showIntel} heroes={heroes} groups={intelGroups} stamp={stamp} byId={byId} Portrait={Portrait} display={display} asDate={asDate} enemy={Object.values(state.red).filter(Boolean)}/>
   {notice&&<div className={'toast '+(notice.error?'error':'')} role={notice.error?'alert':'status'}>{notice.error?<Activity size={18}/>:<Check size={18}/>}<span>{notice.message}</span><button className="btn icon" onClick={()=>setNotice(null)} aria-label="ปิดข้อความ"><X size={15}/></button></div>}
   <dialog ref={authDialog} onClose={()=>setRoomOpen(false)} onClick={e=>{if(e.target===e.currentTarget)setRoomOpen(false)}}><RoomModal close={()=>setRoomOpen(false)} session={session} db={db} room={room} invite={invite} copy={copyLink} login={emailLogin} create={makeRoom} join={joinRoom} tell={tell} signOut={async()=>{const {error}=await db.auth.signOut();if(error){tell(error.message,true);return}setRoom(null);setProfiles([]);setRoomId(null);setInvite(null);setOnline(false);roomRef.current=null;history.replaceState({},'',homeUrl());tell('ออกจากห้องออนไลน์แล้ว')}}/></dialog>
 </div>
}
function Team({players,heroes,byId,save,coach,session,room,slot,setSlot,makeInvite,copy,tell}){
 const p=players.find(x=>x.slot===slot)
 return <section className="panel team-panel"><header className="section-head"><div><h2><Users/> โปรไฟล์ผู้เล่น</h2><p>จัดตำแหน่งผู้เล่น 5 คน และให้แต่ละคนเลือกฮีโร่ที่มั่นใจ</p></div><span className="draft-count">{players.filter(x=>x.name).length}/5</span></header>
   <div className="team-layout"><div className="player-list">{players.map(p=>{const lane=LANES.find(l=>l.id===p.lane);const Icon=ICONS[p.lane];return <button key={p.slot} className={'player-tab '+(slot===p.slot?'selected':'')} aria-pressed={slot===p.slot} onClick={()=>setSlot(p.slot)}><span className="player-icon"><Icon size={19}/></span><span><b>{p.name||'ผู้เล่น '+p.slot}</b><small>{lane.label} · {p.pool.length} ฮีโร่</small></span><ArrowRight size={16}/></button>})}</div>
   {p&&<Profile key={p.slot+':'+JSON.stringify(p)} p={p} coach={coach} canEdit={coach||p.member_id===session?.user.id} heroes={heroes} byId={byId} save={save} room={room} makeInvite={makeInvite} copy={copy} tell={tell}/>}
   </div>
 </section>
}
function Profile({p,coach,canEdit,heroes,byId,save,room,makeInvite,copy,tell}){
 const [name,setName]=useState(p.name),[lane,setLane]=useState(p.lane),[pool,setPool]=useState(p.pool),[hero,setHero]=useState('')
 const [link,setLink]=useState(''),[busy,setBusy]=useState(false),[inviteBusy,setInviteBusy]=useState(false)
 const opts=heroes.slice().sort((a,b)=>a.name.localeCompare(b.name)).filter(h=>!pool.includes(h.id))
 return <div className="profile">
  <h3>{p.name||'ผู้เล่น '+p.slot}</h3>
  {!canEdit&&<p>โปรไฟล์นี้แก้ได้โดยเจ้าของช่องหรือโค้ช</p>}
  <form onSubmit={async e=>{e.preventDefault();setBusy(true);try{await save({...p,name:name.trim(),lane,pool})}finally{setBusy(false)}}}>
   <div className="profile-fields"><label>ชื่อผู้เล่น<input disabled={!canEdit} placeholder="ชื่อที่ใช้เรียกในทีม" value={name} maxLength="32" onChange={e=>setName(e.target.value)}/></label><label>เลนหลัก<select value={lane} disabled={!canEdit} onChange={e=>setLane(e.target.value)}>{LANES.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select></label></div>
   <div className="pool"><b>ฮีโร่ถนัด</b><p>เพิ่มได้สูงสุด 20 รายการ เลือกข้ามเลนได้</p><div className="pool-tokens">{pool.map(id=><span className="pool-token" key={id}><Portrait hero={byId.get(id)} size="sm"/>{display(byId.get(id))}{canEdit&&<button type="button" className="btn icon" aria-label={'เอา '+display(byId.get(id))+' ออกจากฮีโร่ถนัด'} onClick={()=>setPool(pool.filter(i=>i!==id))}><X size={14}/></button>}</span>)}</div>
   {canEdit&&<div className="pick-pool"><label><span className="sr">เลือกฮีโร่ถนัด</span><select value={hero} onChange={e=>setHero(e.target.value)}><option value="">เลือกฮีโร่ถนัด</option>{opts.map(h=><option key={h.id} value={h.id}>{display(h)} · {LANES.find(l=>l.id===h.lane).label}</option>)}</select></label><button type="button" className="btn" disabled={!hero||pool.length>=20} onClick={()=>{setPool([...pool,hero]);setHero('')}}><Plus size={16}/> เพิ่ม</button></div>}</div>
   {canEdit&&<button className="btn primary" disabled={busy}>{busy?'กำลังบันทึก…':'บันทึกโปรไฟล์'}</button>}
  </form>
  {coach&&room&&<div className="invites"><h4>เชิญเข้าช่องผู้เล่น</h4>{p.member_id?<p>ผู้เล่นรับสิทธิ์ช่องนี้แล้ว</p>:<><p>ลิงก์ใช้ครั้งเดียวและหมดอายุใน 7 วัน ส่งให้ผู้เล่นช่องนี้โดยตรง</p><button className="btn" disabled={inviteBusy} onClick={async()=>{setInviteBusy(true);try{const url=await makeInvite(p.slot);setLink(url);await copy(url)}catch(e){tell(e.message,true)}finally{setInviteBusy(false)}}}><Link2 size={16}/>{inviteBusy?'กำลังสร้าง…':'สร้างและคัดลอกลิงก์เชิญ'}</button>{link&&<input aria-label="ลิงก์เชิญ" readOnly value={link} onFocus={e=>e.target.select()}/>}</>}</div>}
 </div>
}
function RoomModal({close,session,db,room,invite,copy,login,create,join,tell,signOut}){
 const [email,setEmail]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false)
 const act=fn=>async e=>{e.preventDefault();setBusy(true);try{await fn()}catch(err){tell(err.message,true)}finally{setBusy(false)}}
 return <div className="dialog-body"><header className="section-head"><div><h2><Link2/> ห้องออนไลน์</h2><p>ห้องส่วนตัวสำหรับโค้ชและผู้เล่นที่ได้รับเชิญ</p></div><button className="btn icon" type="button" aria-label="ปิดห้องออนไลน์" onClick={close}><X size={18}/></button></header>
 {!db?<div className="dialog-state"><p>เว็บนี้อยู่ในโหมดซ้อม ข้อมูลบันทึกในเบราว์เซอร์นี้เท่านั้น</p><p>เมื่อเชื่อม Supabase แล้วจะสร้างห้อง แชร์ดราฟต์และเวลา และเชิญผู้เล่นแต่ละช่องได้</p><button className="btn primary" onClick={close}>กลับไปซ้อม</button></div>:!session?<form onSubmit={act(()=>login(email))}><label>อีเมลสำหรับลงชื่อเข้าใช้<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></label><button className="btn primary" disabled={busy}>{busy?'กำลังส่ง…':'ส่งลิงก์เข้าใช้'}</button></form>:invite?<form onSubmit={act(join)}><p>รับคำเชิญด้วยบัญชี {session.user.email}</p><button className="btn primary" disabled={busy}>รับคำเชิญเข้าทีม</button></form>:room?<div className="dialog-state"><p>{room.name} · {session.user.email}</p><p>โค้ชสร้างลิงก์เชิญรายคนได้ที่แท็บผู้เล่น</p><button className="btn" onClick={()=>copy(location.href)}>คัดลอกลิงก์ห้อง</button><button className="btn" onClick={signOut}>ออกจากบัญชี</button></div>:<form onSubmit={act(()=>create(name))}><label>ชื่อห้อง<input value={name} onChange={e=>setName(e.target.value)} maxLength="50" required placeholder="ชื่อทีม / ชื่อแมตช์"/></label><button className="btn primary" disabled={busy}>สร้างห้องทีม</button><button type="button" className="btn" onClick={signOut}>ออกจากบัญชี</button></form>}
 </div>
}
createRoot(document.getElementById('root')).render(<App/>)
