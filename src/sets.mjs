// Selectable item sets. The base set comes from the verified Garena build in
// hero-details.json; the alternative sets are rule-derived replacements for the
// last two slots, so every set is 6 items and nothing is invented.
import {recommendItems,baseItems,byName,threatProfile} from './items.mjs'

const MAX=6

// Keep the core of the verified build, swap the tail for rule-derived answers.
function mix(base,answers,keep){
  const kept=base.slice(0,keep)
  const used=new Set(kept.map(i=>i.name))
  const fill=answers.filter(i=>!used.has(i.name)).slice(0,MAX-kept.length)
  return [...kept,...fill].slice(0,MAX)
}

export function buildSets(hero,enemyHeroes=[],baseBuild=null,tags={}){
  if(!hero)return []
  const base=baseItems(baseBuild)
  const answers=recommendItems({...hero,...tags},enemyHeroes,10)
  const threat=threatProfile(enemyHeroes)
  const sets=[]

  if(base.length){
    sets.push({id:'base',name:'ชุดอ้างอิง Garena',items:base,why:'ชุดที่แหล่งอ้างอิงเผยแพร่ ไม่ได้ปรับตามคู่แข่ง'})
  }
  if(answers.length){
    sets.push({id:'fight',name:'ชุดปะทะตามดราฟต์',items:mix(base,answers,4),why:'คงแกนชุดเดิม 4 ชิ้นแล้วเติมไอเทมที่ตอบภัยคุกคามของอีกฝั่ง'})
    const def=answers.filter(i=>i.cat==='กัน'||i.cat==='คุม')
    if(def.length>2)sets.push({id:'hold',name:'ชุดตั้งรับ',items:mix(base,def,3),why:'เน้นไอเทมกันและคุมจังหวะสำหรับเกมที่ต้องรอจังหวะ'})
    const pen=answers.filter(i=>i.cat==='เจาะ'||i.cat==='ตอบโต้')
    if(pen.length>2)sets.push({id:'pierce',name:'ชุดเจาะตัวหนา',items:mix(base,pen,3),why:'เน้นเจาะเกราะและตัดการฟื้นฟูเมื่ออีกฝั่งมีแนวหน้าหรือตัวฮีล'})
  }else if(base.length){
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
