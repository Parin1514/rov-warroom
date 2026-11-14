import React,{useEffect,useRef} from 'react'
import {Activity,ArrowLeft,BookOpen,Check,ChevronDown,CircleSlash2,Crosshair,Flame,LockKeyhole,Plus,Search,Shield,Sparkles,Star,Swords,Waves,X} from 'lucide-react'
import {LANES,SIDES,occupied} from './domain.mjs'
const ICONS={slayer:Shield,jungle:Flame,mid:Sparkles,dragon:Crosshair,roam:Waves}
const laneName=id=>LANES.find(l=>l.id===id)?.label
const GROUPS=[
 {id:'pair',label:'เข้าคู่กับใคร',empty:'ยังไม่มีคู่เล่นที่แนะนำในดราฟต์นี้'},
 {id:'risk',label:'ต้องระวังใคร',empty:'ยังไม่พบคู่แข่งที่ตรงกับเงื่อนไขเตือนของฮีโร่นี้'},
 {id:'ban',label:'ตัวไหนยังแบนได้',empty:'ยังไม่มีตัวแก้ทางที่แนะนำให้แบนในดราฟต์นี้'},
 {id:'meta',label:'แบนบ่อยในแรงก์',empty:'ยังไม่มีสถิติอัตราแบนสำหรับตัวที่เหลือ'}
]
export const targetName=target=>target.ban?SIDES[target.side]+' · แบน':SIDES[target.side]+' · '+laneName(target.lane)
export function DraftBoard({state,players,byId,target,coach,pending,onChoose,onClear,onStartBan,onUnban,onOpen,onDemo,onPatch,Portrait,display}){
 const locked=side=>Object.keys(state[side]).length
 return <section className="panel draft-panel">
   <header className="section-head"><div><h2><Swords/> กระดานดราฟต์</h2><p>{coach?'กดช่องของฝั่งที่ต้องการจัดตัว':'กดฮีโร่ที่ล็อกแล้วเพื่อดูคำแนะนำ'}</p></div></header>
   <div className="board">
    {['blue','red'].map(side=><div className={'side '+side} key={side}>
     <div className="side-title"><span><span className="team-marker"/>{SIDES[side]}</span><small>{locked(side)}/5</small></div>
     {LANES.map(l=>{
       const id=state[side][l.id], hero=byId.get(id), Icon=ICONS[l.id]
       const active=!target.ban&&target.side===side&&target.lane===l.id
       const player=side==='blue'?players.find(p=>p.lane===l.id)?.name:state.opponents[l.id]
       return <div className={'slot '+(active?'active':'')} key={l.id}>
        <button type="button" className="slot-pick esport-hover" aria-label={SIDES[side]+' '+l.label+(hero?' '+display(hero):' เลือกฮีโร่')} aria-pressed={active} onClick={e=>onChoose(side,l.id,e.currentTarget)}>
         <span key={id||'empty'} className={hero?'slot-arrival':''}><Portrait hero={hero}/></span>
         <span className="slot-text"><strong>{hero?display(hero):l.label}</strong><small>{hero?l.label+(player?' · '+player:''):player||l.en}</small></span><Icon size={14} className="slot-role"/>
        </button>
        {hero&&coach&&<button className="slot-clear" disabled={pending} aria-label={'ลบ '+display(hero)+' '+SIDES[side]} onClick={()=>onClear(side,l.id)}><X size={15}/></button>}
       </div>
     })}
     <div className="ban-line"><span><CircleSlash2 size={15}/> แบน</span>
      {state.bans[side].map(id=><button key={id} className="ban-token ban-arrival" title={display(byId.get(id))} aria-label={(coach?'ยกเลิกแบน ':'')+display(byId.get(id))} disabled={!coach||pending} onClick={()=>onUnban(side,id)}><Portrait hero={byId.get(id)} size="sm"/></button>)}
      {coach&&<button className={'btn icon '+(target.ban&&target.side===side?'selected':'')} title={'เพิ่มแบน '+SIDES[side]} aria-label={'เพิ่มแบน '+SIDES[side]} disabled={pending||state.bans[side].length>=6} onClick={e=>onStartBan(side,e.currentTarget)}><Plus size={16}/></button>}
     </div>
    </div>)}
   </div>
   <div className="draft-board-actions">
    <button type="button" className="btn open-picker" onClick={e=>onOpen(e.currentTarget)}><Search size={15}/> เปิดคลังฮีโร่</button>
    {coach&&<button className="btn" disabled={pending} onClick={onDemo}>ลองดราฟต์ตัวอย่าง</button>}
   </div>
   <details className="opponent-details"><summary>ชื่อคู่แข่งและบันทึกทีม <ChevronDown size={15}/></summary>
    <div className="opponents-grid">{LANES.map(l=><label key={l.id}>{l.label}<input disabled={!coach} maxLength="32" defaultValue={state.opponents[l.id]||''} key={state.opponents[l.id]||''} onBlur={e=>{const v=e.target.value.trim();if(v!==(state.opponents[l.id]||''))onPatch(s=>({...s,opponents:{...s.opponents,[l.id]:v}}))}} placeholder="ชื่อคู่แข่ง"/></label>)}</div>
    <label>โน้ตแผนทีม<textarea disabled={!coach} maxLength="1500" key={state.notes} defaultValue={state.notes} onBlur={e=>{if(e.target.value!==state.notes){const notes=e.target.value;onPatch(s=>({...s,notes}))}}} placeholder="เช่น เก็บสกิลโรมไว้กัน Aoi ก่อนเข้าบ่อมังกร"/></label>
   </details>
 </section>
}
export function HeroCatalog({heroes,state,target,coach,filter,setFilter,search,setSearch,focused,player,onPreview,onIntel,Portrait,display,headingRef,inputRef,compact=false}){
 const pool=player?.pool||[]
 const poolSet=new Set(pool)
 const q=search.trim().toLowerCase()
 const match=h=>!q||display(h).toLowerCase().includes(q)
 const comfort=heroes.filter(h=>poolSet.has(h.id)&&match(h))
 const rest=heroes.filter(h=>!poolSet.has(h.id)&&(filter==='all'||h.lane===filter)&&match(h))
 const context=targetName(target)
 const laneHeading=filter==='all'?'ฮีโร่ทุกเลน':filter==='jungle'?'ฮีโร่ป่า':filter==='roam'?'ฮีโร่โรม':'ฮีโร่เลน'+laneName(filter)
 const inputId=compact?'sheet-hero-search':'hero-search'
 function tiles(list){
  return <div className="catalog-grid">{list.map(h=>{
   const unavailable=occupied(state,h.id,target.ban?null:target)
   const current=!target.ban&&state[target.side][target.lane]===h.id
   return <div key={h.id} className="hero-entry"><button type="button" aria-label={'ฮีโร่ '+display(h)} aria-pressed={focused===h.id} className={'hero-tile esport-hover '+(focused===h.id?'selected ':'')+(unavailable?'taken':'')} title={unavailable?'ดูข้อมูลได้ แต่ฮีโร่ถูกเลือกหรือแบนแล้ว':display(h)} onClick={()=>onPreview(h.id)}>
    <Portrait hero={h}/><span><strong>{display(h)}</strong><small>{unavailable?'ไม่ว่างในดราฟต์':current?'อยู่ในช่องนี้':laneName(h.lane)}</small></span>{unavailable&&<LockKeyhole className="hero-lock" size={12}/>}
   </button><button className="hero-intel-link" type="button" onClick={()=>onIntel(h.id)} aria-label={'รายละเอียด '+display(h)} title={'รายละเอียด '+display(h)}><BookOpen size={14}/></button></div>
  })}</div>
 }
 return <section className={compact?'picker-catalog':'panel catalog-panel'} aria-label="คลังฮีโร่">
   {!compact&&<header className="section-head"><div><h2 tabIndex="-1" ref={headingRef}>คลังฮีโร่</h2><p>{heroes.length} รายการ · กดดูคำแนะนำก่อนล็อก</p></div></header>}
   {!compact&&<div className={'draft-target '+target.side}><span>{coach?'กำลังจัดดราฟต์':'กำลังดูดราฟต์'}</span><b>{context}</b></div>}
   <label htmlFor={inputId} className="search catalog-search"><Search size={17}/><span className="sr">ค้นหาฮีโร่</span><input id={inputId} ref={inputRef} type="search" autoComplete="off" value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหาชื่อฮีโร่"/></label>
   <div className="filters catalog-filters" role="group" aria-label="กรองเลน">
    {[...LANES.map(l=>[l.id,l.label]),['all','ดูทุกเลน']].map(([id,title])=><button key={id} type="button" className={'chip '+(id===filter?'selected':'')} aria-pressed={id===filter} onClick={()=>setFilter(id)}>{title}</button>)}
   </div>
   <div className="catalog-scroll">
    {player&&<div className="hero-group comfort-group">
     <h3><Star size={14}/> ตัวถนัด{player.name?'ของ '+player.name:''}</h3>
     {comfort.length?tiles(comfort):<p className="group-empty">{pool.length?'ไม่พบตัวถนัดที่ตรงกับคำค้น':'ยังไม่มีฮีโร่ถนัด เพิ่มได้ที่แท็บผู้เล่น'}</p>}
    </div>}
    <div className="hero-group"><h3>{laneHeading} <span>{rest.length}</span></h3>
     {rest.length?tiles(rest):<p className="group-empty">ไม่พบฮีโร่ในรายการนี้ ลองเปลี่ยนคำค้นหรือกดดูทุกเลน</p>}
    </div>
   </div>
 </section>
}
export function DraftAnalysis({hero,groups,stamp,coach,pending,canConfirm,blocked,confirmLabel,confirmed,preview,ai,aiBusy,room,onIntel,onConfirm,onAi,byId,Portrait,display,asDate,compact=false,headingRef}){
 const [group,setGroup]=React.useState('all')
 const rows=id=>groups.rules.filter(r=>r.kind===id)
 const emptyText=!hero?'เลือกฮีโร่จากคลังเพื่อดูคำแนะนำ':'ยังไม่มีคำแนะนำในหมวดนี้'
 return <section className={compact?'picker-analysis':'panel analysis-panel'} aria-label="วิเคราะห์ก่อนล็อก">
  {!compact&&<header className="section-head"><div><h2><Activity/> วิเคราะห์ก่อนล็อก</h2><p>ดูคู่เล่นและตัวแก้ทางก่อนยืนยัน</p></div></header>}
  {hero?<div className="focus-hero"><Portrait hero={hero} size="lg"/><div><b ref={headingRef} tabIndex={compact?-1:undefined}>{display(hero)}</b><small>{laneName(hero.lane)===hero.role?hero.role:laneName(hero.lane)+' · '+hero.role}</small></div>{confirmed&&<span className="locked-label"><Check size={13}/> อยู่ในดราฟต์</span>}</div>:<div className="analysis-empty"><Swords size={20}/><p>{emptyText}</p></div>}
  {hero&&<button className="btn intel-open esport-hover" onClick={()=>onIntel(hero.id)}><BookOpen size={16}/> รายละเอียดฮีโร่และบิลด์</button>}
  {coach&&preview&&<div className="confirm-box">
   <button className="btn primary" disabled={!canConfirm||pending} onClick={onConfirm}><LockKeyhole size={16}/>{pending?'กำลังบันทึก…':confirmLabel}</button>
   {blocked&&<p>{blocked}</p>}
  </div>}
  <div className="filters advice-filters" role="group" aria-label="กรองคำแนะนำ">
   {[['all','ภาพรวม'],['pair','คู่เล่น'],['risk','ระวัง'],['ban','ควรแบน']].map(([id,t])=><button className={'chip '+(group===id?'selected':'')} aria-pressed={group===id} key={id} onClick={()=>setGroup(id)}>{t}</button>)}
  </div>
  {groups.alerts.map(a=><p className="warning" key={a}>{a}</p>)}
  {(group==='all'?GROUPS.filter(x=>hero?(x.id!=='meta'||rows(x.id).length):rows(x.id).length):GROUPS.filter(x=>x.id===group)).map(({id,label,empty})=><div className={'advice-group '+id} key={id}>
    <h3>{label}</h3>
    {rows(id).length?rows(id).slice(0,group==='all'?(id==='risk'?3:2):12).map(({id:heroId,reason})=><div className="advice-row" key={heroId}><Portrait hero={byId.get(heroId)} size="sm"/><div><b>{display(byId.get(heroId))}</b><p>{reason}</p></div></div>):<p className="group-empty">{hero?empty:emptyText}</p>}
  </div>)}
  <p className="footnote">คู่เล่นและตัวแก้ทางเป็นคำแนะนำตามสกิลและบทบาท ส่วนอัตราแบนอิง <a href={stamp.url} rel="noreferrer" target="_blank">สถิติแรงก์ {asDate(stamp.date)}</a></p>
  {!compact&&(room?<button className="btn ai-button" disabled={aiBusy||!hero} onClick={onAi}><Sparkles size={16}/>{aiBusy?'กำลังวิเคราะห์…':'วิเคราะห์เพิ่มด้วย 9Router'}</button>:<small className="footnote">9Router ใช้ได้เมื่อเปิดห้องออนไลน์และตั้งค่าแล้ว</small>)}
  {ai&&<div className="ai-result"><b>ข้อเสนอจาก AI</b><p>{ai}</p></div>}
 </section>
}
export function HeroSheet({open,stage,context,side,onClose,onBack,renderCatalog,renderAnalysis}){
 const dialog=useRef(null),heading=useRef(null),body=useRef(null),close=useRef(null)
 useEffect(()=>{
   const d=dialog.current
   if(open&&!d.open)d.showModal()
   if(!open&&d.open)d.close()
 },[open])
 useEffect(()=>{
   if(!open)return
   if(body.current)body.current.scrollTop=0
   if(stage==='review')heading.current?.focus({preventScroll:true})
   else close.current?.focus({preventScroll:true})
 },[open,stage])
 return <dialog ref={dialog} className="hero-sheet" aria-labelledby="hero-sheet-heading" onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
   <div className="sheet-content">
    <header className="sheet-header">
     {stage==='review'&&<button className="btn icon" onClick={onBack} aria-label="กลับไปคลังฮีโร่"><ArrowLeft size={19}/></button>}
     <div><h2 id="hero-sheet-heading">{stage==='review'?'วิเคราะห์ก่อนล็อก':'คลังฮีโร่'}</h2><b className={'sheet-target '+side}>{context}</b></div>
     <button ref={close} className="btn icon" onClick={onClose} aria-label="ปิดหน้าต่างเลือกฮีโร่"><X size={19}/></button>
    </header>
    <div className="sheet-body" ref={body}>{open&&(stage==='review'?renderAnalysis(heading):renderCatalog())}</div>
   </div>
 </dialog>
}
