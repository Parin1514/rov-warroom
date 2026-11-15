import React,{useEffect,useMemo,useState} from 'react'
import {Crosshair,Search,ShieldQuestion,Sparkles,Swords,TrendingUp,Gem,Copy,Check,Users,Radio} from 'lucide-react'
import {LANES} from './domain.mjs'
import {counterScore,rank,verdict,answersTo,BANDS} from './matchup.mjs'
import {threatProfile,byName} from './items.mjs'
import {buildSets,setToText} from './sets.mjs'
import {playbook} from './playbook.mjs'
import heroTags from './hero-tags.json' with {type:'json'}

const laneLabel=id=>LANES.find(l=>l.id===id)?.label||id
const PHASES=[['early','ต้นเกม'],['mid','กลางเกม'],['late','ท้ายเกม'],['fight','ตอนไฟต์'],['avoid','ระวัง']]

// How-to-beat plan, one tab per enemy. Same function as the DB seed
// (scripts/build-guide-seed.mjs), so screen and table never disagree.
function Playbook({me,enemies,details,display,Portrait}){
 const [focus,setFocus]=useState(null)
 const target=enemies.find(e=>e.id===focus)||enemies[0]
 const plan=useMemo(()=>target?playbook(me,target,{details:details||{},tags:heroTags,display}):null,[me,target,details,display])
 if(!enemies.length)return <p className="group-empty">เพิ่มฮีโร่ศัตรูด้านบน เพื่อดูแผนรับมือรายตัว</p>
 if(!plan)return null
 return <div className="playbook">
   <div className="sets-tabs" role="group" aria-label="เลือกศัตรูที่จะดูแผน">
     {enemies.map(e=><button key={e.id} type="button" className={'chip '+(e.id===target.id?'selected':'')} aria-pressed={e.id===target.id} onClick={()=>setFocus(e.id)}>vs {display(e)}</button>)}
   </div>
   <div className={'playbook-plan '+plan.band} key={target.id}>
     <Portrait hero={target} size="sm"/>
     <div><b>{plan.label} · คะแนน {plan.score}</b><p>{plan.plan}</p></div>
   </div>
   {!details&&<small className="footnote">กำลังโหลดข้อมูลสกิล แผนจะระบุชื่อสกิลเมื่อโหลดเสร็จ</small>}
   <dl className="playbook-phases">
     {PHASES.filter(([id])=>plan.phases[id].length).map(([id,t])=><div key={id} className={id==='avoid'?'avoid':''}>
       <dt>{t}</dt>{plan.phases[id].map((l,i)=><dd key={i}>{l}</dd>)}
     </div>)}
   </dl>
   {plan.items.length>0&&<div className="playbook-items"><small>ไอเทมรับมือ</small>
     {plan.items.map(i=><span key={i.name} className="counter-chip" title={i.why}>{i.icon?<img src={i.icon} alt="" loading="lazy"/>:<Gem size={13}/>}{i.name}</span>)}
   </div>}
   {plan.missing.map(m=><small key={m} className="footnote">{m}</small>)}
   <small className="footnote">แผนสร้างจากกฎแท็กสกิลและชื่อ/คูลดาวน์สกิลในคลังข้อมูล ไม่ใช่สถิติรายคู่ · ใช้เป็นจุดเริ่ม แล้วให้โค้ชปรับตามที่ทีมเจอจริง</small>
 </div>
}
const withTags=h=>h?{...h,...heroTags[h.id]}:null

function ScoreBar({score}){
 const v=verdict(score),width=Math.max(14,Math.min(100,Math.abs(score)))
 return <span className={'score-bar '+v.id} title={v.label+' · คะแนน '+score}>
   <i style={{width:width+'%'}}/><b>{v.label}</b>
 </span>
}

function HeroChip({hero,Portrait,display,onRemove}){
 if(!hero)return null
 return <span className="counter-chip">
   <Portrait hero={hero} size="sm"/>{display(hero)}
   {onRemove&&<button type="button" className="btn icon" aria-label={'เอา '+display(hero)+' ออก'} onClick={()=>onRemove(hero.id)}>×</button>}
 </span>
}

export function ItemSets({sets,hero,lane,onCopy,copied}){
 const [active,setActive]=useState(0)
 if(!sets.length)return <p className="group-empty">ยังไม่มีชุดไอเทมสำหรับฮีโร่ตัวนี้</p>
 const set=sets[active]||sets[0]
 return <div className="sets">
   <div className="sets-tabs" role="group" aria-label="เลือกชุดไอเทม">
     {sets.map((s,i)=><button key={s.id} type="button" className={'chip '+(active===i?'selected':'')} aria-pressed={active===i} onClick={()=>setActive(i)}>{s.name}</button>)}
   </div>
   <div className="sets-body" key={set.id}>
     <ol className="sets-items">{set.items.map((it,i)=><li key={it.name}>
       <span className="sets-order">{i+1}</span>
       <span className="counter-item-icon">{it.icon?<img src={it.icon} alt="" loading="lazy"/>:<Gem size={15}/>}</span>
       <b>{it.name}</b>
     </li>)}</ol>
     <p className="sets-why">{set.why}</p>
   </div>
   {onCopy&&<button className="btn compact sets-copy" onClick={()=>onCopy(setToText(hero,set,lane))}>
     {copied?<Check size={14}/>:<Copy size={14}/>} {copied?'คัดลอกแล้ว':'คัดลอกชุดนี้'}</button>}
 </div>
}

export function CounterPick({heroes,state,byId,Portrait,display,onIntel,stamp,asDate,room,online,peers,profiles,onAi}){
 const [enemy,setEnemy]=useState(()=>Object.values(state.red).filter(Boolean).slice(0,3))
 const [query,setQuery]=useState('')
 const [lane,setLane]=useState('all')
 const [pick,setPick]=useState(null)
 const [mode,setMode]=useState('answers')
 const [copied,setCopied]=useState(false)
 const [details,setDetails]=useState(null)
 const [ai,setAi]=useState(null),[aiBusy,setAiBusy]=useState(false)
 // Lazy: hero-details.json stays in its own chunk, loaded on first item-set request.
 useEffect(()=>{let live=true;import('./hero-details.json').then(m=>{if(live)setDetails(m.default)},()=>{}) ;return()=>{live=false}},[])

 const enemyHeroes=useMemo(()=>enemy.map(id=>byId.get(id)).filter(Boolean),[enemy,byId])
 const selected=byId.get(pick)||null
 const threat=useMemo(()=>threatProfile(enemyHeroes),[enemyHeroes])

 const pool=useMemo(()=>{
   const taken=new Set([...Object.values(state.blue),...Object.values(state.red),...state.bans.blue,...state.bans.red])
   return heroes.filter(h=>!taken.has(h.id)&&(lane==='all'||h.lane===lane))
 },[heroes,state,lane])

 const answers=useMemo(()=>answersTo(enemy,pool,heroes,heroTags,18),[enemy,pool,heroes])
 const detail=useMemo(()=>selected?rank(selected.id,heroes,heroTags,5):null,[selected,heroes])
 const pairScore=useMemo(()=>{
   if(!selected||!enemyHeroes.length)return null
   return enemyHeroes.map(e=>({hero:e,...counterScore(withTags(selected),withTags(e))}))
 },[selected,enemyHeroes])
 const sets=useMemo(()=>{
   if(!selected)return []
   return buildSets(selected,enemyHeroes,details?.[selected.id]?.builds?.[0],heroTags[selected.id]||{})
 },[selected,enemyHeroes,details])

 async function copySet(text){
   try{await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2200)}catch{setCopied(false)}
 }
 async function askAi(){
   if(!selected)return
   setAiBusy(true);setAi(null)
   try{const text=await onAi(selected.id,enemy);if(text)setAi(text)}
   finally{setAiBusy(false)}
 }
 const search=query.trim().toLowerCase()
 const candidates=search?heroes.filter(h=>display(h).toLowerCase().includes(search)&&!enemy.includes(h.id)).slice(0,9):[]
 const threatRows=[['cc','ควบคุม'],['magic','เวท'],['phys','กายภาพ'],['heal','ฟื้นฟู'],['tanky','ตัวหนา'],['dash','เคลื่อนที่'],['burst','เบิร์สต์'],['poke','โปะ']]

 return <section className="panel counter-panel">
  <header className="section-head">
    <div><h2><Crosshair/> เคาน์เตอร์พิค</h2><p>เลือกฮีโร่ฝั่งศัตรู ระบบจัดอันดับตัวที่ได้เปรียบจากแท็กสกิลที่ยืนยันได้ · ไม่ใช่อัตราชนะ</p></div>
    <div className="counter-modes" role="group" aria-label="มุมมอง">
      {[['answers','ตัวตอบโต้'],['pair','เทียบรายคู่']].map(([id,t])=><button key={id} type="button" className={'chip '+(mode===id?'selected':'')} aria-pressed={mode===id} onClick={()=>setMode(id)}>{t}</button>)}
    </div>
  </header>

  <div className="counter-enemy">
    <div className="counter-enemy-head">
      <span><Swords size={15}/> ฮีโร่ศัตรูที่ต้องรับมือ</span>
      <span className="counter-head-right">
        {room&&<small className="live-pill" title={online?'กำลังรับการแจ้งเตือนจากห้อง':'กำลังต่อการเชื่อมต่อ'}><Radio size={11}/>{online?'ซิงก์สด':'ออฟไลน์'}{peers?<b>· {peers} ออนไลน์</b>:null}</small>}
        <small>{enemy.length?enemy.length+' ตัว':'เลือกอย่างน้อย 1 ตัว'}</small>
      </span>
    </div>
    <div className="counter-chips">
      {enemyHeroes.map(h=><HeroChip key={h.id} hero={h} Portrait={Portrait} display={display} onRemove={id=>setEnemy(enemy.filter(x=>x!==id))}/>)}
      {!enemy.length&&<small className="group-empty">ยังไม่ได้เลือก — พิมพ์ชื่อหรือกดจากดราฟต์ฝั่งคู่แข่ง</small>}
    </div>
    <label className="search counter-search"><Search size={16}/><span className="sr">ค้นหาฮีโร่ศัตรู</span>
      <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="เพิ่มฮีโร่ศัตรู เช่น Aoi"/>
    </label>
    {candidates.length>0&&<div className="counter-candidates">
      {candidates.map(h=><button key={h.id} type="button" className="hero-tile" onClick={()=>{setEnemy([...enemy,h.id]);setQuery('')}}><Portrait hero={h}/><span><strong>{display(h)}</strong><small>{laneLabel(h.lane)}</small></span></button>)}
    </div>}
    <div className="thread-strip" aria-label="ภัยคุกคามจากไลน์อัปศัตรู">
      {threatRows.map(([id,label])=>{const n=threat[id]||0;return <span key={id} className={n>=2?'hot':n?'warm':''}><i style={{opacity:.25+Math.min(n,4)*.19}}/>{label} {n}</span>})}
    </div>
  </div>

  {mode==='answers'&&<>
   <div className="filters counter-filters" role="group" aria-label="กรองเลน">
     {[...LANES.map(l=>[l.id,l.label]),['all','ทุกเลน']].map(([id,t])=><button key={id} type="button" className={'chip '+(lane===id?'selected':'')} aria-pressed={lane===id} onClick={()=>setLane(id)}>{t}</button>)}
   </div>
   {!enemy.length?<p className="group-empty">เลือกฮีโร่ศัตรูก่อน ระบบจะจัดอันดับตัวที่ตอบโต้ได้จากแท็กสกิล</p>
   :!answers.length?<p className="group-empty">ไม่พบตัวที่ได้เปรียบในเลนนี้ ลองเปลี่ยนเลนหรือลดตัวศัตรู</p>
   :<div className="answer-grid">{answers.map((a,i)=><button key={a.hero.id} type="button" className={'answer-card esport-hover'+(pick===a.hero.id?' selected':'')} style={{animationDelay:Math.min(i,9)*28+'ms'}} onClick={()=>setPick(a.hero.id)}>
      <span className="answer-rank">{i+1}</span>
      <Portrait hero={a.hero}/>
      <span className="answer-text"><b>{display(a.hero)}</b><small>{laneLabel(a.hero.lane)} · {a.hero.role}</small>
        <span className="answer-why">{a.detail[0]?.why[0]||'ได้เปรียบเชิงแท็กสกิล'}</span>
      </span>
      <ScoreBar score={a.score}/>
    </button>)}</div>}
  </>}

  {mode==='pair'&&<div className="pair-stage">
   <div className="pair-picker">
     <span>ฮีโร่ของเรา</span>
     <label className="search"><Search size={16}/><span className="sr">ค้นหาฮีโร่ของเรา</span>
       <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหาฮีโร่ของเรา"/></label>
     {candidates.length>0&&<div className="counter-candidates">{candidates.map(h=><button key={h.id} type="button" className="hero-tile" onClick={()=>{setPick(h.id);setQuery('')}}><Portrait hero={h}/><span><strong>{display(h)}</strong><small>{laneLabel(h.lane)}</small></span></button>)}</div>}
     {selected&&<div className="pair-self"><Portrait hero={selected} size="lg"/><div><b>{display(selected)}</b><small>{laneLabel(selected.lane)} · {selected.role}</small></div>
       <button className="btn compact" onClick={()=>onIntel(selected.id)}>รายละเอียด</button></div>}
   </div>
   <div className="pair-results">
     {!selected?<p className="group-empty">เลือกฮีโร่ของเราก่อน แล้วเทียบกับฮีโร่ศัตรูด้านบน</p>
     :!pairScore?.length?<p className="group-empty">ยังไม่มีคู่ให้เทียบ เพิ่มฮีโร่ศัตรูด้านบน</p>
     :pairScore.map(p=><div className={'pair-row '+verdict(p.score).id} key={p.hero.id}>
       <Portrait hero={p.hero}/><div><b>vs {display(p.hero)}</b>
         <small>{laneLabel(p.hero.lane)} · {p.score>0?'เราชนะเชิงแท็ก':'เราเสียเปรียบเชิงแท็ก'} · คะแนน {p.score}</small>
         {p.why.slice(0,2).map(w=><em key={w}>+ {w}</em>)}
         {p.against.slice(0,2).map(w=><em className="minus" key={w}>− {w}</em>)}
       </div><ScoreBar score={p.score}/>
     </div>)}
   </div>
  </div>}

  {selected&&<div className="counter-detail">
    <div className="counter-detail-head">
      <Portrait hero={selected} size="lg"/>
      <div><b>{display(selected)}</b><small>{laneLabel(selected.lane)} · {selected.role}{selected.win!=null?' · ชนะแรงก์ '+selected.win.toFixed(2)+'%':''}</small></div>
      <button className="btn compact primary" onClick={()=>onIntel(selected.id)}>เปิดคลังข้อมูล</button>
    </div>
    <div className="counter-detail-grid">
      <div>
        <h3><TrendingUp size={15}/> ได้เปรียบ</h3>
        {detail?.beats.length?detail.beats.map(b=><button key={b.hero.id} className="mini-row" onClick={()=>setEnemy([...enemy,b.hero.id])}><Portrait hero={b.hero} size="sm"/><span><b>{display(b.hero)}</b><small>{b.why[0]||'ได้เปรียบเชิงแท็ก'}</small></span><ScoreBar score={b.score}/></button>):<p className="group-empty">ไม่พบตัวที่ได้เปรียบชัดในชุดนี้</p>}
        <h3 style={{marginTop:8}}><ShieldQuestion size={15}/> เสียเปรียบ</h3>
        {detail?.loses.length?detail.loses.map(b=><button key={b.hero.id} className="mini-row" onClick={()=>setEnemy([...enemy,b.hero.id])}><Portrait hero={b.hero} size="sm"/><span><b>{display(b.hero)}</b><small>{b.against[0]||'ได้เปรียบกว่าเรา'}</small></span><ScoreBar score={-b.score}/></button>):<p className="group-empty">ไม่พบตัวที่ชนะทางชัด</p>}
      </div>
      <div>
        <h3><Sparkles size={15}/> ชุดไอเทมที่เลือกได้</h3>
        <ItemSets sets={sets} hero={selected} lane={laneLabel(selected.lane)} onCopy={copySet} copied={copied}/>
        <small className="footnote">ชุดอ้างอิงจากคลังข้อมูล · ชุดอื่นสลับชิ้นท้ายตามแท็กสกิลและภัยคุกคาม ไม่ใช่สถิติไอเทมรายคู่</small>
        {onAi&&(room?<button className="btn ai-button" disabled={aiBusy} onClick={askAi}><Sparkles size={16}/>{aiBusy?'กำลังวิเคราะห์…':'ให้ AI อธิบายชุดนี้'}</button>
          :<small className="footnote">AI ใช้ได้เมื่อเปิดห้องออนไลน์และตั้งค่า 9Router แล้ว</small>)}
        {ai&&<div className="ai-result"><b>ข้อเสนอจาก AI</b><p>{ai}</p></div>}
      </div>
    </div>
    <div className="playbook-wrap">
      <h3><Swords size={15}/> แผนรับมือ: {display(selected)} ชนะแต่ละตัวยังไง</h3>
      <Playbook me={selected} enemies={enemyHeroes} details={details} display={display} Portrait={Portrait}/>
    </div>
  </div>}

  <p className="footnote">คะแนน ±{Math.abs(BANDS.good)} ขึ้นไปคือได้เปรียบชัด คำนวณจากแท็กสกิลใน <code>hero-tags.json</code> ที่ดึงจากคลังข้อมูลฮีโร่ · สถิติแรงก์ {stamp?asDate(stamp.date):''} เป็นคนละชุดกับคะแนนนี้</p>
 </section>
}
