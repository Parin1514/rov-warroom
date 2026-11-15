// "How to beat X" playbook. Every line is derived from verified data only:
// the enemy's skill names/tags/cooldowns in hero-details.json, the counter
// edges in matchup.mjs, and the item rules in items.mjs. No win rates, no
// invented mechanics — when a fact is missing the line says so.
import {counterScore,verdict,EDGES} from './matchup.mjs'
import {recommendItems} from './items.mjs'

const has=(skill,...words)=>(skill.tags||[]).some(t=>words.includes(t))
const CC=['สตั้น','สตั๊น','ลอยขึ้น','ผลักถอยหลัง','ควบคุม','ใบ้','ล็อคตัว','แช่แข็ง','หยุดนิ่ง','ยั่วยุ','ดูด']
const MOVE=['เคลื่อนที่','วาร์ป']
const SAFE=['ไม่ตกเป็นเป้าหมาย','ป้องกัน','ลดความเสียหาย','ต้านสถานะ','ล้างสถานะ','กันสถานะ','ป้องกันตาย']
// Source data prefixes the ultimate slot with a digit ("3อัลติเมท"); strip it.
const slotName=s=>String(s.slot||'').replace(/^\d+/,'')
const label=s=>slotName(s)+' '+s.name+(s.cooldown?' (คูลดาวน์ '+s.cooldown+')':'')

// Pick the enemy skills that decide the matchup: what locks you, what lets them
// escape or engage, what saves them, and how they sustain.
export function keySkills(details){
  const skills=(details?.skills||[]).filter(s=>s?.name&&s.slot)
  const seen=new Set(),uniq=skills.filter(s=>!seen.has(s.slot+s.name)&&seen.add(s.slot+s.name))
  return {
    cc:uniq.filter(s=>has(s,...CC)),
    move:uniq.filter(s=>has(s,...MOVE)),
    safe:uniq.filter(s=>has(s,...SAFE)),
    heal:uniq.filter(s=>has(s,'ฮีล','ฟื้นฟู','ดูดกลืน')),
    stealth:uniq.filter(s=>has(s,'ล่องหน')),
    ult:uniq.find(s=>/อัลติเมท/.test(s.slot))||null,
    all:uniq
  }
}

// Phase advice per matched edge. Text references real skill names when known.
function edgeLines(edge,me,enemy,k){
  const cc=k.cc[0],mv=k.move[0],safe=k.safe[0]
  switch(edge){
    case 'lock':return {
      early:mv?'จำจังหวะ '+label(mv)+' ของ '+enemy+' — ใช้สกิลควบคุมหลังเขาใช้ท่านี้ เขาจะหนีไม่ได้':'เก็บสกิลควบคุมไว้ตัดจังหวะพุ่งของ '+enemy,
      fight:'อย่าใช้สกิลควบคุมเปิดก่อน รอ '+enemy+' พุ่งเข้าหาเป้าหมายแล้วค่อยตรึง',
      avoid:'ถ้าใช้สกิลควบคุมพลาด ให้ถอยจนกว่าคูลดาวน์จะกลับ'}
    case 'poke':return {
      early:'ยืนระยะไกลสุดของสกิล '+enemy+' ไม่มีสกิลเข้าถึงตัว โปะทุกครั้งที่เขาเดินเข้ามาเก็บมินเนี่ยน',
      mid:'กดดันป้อมด้วยการโปะก่อน ไม่ต้องรอไฟต์',
      avoid:'อย่าเดินเข้าระยะใกล้เมื่อพุ่มไม้ข้าง '+enemy+' ไม่มีวิสัยทัศน์'}
    case 'dive':return {
      mid:'หาจังหวะตอน '+enemy+' ยืนโปะโดยไม่มีเพื่อนคุม แล้วพุ่งเข้าถึงตัว',
      fight:'รอให้แนวหน้าอีกฝั่งใช้สกิลควบคุมก่อน แล้วพุ่งเข้าหา '+enemy+' ที่แนวหลัง',
      avoid:cc?'ระวัง '+label(cc)+' — ถ้ายังไม่ใช้ อย่าพุ่งเข้าไป':'อย่าพุ่งเข้าไปคนเดียวถ้าทีมยังตามไม่ทัน'}
    case 'true':return {
      mid:enemy+' ตัวหนา ดาเมจจริงช่วยข้ามเกราะ แต่ต้องทำเงื่อนไขสกิลให้ครบและไม่ฝืนรับดาเมจ',
      fight:'โฟกัส '+enemy+' ได้ ไม่ต้องอ้อมไปหาแนวหลัง ดาเมจจริงไม่ถูกเกราะลด'}
    case 'unseen':return {
      early:enemy+' ไม่มีเครื่องมือเปิดตำแหน่ง — ซุ่มจากพุ่มไม้หรือล่องหนเข้าได้',
      mid:'ใช้การล่องหนเปิดไฟต์ฝั่งที่ '+enemy+' อยู่',
      avoid:'ระวังเพื่อนของ '+enemy+' ที่มีสกิลเปิดแผนที่'}
    case 'burst':return {
      early:'ใช้คอมโบเต็มเมื่อเลือด '+enemy+' ต่ำกว่าครึ่ง เขาไม่มีเกราะหรือตัวลดดาเมจรองรับ',
      fight:safe?'รอ '+label(safe)+' ของ '+enemy+' ถูกใช้ก่อน แล้วค่อยปล่อยเบิร์สต์':'ปล่อยเบิร์สต์ทั้งชุดในจังหวะเดียว อย่าแบ่งสกิล',
      avoid:'อย่าปล่อยคอมโบตอน '+enemy+' ยังมีเพื่อนยืนบัง'}
    case 'outlast':return {
      early:'หากรอดจากคอมโบแรก การฟื้นฟูอาจช่วยแลกต่อได้ อย่าฝืนตอนเลือดต่ำหรือโดนตัดฮีล',
      fight:'หลัง '+enemy+' ใช้คอมโบ ให้ประเมินเลือดและคูลดาวน์ก่อนสู้ต่อ เขายังโจมตีปกติหรือมีเพื่อนช่วยได้',
      avoid:'ถ้าเขามีไอเทมตัดการฟื้นฟู ให้กลับไปแลกสั้นแทน'}
  }
  return {}
}

// The danger lines: what the enemy does to us, from their edges and real skills.
function threatLines(edge,enemy,k){
  const cc=k.cc[0],mv=k.move[0]
  switch(edge){
    case 'lock':return cc?'โดน '+label(cc)+' ตัดจังหวะพุ่งเข้า — หลอกให้เขาใช้ก่อนแล้วค่อยพุ่ง':'สกิลควบคุมของ '+enemy+' ตัดจังหวะพุ่งเข้า ให้หลอกให้เขาใช้ก่อน'
    case 'poke':return enemy+' โปะได้โดยเราเข้าไม่ถึง — เข้าหาผ่านพุ่มไม้หรือรอเพื่อนช่วยเปิด'
    case 'dive':return mv?enemy+' ใช้ '+label(mv)+' พุ่งถึงแนวหลัง — ยืนใกล้แนวหน้าและเก็บสกิลป้องกันไว้':enemy+' พุ่งถึงแนวหลังได้ — ยืนใกล้แนวหน้าและเก็บสกิลป้องกัน'
    case 'true':return enemy+' มีดาเมจจริง เกราะช่วยไม่มาก — อย่ายืนแลกนาน'
    case 'unseen':return enemy+' ล่องหนเข้า — วางวิสัยทัศน์ในพุ่มไม้และเดินเป็นกลุ่ม'
    case 'burst':return enemy+' เบิร์สต์ปิดงานได้ — ซื้อไอเทมกันเบิร์สต์ก่อนหรือเก็บสกิลหนีไว้'
    case 'outlast':return enemy+' ฟื้นฟูชนะเบิร์สต์ของเรา — ซื้อไอเทมตัดการฟื้นฟูแล้วค่อยแลก'
  }
  return ''
}

export function playbook(me,enemy,{details={},tags={},display=h=>h?.name||h?.id}={}){
  if(!me||!enemy||me.id===enemy.id)return null
  const a={...me,...tags[me.id]},b={...enemy,...tags[enemy.id]}
  const {score,why,against}=counterScore(a,b)
  const v=verdict(score)
  const k=keySkills(details[enemy.id])
  const name=display(enemy)
  // Re-run the edges by id so the phase text matches the exact rules that fired.
  const mine=(why.length?edgeIds(a,b):[])
  const theirs=(against.length?edgeIds(b,a):[])
  const phases={early:[],mid:[],late:[],fight:[],avoid:[]}
  for(const id of mine){const l=edgeLines(id,display(me),name,k);for(const p in l)if(l[p])phases[p].push(l[p])}
  for(const id of theirs){const t=threatLines(id,name,k);if(t)phases.avoid.push(t)}
  if(k.ult)phases.fight.push('จับตาอัลติเมท '+label(k.ult)+' — ถ้าเขาใช้แล้วคือจังหวะของเรา')
  if(k.safe.length&&!mine.includes('burst'))phases.fight.push(name+' มีสกิลเอาตัวรอด '+k.safe.slice(0,2).map(label).join(', ')+' ห้ามเปิดคอมโบใส่ตอนท่านี้พร้อม')
  if(k.heal.length)phases.late.push(name+' ฟื้นฟูจาก '+k.heal.slice(0,2).map(label).join(', ')+' — ทีมควรมีไอเทมตัดการฟื้นฟูอย่างน้อย 1 ชิ้น')
  if(k.stealth.length)phases.avoid.push(name+' ล่องหนได้จาก '+label(k.stealth[0])+' — อย่าเดินคนเดียวในป่า')
  if(!phases.late.length)phases.late.push('ช่วงท้ายเกมประเมินเงิน ไอเทม คูลดาวน์ และตำแหน่งทีมใหม่ คะแนนแท็กไม่ได้บอกผลเลนหรือการสเกลท้ายเกม')
  const items=recommendItems(me,[enemy],4).map(i=>({name:i.name,why:i.why,icon:i.icon}))
  const missing=[]
  if(!details[enemy.id]?.skills?.length)missing.push('ยังไม่มีข้อมูลสกิลของ '+name+' แผนจึงอิงแค่แท็กรวม')
  else if(!k.all.some(s=>s.cooldown))missing.push('แหล่งข้อมูลไม่ได้ระบุคูลดาวน์ของ '+name)
  // One-line game plan by band, so a losing matchup still says how to play it.
  const plan=(score>0?'แท็กสกิลให้ความได้เปรียบบางจังหวะ':score<0?'แท็กสกิลพบภัยคุกคามที่ควรระวัง':'แท็กสกิลยังแยกความได้เปรียบไม่ได้')+' — ไม่ใช่ผลดวลหรือสถิติชนะจริง ตรวจสกิล เงิน และจำนวนคนก่อนเลือกจังหวะ'
  return {kind:'heuristic',score,band:v.id,label:v.label,plan,edges:mine,threats:theirs,why,against,phases,items,keySkills:k,missing}
}

// Edge ids that fired for a vs b, so phase text matches the exact rules that scored.
function edgeIds(a,b){return EDGES.filter(e=>e.when(a,b)).map(e=>e.id)}
