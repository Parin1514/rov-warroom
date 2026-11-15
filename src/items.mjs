// Rule-derived item advice, not measured build performance. Legacy Garena
// builds are not patch verification. Only reviewed effects are recommended.
// Effect sources: https://rovguide.com/th/items/<slug>; Beta55 for Mail of Pain.
// ponytail: no auto-recommended jungle/support upgrades without explicit role selection.
import tags from './hero-tags.json' with {type:'json'}
import items from './items.json' with {type:'json'}

const byName=new Map(items.map(i=>[i.name,i]))
const HAS=name=>byName.has(name)

// name, roles that should consider it, tags it answers, why, category.
const RULES=[
  {name:'Glided Greaves',roles:['แทงค์','ไฟต์เตอร์','แอสซาซิน','เมจ','แครี่','ซัพพอร์ต'],for:['cc'],cat:'กัน',why:'พิจารณาต้านทานสถานะเมื่อโดนควบคุมบ่อย ไม่ป้องกันการจับล็อกทุกรูปแบบ'},
  {name:'Medallion of Troy',roles:['แทงค์','ไฟต์เตอร์','ซัพพอร์ต'],for:['magic'],cat:'กัน',why:'ต้านทานเวทและโล่ดูดซับเวท ไม่ได้ลดเวลาติดสถานะ'},
  {name:'The Aegis',roles:['แทงค์','ไฟต์เตอร์','ซัพพอร์ต'],for:['phys'],cat:'กัน',why:'เพิ่มเกราะและลดความเร็วโจมตีศัตรูใกล้ตัว ไม่ใช่โล่กันเวทให้ทีม'},
  {name:'Spear of Longinus',roles:['ไฟต์เตอร์','แอสซาซิน'],for:['tanky'],cat:'เจาะ',why:'ลดเกราะสะสมเมื่อโจมตี เหมาะกับผู้ใช้ดาเมจกายภาพที่ตีต่อเนื่อง'},
  {name:'Muramasa',roles:['แครี่','แอสซาซิน','ไฟต์เตอร์'],for:['tanky'],cat:'เจาะ',why:'เจาะเกราะกายภาพเป็นสัดส่วน ใช้เมื่อศัตรูสะสมเกราะ ไม่ได้เจาะโล่หรือเพิ่มดาเมจจริง'},
  {name:'Staff of Nuul',roles:['เมจ'],for:['tanky'],cat:'เจาะ',why:'เจาะเกราะเวทเมื่อศัตรูสะสมต้านทานเวท ไม่ใช่ลดต้านเวทให้ทั้งทีม'},
  {name:'Frost Cape',roles:['แทงค์','ไฟต์เตอร์','แครี่'],for:['dash'],cat:'คุม',why:'หลังใช้สกิล ต้องโจมตีปกติเพื่อทำดาเมจวงและสโลว์ ไม่หยุดการพุ่งโดยตรง'},
  {name:'Mail of Pain',roles:['แทงค์','ไฟต์เตอร์'],for:['phys'],cat:'กัน',why:'เพิ่มเกราะและถ่ายโอนความเสียหายกลับ ใช้สกิลกดเพื่อเร่งผลในจังหวะรับดาเมจ ตาม Beta55'},
  {name:'Curse of Death',roles:['แครี่','ไฟต์เตอร์','แอสซาซิน'],for:['heal'],cat:'ตอบโต้',why:'ไอเทมสายกายภาพลดการฟื้นฟูหลังทำดาเมจ ไม่ใช่ไอเทมดูดเลือด'},
  {name:'Soul Scroll',roles:['เมจ','ซัพพอร์ต'],for:['heal'],cat:'ตอบโต้',why:'ไอเทมพลังเวทลดการฟื้นฟูหลังทำดาเมจ เหมาะกับเมจที่ช่วยทีมตัดฮีล'},
  {name:'Blade of Eternity',roles:['แครี่','แอสซาซิน','ไฟต์เตอร์','เมจ'],for:['burst','dive'],cat:'กัน',why:'คืนชีพหลังตายตามคูลดาวน์และจำนวนครั้งจำกัด ต้องมีทีมคุ้มกันจุดเกิดใหม่ ไม่ใช่โล่กันเบิร์สต์'},
  {name:'Death Sickle',roles:['แครี่','แอสซาซิน','ไฟต์เตอร์'],for:['burst','dive'],cat:'กัน',why:'ป้องกันการตายช่วงสั้นตามเงื่อนไข ควรเก็บทางหนีไว้ ไม่รับประกันว่าจะรอดจากดาเมจตามมา'},
  {name:'Arctic Orb',roles:['เมจ','ซัพพอร์ต'],for:['burst','dive'],cat:'กัน',why:'กดอมตะช่วงสั้น แต่ขยับ โจมตี และใช้สกิลไม่ได้ ต้องรอทีมช่วย ไม่ใช่สกิลล้างสถานะ'},
  {name:'Rock Shield',roles:['แทงค์','ไฟต์เตอร์','ซัพพอร์ต'],for:['burst','poke'],cat:'กัน',why:'กดรับโล่ช่วงสั้นแลกกับดาเมจตัวเองลดลง เหมาะกับผู้รับดาเมจมากกว่าตัวปิดงาน'},
  {name:"Hercules's Madness",roles:['แทงค์','ไฟต์เตอร์'],for:['burst','phys'],cat:'กัน',why:'ได้โล่และเพิ่มดูดเลือดเมื่อ HP ต่ำตามเงื่อนไข ระวังไอเทมตัดการฟื้นฟู'},
  {name:'Sonic Boots',roles:['แทงค์','ไฟต์เตอร์','เมจ','แครี่','ซัพพอร์ต','แอสซาซิน'],for:['phys'],cat:'กัน',why:'เพิ่มเกราะและลดความเสียหายกายภาพ ไม่เพิ่มความเร็วโจมตี'},
  {name:'War Boots',roles:['แครี่','ไฟต์เตอร์'],for:['phys'],cat:'บูสต์',why:'เพิ่มความเร็วโจมตี เหมาะกับผู้ใช้การโจมตีปกติ ไม่ใช่รองเท้าเพิ่มเกราะ'},
  {name:'Enchanted Kicks',roles:['เมจ','ซัพพอร์ต'],for:['magic'],cat:'เจาะ',why:'เพิ่มเจาะเกราะเวทเพื่อทำดาเมจ ไม่ใช่ต้านทานเวท'},
  {name:'Bow of Slaughter',roles:['แครี่'],for:['phys'],cat:'บูสต์',why:'เพิ่มดูดเลือดเมื่อกดใช้สำหรับฮีโร่ระยะไกล ต้องได้ยิงจึงฟื้นฟู ไม่ลดการฮีลของศัตรู'},
  {name:'Omni Arms',roles:['ไฟต์เตอร์','แครี่','แอสซาซิน'],for:['burst'],cat:'บูสต์',why:'เสริมการโจมตีปกติหลังใช้สกิล ต้องสลับสกิลกับการตี ไม่ใช่ไอเทมตัดฮีล'},
  {name:'Broken Spear',roles:['แอสซาซิน','แครี่','ไฟต์เตอร์'],for:['burst'],cat:'เจาะ',why:'เจาะเกราะกายภาพแบบคงที่ตามเลเวล เหมาะกับเป้าหมายเกราะไม่สูง ไม่ลดการฟื้นฟู'},
  {name:'Flashy Boots',roles:['แทงค์','ไฟต์เตอร์','เมจ','ซัพพอร์ต'],for:['cc','magic'],cat:'เคลื่อนที่',why:'ลดคูลดาวน์สำหรับผู้พึ่งสกิล แต่ต้องแลกกับคุณสมบัติรองเท้าป้องกัน'}
]

const CTX=t=>({
  cc:t.cc>=1,magic:t.magic>=2,phys:t.phys>=2,tanky:t.tanky,dash:t.dash,heal:t.heal,
  burst:t.burst,sustain:t.sustain||t.heal,dive:t.dive,poke:t.poke,vision:t.vision,
  mitigate:t.mitigate,roam:t.dash&&t.cc>=1,kite:t.poke&&t.dash
})

// Threat profile of the enemy lineup, from the same verified tags.
export function threatProfile(enemyHeroes){
  const p={cc:0,magic:0,phys:0,heal:0,tanky:0,dash:0,burst:0,poke:0,burst2:0}
  for(const h of enemyHeroes){
    const t=tags[h.id]||{}
    if(t.cc)p.cc++
    if(t.magic>=2)p.magic++
    if(t.phys>=2)p.phys++
    if(t.heal)p.heal++
    if(t.tanky)p.tanky++
    if(t.dash)p.dash++
    if(t.burst)p.burst++
    if(t.poke)p.poke++
  }
  return p
}

// Score = own-tag fit (2) + threat answer (3) + role fit (1).
export function recommendItems(hero,enemyHeroes=[],limit=6){
  if(!hero)return []
  const t=tags[hero.id]||{}
  const own=CTX(t)
  const threat=threatProfile(enemyHeroes)
  const press={
    cc:threat.cc>=2,magic:threat.magic>=2,phys:threat.phys>=2,heal:threat.heal>0,
    tanky:threat.tanky>=2,dash:threat.dash>=2,burst:threat.burst>=2,poke:threat.poke>=2
  }
  const rows=[]
  for(const rule of RULES){
    if(!HAS(rule.name)||!rule.roles.includes(hero.role))continue
    if(rule.for.includes('heal')&&!press.heal)continue
    const ownHit=rule.for.filter(k=>own[k]).length
    const threatHit=rule.for.filter(k=>press[k]).length
    const roleHit=rule.roles.includes(hero?.role)?1:0
    if(!ownHit&&!threatHit)continue
    rows.push({
      ...byName.get(rule.name),
      cat:rule.cat,why:rule.why,
      score:ownHit*2+threatHit*3+roleHit,
      ownHit,threatHit,roleHit
    })
  }
  return rows.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,limit)
}

// Items a hero's own verified build already contains. The source data repeats an
// item in one build (natalya), and one item cannot fill two slots, so dedupe.
export const baseItems=build=>{
  const seen=new Set()
  return (build?.items||[]).filter(i=>byName.has(i.name)&&!seen.has(i.name)&&seen.add(i.name))
}
export {items,byName}
