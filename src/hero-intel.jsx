import React,{useEffect,useMemo,useRef,useState} from 'react'
import {Activity,ArrowUpRight,BookOpen,ChevronRight,Copy,Crosshair,Gem,Layers3,Shield,Sparkles,Swords,X,Zap} from 'lucide-react'
import {LANES} from './domain.mjs'
import {recommendItems} from './items.mjs'
import {rank,verdict,counterScore} from './matchup.mjs'
import {buildSets,setToText} from './sets.mjs'
import {describeSkill} from './team-analysis.mjs'
import heroTags from './hero-tags.json' with {type:'json'}

let dossierPromise
const loadDossiers=()=>dossierPromise??=import('./hero-details.json').then(m=>m.default).catch(err=>{dossierPromise=null;throw err})
const laneFor=hero=>LANES.find(l=>l.id===hero?.lane)?.label
const pct=x=>Number.isFinite(x)?x.toFixed(2)+'%':'—'
const tagsFor=(skill,i)=>/อัลติ/.test(skill.slot)||i===3?'อัลติเมต':i===0?'ติดตัว':i>3?'สกิลเสริม':skill.slot?.startsWith('สกิล')?skill.slot:'สกิล '+i
const ITEM_NOTES={
 'Glided Greaves':'พิจารณาเมื่ออีกฝั่งมีสกิลควบคุมเยอะ แต่การต้านทานสถานะไม่ใช่คำตอบของการจับล็อกทุกรูปแบบ',
 'Death Sickle':'ใช้เป็นทางเลือกเมื่อต้องเผื่อจังหวะรอดจากดาเมจปิดงาน',
 "Uriel's Brand":'ทางเลือกเมื่อแครี่ต้องรับมือดาเมจเวทและยังต้องการความเร็วโจมตี',
 'Curse of Death':'พิจารณาเมื่ออีกฝั่งมีฟื้นฟูสูงและทีมยังไม่มีคนออกไอเทมลดการฟื้นฟู'
}
const HAYATE_ORDER={steps:['สกิล 1','อัลติเมต','สกิล 2'],url:'https://zathong.com/aov-hayate/'}
const SKILL_SUMMARY={
 hayate:['โจมตีปกติชิ่งโดนศัตรูใกล้กัน เมื่อสะสมการโจมตีที่เป้าหมายเดิมครบจะฟื้นพลังงานและเสริมความเสียหายจริงกับเป้าหมายนั้น','ปาดาวกระจายไปด้านหน้าและเพิ่มความเร็วเคลื่อนที่ระหว่างใช้ เหมาะกับการกดดันจากระยะปลอดภัย','พุ่งเปลี่ยนตำแหน่ง ใช้เข้าออกระยะโจมตีหรือเก็บไว้หลบสกิลสำคัญ','พุ่งเข้าจุดที่เลือกแล้วโจมตีเป็นวงรอบตัว ควรเข้าหลังอีกฝั่งใช้สกิลหยุดไปแล้ว'],
 aleister:['ใช้การโจมตีและสกิลสะสมตราเพื่อสร้างความเสียหายจริง','วางแนวกั้นเวทเพื่อหยุดศัตรูที่เดินผ่าน','วางพื้นที่ทำความเสียหายต่อเนื่อง เหมาะกับการปิดทางเดินหรือต่อจากสกิลควบคุม','ล็อกเป้าหมายเดี่ยวระหว่างร่าย ช่วยหยุดตัวล้วงที่เข้าแนวหลัง'],
 annette:['สกิลติดตัวช่วยให้เคลื่อนที่และกลับมาใช้สกิลได้ไวขึ้นตามเงื่อนไข','สร้างพื้นที่ลมเพื่อทำดาเมจและชะลอศัตรู','สกิลลมที่ใช้เปลี่ยนตำแหน่งหรือช่วยปกป้องเพื่อนตามกลไกของสกิล','สร้างเขตกั้นและผลักศัตรูออก ใช้กันตัวล้วงหรือแยกพื้นที่ไฟต์'],
 violet:['โจมตีปกติช่วยให้กลับมาใช้สกิลกลิ้งได้ไวขึ้นตามเงื่อนไข','กลิ้งเปลี่ยนตำแหน่งและเสริมการยิงครั้งถัดไป','ขว้างระเบิดเพื่อทำดาเมจและลดความเร็วเป้าหมาย','ยิงกระสุนแรงระยะไกล ใช้เสริมดาเมจหรือปิดงาน'],
 nakroth:['การโจมตีปกติตามเงื่อนไขจะยกเป้าหมาย ช่วยต่อจังหวะคุมตัว','พุ่งยกศัตรูและกดใช้ซ้ำได้ภายในช่วงที่กำหนด','กระโดดเปลี่ยนตำแหน่งและเสริมการโจมตีปกติครั้งถัดไป','โจมตีต่อเนื่องเป็นชุดและยกศัตรูในจังหวะท้าย'],
}
const ITEM_POOL_URL='https://rovguide.com/th/items'
const SITUATIONAL_BY_ROLE={'แครี่':['Glided Greaves','Death Sickle',"Uriel's Brand",'Curse of Death'],'ไฟต์เตอร์':['Glided Greaves','Death Sickle','Curse of Death'],'แอสซาซิน':['Glided Greaves','Death Sickle','Curse of Death']}
const DAMAGE_PROTECTION=['Glided Greaves']
const KIND={pair:'คู่เล่น',risk:'คู่แข่งล็อกแล้ว',ban:'ยังพิจารณาแบนได้'}
function IntelIcon({item,fallback:Fallback=Gem}){
 const [bad,setBad]=useState(false)
 useEffect(()=>setBad(false),[item.icon])
 return <span className="intel-icon">{item.icon&&!bad?<img src={item.icon} alt="" loading="lazy" onError={()=>setBad(true)}/>:<Fallback size={19}/>}</span>
}
function IconTile({item,fallback,active,onSelect,note}){
 return <button type="button" className={'intel-tile esport-hover'+(active?' active':'')} onClick={onSelect} aria-pressed={active} title={item.name}>
  <IntelIcon item={item} fallback={fallback}/><span><b>{item.name}</b>{note&&<small>{note}</small>}</span>
 </button>
}
function Sources({d,stamp,asDate}){
 return <div className="intel-sources"><span>แหล่งข้อมูล</span>
  {d.garena&&<a href={d.garena} target="_blank" rel="noreferrer">ชุดแนะนำ Garena <ArrowUpRight size={13}/></a>}
  <a href={d.guide} target="_blank" rel="noreferrer">สกิล RoVGuide <ArrowUpRight size={13}/></a>
  <a href={stamp.url} target="_blank" rel="noreferrer">แรงก์ไทย {asDate(stamp.date)} <ArrowUpRight size={13}/></a>
 </div>
}
export function HeroIntel({hero,onClose,onBrowse,heroes,groups,stamp,byId,Portrait,display,asDate,enemy=[]}){
 const dialog=useRef(null),body=useRef(null),close=useRef(null)
 const [data,setData]=useState(null),[failed,setFailed]=useState(false),[tryCount,setTryCount]=useState(0)
 const [build,setBuild]=useState(0),[setIndex,setSetIndex]=useState(0),[skill,setSkill]=useState(0),[highlight,setHighlight]=useState(null),[heroQuery,setHeroQuery]=useState('')
 const open=!!hero
 const [copyState,setCopyState]=useState('')
 useEffect(()=>{const d=dialog.current;if(open&&!d.open){d.showModal();close.current?.focus()}if(!open&&d.open)d.close()},[open])
 useEffect(()=>{
  if(!open||data)return
  let active=true
  setFailed(false)
  loadDossiers().then(x=>{if(active)setData(x)},()=>{if(active)setFailed(true)})
  return()=>{active=false}
 },[open,data,tryCount])
 useEffect(()=>{setBuild(0);setSetIndex(0);setSkill(0);setHighlight(null);setHeroQuery('');setCopyState('');if(body.current)body.current.scrollTop=0},[hero?.id])
 const d=hero?(data?.[hero.id]||{guide:'https://rovguide.com/th/heroes/'+hero.sourceSlug}):null
 const skills=d?.skills||[], buildList=d?.builds||[], activeBuild=buildList[build]||buildList[0], currentSkill=skills[skill]||skills[0]
 const itemIndex=useMemo(()=>{
   const all={}
   for(const x of Object.values(data||{}))for(const b of x.builds||[])for(const i of b.items)all[i.name]=i
   return all
 },[data])
 const opts=hero?(SITUATIONAL_BY_ROLE[hero.role]||DAMAGE_PROTECTION).filter(n=>!(d?.builds?.[build]?.items||[]).some(i=>i.name===n)&&itemIndex[n]):[]
 const shortlist=groups?.rules.filter(r=>r.kind!=='meta').slice(0,6)||[]
 const dCounter=useMemo(()=>{
   if(!hero)return []
   const enemyHeroes=enemy.map(id=>byId.get(id)).filter(Boolean)
   return recommendItems(hero,enemyHeroes,5)
 },[hero,enemy,byId])
 const matchup=useMemo(()=>hero?rank(hero.id,heroes,heroTags,4):null,[hero,heroes])
 const dSets=useMemo(()=>{
   if(!hero||!data)return []
   const enemyHeroes=enemy.map(id=>byId.get(id)).filter(Boolean)
   return buildSets(hero,enemyHeroes,data[hero.id]?.builds?.[0],heroTags[hero.id]||{})
 },[hero,enemy,byId,data])
 const activeSet=dSets[setIndex]||dSets[0]
 const shownItems=activeSet?activeSet.items:(activeBuild?.items||[])
 const pickEntry=(type,item,extra)=>setHighlight({type,item,extra})
 const identity=[laneFor(hero),hero?.role,d?.specialty].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join(' · ')
 function jump(id){const el=body.current?.querySelector('#'+id);if(el){el.scrollIntoView({block:'start'});el.querySelector('h3')?.focus({preventScroll:true})}}
 const visibleHeroes=heroQuery.trim()?heroes.filter(x=>display(x).toLowerCase().includes(heroQuery.trim().toLowerCase())).slice(0,8):[]
 async function copy(){
  if(!hero)return
  const set=activeSet
  const lines=set?[setToText(hero,set,laneFor(hero))]:[display(hero)+' · '+laneFor(hero)]
  if(!set&&activeBuild){lines.push('ชุดอ้างอิงจาก Garena: '+activeBuild.name,'ไอเทม: '+activeBuild.items.map(x=>x.name).join(' → '))}
  if(d.runes?.length)lines.push('รูน: '+d.runes.map(x=>x.name).join(' / '))
  if(d.spells?.length)lines.push('ชาเลนเจอร์: '+d.spells.map(x=>x.name).join(' / '))
  if(d.enchantments?.length)lines.push('พลังแฝง: '+d.enchantments.map(g=>g.map(x=>x.name).join(' → ')).join(' / '))
  if(d.garena)lines.push(d.garena)
  try{await navigator.clipboard.writeText(lines.join('\n'));setCopyState('คัดลอกแล้ว')}catch{setCopyState('คัดลอกไม่ได้ เบราว์เซอร์ไม่อนุญาต')}
 }
 return <dialog ref={dialog} className="intel-dialog" aria-labelledby="hero-intel-heading" onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
 {hero&&<div className="intel-shell">
   <header className="intel-top">
    <div><BookOpen size={16}/><span>คลังข้อมูลฮีโร่</span></div>
    <button ref={close} className="btn icon esport-hover" onClick={onClose} aria-label="ปิดรายละเอียดฮีโร่"><X size={20}/></button>
   </header>
   <div ref={body} className="intel-body">
    <div className="intel-hero" key={hero.id}>
     {d.art&&<img className="intel-art" src={d.art} alt="" onLoad={e=>{e.currentTarget.style.visibility='visible'}} onError={e=>{e.currentTarget.style.visibility='hidden'}}/>}
     <div className="intel-hero-content"><div className="intel-identity"><Portrait hero={hero} size="lg"/><div><h2 id="hero-intel-heading">{display(hero)}</h2><p>{identity}</p></div></div>
     <div className="intel-stats" aria-label="สถิติแรงก์ไทย"><div><span>ชนะ</span><strong>{pct(hero.win)}</strong></div><div><span>เลือก</span><strong>{pct(hero.pick)}</strong></div><div><span>แบน</span><strong>{pct(hero.ban)}</strong></div></div>
     <small>แรงก์ไทย ณ {asDate(stamp.date)} · ไม่ใช่อัตราชนะของบิลด์</small></div>
     {activeSet&&<div className="intel-copy-actions"><button className="btn primary intel-copy esport-hover" onClick={copy}><Copy size={16}/> คัดลอกชุดที่เลือก</button>{copyState&&<small role="status">{copyState}</small>}</div>}
    </div>
    {!data&&!failed&&<div className="intel-loading" role="status">กำลังโหลดรายละเอียดฮีโร่…</div>}
    {failed&&<div className="intel-loading" role="alert">โหลดข้อมูลไม่สำเร็จ <button className="btn" onClick={()=>setTryCount(x=>x+1)}>ลองใหม่</button></div>}
    {data&&<nav className="intel-jumps" aria-label="ส่วนของรายละเอียดฮีโร่">{[['intel-builds','บิลด์'],['intel-runes','รูน'],['intel-skills','สกิล'],['intel-items','ไอเทม']].map(([id,t])=><button key={id} type="button" onClick={()=>jump(id)}>{t}</button>)}</nav>}
    {data&&<div className="intel-grid">
      <aside className="intel-rail">
       <section><h3><Layers3/> ชุดไอเทม</h3>
        {dSets.length?<div className="intel-sets">{dSets.map((s,i)=><button key={s.id} className={'intel-build esport-hover'+(setIndex===i?' active':'')} aria-pressed={setIndex===i} onClick={()=>{setSetIndex(i);setHighlight(null)}}><IntelIcon item={s.items[0]}/><span><b>{s.name}</b><small>{s.items.length} ไอเทม</small></span><ChevronRight size={15}/></button>)}</div>
        :buildList.length?buildList.map((b,i)=><button key={i} className={'intel-build esport-hover'+(build===i?' active':'')} aria-pressed={build===i} onClick={()=>{setBuild(i);setHighlight(null)}}><IntelIcon item={b.items[0]}/><span><b>{b.name==='แนะนำ'?'ชุดแนะนำ Garena':b.name}</b><small>{b.items.length} ไอเทม</small></span><ChevronRight size={15}/></button>):<p className="intel-empty">ยังไม่มีบิลด์ที่ยืนยันได้สำหรับฮีโร่นี้</p>}
       </section>
       <section><h3><Crosshair/> มุมมองดราฟต์</h3>
        {shortlist.length?shortlist.map(r=><button key={r.kind+r.id} className="intel-match esport-hover" onClick={()=>onBrowse(r.id)} title={r.reason}><Portrait hero={byId.get(r.id)} size="sm"/><span><b>{display(byId.get(r.id))}</b><small className={'kind '+r.kind}>{KIND[r.kind]}</small></span><ChevronRight size={15}/></button>):<p className="intel-empty">ยังไม่มีคำแนะนำเฉพาะคู่สำหรับดราฟต์นี้</p>}
       </section>
       <section><h3><Crosshair/> ชนะทาง / แพ้ทาง</h3>
        {matchup&&(matchup.beats.length||matchup.loses.length)?<>
          {matchup.beats.slice(0,3).map(r=><button key={'b'+r.hero.id} className="intel-match esport-hover" onClick={()=>onBrowse(r.hero.id)} title={r.why[0]}>
            <Portrait hero={r.hero} size="sm"/><span><b>{display(r.hero)}</b><small className="kind pair">ชนะทาง · {verdict(r.score).label}</small></span><span className={'tag-score '+verdict(r.score).id}>{r.score}</span></button>)}
          {matchup.loses.slice(0,3).map(r=><button key={'l'+r.hero.id} className="intel-match esport-hover" onClick={()=>onBrowse(r.hero.id)} title={r.against[0]}>
            <Portrait hero={r.hero} size="sm"/><span><b>{display(r.hero)}</b><small className="kind risk">แพ้ทาง · {verdict(-r.score).label}</small></span><span className={'tag-score '+verdict(-r.score).id}>{r.score}</span></button>)}
          <a className="intel-more" href="#counter">ดูตารางเคาน์เตอร์ทั้งหมด</a>
        </>:<p className="intel-empty">ไม่พบคู่ที่ชัดเจนจากแท็กสกิลของฮีโร่นี้</p>}
       </section>
       <section><label className="intel-search">ค้นหาฮีโร่อื่น<input type="search" placeholder="เช่น Hayate" value={heroQuery} onChange={e=>setHeroQuery(e.target.value)}/></label>
        {visibleHeroes.map(h=><button key={h.id} className="intel-match esport-hover" onClick={()=>onBrowse(h.id)}><Portrait hero={h} size="sm"/><span><b>{display(h)}</b><small>{laneFor(h)}</small></span><ChevronRight size={15}/></button>)}
       </section>
      </aside>
      <div className="intel-core">
       <section id="intel-runes"><h3 tabIndex={-1}><Gem/> รูน</h3><div className="intel-runes">
        {d.runes?.length?d.runes.map((x,i)=><div className={'rune-color '+x.color} key={i}><IconTile item={x} note={({red:'รูนแดง',purple:'รูนม่วง',green:'รูนเขียว'})[x.color]} active={highlight?.item===x} onSelect={()=>pickEntry('รูน',x)}/></div>):<p className="intel-empty">ไม่พบชุดรูนที่ยืนยันได้</p>}
       </div></section>
       <section><h3><Sparkles/> พลังแฝง</h3>
        {d.enchantments?.length?<div className="intel-paths">{d.enchantments.map((g,i)=><div key={i} className="intel-path"><span>{g[0].name}</span><div>{g.slice(1).map((x,j)=><IconTile key={j} item={x} fallback={Sparkles} active={highlight?.item===x} onSelect={()=>pickEntry('พลังแฝง',x)}/>)}</div></div>)}</div>:<p className="intel-empty">ไม่พบชุดพลังแฝงที่ยืนยันได้</p>}
       </section>
       <section className="intel-abilities" id="intel-skills"><h3 tabIndex={-1}><Zap/> สกิลและลำดับอัป</h3>
        {hero.id==='hayate'?<div className="ability-priority"><span>ลำดับความสำคัญ</span><ol className="ability-steps">{HAYATE_ORDER.steps.map((step,i)=><li key={step}><b>{i+1}</b> {step}</li>)}</ol><a href={HAYATE_ORDER.url} target="_blank" rel="noreferrer">คู่มืออ้างอิง <ArrowUpRight size={12}/></a></div>:<p className="intel-empty">ยังไม่มีลำดับอัปที่ตรวจสอบได้ แสดงสกิลตามช่องในเกม</p>}
        {skills.length?<><div className="skill-tabs" role="group" aria-label="เลือกสกิล">{skills.map((x,i)=><IconTile key={i} item={{name:tagsFor(x,i),icon:x.icon}} fallback={Zap} active={skill===i} onSelect={()=>setSkill(i)}/>)}</div>
        <div className="skill-preview" key={currentSkill.name+skill}><div className="skill-preview-head"><b>{currentSkill.name}</b><span className="skill-slot-tag">{tagsFor(currentSkill,skill)}</span></div><p className="skill-fact-desc">{describeSkill(currentSkill)}</p>{SKILL_SUMMARY[hero.id]?.[skill]&&<p className="skill-tip-desc">{SKILL_SUMMARY[hero.id][skill]}</p>}<div>{currentSkill.tags?.map(t=><span key={t}>{t}</span>)}{currentSkill.cooldown&&<span>คูลดาวน์ {currentSkill.cooldown}</span>}{currentSkill.cost&&<span>ทรัพยากร {currentSkill.cost}</span>}</div><a href={d.guide} target="_blank" rel="noreferrer">อ่านกลไกและตัวเลขเต็ม <ArrowUpRight size={13}/></a></div></>:<p className="intel-empty">ยังไม่มีข้อมูลสกิลในเว็บนี้ เปิดแหล่งข้อมูลฮีโร่ด้านล่างได้</p>}
       </section>
      </div>
      <div className="intel-gear">
       <section><h3><Activity/> สกิลชาเลนเจอร์</h3>{d.spells?.length?d.spells.map((x,i)=><IconTile item={x} key={i} fallback={Zap} active={highlight?.item===x} onSelect={()=>pickEntry('สกิลชาเลนเจอร์',x)}/>):<p className="intel-empty">ยังไม่มีชุดที่ยืนยันได้</p>}</section>
       <section id="intel-items"><h3 tabIndex={-1}><Swords/> ไอเทมในชุดที่เลือก</h3>
        {shownItems.length?<div className="intel-item-list">{shownItems.map((x,i)=><IconTile key={i} item={x} note={'ชิ้นที่ '+(i+1)} fallback={Swords} active={highlight?.item===x} onSelect={()=>pickEntry('ไอเทมในชุด',x,'ลำดับที่ '+(i+1)+' ตามชุดที่แหล่งอ้างอิงแสดง ปรับตามรูปเกมได้')}/>)}</div>:<p className="intel-empty">ยังไม่มีรายการไอเทมที่ยืนยันได้</p>}
        {activeSet&&<p className="intel-empty">{activeSet.why}</p>}
       </section>
       <section><h3><Shield/> ไอเทมตามสถานการณ์</h3>
        {dCounter.length?<><p className="intel-empty">จัดอันดับจากแท็กสกิลของฮีโร่และไลน์อัปศัตรูที่เลือกไว้ ไม่ใช่สถิติไอเทมรายคู่</p><div className="intel-item-list">{dCounter.map(i=><IconTile key={i.name} item={i} fallback={Shield} active={highlight?.item?.name===i.name} onSelect={()=>pickEntry('ไอเทมตอบโต้ · '+i.cat,{name:i.name,icon:i.icon},i.why)}/>)}</div></>:opts.length?<><p className="intel-empty">ตัวเลือกตามบทบาท ไม่ใช่สถิติรายบิลด์</p><div className="intel-item-list">{opts.map(n=><IconTile key={n} item={itemIndex[n]} fallback={Shield} active={highlight?.item===itemIndex[n]} onSelect={()=>pickEntry('ไอเทมตามสถานการณ์',itemIndex[n],ITEM_NOTES[n])}/>)}</div></>:<p className="intel-empty">ยังไม่มีตัวเลือกเพิ่มเติมในเว็บนี้</p>}
        {highlight&&<div className="intel-highlight" aria-live="polite" key={highlight.type+highlight.item.name}><small>{highlight.type}</small><b>{highlight.item.name}</b>{highlight.extra&&<p>{highlight.extra}</p>}</div>}
        <a className="intel-item-source" href={ITEM_POOL_URL} target="_blank" rel="noreferrer">ดูค่าสถานะไอเทม <ArrowUpRight size={13}/></a>
       </section>
      </div>
    </div>}
    <Sources d={d} stamp={stamp} asDate={asDate}/>
   </div>
 </div>}
 </dialog>
}
