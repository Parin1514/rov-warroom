// Selectable item sets. The base set is the verified Garena build from
// hero-details.json; every other set is that verified core plus items the rule
// engine picked for one purpose, so nothing is invented and every set fills 6
// slots. One set per purpose keeps the tabs meaningful instead of near-duplicates.
import {recommendItems,baseItems,byName,threatProfile} from './items.mjs'

const MAX=6

// Keep the verified core, then fill from one purpose's answers.
function mix(base,answers,keep){
  const kept=base.slice(0,keep)
  const used=new Set(kept.map(i=>i.name))
  const fill=answers.filter(i=>!used.has(i.name)).slice(0,MAX-kept.length)
  return [...kept,...fill].slice(0,MAX)
}

// Purposes in priority order: each with at least two answers becomes a tab.
const PURPOSES=[
  {id:'fight',cat:null,keep:4,name:'ชุดปะทะตามดราฟต์',why:'คงแกนชุดเดิม 4 ชิ้นแล้วเติมไอเทมที่ตอบภัยคุกคามของอีกฝั่ง'},
  {id:'hold',cat:'กัน',keep:3,name:'ชุดตั้งรับ',why:'เน้นไอเทมกันและคุมจังหวะสำหรับเกมที่ต้องรอจังหวะ'},
  {id:'pierce',cat:'เจาะ',keep:3,name:'ชุดเจาะตัวหนา',why:'เน้นเจาะเกราะเมื่ออีกฝั่งมีแนวหน้าที่ต้องเจาะ'},
  {id:'shut',cat:'ตอบโต้',keep:3,name:'ชุดตัดการฟื้นฟู',why:'เน้นไอเทมลดการฟื้นฟูและการตามเก็บเป้าหมายที่หนีเก่ง'},
  {id:'boost',cat:'บูสต์',keep:3,name:'ชุดเร่งดาเมจ',why:'เน้นไอเทมเพิ่มดาเมจเมื่อทีมต้องปิดเกมเร็ว'},
  {id:'move',cat:'เคลื่อนที่',keep:3,name:'ชุดหมุนแผนที่',why:'เน้นความเร็วและการหมุนแผนที่เมื่อต้องแย่งจังหวะทั้งแมตช์'},
  {id:'stall',cat:'คุม',keep:3,name:'ชุดตรึงเป้าหมาย',why:'เน้นไอเทมชะลอและควบคุมสำหรับไฟต์ที่ต้องยื้อ'}
]

export function buildSets(hero,enemyHeroes=[],baseBuild=null,tags={}){
  if(!hero)return []
  // Accept hero objects or bare ids: a lineup of ids must still read as threats.
  const enemies=enemyHeroes.map(e=>typeof e==='string'?{id:e}:e).filter(Boolean)
  const base=baseItems(baseBuild)
  const answers=recommendItems({...hero,...tags},enemies,40)
  const threat=threatProfile(enemies)
  const sets=[]

  if(base.length){
    sets.push({id:'base',name:'ชุดอ้างอิง Garena',items:base,why:'ชุดที่แหล่งอ้างอิงเผยแพร่ ไม่ได้ปรับตามคู่แข่ง'})
  }
  for(const p of PURPOSES){
    const pool=p.cat?answers.filter(i=>i.cat===p.cat):answers
    if(pool.length<2)continue
    const items=mix(base,pool,p.keep)
    if(items.length<3)continue
    // Skip a purpose that ends up with exactly the same six items as an earlier tab.
    if(sets.some(s=>s.items.map(i=>i.name).join('|')===items.map(i=>i.name).join('|')))continue
    sets.push({id:p.id,name:p.name,items,why:p.why})
  }
  if(!answers.length&&base.length&&sets.length===1){
    sets.push({id:'alt',name:'ชุดเดิมทั้งชุด',items:base,why:'ไม่มีภัยคุกคามที่เข้าเงื่อนไข จึงคงชุดอ้างอิงไว้'})
  }

  const notes=[]
  if(!base.length)notes.push('ฮีโร่ตัวนี้ยังไม่มีชุดอ้างอิงในคลังข้อมูล')
  if(!enemyHeroes.length)notes.push('เลือกฮีโร่ศัตรูเพื่อให้ชุดปรับตามคู่แข่ง')
  if(threat.heal)notes.push('อีกฝั่งมีตัวฟื้นฟู — พิจารณาไอเทมลดการฟื้นฟู')
  if(threat.cc>=3)notes.push('อีกฝั่งมีสกิลควบคุมหลายช่อง — พิจารณาไอเทมลดเวลาติดสถานะ')

  return sets.map(s=>({...s,items:s.items.filter(i=>byName.has(i.name))})).filter(s=>s.items.length)
}

// Copy-paste text for the team chat. No game integration.
export function setToText(hero,set,laneLabel){
  if(!hero||!set)return ''
  return [hero.name+' · '+(laneLabel||''),set.name,'ไอเทม: '+set.items.map(i=>i.name).join(' → '),set.why].filter(Boolean).join('\n')
}
