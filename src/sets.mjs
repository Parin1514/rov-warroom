// Rule-derived variants of an existing six-slot build; never measured win rates.
// ponytail: one situational swap, not an optimizer; full role-specific builds need review.
import {recommendItems,baseItems} from './items.mjs'
const boots=i=>/Boots|Greaves|Kicks|Hermes/.test(i.name)
const reserved=i=>boots(i)||i.cat==='Support'||i.cat==='Fram'||/Soulreaver|Leviathan/.test(i.name)

export function buildSets(hero,enemyHeroes=[],baseBuild=null,tags={}){
  if(!hero)return []
  const base=baseItems(baseBuild)
  if(base.length!==6||base.filter(boots).length!==1)return []
  const sets=[{id:'base',name:baseBuild.review?'ชุดปรับตามข้อมูลแพตช์':'ชุดอ้างอิง Garena · ยังไม่ยืนยันแพตช์',items:base,
    why:baseBuild.review?.note||'หน้าแนะนำไม่ระบุแพตช์ของบิลด์ จึงไม่ยืนยันว่าเป็นชุดล่าสุดหรือดีที่สุด'}]
  const enemies=enemyHeroes.map(e=>typeof e==='string'?{id:e}:e).filter(Boolean)
  const answers=recommendItems({...hero,...tags},enemies,40)
  const categories=new Set()
  for(const answer of answers){
    if(!answer.threatHit||base.some(i=>i.name===answer.name)||categories.has(answer.cat))continue
    const slot=boots(answer)?base.findIndex(boots):base.findLastIndex((i,n)=>n>=3&&!reserved(i)&&i.name!=='Blade of Eternity')
    if(slot<0)continue
    categories.add(answer.cat)
    const items=base.map((i,n)=>n===slot?answer:i)
    sets.push({id:'vs-'+answer.name,name:'ปรับ '+answer.name,items,
      why:'การอนุมานตามดราฟต์: แทน '+base[slot].name+' ด้วย '+answer.name+' — '+answer.why+'; แลกกับคุณสมบัติของชิ้นเดิม ไม่ใช่ลำดับซื้อที่ตายตัว'})
  }
  return sets
}

export function setToText(hero,set,laneLabel){
  if(!hero||!set)return ''
  return [hero.name+' · '+(laneLabel||''),set.name,'ไอเทม: '+set.items.map(i=>i.name).join(' → '),set.why].filter(Boolean).join('\n')
}
