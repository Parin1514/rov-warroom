import {Clock3,Flame,Play,RotateCcw,Settings2,Target,Undo2,Waves} from 'lucide-react'
import React,{useEffect,useState} from 'react'
import {OBJECTIVES,objectiveCountdown,objectiveStatus,startObjective,timeLabel} from './domain.mjs'
export function BattleMap({state,apply,coach}){
 const [now,setNow]=useState(Date.now()),[settings,setSettings]=useState(false)
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(t)},[])
 const elapsed=state.startedAt?Math.max(0,Math.floor((now-state.startedAt)/1000)):0
 const phase=elapsed>=900
 const active=o=>o.id==='legend'?phase:!['slayer','dragon'].includes(o.id)||!phase
 const record=o=>apply(s=>startObjective(s,o.id))
 const leftFor=o=>objectiveCountdown(state.objectives[o.id],now)
 const durationFor=o=>state.durations[o.id]??o.seconds
 return <section className="panel map-panel">
   <header className="section-head"><div><h2><Target/> แผนที่เป้าหมาย</h2><p>โค้ชหรือผู้สังเกตการณ์กดบันทึกเมื่อเห็นมอนสเตอร์ถูกสังหาร</p></div><button className="btn" onClick={()=>setSettings(!settings)} aria-expanded={settings}><Settings2 size={17}/> ตั้งเวลา</button></header>
   <div className="map-layout">
    <div className="map-graphic">
      <svg viewBox="0 0 400 400" aria-hidden="true">
        <defs><pattern id="mapgrid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#2e3e4e" strokeWidth=".5"/></pattern></defs>
        <path d="M0 0h400v400H0z" fill="#121d29"/><path d="M0 0h400v400H0z" fill="url(#mapgrid)"/>
        <path d="M24 15l-10 50L332 385l54-10 10-47L72 4z" fill="#183749"/><path d="M43 37l318 323" stroke="#4c7d8e" strokeWidth="3" strokeDasharray="6 9"/>
        <path d="M58 342V58H342V342H58L342 58" fill="none" stroke="#34495a" strokeWidth="19" strokeLinejoin="round"/>
        <path d="M58 342V58H342V342H58L342 58" fill="none" stroke="#91a8ad" strokeOpacity=".68" strokeWidth="1.5" strokeDasharray="5 6"/>
        <path d="M92 295l39-29 9-35 45-18m28 0 42-25 9-45 37-37M98 108l-4 35 50 40m85 85 42 31 31 7" fill="none" stroke="#2c4c55" strokeWidth="13" strokeLinecap="round"/>
        <circle cx="58" cy="342" r="25" fill="#1d4661" stroke="#80c5f5" strokeWidth="2"/><circle cx="342" cy="58" r="25" fill="#572f3e" stroke="#ef9da0" strokeWidth="2"/>
        <text x="58" y="347" textAnchor="middle" fill="#d6efff" fontSize="10">BLUE</text><text x="342" y="63" textAnchor="middle" fill="#ffe2dd" fontSize="10">RED</text>
      </svg>
      {OBJECTIVES.filter(active).map(o=>{
       const left=leftFor(o), status=objectiveStatus(left)
       return <button key={o.id} className={'map-point '+o.type+' objective-'+status} data-objective-status={status} style={{left:o.x+'%',top:o.y+'%'}} type="button" onClick={()=>record(o)} disabled={!state.startedAt||!coach||!durationFor(o)||left>0} title={o.name+(status==='soon'?' · ใกล้เกิดใหม่':status==='ready'?' · ครบเวลาแล้ว':'')} aria-label={'บันทึก '+o.name}>{o.type==='major'?<Target size={19}/>:o.type==='blue'?<Waves size={17}/>:<Flame size={17}/>}</button>
      })}
      <span className="map-disclaimer">แผนผังอ้างอิง ไม่ใช่ภาพสดจากเกม</span>
    </div>
    <div>
     <div className="clock-strip"><div><span><Clock3 size={15}/> เวลาแมตช์</span><b>{timeLabel(elapsed)}</b></div>{state.startedAt?<button className="btn" disabled={!coach} onClick={()=>{if(window.confirm('รีเซ็ตเวลาแมตช์และรายการจับเวลาทั้งหมดหรือไม่?'))apply(s=>({...s,startedAt:null,objectives:{}}))}}><RotateCcw size={17}/> รีเซ็ต</button>:<button className="btn primary" disabled={!coach} onClick={()=>apply(s=>({...s,startedAt:Date.now(),objectives:{}}))}><Play size={17}/> เริ่มแมตช์</button>}</div>
     <div className="objective-list">{OBJECTIVES.map(o=>{
       const left=leftFor(o),duration=durationFor(o),status=active(o)?objectiveStatus(left):'idle'
       return <div className={'objective-row objective-'+status} key={o.id}><span className={'point-dot '+o.type}/><div><b>{o.name}</b><small>{!active(o)?(o.id==='legend'?'เริ่มใช้หลังนาที 15':'เปลี่ยนเป็นจุดตำนานหลังนาที 15'):status==='ready'?'ครบเวลาตามที่ตั้งไว้':status==='soon'?'ใกล้เกิดใหม่':duration?'เกิดใหม่ '+timeLabel(duration):'ยังไม่ได้ตั้งเวลาเกิดใหม่'}</small></div><strong>{left!=null&&active(o)?timeLabel(left):'—'}</strong>{left!==null&&active(o)?<button className="btn icon" aria-label={'ย้อน '+o.name} title="ย้อนรายการ" disabled={!coach} onClick={()=>apply(s=>{const objectives={...s.objectives};delete objectives[o.id];return {...s,objectives}})}><Undo2 size={16}/></button>:null}<button className="btn compact" disabled={!coach||!state.startedAt||!active(o)||!duration||left>0} onClick={()=>record(o)}>บันทึกฆ่า</button></div>
     })}</div>
    </div>
   </div>
   {settings&&<div className="time-settings"><h3>เวลาเกิดใหม่หลังถูกสังหาร (วินาที)</h3><p>มอนสเตอร์ตำนานตั้งต้น 180 วินาทีตาม Beta 55 สำหรับจุดอื่นให้ตรวจค่าจากโหมดและแพตช์ที่ใช้แล้วกรอกเอง</p><div className="timing-grid">{OBJECTIVES.map(o=><label key={o.id}>{o.name}<input type="number" min="1" max="1800" disabled={!coach} key={String(state.durations[o.id]??o.seconds)} defaultValue={state.durations[o.id]??o.seconds??''} onBlur={e=>{const val=e.target.value, n=Number(val);if(val&&(!Number.isInteger(n)||n<1||n>1800)){e.target.value=state.durations[o.id]??o.seconds??'';return} if((state.durations[o.id]??o.seconds??'')=== (val?n:''))return;apply(s=>{const durations={...s.durations};if(val)durations[o.id]=n;else delete durations[o.id];return {...s,durations}})}}/></label>)}</div><a href="https://www.rov.in.th/patch-notes/beta55" target="_blank" rel="noreferrer">อ้างอิงเวลาเกิดใหม่จาก Garena Beta 55</a></div>}
   <p className="footnote">นาฬิกาอ้างอิงจากจังหวะที่โค้ชกดและนาฬิกาอุปกรณ์ ไม่ได้ดึงข้อมูลจากเกม ใช้ระหว่างการแข่งขันเฉพาะเมื่อกติกาอนุญาต</p>
 </section>
}
